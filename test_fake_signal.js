const { PrismaClient } = require('@prisma/client');
const zerionService = require('./src/services/zerionService');

const prisma = new PrismaClient();

async function testFakeSignal() {
  try {
    console.log('🧪 Testing fake signal generation...');
    console.log('');

    // Get the Vitalik.eth strategy
    const strategy = await prisma.strategy.findFirst({
      where: {
        name: {
          contains: 'Vitalik.eth'
        }
      }
    });

    if (!strategy) {
      console.log('❌ Strategy not found!');
      return;
    }

    console.log('📋 Strategy found:', strategy.name);
    console.log('   Wallet:', strategy.walletAddress);
    console.log('   Status:', strategy.isActive ? 'Active' : 'Inactive');
    console.log('   Last Checked:', strategy.lastChecked);
    console.log('   Allowed Tokens:', strategy.allowedTokens);
    console.log('');

    // Test fake signal generation
    console.log('🔍 Testing fake signal generation...');
    try {
      const fakeSignals = await zerionService.getNewTradesForSignal(strategy.walletAddress, strategy.lastChecked);
      console.log('✅ Fake signals generated:', fakeSignals.length);
      
      fakeSignals.forEach((signal, index) => {
        console.log(`   Signal ${index + 1}: ${signal.type} ${signal.amount} ${signal.token}`);
      });
      console.log('');

      if (fakeSignals.length === 0) {
        console.log('❌ No fake signals generated!');
        return;
      }

      // Test if signals would pass strategy filters
      console.log('🔍 Testing signal filters...');
      fakeSignals.forEach((signal, index) => {
        const isAllowed = Array.isArray(strategy.allowedTokens) && strategy.allowedTokens.includes(signal.token);
        console.log(`   Signal ${index + 1} (${signal.token}): ${isAllowed ? '✅ ALLOWED' : '❌ NOT ALLOWED'}`);
      });

      console.log('');
      console.log('🎯 Test completed!');
      console.log('📱 Now check the backend logs to see if strategy engine processes these signals');

    } catch (signalError) {
      console.error('❌ Signal generation failed:', signalError);
    }

  } catch (error) {
    console.error('❌ Test failed:', error?.response?.data || error?.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

testFakeSignal();
