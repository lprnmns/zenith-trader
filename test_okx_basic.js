const { RestClient } = require('okx-api');

async function testOKXBasic() {
  try {
    console.log('🧪 Testing OKX API basic connection...');
    console.log('');

    const okxClient = new RestClient({
      apiKey: '82cf6d49-61d4-4bc0-80fa-d507e11688cd',
      apiSecret: 'D34E625EAF20941DA3665B25377A26E2',
      apiPass: 'Kgkput_4896',
      demoTrading: false,
      baseURL: 'https://www.okx.com'
    });

    console.log('📋 Testing account balance...');
    
    try {
      const balance = await okxClient.getAccountBalance();
      console.log('✅ Account balance SUCCESS');
      console.log('   Response:', JSON.stringify(balance, null, 2));
    } catch (error) {
      console.log('❌ Account balance FAILED');
      console.log('   Error:', error?.response?.data || error?.message || error);
      console.log('   Status:', error?.response?.status);
      console.log('   StatusText:', error?.response?.statusText);
    }

    console.log('');
    console.log('📋 Testing positions...');
    
    try {
      const positions = await okxClient.getPositions('SWAP');
      console.log('✅ Positions SUCCESS');
      console.log('   Response:', JSON.stringify(positions, null, 2));
    } catch (error) {
      console.log('❌ Positions FAILED');
      console.log('   Error:', error?.response?.data || error?.message || error);
      console.log('   Status:', error?.response?.status);
      console.log('   StatusText:', error?.response?.statusText);
    }

    console.log('');
    console.log('📋 Testing ticker...');
    
    try {
      const ticker = await okxClient.getTicker('BTC-USDT');
      console.log('✅ Ticker SUCCESS');
      console.log('   Response:', JSON.stringify(ticker, null, 2));
    } catch (error) {
      console.log('❌ Ticker FAILED');
      console.log('   Error:', error?.response?.data || error?.message || error);
    }

    console.log('');
    console.log('🎯 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error?.response?.data || error?.message || error);
  }
}

testOKXBasic();
