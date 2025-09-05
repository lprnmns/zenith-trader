const { RestClient } = require('okx-api');

async function testNewOKXCredentials() {
  try {
    console.log('🧪 Testing new OKX API credentials...');
    console.log('');

    const okxClient = new RestClient({
      apiKey: '82cf6d49-61d4-4bc0-80fa-d507e11688cd',
      apiSecret: 'D34E625EAF20941DA3665B25377A26E2',
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

testNewOKXCredentials();
