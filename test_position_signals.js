const positionSignalService = require('./src/services/positionSignalService');
const analysisService = require('./src/services/analysisService');
const zerionService = require('./src/services/zerionService');

async function testPositionSignals() {
  console.log('🧪 Position Signal Service Test');
  console.log('===============================\n');

  // Test wallet address - using the same address from zerion_check.js
  const testAddress = '0xc82b2e484b161d20eae386877d57c4e5807b5581';
  
  try {
    console.log('📊 Testing wallet:', testAddress);
    console.log('─'.repeat(50));
    
    // Step 1: Clear cache to ensure fresh data
    console.log('\n1️⃣ Clearing cache...');
    positionSignalService.clearCache(testAddress);
    
    // Step 2: Get wallet analysis directly
    console.log('\n2️⃣ Getting wallet analysis...');
    const analysis = await analysisService.analyzeWallet(testAddress);
    
    if (!analysis || !analysis.tradeHistory) {
      console.log('❌ No trade history found');
      return;
    }
    
    console.log(`✅ Found ${analysis.tradeHistory.length} trades in history`);
    
    // Step 3: Check for specific trades (looking for the WBTC/USDT example)
    console.log('\n3️⃣ Looking for WBTC/USDT trades...');
    const wbtcTrades = analysis.tradeHistory.filter(trade => 
      trade.asset === 'WBTC' || trade.asset === 'USDT'
    );
    
    console.log(`Found ${wbtcTrades.length} WBTC/USDT related trades:`);
    wbtcTrades.forEach((trade, index) => {
      console.log(`${index + 1}. ${trade.asset}: ${trade.action} $${trade.amountUsd?.toFixed(2)} on ${trade.date}`);
      if (trade.sales && trade.sales.length > 0) {
        trade.sales.forEach((sale, saleIndex) => {
          console.log(`   └ Sale ${saleIndex + 1}: $${sale.amountSoldUsd?.toFixed(2)} on ${sale.date}`);
        });
      }
    });
    
    // Step 4: Get position signals
    console.log('\n4️⃣ Getting position signals...');
    const signals = await positionSignalService.getNewPositionSignals(testAddress, new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    console.log(`✅ Generated ${signals.length} signals:`);
    signals.forEach((signal, index) => {
      console.log(`${index + 1}. ${signal.type} ${signal.token}: $${signal.amount?.toFixed(2)} (${signal.percentage?.toFixed(2)}%) Leverage: ${signal.leverage}x`);
    });
    
    // Step 5: Check cache status
    console.log('\n5️⃣ Cache status:');
    const cacheStatus = positionSignalService.getCacheStatus(testAddress);
    console.log('   Has cache:', cacheStatus.hasCache);
    console.log('   Trade count:', cacheStatus.tradeCount);
    console.log('   Last updated:', cacheStatus.lastUpdated);
    
    // Step 6: Test signal detection logic
    console.log('\n6️⃣ Testing signal detection logic...');
    console.log('Looking for SELL signals in particular...');
    
    const sellSignals = signals.filter(s => s.type === 'SELL');
    const buySignals = signals.filter(s => s.type === 'BUY');
    
    console.log(`BUY signals: ${buySignals.length}`);
    console.log(`SELL signals: ${sellSignals.length}`);
    
    if (sellSignals.length === 0) {
      console.log('⚠️  No SELL signals detected - this might be the issue!');
      console.log('Checking trade history for sales...');
      
      let totalSales = 0;
      analysis.tradeHistory.forEach(trade => {
        if (trade.sales && trade.sales.length > 0) {
          totalSales += trade.sales.length;
          console.log(`Trade ${trade.asset} has ${trade.sales.length} sales`);
        }
      });
      
      console.log(`Total sales found in trade history: ${totalSales}`);
    }
    
    // Step 7: Test with very recent date filter
    console.log('\n7️⃣ Testing with recent date filter (last 1 hour)...');
    const recentSignals = await positionSignalService.getNewPositionSignals(testAddress, new Date(Date.now() - 1 * 60 * 60 * 1000));
    console.log(`Recent signals (1 hour): ${recentSignals.length}`);
    
    console.log('\n🎯 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testPositionSignals().catch(console.error);
