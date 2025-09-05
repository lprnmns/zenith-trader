const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and verify they exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        googleId: true,
        googleEmail: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is disabled.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Admin Role Middleware
 * Ensures user has ADMIN role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Admin access required.',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          googleId: true,
          googleEmail: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true
        }
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    next();
  }
};

/**
 * Role-based Access Control Middleware
 * @param {Array<string>} allowedRoles - Roles that are allowed to access this route
 */
const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Resource Ownership Middleware
 * Ensures user can only access their own resources
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 */
const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admin users can access any resource
    if (req.user.role === 'ADMIN') {
      return next();
    }

    try {
      const resourceOwnerId = await getResourceOwnerId(req);
      
      if (resourceOwnerId !== req.user.id) {
        return res.status(403).json({ 
          error: 'Access denied. You can only access your own resources.',
          code: 'OWNERSHIP_REQUIRED'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ 
        error: 'Error checking resource ownership.',
        code: 'OWNERSHIP_ERROR'
      });
    }
  };
};

/**
 * Rate Limiting Middleware
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 */
const rateLimit = (windowMs = 60000, maxRequests = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    if (!requests.has(userId)) {
      requests.set(userId, []);
    }
    
    const userRequests = requests.get(userId);
    const validRequests = userRequests.filter(time => time > windowStart);
    requests.set(userId, validRequests);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }
    
    validRequests.push(now);
    next();
  };
};

/**
 * JWT Token Generation Helper
 */
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Password Strength Validation
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters long.` };
  }

  if (!hasUpperCase || !hasLowerCase) {
    return { valid: false, message: 'Password must contain both uppercase and lowercase letters.' };
  }

  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }

  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }

  return { valid: true };
};

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  requireRoles,
  requireOwnership,
  rateLimit,
  generateToken,
  validatePasswordStrength
};