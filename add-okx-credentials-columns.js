const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addOKXCredentialsColumns() {
  try {
    console.log('OKX credentials column\'ları ekleniyor...');
    
    // OKX credential column'larını ekle
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "okxApiKey" TEXT,
      ADD COLUMN IF NOT EXISTS "okxApiSecret" TEXT,
      ADD COLUMN IF NOT EXISTS "okxPassphrase" TEXT
    `;
    
    console.log('OKX credentials column\'ları başarıyla eklendi!');
    
  } catch (error) {
    console.error('Column ekleme hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addOKXCredentialsColumns();