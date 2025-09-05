-- CreateTable
CREATE TABLE "public"."copy_trading_configs" (
    "id" SERIAL NOT NULL,
    "okxApiKey" TEXT NOT NULL,
    "okxSecretKey" TEXT NOT NULL,
    "okxPassphrase" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copy_trading_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_wallet_notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_wallet_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."position_signals" (
    "id" SERIAL NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "percentage" DECIMAL(10,4) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."copy_trades" (
    "id" SERIAL NOT NULL,
    "signalId" INTEGER NOT NULL,
    "okxOrderId" TEXT,
    "status" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "copy_trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_wallet_notifications_userId_idx" ON "public"."user_wallet_notifications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallet_notifications_userId_walletAddress_key" ON "public"."user_wallet_notifications"("userId", "walletAddress");

-- CreateIndex
CREATE INDEX "position_signals_walletAddress_timestamp_idx" ON "public"."position_signals"("walletAddress", "timestamp");

-- CreateIndex
CREATE INDEX "position_signals_processed_idx" ON "public"."position_signals"("processed");

-- CreateIndex
CREATE INDEX "copy_trades_signalId_idx" ON "public"."copy_trades"("signalId");

-- CreateIndex
CREATE INDEX "copy_trades_status_idx" ON "public"."copy_trades"("status");

-- AddForeignKey
ALTER TABLE "public"."user_wallet_notifications" ADD CONSTRAINT "user_wallet_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."copy_trades" ADD CONSTRAINT "copy_trades_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "public"."position_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
