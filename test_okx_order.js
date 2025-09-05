const { RestClient } = require('okx-api');

async function testOKXOrder() {
  try {
    console.log('🧪 Testing OKX order submission...');
    console.log('');

    const okxClient = new RestClient({
      apiKey: '82cf6d49-61d4-4bc0-80fa-d507e11688cd',
      apiSecret: 'D34E625EAF20941DA3665B25377A26E2',
      apiPass: 'Kgkput_4896',
      demoTrading: false,
      baseURL: 'https://www.okx.com'
    });

    console.log('📋 Testing getTicker first...');
    
    try {
      const ticker = await okxClient.getTicker('BTC-USDT');
      console.log('✅ getTicker SUCCESS');
      console.log('   Last price:', ticker?.[0]?.last);
    } catch (error) {
      console.log('❌ getTicker FAILED');
      console.log('   Error:', error?.response?.data || error?.message || error);
      return;
    }

    console.log('');
    console.log('📋 Testing submitOrder...');
    
    try {
      const orderResponse = await okxClient.submitOrder({
        instId: 'BTC-USDT-SWAP',
        tdMode: 'cross',
        side: 'buy',
        posSide: 'long',
        ordType: 'market',
        sz: '0.001'
      });
      console.log('✅ submitOrder SUCCESS');
      console.log('   Response:', JSON.stringify(orderResponse, null, 2));
    } catch (error) {
      console.log('❌ submitOrder FAILED');
      console.log('   Error:', error?.response?.data || error?.message || error);
      console.log('   Status:', error?.response?.status);
      console.log('   StatusText:', error?.response?.statusText);
    }

    console.log('');
    console.log('🎯 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error?.response?.data || error?.message || error);
  }
}

testOKXOrder();
