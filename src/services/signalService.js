const logger = require('./logger');

class SignalService {
  constructor() {
    this.tokenMappings = new Map();
    this.signalRules = new Map();
    this.initializeTokenMappings();
    this.initializeSignalRules();
  }

  /**
   * Initialize token mappings
   */
  initializeTokenMappings() {
    // Common ERC-20 tokens
    this.tokenMappings.set('ETH', {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      chainId: 1,
      contractAddress: '0x0000000000000000000000000000000000000000'
    });

    this.tokenMappings.set('USDT', {
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      chainId: 1,
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7'
    });

    this.tokenMappings.set('USDC', {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 1,
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    });

    this.tokenMappings.set('BTC', {
      symbol: 'BTC',
      name: 'Wrapped Bitcoin',
      decimals: 8,
      chainId: 1,
      contractAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
    });

    this.tokenMappings.set('DAI', {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      chainId: 1,
      contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f'
    });

    // DeFi tokens
    this.tokenMappings.set('UNI', {
      symbol: 'UNI',
      name: 'Uniswap',
      decimals: 18,
      chainId: 1,
      contractAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'
    });

    this.tokenMappings.set('AAVE', {
      symbol: 'AAVE',
      name: 'Aave',
      decimals: 18,
      chainId: 1,
      contractAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9'
    });

    this.tokenMappings.set('COMP', {
      symbol: 'COMP',
      name: 'Compound',
      decimals: 18,
      chainId: 1,
      contractAddress: '0xc00e94cb662c3520282e6f5717214004a7f26888'
    });

    // Layer 2 tokens
    this.tokenMappings.set('ARB', {
      symbol: 'ARB',
      name: 'Arbitrum',
      decimals: 18,
      chainId: 1,
      contractAddress: '0x912ce59144191c1204e64559fe8253a0e49e6548'
    });

    this.tokenMappings.set('OP', {
      symbol: 'OP',
      name: 'Optimism',
      decimals: 18,
      chainId: 1,
      contractAddress: '0x4200000000000000000000000000000000000042'
    });
  }

  /**
   * Initialize signal rules
   */
  initializeSignalRules() {
    // Transaction-based signal rules
    this.signalRules.set('LARGE_TRANSACTION', {
      name: 'Large Transaction',
      description: 'Large transaction detected',
      threshold: 10000, // $10,000
      confidence: 0.8,
      signalType: 'BUY'
    });

    this.signalRules.set('FREQUENT_TRANSACTION', {
      name: 'Frequent Transaction',
      description: 'Frequent transactions to same address',
      threshold: 5, // 5 transactions in 10 minutes
      timeframe: 600000, // 10 minutes in milliseconds
      confidence: 0.7,
      signalType: 'BUY'
    });

    // Position-based signal rules
    this.signalRules.set('NEW_POSITION', {
      name: 'New Position',
      description: 'New token position opened',
      minAmount: 1000, // $1,000
      confidence: 0.9,
      signalType: 'BUY'
    });

    this.signalRules.set('POSITION_INCREASE', {
      name: 'Position Increase',
      description: 'Existing position increased by 20% or more',
      threshold: 0.2, // 20%
      confidence: 0.8,
      signalType: 'BUY'
    });

    this.signalRules.set('POSITION_DECREASE', {
      name: 'Position Decrease',
      description: 'Existing position decreased by 50% or more',
      threshold: 0.5, // 50%
      confidence: 0.8,
      signalType: 'SELL'
    });

    this.signalRules.set('POSITION_CLOSE', {
      name: 'Position Close',
      description: 'Position completely closed',
      confidence: 0.9,
      signalType: 'SELL'
    });
  }

  /**
   * Process a wallet event and generate trading signals
   */
  async processEvent(event) {
    try {
      const { eventType, eventData, walletAddress, strategy } = event;

      // Check if token is allowed in strategy
      const tokenSymbol = this.extractTokenSymbol(eventData);
      if (!this.isTokenAllowed(tokenSymbol, strategy.allowedTokens)) {
        logger.info(`Token ${tokenSymbol} not allowed in strategy ${strategy.id}`, 'signal-service');
        return null;
      }

      // Get token mapping
      const tokenMapping = this.getTokenMapping(tokenSymbol);
      if (!tokenMapping) {
        logger.warn(`No token mapping found for ${tokenSymbol}`, 'signal-service');
        return null;
      }

      // Apply signal rules based on event type
      const signals = [];

      switch (eventType) {
        case 'TRANSACTION':
          signals.push(...this.processTransactionEvent(eventData, walletAddress, tokenMapping));
          break;
        case 'POSITION_CHANGE':
          signals.push(...this.processPositionEvent(eventData, walletAddress, tokenMapping));
          break;
        default:
          logger.warn(`Unknown event type: ${eventType}`, 'signal-service');
      }

      // Filter and rank signals
      const validSignals = signals.filter(signal => this.validateSignal(signal));
      const rankedSignals = this.rankSignals(validSignals);

      // Return the best signal or null if no valid signals
      return rankedSignals.length > 0 ? rankedSignals[0] : null;

    } catch (error) {
      logger.error(`Error processing event: ${error.message}`, 'signal-service');
      return null;
    }
  }

  /**
   * Process transaction event
   */
  processTransactionEvent(transactionData, walletAddress, tokenMapping) {
    const signals = [];

    // Check for large transaction rule
    const transactionValue = this.getTransactionValue(transactionData);
    if (transactionValue >= this.signalRules.get('LARGE_TRANSACTION').threshold) {
      signals.push({
        type: 'BUY',
        token: tokenMapping.symbol,
        amount: transactionValue,
        price: this.getCurrentPrice(tokenMapping.symbol),
        confidence: this.signalRules.get('LARGE_TRANSACTION').confidence,
        rule: 'LARGE_TRANSACTION',
        metadata: {
          transactionHash: transactionData.hash,
          value: transactionValue,
          walletAddress
        }
      });
    }

    // Check for frequent transactions (would need historical data)
    // This is a simplified version
    signals.push({
      type: 'BUY',
      token: tokenMapping.symbol,
      amount: transactionValue,
      price: this.getCurrentPrice(tokenMapping.symbol),
      confidence: 0.6,
      rule: 'TRANSACTION_DETECTED',
      metadata: {
        transactionHash: transactionData.hash,
        value: transactionValue,
        walletAddress
      }
    });

    return signals;
  }

  /**
   * Process position change event
   */
  processPositionEvent(positionData, walletAddress, tokenMapping) {
    const signals = [];

    const positionValue = positionData.value || 0;
    const positionAmount = positionData.amount || 0;

    // Check for new position rule
    if (positionValue >= this.signalRules.get('NEW_POSITION').minAmount) {
      signals.push({
        type: 'BUY',
        token: tokenMapping.symbol,
        amount: positionValue,
        price: this.getCurrentPrice(tokenMapping.symbol),
        confidence: this.signalRules.get('NEW_POSITION').confidence,
        rule: 'NEW_POSITION',
        metadata: {
          positionValue,
          positionAmount,
          walletAddress
        }
      });
    }

    // Check for position increase/decrease (would need previous position data)
    // This is a simplified version
    if (positionData.positionType === 'increase') {
      signals.push({
        type: 'BUY',
        token: tokenMapping.symbol,
        amount: positionValue,
        price: this.getCurrentPrice(tokenMapping.symbol),
        confidence: this.signalRules.get('POSITION_INCREASE').confidence,
        rule: 'POSITION_INCREASE',
        metadata: {
          positionValue,
          positionAmount,
          walletAddress
        }
      });
    } else if (positionData.positionType === 'decrease') {
      signals.push({
        type: 'SELL',
        token: tokenMapping.symbol,
        amount: positionValue,
        price: this.getCurrentPrice(tokenMapping.symbol),
        confidence: this.signalRules.get('POSITION_DECREASE').confidence,
        rule: 'POSITION_DECREASE',
        metadata: {
          positionValue,
          positionAmount,
          walletAddress
        }
      });
    }

    return signals;
  }

  /**
   * Extract token symbol from event data
   */
  extractTokenSymbol(eventData) {
    if (eventData.symbol) {
      return eventData.symbol.toUpperCase();
    }
    
    if (eventData.asset) {
      return eventData.asset.toUpperCase();
    }

    // For transactions, default to ETH
    return 'ETH';
  }

  /**
   * Check if token is allowed in strategy
   */
  isTokenAllowed(tokenSymbol, allowedTokens) {
    if (!allowedTokens || allowedTokens.length === 0) {
      return true; // All tokens allowed if no restrictions
    }

    return allowedTokens.includes(tokenSymbol);
  }

  /**
   * Get token mapping
   */
  getTokenMapping(tokenSymbol) {
    return this.tokenMappings.get(tokenSymbol.toUpperCase());
  }

  /**
   * Get transaction value in USD
   */
  getTransactionValue(transactionData) {
    // This is a simplified version
    // In production, this would use a price oracle
    const ethPrice = 2000; // Assume $2000 per ETH
    const value = parseFloat(transactionData.value) || 0;
    
    if (transactionData.symbol === 'ETH') {
      return value * ethPrice;
    }

    return value;
  }

  /**
   * Get current token price (simplified)
   */
  getCurrentPrice(tokenSymbol) {
    // This is a simplified version
    // In production, this would use a price oracle
    const prices = {
      'ETH': 2000,
      'BTC': 45000,
      'USDT': 1,
      'USDC': 1,
      'DAI': 1,
      'UNI': 7,
      'AAVE': 100,
      'COMP': 50,
      'ARB': 1.5,
      'OP': 2
    };

    return prices[tokenSymbol] || 1;
  }

  /**
   * Validate signal
   */
  validateSignal(signal) {
    if (!signal.type || !signal.token || !signal.amount) {
      return false;
    }

    if (signal.amount <= 0) {
      return false;
    }

    if (signal.confidence < 0.5) {
      return false;
    }

    return true;
  }

  /**
   * Rank signals by confidence
   */
  rankSignals(signals) {
    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get signal statistics
   */
  async getSignalStatistics(strategyId, period = '7d') {
    try {
      // This would query the database for signal statistics
      // For now, return mock data
      return {
        totalSignals: 0,
        buySignals: 0,
        sellSignals: 0,
        averageConfidence: 0,
        topTokens: [],
        signalTypes: {}
      };
    } catch (error) {
      logger.error(`Error getting signal statistics: ${error.message}`, 'signal-service');
      throw error;
    }
  }

  /**
   * Health check for signal service
   */
  async healthCheck() {
    try {
      const status = {
        tokenMappings: this.tokenMappings.size,
        signalRules: this.signalRules.size,
        lastSignalTime: null
      };

      return { 
        status: 'healthy', 
        message: 'Signal service is running',
        data: status
      };
    } catch (error) {
      logger.error(`Signal service health check failed: ${error.message}`, 'signal-service');
      return { status: 'unhealthy', message: 'Signal service is not responding' };
    }
  }
}

module.exports = SignalService;