// src/api/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const walletNotificationService = require('../services/walletNotificationService');

/**
 * GET /api/notifications/vapid-key
 * Get VAPID public key for frontend registration (alias for vapid-public-key)
 */
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = notificationService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('[API] VAPID public key error:', error);
    res.status(500).json({ error: 'Failed to get VAPID public key' });
  }
});

/**
 * GET /api/notifications/vapid-public-key
 * Get VAPID public key for frontend registration
 */
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = notificationService.getVapidPublicKey();
    res.json({ 
      success: true,
      publicKey: publicKey 
    });
  } catch (error) {
    console.error('[API] VAPID public key error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get VAPID public key' 
    });
  }
});

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications for wallet
 */
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { walletAddress, subscription, isPushEnabled } = req.body;
    const userId = req.user?.userId;
    
    if (!walletAddress || !subscription) {
      return res.status(400).json({ 
        error: 'Missing walletAddress or subscription' 
      });
    }

    // Validate subscription object (skip for fallback browser notifications)
    if (subscription.endpoint !== 'browser-notification' && (!subscription.endpoint || !subscription.keys)) {
      return res.status(400).json({ 
        error: 'Invalid subscription object' 
      });
    }

    // Use wallet notification service for wallet-specific subscriptions
    await walletNotificationService.subscribeToWallet(userId, walletAddress, subscription);
    
    const notificationType = isPushEnabled ? 'push notifications' : 'browser notifications';
    
    res.json({ 
      success: true, 
      message: `Successfully subscribed to ${notificationType} for wallet`,
      notificationType: isPushEnabled ? 'push' : 'browser'
    });
  } catch (error) {
    console.error('[API] Subscribe error:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe to notifications' 
    });
  }
});

/**
 * POST /api/notifications/check
 * Check if subscribed to wallet notifications
 */
router.post('/check', requireAuth, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userId = req.user?.userId;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        error: 'Missing walletAddress' 
      });
    }

    const isSubscribed = await walletNotificationService.isSubscribedToWallet(userId, walletAddress);
    
    res.json({ isSubscribed });
  } catch (error) {
    console.error('[API] Check subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to check subscription' 
    });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from wallet push notifications
 */
router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userId = req.user?.userId;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        error: 'Missing walletAddress' 
      });
    }

    await walletNotificationService.unsubscribeFromWallet(userId, walletAddress);
    
    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed from wallet notifications'
    });
  } catch (error) {
    console.error('[API] Unsubscribe error:', error);
    res.status(500).json({ 
      error: 'Failed to unsubscribe from notifications' 
    });
  }
});

/**
 * POST /api/notifications/broadcast
 * Send broadcast notification to all users
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing title or message' 
      });
    }

    const payload = {
      title: title,
      body: message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        broadcast: true,
        timestamp: Date.now(),
        url: '/dashboard'
      }
    };

    const successCount = await notificationService.sendBroadcastNotification(payload);
    
    res.json({ 
      success: true, 
      message: `Broadcast sent to ${successCount} users`,
      successCount: successCount,
      totalSubscriptions: notificationService.getSubscriptionCount()
    });
  } catch (error) {
    console.error('[API] Broadcast notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send broadcast notification' 
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get('/stats', (req, res) => {
  try {
    res.json({ 
      success: true,
      subscriptionCount: notificationService.getSubscriptionCount(),
      isConfigured: !!notificationService.getVapidPublicKey()
    });
  } catch (error) {
    console.error('[API] Notification stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get notification stats' 
    });
  }
});

module.exports = router;
