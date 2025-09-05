-- CreateTable
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "googleEmail" TEXT,
ADD COLUMN     "isActive" BOOLEAN DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ALTER COLUMN     "role" DROP DEFAULT,
ALTER COLUMN     "role" TYPE "Role" USING "role"::"Role",
ALTER COLUMN     "role" SET DEFAULT 'USER',
ALTER COLUMN     "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE INDEX "User_googleEmail_key" ON "User"("googleEmail");

-- Add default value for existing users where role is NULL
UPDATE "User" SET "role" = 'USER' WHERE "role" IS NULL;