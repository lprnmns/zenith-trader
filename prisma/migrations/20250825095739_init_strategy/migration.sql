-- CreateTable
CREATE TABLE "public"."Strategy" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "okxApiKey" TEXT NOT NULL,
    "okxApiSecret" TEXT NOT NULL,
    "okxPassphrase" TEXT NOT NULL,
    "positionSize" DOUBLE PRECISION NOT NULL,
    "leverage" INTEGER NOT NULL DEFAULT 5,
    "allowedTokens" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_walletAddress_key" ON "public"."Strategy"("walletAddress");
