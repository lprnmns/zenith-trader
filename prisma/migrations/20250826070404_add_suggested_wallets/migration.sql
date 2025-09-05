-- CreateTable
CREATE TABLE "public"."SuggestedWallet" (
    "id" SERIAL NOT NULL,
    "alias" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "pnl7D" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnl1M" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnl3M" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "risk" TEXT NOT NULL,
    "recentTrades" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestedWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuggestedWallet_address_key" ON "public"."SuggestedWallet"("address");
