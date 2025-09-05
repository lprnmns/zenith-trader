/*
  Warnings:

  - You are about to drop the column `alias` on the `SuggestedWallet` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `SuggestedWallet` table. All the data in the column will be lost.
  - You are about to drop the column `pnl1M` on the `SuggestedWallet` table. All the data in the column will be lost.
  - You are about to drop the column `pnl3M` on the `SuggestedWallet` table. All the data in the column will be lost.
  - You are about to drop the column `pnl7D` on the `SuggestedWallet` table. All the data in the column will be lost.
  - You are about to drop the column `recentTrades` on the `SuggestedWallet` table. All the data in the column will be lost.
  - You are about to drop the column `risk` on the `SuggestedWallet` table. All the data in the column will be lost.
  - You are about to drop the column `winRate` on the `SuggestedWallet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."SuggestedWallet" DROP COLUMN "alias",
DROP COLUMN "category",
DROP COLUMN "pnl1M",
DROP COLUMN "pnl3M",
DROP COLUMN "pnl7D",
DROP COLUMN "recentTrades",
DROP COLUMN "risk",
DROP COLUMN "winRate",
ADD COLUMN     "consistencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "oneMonthPnlPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "riskLevel" TEXT NOT NULL DEFAULT 'Medium',
ADD COLUMN     "smartScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "winRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."WatchedWallet" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchedWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchedWallet_address_key" ON "public"."WatchedWallet"("address");
