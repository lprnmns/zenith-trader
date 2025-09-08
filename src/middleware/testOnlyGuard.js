// src/middleware/testOnlyGuard.js

const featureFlags = require('../config/featureFlags');

/**
 * Test-Only Routes Guard
 * Protects routes that should only be accessible in development/test environments
 */

class TestOnlyGuard {
  /**
   * Middleware to protect test-only routes
   * @returns {Function} Express middleware function
   */
  static protect() {
    return (req, res, next) => {
      // Allow access if test endpoints are enabled
      if (featureFlags.isEnabled('ENABLE_TEST_ENDPOINTS')) {
        next();
        return;
      }

      // Log access attempt in production
      if (featureFlags.isEnabled('ENABLE_RATE_LIMITING')) {
        console.warn(`Test-only route accessed in production: ${req.method} ${req.path} - IP: ${req.ip}`);
      }

      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    };
  }

  /**
   * Middleware to protect admin seeding routes
   * @returns {Function} Express middleware function
   */
  static protectAdminSeeding() {
    return (req, res, next) => {
      // Allow access if admin seeding is enabled
      if (featureFlags.isEnabled('ENABLE_ADMIN_SEEDING')) {
        next();
        return;
      }

      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    };
  }

  /**
   * Middleware to protect demo data routes
   * @returns {Function} Express middleware function
   */
  static protectDemoData() {
    return (req, res, next) => {
      // Allow access if demo data is enabled
      if (featureFlags.isEnabled('ENABLE_DEMO_DATA')) {
        next();
        return;
      }

      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    };
  }

  /**
   * Middleware to protect mock service routes
   * @returns {Function} Express middleware function
   */
  static protectMockServices() {
    return (req, res, next) => {
      // Allow access if mock services are enabled
      if (featureFlags.isEnabled('ENABLE_MOCK_SERVICES')) {
        next();
        return;
      }

      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    };
  }

  /**
   * Check if current environment allows test features
   * @returns {boolean}
   */
  static isTestEnvironment() {
    return featureFlags.isEnabled('DEV_MODE') || featureFlags.isEnabled('TEST_MODE');
  }

  /**
   * Get information about current environment
   * @returns {Object}
   */
  static getEnvironmentInfo() {
    return {
      isDevelopment: featureFlags.isEnabled('DEV_MODE'),
      isTest: featureFlags.isEnabled('TEST_MODE'),
      isProduction: !featureFlags.isEnabled('DEV_MODE') && !featureFlags.isEnabled('TEST_MODE'),
      enabledFeatures: featureFlags.getEnabledFeatures()
    };
  }
}

module.exports = TestOnlyGuard;