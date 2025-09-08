const axios = require('axios');

async function sendFakeSellSignal() {
  console.log('🧪 Fake SELL Signal Test');
  console.log('========================\n');

  // Fake SELL signal - $20,000 WBTC satışı
  const fakeSellSignal = {
    type: 'SELL',
    token: 'WBTC',
    amount: 20000,
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
  console.log(`   Percentage: ${fakeSellSignal.percentage.toFixed(2)}%`);
  console.log(`   Current Position: $${fakeSellSignal.currentPosSize.toFixed(2)}`);
  console.log(`   Leverage: ${fakeSellSignal.leverage}x`);
  
  // Hesaplamalar
  const sellPercentage = (fakeSellSignal.amount / fakeSellSignal.currentPosSize) * 100;
  const amountToClose = fakeSellSignal.currentPosSize * (sellPercentage / 100);
  const remainingLong = fakeSellSignal.currentPosSize - amountToClose;
  
  console.log('\n📊 Beklenen sonuç:');
  console.log(`   Satış yüzdesi: ${sellPercentage.toFixed(1)}%`);
  console.log(`   Kapatılacak LONG: $${amountToClose.toFixed(2)}`);
  console.log(`   Kalan LONG: $${remainingLong.toFixed(2)}`);
  console.log(`   Açılacak SHORT: $${fakeSellSignal.amount.toFixed(2)} (1x)`);
  
  try {
    // Backend'e fake sinyal gönder
    console.log('\n📤 Backend\'e fake sinyal gönderiliyor...');
    
    const response = await axios.post('http://localhost:3001/api/copy-trading/process-signal', {
      signal: fakeSellSignal,
      userBalance: 14550, // Mevcut bakiye
      demoMode: true
    });
    
    console.log('✅ Sinyal başarıyla gönderildi!');
    console.log('📊 Backend yanıtı:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Backend hatası:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data.message || error.response.data.error}`);
    } else {
      console.log('❌ Bağlantı hatası:');
      console.log(`   Message: ${error.message}`);
    }
  }
}

sendFakeSellSignal().catch(console.error);