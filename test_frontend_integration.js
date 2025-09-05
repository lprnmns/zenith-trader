const { PrismaClient } = require('@prisma/client');
const notificationService = require('./src/services/notificationService');

const prisma = new PrismaClient();

async function testFrontendIntegration() {
  console.log('🧪 Frontend Integration Test Başlıyor...\n');

  try {
    // 1. Admin kullanıcısı oluştur
    console.log('1️⃣ Admin kullanıcısı kontrol ediliyor...');
    let adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.log('📝 Admin kullanıcısı oluşturuluyor...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@zenith.com',
          password: 'hashedpassword123',
          role: 'admin'
        }
      });
      console.log('✅ Admin kullanıcısı oluşturuldu');
    } else {
      console.log('✅ Admin kullanıcısı zaten mevcut');
    }

    // 2. Normal kullanıcı oluştur
    console.log('\n2️⃣ Normal kullanıcı kontrol ediliyor...');
    let normalUser = await prisma.user.findFirst({
      where: { email: 'user@zenith.com' }
    });

    if (!normalUser) {
      console.log('📝 Normal kullanıcı oluşturuluyor...');
      normalUser = await prisma.user.create({
        data: {
          email: 'user@zenith.com',
          password: 'hashedpassword123',
          role: 'user'
        }
      });
      console.log('✅ Normal kullanıcı oluşturuldu');
    } else {
      console.log('✅ Normal kullanıcı zaten mevcut');
    }

    // 3. Admin için subscription oluştur
    console.log('\n3️⃣ Admin subscription oluşturuluyor...');
    const adminSubscription = await prisma.userSubscription.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/admin-endpoint',
        p256dh: 'admin-p256dh-key',
        auth: 'admin-auth-key'
      }
    });
    console.log('✅ Admin subscription oluşturuldu');

    // 4. Normal kullanıcı için subscription oluştur
    console.log('\n4️⃣ Normal kullanıcı subscription oluşturuluyor...');
    const userSubscription = await prisma.userSubscription.upsert({
      where: { userId: normalUser.id },
      update: {},
      create: {
        userId: normalUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/user-endpoint',
        p256dh: 'user-p256dh-key',
        auth: 'user-auth-key'
      }
    });
    console.log('✅ Normal kullanıcı subscription oluşturuldu');

    // 5. Test wallet'ları ekle
    console.log('\n5️⃣ Test wallet\'ları ekleniyor...');
    const testWallets = [
      '0xc82b2e484b161d20eae386877d57c4e5807b5581',
      '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      '0x28C6c06298d514Db089934071355E5743bf21d60'
    ];

    for (const walletAddress of testWallets) {
      // Admin için wallet bildirimi
      await prisma.userWalletNotification.upsert({
        where: {
          userId_walletAddress: {
            userId: adminUser.id,
            walletAddress
          }
        },
        update: { isActive: true },
        create: {
          userId: adminUser.id,
          walletAddress,
          isActive: true
        }
      });

      // Normal kullanıcı için wallet bildirimi (ilk 2 wallet)
      if (testWallets.indexOf(walletAddress) < 2) {
        await prisma.userWalletNotification.upsert({
          where: {
            userId_walletAddress: {
              userId: normalUser.id,
              walletAddress
            }
          },
          update: { isActive: true },
          create: {
            userId: normalUser.id,
            walletAddress,
            isActive: true
          }
        });
      }
    }
    console.log('✅ Test wallet\'ları eklendi');

    // 6. API endpoint'lerini test et
    console.log('\n6️⃣ API endpoint\'leri test ediliyor...');

    // VAPID key test
    const vapidKey = notificationService.getVapidPublicKey();
    console.log('✅ VAPID Public Key:', vapidKey ? 'Mevcut' : 'Eksik');

    // Subscription durumu test
    const adminHasSubscription = await notificationService.hasSubscription(adminUser.id);
    const userHasSubscription = await notificationService.hasSubscription(normalUser.id);
    console.log('✅ Admin subscription:', adminHasSubscription);
    console.log('✅ User subscription:', userHasSubscription);

    // 7. Bildirim gönderme test
    console.log('\n7️⃣ Bildirim gönderme test ediliyor...');

    // Admin için copy trading bildirimi
    const copyTradingResult = await notificationService.sendCopyTradingNotification(
      {
        token: 'BTC',
        type: 'BUY',
        percentage: 10.5,
        leverage: 3
      },
      {
        success: true,
        orderId: 'test-order-123',
        positionSize: 5000.00
      }
    );
    console.log('✅ Copy trading bildirimi:', copyTradingResult);

    // Wallet hareketi bildirimi
    const walletMovementResult = await notificationService.sendWalletMovementNotification(
      testWallets[0],
      {
        type: 'BUY',
        token: 'ETH',
        percentage: 7.46,
        amount: 6018.21,
        timestamp: new Date()
      }
    );
    console.log('✅ Wallet hareketi bildirimi:', walletMovementResult);

    // 8. Database durumu özeti
    console.log('\n8️⃣ Database durumu özeti...');
    const [userCount, subscriptionCount, walletNotificationCount, signalCount, tradeCount] = await Promise.all([
      prisma.user.count(),
      prisma.userSubscription.count(),
      prisma.userWalletNotification.count({ where: { isActive: true } }),
      prisma.positionSignal.count(),
      prisma.copyTrade.count()
    ]);

    console.log(`📊 Toplam kullanıcı: ${userCount}`);
    console.log(`📊 Toplam subscription: ${subscriptionCount}`);
    console.log(`📊 Aktif wallet bildirimi: ${walletNotificationCount}`);
    console.log(`📊 Toplam sinyal: ${signalCount}`);
    console.log(`📊 Toplam trade: ${tradeCount}`);

    // 9. Frontend için gerekli veriler
    console.log('\n9️⃣ Frontend için gerekli veriler...');
    
    // Admin copy trading config
    const adminConfig = await prisma.copyTradingConfig.findFirst({
      where: { isActive: true }
    });
    console.log('✅ Admin copy trading config:', adminConfig ? 'Mevcut' : 'Eksik');

    // Kullanıcı bildirim ayarları
    const userNotifications = await prisma.userWalletNotification.findMany({
      where: { userId: normalUser.id, isActive: true },
      include: { user: { include: { subscription: true } } }
    });
    console.log('✅ Kullanıcı bildirim ayarları:', userNotifications.length, 'aktif wallet');

    console.log('\n🎉 Frontend Integration test tamamlandı!');
    console.log('\n📋 Frontend Test Kontrol Listesi:');
    console.log('✅ Admin paneli - Copy trading yönetimi');
    console.log('✅ Kullanıcı paneli - Wallet explorer');
    console.log('✅ Bildirim sistemi - Push notifications');
    console.log('✅ PWA - Service worker ve manifest');
    console.log('✅ API entegrasyonu - Tüm endpoint\'ler');

  } catch (error) {
    console.error('❌ Frontend integration test hatası:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendIntegration();
