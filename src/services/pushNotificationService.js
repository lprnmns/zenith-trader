const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// VAPID keys - these should be stored in environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BMg5kN5s6eX5Y5J5T5J5T5J5T5J5T5J5T5J5T5J5T5J5T5J5T5J5T5J5T5J5T5J5Q';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'your_private_key_here';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@zenithtrader.com';

// Configure web-push with VAPID details
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

class PushNotificationService {
  constructor() {
    this.subscriptions = new Map();
    this.loadSubscriptions();
  }

  // Load existing subscriptions from database
  async loadSubscriptions() {
    try {
      const subscriptions = await prisma.PushSubscription.findMany({
        where: { isActive: true }
      });

      subscriptions.forEach(sub => {
        this.subscriptions.set(sub.id, sub);
      });

      console.log(`[PushService] Loaded ${subscriptions.length} active subscriptions`);
    } catch (error) {
      console.error('[PushService] Failed to load subscriptions:', error);
    }
  }

  // Generate VAPID keys (for initial setup)
  generateVAPIDKeys() {
    const vapidKeys = webpush.generateVAPIDKeys();
    console.log('VAPID Public Key:', vapidKeys.publicKey);
    console.log('VAPID Private Key:', vapidKeys.privateKey);
    return vapidKeys;
  }

  // Subscribe a new user
  async subscribe(userId, subscription) {
    try {
      // Check if subscription already exists
      const existingSubscription = await prisma.PushSubscription.findFirst({
        where: {
          userId: parseInt(userId),
          endpoint: subscription.endpoint
        }
      });

      if (existingSubscription) {
        // Update existing subscription
        const updated = await prisma.PushSubscription.update({
          where: { id: existingSubscription.id },
          data: {
            keys: subscription.keys,
            isActive: true,
            userAgent: subscription.userAgent || '',
            lastUsed: new Date()
          }
        });

        this.subscriptions.set(updated.id, updated);
        console.log(`[PushService] Updated subscription for user ${userId}`);
        return { success: true, subscription: updated };
      }

      // Create new subscription
      const newSubscription = await prisma.PushSubscription.create({
        data: {
          userId: parseInt(userId),
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          keys: subscription.keys,
          userAgent: subscription.userAgent || '',
          isActive: true
        }
      });

      this.subscriptions.set(newSubscription.id, newSubscription);
      console.log(`[PushService] Created new subscription for user ${userId}`);
      
      // Send welcome notification
      await this.sendToSubscription(newSubscription.id, {
        title: 'Welcome to Zenith Trader',
        body: 'Push notifications enabled successfully',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: '/dashboard' }
      });

      return { success: true, subscription: newSubscription };
    } catch (error) {
      console.error('[PushService] Failed to subscribe:', error);
      return { success: false, error: error.message };
    }
  }

  // Unsubscribe a user
  async unsubscribe(userId, endpoint) {
    try {
      const subscription = await prisma.PushSubscription.findFirst({
        where: {
          userId: parseInt(userId),
          endpoint: endpoint
        }
      });

      if (subscription) {
        await prisma.PushSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false }
        });

        this.subscriptions.delete(subscription.id);
        console.log(`[PushService] Unsubscribed user ${userId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('[PushService] Failed to unsubscribe:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to specific subscription
  async sendToSubscription(subscriptionId, payload) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        console.warn(`[PushService] Subscription ${subscriptionId} not found`);
        return false;
      }

      const PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      const options = {
        TTL: 24 * 60 * 60, // 24 hours
        urgency: 'normal',
        topic: 'zenith-trader'
      };

      await webpush.sendNotification(PushSubscription, JSON.stringify(payload), options);
      
      // Update last used timestamp
      await prisma.PushSubscription.update({
        where: { id: subscriptionId },
        data: { lastUsed: new Date() }
      });

      console.log(`[PushService] Notification sent to subscription ${subscriptionId}`);
      return true;
    } catch (error) {
      console.error(`[PushService] Failed to send to subscription ${subscriptionId}:`, error);
      
      // If subscription is no longer valid, mark as inactive
      if (error.statusCode === 410) {
        await prisma.PushSubscription.update({
          where: { id: subscriptionId },
          data: { isActive: false }
        });
        this.subscriptions.delete(subscriptionId);
      }
      
      return false;
    }
  }

  // Send notification to user
  async sendToUser(userId, payload) {
    try {
      const userSubscriptions = await prisma.PushSubscription.findMany({
        where: {
          userId: parseInt(userId),
          isActive: true
        }
      });

      if (userSubscriptions.length === 0) {
        console.log(`[PushService] No active subscriptions for user ${userId}`);
        return false;
      }

      let successCount = 0;
      for (const subscription of userSubscriptions) {
        const sent = await this.sendToSubscription(subscription.id, payload);
        if (sent) successCount++;
      }

      console.log(`[PushService] Sent notification to ${successCount}/${userSubscriptions.length} subscriptions for user ${userId}`);
      return successCount > 0;
    } catch (error) {
      console.error(`[PushService] Failed to send to user ${userId}:`, error);
      return false;
    }
  }

  // Send broadcast notification to all users
  async sendBroadcast(payload, excludeUserIds = []) {
    try {
      const subscriptions = await prisma.PushSubscription.findMany({
        where: {
          isActive: true,
          userId: {
            notIn: excludeUserIds.map(id => parseInt(id))
          }
        }
      });

      if (subscriptions.length === 0) {
        console.log('[PushService] No active subscriptions for broadcast');
        return false;
      }

      let successCount = 0;
      for (const subscription of subscriptions) {
        const sent = await this.sendToSubscription(subscription.id, payload);
        if (sent) successCount++;
      }

      console.log(`[PushService] Broadcast sent to ${successCount}/${subscriptions.length} subscriptions`);
      return successCount > 0;
    } catch (error) {
      console.error('[PushService] Failed to send broadcast:', error);
      return false;
    }
  }

  // Send strategy-related notification
  async sendStrategyNotification(strategyId, type, data) {
    try {
      const strategy = await prisma.strategy.findUnique({
        where: { id: parseInt(strategyId) },
        include: { user: true }
      });

      if (!strategy) {
        console.error(`[PushService] Strategy ${strategyId} not found`);
        return false;
      }

      const payloads = {
        SIGNAL: {
          title: 'New Trading Signal',
          body: `${strategy.name}: ${data.signal} signal detected`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: { url: `/strategies/${strategyId}`, strategyId, type: 'SIGNAL' }
        },
        EXECUTION: {
          title: 'Trade Executed',
          body: `${strategy.name}: ${data.action} ${data.pair} at ${data.price}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: { url: `/strategies/${strategyId}`, strategyId, type: 'EXECUTION' }
        },
        ALERT: {
          title: 'Strategy Alert',
          body: `${strategy.name}: ${data.message}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: { url: `/strategies/${strategyId}`, strategyId, type: 'ALERT' }
        },
        PERFORMANCE: {
          title: 'Performance Update',
          body: `${strategy.name}: ${data.message}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: { url: `/strategies/${strategyId}`, strategyId, type: 'PERFORMANCE' }
        }
      };

      const payload = payloads[type] || payloads.ALERT;
      return await this.sendToUser(strategy.userId, payload);
    } catch (error) {
      console.error(`[PushService] Failed to send strategy notification:`, error);
      return false;
    }
  }

  // Send wallet monitoring notification
  async sendWalletNotification(walletAddress, type, data) {
    try {
      const strategies = await prisma.strategy.findMany({
        where: { walletAddress },
        include: { user: true }
      });

      if (strategies.length === 0) {
        console.log(`[PushService] No strategies found for wallet ${walletAddress}`);
        return false;
      }

      const payloads = {
        TRANSACTION: {
          title: 'Wallet Transaction',
          body: `New transaction detected: ${data.hash}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: { url: '/explorer', type: 'TRANSACTION', hash: data.hash }
        },
        LARGE_TRANSFER: {
          title: 'Large Transfer Detected',
          body: `${data.amount} ${data.token} transferred`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: { url: '/explorer', type: 'LARGE_TRANSFER', amount: data.amount }
        },
        WHALE_ACTIVITY: {
          title: 'Whale Activity Alert',
          body: `Significant whale movement detected`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: { url: '/explorer', type: 'WHALE_ACTIVITY' }
        }
      };

      const payload = payloads[type] || payloads.TRANSACTION;
      
      // Send to all users monitoring this wallet
      let successCount = 0;
      for (const strategy of strategies) {
        const sent = await this.sendToUser(strategy.userId, payload);
        if (sent) successCount++;
      }

      console.log(`[PushService] Wallet notification sent to ${successCount}/${strategies.length} users`);
      return successCount > 0;
    } catch (error) {
      console.error(`[PushService] Failed to send wallet notification:`, error);
      return false;
    }
  }

  // Get VAPID public key for frontend
  getVAPIDPublicKey() {
    return VAPID_PUBLIC_KEY;
  }

  // Get subscription statistics
  async getStats() {
    try {
      const total = await prisma.PushSubscription.count();
      const active = await prisma.PushSubscription.count({ where: { isActive: true } });
      const inactive = await prisma.PushSubscription.count({ where: { isActive: false } });

      return {
        total,
        active,
        inactive,
        activeRate: total > 0 ? (active / total * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('[PushService] Failed to get stats:', error);
      return { total: 0, active: 0, inactive: 0, activeRate: 0 };
    }
  }

  // Clean up old inactive subscriptions
  async cleanup() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await prisma.PushSubscription.deleteMany({
        where: {
          isActive: false,
          lastUsed: { lt: thirtyDaysAgo }
        }
      });

      console.log(`[PushService] Cleaned up ${result.count} old subscriptions`);
      return result.count;
    } catch (error) {
      console.error('[PushService] Failed to cleanup:', error);
      return 0;
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

module.exports = pushNotificationService;