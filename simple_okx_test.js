const OKXService = require('./src/services/okxService');

// Demo OKX client
const okxClient = new OKXService(
  '242a9a80-50a4-4fcf-8116-f8ee12e4ecc9',
  '9B8C077868333D9EF2FD550B41777656',
  'Kgkput_4896',
  true // Demo mode
);

async function testOKX() {
  try {
    console.log('🧪 OKX API Test Başlıyor...\n');
    
    // 1. Bakiye kontrolü
    console.log('1️⃣ Bakiye kontrolü...');
    const balance = await okxClient.getBalance();
    console.log('Bakiye Response:', JSON.stringify(balance, null, 2));
    
    // 2. ETH fiyatı
    console.log('\n2️⃣ ETH fiyatı alınıyor...');
    const ticker = await okxClient.getTicker('ETH-USDT-SWAP');
    console.log('Ticker Response:', JSON.stringify(ticker, null, 2));
    
    // 3. Kaldıraç ayarlama - hem long hem short için
    console.log('\n3️⃣ Kaldıraç ayarlanıyor...');
    const leverageLong = await okxClient.setLeverage('ETH-USDT-SWAP', '3', 'isolated', 'long');
    console.log('Leverage Long Response:', JSON.stringify(leverageLong, null, 2));
    
    const leverageShort = await okxClient.setLeverage('ETH-USDT-SWAP', '3', 'isolated', 'short');
    console.log('Leverage Short Response:', JSON.stringify(leverageShort, null, 2));
    
    // 4. Emir gönderme - posSide olmadan
    console.log('\n4️⃣ Test emri gönderiliyor...');
    const order = await okxClient.submitOrder(
      'ETH-USDT-SWAP',
      'isolated',
      'buy',
      'market',
      '0.1'
    );
    console.log('Order Response:', JSON.stringify(order, null, 2));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Stack:', error.stack);
  }
}

testOKX();
