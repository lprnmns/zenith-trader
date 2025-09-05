const { RestClient } = require('okx-api');

async function testCorrectOKX() {
  try {
    console.log('🧪 Testing OKX API with correct credentials...');
    console.log('');
    
    const okxClient = new RestClient({
      apiKey: '044e2fb0-6a02-4874-853f-2b4fad9dd563',
      apiSecret: '7BB641F2FCC9DF79D83BE0968C1EDOFE', // ✅ CORRECT Secret Key
      apiPass: 'Kgkput_4896',
      demoTrading: true
    });

    console.log('📋 Testing public endpoints...');
    
    // Test public ticker
    const ticker = await okxClient.getTicker('BTC-USDT');
    console.log('✅ getTicker:', ticker?.data?.[0]?.last || 'No data');
    
    console.log('');
    console.log('📋 Testing private endpoints...');
    
    // Test account balance
    const balance = await okxClient.getAccountBalance();
    console.log('✅ getAccountBalance:', balance?.data?.[0]?.details?.[0]?.bal || 'No data');
    
    // Test positions
    const positions = await okxClient.getPositions('SWAP');
    console.log('✅ getPositions:', positions?.data?.length || 0, 'positions');
    
    console.log('');
    console.log('🎯 All tests completed! Check if "Invalid Sign" error is gone.');
    
  } catch (error) {
    console.error('❌ Test failed:', error?.response?.data || error?.message || error);
  }
}

testCorrectOKX();
