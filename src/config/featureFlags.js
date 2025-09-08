// src/config/featureFlags.js

/**
 * Feature Flags Configuration
 * Controls enabling/disabling of features based on environment
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  // Development Features
  DEV_MODE: isDevelopment,
  TEST_MODE: isTest,
  
  // Feature Toggles
  ENABLE_ADMIN_SEEDING: isDevelopment,
  ENABLE_TEST_ENDPOINTS: isDevelopment,
  ENABLE_DEMO_DATA: isDevelopment,
  ENABLE_VERBOSE_LOGGING: isDevelopment,
  ENABLE_MOCK_SERVICES: isDevelopment,
  
  // Production Features
  ENABLE_METRICS: isProduction,
  ENABLE_RATE_LIMITING: !isDevelopment,
  ENABLE_CORS_STRICT: isProduction,
  
  // Security Features
  ENABLE_ADMIN_LOCK: !isDevelopment,
  ENABLE_SESSION_TIMEOUT: !isDevelopment,
  
  // Helper function to check if feature is enabled
  isEnabled: function(featureName) {
    return this[featureName] || false;
  },
  
  // Helper function to get all enabled features
  getEnabledFeatures: function() {
    return Object.keys(this)
      .filter(key => typeof this[key] === 'boolean' && this[key] && key !== 'isEnabled' && key !== 'getEnabledFeatures');
  }
};