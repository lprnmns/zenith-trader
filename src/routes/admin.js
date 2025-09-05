const express = require('express');
const { PrismaClient } = require('@prisma/client');
const CopyTradingEngine = require('../core/copyTradingEngine');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Global copy trading engine instance
let copyTradingEngine = null;

// Admin middleware - sadece admin kullanıcılar erişebilir
const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Yetki kontrolü hatası' });
  }
};

// API key şifreleme fonksiyonu
function encryptApiKey(text) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!', 'utf8');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// API key şifre çözme fonksiyonu
function decryptApiKey(encryptedText) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!', 'salt', 32);
  
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encrypted = textParts.join(':');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Tüm admin endpoint'leri için middleware uygula
router.use(adminMiddleware);

// OKX ayarlarını kaydet
router.post('/copy-trading/config', async (req, res) => {
  try {
    const { okxApiKey, okxSecretKey, okxPassphrase } = req.body;

    if (!okxApiKey || !okxSecretKey || !okxPassphrase) {
      return res.status(400).json({ error: 'Tüm OKX bilgileri gerekli' });
    }

    // Mevcut config'i kontrol et
    const existingConfig = await prisma.copyTradingConfig.findFirst();

    if (existingConfig) {
      // Mevcut config'i güncelle
      await prisma.copyTradingConfig.update({
        where: { id: existingConfig.id },
        data: {
          okxApiKey: encryptApiKey(okxApiKey),
          okxSecretKey: encryptApiKey(okxSecretKey),
          okxPassphrase: encryptApiKey(okxPassphrase),
          updatedAt: new Date()
        }
      });
    } else {
      // Yeni config oluştur
      await prisma.copyTradingConfig.create({
        data: {
          okxApiKey: encryptApiKey(okxApiKey),
          okxSecretKey: encryptApiKey(okxSecretKey),
          okxPassphrase: encryptApiKey(okxPassphrase)
        }
      });
    }

    res.json({ success: true, message: 'OKX ayarları başarıyla kaydedildi' });

  } catch (error) {
    console.error('OKX config kaydetme hatası:', error);
    res.status(500).json({ error: 'Ayarlar kaydedilemedi' });
  }
});

// Copy trading durumunu al
router.get('/copy-trading/status', async (req, res) => {
  try {
    const config = await prisma.copyTradingConfig.findFirst();
    
    let engineStatus = null;
    if (copyTradingEngine) {
      engineStatus = copyTradingEngine.getStatus();
    }

    res.json({
      hasConfig: !!config,
      isActive: config?.isActive || false,
      engineStatus: engineStatus
    });

  } catch (error) {
    console.error('Status alma hatası:', error);
    res.status(500).json({ error: 'Durum bilgisi alınamadı' });
  }
});

// Copy trading başlat
router.post('/copy-trading/start', async (req, res) => {
  try {
    const config = await prisma.copyTradingConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return res.status(400).json({ error: 'Aktif OKX konfigürasyonu bulunamadı' });
    }

    // Engine'i başlat
    if (!copyTradingEngine) {
      copyTradingEngine = new CopyTradingEngine();
    }

    const started = await copyTradingEngine.start();
    
    if (started) {
      res.json({ success: true, message: 'Copy trading başlatıldı' });
    } else {
      res.status(500).json({ error: 'Copy trading başlatılamadı' });
    }

  } catch (error) {
    console.error('Copy trading başlatma hatası:', error);
    res.status(500).json({ error: 'Copy trading başlatılamadı' });
  }
});

// Copy trading durdur
router.post('/copy-trading/stop', async (req, res) => {
  try {
    if (copyTradingEngine) {
      copyTradingEngine.stop();
      copyTradingEngine = null;
    }

    res.json({ success: true, message: 'Copy trading durduruldu' });

  } catch (error) {
    console.error('Copy trading durdurma hatası:', error);
    res.status(500).json({ error: 'Copy trading durdurulamadı' });
  }
});

// İşlem geçmişini al
router.get('/copy-trading/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [signals, total] = await Promise.all([
      prisma.positionSignal.findMany({
        include: {
          copyTrades: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.positionSignal.count()
    ]);

    res.json({
      signals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('İşlem geçmişi alma hatası:', error);
    res.status(500).json({ error: 'İşlem geçmişi alınamadı' });
  }
});

// Aktif wallet listesini al
router.get('/copy-trading/wallets', async (req, res) => {
  try {
    const wallets = await prisma.userWalletNotification.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ wallets });

  } catch (error) {
    console.error('Wallet listesi alma hatası:', error);
    res.status(500).json({ error: 'Wallet listesi alınamadı' });
  }
});

// Sistem istatistiklerini al
router.get('/copy-trading/stats', async (req, res) => {
  try {
    const [totalSignals, successTrades, failedTrades, activeWallets] = await Promise.all([
      prisma.positionSignal.count(),
      prisma.copyTrade.count({ where: { status: 'SUCCESS' } }),
      prisma.copyTrade.count({ where: { status: 'FAILED' } }),
      prisma.userWalletNotification.count({ where: { isActive: true } })
    ]);

    res.json({
      totalSignals,
      successTrades,
      failedTrades,
      activeWallets,
      successRate: totalSignals > 0 ? (successTrades / totalSignals * 100).toFixed(2) : 0
    });

  } catch (error) {
    console.error('İstatistik alma hatası:', error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

module.exports = router;
