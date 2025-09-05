const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateDemoCredentials() {
  try {
    console.log('🔧 Updating strategy with DEMO trading API credentials...');
    console.log('');
    
    // Update the Vitalik.eth Copy Strategy with demo credentials
    const updatedStrategy = await prisma.strategy.updateMany({
      where: {
        name: {
          contains: 'Vitalik.eth'
        }
      },
      data: {
        okxApiKey: '242a9a80-50a4-4fcf-8116-f8ee12e4ecc9',
        okxApiSecret: '9B8C077868333D9EF2FD550B41777656',
        okxPassphrase: 'Kgkput_4896'
      }
    });

    console.log('✅ Strategy updated successfully!');
    console.log('');
    console.log('📋 DEMO Trading credentials:');
    console.log('   API Key: 242a9a80-50a4-4fcf-8116-f8ee12e4ecc9');
    console.log('   API Secret: 9B8C077868333D9EF2FD550B41777656');
    console.log('   Passphrase: Kgkput_4896');
    console.log('   API Name: copy-demo');
    console.log('   Permissions: Read/Trade');
    console.log('   IP Restrictions: None');
    console.log('');
    console.log('🎯 Now restart the backend to test with DEMO credentials!');

  } catch (error) {
    console.error('❌ Error updating strategy:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDemoCredentials();
