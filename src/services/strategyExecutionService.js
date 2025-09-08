const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const { StrategyExecutionValidationError, validateTokenSymbol } = require('../middleware/strategyValidation');

class StrategyExecutionService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get executions for a strategy
   */
  async getStrategyExecutions(strategyId, userId, limit = 50, offset = 0) {
    try {
      // Verify strategy belongs to user
      const strategy = await this.prisma.strategy.findFirst({
        where: { 
          id: parseInt(strategyId),
          userId 
        }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      const executions = await this.prisma.strategyExecution.findMany({
        where: { strategyId: parseInt(strategyId) },
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      const total = await this.prisma.strategyExecution.count({
        where: { strategyId: parseInt(strategyId) }
      });

      logger.info(`Retrieved ${executions.length} executions for strategy ${strategyId}`, 'execution-service');
      return {
        executions,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: total > parseInt(offset) + parseInt(limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting executions for strategy ${strategyId}: ${error.message}`, 'execution-service');
      throw error;
    }
  }

  /**
   * Create a new strategy execution
   */
  async createExecution(executionData, userId) {
    try {
      // Verify strategy belongs to user
      const strategy = await this.prisma.strategy.findFirst({
        where: { 
          id: parseInt(executionData.strategyId),
          userId 
        }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      // Validate token symbol
      if (executionData.token && !validateTokenSymbol(executionData.token)) {
        throw new StrategyExecutionValidationError('Invalid token symbol');
      }

      // Validate numeric fields
      if (executionData.amount && (executionData.amount <= 0 || executionData.amount > 10000)) {
        throw new StrategyExecutionValidationError('Amount must be between 0 and 10000');
      }

      if (executionData.price && (executionData.price <= 0 || executionData.price > 1000000)) {
        throw new StrategyExecutionValidationError('Price must be between 0 and 1000000');
      }

      const execution = await this.prisma.strategyExecution.create({
        data: {
          ...executionData,
          strategyId: parseInt(executionData.strategyId),
          timestamp: new Date()
        }
      });

      // Update strategy P&L if applicable
      if (executionData.pnl !== null && executionData.pnl !== undefined) {
        await this.updateStrategyPnL(parseInt(executionData.strategyId), parseFloat(executionData.pnl));
      }

      // Log the execution
      await this.logAuditAction({
        entityType: 'Strategy',
        entityId: parseInt(executionData.strategyId),
        action: 'EXECUTE',
        userId,
        userRole: executionData.userRole,
        newValues: {
          executionType: executionData.executionType,
          signalType: executionData.signalType,
          token: executionData.token,
          status: executionData.status
        },
        status: executionData.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        description: `${executionData.executionType}: ${executionData.signalType} ${executionData.token || ''}`
      });

      logger.info(`Created execution for strategy ${executionData.strategyId}`, 'execution-service');
      return execution;
    } catch (error) {
      logger.error(`Error creating execution: ${error.message}`, 'execution-service');
      throw error;
    }
  }

  /**
   * Process a signal (buy/sell) for a strategy
   */
  async processSignal(strategyId, signalData, userId) {
    try {
      const strategy = await this.prisma.strategy.findFirst({
        where: { 
          id: parseInt(strategyId),
          userId 
        }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      if (!strategy.isActive) {
        throw new Error('Strategy is not active');
      }

      // Check if token is allowed
      if (strategy.allowedTokens.length > 0 && !strategy.allowedTokens.includes(signalData.token)) {
        throw new Error(`Token ${signalData.token} is not allowed in this strategy`);
      }

      // Check daily limit
      if (strategy.dailyLimit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayExecutions = await this.prisma.strategyExecution.count({
          where: {
            strategyId: parseInt(strategyId),
            timestamp: {
              gte: today
            }
          }
        });

        if (todayExecutions >= strategy.dailyLimit) {
          throw new Error('Daily execution limit reached');
        }
      }

      // Calculate position size
      let positionSize = strategy.positionSize;
      if (strategy.sizingMethod === 'Percentage of Wallet\'s Trade' && strategy.percentageToCopy) {
        positionSize = positionSize * strategy.percentageToCopy;
      }

      // Create signal execution record
      const signalExecution = await this.createExecution({
        strategyId: parseInt(strategyId),
        executionType: 'SIGNAL_RECEIVED',
        status: 'PENDING',
        signalType: signalData.signalType,
        token: signalData.token,
        amount: signalData.amount || positionSize,
        price: signalData.price,
        userRole: signalData.userRole
      }, userId);

      // Execute the trade (simulated for now)
      try {
        const tradeResult = await this.executeTrade({
          strategy,
          signalData,
          positionSize,
          signalExecutionId: signalExecution.id
        });

        // Update execution with trade result
        await this.updateExecution(signalExecution.id, {
          status: 'SUCCESS',
          executedPrice: tradeResult.price,
          executedAmount: tradeResult.amount,
          fee: tradeResult.fee,
          exchangeOrderId: tradeResult.orderId,
          executionTime: tradeResult.executionTime,
          pnl: tradeResult.pnl
        });

        logger.info(`Signal processed successfully for strategy ${strategyId}`, 'execution-service');
        return {
          success: true,
          execution: signalExecution,
          trade: tradeResult
        };
      } catch (tradeError) {
        // Update execution with error
        await this.updateExecution(signalExecution.id, {
          status: 'FAILED',
          errorCode: tradeError.code || 'TRADE_FAILED',
          errorMessage: tradeError.message
        });

        logger.error(`Trade execution failed for strategy ${strategyId}: ${tradeError.message}`, 'execution-service');
        return {
          success: false,
          execution: signalExecution,
          error: tradeError.message
        };
      }
    } catch (error) {
      logger.error(`Error processing signal for strategy ${strategyId}: ${error.message}`, 'execution-service');
      throw error;
    }
  }

  /**
   * Execute a trade (simulated)
   */
  async executeTrade(tradeData) {
    // This is a simulated trade execution
    // In a real implementation, this would connect to exchange APIs
    
    const { strategy, signalData, positionSize } = tradeData;
    
    // Simulate execution time
    const executionTime = Math.floor(Math.random() * 500) + 100; // 100-600ms
    
    // Simulate price slippage (0.1% - 0.5%)
    const slippage = (Math.random() * 0.4 + 0.1) / 100;
    const executedPrice = signalData.price * (1 + (signalData.signalType === 'BUY' ? slippage : -slippage));
    
    // Calculate executed amount (considering leverage)
    const executedAmount = positionSize / executedPrice * strategy.leverage;
    
    // Calculate fee (0.1% of trade value)
    const fee = executedAmount * executedPrice * 0.001;
    
    // Simulate P&L (random for demo purposes)
    const pnlChange = (Math.random() - 0.5) * executedAmount * executedPrice * 0.01; // ±1% of trade value
    
    return {
      orderId: `OKX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      price: executedPrice,
      amount: executedAmount,
      fee: fee,
      executionTime: executionTime,
      pnl: pnlChange
    };
  }

  /**
   * Update an execution
   */
  async updateExecution(executionId, updateData) {
    try {
      const execution = await this.prisma.strategyExecution.update({
        where: { id: parseInt(executionId) },
        data: updateData
      });

      logger.info(`Updated execution ${executionId}`, 'execution-service');
      return execution;
    } catch (error) {
      logger.error(`Error updating execution ${executionId}: ${error.message}`, 'execution-service');
      throw error;
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(strategyId, userId, period = '7d') {
    try {
      // Verify strategy belongs to user
      const strategy = await this.prisma.strategy.findFirst({
        where: { 
          id: parseInt(strategyId),
          userId 
        }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const executions = await this.prisma.strategyExecution.findMany({
        where: {
          strategyId: parseInt(strategyId),
          timestamp: {
            gte: startDate
          }
        }
      });

      const stats = {
        period,
        totalExecutions: executions.length,
        successfulExecutions: executions.filter(e => e.status === 'SUCCESS').length,
        failedExecutions: executions.filter(e => e.status === 'FAILED').length,
        pendingExecutions: executions.filter(e => e.status === 'PENDING').length,
        
        // By execution type
        byType: {
          SIGNAL_RECEIVED: executions.filter(e => e.executionType === 'SIGNAL_RECEIVED').length,
          TRADE_EXECUTED: executions.filter(e => e.executionType === 'TRADE_EXECUTED').length,
          ERROR_OCCURRED: executions.filter(e => e.executionType === 'ERROR_OCCURRED').length,
          POSITION_CLOSED: executions.filter(e => e.executionType === 'POSITION_CLOSED').length
        },
        
        // By signal type
        bySignal: {
          BUY: executions.filter(e => e.signalType === 'BUY').length,
          SELL: executions.filter(e => e.signalType === 'SELL').length
        },
        
        // Performance metrics
        avgExecutionTime: executions
          .filter(e => e.executionTime !== null)
          .reduce((sum, e) => sum + e.executionTime, 0) / executions.filter(e => e.executionTime !== null).length || 0,
        
        totalPnL: executions
          .filter(e => e.pnl !== null)
          .reduce((sum, e) => sum + parseFloat(e.pnl), 0)
      };

      stats.successRate = stats.totalExecutions > 0 ? 
        (stats.successfulExecutions / stats.totalExecutions * 100).toFixed(2) : 0;

      logger.info(`Retrieved execution stats for strategy ${strategyId}`, 'execution-service');
      return stats;
    } catch (error) {
      logger.error(`Error getting execution stats for strategy ${strategyId}: ${error.message}`, 'execution-service');
      throw error;
    }
  }

  /**
   * Update strategy P&L
   */
  async updateStrategyPnL(strategyId, pnlChange) {
    try {
      await this.prisma.strategy.update({
        where: { id: parseInt(strategyId) },
        data: {
          currentPnL: {
            increment: pnlChange
          },
          totalPnL: {
            increment: pnlChange
          }
        }
      });
    } catch (error) {
      logger.error(`Error updating strategy P&L for strategy ${strategyId}: ${error.message}`, 'execution-service');
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
      logger.error(`Error logging audit action: ${error.message}`, 'execution-service');
    }
  }

  /**
   * Health check for execution service
   */
  async healthCheck() {
    try {
      await this.prisma.strategyExecution.count();
      return { status: 'healthy', message: 'Execution service is running' };
    } catch (error) {
      logger.error(`Execution service health check failed: ${error.message}`, 'execution-service');
      return { status: 'unhealthy', message: 'Execution service is not responding' };
    }
  }

  /**
   * Clean up resources
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = StrategyExecutionService;