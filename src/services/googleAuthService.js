const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../middleware/auth');
const adminNotificationService = require('./adminNotificationService');

const prisma = new PrismaClient();

class GoogleAuthService {
  constructor() {
    this.oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
  }

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: this.generateState()
    });
  }

  /**
   * Generate secure state parameter for CSRF protection
   */
  generateState() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * Verify state parameter
   */
  verifyState(state, sessionState) {
    return state === sessionState;
  }

  /**
   * Handle Google OAuth callback
   */
  async handleCallback(code, state, sessionState) {
    try {
      // Verify state for CSRF protection
      if (!this.verifyState(state, sessionState)) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user info from Google
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const googleId = payload.sub;
      const googleEmail = payload.email;
      const name = payload.name;
      const picture = payload.picture;

      // Find or create user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { googleEmail },
            { email: googleEmail }
          ]
        }
      });

      if (user) {
        // Update existing user with Google info if not already set
        const updates = {};
        let isFirstGoogleLogin = false;
        
        if (!user.googleId) {
          updates.googleId = googleId;
          isFirstGoogleLogin = true;
        }
        if (!user.googleEmail) updates.googleEmail = googleEmail;
        if (!user.isActive) updates.isActive = true;
        updates.lastLoginAt = new Date();

        if (Object.keys(updates).length > 0) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updates
          });
          
          // Send notification if this is the first time linking Google account
          if (isFirstGoogleLogin) {
            try {
              await adminNotificationService.notifyNewUser(user);
              console.log('[GoogleAuth] First Google login notification sent for existing user:', user.email);
            } catch (notificationError) {
              console.error('[GoogleAuth] Failed to send first Google login notification:', notificationError);
            }
          }
        }
      } else {
        // Create new user
        const isAdmin = googleEmail === 'manasalperen@gmail.com';
        user = await prisma.user.create({
          data: {
            email: googleEmail,
            googleId,
            googleEmail,
            role: isAdmin ? 'ADMIN' : 'USER', // Set ADMIN role for specific email
            isActive: true,
            lastLoginAt: new Date()
          }
        });
        
        // Send admin notification for new Google user registration
        try {
          await adminNotificationService.notifyNewUser(user);
        } catch (notificationError) {
          console.error('[GoogleAuth] Failed to send admin notification:', notificationError);
        }
      }

      // Generate JWT token
      const token = generateToken(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          googleId: user.googleId,
          googleEmail: user.googleEmail,
          name,
          picture
        },
        token
      };
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Get current user from JWT token
   */
  async getCurrentUser(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          googleId: true,
          googleEmail: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(userId, googleId, googleEmail) {
    try {
      // Check if Google account is already linked to another user
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { googleEmail }
          ],
          NOT: {
            id: userId
          }
        }
      });

      if (existingUser) {
        throw new Error('Google account is already linked to another user');
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          googleId,
          googleEmail
        }
      });

      return user;
    } catch (error) {
      console.error('Link Google account error:', error);
      throw error;
    }
  }

  /**
   * Unlink Google account from user
   */
  async unlinkGoogleAccount(userId) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          googleId: null,
          googleEmail: null
        }
      });

      return user;
    } catch (error) {
      console.error('Unlink Google account error:', error);
      throw error;
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke Google access
   */
  async revokeAccess(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { googleId: true }
      });

      if (user && user.googleId) {
        // Note: Google doesn't provide a direct API to revoke tokens
        // We just remove the Google account linkage
        await this.unlinkGoogleAccount(userId);
      }
    } catch (error) {
      console.error('Revoke access error:', error);
      throw error;
    }
  }
}

module.exports = new GoogleAuthService();