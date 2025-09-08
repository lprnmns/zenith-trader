const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin user...');

  try {
    // Admin kullanıcısını oluştur veya güncelle
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@zenithtrader.com' },
      update: { 
        password: adminPassword,
        role: 'ADMIN',
        isActive: true
      },
      create: {
        email: 'admin@zenithtrader.com',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true
      },
    });

    console.log('Admin user created/updated:', adminUser.email);
    console.log('User ID:', adminUser.id);
    console.log('Role:', adminUser.role);

  } catch (error) {
    console.error('Error creating admin user:', error);
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