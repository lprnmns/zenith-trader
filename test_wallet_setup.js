const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWalletSetup() {
  console.log('🧪 Test Wallet Setup Başlıyor...\n');

  try {
    // 1. Test kullanıcısı oluştur (eğer yoksa)
    console.log('1️⃣ Test kullanıcısı kontrol ediliyor...');
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@zenith.com' }
    });

    if (!testUser) {
      console.log('📝 Test kullanıcısı oluşturuluyor...');
      testUser = await prisma.user.create({
        data: {
          email: 'test@zenith.com',
          password: 'hashedpassword123',
          role: 'user'
        }
      });
      console.log('✅ Test kullanıcısı oluşturuldu');
    } else {
      console.log('✅ Test kullanıcısı zaten mevcut');
    }

    // 2. Test wallet'ını bildirim listesine ekle
    console.log('\n2️⃣ Test wallet bildirim listesine ekleniyor...');
    const testWalletAddress = '0xc82b2e484b161d20eae386877d57c4e5807b5581';
    
    const existingNotification = await prisma.userWalletNotification.findFirst({
      where: {
        userId: testUser.id,
        walletAddress: testWalletAddress
      }
    });

    if (!existingNotification) {
      console.log('📝 Test wallet bildirimi ekleniyor...');
      await prisma.userWalletNotification.create({
        data: {
          userId: testUser.id,
          walletAddress: testWalletAddress,
          isActive: true
        }
      });
      console.log('✅ Test wallet bildirimi eklendi');
    } else {
      console.log('✅ Test wallet bildirimi zaten mevcut');
    }

    // 3. Durumu kontrol et
    console.log('\n3️⃣ Setup durumu kontrol ediliyor...');
    const notifications = await prisma.userWalletNotification.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    console.log(`📊 Toplam aktif bildirim: ${notifications.length}`);
    notifications.forEach(n => {
      console.log(`   - ${n.walletAddress} (${n.user.email})`);
    });

    // 4. Copy trading config kontrolü
    console.log('\n4️⃣ Copy trading config kontrol ediliyor...');
    const config = await prisma.copyTradingConfig.findFirst({
      where: { isActive: true }
    });

    if (config) {
      console.log('✅ Aktif copy trading config mevcut');
      console.log('Config ID:', config.id);
    } else {
      console.log('❌ Aktif copy trading config bulunamadı');
    }

  } catch (error) {
    console.error('❌ Test wallet setup hatası:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWalletSetup();
