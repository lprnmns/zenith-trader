const logger = require('./logger');

class PositionCalculator {
  constructor() {
    this.tokenPrices = new Map();
    this.tokenDecimals = new Map();
    this.initializeTokenData();
  }

  /**
   * Initialize token data
   */
  initializeTokenData() {
    // Token decimals
    this.tokenDecimals.set('ETH', 18);
    this.tokenDecimals.set('USDT', 6);
    this.tokenDecimals.set('USDC', 6);
    this.tokenDecimals.set('BTC', 8);
    this.tokenDecimals.set('DAI', 18);
    this.tokenDecimals.set('UNI', 18);
    this.tokenDecimals.set('AAVE', 18);
    this.tokenDecimals.set('COMP', 18);
    this.tokenDecimals.set('ARB', 18);
    this.tokenDecimals.set('OP', 18);

    // Initial token prices (would be updated from oracle)
    this.updateTokenPrices({
      'ETH': 2000,
      'USDT': 1,
      'USDC': 1,
      'BTC': 45000,
      'DAI': 1,
      'UNI': 7,
      'AAVE': 100,
      'COMP': 50,
      'ARB': 1.5,
      'OP': 2
    });
  }

  /**
   * Update token prices
   */
  updateTokenPrices(prices) {
    for (const [symbol, price] of Object.entries(prices)) {
      this.tokenPrices.set(symbol.toUpperCase(), price);
    }
  }

  /**
   * Calculate position size based on strategy configuration
   */
  calculatePositionSize(strategy, signal) {
    try {
      let positionSizeUSD;

      // Calculate base position size based on strategy sizing method
      switch (strategy.sizingMethod) {
        case 'Fixed Amount':
          positionSizeUSD = strategy.amountPerTrade || strategy.positionSize || 100;
          break;

        case 'Percentage of Wallet\'s Trade':
          positionSizeUSD = this.calculatePercentagePosition(strategy, signal);
          break;

        case 'Kelly Criterion':
          positionSizeUSD = this.calculateKellyPosition(strategy, signal);
          break;

        case 'Risk Parity':
          positionSizeUSD = this.calculateRiskParityPosition(strategy, signal);
          break;

        default:
          positionSizeUSD = strategy.positionSize || 100;
      }

      // Apply leverage
      positionSizeUSD = positionSizeUSD * (strategy.leverage || 1);

      // Apply percentage to copy if specified
      if (strategy.percentageToCopy) {
        positionSizeUSD = positionSizeUSD * (strategy.percentageToCopy / 100);
      }

      // Validate against daily limit
      positionSizeUSD = this.validateDailyLimit(strategy, positionSizeUSD);

      // Apply risk adjustments
      positionSizeUSD = this.applyRiskAdjustments(strategy, signal, positionSizeUSD);

      return {
        positionSizeUSD: Math.max(0, positionSizeUSD),
        method: strategy.sizingMethod,
        leverage: strategy.leverage || 1,
        riskAdjustments: this.getRiskAdjustments()
      };

    } catch (error) {
      logger.error(`Error calculating position size: ${error.message}`, 'position-calculator');
      throw error;
    }
  }

  /**
   * Calculate position size as percentage of wallet's trade
   */
  calculatePercentagePosition(strategy, signal) {
    const baseSize = strategy.positionSize || 100;
    const percentage = strategy.percentageToCopy || 100;
    
    // If signal has amount information, use it as reference
    if (signal.amount && signal.price) {
      const signalValue = signal.amount * signal.price;
      return signalValue * (percentage / 100);
    }

    return baseSize * (percentage / 100);
  }

  /**
   * Calculate position size using Kelly Criterion
   */
  calculateKellyPosition(strategy, signal) {
    const winRate = this.getHistoricalWinRate(strategy, signal.token);
    const avgWin = this.getAverageWin(strategy, signal.token);
    const avgLoss = this.getAverageLoss(strategy, signal.token);
    
    if (avgLoss === 0) {
      return strategy.positionSize || 100;
    }

    const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    const conservativeKelly = kellyFraction * 0.25; // Use 25% of Kelly for safety
    
    const baseSize = strategy.positionSize || 100;
    return baseSize * Math.max(0, Math.min(1, conservativeKelly));
  }

  /**
   * Calculate position size using Risk Parity
   */
  calculateRiskParityPosition(strategy, signal) {
    const tokenVolatility = this.getTokenVolatility(signal.token);
    const portfolioVolatility = this.getPortfolioVolatility(strategy);
    
    if (portfolioVolatility === 0) {
      return strategy.positionSize || 100;
    }

    const riskParityWeight = (1 / tokenVolatility) / (1 / portfolioVolatility);
    const baseSize = strategy.positionSize || 100;
    
    return baseSize * Math.min(1, riskParityWeight);
  }

  /**
   * Validate against daily limit
   */
  validateDailyLimit(strategy, positionSizeUSD) {
    if (!strategy.dailyLimit) {
      return positionSizeUSD;
    }

    // Get today's total position size (simplified)
    const todayTotal = this.getTodayTotalPositionSize(strategy);
    const remainingLimit = strategy.dailyLimit - todayTotal;

    return Math.min(positionSizeUSD, Math.max(0, remainingLimit));
  }

  /**
   * Apply risk adjustments
   */
  applyRiskAdjustments(strategy, signal, positionSizeUSD) {
    let adjustedSize = positionSizeUSD;

    // Adjust based on signal confidence
    if (signal.confidence) {
      const confidenceMultiplier = 0.5 + (signal.confidence * 0.5); // 0.5 to 1.0
      adjustedSize *= confidenceMultiplier;
    }

    // Adjust based on token volatility
    const volatility = this.getTokenVolatility(signal.token);
    if (volatility > 0.2) { // High volatility (>20%)
      adjustedSize *= 0.7; // Reduce by 30%
    } else if (volatility > 0.1) { // Medium volatility (>10%)
      adjustedSize *= 0.85; // Reduce by 15%
    }

    // Adjust based on market conditions (simplified)
    const marketStress = this.getMarketStressLevel();
    if (marketStress > 0.7) {
      adjustedSize *= 0.8; // Reduce by 20% in high stress
    }

    return adjustedSize;
  }

  /**
   * Calculate token amount from USD value
   */
  calculateTokenAmount(tokenSymbol, usdValue) {
    try {
      const price = this.getTokenPrice(tokenSymbol);
      const decimals = this.getTokenDecimals(tokenSymbol);
      
      if (price === 0) {
        throw new Error(`No price available for ${tokenSymbol}`);
      }

      const tokenAmount = usdValue / price;
      return this.toFixed(tokenAmount, decimals);
    } catch (error) {
      logger.error(`Error calculating token amount: ${error.message}`, 'position-calculator');
      throw error;
    }
  }

  /**
   * Calculate USD value from token amount
   */
  calculateUSDValue(tokenSymbol, tokenAmount) {
    try {
      const price = this.getTokenPrice(tokenSymbol);
      return tokenAmount * price;
    } catch (error) {
      logger.error(`Error calculating USD value: ${error.message}`, 'position-calculator');
      throw error;
    }
  }

  /**
   * Calculate position P&L
   */
  calculatePositionPnL(position, currentPrice) {
    try {
      const entryPrice = position.entryPrice;
      const amount = position.amount;
      const side = position.side; // 'LONG' or 'SHORT'

      let pnl;
      if (side === 'LONG') {
        pnl = (currentPrice - entryPrice) * amount;
      } else {
        pnl = (entryPrice - currentPrice) * amount;
      }

      const pnlPercentage = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      return {
        pnlUSD: pnl,
        pnlPercentage: side === 'LONG' ? pnlPercentage : -pnlPercentage,
        currentValue: amount * currentPrice,
        entryValue: amount * entryPrice
      };
    } catch (error) {
      logger.error(`Error calculating position P&L: ${error.message}`, 'position-calculator');
      throw error;
    }
  }

  /**
   * Calculate required margin for position
   */
  calculateRequiredMargin(positionSizeUSD, leverage) {
    try {
      return positionSizeUSD / leverage;
    } catch (error) {
      logger.error(`Error calculating required margin: ${error.message}`, 'position-calculator');
      throw error;
    }
  }

  /**
   * Calculate liquidation price
   */
  calculateLiquidationPrice(position, leverage) {
    try {
      const entryPrice = position.entryPrice;
      const side = position.side;
      const maintenanceMargin = 0.005; // 0.5% maintenance margin

      let liquidationPrice;
      if (side === 'LONG') {
        liquidationPrice = entryPrice * (1 - maintenanceMargin / leverage);
      } else {
        liquidationPrice = entryPrice * (1 + maintenanceMargin / leverage);
      }

      return liquidationPrice;
    } catch (error) {
      logger.error(`Error calculating liquidation price: ${error.message}`, 'position-calculator');
      throw error;
    }
  }

  /**
   * Calculate risk-reward ratio
   */
  calculateRiskRewardRatio(entryPrice, stopLoss, takeProfit) {
    try {
      const risk = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(takeProfit - entryPrice);
      
      if (risk === 0) {
        return 0;
      }

      return reward / risk;
    } catch (error) {
      logger.error(`Error calculating risk-reward ratio: ${error.message}`, 'position-calculator');
      throw error;
    }
  }

  /**
   * Get token price
   */
  getTokenPrice(tokenSymbol) {
    return this.tokenPrices.get(tokenSymbol.toUpperCase()) || 0;
  }

  /**
   * Get token decimals
   */
  getTokenDecimals(tokenSymbol) {
    return this.tokenDecimals.get(tokenSymbol.toUpperCase()) || 18;
  }

  /**
   * Get historical win rate (simplified)
   */
  getHistoricalWinRate(strategy, tokenSymbol) {
    // This would query historical trades in production
    return 0.6; // Mock data: 60% win rate
  }

  /**
   * Get average win (simplified)
   */
  getAverageWin(strategy, tokenSymbol) {
    // This would query historical trades in production
    return 150; // Mock data: $150 average win
  }

  /**
   * Get average loss (simplified)
   */
  getAverageLoss(strategy, tokenSymbol) {
    // This would query historical trades in production
    return 100; // Mock data: $100 average loss
  }

  /**
   * Get token volatility (simplified)
   */
  getTokenVolatility(tokenSymbol) {
    // This would use market data in production
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
   * Get portfolio volatility (simplified)
   */
  getPortfolioVolatility(strategy) {
    // This would calculate based on current positions
    return 0.15; // Mock data: 15% portfolio volatility
  }

  /**
   * Get today's total position size (simplified)
   */
  getTodayTotalPositionSize(strategy) {
    // This would query today's trades in production
    return Math.random() * 1000; // Mock data
  }

  /**
   * Get market stress level (simplified)
   */
  getMarketStressLevel() {
    // This would use market indicators in production
    return Math.random(); // Mock data: 0 to 1
  }

  /**
   * Get risk adjustments applied
   */
  getRiskAdjustments() {
    return {
      confidence: true,
      volatility: true,
      marketStress: true
    };
  }

  /**
   * Format number to fixed decimals
   */
  toFixed(number, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.floor(number * factor) / factor;
  }

  /**
   * Get position calculator statistics
   */
  async getStatistics(strategyId, period = '7d') {
    try {
      // This would query the database for position statistics
      // For now, return mock data
      return {
        totalPositions: 0,
        averagePositionSize: 0,
        totalPnL: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        currentDrawdown: 0,
        riskAdjustments: {
          confidenceApplied: 0,
          volatilityApplied: 0,
          marketStressApplied: 0
        }
      };
    } catch (error) {
      logger.error(`Error getting position calculator statistics: ${error.message}`, 'position-calculator');
      throw error;
    }
  }

  /**
   * Health check for position calculator
   */
  async healthCheck() {
    try {
      const status = {
        tokenPrices: this.tokenPrices.size,
        tokenDecimals: this.tokenDecimals.size,
        lastPriceUpdate: null
      };

      return { 
        status: 'healthy', 
        message: 'Position calculator is running',
        data: status
      };
    } catch (error) {
      logger.error(`Position calculator health check failed: ${error.message}`, 'position-calculator');
      return { status: 'unhealthy', message: 'Position calculator is not responding' };
    }
  }
}

module.exports = PositionCalculator;