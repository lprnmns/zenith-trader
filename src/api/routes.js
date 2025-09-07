// src/api/routes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const zerionService = require('../services/zerionService');
const { loadStrategies } = require('../core/strategyEngine');
const StrategyService = require('../services/strategyService');
const StrategyExecutionService = require('../services/strategyExecutionService');
const AuditLogService = require('../services/auditLogService');
const WalletMonitoringService = require('../services/walletMonitoringService');
const SignalService = require('../services/signalService');
const DecisionEngine = require('../services/decisionEngine');
const PositionCalculator = require('../services/positionCalculator');
const EventFilter = require('../services/eventFilter');
const OKXClient = require('../services/okxClient');
const OrderManagementService = require('../services/orderManagementService');
const FuturesTradingService = require('../services/futuresTradingService');
const pushNotificationService = require('../services/pushNotificationService');
const router = express.Router();
const { analyzeWallet } = require('../services/analysisService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getEncryptedOKXCredentials } = require('../utils/encryption');
const { validateStrategy, validateStrategyUpdate, validateStrategyExecution, handleValidationErrors } = require('../middleware/strategyValidation');

// Import notification routes
const notificationRoutes = require('./notificationRoutes');
const authRoutes = require('./authRoutes');

const prisma = new PrismaClient();
const strategyService = new StrategyService();
const executionService = new StrategyExecutionService();
const auditService = new AuditLogService();
const walletMonitoringService = new WalletMonitoringService();
const signalService = new SignalService();
const decisionEngine = new DecisionEngine();
const positionCalculator = new PositionCalculator();
const eventFilter = new EventFilter();
const okxClient = new OKXClient();
const orderManagementService = new OrderManagementService();
const futuresTradingService = new FuturesTradingService();
// Dashboard summary
router.get('/dashboard/summary', async (req, res) => {
  try {
    const strategies = await prisma.strategy.findMany();
    const active = strategies.filter((s) => s.isActive !== false);

    // Placeholder calculations; replace with real trade aggregation if available
    const totalPnl24h = 0;
    const totalPnl24hPercentage = 0;
    const activeStrategiesCount = active.length;
    const totalStrategiesCount = strategies.length;
    const totalTrades24h = 0;
    const recentTrades = [];

    res.json({
      totalPnl24h,
      totalPnl24hPercentage,
      activeStrategiesCount,
      totalStrategiesCount,
      totalTrades24h,
      recentTrades,
    });
  } catch (e) {
    res.status(500).json({ error: 'Summary hesaplanamadı' });
  }
});

// Suggested wallets (consistencyScore desc)
router.get('/explorer/suggested-wallets', async (req, res) => {
  try {
    const wallets = await prisma.suggestedWallet.findMany({ orderBy: { consistencyScore: 'desc' } });
    res.json(wallets);
  } catch (e) {
    res.status(500).json({ error: 'Suggested wallets alınamadı' });
  }
});

// Wallet trade history (temporary mock data)
router.get('/wallets/:address/trade-history', async (req, res) => {
  try {
    const { address } = req.params;
    console.log(`[Explorer] Trade history (mock) requested for ${address}`);
    const mock = [
      { date: '2025-08-25', action: 'SELL', asset: 'ETH', amount: 2850, pnl: 425.6, pnlPercentage: 17.5 },
      { date: '2025-08-24', action: 'BUY', asset: 'ARB', amount: 1200, pnl: null, pnlPercentage: null },
      { date: '2025-08-23', action: 'SELL', asset: 'OP', amount: 860, pnl: -132.45, pnlPercentage: -8.2 },
      { date: '2025-08-22', action: 'BUY', asset: 'ETH', amount: 1500, pnl: null, pnlPercentage: null },
    ];
    res.json(mock);
  } catch (e) {
    console.error('[Explorer] Trade history error:', e.message);
    res.status(500).json({ error: 'Trade history alınamadı' });
  }
});

// Explorer unified analysis endpoint
router.get('/explorer/:address/analysis', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await analyzeWallet(address);
    res.json(result);
  } catch (e) {
    console.error('[Explorer] analysis error:', e.message);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// POST /api/wallet/analyze - Wallet analysis for frontend
router.post('/wallet/analyze', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    console.log('[Wallet] Analyzing wallet:', address);
    const result = await analyzeWallet(address);
    
    // Transform the result to match frontend expectations
    const transformed = {
      address: address,
      totalValue: result.tradeHistory.reduce((sum, trade) => sum + trade.amountUsd, 0) || 0,
      positions: result.tradeHistory
        .filter(trade => trade.unrealizedPnlUsd !== null)
        .map(trade => ({
          token: trade.asset,
          amount: trade.amountUsd / (trade.costPerUnit || 1),
          value: trade.amountUsd,
          price: trade.costPerUnit || 0,
          pnl: trade.unrealizedPnlUsd || 0,
          pnlPercentage: trade.unrealizedPnlPercent || 0
        })),
      pnl1d: Math.random() * 10 - 5, // Mock daily PnL
      pnl7d: Math.random() * 20 - 10, // Mock weekly PnL
      pnl30d: Math.random() * 40 - 20, // Mock monthly PnL
      tradingPerformance: {
        totalPnl: result.cumulativePnlChart[result.cumulativePnlChart.length - 1]?.cumulativePnl || 0,
        winRate: result.summary.winRatePercent,
        totalTrades: result.summary.totalTrades,
        avgTradeSize: result.summary.avgTradeSizeUsd,
        realizedTrades: result.tradeHistory.filter(t => t.sales.length > 0).length
      },
      cumulativePnlChart: result.cumulativePnlChart || [],
      lastUpdated: new Date().toISOString()
    };
    
    res.json(transformed);
  } catch (e) {
    console.error('[Wallet] Analysis error:', e.message);
    res.status(500).json({ error: 'Wallet analysis failed' });
  }
});

// Health
router.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Wallet performance
router.get('/wallets/:address/performance', async (req, res) => {
	const { address } = req.params;
	try {
		const performanceData = await zerionService.getPerformancePreview(address);
		if (performanceData) {
			res.json(performanceData);
		} else {
			res.status(404).json({ error: 'Performans verisi bulunamadı veya cüzdan geçersiz.' });
		}
	} catch (error) {
		res.status(500).json({ error: 'Sunucu hatası oluştu.' });
	}
});

// --- STRATEGY CRUD ENDPOINTS ---

// GET /api/strategies - list user's strategies  
router.get('/strategies', requireAuth, async (req, res) => {
	try {
		console.log('[API] GET /strategies - User ID:', req.user.userId);
		const strategies = await strategyService.getUserStrategies(req.user.userId);
		console.log('[API] Strategies fetched:', strategies?.length || 0);
		
		// Transform to match frontend interface
		const transformedStrategies = strategies.map((s) => ({
			id: s.id.toString(),
			name: s.name,
			walletAddress: s.walletAddress,
			exchange: s.exchange || 'OKX',
			copyMode: s.copyMode || 'Perpetual',
			isActive: s.isActive,
			currentPnL: s.currentPnL,
			totalPnL: s.totalPnL,
			tradesCount: s.tradesCount,
			createdAt: s.createdAt.toISOString(),
			leverage: s.leverage,
			stopLoss: s.stopLoss,
			dailyLimit: s.dailyLimit,
			sizingMethod: s.sizingMethod || 'Fixed Amount',
			amountPerTrade: s.amountPerTrade,
			percentageToCopy: s.percentageToCopy,
			allowedTokens: s.allowedTokens,
			apiKey: s.okxApiKey ? '***' : undefined,
			apiSecret: s.okxApiSecret ? '***' : undefined,
			passphrase: s.okxPassphrase ? '***' : undefined,
			executionsCount: s.executions_count,
			recentExecutions: s.executions?.slice(0, 5) || []
		}));
		
		res.json(transformedStrategies);
	} catch (error) {
		console.error('[API] Get strategies error:', error);
		res.status(500).json({ error: 'Stratejiler alınamadı.' });
	}
});

// POST /api/strategies/quick - create quick strategy (only admin can create)
router.post('/strategies/quick', requireAuth, async (req, res) => {
  console.log('[API] Quick strategy request - User role:', req.user?.role, 'User ID:', req.user?.id);
  try {
    const { walletAddress, name } = req.body;
    
    if (!walletAddress || !name) {
      return res.status(400).json({ error: 'Wallet address and name are required' });
    }
    
    // Validate wallet address format
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    
    // Check if wallet address already exists
    const existingStrategy = await prisma.strategy.findFirst({
      where: { walletAddress }
    });
    
    if (existingStrategy) {
      return res.status(400).json({ error: 'Wallet address already in use' });
    }
    
    // Pre-configured quick strategy settings
    const quickStrategyData = {
      name,
      walletAddress,
      exchange: 'OKX',
      copyMode: 'Perpetual',
      leverage: 3,
      sizingMethod: 'Percentage of Wallet\'s Trade',
      positionSize: 100,
      percentageToCopy: 100,
      // Pre-configured OKX credentials (encrypted)
      ...getEncryptedOKXCredentials(),
      userId: req.user.userId,
      lastChecked: new Date() // Şu anki zamandan itibaren sinyal kontrolü yap
    };
    
    const strategy = await strategyService.createStrategy(quickStrategyData, req.user.userId);
    
    // Remove sensitive data before sending response
    const { okxApiKey, okxApiSecret, okxPassphrase, ...safeStrategy } = strategy;
    
    res.json(safeStrategy);
  } catch (error) {
    console.error('[API] Quick strategy creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/strategies - create (only admin can create)
router.post('/strategies', requireAuth, requireAdmin, validateStrategy, handleValidationErrors, async (req, res) => {
	try {
		// Transform frontend field names to database field names
		const strategyData = {
			...req.validatedData,
			okxApiKey: req.body.apiKey,
			okxApiSecret: req.body.apiSecret,
			okxPassphrase: req.body.passphrase || 'UI_AUTOGEN',
			userRole: req.user.role
		};

		const newStrategy = await strategyService.createStrategy(strategyData, req.user.userId);

		await loadStrategies();
		
		// Transform response to match frontend interface
		const responseStrategy = {
			id: newStrategy.id.toString(),
			name: newStrategy.name,
			walletAddress: newStrategy.walletAddress,
			exchange: newStrategy.exchange,
			copyMode: newStrategy.copyMode,
			isActive: newStrategy.isActive,
			currentPnL: newStrategy.currentPnL,
			totalPnL: newStrategy.totalPnL,
			tradesCount: newStrategy.tradesCount,
			createdAt: newStrategy.createdAt.toISOString(),
			leverage: newStrategy.leverage,
			stopLoss: newStrategy.stopLoss,
			dailyLimit: newStrategy.dailyLimit,
			sizingMethod: newStrategy.sizingMethod,
			amountPerTrade: newStrategy.amountPerTrade,
			percentageToCopy: newStrategy.percentageToCopy,
			allowedTokens: newStrategy.allowedTokens,
			apiKey: '***',
			apiSecret: '***',
			passphrase: '***',
		};
		
		res.status(201).json(responseStrategy);
	} catch (error) {
		console.error('[API] Create strategy error:', error);
		if (error.code === 'P2002') {
			return res.status(409).json({ error: 'Bu cüzdan adresi zaten başka bir strateji tarafından kullanılıyor.' });
		}
		res.status(500).json({ error: 'Strateji oluşturulamadı.' });
	}
});

// DELETE /api/strategies/:id - delete (only admin can delete)
router.delete('/strategies/:id', requireAuth, requireAdmin, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		
		// Check if strategy belongs to user (admins can delete any)
		const strategy = await prisma.strategy.findUnique({ where: { id } });
		if (!strategy) {
			return res.status(404).json({ error: 'Silinecek strateji bulunamadı.' });
		}
		
		if (req.user.role !== 'ADMIN' && strategy.userId !== req.user.userId) {
			return res.status(403).json({ error: 'Bu stratejiyi silme yetkiniz yok.' });
		}
		
		await strategyService.deleteStrategy(id, req.user.userId);
		await loadStrategies();
		res.status(204).send();
	} catch (error) {
		console.error('[API] Delete strategy error:', error);
		if (error.code === 'P2025') {
			return res.status(404).json({ error: 'Silinecek strateji bulunamadı.' });
		}
		res.status(500).json({ error: 'Strateji silinemedi.' });
	}
});

// PUT /api/strategies/:id - update strategy (only admin can update)
router.put('/strategies/:id', requireAuth, requireAdmin, validateStrategyUpdate, handleValidationErrors, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		
		// Transform frontend field names to database field names
		const updateData = {
			...req.validatedData,
			...(req.body.apiKey && { okxApiKey: req.body.apiKey }),
			...(req.body.apiSecret && { okxApiSecret: req.body.apiSecret }),
			...(req.body.passphrase && { okxPassphrase: req.body.passphrase }),
			...(req.body.sizingMethod && { sizingMethod: req.body.sizingMethod }),
			...(req.body.amountPerTrade !== undefined && { amountPerTrade: req.body.amountPerTrade ? parseFloat(req.body.amountPerTrade) : null }),
			...(req.body.percentageToCopy !== undefined && { percentageToCopy: req.body.percentageToCopy ? parseFloat(req.body.percentageToCopy) : null }),
			...(req.body.stopLoss !== undefined && { stopLoss: req.body.stopLoss ? parseFloat(req.body.stopLoss) : null }),
			...(req.body.dailyLimit !== undefined && { dailyLimit: req.body.dailyLimit ? parseInt(req.body.dailyLimit, 10) : null }),
			...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
			userRole: req.user.role
		};
		
		const updatedStrategy = await strategyService.updateStrategy(id, updateData, req.user.userId);
		
		await loadStrategies();
		
		// Transform response to match frontend interface
		const responseStrategy = {
			id: updatedStrategy.id.toString(),
			name: updatedStrategy.name,
			walletAddress: updatedStrategy.walletAddress,
			exchange: updatedStrategy.exchange,
			copyMode: updatedStrategy.copyMode,
			isActive: updatedStrategy.isActive,
			currentPnL: updatedStrategy.currentPnL,
			totalPnL: updatedStrategy.totalPnL,
			tradesCount: updatedStrategy.tradesCount,
			createdAt: updatedStrategy.createdAt.toISOString(),
			leverage: updatedStrategy.leverage,
			stopLoss: updatedStrategy.stopLoss,
			dailyLimit: updatedStrategy.dailyLimit,
			sizingMethod: updatedStrategy.sizingMethod,
			amountPerTrade: updatedStrategy.amountPerTrade,
			percentageToCopy: updatedStrategy.percentageToCopy,
			allowedTokens: updatedStrategy.allowedTokens,
			apiKey: '***',
			apiSecret: '***',
			passphrase: '***',
		};
		
		res.json(responseStrategy);
	} catch (error) {
		console.error('[API] Update strategy error:', error);
		if (error.code === 'P2002') {
			return res.status(409).json({ error: 'Bu cüzdan adresi zaten başka bir strateji tarafından kullanılıyor.' });
		}
		if (error.code === 'P2025') {
			return res.status(404).json({ error: 'Güncellenecek strateji bulunamadı.' });
		}
		res.status(500).json({ error: 'Strateji güncellenemedi.' });
	}
});

// GET /api/strategies/:id/trades - recent trades for a strategy
router.get('/strategies/:id/trades', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid strategy id' });
    
    // Check if strategy belongs to user (admin can see all)
    const strategy = await prisma.strategy.findUnique({ where: { id } });
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    
    if (req.user.role !== 'ADMIN' && strategy.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Bu stratejinin trades verilerine erişim yetkiniz yok.' });
    }
    
    const trades = await prisma.trade.findMany({
      where: { strategyId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const mapped = trades.map((t) => ({
      id: t.id,
      date: t.createdAt,
      action: t.action,
      token: t.token,
      amount: t.amount,
      status: t.status,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('[API] Get trades error:', error);
    res.status(500).json({ error: 'Trades could not be fetched.' });
  }
});

// Mount notification routes
router.use('/notifications', notificationRoutes);

// Mount auth routes
router.use('/auth', authRoutes);

// --- STRATEGY EXECUTION ENDPOINTS ---

// GET /api/strategies/:id/executions - get strategy executions
router.get('/strategies/:id/executions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await executionService.getStrategyExecutions(id, req.user.userId, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('[API] Get executions error:', error);
    res.status(500).json({ error: 'Execution records could not be fetched.' });
  }
});

// POST /api/strategies/:id/executions - create strategy execution
router.post('/strategies/:id/executions', requireAuth, validateStrategyExecution, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const executionData = {
      ...req.validatedData,
      strategyId: parseInt(id),
      userRole: req.user.role
    };
    
    const execution = await executionService.createExecution(executionData, req.user.userId);
    res.json(execution);
  } catch (error) {
    console.error('[API] Create execution error:', error);
    res.status(500).json({ error: 'Execution could not be created.' });
  }
});

// POST /api/strategies/:id/signal - process trading signal
router.post('/strategies/:id/signal', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const signalData = {
      ...req.body,
      userRole: req.user.role
    };
    
    const result = await executionService.processSignal(parseInt(id), signalData, req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('[API] Process signal error:', error);
    res.status(500).json({ error: 'Signal could not be processed.' });
  }
});

// GET /api/strategies/:id/performance - get strategy performance
router.get('/strategies/:id/performance', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const performance = await strategyService.getStrategyPerformance(id, req.user.userId);
    res.json(performance);
  } catch (error) {
    console.error('[API] Get performance error:', error);
    res.status(500).json({ error: 'Performance data could not be fetched.' });
  }
});

// GET /api/strategies/:id/execution-stats - get execution statistics
router.get('/strategies/:id/execution-stats', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '7d' } = req.query;
    
    const stats = await executionService.getExecutionStats(id, req.user.userId, period);
    res.json(stats);
  } catch (error) {
    console.error('[API] Get execution stats error:', error);
    res.status(500).json({ error: 'Execution statistics could not be fetched.' });
  }
});

// --- AUDIT LOG ENDPOINTS ---

// GET /api/audit/logs - get audit logs with filtering
router.get('/audit/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      entityType, 
      entityId, 
      action, 
      userId, 
      status,
      dateFrom,
      dateTo
    } = req.query;
    
    const filters = {
      entityType,
      entityId,
      action,
      userId,
      status,
      dateFrom,
      dateTo
    };
    
    const result = await auditService.getAuditLogs(filters, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('[API] Get audit logs error:', error);
    res.status(500).json({ error: 'Audit logs could not be fetched.' });
  }
});

// GET /api/audit/stats - get audit statistics
router.get('/audit/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { entityType, userId, status, dateFrom, dateTo } = req.query;
    
    const filters = {
      entityType,
      userId,
      status,
      dateFrom,
      dateTo
    };
    
    const stats = await auditService.getAuditStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('[API] Get audit stats error:', error);
    res.status(500).json({ error: 'Audit statistics could not be fetched.' });
  }
});

// GET /api/audit/recent - get recent activity
router.get('/audit/recent', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const activities = await auditService.getRecentActivity(limit);
    res.json(activities);
  } catch (error) {
    console.error('[API] Get recent activity error:', error);
    res.status(500).json({ error: 'Recent activity could not be fetched.' });
  }
});

// GET /api/audit/export - export audit logs
router.get('/audit/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      format = 'json', 
      entityType, 
      userId, 
      status, 
      dateFrom, 
      dateTo 
    } = req.query;
    
    const filters = {
      entityType,
      userId,
      status,
      dateFrom,
      dateTo
    };
    
    const data = await auditService.exportAuditLogs(filters, format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    }
    
    res.json(data);
  } catch (error) {
    console.error('[API] Export audit logs error:', error);
    res.status(500).json({ error: 'Audit logs could not be exported.' });
  }
});

// --- HEALTH CHECK ENDPOINTS ---

// GET /api/health - check service health
router.get('/health', async (req, res) => {
  try {
    const [strategyHealth, executionHealth, auditHealth] = await Promise.all([
      strategyService.healthCheck(),
      executionService.healthCheck(),
      auditService.healthCheck()
    ]);
    
    const overallHealth = 
      strategyHealth.status === 'healthy' && 
      executionHealth.status === 'healthy' && 
      auditHealth.status === 'healthy' ? 'healthy' : 'degraded';
    
    res.json({
      status: overallHealth,
      services: {
        strategy: strategyHealth,
        execution: executionHealth,
        audit: auditHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// --- WALLET MONITORING ENDPOINTS ---

// POST /api/wallet-monitoring/start - Start monitoring a wallet
router.post('/wallet-monitoring/start', requireAuth, async (req, res) => {
  try {
    const { walletAddress, strategyId } = req.body;
    
    if (!walletAddress || !strategyId) {
      return res.status(400).json({ error: 'Wallet address and strategy ID are required' });
    }

    await walletMonitoringService.startMonitoring(walletAddress, strategyId, req.user.userId);
    
    res.json({ 
      success: true, 
      message: `Started monitoring wallet ${walletAddress}`,
      walletAddress,
      strategyId
    });
  } catch (error) {
    console.error('[API] Start wallet monitoring error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet-monitoring/stop - Stop monitoring a wallet
router.post('/wallet-monitoring/stop', requireAuth, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    await walletMonitoringService.stopMonitoring(walletAddress, req.user.userId);
    
    res.json({ 
      success: true, 
      message: `Stopped monitoring wallet ${walletAddress}`,
      walletAddress
    });
  } catch (error) {
    console.error('[API] Stop wallet monitoring error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet-monitoring/status - Get monitoring status
router.get('/wallet-monitoring/status', requireAuth, async (req, res) => {
  try {
    const status = walletMonitoringService.getMonitoringStatus();
    
    // Filter to only show user's monitored wallets
    const userStatus = {
      ...status,
      monitoredWallets: status.monitoredWallets.filter(w => w.userId === req.user.userId)
    };
    
    res.json(userStatus);
  } catch (error) {
    console.error('[API] Get monitoring status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet-monitoring/events/:walletAddress - Get wallet events
router.get('/wallet-monitoring/events/:walletAddress', requireAuth, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Verify user has access to this wallet
    const userWallets = walletMonitoringService.getMonitoringStatus().monitoredWallets;
    const hasAccess = userWallets.some(w => 
      w.address === walletAddress && w.userId === req.user.userId
    );
    
    if (!hasAccess && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied to this wallet' });
    }

    const events = await prisma.walletEvent.findMany({
      where: { walletAddress },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await prisma.walletEvent.count({
      where: { walletAddress }
    });

    res.json({
      events,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('[API] Get wallet events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet-monitoring/signals/:strategyId - Get trading signals for strategy
router.get('/wallet-monitoring/signals/:strategyId', requireAuth, async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { limit = 50, offset = 0, status } = req.query;
    
    // Verify strategy belongs to user
    const strategy = await prisma.strategy.findFirst({
      where: { 
        id: parseInt(strategyId),
        userId: req.user.userId 
      }
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const where = { strategyId: parseInt(strategyId) };
    if (status) {
      where.status = status;
    }

    const signals = await prisma.tradingSignal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        walletEvent: {
          select: {
            eventType: true,
            timestamp: true,
            eventData: true
          }
        }
      }
    });

    const total = await prisma.tradingSignal.count({ where });

    res.json({
      signals,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('[API] Get trading signals error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet-monitoring/evaluate-signal - Evaluate a trading signal
router.post('/wallet-monitoring/evaluate-signal', requireAuth, async (req, res) => {
  try {
    const { signal, strategyId } = req.body;
    
    if (!signal || !strategyId) {
      return res.status(400).json({ error: 'Signal and strategy ID are required' });
    }

    // Verify strategy belongs to user
    const strategy = await prisma.strategy.findFirst({
      where: { 
        id: parseInt(strategyId),
        userId: req.user.userId 
      }
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const decision = await decisionEngine.evaluateSignal(signal, strategy);
    
    res.json(decision);
  } catch (error) {
    console.error('[API] Evaluate signal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet-monitoring/calculate-position - Calculate position size
router.post('/wallet-monitoring/calculate-position', requireAuth, async (req, res) => {
  try {
    const { strategyId, signal } = req.body;
    
    if (!strategyId || !signal) {
      return res.status(400).json({ error: 'Strategy ID and signal are required' });
    }

    // Verify strategy belongs to user
    const strategy = await prisma.strategy.findFirst({
      where: { 
        id: parseInt(strategyId),
        userId: req.user.userId 
      }
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const positionCalculation = positionCalculator.calculatePositionSize(strategy, signal);
    
    res.json(positionCalculation);
  } catch (error) {
    console.error('[API] Calculate position error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet-monitoring/statistics/:strategyId - Get monitoring statistics
router.get('/wallet-monitoring/statistics/:strategyId', requireAuth, async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { period = '7d' } = req.query;
    
    // Verify strategy belongs to user
    const strategy = await prisma.strategy.findFirst({
      where: { 
        id: parseInt(strategyId),
        userId: req.user.userId 
      }
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const [signalStats, decisionStats, positionStats] = await Promise.all([
      signalService.getSignalStatistics(strategyId, period),
      decisionEngine.getDecisionStatistics(strategyId, period),
      positionCalculator.getStatistics(strategyId, period)
    ]);

    res.json({
      strategyId,
      period,
      signals: signalStats,
      decisions: decisionStats,
      positions: positionStats
    });
  } catch (error) {
    console.error('[API] Get monitoring statistics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet-monitoring/filter-test - Test event filtering
router.post('/wallet-monitoring/filter-test', requireAuth, async (req, res) => {
  try {
    const { event } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: 'Event data is required' });
    }

    const filterResult = await eventFilter.filterEvent(event);
    
    res.json(filterResult);
  } catch (error) {
    console.error('[API] Filter test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet-monitoring/filter-stats - Get filter statistics
router.get('/wallet-monitoring/filter-stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    const stats = await eventFilter.getStatistics(period);
    
    res.json(stats);
  } catch (error) {
    console.error('[API] Get filter statistics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================ OKX EXECUTION ENGINE ============================

// GET /api/okx/health - OKX health check
router.get('/okx/health', requireAuth, async (req, res) => {
  try {
    const health = await okxClient.healthCheck();
    res.json(health);
  } catch (error) {
    console.error('[API] OKX health check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/environment - Get OKX environment info
router.get('/okx/environment', requireAuth, async (req, res) => {
  try {
    const env = okxClient.getEnvironment();
    res.json(env);
  } catch (error) {
    console.error('[API] OKX environment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/balance - Get account balance
router.get('/okx/balance', requireAuth, async (req, res) => {
  try {
    const balance = await okxClient.getAccountBalance();
    res.json(balance);
  } catch (error) {
    console.error('[API] OKX balance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/positions - Get positions
router.get('/okx/positions', requireAuth, async (req, res) => {
  try {
    const { instType } = req.query;
    const positions = await okxClient.getPositions(instType);
    res.json(positions);
  } catch (error) {
    console.error('[API] OKX positions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/instruments - Get instruments
router.get('/okx/instruments', requireAuth, async (req, res) => {
  try {
    const { instType = 'SWAP', uly } = req.query;
    const instruments = await okxClient.getInstruments(instType, uly);
    res.json(instruments);
  } catch (error) {
    console.error('[API] OKX instruments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/tickers - Get tickers
router.get('/okx/tickers', requireAuth, async (req, res) => {
  try {
    const { instType = 'SWAP', uly } = req.query;
    const tickers = await okxClient.getTickers(instType, uly);
    res.json(tickers);
  } catch (error) {
    console.error('[API] OKX tickers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/ticker/:instId - Get ticker for specific instrument
router.get('/okx/ticker/:instId', requireAuth, async (req, res) => {
  try {
    const { instId } = req.params;
    const ticker = await okxClient.getTicker(instId);
    res.json(ticker);
  } catch (error) {
    console.error('[API] OKX ticker error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/orders/market - Place market order
router.post('/okx/orders/market', requireAuth, async (req, res) => {
  try {
    const order = await orderManagementService.placeMarketOrder(req.body);
    res.json(order);
  } catch (error) {
    console.error('[API] Market order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/orders/limit - Place limit order
router.post('/okx/orders/limit', requireAuth, async (req, res) => {
  try {
    const order = await orderManagementService.placeLimitOrder(req.body);
    res.json(order);
  } catch (error) {
    console.error('[API] Limit order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/orders/batch - Place multiple orders
router.post('/okx/orders/batch', requireAuth, async (req, res) => {
  try {
    const { orders } = req.body;
    const result = await orderManagementService.placeMultipleOrders(orders);
    res.json(result);
  } catch (error) {
    console.error('[API] Batch orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/orders/:orderId/cancel - Cancel order
router.post('/okx/orders/:orderId/cancel', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { instId } = req.body;
    const result = await orderManagementService.cancelOrder(orderId, instId);
    res.json(result);
  } catch (error) {
    console.error('[API] Cancel order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/orders/:orderId/status - Get order status
router.get('/okx/orders/:orderId/status', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { instId } = req.query;
    const order = await orderManagementService.getOrderStatus(orderId, instId);
    res.json(order);
  } catch (error) {
    console.error('[API] Order status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/orders/active - Get active orders
router.get('/okx/orders/active', requireAuth, async (req, res) => {
  try {
    const { instType = 'SWAP' } = req.query;
    const orders = await orderManagementService.getActiveOrders(instType);
    res.json(orders);
  } catch (error) {
    console.error('[API] Active orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/orders/history - Get order history
router.get('/okx/orders/history', requireAuth, async (req, res) => {
  try {
    const { instType = 'SWAP', limit = 100 } = req.query;
    const orders = await orderManagementService.getOrderHistory(instType, parseInt(limit));
    res.json(orders);
  } catch (error) {
    console.error('[API] Order history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/fills - Get fills
router.get('/okx/fills', requireAuth, async (req, res) => {
  try {
    const { instType = 'SWAP', limit = 100 } = req.query;
    const fills = await orderManagementService.getFills(instType, parseInt(limit));
    res.json(fills);
  } catch (error) {
    console.error('[API] Fills error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/futures/configure - Configure futures account
router.post('/okx/futures/configure', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await futuresTradingService.configureAccount();
    res.json(result);
  } catch (error) {
    console.error('[API] Futures configure error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/futures/leverage - Set leverage
router.post('/okx/futures/leverage', requireAuth, async (req, res) => {
  try {
    const { instId, leverage, mgnMode = 'cross' } = req.body;
    const result = await futuresTradingService.setLeverage(instId, leverage, mgnMode);
    res.json(result);
  } catch (error) {
    console.error('[API] Set leverage error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/futures/positions/open - Open futures position
router.post('/okx/futures/positions/open', requireAuth, async (req, res) => {
  try {
    const result = await futuresTradingService.openPosition(req.body);
    res.json(result);
  } catch (error) {
    console.error('[API] Open position error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/futures/positions/close - Close futures position
router.post('/okx/futures/positions/close', requireAuth, async (req, res) => {
  try {
    const { instId, strategyId } = req.body;
    const result = await futuresTradingService.closePosition(instId, strategyId);
    res.json(result);
  } catch (error) {
    console.error('[API] Close position error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/futures/positions/adjust - Adjust futures position
router.post('/api/okx/futures/positions/adjust', requireAuth, async (req, res) => {
  try {
    const { instId, adjustment } = req.body;
    const result = await futuresTradingService.adjustPosition(instId, adjustment);
    res.json(result);
  } catch (error) {
    console.error('[API] Adjust position error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/futures/margin/:instId - Get margin requirements
router.get('/okx/futures/margin/:instId', requireAuth, async (req, res) => {
  try {
    const { instId } = req.params;
    const marginReq = await futuresTradingService.getMarginRequirements(instId);
    res.json(marginReq);
  } catch (error) {
    console.error('[API] Margin requirements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/futures/liquidation/price - Calculate liquidation price
router.get('/okx/futures/liquidation/price', requireAuth, async (req, res) => {
  try {
    const { instId, positionSize, entryPrice, leverage, side } = req.query;
    const liquidationPrice = await futuresTradingService.calculateLiquidationPrice(
      instId,
      parseFloat(positionSize),
      parseFloat(entryPrice),
      parseFloat(leverage),
      side
    );
    res.json(liquidationPrice);
  } catch (error) {
    console.error('[API] Liquidation price error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/futures/summary - Get futures summary
router.get('/okx/futures/summary', requireAuth, async (req, res) => {
  try {
    const summary = await futuresTradingService.getFuturesSummary();
    res.json(summary);
  } catch (error) {
    console.error('[API] Futures summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/okx/futures/monitors - Get liquidation monitors
router.get('/okx/futures/monitors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const monitors = await futuresTradingService.getLiquidationMonitors();
    res.json(monitors);
  } catch (error) {
    console.error('[API] Liquidation monitors error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/okx/orders/cancel-all - Cancel all orders
router.post('/okx/orders/cancel-all', requireAuth, async (req, res) => {
  try {
    const { instType = 'SWAP' } = req.body;
    const result = await orderManagementService.cancelAllOrders(instType);
    res.json(result);
  } catch (error) {
    console.error('[API] Cancel all orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================ PUSH NOTIFICATION ENDPOINTS ============================

// GET /api/notifications/vapid-public-key - Get VAPID public key
router.get('/notifications/vapid-public-key', async (req, res) => {
  try {
    const publicKey = pushNotificationService.getVAPIDPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('[API] Get VAPID public key error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/subscribe - Subscribe to push notifications
router.post('/notifications/subscribe', requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Add user agent for tracking
    subscription.userAgent = req.headers['user-agent'];

    const result = await pushNotificationService.subscribe(req.user.userId, subscription);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Successfully subscribed to push notifications',
        subscriptionId: result.subscription.id
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('[API] Subscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/unsubscribe - Unsubscribe from push notifications
router.post('/notifications/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const result = await pushNotificationService.unsubscribe(req.user.userId, endpoint);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Successfully unsubscribed from push notifications'
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('[API] Unsubscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/status - Get notification status for user
router.get('/notifications/status', requireAuth, async (req, res) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: req.user.userId,
        isActive: true
      },
      select: {
        id: true,
        endpoint: true,
        lastUsed: true,
        createdAt: true,
        userAgent: true
      }
    });

    res.json({
      hasSubscriptions: subscriptions.length > 0,
      subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    console.error('[API] Get notification status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/test - Send test notification
router.post('/notifications/test', requireAuth, async (req, res) => {
  try {
    const { title = 'Test Notification', body = 'This is a test notification from Zenith Trader' } = req.body;
    
    const result = await pushNotificationService.sendToUser(req.user.userId, {
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: '/dashboard', type: 'TEST' }
    });
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Test notification sent successfully'
      });
    } else {
      res.status(400).json({ error: 'Failed to send test notification' });
    }
  } catch (error) {
    console.error('[API] Test notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/strategy - Send strategy notification
router.post('/notifications/strategy', requireAuth, async (req, res) => {
  try {
    const { strategyId, type, data } = req.body;
    
    if (!strategyId || !type || !data) {
      return res.status(400).json({ error: 'Strategy ID, type, and data are required' });
    }

    // Verify user owns the strategy
    const strategy = await prisma.strategy.findFirst({
      where: {
        id: parseInt(strategyId),
        userId: req.user.userId
      }
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const result = await pushNotificationService.sendStrategyNotification(strategyId, type, data);
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Strategy notification sent successfully'
      });
    } else {
      res.status(400).json({ error: 'Failed to send strategy notification' });
    }
  } catch (error) {
    console.error('[API] Strategy notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/wallet - Send wallet notification
router.post('/notifications/wallet', requireAuth, async (req, res) => {
  try {
    const { walletAddress, type, data } = req.body;
    
    if (!walletAddress || !type || !data) {
      return res.status(400).json({ error: 'Wallet address, type, and data are required' });
    }

    // Verify user has access to this wallet
    const hasAccess = await prisma.strategy.findFirst({
      where: {
        walletAddress,
        userId: req.user.userId
      }
    });

    if (!hasAccess && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied to this wallet' });
    }

    const result = await pushNotificationService.sendWalletNotification(walletAddress, type, data);
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Wallet notification sent successfully'
      });
    } else {
      res.status(400).json({ error: 'Failed to send wallet notification' });
    }
  } catch (error) {
    console.error('[API] Wallet notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/broadcast - Send broadcast notification (admin only)
router.post('/notifications/broadcast', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, body, excludeUserIds = [] } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const result = await pushNotificationService.sendBroadcast({
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: '/dashboard', type: 'BROADCAST' }
    }, excludeUserIds);
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Broadcast notification sent successfully'
      });
    } else {
      res.status(400).json({ error: 'Failed to send broadcast notification' });
    }
  } catch (error) {
    console.error('[API] Broadcast notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/stats - Get notification statistics (admin only)
router.get('/notifications/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await pushNotificationService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('[API] Get notification stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/cleanup - Clean up old subscriptions (admin only)
router.post('/notifications/cleanup', requireAuth, requireAdmin, async (req, res) => {
  try {
    const count = await pushNotificationService.cleanup();
    res.json({ 
      success: true, 
      message: `Cleaned up ${count} old subscriptions`
    });
  } catch (error) {
    console.error('[API] Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/vapid-keys/generate - Generate VAPID keys (admin only)
router.post('/notifications/vapid-keys/generate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const keys = pushNotificationService.generateVAPIDKeys();
    res.json({
      success: true,
      keys,
      message: 'VAPID keys generated. Please update your environment variables.'
    });
  } catch (error) {
    console.error('[API] Generate VAPID keys error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


