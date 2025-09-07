const OKXService = require('./okxService');
const crypto = require('crypto');

class CopyTradingService {
  constructor() {
    this.okxClient = null;
    this.instrumentDetails = new Map();
    this.isInitialized = false;
  }

  // Token adı eşleştirme sistemi
  static TOKEN_MAPPING = {
    'WBTC': 'BTC',
    'WETH': 'ETH',
    'MNT': 'MNT',
    'AVAX': 'AVAX',
    'ZRO': 'ZRO',
    'RESOLV': 'RESOLV',
    'FET': 'FET'
  };

  // OKX client'ı başlat
  async initialize(okxConfig) {
    try {
      this.okxClient = new OKXService(
        okxConfig.apiKey,
        okxConfig.secretKey,
        okxConfig.passphrase,
        okxConfig.demoMode // Use configuration parameter instead of hardcoded true
      );

      // Enstrüman bilgilerini yükle
      await this.loadInstrumentDetails();
      this.isInitialized = true;
      
      console.log('✅ Copy Trading Service başarıyla başlatıldı');
      return true;
    } catch (error) {
      console.error('❌ Copy Trading Service başlatılamadı:', error.message);
      return false;
    }
  }

  // Tüm enstrüman detaylarını yükle
  async loadInstrumentDetails() {
    try {
      console.log('🔄 Enstrüman bilgileri OKX API\'sinden alınıyor...');
      const instruments = await this.okxClient.getInstruments('SWAP');
      
      if (instruments && Array.isArray(instruments)) {
        for (const inst of instruments) {
          this.instrumentDetails.set(inst.instId, inst);
        }
        console.log(`✅ ${this.instrumentDetails.size} adet SWAP enstrümanı yüklendi`);
      } else {
        throw new Error('API\'den geçerli enstrüman verisi alınamadı');
      }
    } catch (error) {
      console.error('❌ Enstrüman bilgileri yüklenemedi:', error.message);
      throw error;
    }
  }

  // Token adını OKX formatına çevir
  static getOKXTokenName(token) {
    return CopyTradingService.TOKEN_MAPPING[token] || token;
  }

  // Bir sayının ondalık basamak sayısını string'den al
  static getDecimalPlaces(numStr) {
    const str = String(numStr);
    if (str.indexOf('.') !== -1) {
      return str.split('.')[1].length;
    }
    return 0;
  }

  // Lot size'a göre yuvarlama
  static roundToLotSize(amount, lotSizeStr) {
    const lotSize = parseFloat(lotSizeStr);
    if (isNaN(lotSize) || lotSize <= 0) return amount.toString();
    
    const decimalPlaces = CopyTradingService.getDecimalPlaces(lotSizeStr);
    const roundedAmount = Math.floor(amount / lotSize) * lotSize;
    
    return roundedAmount.toFixed(decimalPlaces);
  }

  // OKX hesap bakiyesini al
  async getOKXBalance() {
    try {
      console.log('🔍 OKX bakiye bilgileri alınıyor...');
      const balance = await this.okxClient.getBalance();
      
      // Debug: Tüm balance bilgisini logla
      console.log('📊 Raw balance response:', JSON.stringify(balance, null, 2));
      
      if (!balance || !Array.isArray(balance) || balance.length === 0) {
        console.log('❌ Balance verisi alınamadı veya boş');
        return 0;
      }
      
      const accountDetails = balance[0];
      console.log('💼 Hesap detayları:', {
        id: accountDetails.id,
        alias: accountDetails.alias,
        type: accountDetails.type,
        state: accountDetails.state
      });
      
      if (!accountDetails.details || !Array.isArray(accountDetails.details)) {
        console.log('❌ Balance details bulunamadı');
        return 0;
      }
      
      // Tüm USDT bakiyelerini bul (funding + trading)
      const usdtBalances = accountDetails.details.filter(d => d.ccy === 'USDT');
      console.log('💵 USDT bakiyeleri:', usdtBalances);
      
      // Önce trading bakiyesini dene, yoksa funding bakiyesini kullan
      const tradingBalance = usdtBalances.find(d => d.type === 'trading')?.availBal || 0;
      const fundingBalance = usdtBalances.find(d => d.type === 'funding')?.availBal || 0;
      const availBal = usdtBalances[0]?.availBal || 0;
      
      console.log('📈 Bakiye detayları:', {
        trading: parseFloat(tradingBalance),
        funding: parseFloat(fundingBalance),
        avail: parseFloat(availBal)
      });
      
      // En yüksek bakiyeyi kullan
      const finalBalance = Math.max(
        parseFloat(tradingBalance),
        parseFloat(fundingBalance),
        parseFloat(availBal)
      );
      
      console.log(`✅ Sonuç bakiye: $${finalBalance} USDT`);
      return finalBalance;
      
    } catch (error) {
      console.error('❌ OKX bakiye alınamadı:', error.message);
      if (error.response) {
        console.error('🔍 API Error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      return 0;
    }
  }

  // Pozisyon sinyali işle
  async processPositionSignal(signal, okxBalance) {
    if (!this.isInitialized) {
      throw new Error('Copy Trading Service henüz başlatılmadı');
    }

    const okxToken = CopyTradingService.getOKXTokenName(signal.token);
    const instId = `${okxToken}-USDT-SWAP`;

    // Enstrüman bilgilerini kontrol et
    const instrument = this.instrumentDetails.get(instId);
    if (!instrument) {
      throw new Error(`'${instId}' enstrümanı OKX listesinde bulunamadı`);
    }

    const lotSize = instrument.lotSz;
    const ctVal = parseFloat(instrument.ctVal);
    const minSz = parseFloat(instrument.minSz);

    // Pozisyon büyüklüğünü kopyalanan risk yüzdesine göre hesapla
    const ourPositionSize = (okxBalance * signal.percentage) / 100;
    const leverage = signal.type === 'BUY' ? 3 : 1;
    const leveragedPositionSize = ourPositionSize * leverage;

    try {
      // 1. Fiyat bilgisini al
      console.log(`📊 ${okxToken} fiyatı alınıyor...`);
      const tickerResponse = await this.okxClient.getTicker(instId);
      const currentPrice = parseFloat(tickerResponse?.[0]?.last || 0);

      if (currentPrice <= 0) {
        throw new Error('Fiyat bilgisi alınamadı');
      }

      // 2. Detaylı debug bilgileri
      console.log(`🔍 DETAYLI HESAPLAMA DEBUG:`);
      console.log(`   Temel pozisyon: $${ourPositionSize.toFixed(2)}`);
      console.log(`   Kaldıraç: ${leverage}x`);
      console.log(`   Toplam maruziyet: $${leveragedPositionSize.toFixed(2)}`);
      console.log(`   Fiyat: $${currentPrice.toFixed(2)}`);
      
      // 3. BTC miktarı hesapla
      const totalBTCAmount = leveragedPositionSize / currentPrice;
      console.log(`   Toplam BTC miktarı: ${totalBTCAmount.toFixed(6)} BTC`);
      
      // 4. Kontrat detayları
      console.log(`📑 KONTRAT DETAYLARI:`);
      console.log(`   ctVal (kontrat değeri): ${ctVal} BTC`);
      console.log(`   Lot Size: ${lotSize}`);
      console.log(`   Minimum lot: ${minSz}`);
      
      // 5. Minimum BTC miktarı
      const minBTCAmount = parseFloat(minSz) * ctVal;
      console.log(`   Minimum BTC: ${minBTCAmount.toFixed(6)} BTC`);
      console.log(`   Minimum USDT: $${(minBTCAmount * currentPrice).toFixed(2)}`);
      
      // 6. Karşılaştırma
      console.log(`📊 KARŞILAŞTIRMA:`);
      console.log(`   Gereken BTC: ${minBTCAmount.toFixed(6)}`);
      console.log(`   Hesaplanan BTC: ${totalBTCAmount.toFixed(6)}`);
      console.log(`   Yeterli mi?: ${totalBTCAmount >= minBTCAmount ? 'EVET' : 'HAYIR'}`);

      // 7. Kaldıraç ayarla
      console.log(`🔧 Kaldıraç ayarlanıyor...`);
      await this.okxClient.setLeverage(instId, '3', 'isolated', 'long');
      await this.okxClient.setLeverage(instId, '1', 'isolated', 'short');
      console.log(`✅ Kaldıraç ayarlandı: Long 3x, Short 1x`);

      // 8. Kontrat büyüklüğünü hesapla
      const amountInCoin = leveragedPositionSize / currentPrice;
      const contractsAmount = amountInCoin / ctVal;
      const finalContractsSize = CopyTradingService.roundToLotSize(contractsAmount, lotSize);

      console.log(`\n--- Hesaplama Detayları ---`);
      console.log(`💰 Pozisyon Büyüklüğü: ${ourPositionSize.toFixed(2)} USDT`);
      console.log(`📈 Anlık Fiyat: $${currentPrice.toFixed(4)}`);
      console.log(`🪙 Toplam Coin Miktarı: ${amountInCoin.toFixed(6)} ${okxToken}`);
      console.log(`📑 Sözleşme Değeri (ctVal): ${ctVal}`);
      console.log(`🧮 Ham Kontrat Sayısı: ${contractsAmount.toFixed(4)}`);
      console.log(`📏 Lot Size: ${lotSize}`);
      console.log(`✅ Yuvarlanmış Kontrat: ${finalContractsSize}`);
      console.log(`📊 Min. Emir Miktarı: ${minSz}`);

      // 4. Minimum emir kontrolü
      if (parseFloat(finalContractsSize) < minSz) {
        console.log(`❌ MİNİMUM EMİR MİKTARI ALTINDA!`);
        console.log(`   Hesaplanan lot: ${finalContractsSize}`);
        console.log(`   Minimum lot: ${minSz}`);
        console.log(`   Fiyat: $${currentPrice.toFixed(2)}`);
        
        const minUSDAmount = parseFloat(minSz) * ctVal * currentPrice;
        console.log(`   Gereken minimum USDT: $${minUSDAmount.toFixed(2)}`);
        console.log(`   Sizin maruziyetiniz: $${leveragedPositionSize.toFixed(2)}`);
        
        throw new Error(`Minimum emir miktarı altında. Gereken: $${minUSDAmount.toFixed(2)}, Sizin: $${leveragedPositionSize.toFixed(2)}`);
      }

      const results = [];

      // 5. İşlem türüne göre emirleri gönder
      if (signal.type === 'BUY') {
        // ALIŞ: Sadece 3x long pozisyon aç
        console.log(`📤 ${signal.type} emri gönderiliyor (3x long)...`);
        
        const buyOrder = await this.okxClient.submitOrder(
          instId,
          'isolated',
          'buy',
          'long',
          'market',
          finalContractsSize
        );

        if (buyOrder?.code === '0' && buyOrder.data?.[0]?.sCode === '0') {
          console.log(`🎉 ALIŞ EMRİ BAŞARILI!`);
          console.log(`   Emir ID: ${buyOrder.data[0].ordId}`);
          console.log(`   Pozisyon: 3x Long`);
          
          results.push({
            type: 'BUY',
            orderId: buyOrder.data[0].ordId,
            status: buyOrder.data[0].sMsg,
            contractSize: finalContractsSize,
            positionSize: ourPositionSize,
            leverage: 3,
            positionSide: 'long'
          });
        } else {
          throw new Error(`Alış emri hatası: ${JSON.stringify(buyOrder)}`);
        }

      } else if (signal.type === 'SELL') {
        // SATIŞ: Kısmi pozisyon kapatma + kısmi short açma
        console.log(`📤 ${signal.type} emri gönderiliyor (kısmi kapatma)...`);
        
        // Mevcut pozisyon bilgilerini al
        const currentPosSize = signal.currentPosSize || 0;
        const sellPercentage = currentPosSize > 0 ? (signal.amount / currentPosSize) * 100 : 100;
        
        console.log(`   📊 Pozisyon analizi:`);
        console.log(`      Mevcut long pozisyon: $${currentPosSize.toFixed(2)}`);
        console.log(`      Satış miktarı: $${signal.amount.toFixed(2)}`);
        console.log(`      Kapatma yüzdesi: %${sellPercentage.toFixed(1)}`);
        
        if (currentPosSize > 0 && sellPercentage < 100) {
          // KISMI KAPATMA: Sadece ilgili kısmı kapat
          console.log(`   🔄 Kısmi long pozisyon kapatılıyor (%${sellPercentage.toFixed(1)})...`);
          
          const partialCloseSize = (finalContractsSize * sellPercentage) / 100;
          const closeOrder = await this.okxClient.submitOrder(
            instId,
            'isolated',
            'sell',
            'long',
            'market',
            partialCloseSize
          );

          if (closeOrder?.code === '0' && closeOrder.data?.[0]?.sCode === '0') {
            console.log(`✅ Kısmi long pozisyon kapatıldı`);
            console.log(`   Emir ID: ${closeOrder.data[0].ordId}`);
            console.log(`   Kapatılan miktar: $${(ourPositionSize * sellPercentage / 100).toFixed(2)}`);
            
            results.push({
              type: 'PARTIAL_CLOSE_LONG',
              orderId: closeOrder.data[0].ordId,
              status: closeOrder.data[0].sMsg,
              contractSize: partialCloseSize,
              positionSize: ourPositionSize * sellPercentage / 100,
              leverage: 1,
              positionSide: 'partial_close_long'
            });
          } else {
            throw new Error(`Kısmi long kapatma hatası: ${JSON.stringify(closeOrder)}`);
          }
          
          // Kalan pozisyonu göster
          const remainingPos = currentPosSize - (ourPositionSize * sellPercentage / 100);
          console.log(`   💾 Kalan long pozisyon: $${remainingPos.toFixed(2)}`);
          
        } else {
          // TAM KAPATMA: Tüm long pozisyonu kapat
          console.log(`   🔄 Tam long pozisyon kapatılıyor...`);
          const closeOrder = await this.okxClient.submitOrder(
            instId,
            'isolated',
            'sell',
            'long',
            'market',
            finalContractsSize
          );

          if (closeOrder?.code === '0' && closeOrder.data?.[0]?.sCode === '0') {
            console.log(`✅ Tam long pozisyon kapatıldı`);
            console.log(`   Emir ID: ${closeOrder.data[0].ordId}`);
            
            results.push({
              type: 'CLOSE_LONG',
              orderId: closeOrder.data[0].ordId,
              status: closeOrder.data[0].sMsg,
              contractSize: finalContractsSize,
              positionSize: ourPositionSize,
              leverage: 1,
              positionSide: 'close_long'
            });
          } else {
            throw new Error(`Long kapatma hatası: ${JSON.stringify(closeOrder)}`);
          }
        }

        // Her durumda 1x short pozisyon aç
        console.log(`   📈 Yeni 1x short pozisyon açılıyor...`);
        const shortOrder = await this.okxClient.submitOrder(
          instId,
          'isolated',
          'sell',
          'short',
          'market',
          finalContractsSize
        );

        if (shortOrder?.code === '0' && shortOrder.data?.[0]?.sCode === '0') {
          console.log(`✅ Short pozisyon açıldı`);
          console.log(`   Emir ID: ${shortOrder.data[0].ordId}`);
          console.log(`   Pozisyon: 1x Short`);
          
          results.push({
            type: 'OPEN_SHORT',
            orderId: shortOrder.data[0].ordId,
            status: shortOrder.data[0].sMsg,
            contractSize: finalContractsSize,
            positionSize: ourPositionSize,
            leverage: 1,
            positionSide: 'short'
          });
        } else {
          throw new Error(`Short açma hatası: ${JSON.stringify(shortOrder)}`);
        }
      }

      console.log(`\n🎉 TÜM İŞLEMLER BAŞARILI!`);
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.type}: ${result.orderId} (${result.positionSide})`);
      });

      return {
        success: true,
        results,
        totalOrders: results.length
      };

    } catch (error) {
      console.error(`❌ İşlem hatası:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Servis durumunu kontrol et
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      instrumentCount: this.instrumentDetails.size,
      hasOKXClient: !!this.okxClient
    };
  }
}

module.exports = CopyTradingService;
