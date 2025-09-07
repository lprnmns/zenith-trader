const { requireAuth, requireAdmin, requireRoles } = require('./auth');

/**
 * Role-Based Access Control (RBAC) Middleware
 * This module provides centralized access control for the application
 */

/**
 * Admin-only access middleware
 * Ensures user has ADMIN role
 */
const requireAdminAccess = (req, res, next) => {
  requireAdmin(req, res, next);
};

/**
 * User access middleware (can be accessed by both ADMIN and USER roles)
 */
const requireUserAccess = (req, res, next) => {
  requireRoles(['ADMIN', 'USER'])(req, res, next);
};

/**
 * Resource access control middleware
 * Allows users to access their own resources, admins can access all resources
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 */
const requireResourceAccess = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // First, ensure user is authenticated
      await requireAuth(req, res, () => {
        // If user is admin, allow access to any resource
        if (req.user.role === 'ADMIN') {
          return next();
        }

        // For regular users, check resource ownership
        const resourceOwnerId = getResourceOwnerId(req);
        if (resourceOwnerId === req.user.id) {
          return next();
        }

        return res.status(403).json({
          error: 'Access denied. You can only access your own resources.',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      });
    } catch (error) {
      console.error('Resource access control error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'ACCESS_CONTROL_ERROR'
      });
    }
  };
};

/**
 * Strategy management middleware (admin only for now)
 */
const requireStrategyManagement = (req, res, next) => {
  requireAdmin(req, res, next);
};

/**
 * Wallet access middleware
 * Users can access their own watched wallets, admins can access all
 */
const requireWalletAccess = (req, res, next) => {
  requireResourceAccess((req) => {
    // Extract user ID from wallet address if provided in params
    return req.user.id; // Simplified for now - in real implementation, would query database
  })(req, res, next);
};

/**
 * Notification access middleware
 * Users can access their own notifications, admins can access all
 */
const requireNotificationAccess = (req, res, next) => {
  requireResourceAccess((req) => {
    // Extract user ID from notification if provided in params
    return req.user.id; // Simplified for now
  })(req, res, next);
};

/**
 * System configuration middleware (admin only)
 */
const requireSystemConfigAccess = (req, res, next) => {
  requireAdmin(req, res, next);
};

/**
 * User management middleware (admin only)
 */
const requireUserManagementAccess = (req, res, next) => {
  requireAdmin(req, res, next);
};

/**
 * Analytics access middleware
 * Users can access their own analytics, admins can access all
 */
const requireAnalyticsAccess = (req, res, next) => {
  requireResourceAccess((req) => {
    // Extract user ID from analytics request
    return req.user.id; // Simplified for now
  })(req, res, next);
};

/**
 * Trading access middleware
 * Admins can manage trading, users can view (read-only)
 */
const requireTradingAccess = (req, res, next) => {
  requireRoles(['ADMIN'])(req, res, next);
};

/**
 * API endpoint protection levels
 */
const AccessLevel = {
  PUBLIC: null, // No authentication required
  USER: requireUserAccess, // Any authenticated user
  ADMIN: requireAdminAccess, // Admin only
  RESOURCE: requireResourceAccess, // Resource ownership based
  STRATEGY: requireStrategyManagement, // Strategy management
  WALLET: requireWalletAccess, // Wallet access
  NOTIFICATION: requireNotificationAccess, // Notification access
  SYSTEM: requireSystemConfigAccess, // System configuration
  USER_MANAGEMENT: requireUserManagementAccess, // User management
  ANALYTICS: requireAnalyticsAccess, // Analytics access
  TRADING: requireTradingAccess, // Trading operations
};

/**
 * Generic access control middleware
 * @param {string} level - Access level from AccessLevel enum
 * @param {Function} getResourceOwnerId - Optional function for resource-based access
 */
const requireAccess = (level, getResourceOwnerId) => {
  const middleware = AccessLevel[level];
  
  if (!middleware) {
    return (req, res, next) => next(); // No protection for PUBLIC level
  }
  
  if (getResourceOwnerId && level === 'RESOURCE') {
    return requireResourceAccess(getResourceOwnerId);
  }
  
  return middleware;
};

module.exports = {
  requireAdminAccess,
  requireUserAccess,
  requireResourceAccess,
  requireStrategyManagement,
  requireWalletAccess,
  requireNotificationAccess,
  requireSystemConfigAccess,
  requireUserManagementAccess,
  requireAnalyticsAccess,
  requireTradingAccess,
  requireAccess,
  AccessLevel,
};