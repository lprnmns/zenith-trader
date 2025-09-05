const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// test_real_signals.js'den alınan test sinyalleri
const MOCK_SIGNALS = [
  // LONG Sinyalleri (3x)
  { 
    type: 'BUY', 
    token: 'ETH', 
    amount: 6018.21, 
    percentage: 7.46, 
    leverage: 3, 
    id: 'buy-15',
    date: '2025-08-26',
    description: 'ETH alım işlemi - Cüzdanın %7.46\'sı kadar pozisyon'
  },
  { 
    type: 'BUY', 
    token: 'AVAX', 
    amount: 6018.21, 
    percentage: 7.46, 
    leverage: 3, 
    id: 'buy-16',
    date: '2025-08-26',
    description: 'AVAX alım işlemi - Cüzdanın %7.46\'sı kadar pozisyon'
  },
  { 
    type: 'BUY', 
    token: 'MNT', 
    amount: 5004.01, 
    percentage: 6.20, 
    leverage: 3, 
    id: 'buy-14',
    date: '2025-08-05',
    description: 'MNT alım işlemi - Cüzdanın %6.20\'si kadar pozisyon'
  },
  { 
    type: 'BUY', 
    token: 'WBTC', 
    amount: 40035.92, 
    percentage: 49.63, 
    leverage: 3, 
    id: 'buy-13',
    date: '2025-07-04',
    description: 'WBTC büyük alım işlemi - Cüzdanın %49.63\'ü kadar pozisyon'
  },
  { 
    type: 'BUY', 
    token: 'WBTC', 
    amount: 5000.75, 
    percentage: 6.20, 
    leverage: 3, 
    id: 'buy-12',
    date: '2025-06-30',
    description: 'WBTC alım işlemi - Cüzdanın %6.20\'si kadar pozisyon'
  },
  
  // SHORT Sinyalleri (1x)
  { 
    type: 'SELL', 
    token: 'MNT', 
    amount: 4961.04, 
    percentage: 6.15, 
    leverage: 1, 
    id: 'buy-14-sale-2025-08-06',
    date: '2025-08-06',
    description: 'MNT satış işlemi - Cüzdanın %6.15\'i kadar SHORT pozisyon'
  },
  { 
    type: 'SELL', 
    token: 'WBTC', 
    amount: 3802.94, 
    percentage: 4.71, 
    leverage: 1, 
    id: 'buy-13-sale-2025-07-13',
    date: '2025-07-13',
    description: 'WBTC kısmi satış işlemi - Cüzdanın %4.71\'i kadar SHORT pozisyon'
  },
  { 
    type: 'SELL', 
    token: 'WBTC', 
    amount: 5437.74, 
    percentage: 6.74, 
    leverage: 1, 
    id: 'buy-12-sale-2025-07-13',
    date: '2025-07-13',
    description: 'WBTC satış işlemi - Cüzdanın %6.74\'ü kadar SHORT pozisyon'
  }
];

async function addMockSignals() {
  console.log('🧪 Mock Sinyaller Database\'e Ekleniyor...\n');

  const testWalletAddress = '0xc82b2e484b161d20eae386877d57c4e5807b5581';

  try {
    // 1. Mevcut sinyalleri temizle (test için)
    console.log('1️⃣ Mevcut test sinyalleri temizleniyor...');
    await prisma.positionSignal.deleteMany({
      where: { walletAddress: testWalletAddress }
    });
    console.log('✅ Mevcut sinyaller temizlendi');

    // 2. Mock sinyalleri ekle
    console.log('\n2️⃣ Mock sinyaller ekleniyor...');
    const addedSignals = [];

    for (const signal of MOCK_SIGNALS) {
      // Fiyat bilgisini simüle et (gerçek fiyatlar kullanılacak)
      const mockPrice = signal.token === 'WBTC' ? 109000 : 
                       signal.token === 'ETH' ? 4450 : 
                       signal.token === 'AVAX' ? 24 : 
                       signal.token === 'MNT' ? 0.5 : 1;

      const addedSignal = await prisma.positionSignal.create({
        data: {
          walletAddress: testWalletAddress,
          signalType: signal.type,
          token: signal.token,
          amount: signal.amount,
          percentage: signal.percentage,
          price: mockPrice,
          timestamp: new Date(signal.date),
          processed: false
        }
      });

      addedSignals.push(addedSignal);
      console.log(`✅ ${signal.type} ${signal.token} sinyali eklendi (ID: ${addedSignal.id})`);
    }

    console.log(`\n🎉 Toplam ${addedSignals.length} sinyal başarıyla eklendi`);

    // 3. Eklenen sinyalleri listele
    console.log('\n3️⃣ Eklenen sinyaller:');
    const signals = await prisma.positionSignal.findMany({
      where: { walletAddress: testWalletAddress },
      orderBy: { timestamp: 'desc' }
    });

    signals.forEach((signal, index) => {
      console.log(`   ${index + 1}. ${signal.signalType} ${signal.token} - ${signal.percentage}% - $${signal.price} - ${signal.timestamp.toLocaleDateString()}`);
    });

    // 4. Copy trading için hazır olduğunu belirt
    console.log('\n✅ Mock sinyaller hazır! Copy trading engine bu sinyalleri işleyebilir.');

  } catch (error) {
    console.error('❌ Mock sinyal ekleme hatası:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addMockSignals();
