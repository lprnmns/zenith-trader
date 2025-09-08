const OKXClient = require('./okxClient');
const logger = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');

class OrderManagementService {
  constructor() {
    this.okxClient = new OKXClient();
    this.prisma = new PrismaClient();
    this.activeOrders = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;
    
    // Order validation rules
    this.minOrderSize = {
      'USDT': 5,
      'BTC': 0.0001,
      'ETH': 0.001,
      'default': 1
    };
    
    this.minNotional = {
      'SWAP': 5,
      'SPOT': 10,
      'default': 5
    };
  }
  
  async placeMarketOrder(orderRequest) {
    try {
      const validatedOrder = await this.validateOrder(orderRequest);
      
      logger.info('Placing market order', validatedOrder);
      
      const order = await this.okxClient.placeOrder({
        instId: validatedOrder.instId,
        tdMode: validatedOrder.tdMode || 'cross',
        side: validatedOrder.side,
        ordType: 'market',
        sz: validatedOrder.sz,
        tag: validatedOrder.tag || 'zenith-trader'
      });
      
      // Store order in database
      const dbOrder = await this.prisma.trade.create({
        data: {
          strategyId: validatedOrder.strategyId,
          action: validatedOrder.side,
          token: validatedOrder.instId.split('-')[0],
          amount: parseFloat(validatedOrder.sz),
          status: 'PENDING',
          exchangeOrderId: order[0].ordId,
          metadata: {
            okxOrder: order[0],
            orderType: 'market',
            timestamp: new Date().toISOString()
          }
        }
      });
      
      this.activeOrders.set(order[0].ordId, {
        ...validatedOrder,
        dbOrderId: dbOrder.id,
        createdAt: new Date()
      });
      
      // Start monitoring order status
      this.monitorOrderStatus(order[0].ordId, validatedOrder.strategyId);
      
      logger.info('Market order placed successfully', {
        orderId: order[0].ordId,
        dbOrderId: dbOrder.id,
        instId: validatedOrder.instId,
        side: validatedOrder.side,
        sz: validatedOrder.sz
      });
      
      return {
        success: true,
        orderId: order[0].ordId,
        dbOrderId: dbOrder.id,
        order: order[0]
      };
      
    } catch (error) {
      logger.error('Failed to place market order', {
        error: error.message,
        orderRequest
      });
      
      // Store failed order
      await this.prisma.trade.create({
        data: {
          strategyId: orderRequest.strategyId,
          action: orderRequest.side,
          token: orderRequest.instId.split('-')[0],
          amount: parseFloat(orderRequest.sz),
          status: 'FAILED',
          metadata: {
            error: error.message,
            orderRequest,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      throw error;
    }
  }
  
  async placeLimitOrder(orderRequest) {
    try {
      const validatedOrder = await this.validateOrder(orderRequest);
      
      if (!validatedOrder.px) {
        throw new Error('Limit price (px) is required for limit orders');
      }
      
      logger.info('Placing limit order', validatedOrder);
      
      const order = await this.okxClient.placeOrder({
        instId: validatedOrder.instId,
        tdMode: validatedOrder.tdMode || 'cross',
        side: validatedOrder.side,
        ordType: 'limit',
        sz: validatedOrder.sz,
        px: validatedOrder.px,
        tag: validatedOrder.tag || 'zenith-trader'
      });
      
      // Store order in database
      const dbOrder = await this.prisma.trade.create({
        data: {
          strategyId: validatedOrder.strategyId,
          action: validatedOrder.side,
          token: validatedOrder.instId.split('-')[0],
          amount: parseFloat(validatedOrder.sz),
          status: 'PENDING',
          exchangeOrderId: order[0].ordId,
          metadata: {
            okxOrder: order[0],
            orderType: 'limit',
            limitPrice: validatedOrder.px,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      this.activeOrders.set(order[0].ordId, {
        ...validatedOrder,
        dbOrderId: dbOrder.id,
        createdAt: new Date()
      });
      
      // Start monitoring order status
      this.monitorOrderStatus(order[0].ordId, validatedOrder.strategyId);
      
      logger.info('Limit order placed successfully', {
        orderId: order[0].ordId,
        dbOrderId: dbOrder.id,
        instId: validatedOrder.instId,
        side: validatedOrder.side,
        sz: validatedOrder.sz,
        px: validatedOrder.px
      });
      
      return {
        success: true,
        orderId: order[0].ordId,
        dbOrderId: dbOrder.id,
        order: order[0]
      };
      
    } catch (error) {
      logger.error('Failed to place limit order', {
        error: error.message,
        orderRequest
      });
      
      // Store failed order
      await this.prisma.trade.create({
        data: {
          strategyId: orderRequest.strategyId,
          action: orderRequest.side,
          token: orderRequest.instId.split('-')[0],
          amount: parseFloat(orderRequest.sz),
          status: 'FAILED',
          metadata: {
            error: error.message,
            orderRequest,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      throw error;
    }
  }
  
  async placeMultipleOrders(ordersRequest) {
    try {
      const validatedOrders = await Promise.all(
        ordersRequest.map(order => this.validateOrder(order))
      );
      
      logger.info('Placing multiple orders', { count: validatedOrders.length });
      
      const okxOrders = await this.okxClient.placeMultipleOrders(
        validatedOrders.map(order => ({
          instId: order.instId,
          tdMode: order.tdMode || 'cross',
          side: order.side,
          ordType: order.ordType || 'market',
          sz: order.sz,
          px: order.px,
          tag: order.tag || 'zenith-trader'
        }))
      );
      
      // Store orders in database
      const dbOrders = await Promise.all(
        okxOrders.map(async (okxOrder, index) => {
          const orderRequest = validatedOrders[index];
          
          return this.prisma.trade.create({
            data: {
              strategyId: orderRequest.strategyId,
              action: orderRequest.side,
              token: orderRequest.instId.split('-')[0],
              amount: parseFloat(orderRequest.sz),
              status: okxOrder.sCode === '0' ? 'PENDING' : 'FAILED',
              exchangeOrderId: okxOrder.ordId,
              metadata: {
                okxOrder,
                orderType: orderRequest.ordType || 'market',
                limitPrice: orderRequest.px,
                timestamp: new Date().toISOString()
              }
            }
          });
        })
      );
      
      // Monitor successful orders
      okxOrders.forEach((okxOrder, index) => {
        if (okxOrder.sCode === '0') {
          this.activeOrders.set(okxOrder.ordId, {
            ...validatedOrders[index],
            dbOrderId: dbOrders[index].id,
            createdAt: new Date()
          });
          
          this.monitorOrderStatus(okxOrder.ordId, validatedOrders[index].strategyId);
        }
      });
      
      logger.info('Multiple orders placed successfully', {
        total: okxOrders.length,
        successful: okxOrders.filter(o => o.sCode === '0').length,
        failed: okxOrders.filter(o => o.sCode !== '0').length
      });
      
      return {
        success: true,
        orders: okxOrders.map((okxOrder, index) => ({
          orderId: okxOrder.ordId,
          dbOrderId: dbOrders[index].id,
          success: okxOrder.sCode === '0',
          order: okxOrder
        }))
      };
      
    } catch (error) {
      logger.error('Failed to place multiple orders', {
        error: error.message,
        ordersCount: ordersRequest.length
      });
      
      throw error;
    }
  }
  
  async cancelOrder(orderId, instId) {
    try {
      logger.info('Cancelling order', { orderId, instId });
      
      const result = await this.okxClient.cancelOrder(orderId, instId);
      
      // Update order in database
      await this.prisma.trade.updateMany({
        where: {
          exchangeOrderId: orderId,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED',
          metadata: {
            cancelledAt: new Date().toISOString(),
            cancelReason: 'User requested'
          }
        }
      });
      
      this.activeOrders.delete(orderId);
      
      logger.info('Order cancelled successfully', { orderId });
      
      return {
        success: true,
        orderId,
        result
      };
      
    } catch (error) {
      logger.error('Failed to cancel order', {
        error: error.message,
        orderId,
        instId
      });
      
      throw error;
    }
  }
  
  async getOrderStatus(orderId, instId) {
    try {
      const order = await this.okxClient.getOrder(orderId, instId);
      
      // Update order in database
      if (order[0]) {
        await this.prisma.trade.updateMany({
          where: {
            exchangeOrderId: orderId
          },
          data: {
            status: this.mapOKXOrderStatus(order[0].state),
            metadata: {
              okxOrder: order[0],
              lastUpdated: new Date().toISOString()
            }
          }
        });
      }
      
      return order[0];
      
    } catch (error) {
      logger.error('Failed to get order status', {
        error: error.message,
        orderId,
        instId
      });
      
      throw error;
    }
  }
  
  async getActiveOrders(instType = 'SWAP') {
    try {
      return await this.okxClient.getOrdersPending(instType);
    } catch (error) {
      logger.error('Failed to get active orders', {
        error: error.message,
        instType
      });
      
      throw error;
    }
  }
  
  async getOrderHistory(instType = 'SWAP', limit = 100) {
    try {
      return await this.okxClient.getOrdersHistory(instType, limit);
    } catch (error) {
      logger.error('Failed to get order history', {
        error: error.message,
        instType,
        limit
      });
      
      throw error;
    }
  }
  
  async getFills(instType = 'SWAP', limit = 100) {
    try {
      return await this.okxClient.getFills(instType, limit);
    } catch (error) {
      logger.error('Failed to get fills', {
        error: error.message,
        instType,
        limit
      });
      
      throw error;
    }
  }
  
  async validateOrder(order) {
    const requiredFields = ['instId', 'side', 'sz', 'strategyId'];
    
    for (const field of requiredFields) {
      if (!order[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!['buy', 'sell'].includes(order.side.toLowerCase())) {
      throw new Error('Invalid side: must be "buy" or "sell"');
    }
    
    if (parseFloat(order.sz) <= 0) {
      throw new Error('Order size must be positive');
    }
    
    // Check minimum order size
    const token = order.instId.split('-')[0];
    const minSize = this.minOrderSize[token] || this.minOrderSize.default;
    
    if (parseFloat(order.sz) < minSize) {
      throw new Error(`Order size ${order.sz} is below minimum ${minSize} for ${token}`);
    }
    
    // Get instrument info for validation
    try {
      const instrument = await this.okxClient.getInstrument(order.instId);
      
      if (instrument) {
        // Check minimum notional
        const minNotional = this.minNotional[instrument.instType] || this.minNotional.default;
        const estimatedValue = parseFloat(order.sz) * (instrument.last || 0);
        
        if (estimatedValue < minNotional) {
          throw new Error(`Estimated order value ${estimatedValue} is below minimum notional ${minNotional}`);
        }
        
        // Apply rounding rules
        order.sz = this.roundSize(order.sz, instrument.lotSz);
        
        if (order.px) {
          order.px = this.roundPrice(order.px, instrument.tickSz);
        }
      }
    } catch (error) {
      logger.warn('Could not fetch instrument info for validation', {
        error: error.message,
        instId: order.instId
      });
    }
    
    return order;
  }
  
  async monitorOrderStatus(orderId, strategyId) {
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();
    
    const checkStatus = async () => {
      try {
        const order = await this.getOrderStatus(orderId);
        
        if (order && ['filled', 'canceled', 'live'].includes(order.state)) {
          this.activeOrders.delete(orderId);
          
          // Update strategy execution
          await this.prisma.strategyExecution.create({
            data: {
              strategyId,
              executionType: 'TRADE_EXECUTED',
              status: order.state === 'filled' ? 'SUCCESS' : order.state === 'canceled' ? 'CANCELLED' : 'PARTIAL_FILL',
              signalType: order.side === 'buy' ? 'BUY' : 'SELL',
              token: order.instId.split('-')[0],
              amount: parseFloat(order.sz),
              price: parseFloat(order.px || order.avgPx || 0),
              exchangeOrderId: orderId,
              metadata: {
                okxOrder: order,
                fillPrice: order.avgPx,
                filledSize: order.accFillSz,
                fee: order.fee,
                timestamp: new Date().toISOString()
              }
            }
          });
          
          logger.info('Order monitoring completed', {
            orderId,
            status: order.state,
            filledSize: order.accFillSz,
            avgPrice: order.avgPx
          });
          
          return;
        }
        
        if (Date.now() - startTime > maxWaitTime) {
          logger.warn('Order monitoring timeout', { orderId });
          this.activeOrders.delete(orderId);
          return;
        }
        
        setTimeout(checkStatus, checkInterval);
        
      } catch (error) {
        logger.error('Error monitoring order status', {
          error: error.message,
          orderId
        });
        
        setTimeout(checkStatus, checkInterval);
      }
    };
    
    setTimeout(checkStatus, checkInterval);
  }
  
  mapOKXOrderStatus(okxState) {
    const statusMap = {
      'live': 'PENDING',
      'partially_filled': 'PARTIAL_FILL',
      'filled': 'SUCCESS',
      'canceled': 'CANCELLED',
      'failed': 'FAILED'
    };
    
    return statusMap[okxState] || 'UNKNOWN';
  }
  
  roundSize(size, lotSz) {
    const lotSize = parseFloat(lotSz);
    const rounded = Math.floor(parseFloat(size) / lotSize) * lotSize;
    return rounded.toFixed(8);
  }
  
  roundPrice(price, tickSz) {
    const tickSize = parseFloat(tickSz);
    const rounded = Math.floor(parseFloat(price) / tickSize) * tickSize;
    return rounded.toFixed(8);
  }
  
  async getActiveOrdersCount() {
    return this.activeOrders.size;
  }
  
  async getActiveOrdersByStrategy(strategyId) {
    return Array.from(this.activeOrders.values()).filter(
      order => order.strategyId === strategyId
    );
  }
  
  async cancelAllOrders(instType = 'SWAP') {
    try {
      const activeOrders = await this.getActiveOrders(instType);
      
      if (activeOrders.length === 0) {
        return { success: true, cancelled: 0 };
      }
      
      const cancelPromises = activeOrders.map(order =>
        this.cancelOrder(order.ordId, order.instId)
      );
      
      const results = await Promise.allSettled(cancelPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      logger.info('Cancelled all active orders', {
        total: activeOrders.length,
        successful,
        failed
      });
      
      return {
        success: true,
        cancelled: successful,
        failed
      };
      
    } catch (error) {
      logger.error('Failed to cancel all orders', {
        error: error.message,
        instType
      });
      
      throw error;
    }
  }
}

module.exports = OrderManagementService;