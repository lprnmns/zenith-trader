const logger = require('./logger');

class DecisionEngine {
  constructor() {
    this.riskRules = new Map();
    this.executionRules = new Map();
    this.initializeRules();
  }

  /**
   * Initialize decision rules
   */
  initializeRules() {
    // Risk management rules
    this.riskRules.set('MAX_POSITION_SIZE', {
      name: 'Maximum Position Size',
      description: 'Limit position size to percentage of portfolio',
      maxPercentage: 10, // 10% of portfolio
      enabled: true
    });

    this.riskRules.set('MAX_DAILY_TRADES', {
      name: 'Maximum Daily Trades',
      description: 'Limit number of trades per day',
      maxTrades: 10,
      enabled: true
    });

    this.riskRules.set('MIN_CONFIDENCE', {
      name: 'Minimum Confidence',
      description: 'Minimum confidence level for signal execution',
      minConfidence: 0.7,
      enabled: true
    });

    this.riskRules.set('COOLDOWN_PERIOD', {
      name: 'Cooldown Period',
      description: 'Minimum time between trades for same token',
      cooldownMinutes: 30,
      enabled: true
    });

    this.riskRules.set('MAX_DRAWDOWN', {
      name: 'Maximum Drawdown',
      description: 'Stop trading if drawdown exceeds threshold',
      maxDrawdown: 5, // 5%
      enabled: true
    });

    // Execution rules
    this.executionRules.set('SLIPPAGE_TOLERANCE', {
      name: 'Slippage Tolerance',
      description: 'Maximum acceptable slippage',
      maxSlippage: 0.5, // 0.5%
      enabled: true
    });

    this.executionRules.set('MIN_TRADE_SIZE', {
      name: 'Minimum Trade Size',
      description: 'Minimum trade size in USD',
      minSize: 100, // $100
      enabled: true
    });

    this.executionRules.set('LIQUIDITY_CHECK', {
      name: 'Liquidity Check',
      description: 'Check if token has sufficient liquidity',
      minLiquidity: 1000000, // $1M
      enabled: true
    });

    this.executionRules.set('VOLATILITY_CHECK', {
      name: 'Volatility Check',
      description: 'Check if token volatility is acceptable',
      maxVolatility: 10, // 10%
      enabled: true
    });
  }

  /**
   * Evaluate if a signal should be executed
   */
  async evaluateSignal(signal, strategy) {
    try {
      const decision = {
        shouldExecute: false,
        reason: '',
        riskFactors: [],
        executionParams: {},
        confidence: signal.confidence || 0
      };

      // Check basic signal validity
      if (!this.validateSignal(signal)) {
        decision.reason = 'Invalid signal';
        return decision;
      }

      // Apply risk rules
      const riskCheck = await this.checkRiskRules(signal, strategy);
      if (!riskCheck.passed) {
        decision.shouldExecute = false;
        decision.reason = riskCheck.reason;
        decision.riskFactors = riskCheck.factors;
        return decision;
      }

      // Apply execution rules
      const executionCheck = await this.checkExecutionRules(signal, strategy);
      if (!executionCheck.passed) {
        decision.shouldExecute = false;
        decision.reason = executionCheck.reason;
        decision.riskFactors = [...decision.riskFactors, ...executionCheck.factors];
        return decision;
      }

      // Calculate position size
      const positionSize = this.calculatePositionSize(signal, strategy);
      if (!positionSize.valid) {
        decision.shouldExecute = false;
        decision.reason = positionSize.reason;
        return decision;
      }

      // Calculate execution parameters
      const executionParams = this.calculateExecutionParams(signal, strategy, positionSize);

      // Apply confidence adjustment
      const adjustedConfidence = this.adjustConfidence(signal, riskCheck, executionCheck);
      
      // Final decision
      if (adjustedConfidence >= this.riskRules.get('MIN_CONFIDENCE').minConfidence) {
        decision.shouldExecute = true;
        decision.reason = 'Signal meets all criteria';
        decision.executionParams = executionParams;
        decision.confidence = adjustedConfidence;
      } else {
        decision.reason = `Confidence too low: ${adjustedConfidence.toFixed(2)}`;
      }

      return decision;

    } catch (error) {
      logger.error(`Error evaluating signal: ${error.message}`, 'decision-engine');
      return {
        shouldExecute: false,
        reason: `Error: ${error.message}`,
        riskFactors: [],
        executionParams: {},
        confidence: 0
      };
    }
  }

  /**
   * Validate basic signal structure
   */
  validateSignal(signal) {
    if (!signal.type || !['BUY', 'SELL'].includes(signal.type)) {
      return false;
    }

    if (!signal.token || typeof signal.token !== 'string') {
      return false;
    }

    if (!signal.amount || signal.amount <= 0) {
      return false;
    }

    if (!signal.price || signal.price <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Check risk rules
   */
  async checkRiskRules(signal, strategy) {
    const factors = [];
    let passed = true;
    let reason = '';

    try {
      // Check maximum position size
      if (this.riskRules.get('MAX_POSITION_SIZE').enabled) {
        const positionSizeCheck = await this.checkMaxPositionSize(signal, strategy);
        if (!positionSizeCheck.passed) {
          passed = false;
          reason = positionSizeCheck.reason;
          factors.push({
            rule: 'MAX_POSITION_SIZE',
            severity: 'high',
            message: positionSizeCheck.reason
          });
        }
      }

      // Check maximum daily trades
      if (passed && this.riskRules.get('MAX_DAILY_TRADES').enabled) {
        const dailyTradesCheck = await this.checkMaxDailyTrades(strategy);
        if (!dailyTradesCheck.passed) {
          passed = false;
          reason = dailyTradesCheck.reason;
          factors.push({
            rule: 'MAX_DAILY_TRADES',
            severity: 'medium',
            message: dailyTradesCheck.reason
          });
        }
      }

      // Check minimum confidence
      if (passed && this.riskRules.get('MIN_CONFIDENCE').enabled) {
        const confidenceCheck = this.checkMinConfidence(signal);
        if (!confidenceCheck.passed) {
          passed = false;
          reason = confidenceCheck.reason;
          factors.push({
            rule: 'MIN_CONFIDENCE',
            severity: 'medium',
            message: confidenceCheck.reason
          });
        }
      }

      // Check cooldown period
      if (passed && this.riskRules.get('COOLDOWN_PERIOD').enabled) {
        const cooldownCheck = await this.checkCooldownPeriod(signal, strategy);
        if (!cooldownCheck.passed) {
          passed = false;
          reason = cooldownCheck.reason;
          factors.push({
            rule: 'COOLDOWN_PERIOD',
            severity: 'low',
            message: cooldownCheck.reason
          });
        }
      }

      // Check maximum drawdown
      if (passed && this.riskRules.get('MAX_DRAWDOWN').enabled) {
        const drawdownCheck = await this.checkMaxDrawdown(strategy);
        if (!drawdownCheck.passed) {
          passed = false;
          reason = drawdownCheck.reason;
          factors.push({
            rule: 'MAX_DRAWDOWN',
            severity: 'high',
            message: drawdownCheck.reason
          });
        }
      }

    } catch (error) {
      passed = false;
      reason = `Risk check error: ${error.message}`;
      factors.push({
        rule: 'RISK_CHECK_ERROR',
        severity: 'high',
        message: error.message
      });
    }

    return { passed, reason, factors };
  }

  /**
   * Check execution rules
   */
  async checkExecutionRules(signal, strategy) {
    const factors = [];
    let passed = true;
    let reason = '';

    try {
      // Check minimum trade size
      if (this.executionRules.get('MIN_TRADE_SIZE').enabled) {
        const minSizeCheck = this.checkMinTradeSize(signal);
        if (!minSizeCheck.passed) {
          passed = false;
          reason = minSizeCheck.reason;
          factors.push({
            rule: 'MIN_TRADE_SIZE',
            severity: 'low',
            message: minSizeCheck.reason
          });
        }
      }

      // Check liquidity (simplified)
      if (passed && this.executionRules.get('LIQUIDITY_CHECK').enabled) {
        const liquidityCheck = await this.checkLiquidity(signal);
        if (!liquidityCheck.passed) {
          passed = false;
          reason = liquidityCheck.reason;
          factors.push({
            rule: 'LIQUIDITY_CHECK',
            severity: 'medium',
            message: liquidityCheck.reason
          });
        }
      }

      // Check volatility (simplified)
      if (passed && this.executionRules.get('VOLATILITY_CHECK').enabled) {
        const volatilityCheck = await this.checkVolatility(signal);
        if (!volatilityCheck.passed) {
          passed = false;
          reason = volatilityCheck.reason;
          factors.push({
            rule: 'VOLATILITY_CHECK',
            severity: 'medium',
            message: volatilityCheck.reason
          });
        }
      }

    } catch (error) {
      passed = false;
      reason = `Execution check error: ${error.message}`;
      factors.push({
        rule: 'EXECUTION_CHECK_ERROR',
        severity: 'high',
        message: error.message
      });
    }

    return { passed, reason, factors };
  }

  /**
   * Check maximum position size
   */
  async checkMaxPositionSize(signal, strategy) {
    const maxPercentage = this.riskRules.get('MAX_POSITION_SIZE').maxPercentage;
    const signalValue = signal.amount * signal.price;
    
    // Get current portfolio value (simplified)
    const portfolioValue = strategy.positionSize * 10; // Assume 10x position size as portfolio
    const maxPositionValue = portfolioValue * (maxPercentage / 100);

    if (signalValue > maxPositionValue) {
      return {
        passed: false,
        reason: `Signal value $${signalValue.toFixed(2)} exceeds maximum position size $${maxPositionValue.toFixed(2)}`
      };
    }

    return { passed: true };
  }

  /**
   * Check maximum daily trades
   */
  async checkMaxDailyTrades(strategy) {
    const maxTrades = this.riskRules.get('MAX_DAILY_TRADES').maxTrades;
    
    // Get today's trades count (simplified)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // This would query the database in production
    const todayTrades = Math.floor(Math.random() * maxTrades); // Mock data

    if (todayTrades >= maxTrades) {
      return {
        passed: false,
        reason: `Maximum daily trades (${maxTrades}) already reached`
      };
    }

    return { passed: true };
  }

  /**
   * Check minimum confidence
   */
  checkMinConfidence(signal) {
    const minConfidence = this.riskRules.get('MIN_CONFIDENCE').minConfidence;

    if (signal.confidence < minConfidence) {
      return {
        passed: false,
        reason: `Signal confidence ${signal.confidence.toFixed(2)} below minimum ${minConfidence}`
      };
    }

    return { passed: true };
  }

  /**
   * Check cooldown period
   */
  async checkCooldownPeriod(signal, strategy) {
    const cooldownMinutes = this.riskRules.get('COOLDOWN_PERIOD').cooldownMinutes;
    
    // Get last trade time for this token (simplified)
    const lastTradeTime = new Date(Date.now() - (cooldownMinutes + 10) * 60000); // Mock data
    
    const timeSinceLastTrade = Date.now() - lastTradeTime.getTime();
    const cooldownMs = cooldownMinutes * 60000;

    if (timeSinceLastTrade < cooldownMs) {
      const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastTrade) / 60000);
      return {
        passed: false,
        reason: `Cooldown period active. ${remainingMinutes} minutes remaining`
      };
    }

    return { passed: true };
  }

  /**
   * Check maximum drawdown
   */
  async checkMaxDrawdown(strategy) {
    const maxDrawdown = this.riskRules.get('MAX_DRAWDOWN').maxDrawdown;
    
    // Get current drawdown (simplified)
    const currentDrawdown = Math.random() * 10; // Mock data

    if (currentDrawdown > maxDrawdown) {
      return {
        passed: false,
        reason: `Current drawdown ${currentDrawdown.toFixed(2)}% exceeds maximum ${maxDrawdown}%`
      };
    }

    return { passed: true };
  }

  /**
   * Check minimum trade size
   */
  checkMinTradeSize(signal) {
    const minSize = this.executionRules.get('MIN_TRADE_SIZE').minSize;
    const signalValue = signal.amount * signal.price;

    if (signalValue < minSize) {
      return {
        passed: false,
        reason: `Signal value $${signalValue.toFixed(2)} below minimum $${minSize}`
      };
    }

    return { passed: true };
  }

  /**
   * Check liquidity (simplified)
   */
  async checkLiquidity(signal) {
    const minLiquidity = this.executionRules.get('LIQUIDITY_CHECK').minLiquidity;
    
    // Get token liquidity (simplified)
    const liquidity = Math.random() * 10000000; // Mock data

    if (liquidity < minLiquidity) {
      return {
        passed: false,
        reason: `Token liquidity $${liquidity.toFixed(2)} below minimum $${minLiquidity}`
      };
    }

    return { passed: true };
  }

  /**
   * Check volatility (simplified)
   */
  async checkVolatility(signal) {
    const maxVolatility = this.executionRules.get('VOLATILITY_CHECK').maxVolatility;
    
    // Get token volatility (simplified)
    const volatility = Math.random() * 20; // Mock data

    if (volatility > maxVolatility) {
      return {
        passed: false,
        reason: `Token volatility ${volatility.toFixed(2)}% exceeds maximum ${maxVolatility}%`
      };
    }

    return { passed: true };
  }

  /**
   * Calculate position size
   */
  calculatePositionSize(signal, strategy) {
    try {
      let positionSize;

      if (strategy.sizingMethod === 'Fixed Amount') {
        positionSize = strategy.amountPerTrade || strategy.positionSize;
      } else if (strategy.sizingMethod === 'Percentage of Wallet\'s Trade') {
        positionSize = strategy.positionSize * (strategy.percentageToCopy || 1);
      } else {
        positionSize = strategy.positionSize;
      }

      // Apply leverage
      positionSize = positionSize * (strategy.leverage || 1);

      // Validate position size
      if (positionSize <= 0) {
        return {
          valid: false,
          reason: 'Invalid position size calculated'
        };
      }

      return {
        valid: true,
        size: positionSize
      };

    } catch (error) {
      return {
        valid: false,
        reason: `Position size calculation error: ${error.message}`
      };
    }
  }

  /**
   * Calculate execution parameters
   */
  calculateExecutionParams(signal, strategy, positionSize) {
    const params = {
      amount: positionSize,
      price: signal.price,
      type: 'MARKET', // Default to market order
      leverage: strategy.leverage || 1,
      stopLoss: strategy.stopLoss,
      takeProfit: null, // Could be calculated based on risk/reward ratio
      timeInForce: 'GTC', // Good till cancelled
      slippageTolerance: this.executionRules.get('SLIPPAGE_TOLERANCE').maxSlippage / 100
    };

    // Calculate take profit based on signal confidence
    if (signal.confidence > 0.8) {
      params.takeProfit = signal.price * 1.05; // 5% profit target
    } else if (signal.confidence > 0.7) {
      params.takeProfit = signal.price * 1.03; // 3% profit target
    }

    return params;
  }

  /**
   * Adjust confidence based on risk factors
   */
  adjustConfidence(signal, riskCheck, executionCheck) {
    let adjustedConfidence = signal.confidence || 0;

    // Reduce confidence based on risk factors
    riskCheck.factors.forEach(factor => {
      switch (factor.severity) {
        case 'high':
          adjustedConfidence *= 0.5;
          break;
        case 'medium':
          adjustedConfidence *= 0.8;
          break;
        case 'low':
          adjustedConfidence *= 0.9;
          break;
      }
    });

    // Reduce confidence based on execution factors
    executionCheck.factors.forEach(factor => {
      switch (factor.severity) {
        case 'high':
          adjustedConfidence *= 0.6;
          break;
        case 'medium':
          adjustedConfidence *= 0.85;
          break;
        case 'low':
          adjustedConfidence *= 0.95;
          break;
      }
    });

    return Math.max(0, Math.min(1, adjustedConfidence));
  }

  /**
   * Get decision statistics
   */
  async getDecisionStatistics(strategyId, period = '7d') {
    try {
      // This would query the database for decision statistics
      // For now, return mock data
      return {
        totalSignals: 0,
        executedSignals: 0,
        rejectedSignals: 0,
        averageConfidence: 0,
        rejectionReasons: {},
        riskFactorFrequency: {}
      };
    } catch (error) {
      logger.error(`Error getting decision statistics: ${error.message}`, 'decision-engine');
      throw error;
    }
  }

  /**
   * Health check for decision engine
   */
  async healthCheck() {
    try {
      const status = {
        riskRules: Array.from(this.riskRules.values()).filter(rule => rule.enabled).length,
        executionRules: Array.from(this.executionRules.values()).filter(rule => rule.enabled).length,
        lastDecisionTime: null
      };

      return { 
        status: 'healthy', 
        message: 'Decision engine is running',
        data: status
      };
    } catch (error) {
      logger.error(`Decision engine health check failed: ${error.message}`, 'decision-engine');
      return { status: 'unhealthy', message: 'Decision engine is not responding' };
    }
  }
}

module.exports = DecisionEngine;