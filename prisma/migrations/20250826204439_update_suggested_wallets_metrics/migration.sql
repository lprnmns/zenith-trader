/*
  Warnings:

  - You are about to drop the column `oneMonthPnlPercent` on the `SuggestedWallet` table. All the data in the column will be lost.
  - You are about to drop the column `winRatePercent` on the `SuggestedWallet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."SuggestedWallet" DROP COLUMN "oneMonthPnlPercent",
DROP COLUMN "winRatePercent",
ADD COLUMN     "openPositionsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pnlPercent180d" DOUBLE PRECISION,
ADD COLUMN     "pnlPercent1d" DOUBLE PRECISION,
ADD COLUMN     "pnlPercent30d" DOUBLE PRECISION,
ADD COLUMN     "pnlPercent365d" DOUBLE PRECISION,
ADD COLUMN     "pnlPercent7d" DOUBLE PRECISION,
ALTER COLUMN "smartScore" DROP NOT NULL,
ALTER COLUMN "smartScore" DROP DEFAULT;
