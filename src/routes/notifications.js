const express = require('express');
const notificationService = require('../services/notificationService');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// VAPID public key'i al
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = notificationService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('VAPID key alma hatası:', error);
    res.status(500).json({ error: 'VAPID key alınamadı' });
  }
});

// Push notification subscription'ı kaydet
router.post('/subscribe', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Giriş yapılması gerekli' });
    }

    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Geçersiz subscription verisi' });
    }

    const success = await notificationService.saveSubscription(req.user.id, subscription);

    if (success) {
      res.json({ success: true, message: 'Bildirim aboneliği başarıyla kaydedildi' });
    } else {
      res.status(500).json({ error: 'Bildirim aboneliği kaydedilemedi' });
    }

  } catch (error) {
    console.error('Subscription kaydetme hatası:', error);
    res.status(500).json({ error: 'Bildirim aboneliği kaydedilemedi' });
  }
});

// Push notification subscription'ı kaldır
router.post('/unsubscribe', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Giriş yapılması gerekli' });
    }

    const success = await notificationService.removeSubscription(req.user.id);

    if (success) {
      res.json({ success: true, message: 'Bildirim aboneliği kaldırıldı' });
    } else {
      res.status(500).json({ error: 'Bildirim aboneliği kaldırılamadı' });
    }

  } catch (error) {
    console.error('Subscription kaldırma hatası:', error);
    res.status(500).json({ error: 'Bildirim aboneliği kaldırılamadı' });
  }
});

// Subscription durumunu kontrol et
router.get('/subscription-status', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Giriş yapılması gerekli' });
    }

    const hasSubscription = await notificationService.hasSubscription(req.user.id);
    res.json({ hasSubscription });

  } catch (error) {
    console.error('Subscription durum kontrolü hatası:', error);
    res.status(500).json({ error: 'Subscription durumu kontrol edilemedi' });
  }
});

// Kullanıcının bildirim ayarlarını al
router.get('/settings', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Giriş yapılması gerekli' });
    }

    const [hasSubscription, walletNotifications] = await Promise.all([
      notificationService.hasSubscription(req.user.id),
      prisma.userWalletNotification.findMany({
        where: { userId: req.user.id, isActive: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      hasSubscription,
      walletNotifications: walletNotifications.map(n => ({
        id: n.id,
        walletAddress: n.walletAddress,
        isActive: n.isActive,
        createdAt: n.createdAt
      }))
    });

  } catch (error) {
    console.error('Bildirim ayarları alma hatası:', error);
    res.status(500).json({ error: 'Bildirim ayarları alınamadı' });
  }
});

// Wallet bildirimi ekle/kaldır
router.post('/wallet/:action', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Giriş yapılması gerekli' });
    }

    const { action } = req.params;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet adresi gerekli' });
    }

    if (action === 'add') {
      // Wallet bildirimi ekle
      const existing = await prisma.userWalletNotification.findFirst({
        where: { userId: req.user.id, walletAddress }
      });

      if (existing) {
        // Mevcut bildirimi aktif et
        await prisma.userWalletNotification.update({
          where: { id: existing.id },
          data: { isActive: true }
        });
      } else {
        // Yeni bildirim oluştur
        await prisma.userWalletNotification.create({
          data: {
            userId: req.user.id,
            walletAddress,
            isActive: true
          }
        });
      }

      res.json({ success: true, message: 'Wallet bildirimi eklendi' });

    } else if (action === 'remove') {
      // Wallet bildirimi kaldır
      await prisma.userWalletNotification.updateMany({
        where: { userId: req.user.id, walletAddress },
        data: { isActive: false }
      });

      res.json({ success: true, message: 'Wallet bildirimi kaldırıldı' });

    } else {
      res.status(400).json({ error: 'Geçersiz işlem' });
    }

  } catch (error) {
    console.error('Wallet bildirimi işlemi hatası:', error);
    res.status(500).json({ error: 'Wallet bildirimi işlemi başarısız' });
  }
});

module.exports = router;
