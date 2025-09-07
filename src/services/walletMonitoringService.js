const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

class WalletMonitoringService {
  constructor() {
    this.prisma = new PrismaClient();
    this.monitoredWallets = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring a wallet
   */
  async startMonitoring(walletAddress, strategyId) {
    try {
      // Check if wallet is already being monitored
      if (this.monitoredWallets.has(walletAddress)) {
        logger.warn(`Wallet ${walletAddress} is already being monitored`, 'wallet-monitoring');
        return;
      }

      // Verify strategy exists and is active
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: parseInt(strategyId) },
        select: { isActive: true, userId: true }
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      if (!strategy.isActive) {
        throw new Error('Strategy is not active');
      }

      // Add to monitored wallets
      this.monitoredWallets.set(walletAddress, {
        strategyId: parseInt(strategyId),
        userId: strategy.userId,
        startTime: new Date(),
        lastCheck: null,
        eventCount: 0,
        errorCount: 0
      });

      logger.info(`Started monitoring wallet ${walletAddress} for strategy ${strategyId}`, 'wallet-monitoring');

      // Start monitoring loop if not already running
      if (!this.isMonitoring) {
        this.startMonitoringLoop();
      }

      // Log the action
      await this.logAuditAction({
        entityType: 'Wallet',
        entityId: 0, // Wallet entity
        action: 'MONITORING_START',
        userId: strategy.userId,
        userRole: 'USER',
        newValues: {
          walletAddress,
          strategyId: parseInt(strategyId)
        },
        status: 'SUCCESS',
        description: `Started monitoring wallet: ${walletAddress}`
      });

    } catch (error) {
      logger.error(`Error starting monitoring for wallet ${walletAddress}: ${error.message}`, 'wallet-monitoring');
      throw error;
    }
  }

  /**
   * Stop monitoring a wallet
   */
  async stopMonitoring(walletAddress, userId) {
    try {
      const monitoringData = this.monitoredWallets.get(walletAddress);
      
      if (!monitoringData) {
        logger.warn(`Wallet ${walletAddress} is not being monitored`, 'wallet-monitoring');
        return;
      }

      // Verify user owns the strategy
      if (monitoringData.userId !== userId) {
        throw new Error('Unauthorized to stop monitoring this wallet');
      }

      // Remove from monitored wallets
      this.monitoredWallets.delete(walletAddress);

      logger.info(`Stopped monitoring wallet ${walletAddress}`, 'wallet-monitoring');

      // Stop monitoring loop if no wallets left
      if (this.monitoredWallets.size === 0 && this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
        this.isMonitoring = false;
      }

      // Log the action
      await this.logAuditAction({
        entityType: 'Wallet',
        entityId: 0,
        action: 'MONITORING_STOP',
        userId,
        userRole: 'USER',
        oldValues: {
          walletAddress,
          strategyId: monitoringData.strategyId
        },
        status: 'SUCCESS',
        description: `Stopped monitoring wallet: ${walletAddress}`
      });

    } catch (error) {
      logger.error(`Error stopping monitoring for wallet ${walletAddress}: ${error.message}`, 'wallet-monitoring');
      throw error;
    }
  }

  /**
   * Start the monitoring loop
   */
  startMonitoringLoop() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Check wallet activity every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllWallets();
    }, 30000);

    logger.info('Wallet monitoring loop started', 'wallet-monitoring');
  }

  /**
   * Check all monitored wallets for activity
   */
  async checkAllWallets() {
    try {
      const checkPromises = Array.from(this.monitoredWallets.keys()).map(walletAddress => 
        this.checkWalletActivity(walletAddress)
      );

      await Promise.allSettled(checkPromises);
    } catch (error) {
      logger.error(`Error in wallet monitoring loop: ${error.message}`, 'wallet-monitoring');
    }
  }

  /**
   * Check specific wallet for activity
   */
  async checkWalletActivity(walletAddress) {
    try {
      const monitoringData = this.monitoredWallets.get(walletAddress);
      
      if (!monitoringData) {
        return;
      }

      const { strategyId, userId } = monitoringData;

      // Get wallet activity from Zerion service
      const activity = await this.getWalletActivity(walletAddress);

      if (activity && activity.length > 0) {
        // Process each activity event
        for (const event of activity) {
          await this.processWalletEvent(event, walletAddress, strategyId, userId);
        }

        // Update monitoring data
        monitoringData.lastCheck = new Date();
        monitoringData.eventCount += activity.length;
        this.monitoredWallets.set(walletAddress, monitoringData);
      }

    } catch (error) {
      const monitoringData = this.monitoredWallets.get(walletAddress);
      if (monitoringData) {
        monitoringData.errorCount++;
        this.monitoredWallets.set(walletAddress, monitoringData);
      }

      logger.error(`Error checking wallet ${walletAddress}: ${error.message}`, 'wallet-monitoring');
    }
  }

  /**
   * Get wallet activity from Zerion API
   */
  async getWalletActivity(walletAddress) {
    try {
      const zerionService = require('./zerionService');
      
      // Get recent transactions
      const transactions = await zerionService.getWalletTransactions(walletAddress);
      
      // Get positions
      const positions = await zerionService.getWalletPositions(walletAddress);

      // Combine and normalize events
      const events = [];

      // Process transactions
      if (transactions && transactions.data) {
        for (const tx of transactions.data) {
          events.push({
            type: 'transaction',
            id: tx.id,
            timestamp: new Date(tx.attributes.mined_at),
            walletAddress,
            data: {
              hash: tx.attributes.hash,
              from: tx.attributes.from_address,
              to: tx.attributes.to_address,
              value: tx.attributes.value,
              gas: tx.attributes.gas,
              gasPrice: tx.attributes.gas_price,
              status: tx.attributes.status
            }
          });
        }
      }

      // Process positions
      if (positions && positions.data) {
        for (const position of positions.data) {
          events.push({
            type: 'position',
            id: position.id,
            timestamp: new Date(position.attributes.updated_at),
            walletAddress,
            data: {
              asset: position.attributes.fungible_info.name,
              symbol: position.attributes.fungible_info.symbol,
              amount: position.attributes.quantity.float,
              value: position.attributes.value.float,
              type: position.attributes.type
            }
          });
        }
      }

      // Filter events from last check
      const monitoringData = this.monitoredWallets.get(walletAddress);
      if (monitoringData && monitoringData.lastCheck) {
        return events.filter(event => event.timestamp > monitoringData.lastCheck);
      }

      return events;

    } catch (error) {
      logger.error(`Error getting wallet activity for ${walletAddress}: ${error.message}`, 'wallet-monitoring');
      throw error;
    }
  }

  /**
   * Process a wallet event
   */
  async processWalletEvent(event, walletAddress, strategyId, userId) {
    try {
      // Normalize the event
      const normalizedEvent = this.normalizeEvent(event);

      // Store the event in database
      const storedEvent = await this.prisma.walletEvent.create({
        data: {
          walletAddress,
          eventType: normalizedEvent.type,
          eventData: normalizedEvent.data,
          timestamp: normalizedEvent.timestamp,
          strategyId: parseInt(strategyId),
          processed: false
        }
      });

      logger.info(`Stored wallet event ${storedEvent.id} for wallet ${walletAddress}`, 'wallet-monitoring');

      // Queue event for processing
      await this.queueEventForProcessing(storedEvent.id);

    } catch (error) {
      logger.error(`Error processing wallet event for ${walletAddress}: ${error.message}`, 'wallet-monitoring');
      throw error;
    }
  }

  /**
   * Normalize event data
   */
  normalizeEvent(event) {
    switch (event.type) {
      case 'transaction':
        return {
          type: 'TRANSACTION',
          timestamp: event.timestamp,
          data: {
            hash: event.data.hash,
            from: event.data.from,
            to: event.data.to,
            value: event.data.value,
            gas: event.data.gas,
            gasPrice: event.data.gasPrice,
            status: event.data.status,
            asset: 'ETH', // Default to ETH for transactions
            symbol: 'ETH'
          }
        };

      case 'position':
        return {
          type: 'POSITION_CHANGE',
          timestamp: event.timestamp,
          data: {
            asset: event.data.asset,
            symbol: event.data.symbol,
            amount: event.data.amount,
            value: event.data.value,
            positionType: event.data.type
          }
        };

      default:
        return {
          type: 'UNKNOWN',
          timestamp: event.timestamp,
          data: event.data
        };
    }
  }

  /**
   * Queue event for processing
   */
  async queueEventForProcessing(eventId) {
    try {
      // For now, process immediately
      // In production, this would use a proper queue system like BullMQ
      await this.processQueuedEvent(eventId);
    } catch (error) {
      logger.error(`Error queuing event ${eventId}: ${error.message}`, 'wallet-monitoring');
    }
  }

  /**
   * Process queued event
   */
  async processQueuedEvent(eventId) {
    try {
      const event = await this.prisma.walletEvent.findUnique({
        where: { id: parseInt(eventId) },
        include: {
          strategy: {
            select: {
              userId: true,
              allowedTokens: true,
              isActive: true
            }
          }
        }
      });

      if (!event) {
        logger.warn(`Event ${eventId} not found`, 'wallet-monitoring');
        return;
      }

      if (!event.strategy.isActive) {
        logger.info(`Strategy ${event.strategyId} is not active, skipping event ${eventId}`, 'wallet-monitoring');
        return;
      }

      // Process the event based on type
      const signalService = require('./signalService');
      const signal = await signalService.processEvent(event);

      if (signal) {
        // Store the signal
        await this.prisma.tradingSignal.create({
          data: {
            walletEventId: parseInt(eventId),
            strategyId: parseInt(event.strategyId),
            signalType: signal.type,
            token: signal.token,
            amount: signal.amount,
            price: signal.price,
            confidence: signal.confidence,
            metadata: signal.metadata,
            status: 'PENDING'
          }
        });

        logger.info(`Created trading signal from event ${eventId}`, 'wallet-monitoring');
      }

      // Mark event as processed
      await this.prisma.walletEvent.update({
        where: { id: parseInt(eventId) },
        data: { processed: true }
      });

    } catch (error) {
      logger.error(`Error processing queued event ${eventId}: ${error.message}`, 'wallet-monitoring');
      
      // Mark event as failed
      await this.prisma.walletEvent.update({
        where: { id: parseInt(eventId) },
        data: { 
          processed: true,
          error: error.message
        }
      });
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      monitoredWallets: Array.from(this.monitoredWallets.entries()).map(([address, data]) => ({
        address,
        ...data,
        uptime: Date.now() - data.startTime.getTime()
      })),
      totalWallets: this.monitoredWallets.size,
      totalEvents: Array.from(this.monitoredWallets.values()).reduce((sum, data) => sum + data.eventCount, 0),
      totalErrors: Array.from(this.monitoredWallets.values()).reduce((sum, data) => sum + data.errorCount, 0)
    };
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
      logger.error(`Error logging audit action: ${error.message}`, 'wallet-monitoring');
    }
  }

  /**
   * Health check for wallet monitoring service
   */
  async healthCheck() {
    try {
      const status = {
        isMonitoring: this.isMonitoring,
        monitoredWallets: this.monitoredWallets.size,
        lastCheck: null,
        errorRate: 0
      };

      // Calculate error rate
      const totalEvents = Array.from(this.monitoredWallets.values()).reduce((sum, data) => sum + data.eventCount, 0);
      const totalErrors = Array.from(this.monitoredWallets.values()).reduce((sum, data) => sum + data.errorCount, 0);
      
      status.errorRate = totalEvents > 0 ? (totalErrors / totalEvents * 100).toFixed(2) : 0;

      // Get most recent check time
      const monitoringData = Array.from(this.monitoredWallets.values());
      if (monitoringData.length > 0) {
        status.lastCheck = monitoringData.reduce((latest, data) => 
          data.lastCheck && (!latest || data.lastCheck > latest) ? data.lastCheck : latest, null);
      }

      return { 
        status: 'healthy', 
        message: 'Wallet monitoring service is running',
        data: status
      };
    } catch (error) {
      logger.error(`Wallet monitoring service health check failed: ${error.message}`, 'wallet-monitoring');
      return { status: 'unhealthy', message: 'Wallet monitoring service is not responding' };
    }
  }

  /**
   * Clean up resources
   */
  async disconnect() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoredWallets.clear();
    this.isMonitoring = false;
    
    await this.prisma.$disconnect();
  }
}

module.exports = WalletMonitoringService;