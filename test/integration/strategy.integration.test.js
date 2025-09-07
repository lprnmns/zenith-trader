const request = require('supertest');
const express = require('express');
const router = require('../../src/api/routes');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

// Mock the services and middleware
jest.mock('../../src/services/strategyService');
jest.mock('../../src/services/strategyExecutionService');
jest.mock('../../src/services/auditLogService');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/middleware/strategyValidation');
jest.mock('../../src/core/strategyEngine');

const StrategyService = require('../../src/services/strategyService');
const StrategyExecutionService = require('../../src/services/strategyExecutionService');
const AuditLogService = require('../../src/services/auditLogService');
const { requireAuth, requireAdmin } = require('../../src/middleware/auth');
const { validateStrategy, validateStrategyUpdate, validateStrategyExecution, handleValidationErrors } = require('../../src/middleware/strategyValidation');
const { loadStrategies } = require('../../src/core/strategyEngine');

// Create test app
const app = express();
app.use(express.json());
app.use('/api', router);

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    strategy: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    trade: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    suggestedWallet: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  })),
}));

describe('Strategy API Integration Tests', () => {
  let mockPrisma;
  let strategyService;
  let executionService;
  let auditService;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    strategyService = new StrategyService();
    executionService = new StrategyExecutionService();
    auditService = new AuditLogService();

    // Reset all mocks
    jest.clearAllMocks();

    // Mock auth middleware
    requireAuth.mockImplementation((req, res, next) => {
      req.user = { userId: 1, role: 'USER' };
      next();
    });

    requireAdmin.mockImplementation((req, res, next) => {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    });

    // Mock validation middleware
    validateStrategy.mockImplementation((req, res, next) => {
      req.validatedData = req.body;
      next();
    });

    validateStrategyUpdate.mockImplementation((req, res, next) => {
      req.validatedData = req.body;
      next();
    });

    validateStrategyExecution.mockImplementation((req, res, next) => {
      req.validatedData = req.body;
      next();
    });

    handleValidationErrors.mockImplementation((req, res, next) => {
      next();
    });

    // Mock loadStrategies
    loadStrategies.mockResolvedValue();
  });

  describe('GET /api/strategies', () => {
    it('should return user strategies with successful response', async () => {
      const mockStrategies = [
        {
          id: 1,
          name: 'Test Strategy',
          walletAddress: '0x123...',
          exchange: 'OKX',
          copyMode: 'Perpetual',
          isActive: true,
          currentPnL: 100,
          totalPnL: 500,
          tradesCount: 10,
          createdAt: new Date('2025-01-01'),
          leverage: 10,
          stopLoss: 5,
          dailyLimit: 1000,
          sizingMethod: 'Fixed Amount',
          amountPerTrade: 100,
          percentageToCopy: 50,
          allowedTokens: ['BTC', 'ETH'],
          executions_count: 5,
          executions: [],
        },
      ];

      strategyService.getUserStrategies.mockResolvedValue(mockStrategies);

      const response = await request(app)
        .get('/api/strategies')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        id: '1',
        name: 'Test Strategy',
        walletAddress: '0x123...',
        exchange: 'OKX',
        copyMode: 'Perpetual',
        isActive: true,
        currentPnL: 100,
        totalPnL: 500,
        tradesCount: 10,
        createdAt: expect.any(String),
        leverage: 10,
        stopLoss: 5,
        dailyLimit: 1000,
        sizingMethod: 'Fixed Amount',
        amountPerTrade: 100,
        percentageToCopy: 50,
        allowedTokens: ['BTC', 'ETH'],
        apiKey: undefined,
        apiSecret: undefined,
        passphrase: undefined,
        executionsCount: 5,
        recentExecutions: [],
      });

      expect(strategyService.getUserStrategies).toHaveBeenCalledWith(1);
    });

    it('should handle service errors gracefully', async () => {
      strategyService.getUserStrategies.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/strategies')
        .expect(500);

      expect(response.body).toEqual({ error: 'Stratejiler alınamadı.' });
    });
  });

  describe('POST /api/strategies', () => {
    it('should create strategy successfully with admin access', async () => {
      // Set admin role for this test
      requireAuth.mockImplementation((req, res, next) => {
        req.user = { userId: 1, role: 'ADMIN' };
        next();
      });

      const mockStrategy = {
        id: 1,
        name: 'New Strategy',
        walletAddress: '0x456...',
        exchange: 'OKX',
        copyMode: 'Perpetual',
        isActive: true,
        currentPnL: 0,
        totalPnL: 0,
        tradesCount: 0,
        createdAt: new Date(),
        leverage: 5,
        stopLoss: 10,
        dailyLimit: 500,
        sizingMethod: 'Percentage',
        amountPerTrade: 100,
        percentageToCopy: 25,
        allowedTokens: ['BTC'],
      };

      const strategyData = {
        name: 'New Strategy',
        walletAddress: '0x456...',
        exchange: 'OKX',
        copyMode: 'Perpetual',
        leverage: 5,
        stopLoss: 10,
        dailyLimit: 500,
        sizingMethod: 'Percentage',
        amountPerTrade: 100,
        percentageToCopy: 25,
        allowedTokens: ['BTC'],
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        passphrase: 'test-passphrase',
      };

      strategyService.createStrategy.mockResolvedValue(mockStrategy);

      const response = await request(app)
        .post('/api/strategies')
        .send(strategyData)
        .expect(201);

      expect(response.body).toEqual({
        id: '1',
        name: 'New Strategy',
        walletAddress: '0x456...',
        exchange: 'OKX',
        copyMode: 'Perpetual',
        isActive: true,
        currentPnL: 0,
        totalPnL: 0,
        tradesCount: 0,
        createdAt: expect.any(String),
        leverage: 5,
        stopLoss: 10,
        dailyLimit: 500,
        sizingMethod: 'Percentage',
        amountPerTrade: 100,
        percentageToCopy: 25,
        allowedTokens: ['BTC'],
        apiKey: '***',
        apiSecret: '***',
        passphrase: '***',
      });

      expect(strategyService.createStrategy).toHaveBeenCalledWith(
        {
          name: 'New Strategy',
          walletAddress: '0x456...',
          exchange: 'OKX',
          copyMode: 'Perpetual',
          leverage: 5,
          stopLoss: 10,
          dailyLimit: 500,
          sizingMethod: 'Percentage',
          amountPerTrade: 100,
          percentageToCopy: 25,
          allowedTokens: ['BTC'],
          okxApiKey: 'test-key',
          okxApiSecret: 'test-secret',
          okxPassphrase: 'test-passphrase',
          userRole: 'ADMIN',
        },
        1
      );

      expect(loadStrategies).toHaveBeenCalled();
    });

    it('should reject strategy creation without admin access', async () => {
      const strategyData = {
        name: 'New Strategy',
        walletAddress: '0x456...',
        exchange: 'OKX',
      };

      const response = await request(app)
        .post('/api/strategies')
        .send(strategyData)
        .expect(403);

      expect(response.body).toEqual({ error: 'Admin access required' });
    });

    it('should handle duplicate wallet address error', async () => {
      // Set admin role for this test
      requireAuth.mockImplementation((req, res, next) => {
        req.user = { userId: 1, role: 'ADMIN' };
        next();
      });

      const strategyData = {
        name: 'New Strategy',
        walletAddress: '0x456...',
        exchange: 'OKX',
      };

      const error = new Error('Duplicate wallet address');
      error.code = 'P2002';
      strategyService.createStrategy.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/strategies')
        .send(strategyData)
        .expect(409);

      expect(response.body).toEqual({ error: 'Bu cüzdan adresi zaten başka bir strateji tarafından kullanılıyor.' });
    });
  });

  describe('PUT /api/strategies/:id', () => {
    it('should update strategy successfully with admin access', async () => {
      // Set admin role for this test
      requireAuth.mockImplementation((req, res, next) => {
        req.user = { userId: 1, role: 'ADMIN' };
        next();
      });

      const mockStrategy = {
        id: 1,
        name: 'Updated Strategy',
        walletAddress: '0x123...',
        exchange: 'OKX',
        copyMode: 'Perpetual',
        isActive: true,
        currentPnL: 100,
        totalPnL: 500,
        tradesCount: 10,
        createdAt: new Date(),
        leverage: 15,
        stopLoss: 8,
        dailyLimit: 1500,
        sizingMethod: 'Fixed Amount',
        amountPerTrade: 150,
        percentageToCopy: 60,
        allowedTokens: ['BTC', 'ETH', 'SOL'],
      };

      const updateData = {
        name: 'Updated Strategy',
        leverage: 15,
        stopLoss: 8,
        dailyLimit: 1500,
        amountPerTrade: 150,
        percentageToCopy: 60,
        allowedTokens: ['BTC', 'ETH', 'SOL'],
      };

      strategyService.updateStrategy.mockResolvedValue(mockStrategy);

      const response = await request(app)
        .put('/api/strategies/1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        id: '1',
        name: 'Updated Strategy',
        walletAddress: '0x123...',
        exchange: 'OKX',
        copyMode: 'Perpetual',
        isActive: true,
        currentPnL: 100,
        totalPnL: 500,
        tradesCount: 10,
        createdAt: expect.any(String),
        leverage: 15,
        stopLoss: 8,
        dailyLimit: 1500,
        sizingMethod: 'Fixed Amount',
        amountPerTrade: 150,
        percentageToCopy: 60,
        allowedTokens: ['BTC', 'ETH', 'SOL'],
        apiKey: '***',
        apiSecret: '***',
        passphrase: '***',
      });

      expect(strategyService.updateStrategy).toHaveBeenCalledWith(
        1,
        {
          name: 'Updated Strategy',
          leverage: 15,
          stopLoss: 8,
          dailyLimit: 1500,
          amountPerTrade: 150,
          percentageToCopy: 60,
          allowedTokens: ['BTC', 'ETH', 'SOL'],
          userRole: 'ADMIN',
        },
        1
      );

      expect(loadStrategies).toHaveBeenCalled();
    });

    it('should reject strategy update without admin access', async () => {
      const updateData = {
        name: 'Updated Strategy',
        leverage: 15,
      };

      const response = await request(app)
        .put('/api/strategies/1')
        .send(updateData)
        .expect(403);

      expect(response.body).toEqual({ error: 'Admin access required' });
    });

    it('should handle strategy not found error', async () => {
      // Set admin role for this test
      requireAuth.mockImplementation((req, res, next) => {
        req.user = { userId: 1, role: 'ADMIN' };
        next();
      });

      const updateData = {
        name: 'Updated Strategy',
      };

      const error = new Error('Strategy not found');
      error.code = 'P2025';
      strategyService.updateStrategy.mockRejectedValue(error);

      const response = await request(app)
        .put('/api/strategies/1')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({ error: 'Güncellenecek strateji bulunamadı.' });
    });
  });

  describe('DELETE /api/strategies/:id', () => {
    it('should delete strategy successfully with admin access', async () => {
      // Set admin role for this test
      requireAuth.mockImplementation((req, res, next) => {
        req.user = { userId: 1, role: 'ADMIN' };
        next();
      });

      mockPrisma.strategy.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        name: 'Test Strategy',
      });

      strategyService.deleteStrategy.mockResolvedValue();

      await request(app)
        .delete('/api/strategies/1')
        .expect(204);

      expect(strategyService.deleteStrategy).toHaveBeenCalledWith(1, 1);
      expect(loadStrategies).toHaveBeenCalled();
    });

    it('should reject strategy deletion without admin access', async () => {
      const response = await request(app)
        .delete('/api/strategies/1')
        .expect(403);

      expect(response.body).toEqual({ error: 'Admin access required' });
    });

    it('should handle strategy not found error', async () => {
      // Set admin role for this test
      requireAuth.mockImplementation((req, res, next) => {
        req.user = { userId: 1, role: 'ADMIN' };
        next();
      });

      mockPrisma.strategy.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/strategies/1')
        .expect(404);

      expect(response.body).toEqual({ error: 'Silinecek strateji bulunamadı.' });
    });

    it('should handle service deletion errors', async () => {
      // Set admin role for this test
      requireAuth.mockImplementation((req, res, next) => {
        req.user = { userId: 1, role: 'ADMIN' };
        next();
      });

      mockPrisma.strategy.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        name: 'Test Strategy',
      });

      const error = new Error('Delete failed');
      error.code = 'P2025';
      strategyService.deleteStrategy.mockRejectedValue(error);

      const response = await request(app)
        .delete('/api/strategies/1')
        .expect(404);

      expect(response.body).toEqual({ error: 'Silinecek strateji bulunamadı.' });
    });
  });

  describe('GET /api/strategies/:id/trades', () => {
    it('should return trades for strategy successfully', async () => {
      const mockTrades = [
        {
          id: 1,
          createdAt: new Date('2025-01-01'),
          action: 'BUY',
          token: 'BTC',
          amount: 0.1,
          status: 'COMPLETED',
        },
        {
          id: 2,
          createdAt: new Date('2025-01-02'),
          action: 'SELL',
          token: 'ETH',
          amount: 1.0,
          status: 'COMPLETED',
        },
      ];

      mockPrisma.strategy.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        name: 'Test Strategy',
      });

      mockPrisma.trade.findMany.mockResolvedValue(mockTrades);

      const response = await request(app)
        .get('/api/strategies/1/trades')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({
        id: 1,
        date: expect.any(Date),
        action: 'BUY',
        token: 'BTC',
        amount: 0.1,
        status: 'COMPLETED',
      });

      expect(mockPrisma.trade.findMany).toHaveBeenCalledWith({
        where: { strategyId: 1 },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should reject access to trades for non-owned strategy', async () => {
      mockPrisma.strategy.findUnique.mockResolvedValue({
        id: 1,
        userId: 2, // Different user
        name: 'Other Strategy',
      });

      const response = await request(app)
        .get('/api/strategies/1/trades')
        .expect(403);

      expect(response.body).toEqual({ error: 'Bu stratejinin trades verilerine erişim yetkiniz yok.' });
    });

    it('should handle invalid strategy ID', async () => {
      const response = await request(app)
        .get('/api/strategies/invalid/trades')
        .expect(400);

      expect(response.body).toEqual({ error: 'Invalid strategy id' });
    });

    it('should handle strategy not found', async () => {
      mockPrisma.strategy.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/strategies/999/trades')
        .expect(404);

      expect(response.body).toEqual({ error: 'Strategy not found' });
    });
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return dashboard summary successfully', async () => {
      const mockStrategies = [
        { id: 1, isActive: true },
        { id: 2, isActive: false },
        { id: 3, isActive: true },
      ];

      mockPrisma.strategy.findMany.mockResolvedValue(mockStrategies);

      const response = await request(app)
        .get('/api/dashboard/summary')
        .expect(200);

      expect(response.body).toEqual({
        totalPnl24h: 0,
        totalPnl24hPercentage: 0,
        activeStrategiesCount: 2,
        totalStrategiesCount: 3,
        totalTrades24h: 0,
        recentTrades: [],
      });

      expect(mockPrisma.strategy.findMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.strategy.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard/summary')
        .expect(500);

      expect(response.body).toEqual({ error: 'Summary hesaplanamadı' });
    });
  });

  describe('GET /api/explorer/suggested-wallets', () => {
    it('should return suggested wallets ordered by consistency score', async () => {
      const mockWallets = [
        { address: '0x123...', consistencyScore: 95 },
        { address: '0x456...', consistencyScore: 87 },
        { address: '0x789...', consistencyScore: 92 },
      ];

      mockPrisma.suggestedWallet.findMany.mockResolvedValue(mockWallets);

      const response = await request(app)
        .get('/api/explorer/suggested-wallets')
        .expect(200);

      expect(response.body).toEqual(mockWallets);
      expect(mockPrisma.suggestedWallet.findMany).toHaveBeenCalledWith({
        orderBy: { consistencyScore: 'desc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.suggestedWallet.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/explorer/suggested-wallets')
        .expect(500);

      expect(response.body).toEqual({ error: 'Suggested wallets alınamadı' });
    });
  });

  describe('GET /api/health', () => {
    it('should return health check response', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});