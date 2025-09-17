const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class NotificationService {
  constructor() {
    // VAPID keys'i environment'tan al
    this.vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };

    // Web-push'i yapılandır
    webpush.setVapidDetails(
      'mailto:admin@zenith-trader.com',
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey
    );
  }

  // Kullanıcı subscription'ını kaydet
  async saveSubscription(userId, subscription) {
    try {
      // Mevcut subscription'ı kontrol et
      const existing = await prisma.userSubscription.findFirst({
        where: { userId }
      });

      if (existing) {
        // Mevcut subscription'ı güncelle
        await prisma.userSubscription.update({
          where: { id: existing.id },
          data: {
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            updatedAt: new Date()
          }
        });
      } else {
        // Yeni subscription oluştur
        await prisma.userSubscription.create({
          data: {
            userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          }
        });
      }

      console.log(`✅ Subscription kaydedildi: User ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Subscription kaydetme hatası:', error.message);
      return false;
    }
  }

  // Bildirim gönder
  async sendNotification(userId, notification) {
    try {
      // Kullanıcının subscription'ını al
      const subscription = await prisma.userSubscription.findFirst({
        where: { userId }
      });

      if (!subscription) {
        console.log(`⚠️ User ${userId} için subscription bulunamadı`);
        return false;
      }

      // Push subscription objesi oluştur
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      // Bildirim payload'ı
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: notification.data || {},
        actions: notification.actions || [],
        requireInteraction: notification.requireInteraction || false
      });

      // Bildirimi gönder
      const result = await webpush.sendNotification(pushSubscription, payload);
      
      console.log(`✅ Bildirim gönderildi: User ${userId} - ${notification.title}`);
      return true;

    } catch (error) {
      console.error(`❌ Bildirim gönderme hatası (User ${userId}):`, error.message);
      
      // Subscription geçersizse sil
      if (error.statusCode === 410) {
        await this.removeSubscription(userId);
        console.log(`🗑️ Geçersiz subscription silindi: User ${userId}`);
      }
      
      return false;
    }
  }

  // Toplu bildirim gönder
  async sendBulkNotification(userIds, notification) {
    const results = [];
    
    for (const userId of userIds) {
      const success = await this.sendNotification(userId, notification);
      results.push({ userId, success });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`📊 Toplu bildirim sonucu: ${successCount}/${userIds.length} başarılı`);
    
    return results;
  }

  // Wallet hareketi bildirimi gönder
  async sendWalletMovementNotification(walletAddress, movement) {
    try {
      const formatter = require('./notificationFormatter');

      // Enrich movement with walletAddress for formatting
      const enriched = {
        walletAddress,
        type: movement.type,
        direction: movement.type,
        token: movement.token,
        amountUsd: movement.amount ?? movement.amountUsd,
        percentage: typeof movement.percentage === 'number' ? movement.percentage : undefined,
        units: movement.units,
        priceUsd: movement.price ?? movement.priceUsd,
        fromToken: movement.fromToken,
        toToken: movement.toToken,
        timestamp: movement.timestamp
      };

      const { title, body } = formatter.formatWalletMovement(enriched);

      // Find users following this wallet
      const notifications = await prisma.userWalletNotification.findMany({
        where: { 
          walletAddress,
          isActive: true 
        },
        include: {
          user: {
            include: {
              subscription: true
            }
          }
        }
      });

      if (notifications.length === 0) {
        return { sent: 0, total: 0 };
      }

      const userIds = notifications.map(n => n.userId);

      // Build notification payload
      const notification = {
        title,
        body,
        data: {
          type: 'wallet_movement',
          walletAddress,
          movement: enriched
        },
        requireInteraction: false,
        actions: [
          {
            action: 'view_details',
            title: 'View details'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };

      // Send
      const results = await this.sendBulkNotification(userIds, notification);

      return {
        sent: results.filter(r => r.success).length,
        total: userIds.length
      };

    } catch (error) {
      console.error('❌ Wallet movement notification error:', error.message);
      return { sent: 0, total: 0 };
    }
  }

  // Trade bildirimi gönder
  async sendTradeNotification(userId, strategyName, tradeData, action) {
    try {
      // Kullanıcının subscription'ını kontrol et
      const hasSubscription = await this.hasSubscription(userId);
      if (!hasSubscription) {
        console.log(`⚠️ User ${userId} için subscription bulunamadı`);
        return false;
      }

      // Bildirim içeriği
      const notification = {
        title: `📈 ${strategyName}: ${tradeData.type === 'BUY' ? 'Alış' : 'Satış'}`,
        body: `${tradeData.token} - ${tradeData.amount} kontrat @ $${tradeData.price}`,
        data: {
          type: 'trade_execution',
          strategy: strategyName,
          trade: {
            token: tradeData.token,
            amount: tradeData.amount,
            price: tradeData.price,
            type: tradeData.type,
            action: action,
            orderId: tradeData.id,
            timestamp: new Date().toISOString()
          }
        },
        requireInteraction: false,
        actions: [
          {
            action: 'view_trade',
            title: 'İşlemi Gör'
          },
          {
            action: 'dismiss',
            title: 'Kapat'
          }
        ]
      };

      const success = await this.sendNotification(userId, notification);
      if (success) {
        console.log(`✅ Trade bildirimi gönderildi: User ${userId} - ${tradeData.token} ${tradeData.type}`);
      }
      return success;

    } catch (error) {
      console.error(`❌ Trade bildirimi hatası (User ${userId}):`, error.message);
      return false;
    }
  }

  // Copy trading bildirimi gönder
  async sendCopyTradingNotification(signal, tradeResult) {
    try {
      // Admin kullanıcısını bul
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' },
        include: { subscription: true }
      });

      if (!adminUser || !adminUser.subscription) {
        console.log('⚠️ Admin kullanıcısı veya subscription bulunamadı');
        return false;
      }

      // Bildirim içeriği
      const notification = {
        title: `📈 Copy Trading: ${tradeResult.success ? 'Başarılı' : 'Başarısız'}`,
        body: `${signal.token} ${signal.type} - ${signal.percentage}% pozisyon ${tradeResult.success ? 'açıldı' : 'açılamadı'}`,
        data: {
          type: 'copy_trading',
          signal: {
            token: signal.token,
            type: signal.type,
            percentage: signal.percentage,
            leverage: signal.leverage
          },
          trade: {
            success: tradeResult.success,
            orderId: tradeResult.orderId,
            positionSize: tradeResult.positionSize,
            error: tradeResult.error
          }
        },
        requireInteraction: false
      };

      const success = await this.sendNotification(adminUser.id, notification);
      return success;

    } catch (error) {
      console.error('❌ Copy trading bildirimi hatası:', error.message);
      return false;
    }
  }

  // Subscription'ı kaldır
  async removeSubscription(userId) {
    try {
      await prisma.userSubscription.deleteMany({
        where: { userId }
      });
      console.log(`🗑️ Subscription kaldırıldı: User ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Subscription kaldırma hatası:', error.message);
      return false;
    }
  }

  // Kullanıcının subscription durumunu kontrol et
  async hasSubscription(userId) {
    try {
      const subscription = await prisma.userSubscription.findFirst({
        where: { userId }
      });
      return !!subscription;
    } catch (error) {
      console.error('❌ Subscription kontrol hatası:', error.message);
      return false;
    }
  }

  // VAPID public key'i al
  getVapidPublicKey() {
    return this.vapidKeys.publicKey;
  }
}

module.exports = new NotificationService();
