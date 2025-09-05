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
        true // Demo mode
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
      const balance = await this.okxClient.getBalance();
      const usdtBalance = balance[0]?.details?.find(d => d.ccy === 'USDT')?.availBal || 0;
      return parseFloat(usdtBalance);
    } catch (error) {
      console.error('❌ OKX bakiye alınamadı:', error.message);
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

    // Pozisyon büyüklüğünü hesapla
    const ourPositionSize = (okxBalance * signal.percentage) / 100;

    try {
      // 1. Kaldıraç ayarla
      console.log(`🔧 Kaldıraç ayarlanıyor: ${signal.leverage}x...`);
      const posSide = signal.type === 'BUY' ? 'long' : 'short';
      
      await this.okxClient.setLeverage(instId, signal.leverage.toString(), 'isolated', 'long');
      await this.okxClient.setLeverage(instId, signal.leverage.toString(), 'isolated', 'short');
      console.log(`✅ Kaldıraç başarıyla ayarlandı: ${signal.leverage}x`);

      // 2. Fiyat bilgisini al
      console.log(`📊 ${okxToken} fiyatı alınıyor...`);
      const tickerResponse = await this.okxClient.getTicker(instId);
      const currentPrice = parseFloat(tickerResponse?.[0]?.last || 0);

      if (currentPrice <= 0) {
        throw new Error('Fiyat bilgisi alınamadı');
      }

      // 3. Kontrat büyüklüğünü hesapla
      const amountInCoin = ourPositionSize / currentPrice;
      const contractsAmount = amountInCoin / ctVal;
      const finalContractsSize = CopyTradingService.roundToLotSize(contractsAmount, lotSize);

      console.log(`\n--- Hesaplama Detayları ---`);
      console.log(`💰 Pozisyon Büyüklüğü: ${ourPositionSize.toFixed(2)} USDT`);
      console.log(`📈 Anlık Fiyat: $${currentPrice.toFixed(4)}`);
      console.log(`🪙 Coin Miktarı: ${amountInCoin.toFixed(4)} ${okxToken}`);
      console.log(`📑 Sözleşme Değeri (ctVal): ${ctVal}`);
      console.log(`🧮 Ham Kontrat Sayısı: ${contractsAmount.toFixed(4)}`);
      console.log(`📏 Lot Size: ${lotSize}`);
      console.log(`✅ Yuvarlanmış Kontrat: ${finalContractsSize}`);
      console.log(`📊 Min. Emir Miktarı: ${minSz}`);

      // 4. Minimum emir kontrolü
      if (parseFloat(finalContractsSize) < minSz) {
        throw new Error(`Hesaplanan miktar (${finalContractsSize}), minimum emir miktarının (${minSz}) altında`);
      }

      // 5. Emri gönder
      console.log(`📤 Market emri gönderiliyor...`);
      const orderResponse = await this.okxClient.submitOrder(
        instId,
        'isolated',
        signal.type === 'BUY' ? 'buy' : 'sell',
        posSide,
        'market',
        finalContractsSize
      );

      if (orderResponse?.code === '0' && orderResponse.data?.[0]?.sCode === '0') {
        console.log(`🎉 EMİR BAŞARILI!`);
        console.log(`   Emir ID: ${orderResponse.data[0].ordId}`);
        console.log(`   Durum: ${orderResponse.data[0].sMsg}`);

        return {
          success: true,
          orderId: orderResponse.data[0].ordId,
          status: orderResponse.data[0].sMsg,
          contractSize: finalContractsSize,
          positionSize: ourPositionSize
        };
      } else {
        throw new Error(`Emir hatası: ${JSON.stringify(orderResponse)}`);
      }

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
