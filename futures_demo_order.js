const OKXService = require('./src/services/okxService');

async function sendFuturesDemoOrder() {
  console.log('🚀 OKX Futures Demo Order - Short BTC');
  console.log('=====================================\n');

  // Demo credentials
  const demoClient = new OKXService(
    '242a9a80-50a4-4fcf-8116-f8ee12e4ecc9',
    '9B8C077868333D9EF2FD550B41777656',
    'Kgkput_4896',
    true // Demo mode
  );

  try {
    // 1. Hesap bakiyesini kontrol et
    console.log('📊 Hesap Bakiyesi Kontrolü:');
    const balance = await demoClient.getBalance();
    console.log('✅ Bakiye alındı');
    console.log('   Toplam Bakiye:', balance[0]?.totalEq || 'N/A');
    console.log('   USDT Bakiye:', balance[0]?.details?.find(d => d.ccy === 'USDT')?.availBal || 'N/A');
    console.log('');

    // 2. BTC-USDT-SWAP ticker bilgisini al
    console.log('📈 BTC-USDT-SWAP Ticker Bilgisi:');
    const ticker = await demoClient.getTicker('BTC-USDT-SWAP');
    const lastPrice = parseFloat(ticker[0]?.last);
    console.log('✅ Ticker alındı');
    console.log('   Son Fiyat:', lastPrice);
    console.log('   Bid:', ticker[0]?.bidPx);
    console.log('   Ask:', ticker[0]?.askPx);
    console.log('');

    // 3. BTC-USDT-SWAP instrument bilgilerini al
    console.log('🔧 BTC-USDT-SWAP Instrument Bilgileri:');
    const instruments = await demoClient.getInstruments('SWAP');
    const btcSwap = Array.isArray(instruments) ? instruments.find(inst => inst.instId === 'BTC-USDT-SWAP') : null;
    
    if (btcSwap) {
      console.log('✅ Instrument bilgileri alındı');
      console.log('   Minimum Size:', btcSwap.minSz);
      console.log('   Lot Size:', btcSwap.lotSz);
      console.log('   Contract Value:', btcSwap.ctVal);
      console.log('   Tick Size:', btcSwap.tickSz);
    } else {
      console.log('❌ BTC-USDT-SWAP instrument bulunamadı');
      return;
    }
    console.log('');

    // 4. Kaldıraç ayarla (5x)
    console.log('⚙️ Kaldıraç Ayarı (5x):');
    try {
      const leverageResponse = await demoClient.setLeverage('BTC-USDT-SWAP', '5', 'isolated');
      console.log('✅ Kaldıraç ayarlandı');
      console.log('   Response:', JSON.stringify(leverageResponse, null, 2));
    } catch (error) {
      console.log('❌ Kaldıraç ayarlanamadı:', error?.response?.data?.msg || error?.message);
      return;
    }
    console.log('');

    // 5. Short futures emri gönder
    console.log('📉 SHORT Futures Emri Gönderiliyor:');
    console.log('   Enstrüman: BTC-USDT-SWAP');
    console.log('   Yön: SHORT (sell)');
    console.log('   Miktar: 0.1 contracts');
    console.log('   Tip: Market');
    console.log('   Kaldıraç: 5x');
    console.log('   Mod: Isolated');
    console.log('');

    const orderResponse = await demoClient.submitOrder(
      'BTC-USDT-SWAP',  // instId
      'isolated',       // tdMode
      'sell',           // side (SHORT için sell)
      'market',         // ordType
      '0.1'             // sz (0.1 contracts)
    );

    console.log('📊 Emir Sonucu:');
    if (orderResponse?.code === '0') {
      const order = Array.isArray(orderResponse.data) ? orderResponse.data[0] : orderResponse.data;
      console.log('✅ Emir başarıyla gönderildi!');
      console.log('   Order ID:', order.ordId);
      console.log('   Status:', order.sMsg);
      console.log('   Timestamp:', order.ts);
      console.log('');
      
      // Emir detayları
      console.log('📋 Emir Detayları:');
      console.log('   Enstrüman: BTC-USDT-SWAP');
      console.log('   Yön: SHORT (sell)');
      console.log('   Miktar: 0.1 contracts');
      console.log('   Fiyat: Market');
      console.log('   Kaldıraç: 5x');
      console.log('   Mod: Isolated');
      console.log('   Tahmini Değer:', (0.1 * lastPrice).toFixed(2), 'USDT');
      
    } else {
      console.log('❌ Emir başarısız:');
      console.log('   Code:', orderResponse?.code);
      console.log('   Message:', orderResponse?.msg);
      if (orderResponse?.data?.[0]) {
        console.log('   Error Code:', orderResponse.data[0].sCode);
        console.log('   Error Message:', orderResponse.data[0].sMsg);
      }
    }

  } catch (error) {
    console.log('❌ Genel hata:', error?.response?.data || error?.message);
    console.log('   Status:', error?.response?.status);
    console.log('   StatusText:', error?.response?.statusText);
  }

  console.log('\n🎯 İşlem tamamlandı!');
}

sendFuturesDemoOrder().catch(console.error);
