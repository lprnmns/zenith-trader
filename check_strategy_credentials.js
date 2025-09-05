const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStrategyCredentials() {
  try {
    console.log('🔍 Checking strategy credentials in database...');
    console.log('');

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

    console.log('📋 Strategy credentials:');
    console.log('   Name:', strategy.name);
    console.log('   API Key:', strategy.okxApiKey);
    console.log('   API Secret:', strategy.okxApiSecret);
    console.log('   Passphrase:', strategy.okxPassphrase);
    console.log('   Is Active:', strategy.isActive);
    console.log('');

    // Check if credentials match what we expect
    const expectedSecret = '7BB641F2FCC9DF79D83BE0968C1EDOFE';
    const secretMatches = strategy.okxApiSecret === expectedSecret;
    
    console.log('🔍 Credential check:');
    console.log('   Expected Secret:', expectedSecret);
    console.log('   Actual Secret:  ', strategy.okxApiSecret);
    console.log('   Secret matches: ', secretMatches ? '✅ YES' : '❌ NO');
    console.log('');

    if (!secretMatches) {
      console.log('❌ PROBLEM: Strategy still has old credentials!');
      console.log('   Need to restart backend after credential update.');
    } else {
      console.log('✅ Credentials look correct!');
      console.log('   The "Invalid Sign" error might be due to:');
      console.log('   1. OKX API permissions');
      console.log('   2. Demo trading mode issues');
      console.log('   3. API key restrictions');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStrategyCredentials();
