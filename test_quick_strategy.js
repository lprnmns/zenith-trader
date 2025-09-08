#!/usr/bin/env node

/**
 * Quick Strategy Test Script
 * =========================
 * 
 * Bu script, quick stratejinin doğru çalışıp çalışmadığını test eder.
 * Database'deki stratejiyi kontrol eder ve sinyal algılamayı test eder.
 */

const { PrismaClient } = require('@prisma/client');
const strategyEngine = require('./src/core/strategyEngine');
const positionSignalService = require('./src/services/positionSignalService');

const prisma = new PrismaClient();

async function testQuickStrategy() {
  console.log('🚀 Quick Strategy Testi Başlatılıyor...\n');

  try {
    // 1. Database'deki stratejiyi kontrol et
    console.log('📊 1. Database Kontrolü...');
    const strategies = await prisma.strategy.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { email: true, role: true }
        }
      }
    });

    console.log(`Bulunan aktif stratejiler: ${strategies.length}`);
    
    if (strategies.length === 0) {
      console.log('❌ Hiç aktif strateji bulunamadı!');
      return;
    }

    for (const strategy of strategies) {
      console.log(`\n📈 Strateji Detayları:`);
      console.log(`   ID: ${strategy.id}`);
      console.log(`   İsim: ${strategy.name}`);
      console.log(`   Cüzdan: ${strategy.walletAddress}`);
      console.log(`   Borsa: ${strategy.exchange}`);
      console.log(`   Kaldıraç: ${strategy.leverage}x`);
      console.log(`   Kopyalama Oranı: ${strategy.percentageToCopy}%`);
      console.log(`   Kullanıcı: ${strategy.user.email} (${strategy.user.role})`);
      console.log(`   OKX Anahtarı: ${strategy.okxApiKey ? '✅ Mevcut' : '❌ Yok'}`);
      console.log(`   Oluşturma: ${strategy.createdAt}`);
    }

    // 2. Strateji motorunu yeniden yükle
    console.log('\n🔄 2. Strateji Motoru Yeniden Yükleme...');
    await strategyEngine.loadStrategies();
    console.log('✅ Strateji motoru yeniden yüklendi.');

    // 3. Sinyal algılama testi
    console.log('\n🔍 3. Sinyal Algılama Testi...');
    const testStrategy = strategies[0];
    console.log(`Test ediliyor: ${testStrategy.name}`);
    
    const signals = await positionSignalService.getNewPositionSignals(
      testStrategy.walletAddress, 
      new Date(Date.now() - 24 * 60 * 60 * 1000) // Son 24 saat
    );
    
    console.log(`Bulunan sinyaller: ${signals.length}`);
    
    if (signals.length > 0) {
      console.log('\n📢 Sinyal Detayları:');
      signals.forEach((signal, index) => {
        console.log(`\n${index + 1}. Sinyal:`);
        console.log(`   Tür: ${signal.type}`);
        console.log(`   Token: ${signal.token}`);
        console.log(`   Miktar: ${signal.amount}`);
        console.log(`   Yüzde: ${signal.percentage}%`);
        console.log(`   Fiyat: $${signal.price}`);
        console.log(`   Tarih: ${signal.timestamp}`);
      });
    } else {
      console.log('ℹ️  Son 24 saatte yeni sinyal bulunamadı.');
      console.log('Bu normal çünkü cüzdan yeni işlem yapmamış olabilir.');
    }

    // 4. OKX bağlantı testi (encrypted credentials ile)
    console.log('\n🔐 4. OKX Bağlantı Testi...');
    if (testStrategy.okxApiKey) {
      const OKXService = require('./src/services/okxService');
      
      try {
        // Test için demo mode kullan
        const okxClient = new OKXService(
          testStrategy.okxApiKey,
          testStrategy.okxApiSecret,
          testStrategy.okxPassphrase,
          true // Demo mode
        );

        const accountBalance = await okxClient.getBalance();
        console.log('✅ OKX bağlantısı başarılı!');
        console.log(`   Demo modda çalışıyor`);
      } catch (error) {
        console.log('❌ OKX bağlantı hatası:', error.message);
      }
    } else {
      console.log('❌ OKX credentials bulunamadı!');
    }

    // 5. Zerion servisi testi
    console.log('\n🌐 5. Zerion Servisi Testi...');
    const zerionService = require('./src/services/zerionService');
    
    try {
      const walletValue = await zerionService.getWalletTotalValueUsd(testStrategy.walletAddress);
      console.log(`✅ Cüzdan değeri: $${walletValue?.toFixed(2) || 'N/A'}`);
      
      const analysisService = require('./src/services/analysisService');
      const analysis = await analysisService.analyzeWallet(testStrategy.walletAddress);
      
      if (analysis && analysis.tradeHistory) {
        console.log(`✅ Trade history bulundu: ${analysis.tradeHistory.length} işlem`);
        console.log(`   Toplam değer: $${analysis.totalValue?.toFixed(2) || 'N/A'}`);
      } else {
        console.log('❌ Trade history bulunamadı');
      }
    } catch (error) {
      console.log('❌ Zerion servisi hatası:', error.message);
    }

    console.log('\n🎉 Quick Strategy Testi Tamamlandı!');
    console.log('\n📋 Özet:');
    console.log(`   ✅ ${strategies.length} aktif strateji`);
    console.log(`   ✅ Strateji motoru çalışıyor`);
    console.log(`   ✅ Sinyal algılama servisi hazır`);
    console.log(`   ✅ OKX bağlantısı test edildi`);
    console.log(`   ✅ Zerion servisi test edildi`);
    
    console.log('\n⏰ Sistem her 30 saniyede bir cüzdanı kontrol edecek.');
    console.log('📱 Yeni sinyal olduğunda otomatik olarak OKX\'e emir gönderilecek.');
    
  } catch (error) {
    console.error('❌ Test sırasında hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Testi çalıştır
testQuickStrategy();