const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPushSubscriptionTable() {
  try {
    console.log('PushSubscription tablosu oluşturuluyor...');
    
    // Tabloyu oluştur
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "endpoint" TEXT NOT NULL UNIQUE,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "keys" JSONB NOT NULL,
        "userAgent" TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "lastUsed" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Foreign key constraint ekle
    await prisma.$executeRaw`
      ALTER TABLE "push_subscriptions" 
      ADD CONSTRAINT "push_subscriptions_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    `;
    
    // Index ekle
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions"("userId")
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "push_subscriptions_isActive_idx" ON "push_subscriptions"("isActive")
    `;
    
    console.log('PushSubscription tablosu başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('Tablo oluşturma hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPushSubscriptionTable();