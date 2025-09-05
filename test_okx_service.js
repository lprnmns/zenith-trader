const okxService = require('./src/services/okxService');

async function testOKXService() {
  try {
    console.log('🧪 Testing OKX Service...');
    console.log('');

    // Test connection
    const isConnected = await okxService.checkConnection();
    console.log('✅ Connection test result:', isConnected ? 'SUCCESS' : 'FAILED');

  } catch (error) {
    console.error('❌ Test failed:', error?.response?.data || error?.message || error);
  }
}

testOKXService();
