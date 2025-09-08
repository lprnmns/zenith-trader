// src/api/authRoutes.js
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const upgradeRequestService = require('../services/upgradeRequestService');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if email is ADMIN
    const role = authService.isAdmin(email) ? 'ADMIN' : 'USER';

    const result = await authService.register(email, password, role);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: result.user,
        token: result.token
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[Auth API] Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await authService.login(email, password);

    if (result.success) {
      res.json({
        success: true,
        message: 'Login successful',
        user: result.user,
        token: result.token
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[Auth API] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authService.authenticateToken, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);

    if (user) {
      res.json({
        success: true,
        user
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (error) {
    console.error('[Auth API] Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authService.authenticateToken, (req, res) => {
  // With JWT, logout is typically handled client-side by removing the token
  // This endpoint is mainly for logging purposes
  console.log(`[Auth] User logged out: ${req.user.email}`);
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * GET /api/auth/config
 * Get OAuth configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      enabled: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      config: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        redirectUri: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/success`,
        scopes: ['email', 'profile']
      }
    };

    res.json(config);
  } catch (error) {
    console.error('[Auth API] Config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OAuth configuration'
    });
  }
});

/**
 * GET /api/auth/check-ADMIN
 * Check if current user is ADMIN
 */
router.get('/check-ADMIN', authService.authenticateToken, (req, res) => {
  res.json({
    success: true,
    isAdmin: req.user.role === 'ADMIN',
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

/**
 * PUT /api/auth/okx-credentials
 * Update user's OKX API credentials
 */
router.put('/okx-credentials', authService.authenticateToken, async (req, res) => {
  try {
    const { okxApiKey, okxApiSecret, okxPassphrase } = req.body;
    
    // Validation
    if (!okxApiKey || !okxApiSecret || !okxPassphrase) {
      return res.status(400).json({
        success: false,
        error: 'All OKX credentials are required'
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Update user credentials
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        okxApiKey,
        okxApiSecret,
        okxPassphrase
      },
      select: {
        id: true,
        email: true,
        role: true,
        okxApiKey: true,
        okxApiSecret: true,
        okxPassphrase: true
      }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      message: 'OKX credentials updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('[Auth API] OKX credentials update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update OKX credentials'
    });
  }
});

/**
 * GET /api/auth/okx-credentials
 * Get user's OKX API credentials
 */
router.get('/okx-credentials', authService.authenticateToken, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        okxApiKey: true,
        okxApiSecret: true,
        okxPassphrase: true
      }
    });

    await prisma.$disconnect();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('[Auth API] OKX credentials fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch OKX credentials'
    });
  }
});

/**
 * POST /api/auth/upgrade-request
 * Submit an upgrade request for premium features
 */
router.post('/upgrade-request', authService.authenticateToken, async (req, res) => {
  try {
    const { email, contactInfo, message } = req.body;
    
    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Create upgrade request
    const upgradeRequest = await upgradeRequestService.createUpgradeRequest(
      req.user.userId,
      {
        email,
        contactInfo,
        message
      }
    );

    res.json({
      success: true,
      message: 'Upgrade request submitted successfully',
      upgradeRequest: {
        id: upgradeRequest.id,
        status: upgradeRequest.status,
        createdAt: upgradeRequest.createdAt
      }
    });

  } catch (error) {
    console.error('[Auth API] Upgrade request error:', error);
    
    if (error.message === 'You already have a pending upgrade request. Please wait for it to be processed.') {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit upgrade request'
    });
  }
});

/**
 * GET /api/auth/upgrade-requests
 * Get current user's upgrade requests
 */
router.get('/upgrade-requests', authService.authenticateToken, async (req, res) => {
  try {
    const requests = await upgradeRequestService.getUserUpgradeRequests(req.user.userId);
    
    res.json({
      success: true,
      upgradeRequests: requests
    });

  } catch (error) {
    console.error('[Auth API] Get upgrade requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upgrade requests'
    });
  }
});

module.exports = router;
