// prisma/seed-admin.js
// NOT: Bu dosya sadece geliştirme ortamı için kullanılır.
// Üretim ortamında admin kullanıcıları Google OAuth ile oluşturulur.
const { PrismaClient } = require('@prisma/client');
const authService = require('../src/services/authService');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin user...');

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@gmail.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create admin user
    const result = await authService.register(
      'admin@gmail.com',
      'Kgkput_4896',
      'ADMIN'
    );

    if (result.success) {
      console.log('✅ Admin user created successfully:');
      console.log(`   Email: admin@gmail.com`);
      console.log(`   Password: Kgkput_4896`);
      console.log(`   Role: admin`);
      console.log(`   ID: ${result.user.id}`);
    } else {
      console.error('❌ Failed to create admin user:', result.error);
    }
  } catch (error) {
    console.error('❌ Seed error:', error);
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
