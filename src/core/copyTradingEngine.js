const CopyTradingService = require('../services/copyTradingService');
const { PrismaClient } = require('@prisma/client');
const analysisService = require('../services/analysisService');
const notificationService = require('../services/notificationService');
const crypto = require('crypto');

class CopyTradingEngine {
  constructor() {
    this.prisma = new PrismaClient();
    this.copyTradingService = new CopyTradingService();
    this.isRunning = false;
    this.scanInterval = null;
    this.activeWallets = new Set();
  }

  // API key şifre çözme fonksiyonu
  decryptApiKey(encryptedText) {
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

  // Engine'i başlat
  async start() {
    try {
      // OKX config'i al
      const config = await this.prisma.copyTradingConfig.findFirst({
        where: { isActive: true }
      });

      if (!config) {
        throw new Error('Aktif OKX konfigürasyonu bulunamadı');
      }

      // API key'leri çöz
      const apiKey = this.decryptApiKey(config.okxApiKey);
      const secretKey = this.decryptApiKey(config.okxSecretKey);
      const passphrase = this.decryptApiKey(config.okxPassphrase);

      // Copy trading service'i başlat
      const initialized = await this.copyTradingService.initialize({
        apiKey: apiKey,
        secretKey: secretKey,
        passphrase: passphrase,
        demoMode: (process.env.OKX_DEMO_MODE === '1' || String(process.env.OKX_DEMO_MODE || '').toLowerCase() === 'true')
      });

      if (!initialized) {
        throw new Error('Copy trading service başlatılamadı');
      }

      // Aktif wallet'ları yükle
      await this.loadActiveWallets();

      // Tarama döngüsünü başlat
      this.isRunning = true;
      this.startScanning();

      console.log('✅ Copy Trading Engine başarıyla başlatıldı');
      return true;

    } catch (error) {
      console.error('❌ Copy Trading Engine başlatılamadı:', error.message);
      return false;
    }
  }

  // Engine'i durdur
  stop() {
    this.isRunning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log('🛑 Copy Trading Engine durduruldu');
  }

  // Aktif wallet'ları yükle
  async loadActiveWallets() {
    try {
      // Kullanıcı bildirim tercihlerinden aktif wallet'ları al
      const notifications = await this.prisma.userWalletNotification.findMany({
        where: { isActive: true },
        select: { walletAddress: true }
      });

      this.activeWallets.clear();
      notifications.forEach(n => this.activeWallets.add(n.walletAddress));

      console.log(`📊 ${this.activeWallets.size} aktif wallet yüklendi`);
    } catch (error) {
      console.error('❌ Aktif wallet\'lar yüklenemedi:', error.message);
    }
  }

  // Tarama döngüsünü başlat
  startScanning() {
    // Her 1 dakikada bir tara
    this.scanInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        console.log(`\n🔄 Wallet tarama başlatılıyor... (${new Date().toLocaleTimeString()})`);
        await this.scanAllWallets();
      } catch (error) {
        console.error('❌ Wallet tarama hatası:', error.message);
      }
    }, 60000); // 60 saniye

    // İlk taramayı hemen yap
    this.scanAllWallets();
  }

  // Tüm wallet'ları tara
  async scanAllWallets() {
    for (const walletAddress of this.activeWallets) {
      try {
        await this.scanWallet(walletAddress);
        // Rate limiting için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Wallet ${walletAddress} taranamadı:`, error.message);
      }
    }
  }

  // Tek bir wallet'ı tara
  async scanWallet(walletAddress) {
    try {
      console.log(`🔍 Wallet taranıyor: ${walletAddress}`);

      // Position ledger'ı analiz et
      const positionLedger = await analysisService.analyzeWallet(walletAddress);
      
      if (!positionLedger || !positionLedger.positions) {
        console.log(`⚠️ Wallet ${walletAddress} için position ledger bulunamadı`);
        return;
      }

      // Yeni pozisyonları tespit et
      const newSignals = await this.detectNewSignals(walletAddress, positionLedger);
      
             if (newSignals.length > 0) {
         console.log(`🎯 ${newSignals.length} yeni sinyal tespit edildi`);
         
         // Wallet hareketi bildirimleri gönder
         for (const signal of newSignals) {
           await notificationService.sendWalletMovementNotification(walletAddress, {
             type: signal.signalType,
             token: signal.token,
             percentage: signal.percentage,
             amount: signal.amount,
             units: signal.units,
             price: signal.price,
             timestamp: signal.timestamp
           });
         }
         
         await this.processSignals(newSignals);
       } else {
         console.log(`✅ Wallet ${walletAddress} - yeni sinyal yok`);
       }

    } catch (error) {
      console.error(`❌ Wallet ${walletAddress} analiz hatası:`, error.message);
    }
  }

  // Yeni sinyalleri tespit et
  async detectNewSignals(walletAddress, positionLedger) {
    const newSignals = [];

    try {
      // Son işlenen sinyal zamanını al
      const lastProcessedSignal = await this.prisma.positionSignal.findFirst({
        where: { walletAddress },
        orderBy: { timestamp: 'desc' }
      });

      const lastProcessedTime = lastProcessedSignal?.timestamp || new Date(0);

      // Position ledger'daki pozisyonları kontrol et
      for (const position of positionLedger.positions) {
        // Sadece yeni pozisyonları işle
        if (new Date(position.timestamp) > lastProcessedTime) {
          
          // Pozisyon yüzdesini hesapla
          const percentage = (position.value / positionLedger.totalValue) * 100;
          
          // Minimum %1 pozisyon kontrolü
          if (percentage >= 1.0) {
            const signal = {
              walletAddress,
              signalType: position.type === 'BUY' ? 'BUY' : 'SELL',
              token: position.token,
              amount: position.value,
              percentage: percentage,
              price: position.price,
              timestamp: new Date(position.timestamp),
              leverage: position.type === 'BUY' ? 3 : 1 // LONG: 3x, SHORT: 1x
            };

            newSignals.push(signal);
          }
        }
      }

    } catch (error) {
      console.error('❌ Sinyal tespit hatası:', error.message);
    }

    return newSignals;
  }

  // Sinyalleri işle
  async processSignals(signals) {
    try {
      // OKX bakiyesini al
      const okxBalance = await this.copyTradingService.getOKXBalance();
      
      if (okxBalance <= 0) {
        console.error('❌ OKX bakiyesi yetersiz');
        return;
      }

      for (const signal of signals) {
        try {
          console.log(`\n🚀 Sinyal işleniyor: ${signal.signalType} ${signal.token}`);
          
          // Sinyali database'e kaydet
          const savedSignal = await this.prisma.positionSignal.create({
            data: {
              walletAddress: signal.walletAddress,
              signalType: signal.signalType,
              token: signal.token,
              amount: signal.amount,
              percentage: signal.percentage,
              price: signal.price,
              timestamp: signal.timestamp,
              processed: false
            }
          });

          // Copy trading işlemini gerçekleştir
          const result = await this.copyTradingService.processPositionSignal(signal, okxBalance);

          // Sonucu database'e kaydet
          const firstOrderId = Array.isArray(result?.okxOrderIds) && result.okxOrderIds.length > 0 ? result.okxOrderIds[0] : null;
          await this.prisma.copyTrade.create({
            data: {
              signalId: savedSignal.id,
              okxOrderId: firstOrderId,
              status: result.success ? 'SUCCESS' : 'FAILED',
              executedAt: result.success ? new Date() : null,
              metadata: result || {}
            }
          });

          // Sinyali işlenmiş olarak işaretle
          await this.prisma.positionSignal.update({
            where: { id: savedSignal.id },
            data: { processed: true }
          });

                     if (result.success) {
             console.log(`✅ Sinyal başarıyla işlendi: ${result.orderId}`);
             
             // Copy trading bildirimi gönder
             await notificationService.sendCopyTradingNotification(signal, result);
           } else {
             console.log(`❌ Sinyal işlenemedi: ${result.error}`);
             
             // Hata bildirimi gönder
             await notificationService.sendCopyTradingNotification(signal, result);
           }

        } catch (error) {
          console.error(`❌ Sinyal işleme hatası:`, error.message);
        }
      }

    } catch (error) {
      console.error('❌ Sinyal işleme genel hatası:', error.message);
    }
  }

  // Engine durumunu al
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeWalletCount: this.activeWallets.size,
      copyTradingStatus: this.copyTradingService.getStatus(),
      lastScanTime: new Date().toISOString()
    };
  }
}

module.exports = CopyTradingEngine;
