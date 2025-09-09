const express = require('express');
const googleAuthService = require('../services/googleAuthService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Redirect to Google OAuth
 */
router.get('/google', (req, res) => {
  try {
    // Generate state and store in session
    const state = googleAuthService.generateState();
    req.session.oauthState = state;
    
    // Generate auth URL with the state
    const authUrl = googleAuthService.getAuthUrlWithState(state);
    
    res.redirect(authUrl);
  } catch (error) {
    console.error('Google OAuth redirect error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate Google OAuth',
      code: 'OAUTH_INIT_FAILED'
    });
  }
});

/**
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const sessionState = req.session.oauthState;

    console.log('[GoogleAuth] Callback received:', { code: !!code, state: !!state, sessionState: !!sessionState });

    if (!code || !state) {
      console.log('[GoogleAuth] Missing parameters:', { code, state });
      return res.redirect(`${process.env.GOOGLE_FAILURE_REDIRECT}?error=missing_params`);
    }

    if (!sessionState) {
      console.log('[GoogleAuth] No session state found');
      return res.redirect(`${process.env.GOOGLE_FAILURE_REDIRECT}?error=no_session_state`);
    }

    if (state !== sessionState) {
      console.log('[GoogleAuth] State mismatch:', { state, sessionState });
      return res.redirect(`${process.env.GOOGLE_FAILURE_REDIRECT}?error=state_mismatch`);
    }

    // Clear state from session
    req.session.oauthState = null;

    const result = await googleAuthService.handleCallback(code, state, sessionState);
    
    // Set session data
    req.session.user = result.user;
    req.session.token = result.token;

    // Redirect to success page with token
    const redirectUrl = new URL(process.env.GOOGLE_SUCCESS_REDIRECT);
    redirectUrl.searchParams.set('token', result.token);
    redirectUrl.searchParams.set('user', JSON.stringify(result.user));
    
    console.log('[GoogleAuth] Authentication successful for:', result.user.email);
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const redirectUrl = new URL(process.env.GOOGLE_FAILURE_REDIRECT);
    redirectUrl.searchParams.set('error', 'oauth_failed');
    res.redirect(redirectUrl.toString());
  }
});

/**
 * Get current authenticated user
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await googleAuthService.getCurrentUser(req.user.id);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user,
      authenticated: true
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      code: 'GET_USER_FAILED'
    });
  }
});

/**
 * Logout user
 */
router.post('/logout', requireAuth, (req, res) => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ 
          error: 'Failed to logout',
          code: 'LOGOUT_FAILED'
        });
      }

      res.json({ 
        message: 'Logged out successfully',
        success: true 
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Failed to logout',
      code: 'LOGOUT_FAILED'
    });
  }
});

/**
 * Link Google account to existing user
 */
router.post('/link-google', requireAuth, async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        code: 'MISSING_PARAMS'
      });
    }

    const sessionState = req.session.oauthState;
    req.session.oauthState = null;

    const result = await googleAuthService.handleCallback(code, state, sessionState);
    
    // Link Google account to existing user
    const updatedUser = await googleAuthService.linkGoogleAccount(
      req.user.id, 
      result.user.googleId, 
      result.user.googleEmail
    );

    res.json({
      message: 'Google account linked successfully',
      user: updatedUser,
      success: true
    });
  } catch (error) {
    console.error('Link Google account error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to link Google account',
      code: 'LINK_GOOGLE_FAILED'
    });
  }
});

/**
 * Unlink Google account
 */
router.post('/unlink-google', requireAuth, async (req, res) => {
  try {
    const user = await googleAuthService.unlinkGoogleAccount(req.user.id);
    
    res.json({
      message: 'Google account unlinked successfully',
      user,
      success: true
    });
  } catch (error) {
    console.error('Unlink Google account error:', error);
    res.status(500).json({ 
      error: 'Failed to unlink Google account',
      code: 'UNLINK_GOOGLE_FAILED'
    });
  }
});

/**
 * Refresh Google access token
 */
router.post('/refresh-token', requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const newCredentials = await googleAuthService.refreshToken(refreshToken);
    
    res.json({
      message: 'Token refreshed successfully',
      credentials: newCredentials,
      success: true
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(400).json({ 
      error: 'Failed to refresh token',
      code: 'REFRESH_TOKEN_FAILED'
    });
  }
});

/**
 * Get Google OAuth configuration for frontend
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    };

    res.json({
      config,
      enabled: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
    });
  } catch (error) {
    console.error('Get OAuth config error:', error);
    res.status(500).json({ 
      error: 'Failed to get OAuth configuration',
      code: 'GET_CONFIG_FAILED'
    });
  }
});

module.exports = router;