/*
  Warnings:

  - A unique constraint covering the columns `[userId,address]` on the table `WatchedWallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Strategy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `WatchedWallet` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."WatchedWallet_address_key";

-- AlterTable
ALTER TABLE "public"."Strategy" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."WatchedWallet" ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserNotification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "UserNotification_userId_idx" ON "public"."UserNotification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotification_userId_walletAddress_key" ON "public"."UserNotification"("userId", "walletAddress");

-- CreateIndex
CREATE INDEX "Strategy_userId_idx" ON "public"."Strategy"("userId");

-- CreateIndex
CREATE INDEX "WatchedWallet_userId_idx" ON "public"."WatchedWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchedWallet_userId_address_key" ON "public"."WatchedWallet"("userId", "address");

-- AddForeignKey
ALTER TABLE "public"."WatchedWallet" ADD CONSTRAINT "WatchedWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Strategy" ADD CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
