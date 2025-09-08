const { PrismaClient } = require('@prisma/client');
const { encrypt } = require('./src/utils/encryption');

const prisma = new PrismaClient();

async function updateOKXCredentials() {
  try {
    // Yeni OKX bilgileri
    const newApiKey = '82cf6d49-61d4-4bc0-80fa-d507e11688cd';
    const newApiSecret = 'D34E625EAF20941DA3665B25377A26E2';
    const newPassphrase = 'Kgkput_4896'; // Doğru passphrase
    
    console.log('🔐 Yeni OKX bilgileri:');
    console.log('ApiKey:', newApiKey);
    console.log('ApiSecret:', newApiSecret);
    console.log('Passphrase:', newPassphrase);
    
    console.log('\n🔐 Bilgiler şifreleniyor...');
    
    const encryptedApiKey = encrypt(newApiKey);
    const encryptedApiSecret = encrypt(newApiSecret);
    const encryptedPassphrase = encrypt(newPassphrase);
    
    console.log('✅ Bilgiler şifrelendi');
    
    // Stratejiyi güncelle
    const updatedStrategy = await prisma.strategy.update({
      where: { id: 2 },
      data: {
        okxApiKey: encryptedApiKey,
        okxApiSecret: encryptedApiSecret,
        okxPassphrase: encryptedPassphrase
      }
    });
    
    console.log('🎉 OKX bilgileri başarıyla güncellendi!');
    console.log('📋 Güncellenen Strateji:', updatedStrategy.name);
    
    // Test için
    const OKXService = require('./src/services/okxService');
    
    console.log('\n🧪 OKX bağlantısı test ediliyor...');
    const okxService = new OKXService(newApiKey, newApiSecret, newPassphrase, false); // Canlı mod
    
    try {
      console.log('💰 Bakiye bilgisi alınıyor...');
      const balance = await okxService.getBalance();
      console.log('✅ Bağlantı başarılı!');
      console.log('Bakiye:', JSON.stringify(balance, null, 2));
    } catch (error) {
      console.error('❌ Bağlantı hatası:', error.message);
      console.error('Detaylı hata:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Güncelleme hatası:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateOKXCredentials();