// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding process started...');

  try {
    // ÖNEMLİ ADIM: Mevcut tüm önerilen ve izlenen cüzdanları silerek temiz bir başlangıç yap.
    console.log('Deleting old suggested and watched wallets...');
    await prisma.$executeRaw`TRUNCATE TABLE "SuggestedWallet" RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "WatchedWallet" RESTART IDENTITY CASCADE`;
    console.log('Old data deleted.');

    // Create admin user using raw SQL
    console.log('Creating admin user...');
    await prisma.$executeRaw`
      INSERT INTO "User" (email, password, role, "isActive", "createdAt", "updatedAt") 
      VALUES ('admin@zenithtrader.com', '$2a$10$rOZXp7mGXmHWK7vJtxB7uO5D3Q7J8Y.rKJ5L9n8mJ4q8wW2x6v0Oi', 'ADMIN', true, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET 
        password = '$2a$10$rOZXp7mGXmHWK7vJtxB7uO5D3Q7J8Y.rKJ5L9n8mJ4q8wW2x6v0Oi',
        role = 'ADMIN',
        "isActive" = true,
        "updatedAt" = NOW()
    `;

    // Get admin user ID
    const adminUser = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'admin@zenithtrader.com' LIMIT 1`;
    const adminUserId = adminUser[0].id;

    console.log('Admin user created/updated with ID:', adminUserId);

    // Sadece ve sadece bu 3 cüzdanı ekle
    const walletsToSeed = [
      {
        address: '0x3e3802b8fefd3103f85c192da4c1f1d6b2313e48',
        name: 'Whale #1 - Wintermute',
        riskLevel: 'High'
      },
      {
        address: '0x8c5865689eabe45645fa034e53d0c9995dccb9c9',
        name: 'Whale #5 - Coinbase',
        riskLevel: 'Medium'
      },
      {
        address: '0xc82b2e484b161d20eae386877d57c4e5807b5581',
        name: 'Whale #3 - Alameda',
        riskLevel: 'Medium'
      }
    ];

    // Bu cüzdanları hem "izlenen" hem de "önerilen" listelerine ekleyelim
    console.log('Seeding new wallets...');
    for (const wallet of walletsToSeed) {
      // Add to watched wallets for admin user
      await prisma.$executeRaw`
        INSERT INTO "WatchedWallet" (address, "userId", description, "createdAt", "updatedAt") 
        VALUES (${wallet.address}, ${adminUserId}, ${`Watched ${wallet.name}`}, NOW(), NOW())
      `;
      
      // Add to suggested wallets
      await prisma.$executeRaw`
        INSERT INTO "SuggestedWallet" (address, name, "riskLevel", "pnlPercent1d", "pnlPercent7d", "pnlPercent30d", "pnlPercent180d", "pnlPercent365d", "openPositionsCount", "consistencyScore", "totalValue", "smartScore") 
        VALUES (
          ${wallet.address}, 
          ${wallet.name}, 
          ${wallet.riskLevel}, 
          ${Math.random() * 20 - 10}, 
          ${Math.random() * 30 - 15}, 
          ${Math.random() * 50 - 25}, 
          ${Math.random() * 60 - 30}, 
          ${Math.random() * 100 - 50}, 
          ${Math.floor(Math.random() * 10)}, 
          ${Math.random() * 100}, 
          ${Math.random() * 1000000},
          ${Math.random() * 100}
        )
      `;
    }
    
    console.log(`Seeding finished. ${walletsToSeed.length} wallets have been seeded.`);
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });