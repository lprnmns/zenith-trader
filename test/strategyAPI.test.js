const request = require('supertest');
const app = require('../src/server');
const { PrismaClient } = require('@prisma/client');

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    strategy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  })),
}));

describe('Strategy API Endpoints', () => {
  let mockPrisma;
  let authToken;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
    
    // Mock authentication token
    authToken = 'Bearer mock-jwt-token';
  });

  describe('POST /api/strategies', () => {
    const strategyData = {
      name: 'Test Strategy',
      description: 'Test description',
      exchange: 'OKX',
      copyMode: 'MIRROR',
      riskLevel: 'MEDIUM',
      isActive: true,
      maxPositionSize: 1000,
      stopLoss: 5,
      takeProfit: 10,
    };

    it('should create a new strategy', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const mockStrategy = {
        id: 1,
        ...strategyData,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock authentication middleware
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });

      mockPrisma.strategy.create.mockResolvedValue(mockStrategy);

      const response = await request(app)
        .post('/api/strategies')
        .set('Authorization', authToken)
        .send(strategyData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockStrategy,
      });
      expect(mockPrisma.strategy.create).toHaveBeenCalledWith({
        data: {
          ...strategyData,
          userId: 1,
        },
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/strategies')
        .send(strategyData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });

    it('should return 400 if validation fails', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        exchange: 'OKX',
      };

      const response = await request(app)
        .post('/api/strategies')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: expect.any(String),
      });
    });
  });

  describe('GET /api/strategies', () => {
    it('should return user strategies', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const mockStrategies = [
        {
          id: 1,
          name: 'Strategy 1',
          userId: 1,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 2,
          name: 'Strategy 2',
          userId: 1,
          isActive: false,
          createdAt: new Date(),
        },
      ];

      // Mock authentication middleware
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });

      mockPrisma.strategy.findMany.mockResolvedValue(mockStrategies);

      const response = await request(app)
        .get('/api/strategies')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStrategies,
      });
      expect(mockPrisma.strategy.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by active status', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const mockActiveStrategies = [
        {
          id: 1,
          name: 'Active Strategy',
          userId: 1,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      // Mock authentication middleware
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });

      mockPrisma.strategy.findMany.mockResolvedValue(mockActiveStrategies);

      const response = await request(app)
        .get('/api/strategies?isActive=true')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockActiveStrategies,
      });
    });
  });

  describe('PUT /api/strategies/:id', () => {
    const updateData = {
      name: 'Updated Strategy',
      isActive: false,
    };

    it('should update a strategy', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const mockExistingStrategy = {
        id: 1,
        name: 'Old Strategy',
        userId: 1,
        isActive: true,
      };

      const mockUpdatedStrategy = {
        ...mockExistingStrategy,
        ...updateData,
      };

      // Mock authentication middleware
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });

      mockPrisma.strategy.findUnique.mockResolvedValue(mockExistingStrategy);
      mockPrisma.strategy.update.mockResolvedValue(mockUpdatedStrategy);

      const response = await request(app)
        .put('/api/strategies/1')
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedStrategy,
      });
    });

    it('should return 404 if strategy not found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      };

      // Mock authentication middleware
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });

      mockPrisma.strategy.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/strategies/999')
        .set('Authorization', authToken)
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Strategy not found',
      });
    });
  });

  describe('DELETE /api/strategies/:id', () => {
    it('should delete a strategy', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const mockStrategy = {
        id: 1,
        name: 'Strategy to Delete',
        userId: 1,
        isActive: true,
      };

      // Mock authentication middleware
      app.use((req, res, next) => {
        req.user = mockUser;
        next();
      });

      mockPrisma.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrisma.strategy.delete.mockResolvedValue(mockStrategy);

      const response = await request(app)
        .delete('/api/strategies/1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStrategy,
      });
    });
  });
});