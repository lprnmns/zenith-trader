-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "okxApiKey" TEXT,
ADD COLUMN     "okxApiSecret" TEXT,
ADD COLUMN     "okxPassphrase" TEXT;

-- CreateTable
CREATE TABLE "public"."UpgradeRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "contactInfo" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpgradeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpgradeRequest_userId_createdAt_idx" ON "public"."UpgradeRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."UpgradeRequest" ADD CONSTRAINT "UpgradeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
