const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

class OKXClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OKX_API_KEY;
    this.apiSecret = config.apiSecret || process.env.OKX_API_SECRET;
    this.passphrase = config.passphrase || process.env.OKX_API_PASSPHRASE;
    this.sandbox = config.sandbox || process.env.OKX_DEMO_MODE === '1';
    this.baseUrl = this.sandbox ? 'https://www.okx.com' : 'https://www.okx.com';
    
    // Rate limiting
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.maxRequestsPerSecond = 20;
    this.maxRequestsPerMinute = 600;
    
    // Instrument cache
    this.instrumentsCache = new Map();
    this.lastInstrumentsUpdate = null;
    this.instrumentsCacheTTL = 5 * 60 * 1000; // 5 minutes
    
    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': this.apiKey,
      }
    });
    
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    this.axios.interceptors.request.use(async (config) => {
      await this.checkRateLimit();
      
      const timestamp = new Date().toISOString();
      const method = config.method.toUpperCase();
      const path = config.url.replace(this.baseUrl, '');
      
      const signature = this.generateSignature(timestamp, method, path, config.data);
      
      config.headers['OK-ACCESS-SIGN'] = signature;
      config.headers['OK-ACCESS-TIMESTAMP'] = timestamp;
      config.headers['OK-ACCESS-PASSPHRASE'] = this.passphrase;
      
      if (this.sandbox) {
        config.headers['x-simulated-trading'] = '1';
      }
      
      return config;
    });
    
    this.axios.interceptors.response.use(
      (response) => {
        this.requestCount++;
        logger.debug('OKX API response', {
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          data: response.data
        });
        
        if (response.data.code !== '0') {
          throw new Error(`OKX API Error: ${response.data.msg} (Code: ${response.data.code})`);
        }
        
        return response.data.data;
      },
      (error) => {
        logger.error('OKX API error', {
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });
        
        throw this.handleApiError(error);
      }
    );
  }
  
  async checkRateLimit() {
    const now = Date.now();
    
    // Reset counter every second
    if (now - this.lastResetTime > 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    if (this.requestCount >= this.maxRequestsPerSecond) {
      const waitTime = 1000 - (now - this.lastResetTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }
  }
  
  generateSignature(timestamp, method, path, body = '') {
    const message = timestamp + method + path + (body ? JSON.stringify(body) : '');
    return crypto.createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
  }
  
  handleApiError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 401:
          return new Error('OKX Authentication failed: Invalid API key, secret, or passphrase');
        case 403:
          return new Error('OKX Access denied: Insufficient permissions');
        case 429:
          return new Error('OKX Rate limit exceeded');
        case 500:
          return new Error('OKX Server error');
        default:
          return new Error(`OKX API Error (${status}): ${data.msg || error.message}`);
      }
    }
    
    return error;
  }
  
  async healthCheck() {
    try {
      const response = await this.axios.get('/api/v5/public/time');
      return {
        status: 'healthy',
        timestamp: response[0],
        serverTime: response[0],
        latency: Date.now() - new Date(response[0]).getTime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  async getAccountBalance() {
    return this.axios.get('/api/v5/account/balance');
  }
  
  async getPositions() {
    return this.axios.get('/api/v5/account/positions');
  }
  
  async getInstruments(instType = 'SWAP', uly = '') {
    const cacheKey = `${instType}-${uly}`;
    
    if (this.instrumentsCache.has(cacheKey) && 
        Date.now() - this.lastInstrumentsUpdate < this.instrumentsCacheTTL) {
      return this.instrumentsCache.get(cacheKey);
    }
    
    const params = { instType };
    if (uly) params.uly = uly;
    
    try {
      const instruments = await this.axios.get('/api/v5/public/instruments', { params });
      this.instrumentsCache.set(cacheKey, instruments);
      this.lastInstrumentsUpdate = Date.now();
      return instruments;
    } catch (error) {
      logger.error('Failed to fetch instruments', { error: error.message, instType, uly });
      throw error;
    }
  }
  
  async getInstrument(instId) {
    try {
      const response = await this.axios.get('/api/v5/public/instruments', {
        params: { instId }
      });
      return response[0];
    } catch (error) {
      logger.error('Failed to fetch instrument', { error: error.message, instId });
      throw error;
    }
  }
  
  async getTickers(instType = 'SWAP', uly = '') {
    const params = { instType };
    if (uly) params.uly = uly;
    
    return this.axios.get('/api/v5/market/tickers', { params });
  }
  
  async getTicker(instId) {
    return this.axios.get('/api/v5/market/ticker', {
      params: { instId }
    });
  }
  
  async getMarketBooks(instId, sz = '5') {
    return this.axios.get('/api/v5/market/books', {
      params: { instId, sz }
    });
  }
  
  async getTrades(instId, limit = 100) {
    return this.axios.get('/api/v5/market/trades', {
      params: { instId, limit }
    });
  }
  
  async getCandles(instId, bar = '1m', limit = 100) {
    return this.axios.get('/api/v5/market/candles', {
      params: { instId, bar, limit }
    });
  }
  
  async placeOrder(order) {
    const orderData = {
      instId: order.instId,
      tdMode: order.tdMode || 'cross',
      side: order.side,
      ordType: order.ordType || 'market',
      sz: order.sz,
      px: order.px,
      tag: order.tag
    };
    
    if (order.posSide) orderData.posSide = order.posSide;
    
    logger.info('Placing OKX order', orderData);
    
    return this.axios.post('/api/v5/trade/order', orderData);
  }
  
  async placeMultipleOrders(orders) {
    const orderData = orders.map(order => ({
      instId: order.instId,
      tdMode: order.tdMode || 'cross',
      side: order.side,
      ordType: order.ordType || 'market',
      sz: order.sz,
      px: order.px,
      tag: order.tag
    }));
    
    logger.info('Placing multiple OKX orders', { count: orders.length });
    
    return this.axios.post('/api/v5/trade/batch-orders', {
      orders: orderData
    });
  }
  
  async cancelOrder(ordId, instId) {
    return this.axios.post('/api/v5/trade/cancel-order', {
      ordId,
      instId
    });
  }
  
  async cancelMultipleOrders(orders) {
    return this.axios.post('/api/v5/trade/cancel-batch-orders', {
      orders: orders.map(order => ({
        ordId: order.ordId,
        instId: order.instId
      }))
    });
  }
  
  async getOrder(ordId, instId) {
    return this.axios.get('/api/v5/trade/order', {
      params: { ordId, instId }
    });
  }
  
  async getOrdersPending(instType = 'SWAP') {
    return this.axios.get('/api/v5/trade/orders-pending', {
      params: { instType }
    });
  }
  
  async getOrdersHistory(instType = 'SWAP', limit = 100) {
    return this.axios.get('/api/v5/trade/orders-history', {
      params: { instType, limit }
    });
  }
  
  async getFills(instType = 'SWAP', limit = 100) {
    return this.axios.get('/api/v5/trade/fills', {
      params: { instType, limit }
    });
  }
  
  async setLeverage(instId, lever, mgnMode = 'cross') {
    return this.axios.post('/api/v5/account/set-leverage', {
      instId,
      lever,
      mgnMode
    });
  }
  
  async getAccountConfig() {
    return this.axios.get('/api/v5/account/config');
  }
  
  async setAccountLevel(level) {
    return this.axios.post('/api/v5/account/set-account-level', {
      level
    });
  }
  
  async getFeeRates(instType = 'SWAP', instId = '', uly = '') {
    const params = { instType };
    if (instId) params.instId = instId;
    if (uly) params.uly = uly;
    
    return this.axios.get('/api/v5/public/fee-rates', { params });
  }
  
  async getEstimatePrice(instId, side, sz) {
    return this.axios.get('/api/v5/public/estimate-price', {
      params: { instId, side, sz }
    });
  }
  
  async getSupportCoins() {
    return this.axios.get('/api/v5/capital/supported-coins');
  }
  
  isHealthy() {
    return !!this.apiKey && !!this.apiSecret && !!this.passphrase;
  }
  
  getEnvironment() {
    return {
      sandbox: this.sandbox,
      baseUrl: this.baseUrl,
      hasCredentials: this.isHealthy()
    };
  }
}

module.exports = OKXClient;