const StrategyService = require('../src/services/strategyService');
const { AuditLogService } = require('../src/services/auditLogService');
const { PrismaClient } = require('@prisma/client');

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    strategy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    strategyExecution: {
      findMany: jest.fn(),
    },
    trade: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  })),
}));

describe('StrategyService', () => {
  let strategyService;
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    strategyService = new StrategyService();
    strategyService.prisma = mockPrisma;
    jest.clearAllMocks();
  });

  describe('createStrategy', () => {
    const mockStrategyData = {
      name: 'Test Strategy',
      description: 'Test description',
      exchange: 'OKX',
      copyMode: 'Perpetual',
      riskLevel: 'MEDIUM',
      isActive: true,
      maxPositionSize: 1000,
      stopLoss: 5,
      takeProfit: 10,
      userId: 1,
      walletAddress: '0x1234567890123456789012345678901234567890',
    };

    it('should create a new strategy successfully', async () => {
      const mockCreatedStrategy = {
        id: 1,
        ...mockStrategyData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.strategy.create.mockResolvedValue(mockCreatedStrategy);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await strategyService.createStrategy(mockStrategyData);

      expect(result).toEqual(mockCreatedStrategy);
      expect(mockPrisma.strategy.create).toHaveBeenCalledWith({
        data: mockStrategyData,
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          entityType: 'STRATEGY',
          entityId: 1,
          userId: 1,
          details: expect.stringContaining('Test Strategy'),
        }),
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockPrisma.strategy.create.mockRejectedValue(error);

      await expect(strategyService.createStrategy(mockStrategyData))
        .rejects.toThrow('Database error');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        exchange: 'OKX',
      };

      await expect(strategyService.createStrategy(invalidData))
        .rejects.toThrow();
    });
  });

  describe('getStrategies', () => {
    it('should return all strategies for a user', async () => {
      const mockStrategies = [
        {
          id: 1,
          name: 'Strategy 1',
          userId: 1,
          isActive: true,
        },
        {
          id: 2,
          name: 'Strategy 2',
          userId: 1,
          isActive: false,
        },
      ];

      mockPrisma.strategy.findMany.mockResolvedValue(mockStrategies);

      const result = await strategyService.getUserStrategies(1);

      expect(result).toEqual(mockStrategies);
      expect(mockPrisma.strategy.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          executions: {
            orderBy: { timestamp: 'desc' },
            take: 10
          },
          _count: {
            select: {
              executions: true,
              trades: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by active status', async () => {
      const mockActiveStrategies = [
        {
          id: 1,
          name: 'Active Strategy',
          userId: 1,
          isActive: true,
        },
      ];

      mockPrisma.strategy.findMany.mockResolvedValue(mockActiveStrategies);

      const result = await strategyService.getUserStrategies(1);

      expect(result).toEqual(mockActiveStrategies);
      expect(mockPrisma.strategy.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          executions: {
            orderBy: { timestamp: 'desc' },
            take: 10
          },
          _count: {
            select: {
              executions: true,
              trades: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateStrategy', () => {
    const mockUpdateData = {
      name: 'Updated Strategy',
      isActive: false,
    };

    it('should update a strategy successfully', async () => {
      const mockExistingStrategy = {
        id: 1,
        name: 'Old Strategy',
        userId: 1,
        isActive: true,
      };

      const mockUpdatedStrategy = {
        ...mockExistingStrategy,
        ...mockUpdateData,
      };

      mockPrisma.strategy.findFirst.mockResolvedValue(mockExistingStrategy);
      mockPrisma.strategy.update.mockResolvedValue(mockUpdatedStrategy);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await strategyService.updateStrategy(1, mockUpdateData, 1);

      expect(result).toEqual(mockUpdatedStrategy);
      expect(mockPrisma.strategy.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: mockUpdateData,
      });
    });

    it('should throw error if strategy not found', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      await expect(strategyService.updateStrategy(1, mockUpdateData, 1))
        .rejects.toThrow('Strategy not found');
    });

    it('should validate ownership', async () => {
      const mockOtherUserStrategy = {
        id: 1,
        name: 'Other Strategy',
        userId: 2, // Different user
        isActive: true,
      };

      mockPrisma.strategy.findFirst.mockResolvedValue(mockOtherUserStrategy);

      await expect(strategyService.updateStrategy(1, mockUpdateData, 1))
        .rejects.toThrow('Strategy not found');
    });
  });

  describe('deleteStrategy', () => {
    it('should delete a strategy successfully', async () => {
      const mockStrategy = {
        id: 1,
        name: 'Strategy to Delete',
        userId: 1,
        isActive: true,
      };

      mockPrisma.strategy.findFirst.mockResolvedValue(mockStrategy);
      mockPrisma.strategy.delete.mockResolvedValue(mockStrategy);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await strategyService.deleteStrategy(1, 1);

      expect(result).toEqual(mockStrategy);
      expect(mockPrisma.strategy.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw error if strategy not found', async () => {
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      await expect(strategyService.deleteStrategy(1, 1))
        .rejects.toThrow('Strategy not found');
    });
  });

  describe('getStrategyPerformance', () => {
    it('should return strategy performance metrics', async () => {
      const mockStrategy = {
        id: 1,
        name: 'Test Strategy',
        userId: 1,
        isActive: true,
      };

      const mockExecutions = [
        { id: 1, strategyId: 1, status: 'SUCCESS', pnl: 100, executionTime: 1000 },
        { id: 2, strategyId: 1, status: 'FAILED', pnl: -50, executionTime: 500 },
      ];

      mockPrisma.strategy.findFirst.mockResolvedValue(mockStrategy);
      mockPrisma.strategyExecution.findMany.mockResolvedValue(mockExecutions);
      mockPrisma.trade.findMany.mockResolvedValue([]);

      const result = await strategyService.getStrategyPerformance(1, 1);

      expect(result.strategy.id).toBe(mockStrategy.id);
      expect(result.strategy.name).toBe(mockStrategy.name);
      expect(result.totalExecutions).toBe(2);
      expect(result.successfulExecutions).toBe(1);
      expect(result.failedExecutions).toBe(1);
      expect(result.totalPnL).toBe(50);
    });
  });
});