const CopyTradingEngine = require('./src/core/copyTradingEngine');

async function testCopyTradingEngine() {
  console.log('🧪 Copy Trading Engine Detaylı Test Başlıyor...\n');

  const engine = new CopyTradingEngine();

  try {
    // 1. Engine'i başlat
    console.log('1️⃣ Copy Trading Engine başlatılıyor...');
    const started = await engine.start();
    
    if (!started) {
      throw new Error('Engine başlatılamadı');
    }
    console.log('✅ Engine başarıyla başlatıldı');

    // 2. Durum kontrolü
    console.log('\n2️⃣ Engine durumu kontrol ediliyor...');
    const status = engine.getStatus();
    console.log('Engine Durumu:', JSON.stringify(status, null, 2));

    // 3. Aktif wallet'ları kontrol et
    console.log('\n3️⃣ Aktif wallet\'lar kontrol ediliyor...');
    console.log(`Aktif wallet sayısı: ${status.activeWalletCount}`);
    
    if (status.activeWalletCount > 0) {
      console.log('✅ Aktif wallet\'lar bulundu');
    } else {
      console.log('⚠️ Aktif wallet bulunamadı');
    }

    // 4. Copy trading service durumu
    console.log('\n4️⃣ Copy Trading Service durumu...');
    const serviceStatus = status.copyTradingStatus;
    console.log('Service Durumu:', JSON.stringify(serviceStatus, null, 2));

    // 5. 30 saniye bekle ve tekrar kontrol et
    console.log('\n5️⃣ 30 saniye bekleniyor (ilk tarama için)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 6. Güncel durumu kontrol et
    console.log('\n6️⃣ Güncel durum kontrol ediliyor...');
    const updatedStatus = engine.getStatus();
    console.log('Güncel Durum:', JSON.stringify(updatedStatus, null, 2));

    // 7. Database'de sinyal var mı kontrol et
    console.log('\n7️⃣ Database\'de sinyal kontrol ediliyor...');
    const signals = await engine.prisma.positionSignal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`Son 5 sinyal sayısı: ${signals.length}`);
    if (signals.length > 0) {
      console.log('Son sinyaller:');
      signals.forEach((signal, index) => {
        console.log(`   ${index + 1}. ${signal.signalType} ${signal.token} - ${signal.percentage}% - ${signal.createdAt}`);
      });
    }

    // 8. Copy trade'leri kontrol et
    console.log('\n8️⃣ Copy trade\'ler kontrol ediliyor...');
    const trades = await engine.prisma.copyTrade.findMany({
      include: {
        signal: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log(`Son 5 copy trade sayısı: ${trades.length}`);
    if (trades.length > 0) {
      console.log('Son copy trade\'ler:');
      trades.forEach((trade, index) => {
        console.log(`   ${index + 1}. ${trade.status} - ${trade.signal?.token} - ${trade.createdAt}`);
      });
    }

    // 9. Engine'i durdur
    console.log('\n9️⃣ Engine durduruluyor...');
    engine.stop();
    console.log('✅ Engine durduruldu');

  } catch (error) {
    console.error('❌ Copy Trading Engine test hatası:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await engine.prisma.$disconnect();
  }
}

testCopyTradingEngine();
