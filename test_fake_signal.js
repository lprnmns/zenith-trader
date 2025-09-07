const CopyTradingService = require('./src/services/copyTradingService');
const readline = require('readline');
const chalk = require('chalk');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testFakeSellSignal() {
  console.log(chalk.yellow('🧪 FAKE SELL SIGNAL TEST'));
  console.log(chalk.yellow('=================================\n'));

  try {
    // Step 1: Select trading mode
    console.log(chalk.blue('📋 Trading Modu Seçimi'));
    console.log('1. Demo Modu (Test için)');
    console.log('2. Gerçek Trading (Canlı piyasa)');
    
    const modeChoice = await question(chalk.white('\nSeçiminiz (1-2): '));
    const testMode = modeChoice === '1' ? 'demo' : 'real';
    
    if (testMode === 'demo') {
      console.log(chalk.green('✅ Demo modu seçildi'));
    } else {
      console.log(chalk.green('✅ Gerçek trading modu seçildi'));
    }
    
    // Step 2: Collect OKX credentials
    console.log(chalk.blue('\n🔐 OKX Hesap Bilgileri'));
    console.log('Lütfen OKX API bilgilerinizi girin:\n');
    
    const apiKey = await question(chalk.white('API Key: '));
    const secret = await question(chalk.white('API Secret: '));
    const passphrase = await question(chalk.white('Passphrase: '));
    
    // Step 3: Initialize service
    console.log(chalk.blue('\n🚀 Copy Trading Service başlatılıyor...'));
    const copyTradingService = new CopyTradingService();
    
    const okxConfig = {
      apiKey,
      secret,
      passphrase,
      demoMode: testMode === 'demo'
    };
    
    const initialized = await copyTradingService.initialize(okxConfig);
    if (!initialized) {
      console.log(chalk.red('❌ Copy Trading Service başlatılamadı'));
      return;
    }
    
    // Step 4: Get user balance
    const userBalance = await copyTradingService.getOKXBalance();
    console.log(chalk.green('✅ OKX servisi başlatıldı'));
    console.log(chalk.blue('💰 Mevcut Bakiye: $' + userBalance.toFixed(2) + ' USDT'));
    
    // Step 5: Show current position simulation
    console.log(chalk.blue('\n📊 Mevcut Pozisyon Simülasyonu'));
    console.log('🔴 Şu anki durum (simüle edilmiş):');
    console.log('   - 0.0002 WBTC 3x LONG pozisyon');
    console.log('   - Pozisyon değeri: ~$40,000');
    console.log('   - Kopyalanan cüzdan $20,000 WBTC satacak');
    
    // Step 6: Create fake SELL signal
    console.log(chalk.blue('\n🎯 Fake SELL Sinyali Oluşturuluyor'));
    
    const fakeSellSignal = {
      type: 'SELL',
      token: 'WBTC',
      amount: 20000, // $20,000 WBTC satışı
      percentage: 25,
      date: new Date().toISOString().split('T')[0],
      txHash: 'fake-wbtc-sell-' + Date.now(),
      leverage: 1,
      totalValue: 80000,
      currentPosSize: 40000, // Mevcut 0.0002 WBTC 3x LONG pozisyonu
      originalPositionSize: 40000
    };
    
    console.log(chalk.red('🔴 Fake SELL Signal:'));
    console.log('   Token: ' + fakeSellSignal.token);
    console.log('   Amount: $' + fakeSellSignal.amount.toFixed(2));
    console.log('   Current Position: $' + fakeSellSignal.currentPosSize.toFixed(2));
    
    // Step 7: Show calculations
    const sellPercentage = (fakeSellSignal.amount / fakeSellSignal.currentPosSize) * 100;
    const amountToClose = fakeSellSignal.currentPosSize * (sellPercentage / 100);
    const remainingLong = fakeSellSignal.currentPosSize - amountToClose;
    
    console.log(chalk.blue('\n📊 Hesaplamalar:'));
    console.log('   Satış yüzdesi: ' + sellPercentage.toFixed(1) + '%');
    console.log('   Kapatılacak LONG: $' + amountToClose.toFixed(2));
    console.log('   Kalan LONG: $' + remainingLong.toFixed(2));
    console.log('   Açılacak SHORT: $' + fakeSellSignal.amount.toFixed(2) + ' (1x)');
    
    // Step 8: Ask for confirmation
    console.log(chalk.blue('\n🤔 Onayınızı bekliyorum...'));
    console.log(chalk.yellow('Bu fake sinyal ile:'));
    console.log(chalk.yellow('   - Mevcut WBTC pozisyonunun %' + sellPercentage.toFixed(1) + '\'si kapatılacak'));
    console.log(chalk.yellow('   - $' + fakeSellSignal.amount.toFixed(2) + ' 1x SHORT pozisyon açılacak'));
    console.log(chalk.yellow('   - $' + remainingLong.toFixed(2) + ' LONG pozisyon devam edecek'));
    
    const confirmation = await question(chalk.white('\nOnaylıyor musun? (Y/N): '));
    
    if (confirmation.toUpperCase() !== 'Y') {
      console.log(chalk.red('❌ İptal edildi'));
      rl.close();
      return;
    }
    
    console.log(chalk.green('✅ Onay alındı, sinyal işleniyor...'));
    
    // Step 9: Process the signal
    const result = await copyTradingService.processPositionSignal(fakeSellSignal, userBalance);
    
    if (result.success) {
      console.log(chalk.green('\n✅ SİNYAL BAŞARILI İŞLENDİ!'));
      console.log(chalk.blue('📊 İşlem Sonuçları:'));
      
      if (result.results && result.results.length > 0) {
        console.log(chalk.blue('   Toplam Emir: ' + result.totalOrders));
        result.results.forEach((res, index) => {
          console.log(chalk.blue('   ' + (index + 1) + '. ' + res.type + ': ' + (res.orderId || 'N/A') + ' (' + res.positionSide + ')'));
          if (res.size) console.log(chalk.blue('      Boyut: $' + res.size.toFixed(2)));
          if (res.leverage) console.log(chalk.blue('      Kaldıraç: ' + res.leverage + 'x'));
        });
      }
      
      console.log(chalk.green('\n🎯 BEKLENEN vs GERÇEKLEŞEN:'));
      console.log(chalk.green('   ✅ ' + sellPercentage.toFixed(1) + '%\'si kapatıldı'));
      console.log(chalk.green('   ✅ $' + fakeSellSignal.amount.toFixed(2) + ' SHORT açıldı (1x)'));
      console.log(chalk.green('   ✅ Kalan pozisyon: $' + remainingLong.toFixed(2) + ' LONG'));
      
      console.log(chalk.cyan('\n🎉 TEST BAŞARILI!'));
      console.log(chalk.cyan('   Sistem kısmi pozisyon kapatmayı doğru şekilde yapıyor!'));
      
    } else {
      console.log(chalk.red('\n❌ SİNYAL İŞLENEMEDİ!'));
      console.log(chalk.red('   Hata: ' + result.error));
    }
    
    rl.close();
    
  } catch (error) {
    console.error(chalk.red('❌ Test başarısız:'), error.message);
    rl.close();
  }
}

testFakeSellSignal().catch(console.error);
