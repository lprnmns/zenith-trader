const logger = require('./logger');

class EventFilter {
  constructor() {
    this.filters = new Map();
    this.blacklist = new Set();
    this.whitelist = new Set();
    this.initializeFilters();
  }

  /**
   * Initialize default filters
   */
  initializeFilters() {
    // Minimum value filters
    this.filters.set('MIN_TRANSACTION_VALUE', {
      name: 'Minimum Transaction Value',
      description: 'Filter out transactions below minimum value',
      enabled: true,
      minValue: 100, // $100
      type: 'transaction'
    });

    this.filters.set('MIN_POSITION_VALUE', {
      name: 'Minimum Position Value',
      description: 'Filter out position changes below minimum value',
      enabled: true,
      minValue: 1000, // $1,000
      type: 'position'
    });

    // Token filters
    this.filters.set('TOKEN_BLACKLIST', {
      name: 'Token Blacklist',
      description: 'Filter out blacklisted tokens',
      enabled: true,
      tokens: ['SCAM', 'RUG', 'FAKE'],
      type: 'token'
    });

    this.filters.set('TOKEN_WHITELIST', {
      name: 'Token Whitelist',
      description: 'Only process whitelisted tokens when whitelist mode is enabled',
      enabled: false,
      tokens: ['ETH', 'BTC', 'USDT', 'USDC', 'UNI', 'AAVE', 'COMP'],
      type: 'token'
    });

    // Address filters
    this.filters.set('ADDRESS_BLACKLIST', {
      name: 'Address Blacklist',
      description: 'Filter out transactions from/to blacklisted addresses',
      enabled: true,
      addresses: [],
      type: 'address'
    });

    // Time-based filters
    this.filters.set('WEEKEND_FILTER', {
      name: 'Weekend Filter',
      description: 'Reduce activity during weekends',
      enabled: true,
      reductionFactor: 0.5,
      type: 'time'
    });

    this.filters.set('NIGHT_TIME_FILTER', {
      name: 'Night Time Filter',
      description: 'Reduce activity during night hours',
      enabled: true,
      startTime: '22:00',
      endTime: '06:00',
      reductionFactor: 0.3,
      timezone: 'UTC',
      type: 'time'
    });

    // Frequency filters
    this.filters.set('HIGH_FREQUENCY_FILTER', {
      name: 'High Frequency Filter',
      description: 'Filter out events that occur too frequently',
      enabled: true,
      maxEventsPerMinute: 10,
      cooldownPeriod: 60000, // 1 minute
      type: 'frequency'
    });

    // Market condition filters
    this.filters.set('HIGH_VOLATILITY_FILTER', {
      name: 'High Volatility Filter',
      description: 'Reduce activity during high volatility periods',
      enabled: true,
      maxVolatility: 0.3, // 30%
      reductionFactor: 0.5,
      type: 'market'
    });

    this.filters.set('LOW_LIQUIDITY_FILTER', {
      name: 'Low Liquidity Filter',
      description: 'Filter out tokens with low liquidity',
      enabled: true,
      minLiquidity: 100000, // $100K
      type: 'market'
    });

    // Duplicate event filters
    this.filters.set('DUPLICATE_EVENT_FILTER', {
      name: 'Duplicate Event Filter',
      description: 'Filter out duplicate events within time window',
      enabled: true,
      timeWindow: 300000, // 5 minutes
      type: 'duplicate'
    });

    // Initialize event tracking for frequency filtering
    this.eventTracking = new Map();
    this.recentEvents = new Map();
  }

  /**
   * Filter wallet event
   */
  async filterEvent(event) {
    try {
      const filterResult = {
        shouldProcess: true,
        reason: '',
        filtersApplied: [],
        confidence: 1.0,
        priority: 'normal'
      };

      // Apply all enabled filters
      for (const [filterName, filter] of this.filters) {
        if (!filter.enabled) {
          continue;
        }

        const result = await this.applyFilter(event, filter);
        
        if (!result.passed) {
          filterResult.shouldProcess = false;
          filterResult.reason = result.reason;
          filterResult.filtersApplied.push({
            name: filterName,
            result: 'failed',
            reason: result.reason
          });
          break;
        }

        if (result.modified) {
          filterResult.filtersApplied.push({
            name: filterName,
            result: 'modified',
            modification: result.modification
          });
          
          // Apply modifications
          if (result.confidence !== undefined) {
            filterResult.confidence *= result.confidence;
          }
          if (result.priority) {
            filterResult.priority = result.priority;
          }
        }
      }

      // Check custom blacklist/whitelist
      const customFilterResult = this.checkCustomFilters(event);
      if (!customFilterResult.passed) {
        filterResult.shouldProcess = false;
        filterResult.reason = customFilterResult.reason;
      }

      return filterResult;

    } catch (error) {
      logger.error(`Error filtering event: ${error.message}`, 'event-filter');
      return {
        shouldProcess: false,
        reason: `Filter error: ${error.message}`,
        filtersApplied: [],
        confidence: 0,
        priority: 'low'
      };
    }
  }

  /**
   * Apply individual filter
   */
  async applyFilter(event, filter) {
    switch (filter.type) {
      case 'transaction':
        return this.applyTransactionFilter(event, filter);
      case 'position':
        return this.applyPositionFilter(event, filter);
      case 'token':
        return this.applyTokenFilter(event, filter);
      case 'address':
        return this.applyAddressFilter(event, filter);
      case 'time':
        return this.applyTimeFilter(event, filter);
      case 'frequency':
        return this.applyFrequencyFilter(event, filter);
      case 'market':
        return this.applyMarketFilter(event, filter);
      case 'duplicate':
        return this.applyDuplicateFilter(event, filter);
      default:
        return { passed: true };
    }
  }

  /**
   * Apply transaction value filter
   */
  applyTransactionFilter(event, filter) {
    if (event.eventType !== 'TRANSACTION') {
      return { passed: true };
    }

    const value = this.getTransactionValue(event.eventData);
    
    if (value < filter.minValue) {
      return {
        passed: false,
        reason: `Transaction value $${value.toFixed(2)} below minimum $${filter.minValue}`
      };
    }

    return { passed: true };
  }

  /**
   * Apply position value filter
   */
  applyPositionFilter(event, filter) {
    if (event.eventType !== 'POSITION_CHANGE') {
      return { passed: true };
    }

    const value = event.eventData.value || 0;
    
    if (value < filter.minValue) {
      return {
        passed: false,
        reason: `Position value $${value.toFixed(2)} below minimum $${filter.minValue}`
      };
    }

    return { passed: true };
  }

  /**
   * Apply token filter
   */
  applyTokenFilter(event, filter) {
    const tokenSymbol = this.extractTokenSymbol(event.eventData);
    
    if (filter.name === 'TOKEN_BLACKLIST') {
      if (filter.tokens.includes(tokenSymbol)) {
        return {
          passed: false,
          reason: `Token ${tokenSymbol} is blacklisted`
        };
      }
    } else if (filter.name === 'TOKEN_WHITELIST') {
      if (!filter.tokens.includes(tokenSymbol)) {
        return {
          passed: false,
          reason: `Token ${tokenSymbol} is not whitelisted`
        };
      }
    }

    return { passed: true };
  }

  /**
   * Apply address filter
   */
  applyAddressFilter(event, filter) {
    if (event.eventType !== 'TRANSACTION') {
      return { passed: true };
    }

    const fromAddress = event.eventData.from?.toLowerCase();
    const toAddress = event.eventData.to?.toLowerCase();

    for (const blacklistedAddress of filter.addresses) {
      const normalizedBlacklist = blacklistedAddress.toLowerCase();
      
      if (fromAddress === normalizedBlacklist || toAddress === normalizedBlacklist) {
        return {
          passed: false,
          reason: `Transaction involves blacklisted address`
        };
      }
    }

    return { passed: true };
  }

  /**
   * Apply time-based filter
   */
  applyTimeFilter(event, filter) {
    const now = new Date();
    
    if (filter.name === 'WEEKEND_FILTER') {
      const dayOfWeek = now.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Saturday or Sunday
        return {
          passed: true,
          modified: true,
          confidence: filter.reductionFactor,
          modification: `Weekend reduction: ${filter.reductionFactor * 100}%`
        };
      }
    } else if (filter.name === 'NIGHT_TIME_FILTER') {
      const hours = now.getUTCHours();
      const startHour = parseInt(filter.startTime.split(':')[0]);
      const endHour = parseInt(filter.endTime.split(':')[0]);
      
      let isNightTime = false;
      if (startHour > endHour) {
        isNightTime = hours >= startHour || hours < endHour;
      } else {
        isNightTime = hours >= startHour && hours < endHour;
      }

      if (isNightTime) {
        return {
          passed: true,
          modified: true,
          confidence: filter.reductionFactor,
          modification: `Night time reduction: ${filter.reductionFactor * 100}%`
        };
      }
    }

    return { passed: true };
  }

  /**
   * Apply frequency filter
   */
  applyFrequencyFilter(event, filter) {
    const eventKey = `${event.walletAddress}-${event.eventType}`;
    const now = Date.now();
    
    if (!this.eventTracking.has(eventKey)) {
      this.eventTracking.set(eventKey, []);
    }

    const events = this.eventTracking.get(eventKey);
    
    // Clean old events
    const recentEvents = events.filter(time => now - time < filter.cooldownPeriod);
    this.eventTracking.set(eventKey, recentEvents);
    
    if (recentEvents.length >= filter.maxEventsPerMinute) {
      return {
        passed: false,
        reason: `Too many events (${recentEvents.length}) in cooldown period`
      };
    }

    // Add current event
    recentEvents.push(now);
    this.eventTracking.set(eventKey, recentEvents);

    return { passed: true };
  }

  /**
   * Apply market condition filter
   */
  async applyMarketFilter(event, filter) {
    const tokenSymbol = this.extractTokenSymbol(event.eventData);
    
    if (filter.name === 'HIGH_VOLATILITY_FILTER') {
      const volatility = this.getTokenVolatility(tokenSymbol);
      
      if (volatility > filter.maxVolatility) {
        return {
          passed: true,
          modified: true,
          confidence: filter.reductionFactor,
          modification: `High volatility reduction: ${filter.reductionFactor * 100}%`
        };
      }
    } else if (filter.name === 'LOW_LIQUIDITY_FILTER') {
      const liquidity = await this.getTokenLiquidity(tokenSymbol);
      
      if (liquidity < filter.minLiquidity) {
        return {
          passed: false,
          reason: `Token ${tokenSymbol} has low liquidity: $${liquidity.toFixed(2)}`
        };
      }
    }

    return { passed: true };
  }

  /**
   * Apply duplicate event filter
   */
  applyDuplicateFilter(event, filter) {
    const eventKey = this.createEventKey(event);
    const now = Date.now();
    
    if (!this.recentEvents.has(eventKey)) {
      this.recentEvents.set(eventKey, []);
    }

    const events = this.recentEvents.get(eventKey);
    
    // Clean old events
    const recentEvents = events.filter(time => now - time < filter.timeWindow);
    this.recentEvents.set(eventKey, recentEvents);
    
    if (recentEvents.length > 0) {
      return {
        passed: false,
        reason: `Duplicate event detected within time window`
      };
    }

    // Add current event
    recentEvents.push(now);
    this.recentEvents.set(eventKey, recentEvents);

    return { passed: true };
  }

  /**
   * Check custom blacklist/whitelist
   */
  checkCustomFilters(event) {
    const tokenSymbol = this.extractTokenSymbol(event.eventData);
    
    // Check blacklist
    if (this.blacklist.has(tokenSymbol)) {
      return {
        passed: false,
        reason: `Token ${tokenSymbol} is in custom blacklist`
      };
    }

    // Check whitelist (if not empty)
    if (this.whitelist.size > 0 && !this.whitelist.has(tokenSymbol)) {
      return {
        passed: false,
        reason: `Token ${tokenSymbol} is not in custom whitelist`
      };
    }

    return { passed: true };
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

    return 'ETH'; // Default for transactions
  }

  /**
   * Get transaction value in USD
   */
  getTransactionValue(transactionData) {
    const ethPrice = 2000; // Assume $2000 per ETH
    const value = parseFloat(transactionData.value) || 0;
    
    if (transactionData.symbol === 'ETH') {
      return value * ethPrice;
    }

    return value;
  }

  /**
   * Create unique event key for duplicate detection
   */
  createEventKey(event) {
    const keyParts = [
      event.walletAddress,
      event.eventType,
      this.extractTokenSymbol(event.eventData)
    ];

    // Add transaction-specific data
    if (event.eventType === 'TRANSACTION' && event.eventData.hash) {
      keyParts.push(event.eventData.hash);
    }

    // Add position-specific data
    if (event.eventType === 'POSITION_CHANGE' && event.eventData.type) {
      keyParts.push(event.eventData.type);
    }

    return keyParts.join('-');
  }

  /**
   * Get token volatility (simplified)
   */
  getTokenVolatility(tokenSymbol) {
    const volatilities = {
      'BTC': 0.15,
      'ETH': 0.18,
      'USDT': 0.01,
      'USDC': 0.01,
      'DAI': 0.02,
      'UNI': 0.25,
      'AAVE': 0.22,
      'COMP': 0.20,
      'ARB': 0.30,
      'OP': 0.28
    };

    return volatilities[tokenSymbol.toUpperCase()] || 0.2;
  }

  /**
   * Get token liquidity (simplified)
   */
  async getTokenLiquidity(tokenSymbol) {
    // This would use market data in production
    const liquidities = {
      'BTC': 1000000000,
      'ETH': 500000000,
      'USDT': 800000000,
      'USDC': 600000000,
      'DAI': 200000000,
      'UNI': 100000000,
      'AAVE': 80000000,
      'COMP': 60000000,
      'ARB': 50000000,
      'OP': 40000000
    };

    return liquidities[tokenSymbol.toUpperCase()] || 100000;
  }

  /**
   * Add token to blacklist
   */
  addToBlacklist(tokenSymbol) {
    this.blacklist.add(tokenSymbol.toUpperCase());
    logger.info(`Added ${tokenSymbol} to blacklist`, 'event-filter');
  }

  /**
   * Remove token from blacklist
   */
  removeFromBlacklist(tokenSymbol) {
    this.blacklist.delete(tokenSymbol.toUpperCase());
    logger.info(`Removed ${tokenSymbol} from blacklist`, 'event-filter');
  }

  /**
   * Add token to whitelist
   */
  addToWhitelist(tokenSymbol) {
    this.whitelist.add(tokenSymbol.toUpperCase());
    logger.info(`Added ${tokenSymbol} to whitelist`, 'event-filter');
  }

  /**
   * Remove token from whitelist
   */
  removeFromWhitelist(tokenSymbol) {
    this.whitelist.delete(tokenSymbol.toUpperCase());
    logger.info(`Removed ${tokenSymbol} from whitelist`, 'event-filter');
  }

  /**
   * Update filter configuration
   */
  updateFilter(filterName, config) {
    if (this.filters.has(filterName)) {
      this.filters.set(filterName, { ...this.filters.get(filterName), ...config });
      logger.info(`Updated filter ${filterName}`, 'event-filter');
    }
  }

  /**
   * Get filter statistics
   */
  async getStatistics(period = '7d') {
    try {
      // This would query the database for filter statistics
      // For now, return mock data
      return {
        totalEvents: 0,
        filteredEvents: 0,
        processedEvents: 0,
        filterEffectiveness: {
          MIN_TRANSACTION_VALUE: 0,
          MIN_POSITION_VALUE: 0,
          TOKEN_BLACKLIST: 0,
          TOKEN_WHITELIST: 0,
          WEEKEND_FILTER: 0,
          HIGH_FREQUENCY_FILTER: 0,
          HIGH_VOLATILITY_FILTER: 0,
          DUPLICATE_EVENT_FILTER: 0
        },
        topFilteredTokens: {},
        topFilteredAddresses: {}
      };
    } catch (error) {
      logger.error(`Error getting filter statistics: ${error.message}`, 'event-filter');
      throw error;
    }
  }

  /**
   * Health check for event filter
   */
  async healthCheck() {
    try {
      const status = {
        enabledFilters: Array.from(this.filters.values()).filter(f => f.enabled).length,
        totalFilters: this.filters.size,
        blacklistSize: this.blacklist.size,
        whitelistSize: this.whitelist.size,
        eventTrackingSize: this.eventTracking.size,
        recentEventsSize: this.recentEvents.size
      };

      return { 
        status: 'healthy', 
        message: 'Event filter is running',
        data: status
      };
    } catch (error) {
      logger.error(`Event filter health check failed: ${error.message}`, 'event-filter');
      return { status: 'unhealthy', message: 'Event filter is not responding' };
    }
  }
}

module.exports = EventFilter;