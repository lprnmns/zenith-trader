const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateStrategyWithCorrectSecret() {
  try {
    console.log('🔧 Updating strategy with correct OKX Secret Key...');
    
    // Update the Vitalik.eth Copy Strategy with correct credentials
    const updatedStrategy = await prisma.strategy.updateMany({
      where: {
        name: {
          contains: 'Vitalik.eth'
        }
      },
      data: {
        okxApiKey: '044e2fb0-6a02-4874-853f-2b4fad9dd563',
        okxApiSecret: '7BB641F2FCC9DF79D83BE0968C1EDOFE', // ✅ CORRECT Secret Key
        okxPassphrase: 'Kgkput_4896'
      }
    });

    console.log('✅ Strategy updated successfully!');
    console.log('');
    console.log('📋 New credentials:');
    console.log('   API Key: 044e2fb0-6a02-4874-853f-2b4fad9dd563');
    console.log('   API Secret: 7BB641F2FCC9DF79D83BE0968C1EDOFE ✅');
    console.log('   Passphrase: Kgkput_4896');
    console.log('');
    console.log('🎯 Now restart the backend to test with correct credentials!');

  } catch (error) {
    console.error('❌ Error updating strategy:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStrategyWithCorrectSecret();
