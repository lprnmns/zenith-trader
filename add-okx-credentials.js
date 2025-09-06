const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addOKXCredentials() {
  try {
    console.log('Adding OKX credentials columns to User table...');
    
    // Check if columns already exist
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "okxApiKey" VARCHAR(255)`;
      console.log('Added okxApiKey column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('okxApiKey column already exists');
      } else {
        throw error;
      }
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "okxApiSecret" VARCHAR(255)`;
      console.log('Added okxApiSecret column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('okxApiSecret column already exists');
      } else {
        throw error;
      }
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "okxPassphrase" VARCHAR(255)`;
      console.log('Added okxPassphrase column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('okxPassphrase column already exists');
      } else {
        throw error;
      }
    }
    
    console.log('OKX credentials columns added successfully!');
    
  } catch (error) {
    console.error('Error adding OKX credentials columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addOKXCredentials();