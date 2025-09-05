const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// API key şifreleme fonksiyonu
function encryptApiKey(text) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

async function testOKXConfig() {
  console.log('🧪 OKX Config Test Başlıyor...\n');

  try {
    // 1. Mevcut config'i kontrol et
    console.log('1️⃣ Mevcut OKX config kontrol ediliyor...');
    const existingConfig = await prisma.copyTradingConfig.findFirst();
    
    if (existingConfig) {
      console.log('✅ Mevcut config bulundu, güncelleniyor...');
      await prisma.copyTradingConfig.update({
        where: { id: existingConfig.id },
        data: {
          okxApiKey: encryptApiKey('242a9a80-50a4-4fcf-8116-f8ee12e4ecc9'),
          okxSecretKey: encryptApiKey('9B8C077868333D9EF2FD550B41777656'),
          okxPassphrase: encryptApiKey('Kgkput_4896'),
          isActive: true,
          updatedAt: new Date()
        }
      });
    } else {
      console.log('📝 Yeni config oluşturuluyor...');
      await prisma.copyTradingConfig.create({
        data: {
          okxApiKey: encryptApiKey('242a9a80-50a4-4fcf-8116-f8ee12e4ecc9'),
          okxSecretKey: encryptApiKey('9B8C077868333D9EF2FD550B41777656'),
          okxPassphrase: encryptApiKey('Kgkput_4896'),
          isActive: true
        }
      });
    }

    console.log('✅ OKX config başarıyla kaydedildi');

    // 2. Config'i doğrula
    console.log('\n2️⃣ Config doğrulanıyor...');
    const config = await prisma.copyTradingConfig.findFirst({
      where: { isActive: true }
    });

    if (config) {
      console.log('✅ Aktif config bulundu');
      console.log('Config ID:', config.id);
      console.log('Oluşturulma:', config.createdAt);
      console.log('Güncellenme:', config.updatedAt);
    } else {
      throw new Error('Aktif config bulunamadı');
    }

  } catch (error) {
    console.error('❌ OKX config test hatası:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testOKXConfig();
