const { PrismaClient } = require('@prisma/client');
const { encrypt, decrypt } = require('./src/utils/encryption');
const OKXService = require('./src/services/okxService');

const prisma = new PrismaClient();

async function testOKXConnection() {
  try {
    console.log('🔍 Mevcut strateji bilgileri alınıyor...');
    
    const strategy = await prisma.strategy.findUnique({
      where: { id: 2 }
    });

    if (!strategy) {
      console.log('❌ Strateji bulunamadı');
      return;
    }

    console.log('📋 Strateji:', strategy.name);
    
    // Şifrelenmiş bilgileri çöz
    const apiKey = decrypt(strategy.okxApiKey);
    const apiSecret = decrypt(strategy.okxApiSecret);
    const passphrase = decrypt(strategy.okxPassphrase);
    
    console.log('🔓 Çözülmüş bilgiler:');
    console.log('ApiKey:', apiKey);
    console.log('ApiSecret:', apiSecret ? '***' : 'BOŞ');
    console.log('Passphrase:', passphrase);
    
    console.log('\n🧪 OKX servisi test ediliyor...');
    
    // Demo modda test
    const okxService = new OKXService(apiKey, apiSecret, passphrase, true);
    
    try {
      console.log('💰 Bakiye bilgisi alınıyor...');
      const balance = await okxService.getBalance();
      console.log('✅ Demo modda bakiye bilgisi alındı!');
      console.log('Bakiye:', JSON.stringify(balance, null, 2));
    } catch (error) {
      console.error('❌ Demo modda hata:', error.message);
      console.error('Detay:', error.response?.data || error.message);
      
      // Canlı modda deneyelim
      console.log('\n🔄 Canlı modda deneniyor...');
      const liveService = new OKXService(apiKey, apiSecret, passphrase, false);
      
      try {
        const liveBalance = await liveService.getBalance();
        console.log('✅ Canlı modda bakiye bilgisi alındı!');
        console.log('Bakiye:', JSON.stringify(liveBalance, null, 2));
      } catch (liveError) {
        console.error('❌ Canlı modda da hata:', liveError.message);
        console.error('Detay:', liveError.response?.data || liveError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Genel hata:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testOKXConnection();