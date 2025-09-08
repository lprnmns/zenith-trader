-- PushSubscription tablosunu oluştur
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
);

-- Foreign key constraint ekle
ALTER TABLE "push_subscriptions" 
ADD CONSTRAINT "push_subscriptions_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Index ekle
CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "push_subscriptions_isActive_idx" ON "push_subscriptions"("isActive");