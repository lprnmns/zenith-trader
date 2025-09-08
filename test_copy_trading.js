#!/usr/bin/env node

/**
 * Zenith Trader - Copy Trading Test Script
 * ========================================
 * 
 * Bu script, belirtilen wallet adresinin geçmiş işlemlerini analiz eder,
 * kullanıcıya gösterir ve onay alarak copy trading sinyallerini OKX'e gönderir.
 * 
 * Kullanım:
 * node test_copy_trading.js
 */

const readline = require('readline');
const chalk = require('chalk');
const ora = require('ora');
const figlet = require('figlet');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Project services
const analysisService = require('./src/services/analysisService');
const positionSignalService = require('./src/services/positionSignalService');
const CopyTradingService = require('./src/services/copyTradingService');
const OKXService = require('./src/services/okxService');

// Test configuration
const TEST_CONFIG = {
  targetWallet: '0xc82b2e484b161d20eae386877d57c4e5807b5581',
  defaultLeverage: {
    LONG: 3,
    SHORT: 1
  },
  minPositionSize: 5, // USDT - test için düşürüldü
  maxPositionSize: 10000, // USDT
  lookbackDays: 90, // 3 months
  retryAttempts: 3,
  retryDelay: 1000
};

class CopyTradingTestScript {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.copyTradingService = new CopyTradingService();
    this.okxService = null;
    this.userBalance = 0;
    this.testMode = null; // 'demo' or 'real'
    this.okxConfig = {};
    this.tradesToExecute = [];
    this.executedTrades = [];
    this.currentPositions = new Map(); // token -> positionSize
  }

  // Ana çalıştırma metodu
  async run() {
    try {
      this.showHeader();
      
      // Adım 1: Demo veya gerçek trade seçimi
      await this.selectTradingMode();
      
      // Adım 2: OKX bilgilerini al
      await this.collectOKXCredentials();
      
      // Adım 3: OKX servisini başlat
      await this.initializeOKXService();
      
      // Adım 4: Wallet analizini yap
      await this.analyzeTargetWallet();
      
      // Adım 5: İşlemleri işle ve onay bekle
      await this.processTradesWithConfirmation();
      
      // Adım 6: Sonuçları göster
      await this.showResults();
      
    } catch (error) {
      console.error(chalk.red('❌ Hata:'), error.message);
      await this.logError(error);
    } finally {
      this.rl.close();
    }
  }

  // Başlığı göster
  showHeader() {
    console.clear();
    console.log(
      chalk.cyan(
        figlet.textSync('Zenith Trader', { horizontalLayout: 'full' })
      )
    );
    console.log(chalk.yellow('🚀 Copy Trading Test Script'));
    console.log(chalk.gray('======================================='));
    console.log('');
  }

  // Trading modu seçimi
  async selectTradingMode() {
    return new Promise((resolve) => {
      console.log(chalk.blue('📋 Trading Modu Seçimi'));
      console.log(chalk.gray('1. Demo Modu (Test için)'));
      console.log(chalk.gray('2. Gerçek Trading (Canlı piyasa)'));
      console.log('');
      
      this.rl.question(chalk.green('Seçiminiz (1-2): '), async (answer) => {
        if (answer === '1') {
          this.testMode = 'demo';
          console.log(chalk.green('✅ Demo modu seçildi'));
        } else if (answer === '2') {
          this.testMode = 'real';
          console.log(chalk.red('⚠️  Gerçek trading modu seçildi - DİKKATLİ OLUN!'));
        } else {
          console.log(chalk.red('❌ Geçersiz seçim, demo modu aktif edildi'));
          this.testMode = 'demo';
        }
        console.log('');
        resolve();
      });
    });
  }

  // OKX kimlik bilgilerini toplama
  async collectOKXCredentials() {
    return new Promise((resolve) => {
      console.log(chalk.blue('🔐 OKX Hesap Bilgileri'));
      console.log(chalk.gray('Lütfen OKX API bilgilerinizi girin:'));
      console.log('');
      
      const questions = [
        { key: 'apiKey', prompt: 'API Key: ', hidden: false },
        { key: 'secretKey', prompt: 'Secret Key: ', hidden: true },
        { key: 'passphrase', prompt: 'Passphrase: ', hidden: true }
      ];
      
      let currentQuestion = 0;
      
      const askQuestion = () => {
        if (currentQuestion >= questions.length) {
          console.log(chalk.green('✅ OKX bilgileri alındı'));
          console.log('');
          resolve();
          return;
        }
        
        const question = questions[currentQuestion];
        
        if (question.hidden) {
          // Gizli input için
          const stdin = process.stdin;
          stdin.setRawMode(true);
          stdin.resume();
          stdin.setEncoding('utf8');
          
          let input = '';
          
          const onData = (char) => {
            if (char === '\r' || char === '\n') {
              stdin.removeListener('data', onData);
              stdin.setRawMode(false);
              console.log('');
              this.okxConfig[question.key] = input;
              currentQuestion++;
              askQuestion();
            } else if (char === '\u0003') {
              // Ctrl+C
              process.exit();
            } else if (char === '\u0008') {
              // Backspace
              input = input.slice(0, -1);
              process.stdout.write('\r\x1b[K' + question.prompt + '*'.repeat(input.length));
            } else {
              input += char;
              process.stdout.write('*');
            }
          };
          
          stdin.on('data', onData);
          process.stdout.write(question.prompt);
        } else {
          this.rl.question(question.prompt, (answer) => {
            this.okxConfig[question.key] = answer;
            currentQuestion++;
            askQuestion();
          });
        }
      };
      
      askQuestion();
    });
  }

  // OKX servisini başlat
  async initializeOKXService() {
    const spinner = ora('OKX servisi başlatılıyor...').start();
    
    try {
      // Demo mode için flag ayarla
      this.okxConfig.demoMode = this.testMode === 'demo';
      
      // Copy trading servisini başlat
      const initialized = await this.copyTradingService.initialize(this.okxConfig);
      
      if (!initialized) {
        throw new Error('OKX servisi başlatılamadı');
      }
      
      // Kullanıcı bakiyesini al
      this.userBalance = await this.copyTradingService.getOKXBalance();
      
      spinner.succeed(chalk.green(`✅ OKX servisi başlatıldı`));
      console.log(chalk.blue(`💰 Mevcut Bakiye: $${this.userBalance.toFixed(2)} USDT`));
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('❌ OKX servisi başlatılamadı'));
      throw error;
    }
  }

  // Hedef wallet'ı analiz et
  async analyzeTargetWallet() {
    const spinner = ora(`Hedef wallet analizi yapılıyor...`).start();
    
    try {
      // Önceki cache'i temizle
      positionSignalService.clearCache(TEST_CONFIG.targetWallet);
      
      // Wallet analizini yap
      this.walletAnalysis = await analysisService.analyzeWallet(TEST_CONFIG.targetWallet);
      
      if (!this.walletAnalysis || !this.walletAnalysis.tradeHistory) {
        throw new Error('Wallet analizi başarısız oldu');
      }
      
      // İşlenecek işlemleri filtrele - Hem BUY hem SELL işlemlerini dahil et
      this.tradesToExecute = [];
      
      // BUY işlemlerini ekle
      const buyTrades = this.walletAnalysis.tradeHistory.filter(trade => {
        return trade.action === 'BUY' && trade.amountUsd >= TEST_CONFIG.minPositionSize;
      });
      
      // SELL işlemlerini ekle (satışlar, purchase kayıtlarının içindeki sales dizisinde bulunur)
      const sellTrades = [];
      this.walletAnalysis.tradeHistory.forEach(trade => {
        if (trade.sales && Array.isArray(trade.sales)) {
          trade.sales.forEach(sale => {
            if (sale.amountSoldUsd >= TEST_CONFIG.minPositionSize) {
              sellTrades.push({
                ...trade,
                action: 'SELL',
                amountUsd: sale.amountSoldUsd,
                date: sale.date,
                saleDetails: sale
              });
            }
          });
        }
      });
      
      // Tüm işlemleri birleştir
      this.tradesToExecute = [...buyTrades, ...sellTrades];
      
      // İşlemleri tarihe göre sırala (en yeniden en eskiye)
      this.tradesToExecute.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // SADECE WBTC işlemlerini filtrele
      this.tradesToExecute = this.tradesToExecute.filter(trade => trade.asset === 'WBTC');
      
      console.log(chalk.blue(`🎯 SADECE WBTC işlemleri filtrelendi`));
      console.log(chalk.blue(`📊 ${this.tradesToExecute.length} adet WBTC işlemi bulundu (${buyTrades.length} BUY, ${sellTrades.length} SELL)`));
      
      spinner.succeed(chalk.green(`✅ Wallet analizi tamamlandı`));
      console.log(chalk.blue(`📊 ${this.tradesToExecute.length} adet işlem bulundu`));
      
      // Debug bilgi: İlk 5 işlemi göster
      if (this.tradesToExecute.length > 0) {
        console.log(chalk.gray('🔍 Bulunan ilk 5 işlem:'));
        this.tradesToExecute.slice(0, 5).forEach((trade, index) => {
          console.log(chalk.gray(`   ${index + 1}. ${trade.date} - ${trade.action} ${trade.asset} - $${trade.amountUsd?.toFixed(2) || 'N/A'}`));
        });
        console.log('');
      } else {
        console.log(chalk.yellow('⚠️  Hiçbir işlem bulunamadı. Debug bilgileri:'));
        console.log(chalk.gray(`   Total trades in analysis: ${this.walletAnalysis.tradeHistory?.length || 0}`));
        if (this.walletAnalysis.tradeHistory && this.walletAnalysis.tradeHistory.length > 0) {
          console.log(chalk.gray('   Sample trade structure:'));
          console.log(chalk.gray(JSON.stringify(this.walletAnalysis.tradeHistory[0], null, 2)));
        }
        console.log('');
      }
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Wallet analizi başarısız'));
      throw error;
    }
  }

  // İşlemleri onayla ve çalıştır
  async processTradesWithConfirmation() {
    console.log(chalk.blue('🔄 İşlem Onay ve Yürütme'));
    console.log(chalk.gray('Aşağıdaki işlemler sırasıyla onayınıza sunulacaktır:'));
    console.log('');
    
    for (let i = 0; i < this.tradesToExecute.length; i++) {
      const trade = this.tradesToExecute[i];
      const tradeNumber = i + 1;
      
      console.log(chalk.yellow(`📋 İşlem ${tradeNumber}/${this.tradesToExecute.length}`));
      
      // İşlem detaylarını göster
      await this.showTradeDetails(trade, tradeNumber);
      
      // Yorum bekle
      const interpretation = await this.askForInterpretation(trade);
      
      // Pozisyon hesaplamalarını göster
      const positionCalculation = this.calculatePosition(trade);
      await this.showPositionCalculation(positionCalculation, tradeNumber);
      
      // Onay bekle
      const shouldExecute = await this.askForExecution(tradeNumber);
      
      if (shouldExecute) {
        await this.executeTrade(trade, interpretation, positionCalculation);
      } else {
        console.log(chalk.yellow('⏭️  İşlem atlandı'));
        console.log('');
      }
      
      // Ara ver
      if (i < this.tradesToExecute.length - 1) {
        await this.delay(1000);
      }
    }
  }

  // İşlem detaylarını göster
  async showTradeDetails(trade, tradeNumber) {
    const okxToken = CopyTradingService.getOKXTokenName(trade.asset);
    
    console.log(chalk.cyan(`📄 İşlem Detayları:`));
    console.log(`   ${chalk.gray('Tarih:')} ${new Date(trade.date).toLocaleString('tr-TR')}`);
    console.log(`   ${chalk.gray('Hareket:')} ${trade.action} ${trade.asset} → USDT`);
    console.log(`   ${chalk.gray('Miktar:')} $${trade.amountUsd.toFixed(2)}`);
    console.log(`   ${chalk.gray('Fiyat:')} $${trade.costPerUnit?.toFixed(4) || 'N/A'}`);
    console.log(`   ${chalk.gray('OKX Sembol:')} ${okxToken}-USDT-SWAP`);
    console.log('');
  }

  // Kullanıcıdan yorum iste
  async askForInterpretation(trade) {
    return new Promise((resolve) => {
      const okxToken = CopyTradingService.getOKXTokenName(trade.asset);
      const expectedInterpretation = `${okxToken}USDT ${trade.action === 'BUY' ? 'alış' : 'satış'} market`;
      
      console.log(chalk.blue('💭 Bu hareketi nasıl yorumluyorsunuz?'));
      console.log(chalk.gray(`Örnek: ${expectedInterpretation}`));
      
      this.rl.question(chalk.green('Yorumunuz: '), (interpretation) => {
        console.log(chalk.green(`✅ Yorumunuz: ${interpretation}`));
        console.log('');
        resolve(interpretation);
      });
    });
  }

  // Pozisyon hesaplamalarını göster
  async showPositionCalculation(calculation, tradeNumber) {
    console.log(chalk.cyan('🧮 Pozisyon Hesaplamaları:'));
    console.log(`   ${chalk.gray('Cüzdan Toplam Değer:')} $${calculation.walletValue?.toFixed(2) || 'N/A'}`);
    console.log(`   ${chalk.gray('İşlem Yüzdesi (Cüzdan):')} ${calculation.percentage.toFixed(2)}%`);
    console.log(`   ${chalk.gray('Kullanım Yüzdesi (Sizin):')} ${calculation.userPercentage.toFixed(2)}%`);
    console.log(`   ${chalk.gray('Sizin Bakiyeniz:')} $${this.userBalance.toFixed(2)}`);
    console.log(`   ${chalk.gray('Hesaplanan Pozisyon:')} $${calculation.positionSize.toFixed(2)}`);
    console.log(`   ${chalk.gray('Kaldıraç:')} ${calculation.leverage}x`);
    console.log(`   ${chalk.gray('Toplam Maruziyet:')} $${calculation.totalExposure.toFixed(2)}`);
    console.log('');
  }

  // İşlem onayı iste
  async askForExecution(tradeNumber) {
    return new Promise((resolve) => {
      console.log(chalk.yellow('⚠️  DİKKAT: Bu işlemi gerçekleştirmek istiyor musunuz?'));
      console.log(chalk.gray('Y = Evet, N = Hayır'));
      
      this.rl.question(chalk.green('Seçiminiz (Y/N): '), (answer) => {
        const shouldExecute = answer.toUpperCase() === 'Y';
        resolve(shouldExecute);
      });
    });
  }

  // İşlemi çalıştır
  async executeTrade(trade, interpretation, calculation) {
    const spinner = ora('İşlem gönderiliyor...').start();
    
    try {
      const token = trade.asset;
      const currentPosSize = this.currentPositions.get(token) || 0;
      
      // Pozisyon takibi için orijinal işlem miktarını hesapla
      const originalTradeAmount = trade.amountUsd;
      
      // Sinyal objesi oluştur
      const signal = {
        type: trade.action,
        token: trade.asset,
        amount: calculation.positionSize, // Hesaplanan pozisyon büyüklüğü
        originalAmount: originalTradeAmount, // Orijinal işlem miktarı
        currentPosSize: currentPosSize, // Mevcut pozisyon büyüklüğü
        percentage: calculation.percentage, // Kopyalanan risk yüzdesi
        leverage: calculation.leverage,
        totalValue: this.walletAnalysis.totalValue
      };
      
      console.log(`📊 Pozisyon durumu:`);
      console.log(`   Mevcut ${token} pozisyonu: $${currentPosSize.toFixed(2)}`);
      console.log(`   İşlem miktarı: $${originalTradeAmount.toFixed(2)}`);
      
      // İşlemi yap
      const result = await this.copyTradingService.processPositionSignal(signal, this.userBalance);
      
      if (result.success) {
        spinner.succeed(chalk.green('✅ İŞLEM BAŞARILI'));
        
        if (result.results && result.results.length > 0) {
          console.log(chalk.blue(`   Toplam Emir: ${result.totalOrders}`));
          result.results.forEach((res, index) => {
            console.log(chalk.blue(`   ${index + 1}. ${res.type}: ${res.orderId} (${res.positionSide})`));
          });
        } else {
          console.log(chalk.blue(`   Emir ID: ${result.orderId}`));
          console.log(chalk.blue(`   Durum: ${result.status}`));
        }
        
        // Pozisyon durumunu güncelle
        this.updatePosition(token, trade.action, calculation.positionSize, originalTradeAmount);
        
        console.log(chalk.green(`   Güncel ${token} pozisyonu: $${this.currentPositions.get(token)?.toFixed(2) || 0}`));
        
        this.executedTrades.push({
          trade,
          interpretation,
          calculation,
          result,
          timestamp: new Date()
        });
      } else {
        spinner.fail(chalk.red('❌ İŞLEM BAŞARISIZ'));
        console.log(chalk.red(`   Hata: ${result.error}`));
      }
      
      console.log('');
      
    } catch (error) {
      spinner.fail(chalk.red('❌ İŞLEM HATASI'));
      console.log(chalk.red(`   Hata: ${error.message}`));
      console.log('');
    }
  }

  // Pozisyon durumunu güncelle
  updatePosition(token, action, positionSize, originalAmount) {
    const currentPos = this.currentPositions.get(token) || 0;
    
    if (action === 'BUY') {
      // Alışta pozisyon ekle
      this.currentPositions.set(token, currentPos + positionSize);
    } else if (action === 'SELL') {
      // Satışta pozisyon azalt
      const newPos = Math.max(0, currentPos - positionSize);
      this.currentPositions.set(token, newPos);
    }
    
    console.log(`🔄 Pozisyon güncellendi: ${token} = $${this.currentPositions.get(token)?.toFixed(2) || 0}`);
  }

  // Pozisyon hesaplaması yap
  calculatePosition(trade) {
    // Cüzdan toplam değerini farklı alanlardan dene
    let walletValue = 0;
    
    if (this.walletAnalysis.totalValue) {
      walletValue = this.walletAnalysis.totalValue;
    } else if (this.walletAnalysis.summary && this.walletAnalysis.summary.totalValue) {
      walletValue = this.walletAnalysis.summary.totalValue;
    } else {
      // Trade history'den toplam değeri hesapla
      const totalTradeValue = this.walletAnalysis.tradeHistory?.reduce((sum, t) => sum + (t.amountUsd || 0), 0) || 0;
      walletValue = totalTradeValue > 0 ? totalTradeValue : 100000; // Fallback değer
    }
    
    // Kopyalanan cüzdanın risk yüzdesini hesapla (sınırlama olmadan)
    const percentage = walletValue > 0 ? (trade.amountUsd / walletValue) * 100 : 10; // Gerçek risk yüzdesi
    const leverage = trade.action === 'BUY' ? TEST_CONFIG.defaultLeverage.LONG : TEST_CONFIG.defaultLeverage.SHORT;
    
    // DOĞRU MANTIK: Kopyalanan cüzdanın risk yüzdesini uygula
    // Kopyalanan cüzdan %52.6 risk alıyorsa, siz de %52.6 risk almaya çalışın
    let userPercentage = percentage; // Gerçek risk yüzdesi
    let positionSize = (this.userBalance * userPercentage) / 100;
    let totalExposure = positionSize * leverage;
    
    // Eğer pozisyon bakiyeyi aşıyorsa, bakiyenin tamamını kullan
    if (positionSize > this.userBalance) {
      console.log(`⚠️  Yetersiz bakiye uyarısı:`);
      console.log(`   İstenen pozisyon: $${positionSize.toFixed(2)} (%${userPercentage.toFixed(2)})`);
      console.log(`   Mevcut bakiye: $${this.userBalance.toFixed(2)}`);
      
      // Bakiyenin tamamını kullan
      positionSize = this.userBalance;
      userPercentage = 100; // %100 bakiyeyi kullan
      totalExposure = positionSize * leverage;
      
      console.log(`   💡 Çözüm: Bakiyenin tamamı kullanılıyor`);
    }
    
    console.log(`🧮 Gerçek kopyalama mantığı:`);
    console.log(`   Kopyalanan cüzdan değeri: $${walletValue.toFixed(2)}`);
    console.log(`   Kopyalanan işlem: $${trade.amountUsd.toFixed(2)}`);
    console.log(`   Kopyalanan risk: %${percentage.toFixed(2)}`);
    console.log(`   Sizin bakiyeniz: $${this.userBalance.toFixed(2)}`);
    console.log(`   Sizin pozisyonunuz: $${positionSize.toFixed(2)} (%${userPercentage.toFixed(2)})`);
    console.log(`   Kaldıraç: ${leverage}x`);
    console.log(`   Toplam maruziyet: $${totalExposure.toFixed(2)}`);
    
    return {
      percentage,
      userPercentage,
      leverage,
      positionSize,
      totalExposure,
      walletValue
    };
  }

  // Sonuçları göster
  async showResults() {
    console.log(chalk.blue('📊 TEST SONUÇLARI'));
    console.log(chalk.gray('======================================='));
    console.log('');
    
    console.log(chalk.cyan('📈 Özet:'));
    console.log(`   Toplam İşlem Sayısı: ${this.tradesToExecute.length}`);
    console.log(`   Başarılı İşlem: ${this.executedTrades.length}`);
    console.log(`   Başarısız/Atlanan: ${this.tradesToExecute.length - this.executedTrades.length}`);
    console.log('');
    
    if (this.executedTrades.length > 0) {
      console.log(chalk.cyan('🎯 Gerçekleştirilen İşlemler:'));
      
      let totalPnl = 0;
      
      this.executedTrades.forEach((executed, index) => {
        const trade = executed.trade;
        const result = executed.result;
        
        console.log(`   ${index + 1}. ${trade.asset} ${trade.action} - $${trade.amountUsd.toFixed(2)}`);
        console.log(`      Emir ID: ${result.orderId}`);
        console.log(`      Kullanılan Bakiye: $${executed.calculation.positionSize.toFixed(2)}`);
        console.log(`      Kaldıraç: ${executed.calculation.leverage}x`);
        console.log('');
      });
      
      console.log(chalk.green('✅ Test tamamlandı!'));
      console.log(chalk.yellow('💡 Not: Bu test sonuçları demo moduna göredir.'));
    } else {
      console.log(chalk.yellow('⚠️  Hiçbir işlem gerçekleştirilmedi'));
    }
    
    console.log('');
  }

  // Hata logla
  async logError(error) {
    const timestamp = new Date().toISOString();
    const errorLog = {
      timestamp,
      error: error.message,
      stack: error.stack,
      testMode: this.testMode,
      targetWallet: TEST_CONFIG.targetWallet
    };
    
    console.error(chalk.red('📝 Hata Detayı:'), JSON.stringify(errorLog, null, 2));
  }

  // Gecikme
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Script'i çalıştır
if (require.main === module) {
  const script = new CopyTradingTestScript();
  script.run().catch(console.error);
}

module.exports = CopyTradingTestScript;