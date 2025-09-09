const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const { StrategyValidationError, validateWalletAddress, validateTokenSymbol, validateExchange, validateCopyMode } = require('../middleware/strategyValidation');
const { decryptOKXCredentials } = require('../utils/encryption');

class StrategyService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get all strategies for a user
   */
  async getUserStrategies(userId) {
    try {
      const strategies = await this.prisma.strategy.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      logger.info(`Retrieved ${strategies.length} strategies for user ${userId}`, 'strategy-service');
      return strategies;
    } catch (error) {
      logger.error(`Error getting strategies for user ${userId}: ${error.message}`, 'strategy-service');
      throw new Error('Failed to retrieve strategies');
    }
  }

  /**
   * Get a single strategy by ID
   */
  async getStrategyById(id, userId) {
    try {
      const strategy = await this.prisma.strategy.findFirst({
        where: { 
          id: parseInt(id),
          userId 
        },
        include: {
          _count: {
            select: {
              executions: true
            }
          }
        }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      logger.info(`Retrieved strategy ${id} for user ${userId}`, 'strategy-service');
      return strategy;
    } catch (error) {
      logger.error(`Error getting strategy ${id}: ${error.message}`, 'strategy-service');
      throw error;
    }
  }

  /**
   * Create a new strategy
   */
  async createStrategy(strategyData, userId) {
    try {
      // Validate wallet address format
      if (!validateWalletAddress(strategyData.walletAddress)) {
        throw new StrategyValidationError('Invalid wallet address format');
      }

      console.log('[StrategyService] === DUPLICATE CHECK DEBUG ===');
      console.log('[StrategyService] Input userId:', userId);
      console.log('[StrategyService] Input walletAddress:', strategyData.walletAddress);
      console.log('[StrategyService] Query data:', { walletAddress: strategyData.walletAddress, userId });
      
      // Check if wallet address already exists for the same user
      const existingStrategy = await this.prisma.strategy.findFirst({
        where: { 
          walletAddress: strategyData.walletAddress,
          userId: userId
        }
      });

      console.log('[StrategyService] Existing strategy found:', !!existingStrategy);
      if (existingStrategy) {
        console.log('[StrategyService] Existing strategy details:', JSON.stringify(existingStrategy, null, 2));
      }
      
      if (existingStrategy) {
        throw new StrategyValidationError('You already have a strategy for this wallet address');
      }

      // Validate exchange and copy mode
      if (!validateExchange(strategyData.exchange)) {
        throw new StrategyValidationError('Invalid exchange');
      }

      if (!validateCopyMode(strategyData.copyMode)) {
        throw new StrategyValidationError('Invalid copy mode');
      }

      // Validate allowed tokens
      if (strategyData.allowedTokens && Array.isArray(strategyData.allowedTokens)) {
        for (const token of strategyData.allowedTokens) {
          if (!validateTokenSymbol(token)) {
            throw new StrategyValidationError(`Invalid token symbol: ${token}`);
          }
        }
      }

      // Transform data to match Prisma schema
      const createData = {
        ...strategyData,
        userId,
        // Ensure defaults are set
        exchange: strategyData.exchange || 'OKX',
        copyMode: strategyData.copyMode || 'Perpetual',
        positionSize: strategyData.positionSize || 100,
        leverage: strategyData.leverage || 5,
        allowedTokens: strategyData.allowedTokens || [],
        sizingMethod: strategyData.sizingMethod || 'Fixed Amount',
        isActive: strategyData.isActive !== undefined ? strategyData.isActive : true,
        // Set lastChecked to current time to prevent processing historical signals
        lastChecked: strategyData.lastChecked || new Date()
      };

      // Handle equityAllocation conversion
      if (strategyData.equityAllocation) {
        if (strategyData.copyMode === 'PERCENTAGE') {
          createData.percentageToCopy = strategyData.equityAllocation;
        } else {
          createData.amountPerTrade = strategyData.equityAllocation;
        }
        // Remove equityAllocation as it's not in the schema
        delete createData.equityAllocation;
      }

      const strategy = await this.prisma.strategy.create({
        data: createData
      });

      // Log the action
      await this.logAuditAction({
        entityType: 'Strategy',
        entityId: strategy.id,
        action: 'CREATE',
        userId,
        userRole: strategyData.userRole,
        newValues: {
          name: strategy.name,
          exchange: strategy.exchange,
          copyMode: strategy.copyMode,
          walletAddress: strategy.walletAddress
        },
        status: 'SUCCESS',
        description: `Created strategy: ${strategy.name}`
      });

      logger.info(`Created strategy ${strategy.id} for user ${userId}`, 'strategy-service');
      return strategy;
    } catch (error) {
      logger.error(`Error creating strategy for user ${userId}: ${error.message}`, 'strategy-service');
      throw error;
    }
  }

  /**
   * Update a strategy
   */
  async updateStrategy(id, updateData, userId) {
    try {
      // Get current strategy
      const currentStrategy = await this.prisma.strategy.findFirst({
        where: { 
          id: parseInt(id),
          userId 
        }
      });

      if (!currentStrategy) {
        throw new Error('Strategy not found');
      }

      // Validate wallet address if being updated
      if (updateData.walletAddress && updateData.walletAddress !== currentStrategy.walletAddress) {
        if (!validateWalletAddress(updateData.walletAddress)) {
          throw new StrategyValidationError('Invalid wallet address format');
        }

        console.log('[StrategyService] === DUPLICATE CHECK DEBUG ===');
      console.log('[StrategyService] Input userId:', userId);
      console.log('[StrategyService] Input walletAddress:', strategyData.walletAddress);
      console.log('[StrategyService] Query data:', { walletAddress: strategyData.walletAddress, userId });
      
      // Check if wallet address already exists for the same user
        const existingStrategy = await this.prisma.strategy.findFirst({
          where: { 
            walletAddress: updateData.walletAddress,
            userId: userId,
            id: { not: parseInt(id) }
          }
        });

        console.log('[StrategyService] Existing strategy found:', !!existingStrategy);
      if (existingStrategy) {
        console.log('[StrategyService] Existing strategy details:', JSON.stringify(existingStrategy, null, 2));
      }
      
      if (existingStrategy) {
          throw new StrategyValidationError('You already have a strategy for this wallet address');
        }
      }

      // Validate exchange and copy mode if being updated
      if (updateData.exchange && !validateExchange(updateData.exchange)) {
        throw new StrategyValidationError('Invalid exchange');
      }

      if (updateData.copyMode && !validateCopyMode(updateData.copyMode)) {
        throw new StrategyValidationError('Invalid copy mode');
      }

      // Validate allowed tokens if being updated
      if (updateData.allowedTokens && Array.isArray(updateData.allowedTokens)) {
        for (const token of updateData.allowedTokens) {
          if (!validateTokenSymbol(token)) {
            throw new StrategyValidationError(`Invalid token symbol: ${token}`);
          }
        }
      }

      const oldValues = {
        name: currentStrategy.name,
        exchange: currentStrategy.exchange,
        copyMode: currentStrategy.copyMode,
        positionSize: currentStrategy.positionSize,
        leverage: currentStrategy.leverage,
        isActive: currentStrategy.isActive
      };

      const updatedStrategy = await this.prisma.strategy.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      const newValues = {
        name: updatedStrategy.name,
        exchange: updatedStrategy.exchange,
        copyMode: updatedStrategy.copyMode,
        positionSize: updatedStrategy.positionSize,
        leverage: updatedStrategy.leverage,
        isActive: updatedStrategy.isActive
      };

      // Log the action
      await this.logAuditAction({
        entityType: 'Strategy',
        entityId: parseInt(id),
        action: 'UPDATE',
        userId,
        userRole: updateData.userRole,
        oldValues,
        newValues,
        status: 'SUCCESS',
        description: `Updated strategy: ${updatedStrategy.name}`
      });

      logger.info(`Updated strategy ${id} for user ${userId}`, 'strategy-service');
      return updatedStrategy;
    } catch (error) {
      logger.error(`Error updating strategy ${id}: ${error.message}`, 'strategy-service');
      throw error;
    }
  }

  /**
   * Delete a strategy
   */
  async deleteStrategy(id, userId) {
    try {
      const strategy = await this.prisma.strategy.findFirst({
        where: { 
          id: parseInt(id),
          userId 
        }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      await this.prisma.strategy.delete({
        where: { id: parseInt(id) }
      });

      // Log the action
      await this.logAuditAction({
        entityType: 'Strategy',
        entityId: parseInt(id),
        action: 'DELETE',
        userId,
        userRole: strategy.userRole,
        oldValues: {
          name: strategy.name,
          exchange: strategy.exchange,
          copyMode: strategy.copyMode
        },
        status: 'SUCCESS',
        description: `Deleted strategy: ${strategy.name}`
      });

      logger.info(`Deleted strategy ${id} for user ${userId}`, 'strategy-service');
      return { success: true, message: 'Strategy deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting strategy ${id}: ${error.message}`, 'strategy-service');
      throw error;
    }
  }

  /**
   * Get strategy performance metrics
   */
  async getStrategyPerformance(id, userId) {
    try {
      const strategy = await this.prisma.strategy.findFirst({
        where: { 
          id: parseInt(id),
          userId 
        }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      // Get performance data - temporarily disabled due to missing tables
      // const executions = await this.prisma.strategyExecution.findMany({
      //   where: { strategyId: parseInt(id) },
      //   orderBy: { timestamp: 'desc' },
      //   take: 1000 // Last 1000 executions for performance calculation
      // });

      // const trades = await this.prisma.trade.findMany({
      //   where: { strategyId: parseInt(id) },
      //   orderBy: { createdAt: 'desc' },
      //   take: 1000
      // });

      // Calculate performance metrics - placeholder values
      const totalExecutions = 0;
      const successfulExecutions = 0;
      const failedExecutions = 0;
      
      // Calculate performance metrics - placeholder values
      const totalTrades = 0;
      const successfulTrades = 0;
      
      const totalPnL = 0;
      const avgExecutionTime = 0;

      const performance = {
        strategy: {
          id: strategy.id,
          name: strategy.name,
          currentPnL: strategy.currentPnL,
          totalPnL: strategy.totalPnL,
          tradesCount: strategy.tradesCount
        },
        executions: {
          total: totalExecutions,
          successful: successfulExecutions,
          failed: failedExecutions,
          successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(2) : 0
        },
        trades: {
          total: totalTrades,
          successful: successfulTrades,
          successRate: totalTrades > 0 ? (successfulTrades / totalTrades * 100).toFixed(2) : 0
        },
        performance: {
          totalPnL: totalPnL.toFixed(8),
          avgExecutionTime: avgExecutionTime.toFixed(2),
          executionsCount: 0
        }
      };

      logger.info(`Retrieved performance for strategy ${id}`, 'strategy-service');
      return performance;
    } catch (error) {
      logger.error(`Error getting performance for strategy ${id}: ${error.message}`, 'strategy-service');
      throw error;
    }
  }

  /**
   * Log audit action
   */
  async logAuditAction(auditData) {
    try {
      await this.prisma.auditLog.create({
        data: {
          ...auditData,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error(`Error logging audit action: ${error.message}`, 'strategy-service');
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Health check for strategy service
   */
  async healthCheck() {
    try {
      await this.prisma.strategy.count();
      return { status: 'healthy', message: 'Strategy service is running' };
    } catch (error) {
      logger.error(`Strategy service health check failed: ${error.message}`, 'strategy-service');
      return { status: 'unhealthy', message: 'Strategy service is not responding' };
    }
  }

  /**
   * Clean up resources
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = StrategyService;
