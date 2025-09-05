const CopyTradingEngine = require('./src/core/copyTradingEngine');

async function testCopyTradingWithMock() {
  console.log('🧪 Copy Trading Engine - Mock Sinyaller Test Başlıyor...\n');

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

    // 3. Database'deki mock sinyalleri kontrol et
    console.log('\n3️⃣ Database\'deki mock sinyalleri kontrol ediliyor...');
    const mockSignals = await engine.prisma.positionSignal.findMany({
      where: { 
        walletAddress: '0xc82b2e484b161d20eae386877d57c4e5807b5581',
        processed: false 
      },
      orderBy: { timestamp: 'desc' }
    });

    console.log(`📊 İşlenmemiş mock sinyal sayısı: ${mockSignals.length}`);
    mockSignals.forEach((signal, index) => {
      console.log(`   ${index + 1}. ${signal.signalType} ${signal.token} - ${signal.percentage}% - $${signal.price}`);
    });

    // 4. Mock sinyalleri manuel olarak işle
    console.log('\n4️⃣ Mock sinyalleri manuel olarak işleniyor...');
    
    for (const signal of mockSignals) {
      try {
        console.log(`\n🚀 Sinyal işleniyor: ${signal.signalType} ${signal.token} (${signal.percentage}%)`);
        
        // OKX bakiyesini al
        const okxBalance = await engine.copyTradingService.getOKXBalance();
        console.log(`💰 OKX Bakiyesi: $${okxBalance.toFixed(2)} USDT`);

        // Sinyali işle
        const result = await engine.copyTradingService.processPositionSignal({
          type: signal.signalType,
          token: signal.token,
          amount: signal.amount,
          percentage: signal.percentage,
          leverage: signal.signalType === 'BUY' ? 3 : 1
        }, okxBalance);

        // Sonucu database'e kaydet
        await engine.prisma.copyTrade.create({
          data: {
            signalId: signal.id,
            okxOrderId: result.success ? result.orderId : null,
            status: result.success ? 'SUCCESS' : 'FAILED',
            executedAt: result.success ? new Date() : null
          }
        });

        // Sinyali işlenmiş olarak işaretle
        await engine.prisma.positionSignal.update({
          where: { id: signal.id },
          data: { processed: true }
        });

        if (result.success) {
          console.log(`✅ Sinyal başarıyla işlendi: ${result.orderId}`);
          console.log(`   Pozisyon Büyüklüğü: $${result.positionSize.toFixed(2)} USDT`);
          console.log(`   Kontrat Sayısı: ${result.contractSize}`);
        } else {
          console.log(`❌ Sinyal işlenemedi: ${result.error}`);
        }

        // Rate limiting için bekle
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`❌ Sinyal işleme hatası:`, error.message);
      }
    }

    // 5. Sonuçları kontrol et
    console.log('\n5️⃣ İşlem sonuçları kontrol ediliyor...');
    const processedSignals = await engine.prisma.positionSignal.findMany({
      where: { 
        walletAddress: '0xc82b2e484b161d20eae386877d57c4e5807b5581',
        processed: true 
      },
      include: {
        copyTrades: true
      },
      orderBy: { timestamp: 'desc' }
    });

    console.log(`📊 İşlenmiş sinyal sayısı: ${processedSignals.length}`);
    processedSignals.forEach((signal, index) => {
      const trade = signal.copyTrades[0];
      console.log(`   ${index + 1}. ${signal.signalType} ${signal.token} - ${signal.percentage}% - ${trade?.status || 'PENDING'}`);
    });

    // 6. Copy trade istatistikleri
    console.log('\n6️⃣ Copy trade istatistikleri...');
    const [successTrades, failedTrades] = await Promise.all([
      engine.prisma.copyTrade.count({ where: { status: 'SUCCESS' } }),
      engine.prisma.copyTrade.count({ where: { status: 'FAILED' } })
    ]);

    console.log(`✅ Başarılı işlemler: ${successTrades}`);
    console.log(`❌ Başarısız işlemler: ${failedTrades}`);
    console.log(`📊 Başarı oranı: ${((successTrades / (successTrades + failedTrades)) * 100).toFixed(2)}%`);

    // 7. Engine'i durdur
    console.log('\n7️⃣ Engine durduruluyor...');
    engine.stop();
    console.log('✅ Engine durduruldu');

  } catch (error) {
    console.error('❌ Copy Trading test hatası:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await engine.prisma.$disconnect();
  }
}

testCopyTradingWithMock();
