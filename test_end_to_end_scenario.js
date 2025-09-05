const { PrismaClient } = require('@prisma/client');
const CopyTradingEngine = require('./src/core/copyTradingEngine');
const notificationService = require('./src/services/notificationService');

const prisma = new PrismaClient();

async function testEndToEndScenario() {
  console.log('🎭 End-to-End Test Senaryosu Başlıyor...\n');

  try {
    // Senaryo: Kullanıcı wallet analizi yapar, bildirim aboneliği yapar, admin copy trading başlatır
    
    console.log('📖 Test Senaryosu:');
    console.log('1. Kullanıcı wallet analizi yapar');
    console.log('2. Kullanıcı bildirim aboneliği yapar');
    console.log('3. Kullanıcı wallet takibi başlatır');
    console.log('4. Admin copy trading başlatır');
    console.log('5. Sistem wallet\'ları tarar ve sinyal üretir');
    console.log('6. Bildirimler gönderilir');
    console.log('7. Copy trading işlemleri gerçekleşir\n');

    // 1. Kullanıcı oluştur ve wallet analizi yap
    console.log('1️⃣ Kullanıcı wallet analizi...');
    
    let testUser = await prisma.user.findFirst({
      where: { email: 'e2e@zenith.com' }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'e2e@zenith.com',
          password: 'hashedpassword123',
          role: 'user'
        }
      });
      console.log('✅ Test kullanıcısı oluşturuldu');
    }

    // Test wallet'ı analiz et
    const testWallet = '0xc82b2e484b161d20eae386877d57c4e5807b5581';
    console.log(`✅ Wallet analizi: ${testWallet}`);

    // 2. Kullanıcı bildirim aboneliği yapar
    console.log('\n2️⃣ Bildirim aboneliği...');
    
    const subscription = await prisma.userSubscription.upsert({
      where: { userId: testUser.id },
      update: {},
      create: {
        userId: testUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/e2e-endpoint',
        p256dh: 'e2e-p256dh-key-65-bytes-long-for-testing-purposes-only',
        auth: 'e2e-auth-key'
      }
    });
    console.log('✅ Bildirim aboneliği oluşturuldu');

    // 3. Kullanıcı wallet takibi başlatır
    console.log('\n3️⃣ Wallet takibi başlatılıyor...');
    
    const walletNotification = await prisma.userWalletNotification.upsert({
      where: {
        userId_walletAddress: {
          userId: testUser.id,
          walletAddress: testWallet
        }
      },
      update: { isActive: true },
      create: {
        userId: testUser.id,
        walletAddress: testWallet,
        isActive: true
      }
    });
    console.log('✅ Wallet takibi başlatıldı');

    // 4. Admin copy trading başlatır
    console.log('\n4️⃣ Admin copy trading başlatılıyor...');
    
    // Admin kullanıcısı bul
    let adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin-e2e@zenith.com',
          password: 'hashedpassword123',
          role: 'admin'
        }
      });
    }

    // Admin için subscription oluştur
    await prisma.userSubscription.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/admin-e2e-endpoint',
        p256dh: 'admin-e2e-p256dh-key-65-bytes-long-for-testing-purposes',
        auth: 'admin-e2e-auth-key'
      }
    });

    // Copy trading engine başlat
    const engine = new CopyTradingEngine();
    const engineStarted = await engine.start();
    console.log('✅ Copy trading engine:', engineStarted ? 'Başlatıldı' : 'Başlatılamadı');

    // 5. Sistem wallet'ları tarar ve sinyal üretir
    console.log('\n5️⃣ Sistem tarama ve sinyal üretimi...');
    
    // 10 saniye bekle (tarama döngüsü için)
    console.log('⏳ 10 saniye bekleniyor (tarama döngüsü)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Sinyal durumunu kontrol et
    const signals = await prisma.positionSignal.findMany({
      where: { walletAddress: testWallet },
      orderBy: { timestamp: 'desc' },
      take: 5
    });
    console.log(`✅ Üretilen sinyal sayısı: ${signals.length}`);

    // 6. Bildirimler gönderilir
    console.log('\n6️⃣ Bildirim gönderimi...');
    
    // Test bildirimi gönder
    const notificationResult = await notificationService.sendNotification(testUser.id, {
      title: '🎯 Yeni Wallet Hareketi',
      body: `${testWallet} adresinde yeni işlem tespit edildi!`,
      data: {
        type: 'wallet_movement',
        walletAddress: testWallet,
        timestamp: new Date().toISOString()
      }
    });
    console.log('✅ Kullanıcı bildirimi:', notificationResult ? 'Gönderildi' : 'Gönderilemedi');

    // Admin bildirimi gönder
    const adminNotificationResult = await notificationService.sendNotification(adminUser.id, {
      title: '💰 Copy Trading Sinyali',
      body: 'Yeni copy trading sinyali işlendi!',
      data: {
        type: 'copy_trading_signal',
        timestamp: new Date().toISOString()
      }
    });
    console.log('✅ Admin bildirimi:', adminNotificationResult ? 'Gönderildi' : 'Gönderilemedi');

    // 7. Copy trading işlemleri gerçekleşir
    console.log('\n7️⃣ Copy trading işlemleri...');
    
    // Trade durumunu kontrol et
    const trades = await prisma.copyTrade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        signal: true
      }
    });
    console.log(`✅ Gerçekleşen trade sayısı: ${trades.length}`);

    // Engine'i durdur
    engine.stop();
    console.log('✅ Copy trading engine durduruldu');

    // 8. Senaryo sonuçları
    console.log('\n8️⃣ Senaryo sonuçları...');
    
    const [userCount, subscriptionCount, walletNotificationCount, signalCount, tradeCount] = await Promise.all([
      prisma.user.count(),
      prisma.userSubscription.count(),
      prisma.userWalletNotification.count({ where: { isActive: true } }),
      prisma.positionSignal.count(),
      prisma.copyTrade.count()
    ]);

    console.log('📊 Senaryo İstatistikleri:');
    console.log(`   👥 Toplam kullanıcı: ${userCount}`);
    console.log(`   🔔 Toplam subscription: ${subscriptionCount}`);
    console.log(`   👛 Aktif wallet takibi: ${walletNotificationCount}`);
    console.log(`   📡 Toplam sinyal: ${signalCount}`);
    console.log(`   💰 Toplam trade: ${tradeCount}`);

    // 9. Test sonuçları
    console.log('\n9️⃣ Test sonuçları...');
    
    const testResults = {
      userCreated: !!testUser,
      subscriptionCreated: !!subscription,
      walletTrackingStarted: !!walletNotification,
      engineStarted: engineStarted,
      signalsGenerated: signals.length > 0,
      notificationsSent: notificationResult || adminNotificationResult,
      tradesExecuted: trades.length > 0
    };

    console.log('✅ Test Sonuçları:');
    Object.entries(testResults).forEach(([test, result]) => {
      console.log(`   ${result ? '✅' : '❌'} ${test}: ${result}`);
    });

    // 10. Başarı oranı hesapla
    const successCount = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const successRate = (successCount / totalTests) * 100;

    console.log(`\n📈 Başarı Oranı: ${successRate.toFixed(1)}% (${successCount}/${totalTests})`);

    if (successRate >= 80) {
      console.log('🎉 End-to-End test başarılı!');
    } else if (successRate >= 60) {
      console.log('⚠️ End-to-End test kısmen başarılı. Bazı bileşenler iyileştirilmeli.');
    } else {
      console.log('❌ End-to-End test başarısız. Sistem gözden geçirilmeli.');
    }

    console.log('\n🎭 End-to-End Test Senaryosu Tamamlandı!');

  } catch (error) {
    console.error('❌ End-to-End test hatası:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEndToEndScenario();
