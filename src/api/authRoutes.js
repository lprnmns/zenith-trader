// src/api/authRoutes.js
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

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

module.exports = router;
