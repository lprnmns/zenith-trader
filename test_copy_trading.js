const CopyTradingService = require('./src/services/copyTradingService');

async function testCopyTrading() {
  console.log('🧪 Copy Trading Service Test Başlıyor...\n');

  const copyTradingService = new CopyTradingService();

  try {
    // 1. Service'i başlat
    console.log('1️⃣ Copy Trading Service başlatılıyor...');
    const initialized = await copyTradingService.initialize({
      apiKey: '242a9a80-50a4-4fcf-8116-f8ee12e4ecc9',
      secretKey: '9B8C077868333D9EF2FD550B41777656',
      passphrase: 'Kgkput_4896'
    });

    if (!initialized) {
      throw new Error('Service başlatılamadı');
    }
    console.log('✅ Service başarıyla başlatıldı');

    // 2. Durum kontrolü
    console.log('\n2️⃣ Service durumu kontrol ediliyor...');
    const status = copyTradingService.getStatus();
    console.log('Service Durumu:', JSON.stringify(status, null, 2));

    // 3. OKX bakiyesi al
    console.log('\n3️⃣ OKX bakiyesi alınıyor...');
    const balance = await copyTradingService.getOKXBalance();
    console.log(`OKX Bakiyesi: $${balance.toFixed(2)} USDT`);

    // 4. Test sinyali işle
    console.log('\n4️⃣ Test sinyali işleniyor...');
    const testSignal = {
      type: 'BUY',
      token: 'ETH',
      amount: 1000,
      percentage: 5.0,
      leverage: 3
    };

    const result = await copyTradingService.processPositionSignal(testSignal, balance);
    console.log('Sinyal İşleme Sonucu:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCopyTrading();
