const OKXService = require('./src/services/okxService');

async function getMinimumAmounts() {
  console.log('🔍 OKX Minimum Trade Miktarları Araştırması');
  console.log('==========================================\n');

  // Demo credentials
  const demoClient = new OKXService(
    '242a9a80-50a4-4fcf-8116-f8ee12e4ecc9',
    '9B8C077868333D9EF2FD550B41777656',
    'Kgkput_4896',
    true // Demo mode
  );

  // Real credentials (from .env)
  const realClient = new OKXService(
    process.env.OKX_API_KEY,
    process.env.OKX_SECRET_KEY,
    process.env.OKX_PASSPHRASE,
    false // Real mode
  );

  const instruments = ['SPOT', 'SWAP'];
  const pairs = ['BTC-USDT', 'ETH-USDT'];

  for (const instType of instruments) {
    console.log(`📊 ${instType} Trading Minimum Miktarları:`);
    console.log('─'.repeat(50));

    try {
      // Demo instruments
      console.log('\n🧪 DEMO Trading:');
      const demoInstruments = await demoClient.getInstruments(instType);
      
      for (const pair of pairs) {
        const instrumentId = instType === 'SWAP' ? `${pair}-SWAP` : pair;
        const instrument = Array.isArray(demoInstruments) 
          ? demoInstruments.find(inst => inst.instId === instrumentId)
          : null;

        if (instrument) {
          console.log(`   ${instrumentId}:`);
          console.log(`     - Minimum Size (minSz): ${instrument.minSz}`);
          console.log(`     - Lot Size (lotSz): ${instrument.lotSz}`);
          console.log(`     - Tick Size (tickSz): ${instrument.tickSz}`);
          console.log(`     - Contract Value: ${instrument.ctVal || 'N/A'}`);
          console.log(`     - Contract Multiplier: ${instrument.ctMult || 'N/A'}`);
          console.log(`     - Base Currency: ${instrument.baseCcy || 'N/A'}`);
          console.log(`     - Quote Currency: ${instrument.quoteCcy || 'N/A'}`);
        } else {
          console.log(`   ❌ ${instrumentId}: Enstrüman bulunamadı`);
        }
      }

      // Real instruments (if credentials available)
      if (process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE) {
        console.log('\n🏦 REAL Trading:');
        try {
          const realInstruments = await realClient.getInstruments(instType);
          
          for (const pair of pairs) {
            const instrumentId = instType === 'SWAP' ? `${pair}-SWAP` : pair;
            const instrument = Array.isArray(realInstruments) 
              ? realInstruments.find(inst => inst.instId === instrumentId)
              : null;

            if (instrument) {
              console.log(`   ${instrumentId}:`);
              console.log(`     - Minimum Size (minSz): ${instrument.minSz}`);
              console.log(`     - Lot Size (lotSz): ${instrument.lotSz}`);
              console.log(`     - Tick Size (tickSz): ${instrument.tickSz}`);
              console.log(`     - Contract Value: ${instrument.ctVal || 'N/A'}`);
              console.log(`     - Contract Multiplier: ${instrument.ctMult || 'N/A'}`);
              console.log(`     - Base Currency: ${instrument.baseCcy || 'N/A'}`);
              console.log(`     - Quote Currency: ${instrument.quoteCcy || 'N/A'}`);
            } else {
              console.log(`   ❌ ${instrumentId}: Enstrüman bulunamadı`);
            }
          }
        } catch (error) {
          console.log(`   ❌ Real trading instruments alınamadı: ${error?.response?.data?.msg || error?.message}`);
        }
      } else {
        console.log('\n🏦 REAL Trading: ❌ Gerçek trading credentials bulunamadı (.env dosyasında OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE gerekli)');
      }

    } catch (error) {
      console.log(`❌ ${instType} instruments alınamadı: ${error?.response?.data?.msg || error?.message}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  // Test minimum amounts with actual orders
  console.log('🧪 Minimum Miktarları Test Etme:');
  console.log('─'.repeat(40));

  // Test SPOT trading with minimum amounts
  console.log('\n📈 SPOT Trading Test:');
  
  try {
    const spotInstruments = await demoClient.getInstruments('SPOT');
    const btcSpot = Array.isArray(spotInstruments) ? spotInstruments.find(inst => inst.instId === 'BTC-USDT') : null;
    const ethSpot = Array.isArray(spotInstruments) ? spotInstruments.find(inst => inst.instId === 'ETH-USDT') : null;

    if (btcSpot) {
      console.log(`\n🔸 BTC-USDT minimum test (${btcSpot.minSz} BTC):`);
      try {
        const btcOrder = await demoClient.submitOrder(
          'BTC-USDT',
          'cash',
          'buy',
          'market',
          btcSpot.minSz
        );
        console.log(`   ✅ Başarılı: ${JSON.stringify(btcOrder, null, 2)}`);
      } catch (error) {
        console.log(`   ❌ Başarısız: ${error?.response?.data?.msg || error?.message}`);
      }
    }

    if (ethSpot) {
      console.log(`\n🔸 ETH-USDT minimum test (${ethSpot.minSz} ETH):`);
      try {
        const ethOrder = await demoClient.submitOrder(
          'ETH-USDT',
          'cash',
          'buy',
          'market',
          ethSpot.minSz
        );
        console.log(`   ✅ Başarılı: ${JSON.stringify(ethOrder, null, 2)}`);
      } catch (error) {
        console.log(`   ❌ Başarısız: ${error?.response?.data?.msg || error?.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ SPOT test başarısız: ${error?.response?.data?.msg || error?.message}`);
  }

  // Test SWAP trading with minimum amounts
  console.log('\n📊 SWAP Trading Test:');
  
  try {
    const swapInstruments = await demoClient.getInstruments('SWAP');
    const btcSwap = Array.isArray(swapInstruments) ? swapInstruments.find(inst => inst.instId === 'BTC-USDT-SWAP') : null;
    const ethSwap = Array.isArray(swapInstruments) ? swapInstruments.find(inst => inst.instId === 'ETH-USDT-SWAP') : null;

    if (btcSwap) {
      console.log(`\n🔸 BTC-USDT-SWAP minimum test (${btcSwap.minSz} contracts):`);
      try {
        // Set leverage first for SWAP
        await demoClient.setLeverage('BTC-USDT-SWAP', '5', 'isolated');
        
        const btcOrder = await demoClient.submitOrder(
          'BTC-USDT-SWAP',
          'isolated',
          'buy',
          'market',
          btcSwap.minSz
        );
        console.log(`   ✅ Başarılı: ${JSON.stringify(btcOrder, null, 2)}`);
      } catch (error) {
        console.log(`   ❌ Başarısız: ${error?.response?.data?.msg || error?.message}`);
      }
    }

    if (ethSwap) {
      console.log(`\n🔸 ETH-USDT-SWAP minimum test (${ethSwap.minSz} contracts):`);
      try {
        // Set leverage first for SWAP
        await demoClient.setLeverage('ETH-USDT-SWAP', '5', 'isolated');
        
        const ethOrder = await demoClient.submitOrder(
          'ETH-USDT-SWAP',
          'isolated',
          'buy',
          'market',
          ethSwap.minSz
        );
        console.log(`   ✅ Başarılı: ${JSON.stringify(ethOrder, null, 2)}`);
      } catch (error) {
        console.log(`   ❌ Başarısız: ${error?.response?.data?.msg || error?.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ SWAP test başarısız: ${error?.response?.data?.msg || error?.message}`);
  }

  console.log('\n🎯 Araştırma tamamlandı!');
}

getMinimumAmounts().catch(console.error);
