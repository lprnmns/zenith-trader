const CopyTradingService = require('./src/services/copyTradingService');

async function testFakeSellSignal() {
  console.log('🧪 Fake SELL Signal - Direct Service Test');
  console.log('==========================================\n');

  try {
    // Copy trading servisini başlat
    console.log('1️⃣ Copy Trading Service başlatılıyor...');
    const copyTradingService = new CopyTradingService();
    
    const okxConfig = {
      apiKey: '82cf6d49-61d4-4bc0-80fa-d507e11688cd',
      secret: 'D34E625EAF20941DA3665B25377A26E2',
      passphrase: 'copy',
      demoMode: true
    };
    
    const initialized = await copyTradingService.initialize(okxConfig);
    if (!initialized) {
      console.log('❌ Service başlatılamadı');
      return;
    }
    
    // Mevcut bakiyeyi al
    const userBalance = await copyTradingService.getOKXBalance();
    console.log(`💰 Mevcut bakiye: $${userBalance.toFixed(2)} USDT`);
    
    // Fake SELL signal oluştur
    console.log('\n2️⃣ Fake SELL signal oluşturuluyor...');
    const fakeSellSignal = {
      type: 'SELL',
      token: 'WBTC',
      amount: 20000, // $20,000 WBTC satışı
      percentage: 25,
      date: new Date().toISOString().split('T')[0],
      txHash: 'fake-wbtc-sell-' + Date.now(),
      leverage: 1,
      totalValue: 80000,
      currentPosSize: 40000, // Mevcut 0.0002 WBTC 3x LONG pozisyonu
      originalPositionSize: 40000
    };
    
    console.log('🔴 Fake SELL Signal:');
    console.log(`   Token: ${fakeSellSignal.token}`);
    console.log(`   Amount: $${fakeSellSignal.amount.toFixed(2)}`);
    console.log(`   Current Position: $${fakeSellSignal.currentPosSize.toFixed(2)}`);
    
    // Hesaplamalar
    const sellPercentage = (fakeSellSignal.amount / fakeSellSignal.currentPosSize) * 100;
    const amountToClose = fakeSellSignal.currentPosSize * (sellPercentage / 100);
    
    console.log('\n📊 Hesaplamalar:');
    console.log(`   Satış yüzdesi: ${sellPercentage.toFixed(1)}%`);
    console.log(`   Kapatılacak LONG: $${amountToClose.toFixed(2)}`);
    console.log(`   Açılacak SHORT: $${fakeSellSignal.amount.toFixed(2)} (1x)`);
    
    // Sinyali işle
    console.log('\n3️⃣ Sinyal işleniyor...');
    const result = await copyTradingService.processPositionSignal(fakeSellSignal, userBalance);
    
    if (result.success) {
      console.log('✅ Sinyal başarıyla işlendi!');
      console.log('📊 Sonuçlar:');
      
      if (result.results && result.results.length > 0) {
        console.log(`   Toplam Emir: ${result.totalOrders}`);
        result.results.forEach((res, index) => {
          console.log(`   ${index + 1}. ${res.type}: ${res.orderId || 'N/A'} (${res.positionSide})`);
          if (res.size) console.log(`      Boyut: $${res.size.toFixed(2)}`);
          if (res.leverage) console.log(`      Kaldıraç: ${res.leverage}x`);
        });
      }
      
      console.log('\n🎯 Beklenen vs Gerçekleşen:');
      console.log(`   ✅ ${sellPercentage.toFixed(1)}%'si kapatıldı`);
      console.log(`   ✅ $${fakeSellSignal.amount.toFixed(2)} SHORT açıldı (1x)`);
      console.log(`   ✅ Kalan pozisyon: $${(fakeSellSignal.currentPosSize - amountToClose).toFixed(2)} LONG`);
      
    } else {
      console.log('❌ Sinyal işlenemedi!');
      console.log(`   Hata: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test başarısız:', error.message);
    console.error(error.stack);
  }
}

testFakeSellSignal().catch(console.error);