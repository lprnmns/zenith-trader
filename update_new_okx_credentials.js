const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateNewOKXCredentials() {
  try {
    console.log('🔧 Updating strategy with new OKX API credentials...');
    console.log('');
    
    // Update the Vitalik.eth Copy Strategy with new credentials
    const updatedStrategy = await prisma.strategy.updateMany({
      where: {
        name: {
          contains: 'Vitalik.eth'
        }
      },
      data: {
        okxApiKey: '82cf6d49-61d4-4bc0-80fa-d507e11688cd',
        okxApiSecret: 'D34E625EAF20941DA3665B25377A26E2',
        okxPassphrase: 'Kgkput_4896'
      }
    });

    console.log('✅ Strategy updated successfully!');
    console.log('');
    console.log('📋 New credentials:');
    console.log('   API Key: 82cf6d49-61d4-4bc0-80fa-d507e11688cd');
    console.log('   API Secret: D34E625EAF20941DA3665B25377A26E2');
    console.log('   Passphrase: Kgkput_4896');
    console.log('   Permissions: Read/Trade');
    console.log('   IP Restrictions: None');
    console.log('');
    console.log('🎯 Now restart the backend to test with new credentials!');

  } catch (error) {
    console.error('❌ Error updating strategy:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateNewOKXCredentials();
