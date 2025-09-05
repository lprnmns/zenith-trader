const OKXService = require('./src/services/okxService');

async function testDemoCredentials() {
  try {
    console.log('🧪 Testing DEMO trading API credentials...');
    console.log('');

         const okxClient = new OKXService(
       '242a9a80-50a4-4fcf-8116-f8ee12e4ecc9',
       '9B8C077868333D9EF2FD550B41777656',
       'Kgkput_4896',
       true // Demo mode
     );

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
       const ticker = await okxClient.getTicker('BTC-USDT-SWAP');
       console.log('✅ getTicker SUCCESS');
       console.log('   Response:', JSON.stringify(ticker, null, 2));
     } catch (error) {
       console.log('❌ getTicker FAILED');
       console.log('   Error:', error?.response?.data || error?.message || error);
     }

    console.log('');
              console.log('📋 Testing getInstruments (SPOT)...');
     
     try {
       const instruments = await okxClient.getInstruments('SPOT');
       const btcSpot = Array.isArray(instruments) ? instruments.find(inst => inst.instId === 'BTC-USDT') : null;
       console.log('✅ getInstruments SUCCESS');
       console.log('   BTC-USDT lot size:', btcSpot?.lotSz);
       console.log('   BTC-USDT min size:', btcSpot?.minSz);
       console.log('   BTC-USDT tick size:', btcSpot?.tickSz);
     } catch (error) {
       console.log('❌ getInstruments FAILED');
       console.log('   Error:', error?.response?.data || error?.message || error);
     }

     console.log('');
     console.log('📋 Testing submitOrder (SPOT)...');
     
                                                                                                       try {
            const orderResponse = await okxClient.submitOrder(
              'BTC-USDT',
              'cash',
              'buy',
              'market',
              '10'
            );
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

testDemoCredentials();
