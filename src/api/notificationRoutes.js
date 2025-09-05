// src/api/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

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
 * Subscribe to push notifications
 */
router.post('/subscribe', (req, res) => {
  try {
    const { userId, subscription } = req.body;
    
    if (!userId || !subscription) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId or subscription' 
      });
    }

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid subscription object' 
      });
    }

    notificationService.addSubscription(userId, subscription);
    
    res.json({ 
      success: true, 
      message: 'Successfully subscribed to push notifications',
      subscriptionCount: notificationService.getSubscriptionCount()
    });
  } catch (error) {
    console.error('[API] Subscribe error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to subscribe to notifications' 
    });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId' 
      });
    }

    notificationService.removeSubscription(userId);
    
    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed from push notifications',
      subscriptionCount: notificationService.getSubscriptionCount()
    });
  } catch (error) {
    console.error('[API] Unsubscribe error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to unsubscribe from notifications' 
    });
  }
});

/**
 * POST /api/notifications/test
 * Send test notification
 */
router.post('/test', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId' 
      });
    }

    const payload = {
      title: 'Zenith Trader Test',
      body: message || 'Bu bir test bildirimidir!',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        test: true,
        timestamp: Date.now(),
        url: '/dashboard'
      }
    };

    const sent = await notificationService.sendNotificationToUser(userId, payload);
    
    if (sent) {
      res.json({ 
        success: true, 
        message: 'Test notification sent successfully' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'User not subscribed or notification failed' 
      });
    }
  } catch (error) {
    console.error('[API] Test notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test notification' 
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
