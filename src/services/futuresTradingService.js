const OKXClient = require('./okxClient');
const OrderManagementService = require('./orderManagementService');
const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');

class FuturesTradingService {
  constructor() {
    this.okxClient = new OKXClient();
    this.orderService = new OrderManagementService();
    this.prisma = new PrismaClient();
    this.positionCache = new Map();
    this.leverageCache = new Map();
    this.liquidationMonitors = new Map();
    
    // Risk limits
    this.maxLeverage = 20;
    this.minMarginRatio = 0.01;
    this.liquidationThreshold = 0.9;
    
    // Futures configuration
    this.supportedInstTypes = ['SWAP', 'FUTURES'];
    this.defaultMarginMode = 'cross';
    this.defaultLeverage = 5;
  }
  
  async configureAccount() {
    try {
      logger.info('Configuring futures account');
      
      // Get current account configuration
      const config = await this.okxClient.getAccountConfig();
      
      // Set account level for futures trading
      await this.okxClient.setAccountLevel('2');
      
      logger.info('Futures account configured successfully', { config });
      
      return {
        success: true,
        config,
        accountLevel: '2'
      };
      
    } catch (error) {
      logger.error('Failed to configure futures account', {
        error: error.message
      });
      
      throw error;
    }
  }
  
  async setLeverage(instId, leverage, mgnMode = 'cross') {
    try {
      if (leverage > this.maxLeverage) {
        throw new Error(`Leverage ${leverage} exceeds maximum allowed ${this.maxLeverage}`);
      }
      
      if (leverage < 1) {
        throw new Error('Leverage must be at least 1');
      }
      
      logger.info('Setting leverage', { instId, leverage, mgnMode });
      
      const result = await this.okxClient.setLeverage(instId, leverage, mgnMode);
      
      // Cache leverage setting
      this.leverageCache.set(instId, {
        leverage,
        mgnMode,
        timestamp: new Date()
      });
      
      logger.info('Leverage set successfully', {
        instId,
        leverage,
        mgnMode,
        result
      });
      
      return {
        success: true,
        instId,
        leverage,
        mgnMode,
        result
      };
      
    } catch (error) {
      logger.error('Failed to set leverage', {
        error: error.message,
        instId,
        leverage,
        mgnMode
      });
      
      throw error;
    }
  }
  
  async getPositions(instType = 'SWAP') {
    try {
      const positions = await this.okxClient.getPositions();
      
      // Filter by instrument type if specified
      const filteredPositions = instType 
        ? positions.filter(pos => pos.instType === instType)
        : positions;
      
      // Update position cache
      filteredPositions.forEach(position => {
        this.positionCache.set(position.instId, {
          ...position,
          lastUpdated: new Date()
        });
      });
      
      return filteredPositions;
      
    } catch (error) {
      logger.error('Failed to get positions', {
        error: error.message,
        instType
      });
      
      throw error;
    }
  }
  
  async getPosition(instId) {
    try {
      const positions = await this.getPositions();
      return positions.find(pos => pos.instId === instId) || null;
      
    } catch (error) {
      logger.error('Failed to get position', {
        error: error.message,
        instId
      });
      
      throw error;
    }
  }
  
  async openPosition(positionRequest) {
    try {
      const validatedPosition = await this.validatePositionRequest(positionRequest);
      
      logger.info('Opening futures position', validatedPosition);
      
      // Set leverage if specified
      if (validatedPosition.leverage) {
        await this.setLeverage(
          validatedPosition.instId,
          validatedPosition.leverage,
          validatedPosition.mgnMode || this.defaultMarginMode
        );
      }
      
      // Calculate position size based on risk
      const positionSize = await this.calculatePositionSize(validatedPosition);
      
      // Place order
      const orderResult = await this.orderService.placeMarketOrder({
        instId: validatedPosition.instId,
        side: validatedPosition.side,
        sz: positionSize.toString(),
        tdMode: validatedPosition.mgnMode || this.defaultMarginMode,
        posSide: validatedPosition.posSide,
        strategyId: validatedPosition.strategyId,
        tag: validatedPosition.tag || 'futures-position'
      });
      
      // Start liquidation monitoring
      if (orderResult.success) {
        this.startLiquidationMonitoring(validatedPosition.instId, validatedPosition.strategyId);
      }
      
      logger.info('Futures position opened successfully', {
        orderId: orderResult.orderId,
        instId: validatedPosition.instId,
        side: validatedPosition.side,
        size: positionSize,
        leverage: validatedPosition.leverage || this.defaultLeverage
      });
      
      return {
        success: true,
        orderId: orderResult.orderId,
        dbOrderId: orderResult.dbOrderId,
        positionSize,
        leverage: validatedPosition.leverage || this.defaultLeverage,
        order: orderResult.order
      };
      
    } catch (error) {
      logger.error('Failed to open futures position', {
        error: error.message,
        positionRequest
      });
      
      throw error;
    }
  }
  
  async closePosition(instId, strategyId, options = {}) {
    try {
      logger.info('Closing futures position', { instId, strategyId });
      
      // Get current position
      const position = await this.getPosition(instId);
      
      if (!position || parseFloat(position.pos) === 0) {
        logger.warn('No position to close', { instId });
        return {
          success: true,
          message: 'No position to close'
        };
      }
      
      // Determine close side
      const closeSide = position.posSide === 'long' ? 'sell' : 'buy';
      
      // Close position
      const orderResult = await this.orderService.placeMarketOrder({
        instId,
        side: closeSide,
        sz: position.pos,
        tdMode: position.mgnMode,
        posSide: position.posSide,
        strategyId,
        tag: 'close-position',
        reduceOnly: true
      });
      
      // Stop liquidation monitoring
      this.stopLiquidationMonitoring(instId);
      
      logger.info('Futures position closed successfully', {
        orderId: orderResult.orderId,
        instId,
        closedSize: position.pos,
        side: closeSide
      });
      
      return {
        success: true,
        orderId: orderResult.orderId,
        dbOrderId: orderResult.dbOrderId,
        closedSize: position.pos,
        order: orderResult.order
      };
      
    } catch (error) {
      logger.error('Failed to close futures position', {
        error: error.message,
        instId,
        strategyId
      });
      
      throw error;
    }
  }
  
  async adjustPosition(instId, adjustmentRequest) {
    try {
      logger.info('Adjusting futures position', { instId, adjustmentRequest });
      
      const currentPos = await this.getPosition(instId);
      const adjustment = await this.validateAdjustmentRequest(adjustmentRequest, currentPos);
      
      if (adjustment.action === 'increase') {
        // Increase position size
        const orderResult = await this.orderService.placeMarketOrder({
          instId,
          side: adjustment.side,
          sz: adjustment.size,
          tdMode: adjustment.mgnMode || this.defaultMarginMode,
          posSide: adjustment.posSide,
          strategyId: adjustment.strategyId,
          tag: 'increase-position'
        });
        
        return {
          success: true,
          action: 'increase',
          orderId: orderResult.orderId,
          dbOrderId: orderResult.dbOrderId,
          increasedSize: adjustment.size,
          order: orderResult.order
        };
        
      } else if (adjustment.action === 'decrease') {
        // Decrease position size
        const orderResult = await this.orderService.placeMarketOrder({
          instId,
          side: adjustment.side === 'buy' ? 'sell' : 'buy',
          sz: adjustment.size,
          tdMode: adjustment.mgnMode || this.defaultMarginMode,
          posSide: adjustment.posSide,
          strategyId: adjustment.strategyId,
          tag: 'decrease-position',
          reduceOnly: true
        });
        
        return {
          success: true,
          action: 'decrease',
          orderId: orderResult.orderId,
          dbOrderId: orderResult.dbOrderId,
          decreasedSize: adjustment.size,
          order: orderResult.order
        };
      }
      
    } catch (error) {
      logger.error('Failed to adjust futures position', {
        error: error.message,
        instId,
        adjustmentRequest
      });
      
      throw error;
    }
  }
  
  async getMarginRequirements(instId) {
    try {
      const instrument = await this.okxClient.getInstrument(instId);
      
      if (!instrument) {
        throw new Error(`Instrument not found: ${instId}`);
      }
      
      return {
        instId,
        marginRatio: parseFloat(instrument.ctMult),
        minSize: parseFloat(instrument.minSz),
        leverage: this.leverageCache.get(instId)?.leverage || this.defaultLeverage,
        maxLeverage: this.maxLeverage,
        tickSize: parseFloat(instrument.tickSz),
        lotSize: parseFloat(instrument.lotSz),
        contractVal: parseFloat(instrument.ctVal)
      };
      
    } catch (error) {
      logger.error('Failed to get margin requirements', {
        error: error.message,
        instId
      });
      
      throw error;
    }
  }
  
  async calculateLiquidationPrice(instId, positionSize, entryPrice, leverage, side) {
    try {
      const marginReq = await this.getMarginRequirements(instId);
      const marginRatio = marginReq.marginRatio;
      
      // Simplified liquidation price calculation
      const direction = side === 'long' ? 1 : -1;
      const liquidationPrice = entryPrice * (1 - direction * (marginRatio / leverage));
      
      return {
        instId,
        liquidationPrice,
        entryPrice,
        leverage,
        marginRatio,
        distanceToLiquidation: Math.abs(liquidationPrice - entryPrice),
        liquidationThreshold: this.liquidationThreshold
      };
      
    } catch (error) {
      logger.error('Failed to calculate liquidation price', {
        error: error.message,
        instId,
        positionSize,
        entryPrice,
        leverage,
        side
      });
      
      throw error;
    }
  }
  
  async startLiquidationMonitoring(instId, strategyId) {
    if (this.liquidationMonitors.has(instId)) {
      return;
    }
    
    const monitorId = `${instId}-${strategyId}-${Date.now()}`;
    this.liquidationMonitors.set(instId, {
      monitorId,
      strategyId,
      startTime: new Date(),
      alerts: []
    });
    
    const monitor = async () => {
      try {
        const position = await this.getPosition(instId);
        
        if (!position || parseFloat(position.pos) === 0) {
          this.stopLiquidationMonitoring(instId);
          return;
        }
        
        const liquidationInfo = await this.calculateLiquidationPrice(
          instId,
          parseFloat(position.pos),
          parseFloat(position.avgPx),
          parseFloat(position.lever),
          position.posSide
        );
        
        const currentPrice = parseFloat(position.last);
        const distanceToLiquidation = Math.abs(currentPrice - liquidationInfo.liquidationPrice);
        const liquidationRatio = distanceToLiquidation / Math.abs(liquidationInfo.liquidationPrice - liquidationInfo.entryPrice);
        
        // Check if approaching liquidation
        if (liquidationRatio < this.liquidationThreshold) {
          const alert = {
            level: liquidationRatio < 0.5 ? 'CRITICAL' : 'WARNING',
            ratio: liquidationRatio,
            distance: distanceToLiquidation,
            timestamp: new Date()
          };
          
          const monitor = this.liquidationMonitors.get(instId);
          monitor.alerts.push(alert);
          
          logger.warn('Liquidation risk alert', {
            instId,
            strategyId,
            alertLevel: alert.level,
            liquidationRatio,
            distanceToLiquidation,
            currentPrice,
            liquidationPrice: liquidationInfo.liquidationPrice
          });
          
          // Auto-close if critical
          if (alert.level === 'CRITICAL') {
            await this.closePosition(instId, strategyId, {
              reason: 'Auto-close due to liquidation risk'
            });
            
            await this.prisma.strategyExecution.create({
              data: {
                strategyId,
                executionType: 'ERROR_OCCURRED',
                status: 'SUCCESS',
                signalType: 'LIQUIDATION_RISK',
                token: instId.split('-')[0],
                amount: parseFloat(position.pos),
                price: currentPrice,
                errorCode: 'LIQUIDATION_RISK_AUTO_CLOSE',
                errorMessage: `Auto-closed position due to liquidation risk. Ratio: ${liquidationRatio.toFixed(4)}`,
                metadata: {
                  liquidationPrice: liquidationInfo.liquidationPrice,
                  currentPrice,
                  distance: distanceToLiquidation,
                  alerts: monitor.alerts
                }
              }
            });
            
            return;
          }
        }
        
        // Continue monitoring
        setTimeout(monitor, 30000); // Check every 30 seconds
        
      } catch (error) {
        logger.error('Error in liquidation monitoring', {
          error: error.message,
          instId,
          strategyId
        });
        
        // Continue monitoring despite errors
        setTimeout(monitor, 60000);
      }
    };
    
    setTimeout(monitor, 30000);
    
    logger.info('Started liquidation monitoring', {
      instId,
      strategyId,
      monitorId
    });
  }
  
  stopLiquidationMonitoring(instId) {
    const monitor = this.liquidationMonitors.get(instId);
    
    if (monitor) {
      this.liquidationMonitors.delete(instId);
      
      logger.info('Stopped liquidation monitoring', {
        instId,
        monitorId: monitor.monitorId,
        duration: Date.now() - monitor.startTime.getTime()
      });
    }
  }
  
  async getLiquidationMonitors() {
    return Array.from(this.liquidationMonitors.entries()).map(([instId, monitor]) => ({
      instId,
      ...monitor,
      alertsCount: monitor.alerts.length,
      lastAlert: monitor.alerts[monitor.alerts.length - 1]
    }));
  }
  
  async validatePositionRequest(request) {
    const requiredFields = ['instId', 'side', 'size', 'strategyId'];
    
    for (const field of requiredFields) {
      if (!request[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!['buy', 'sell'].includes(request.side.toLowerCase())) {
      throw new Error('Invalid side: must be "buy" or "sell"');
    }
    
    if (parseFloat(request.size) <= 0) {
      throw new Error('Position size must be positive');
    }
    
    // Validate instrument exists
    try {
      const instrument = await this.okxClient.getInstrument(request.instId);
      if (!instrument) {
        throw new Error(`Instrument not found: ${request.instId}`);
      }
      
      if (!this.supportedInstTypes.includes(instrument.instType)) {
        throw new Error(`Unsupported instrument type: ${instrument.instType}`);
      }
    } catch (error) {
      logger.error('Instrument validation failed', {
        error: error.message,
        instId: request.instId
      });
      throw error;
    }
    
    return {
      ...request,
      side: request.side.toLowerCase(),
      mgnMode: request.mgnMode || this.defaultMarginMode,
      leverage: request.leverage || this.defaultLeverage
    };
  }
  
  async validateAdjustmentRequest(request, currentPosition) {
    if (!currentPosition || parseFloat(currentPosition.pos) === 0) {
      throw new Error('No open position to adjust');
    }
    
    if (!['increase', 'decrease'].includes(request.action)) {
      throw new Error('Invalid action: must be "increase" or "decrease"');
    }
    
    if (parseFloat(request.size) <= 0) {
      throw new Error('Adjustment size must be positive');
    }
    
    if (request.action === 'decrease' && parseFloat(request.size) > parseFloat(currentPosition.pos)) {
      throw new Error('Cannot decrease position size more than current position');
    }
    
    return {
      ...request,
      instId: currentPosition.instId,
      side: currentPosition.posSide === 'long' ? 'buy' : 'sell',
      posSide: currentPosition.posSide,
      mgnMode: currentPosition.mgnMode
    };
  }
  
  async calculatePositionSize(request) {
    const marginReq = await this.getMarginRequirements(request.instId);
    
    let positionSize = parseFloat(request.size);
    
    // Apply leverage adjustment
    if (request.leverage) {
      positionSize = positionSize * request.leverage;
    }
    
    // Apply margin ratio
    positionSize = positionSize / marginReq.marginRatio;
    
    // Round to lot size
    positionSize = Math.floor(positionSize / marginReq.lotSize) * marginReq.lotSize;
    
    return positionSize;
  }
  
  async getAccountBalance() {
    try {
      return await this.okxClient.getAccountBalance();
    } catch (error) {
      logger.error('Failed to get account balance', {
        error: error.message
      });
      
      throw error;
    }
  }
  
  async getFuturesSummary() {
    try {
      const [positions, balance, activeMonitors] = await Promise.all([
        this.getPositions(),
        this.getAccountBalance(),
        this.getLiquidationMonitors()
      ]);
      
      const totalPositions = positions.length;
      const activePositions = positions.filter(pos => parseFloat(pos.pos) > 0);
      const totalNotional = activePositions.reduce((sum, pos) => {
        return sum + (parseFloat(pos.pos) * parseFloat(pos.last));
      }, 0);
      
      const unrealizedPnl = activePositions.reduce((sum, pos) => {
        return sum + parseFloat(pos.upl);
      }, 0);
      
      return {
        totalPositions,
        activePositions: activePositions.length,
        totalNotional,
        unrealizedPnl,
        accountBalance: balance,
        liquidationMonitors: activeMonitors.length,
        criticalAlerts: activeMonitors.filter(m => 
          m.alerts.some(a => a.level === 'CRITICAL')
        ).length
      };
      
    } catch (error) {
      logger.error('Failed to get futures summary', {
        error: error.message
      });
      
      throw error;
    }
  }
}

module.exports = FuturesTradingService;