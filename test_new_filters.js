// Test script for updated AlphaFinder with new filters
require('dotenv').config();
const alphaFinder = require('./src/workers/alphaFinder');

async function testNewFilters() {
  console.log('🧪 Testing AlphaFinder with updated filters...');
  console.log('📋 Updated with Real PnL Calculation:');
  console.log('  💰 Portfolio: $50,000+ (down from $100K)');
  console.log('  🔄 Activity: 4+ trades in last 30 days');
  console.log('  📈 Performance: CUSTOM PnL with Coingecko fallback');
  console.log('  🎯 Token holders: 200 per token');
  console.log('  🎯 Expected result: ~34 wallets with real PnL data');
  console.log('');
  
  try {
    await alphaFinder.runOnce();
    console.log('✅ AlphaFinder with new filters completed successfully!');
  } catch (error) {
    console.error('❌ AlphaFinder test failed:', error.message);
  }
}

testNewFilters();
