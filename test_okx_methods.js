const { RestClient } = require('okx-api');

async function testOKXMethods() {
  try {
    console.log('🧪 Testing OKX API methods...');
    console.log('');

    const okxClient = new RestClient({
      apiKey: '82cf6d49-61d4-4bc0-80fa-d507e11688cd',
      apiSecret: 'D34E625EAF20941DA3665B25377A26E2',
      apiPass: 'Kgkput_4896',
      demoTrading: false,
      baseURL: 'https://www.okx.com'
    });

    console.log('📋 Available methods:');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(okxClient)).filter(name => !name.startsWith('_')));
    console.log('');

    console.log('📋 Testing getBalance...');
    
    try {
      const balance = await okxClient.getBalance();
      console.log('✅ getBalance SUCCESS');
      console.log('   Response:', JSON.stringify(balance, null, 2));
    } catch (error) {
      console.log('❌ getBalance FAILED');
      console.log('   Error:', error?.response?.data || error?.message || error);
    }

    console.log('');
    console.log('📋 Testing getTicker...');
    
    try {
      const ticker = await okxClient.getTicker('BTC-USDT');
      console.log('✅ getTicker SUCCESS');
      console.log('   Response:', JSON.stringify(ticker, null, 2));
    } catch (error) {
      console.log('❌ getTicker FAILED');
      console.log('   Error:', error?.response?.data || error?.message || error);
    }

    console.log('');
    console.log('🎯 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error?.response?.data || error?.message || error);
  }
}

testOKXMethods();
