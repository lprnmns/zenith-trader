// src/middleware/featureFlag.js

const featureFlags = require('../config/featureFlags');

/**
 * Feature Flag Middleware
 * Controls access to features based on configuration
 */

/**
 * Middleware to check if a feature is enabled
 * @param {string} featureName - Name of the feature to check
 * @returns {Function} Express middleware function
 */
function requireFeature(featureName) {
  return (req, res, next) => {
    if (featureFlags.isEnabled(featureName)) {
      next();
    } else {
      res.status(404).json({
        success: false,
        error: 'Feature not available',
        message: `The requested feature '${featureName}' is currently disabled`
      });
    }
  };
}

/**
 * Middleware to restrict access to development environment only
 */
function requireDevelopment() {
  return requireFeature('DEV_MODE');
}

/**
 * Middleware to restrict access to test environment only
 */
function requireTest() {
  return requireFeature('TEST_MODE');
}

/**
 * Middleware to restrict access to production environment
 */
function requireProduction() {
  return (req, res, next) => {
    if (featureFlags.isEnabled('DEV_MODE') || featureFlags.isEnabled('TEST_MODE')) {
      res.status(404).json({
        success: false,
        error: 'Production only feature',
        message: 'This feature is only available in production environment'
      });
    } else {
      next();
    }
  };
}

/**
 * Conditional middleware execution
 * @param {Function} middleware - Middleware to execute conditionally
 * @param {string} featureName - Feature name to check
 * @returns {Function} Express middleware function
 */
function conditionalMiddleware(middleware, featureName) {
  return (req, res, next) => {
    if (featureFlags.isEnabled(featureName)) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

module.exports = {
  requireFeature,
  requireDevelopment,
  requireTest,
  requireProduction,
  conditionalMiddleware
};