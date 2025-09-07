// src/services/logger.js

const featureFlags = require('../config/featureFlags');

/**
 * Logging Service
 * Provides structured logging with different levels and environments
 */

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.colors = {
      ERROR: '\x1b[31m',    // Red
      WARN: '\x1b[33m',     // Yellow
      INFO: '\x1b[36m',     // Cyan
      DEBUG: '\x1b[90m',    // Gray
      RESET: '\x1b[0m'      // Reset
    };
    
    this.currentLevel = this.getCurrentLogLevel();
  }

  getCurrentLogLevel() {
    if (featureFlags.isEnabled('ENABLE_VERBOSE_LOGGING')) {
      return this.levels.DEBUG;
    }
    
    if (featureFlags.isEnabled('DEV_MODE')) {
      return this.levels.INFO;
    }
    
    return this.levels.ERROR;
  }

  shouldLog(level) {
    return level <= this.currentLevel;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    
    return `${prefix} ${message}${metaStr}`;
  }

  colorize(level, message) {
    if (!featureFlags.isEnabled('DEV_MODE')) {
      return message;
    }
    
    const color = this.colors[level] || '';
    const reset = this.colors.RESET;
    return `${color}${message}${reset}`;
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(this.levels[level])) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);
    const colorizedMessage = this.colorize(level, formattedMessage);

    switch (level) {
      case 'ERROR':
        console.error(colorizedMessage);
        break;
      case 'WARN':
        console.warn(colorizedMessage);
        break;
      case 'INFO':
        console.info(colorizedMessage);
        break;
      case 'DEBUG':
        console.debug(colorizedMessage);
        break;
      default:
        console.log(colorizedMessage);
    }

    // In production, send errors to error tracking service
    if (level === 'ERROR' && featureFlags.isEnabled('ENABLE_METRICS')) {
      this.sendToErrorTracking(message, meta);
    }
  }

  sendToErrorTracking(message, meta) {
    // Placeholder for error tracking service integration
    // In production, this would send to services like Sentry, LogRocket, etc.
    if (process.env.ERROR_TRACKING_URL) {
      // Implement error tracking integration here
    }
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // Specialized logging methods
  api(method, endpoint, status, duration, meta = {}) {
    this.info('API Request', {
      method,
      endpoint,
      status,
      duration: `${duration}ms`,
      ...meta
    });
  }

  auth(event, userId, meta = {}) {
    this.info('Auth Event', {
      event,
      userId,
      ...meta
    });
  }

  database(operation, table, duration, meta = {}) {
    this.debug('Database Operation', {
      operation,
      table,
      duration: `${duration}ms`,
      ...meta
    });
  }

  externalService(service, operation, status, meta = {}) {
    this.info('External Service', {
      service,
      operation,
      status,
      ...meta
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;