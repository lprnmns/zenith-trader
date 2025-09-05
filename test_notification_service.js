const notificationService = require('./src/services/notificationService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationService() {
  console.log('🧪 Notification Service Test Başlıyor...\n');

  try {
    // 1. VAPID key kontrolü
    console.log('1️⃣ VAPID Public Key kontrol ediliyor...');
    const publicKey = notificationService.getVapidPublicKey();
    console.log('✅ VAPID Public Key:', publicKey ? 'Mevcut' : 'Eksik');

    // 2. Test kullanıcısı oluştur
    console.log('\n2️⃣ Test kullanıcısı kontrol ediliyor...');
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@zenith.com' }
    });

    if (!testUser) {
      console.log('📝 Test kullanıcısı oluşturuluyor...');
      testUser = await prisma.user.create({
        data: {
          email: 'test@zenith.com',
          password: 'hashedpassword123',
          role: 'user'
        }
      });
      console.log('✅ Test kullanıcısı oluşturuldu');
    } else {
      console.log('✅ Test kullanıcısı zaten mevcut');
    }

    // 3. Mock subscription oluştur
    console.log('\n3️⃣ Mock subscription oluşturuluyor...');
    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/mock-endpoint',
      keys: {
        p256dh: 'mock-p256dh-key',
        auth: 'mock-auth-key'
      }
    };

    const subscriptionSaved = await notificationService.saveSubscription(testUser.id, mockSubscription);
    console.log(`✅ Subscription kaydedildi: ${subscriptionSaved}`);

    // 4. Subscription durumu kontrol et
    console.log('\n4️⃣ Subscription durumu kontrol ediliyor...');
    const hasSubscription = await notificationService.hasSubscription(testUser.id);
    console.log(`✅ Subscription durumu: ${hasSubscription}`);

    // 5. Test bildirimi gönder
    console.log('\n5️⃣ Test bildirimi gönderiliyor...');
    const testNotification = {
      title: '🧪 Test Bildirimi',
      body: 'Bu bir test bildirimidir. Bildirim sistemi çalışıyor!',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      requireInteraction: false
    };

    const notificationSent = await notificationService.sendNotification(testUser.id, testNotification);
    console.log(`✅ Test bildirimi gönderildi: ${notificationSent}`);

    // 6. Wallet bildirimi test et
    console.log('\n6️⃣ Wallet bildirimi test ediliyor...');
    const testWalletAddress = '0xc82b2e484b161d20eae386877d57c4e5807b5581';
    
    // Test wallet'ını bildirim listesine ekle
    await prisma.userWalletNotification.upsert({
      where: {
        userId_walletAddress: {
          userId: testUser.id,
          walletAddress: testWalletAddress
        }
      },
      update: { isActive: true },
      create: {
        userId: testUser.id,
        walletAddress: testWalletAddress,
        isActive: true
      }
    });

    const mockMovement = {
      type: 'BUY',
      token: 'ETH',
      percentage: 7.46,
      amount: 6018.21,
      timestamp: new Date()
    };

    const walletNotificationResult = await notificationService.sendWalletMovementNotification(
      testWalletAddress, 
      mockMovement
    );

    console.log(`✅ Wallet bildirimi sonucu: ${walletNotificationResult.sent}/${walletNotificationResult.total} gönderildi`);

    // 7. Copy trading bildirimi test et
    console.log('\n7️⃣ Copy trading bildirimi test ediliyor...');
    const mockSignal = {
      token: 'BTC',
      type: 'BUY',
      percentage: 10.5,
      leverage: 3
    };

    const mockTradeResult = {
      success: true,
      orderId: 'test-order-123',
      positionSize: 5000.00
    };

    const copyTradingNotificationSent = await notificationService.sendCopyTradingNotification(
      mockSignal, 
      mockTradeResult
    );

    console.log(`✅ Copy trading bildirimi gönderildi: ${copyTradingNotificationSent}`);

    // 8. Sistem durumu özeti
    console.log('\n8️⃣ Sistem durumu özeti...');
    const [subscriptionCount, walletNotificationCount] = await Promise.all([
      prisma.userSubscription.count(),
      prisma.userWalletNotification.count({ where: { isActive: true } })
    ]);

    console.log(`📊 Toplam subscription: ${subscriptionCount}`);
    console.log(`📊 Aktif wallet bildirimi: ${walletNotificationCount}`);

    console.log('\n🎉 Notification Service test tamamlandı!');

  } catch (error) {
    console.error('❌ Notification service test hatası:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationService();
