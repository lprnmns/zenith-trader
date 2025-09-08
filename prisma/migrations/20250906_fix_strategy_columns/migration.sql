-- Add missing columns to Strategy table
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "exchange" VARCHAR(255) DEFAULT 'OKX';
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "copyMode" VARCHAR(255) DEFAULT 'Perpetual';
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "marginMode" VARCHAR(255) DEFAULT 'cross';
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "currentPnL" FLOAT DEFAULT 0;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "totalPnL" FLOAT DEFAULT 0;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "tradesCount" INTEGER DEFAULT 0;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "sizingMethod" VARCHAR(255) DEFAULT 'Fixed Amount';
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "amountPerTrade" FLOAT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "percentageToCopy" FLOAT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "stopLoss" FLOAT;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "dailyLimit" INTEGER;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Strategy" ADD COLUMN IF NOT EXISTS "lastChecked" TIMESTAMP DEFAULT NOW();

-- Create PushSubscription table
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "endpoint" VARCHAR(1000) NOT NULL UNIQUE,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "keys" JSONB,
    "userAgent" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "lastUsed" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes for PushSubscription
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");