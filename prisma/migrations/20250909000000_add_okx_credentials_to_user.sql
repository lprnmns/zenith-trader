-- Add OKX credentials to User model
ALTER TABLE "User" ADD COLUMN "okxApiKey" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN "okxApiSecret" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN "okxPassphrase" VARCHAR(255);