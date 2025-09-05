const { PrismaClient } = require('@prisma/client');
const CopyTradingEngine = require('./src/core/copyTradingEngine');
const notificationService = require('./src/services/notificationService');
const analysisService = require('./src/services/analysisService');

const prisma = new PrismaClient();

async function testPerformance() {
  console.log('⚡ Performans Testi Başlıyor...\n');

  try {
    const results = {};

    // 1. Database performans testi
    console.log('1️⃣ Database Performans Testi...');
    
    // Bulk insert test
    const bulkStartTime = Date.now();
    const testUsers = [];
    
    for (let i = 0; i < 10; i++) {
      testUsers.push({
        email: `perf-test-${i}@zenith.com`,
        password: 'hashedpassword123',
        role: 'user'
      });
    }
    
    await prisma.user.createMany({
      data: testUsers,
      skipDuplicates: true
    });
    
    const bulkEndTime = Date.now();
    const bulkDuration = bulkEndTime - bulkStartTime;
    results.bulkInsert = bulkDuration;
    console.log(`✅ Bulk insert (10 kullanıcı): ${bulkDuration}ms`);

    // Query performans testi
    const queryStartTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await prisma.user.findMany({
        where: { role: 'user' },
        take: 10
      });
    }
    
    const queryEndTime = Date.now();
    const queryDuration = queryEndTime - queryStartTime;
    results.queryPerformance = queryDuration;
    console.log(`✅ Query performans (100 sorgu): ${queryDuration}ms`);

    // 2. Wallet analizi performans testi
    console.log('\n2️⃣ Wallet Analizi Performans Testi...');
    
    const testWallets = [
      '0xc82b2e484b161d20eae386877d57c4e5807b5581',
      '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      '0x28C6c06298d514Db089934071355E5743bf21d60',
      '0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549',
      '0xdfd5293d8e347dfe59e90efd55b2956a1343963d'
    ];

    const analysisStartTime = Date.now();
    let successCount = 0;
    
    for (const wallet of testWallets) {
      try {
        await analysisService.analyzeWallet(wallet);
        successCount++;
      } catch (error) {
        // Beklenen hatalar
      }
    }
    
    const analysisEndTime = Date.now();
    const analysisDuration = analysisEndTime - analysisStartTime;
    results.walletAnalysis = {
      duration: analysisDuration,
      successCount,
      totalCount: testWallets.length
    };
    console.log(`✅ Wallet analizi (${testWallets.length} wallet): ${analysisDuration}ms (${successCount}/${testWallets.length} başarılı)`);

    // 3. Copy Trading Engine performans testi
    console.log('\n3️⃣ Copy Trading Engine Performans Testi...');
    
    const engine = new CopyTradingEngine();
    const engineStartTime = Date.now();
    
    const engineStarted = await engine.start();
    
    if (engineStarted) {
      // 5 saniye bekle
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const engineEndTime = Date.now();
      const engineDuration = engineEndTime - engineStartTime;
      results.engineStartup = engineDuration;
      console.log(`✅ Engine başlatma: ${engineDuration}ms`);
      
      engine.stop();
    } else {
      results.engineStartup = 'FAILED';
      console.log('❌ Engine başlatma: Başarısız');
    }

    // 4. Bildirim sistemi performans testi
    console.log('\n4️⃣ Bildirim Sistemi Performans Testi...');
    
    const notificationStartTime = Date.now();
    
    // Test kullanıcısı bul
    const testUser = await prisma.user.findFirst({
      where: { email: 'perf-test-0@zenith.com' }
    });

    if (testUser) {
      // Subscription oluştur
      await prisma.userSubscription.upsert({
        where: { userId: testUser.id },
        update: {},
        create: {
          userId: testUser.id,
          endpoint: 'https://fcm.googleapis.com/fcm/send/perf-endpoint',
          p256dh: 'perf-p256dh-key-65-bytes-long-for-testing-purposes-only',
          auth: 'perf-auth-key'
        }
      });

      // 10 test bildirimi gönder
      let notificationSuccessCount = 0;
      for (let i = 0; i < 10; i++) {
        try {
          const result = await notificationService.sendNotification(testUser.id, {
            title: `Test Bildirimi ${i + 1}`,
            body: 'Performans test bildirimi',
            data: { test: true, index: i }
          });
          if (result) notificationSuccessCount++;
        } catch (error) {
          // Beklenen hatalar
        }
      }
      
      const notificationEndTime = Date.now();
      const notificationDuration = notificationEndTime - notificationStartTime;
      results.notificationSystem = {
        duration: notificationDuration,
        successCount: notificationSuccessCount,
        totalCount: 10
      };
      console.log(`✅ Bildirim sistemi (10 bildirim): ${notificationDuration}ms (${notificationSuccessCount}/10 başarılı)`);
    }

    // 5. Memory kullanımı testi
    console.log('\n5️⃣ Memory Kullanımı Testi...');
    
    const memoryUsage = process.memoryUsage();
    results.memoryUsage = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024) // MB
    };
    
    console.log(`✅ Memory kullanımı:`);
    console.log(`   RSS: ${results.memoryUsage.rss} MB`);
    console.log(`   Heap Used: ${results.memoryUsage.heapUsed} MB`);
    console.log(`   Heap Total: ${results.memoryUsage.heapTotal} MB`);
    console.log(`   External: ${results.memoryUsage.external} MB`);

    // 6. Concurrent işlem testi
    console.log('\n6️⃣ Concurrent İşlem Testi...');
    
    const concurrentStartTime = Date.now();
    
    // 5 eşzamanlı wallet analizi
    const concurrentPromises = testWallets.map(wallet => 
      analysisService.analyzeWallet(wallet).catch(() => null)
    );
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentSuccessCount = concurrentResults.filter(result => result !== null).length;
    
    const concurrentEndTime = Date.now();
    const concurrentDuration = concurrentEndTime - concurrentStartTime;
    results.concurrentOperations = {
      duration: concurrentDuration,
      successCount: concurrentSuccessCount,
      totalCount: testWallets.length
    };
    
    console.log(`✅ Concurrent işlemler (5 wallet): ${concurrentDuration}ms (${concurrentSuccessCount}/${testWallets.length} başarılı)`);

    // 7. Performans özeti
    console.log('\n7️⃣ Performans Özeti...');
    
    console.log('📊 Performans Sonuçları:');
    console.log(`   🗄️ Database bulk insert: ${results.bulkInsert}ms`);
    console.log(`   🔍 Database query (100x): ${results.queryPerformance}ms`);
    console.log(`   👛 Wallet analizi: ${results.walletAnalysis.duration}ms (${results.walletAnalysis.successCount}/${results.walletAnalysis.totalCount})`);
    console.log(`   ⚙️ Engine başlatma: ${results.engineStartup}ms`);
    console.log(`   🔔 Bildirim sistemi: ${results.notificationSystem.duration}ms (${results.notificationSystem.successCount}/${results.notificationSystem.totalCount})`);
    console.log(`   🔄 Concurrent işlemler: ${results.concurrentOperations.duration}ms (${results.concurrentOperations.successCount}/${results.concurrentOperations.totalCount})`);
    console.log(`   💾 Memory kullanımı: ${results.memoryUsage.heapUsed}MB`);

    // 8. Performans değerlendirmesi
    console.log('\n8️⃣ Performans Değerlendirmesi...');
    
    const performanceScore = {
      database: results.bulkInsert < 1000 && results.queryPerformance < 5000 ? '✅' : '⚠️',
      analysis: results.walletAnalysis.duration < 10000 ? '✅' : '⚠️',
      engine: results.engineStartup < 10000 ? '✅' : '⚠️',
      notifications: results.notificationSystem.duration < 5000 ? '✅' : '⚠️',
      concurrent: results.concurrentOperations.duration < 15000 ? '✅' : '⚠️',
      memory: results.memoryUsage.heapUsed < 100 ? '✅' : '⚠️'
    };

    console.log('📈 Performans Skorları:');
    Object.entries(performanceScore).forEach(([component, score]) => {
      console.log(`   ${score} ${component}`);
    });

    const goodPerformanceCount = Object.values(performanceScore).filter(score => score === '✅').length;
    const totalComponents = Object.keys(performanceScore).length;
    const performanceRate = (goodPerformanceCount / totalComponents) * 100;

    console.log(`\n📊 Genel Performans: ${performanceRate.toFixed(1)}% (${goodPerformanceCount}/${totalComponents})`);

    if (performanceRate >= 80) {
      console.log('🎉 Performans testi başarılı!');
    } else if (performanceRate >= 60) {
      console.log('⚠️ Performans testi kısmen başarılı. Bazı bileşenler optimize edilmeli.');
    } else {
      console.log('❌ Performans testi başarısız. Sistem optimizasyonu gerekli.');
    }

    console.log('\n⚡ Performans Testi Tamamlandı!');

  } catch (error) {
    console.error('❌ Performans test hatası:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPerformance();
