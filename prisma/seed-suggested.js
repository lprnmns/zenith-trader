const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Suggested Wallets...');

  try {
    // Önce eski verileri temizle
    await prisma.suggestedWallet.deleteMany({});
    console.log('Old suggested wallets deleted.');

    // 3 balina cüzdanını ekle
    const walletsToSeed = [
      {
        address: '0x3e3802b8fefd3103f85c192da4c1f1d6b2313e48',
        name: 'Whale #1 - Wintermute',
        riskLevel: 'High',
        pnlPercent1d: 5.2,
        pnlPercent7d: 12.8,
        pnlPercent30d: 25.4,
        pnlPercent180d: 45.7,
        pnlPercent365d: 78.9,
        openPositionsCount: 3,
        consistencyScore: 85.5,
        smartScore: 92.3,
        totalValue: 1250000
      },
      {
        address: '0x8c5865689eabe45645fa034e53d0c9995dccb9c9',
        name: 'Whale #5 - Coinbase',
        riskLevel: 'Medium',
        pnlPercent1d: 2.1,
        pnlPercent7d: 8.5,
        pnlPercent30d: 15.2,
        pnlPercent180d: 28.9,
        pnlPercent365d: 52.3,
        openPositionsCount: 2,
        consistencyScore: 78.2,
        smartScore: 85.7,
        totalValue: 890000
      },
      {
        address: '0xc82b2e484b161d20eae386877d57c4e5807b5581',
        name: 'Whale #3 - Alameda',
        riskLevel: 'Medium',
        pnlPercent1d: -1.2,
        pnlPercent7d: 6.7,
        pnlPercent30d: 18.9,
        pnlPercent180d: 35.4,
        pnlPercent365d: 67.8,
        openPositionsCount: 4,
        consistencyScore: 72.8,
        smartScore: 79.4,
        totalValue: 1100000
      }
    ];

    for (const wallet of walletsToSeed) {
      await prisma.suggestedWallet.create({
        data: wallet
      });
      console.log(`Added: ${wallet.name}`);
    }

    console.log(`Successfully seeded ${walletsToSeed.length} suggested wallets.`);
    
    // Verify
    const count = await prisma.suggestedWallet.count();
    console.log(`Total suggested wallets in database: ${count}`);

  } catch (error) {
    console.error('Error seeding suggested wallets:', error);
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