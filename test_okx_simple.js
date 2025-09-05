const { RestClient } = require('okx-api');

async function testOKXSimple() {
  try {
    console.log('🧪 Testing OKX API with simple account balance...');
    console.log('');

    const okxClient = new RestClient({
      apiKey: '044e2fb0-6a02-4874-853f-2b4fad9dd563',
      apiSecret: '7BB641F2FCC9DF79D83BE0968C1EDOFE',
      apiPass: 'Kgkput_4896',
      demoTrading: true,
      baseURL: 'https://www.okx.com'
    });

    console.log('📋 Testing public endpoint first...');
    
    // Test public ticker (should work without auth)
    try {
      const ticker = await okxClient.getTicker('BTC-USDT');
      console.log('✅ Public ticker works:', ticker?.data?.[0]?.last ? 'SUCCESS' : 'FAILED');
    } catch (error) {
      console.log('❌ Public ticker failed:', error?.response?.data || error?.message);
    }

    console.log('');
    console.log('📋 Testing private endpoint (account balance)...');
    
    // Test account balance (requires auth)
    try {
      const balance = await okxClient.getAccountBalance();
      console.log('✅ Account balance result:', balance?.data ? 'SUCCESS' : 'FAILED');
      if (balance?.data) {
        console.log('   Balance data:', JSON.stringify(balance.data, null, 2));
      }
    } catch (error) {
      console.log('❌ Account balance failed:', error?.response?.data || error?.message);
      console.log('   Error details:', error?.response?.status, error?.response?.statusText);
    }

    console.log('');
    console.log('📋 Testing positions...');
    
    // Test positions
    try {
      const positions = await okxClient.getPositions('SWAP');
      console.log('✅ Positions result:', positions?.data ? 'SUCCESS' : 'FAILED');
      if (positions?.data) {
        console.log('   Positions count:', positions.data.length);
      }
    } catch (error) {
      console.log('❌ Positions failed:', error?.response?.data || error?.message);
    }

    console.log('');
    console.log('🎯 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error?.response?.data || error?.message || error);
  }
}

testOKXSimple();
