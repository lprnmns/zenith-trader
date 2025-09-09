// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Create or update admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@zenithtrader.com' },
    update: { 
      password: adminPassword,
      role: 'ADMIN' 
    },
    create: {
      email: 'admin@zenithtrader.com',
      password: adminPassword,
      role: 'ADMIN'
    },
  });
  console.log('Admin user created/updated:', adminUser.email);

  // Create or update demo user
  const demoPassword = await bcrypt.hash('demo123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@zenithtrader.com' },
    update: { 
      password: demoPassword,
      role: 'USER' 
    },
    create: {
      email: 'demo@zenithtrader.com',
      password: demoPassword,
      role: 'USER'
    },
  });
  console.log('Demo user created/updated:', demoUser.email);

  // Seed SuggestedWallets with real whale addresses
  const suggestedWallets = [
    { 
      address: '0x3e3802b8fefd3103f85c192da4c1f1d6b2313e48', 
      name: 'Whale #1 - Wintermute Trading',
      riskLevel: 'High'
    },
    { 
      address: '0x8c5865689eabe45645fa034e53d0c9995dccb9c9', 
      name: 'Whale #2 - Jump Trading',
      riskLevel: 'High'
    },
    { 
      address: '0xc82b2e484b161d20eae386877d57c4e5807b5581', 
      name: 'Whale #3 - Alameda Research',
      riskLevel: 'Medium'
    }
  ];

  for (const wallet of suggestedWallets) {
    await prisma.suggestedWallet.upsert({
      where: { address: wallet.address },
      update: { 
        name: wallet.name,
        riskLevel: wallet.riskLevel,
        pnlPercent1d: Math.random() * 20 - 10,
        pnlPercent7d: Math.random() * 30 - 15,
        pnlPercent30d: Math.random() * 50 - 25,
        consistencyScore: Math.random() * 100,
        smartScore: Math.random() * 100,
        totalValue: Math.random() * 1000000
      },
      create: {
        address: wallet.address,
        name: wallet.name,
        riskLevel: wallet.riskLevel,
        pnlPercent1d: Math.random() * 20 - 10,
        pnlPercent7d: Math.random() * 30 - 15,
        pnlPercent30d: Math.random() * 50 - 25,
        consistencyScore: Math.random() * 100,
        smartScore: Math.random() * 100,
        totalValue: Math.random() * 1000000
      },
    });
  }
  console.log('Seeded SuggestedWallet records.');

  // Create some watched wallets for admin user
  const watchedWallets = [
    { address: '0xc82b2e484b161d20eae386877d57c4e5807b5581', description: 'Demo wallet' },
    { address: '0x1111111111111111111111111111111111111111', description: 'Watched A' },
    { address: '0x2222222222222222222222222222222222222222', description: 'Watched B' }
  ];

  for (const wallet of watchedWallets) {
    await prisma.watchedWallet.upsert({
      where: { 
        userId_address: {
          userId: adminUser.id,
          address: wallet.address
        }
      },
      update: { description: wallet.description },
      create: {
        userId: adminUser.id,
        address: wallet.address,
        description: wallet.description
      },
    });
  }
  console.log('Seeded WatchedWallet records.');

  // Optional: Create a demo strategy for admin
  const demoStrategy = await prisma.strategy.upsert({
    where: { walletAddress: '0xc82b2e484b161d20eae386877d57c4e5807b5581' },
    update: {},
    create: {
      name: 'Demo Strategy',
      walletAddress: '0xc82b2e484b161d20eae386877d57c4e5807b5581',
      okxApiKey: 'encrypted_key_placeholder',
      okxApiSecret: 'encrypted_secret_placeholder',
      okxPassphrase: 'encrypted_passphrase_placeholder',
      positionSize: 1000,
      leverage: 3,
      allowedTokens: ['BTC', 'ETH', 'ARB', 'OP'],
      isActive: false,
      userId: adminUser.id
    }
  });
  console.log('Demo strategy created.');

  // Create sample trades for the strategy
  if (demoStrategy) {
    const now = new Date();
    await prisma.trade.createMany({
      data: [
        { strategyId: demoStrategy.id, action: 'BUY', token: 'ETH', amount: 1200, status: 'Success', createdAt: new Date(now.getTime() - 1000 * 60 * 60) },
        { strategyId: demoStrategy.id, action: 'SELL', token: 'ARB', amount: 800, status: 'Failed', createdAt: new Date(now.getTime() - 1000 * 60 * 30) },
      ],
      skipDuplicates: true
    });
    console.log('Sample trades created.');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


