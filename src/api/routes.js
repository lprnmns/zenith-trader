// src/api/routes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const zerionService = require('../services/zerionService');
const { loadStrategies } = require('../core/strategyEngine');
const router = express.Router();
const { analyzeWallet } = require('../services/analysisService');

// Import notification routes
const notificationRoutes = require('./notificationRoutes');
const authRoutes = require('./authRoutes');
const authService = require('../services/authService');

const prisma = new PrismaClient();
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
router.get('/strategies', authService.authenticateToken, async (req, res) => {
	try {
		const strategies = await prisma.strategy.findMany({ 
			where: { userId: req.user.userId },
			orderBy: { createdAt: 'desc' } 
		});
		
		// Hide sensitive data
		strategies.forEach((s) => {
			s.okxApiKey = '***';
			s.okxApiSecret = '***';
			s.okxPassphrase = '***';
		});
		res.json(strategies);
	} catch (error) {
		console.error('[API] Get strategies error:', error);
		res.status(500).json({ error: 'Stratejiler alınamadı.' });
	}
});

// POST /api/strategies - create (only admin can create)
router.post('/strategies', authService.authenticateToken, authService.requireAdmin, async (req, res) => {
	try {
		const { name, walletAddress, okxApiKey, okxApiSecret, okxPassphrase, positionSize, leverage, allowedTokens } = req.body;
		if (!name || !walletAddress || !okxApiKey || !okxApiSecret || !okxPassphrase) {
			return res.status(400).json({ error: 'Tüm gerekli alanlar doldurulmalıdır.' });
		}

		const newStrategy = await prisma.strategy.create({
			data: {
				name,
				walletAddress,
				okxApiKey,
				okxApiSecret,
				okxPassphrase,
				positionSize: parseFloat(positionSize),
				leverage: parseInt(leverage, 10),
				allowedTokens: Array.isArray(allowedTokens) ? allowedTokens : [],
				userId: req.user.userId, // Add user association
			},
		});

		await loadStrategies();
		
		// Hide sensitive data before sending response
		const responseStrategy = { ...newStrategy };
		responseStrategy.okxApiKey = '***';
		responseStrategy.okxApiSecret = '***';
		responseStrategy.okxPassphrase = '***';
		
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
router.delete('/strategies/:id', authService.authenticateToken, authService.requireAdmin, async (req, res) => {
	try {
		const id = parseInt(req.params.id, 10);
		
		// Check if strategy belongs to user (admins can delete any)
		const strategy = await prisma.strategy.findUnique({ where: { id } });
		if (!strategy) {
			return res.status(404).json({ error: 'Silinecek strateji bulunamadı.' });
		}
		
		if (req.user.role !== 'admin' && strategy.userId !== req.user.userId) {
			return res.status(403).json({ error: 'Bu stratejiyi silme yetkiniz yok.' });
		}
		
		await prisma.strategy.delete({ where: { id } });
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

// GET /api/strategies/:id/trades - recent trades for a strategy
router.get('/strategies/:id/trades', authService.authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid strategy id' });
    
    // Check if strategy belongs to user (admin can see all)
    const strategy = await prisma.strategy.findUnique({ where: { id } });
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    
    if (req.user.role !== 'admin' && strategy.userId !== req.user.userId) {
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

module.exports = router;


