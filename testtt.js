const OKXService = require('./src/services/okxService');
const readline = require('readline');

// Test cüzdanı bilgileri
const TEST_ADDRESS = '0xc82b2e484b161d20eae386877d57c4e5807b5581';
const TOTAL_VALUE = 80661.52;

// Demo OKX client
const okxClient = new OKXService(
  '242a9a80-50a4-4fcf-8116-f8ee12e4ecc9',
  '9B8C077868333D9EF2FD550B41777656',
  'Kgkput_4896',
  true // Demo mode
);

// Token adı eşleştirme sistemi
const TOKEN_MAPPING = {
  'WBTC': 'BTC', 'WETH': 'ETH', 'MNT': 'MNT', 'AVAX': 'AVAX',
  'ZRO': 'ZRO', 'RESOLV': 'RESOLV', 'FET': 'FET'
};

// ================================================================= //
// ==================== DİNAMİK VERİ ALTYAPISI ==================== //
// ================================================================= //

// Tüm enstrüman detaylarını (lotSz, ctVal, minSz) saklamak için bir Map
let instrumentDetails = new Map();

/**
 * Script başladığında bir kereliğine tüm SWAP enstrümanlarının detaylarını API'den çeker ve hafızaya alır.
 */
async function initializeInstrumentDetails() {
  console.log('🔄 Enstrüman bilgileri OKX API\'sinden alınıyor...');
  try {
    // ÖNEMLİ: getInstruments fonksiyonunun /api/v5/account/instruments kullandığından emin olun.
    const instruments = await okxClient.getInstruments('SWAP');
    if (instruments && Array.isArray(instruments)) {
      for (const inst of instruments) {
        instrumentDetails.set(inst.instId, inst);
      }
      console.log(`✅ ${instrumentDetails.size} adet SWAP enstrümanı başarıyla yüklendi.`);
    } else {
      throw new Error('API\'den geçerli enstrüman verisi alınamadı.');
    }
  } catch (error) {
    console.error('❌ Enstrüman bilgileri alınırken kritik bir hata oluştu. Script sonlandırılıyor.', error.message);
    process.exit(1);
  }
}

/**
 * Bir sayının ondalık basamak sayısını string'den alır.
 */
function getDecimalPlaces(numStr) {
  const str = String(numStr);
  if (str.indexOf('.') !== -1) {
    return str.split('.')[1].length;
  }
  return 0;
}

/**
 * Verilen miktarı, API'den alınan lot büyüklüğüne göre aşağı yuvarlar.
 */
function roundToLotSize(amount, lotSizeStr) {
  const lotSize = parseFloat(lotSizeStr);
  if (isNaN(lotSize) || lotSize <= 0) return amount.toString();
  
  const decimalPlaces = getDecimalPlaces(lotSizeStr);
  const roundedAmount = Math.floor(amount / lotSize) * lotSize;
  
  return roundedAmount.toFixed(decimalPlaces);
}

// =============================================================== //

// Token adını OKX formatına çevir
function getOKXTokenName(token) {
  return TOKEN_MAPPING[token] || token;
}

// Test sinyalleri
const TEST_SIGNALS = [
    // ... sinyal listeniz ...
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
  { 
    type: 'BUY', 
    token: 'ZRO', 
    amount: 2000.65, 
    percentage: 2.48, 
    leverage: 3, 
    id: 'buy-10',
    date: '2025-06-17',
    description: 'ZRO alım işlemi - Cüzdanın %2.48\'i kadar pozisyon'
  },
  { 
    type: 'BUY', 
    token: 'RESOLV', 
    amount: 999.50, 
    percentage: 1.24, 
    leverage: 3, 
    id: 'buy-11',
    date: '2025-06-17',
    description: 'RESOLV küçük alım işlemi - Cüzdanın %1.24\'ü kadar pozisyon'
  },
  { 
    type: 'BUY', 
    token: 'WETH', 
    amount: 3004.59, 
    percentage: 3.72, 
    leverage: 3, 
    id: 'buy-9',
    date: '2025-06-14',
    description: 'WETH alım işlemi - Cüzdanın %3.72\'si kadar pozisyon'
  },
  { 
    type: 'BUY', 
    token: 'WBTC', 
    amount: 2000.63, 
    percentage: 2.48, 
    leverage: 3, 
    id: 'buy-6',
    date: '2025-05-21',
    description: 'WBTC alım işlemi - Cüzdanın %2.48\'i kadar pozisyon'
  },
  { 
    type: 'BUY', 
    token: 'FET', 
    amount: 500.16, 
    percentage: 0.62, 
    leverage: 3, 
    id: 'buy-7',
    date: '2025-05-21',
    description: 'FET küçük alım işlemi - Cüzdanın %0.62\'si kadar pozisyon'
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
  },
  { 
    type: 'SELL', 
    token: 'ZRO', 
    amount: 1976.34, 
    percentage: 2.45, 
    leverage: 1, 
    id: 'buy-10-sale-2025-06-17',
    date: '2025-06-17',
    description: 'ZRO satış işlemi - Cüzdanın %2.45\'i kadar SHORT pozisyon'
  },
  { 
    type: 'SELL', 
    token: 'WETH', 
    amount: 3037.32, 
    percentage: 3.77, 
    leverage: 1, 
    id: 'buy-9-sale-2025-06-17',
    date: '2025-06-17',
    description: 'WETH satış işlemi - Cüzdanın %3.77\'si kadar SHORT pozisyon'
  },
  { 
    type: 'SELL', 
    token: 'WBTC', 
    amount: 1988.66, 
    percentage: 2.47, 
    leverage: 1, 
    id: 'buy-6-sale-2025-06-11',
    date: '2025-06-11',
    description: 'WBTC kısmi satış işlemi - Cüzdanın %2.47\'si kadar SHORT pozisyon'
  },
  { 
    type: 'SELL', 
    token: 'FET', 
    amount: 479.03, 
    percentage: 0.59, 
    leverage: 1, 
    id: 'buy-7-sale-2025-06-11',
    date: '2025-06-11',
    description: 'FET satış işlemi - Cüzdanın %0.59\'u kadar SHORT pozisyon'
  }
];

let currentSignalIndex = 0;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function getOKXBalance() { /* Değişiklik yok */ return okxClient.getBalance().then(b => parseFloat(b[0]?.details?.find(d => d.ccy === 'USDT')?.availBal || 0)).catch(() => 5000); }
async function showCurrentSignal() { /* Değişiklik yok */ 
    if (currentSignalIndex >= TEST_SIGNALS.length) {
        console.log('\n🎯 Tüm sinyaller test edildi!');
        rl.close();
        return;
    }
    const signal = TEST_SIGNALS[currentSignalIndex];
    const okxToken = getOKXTokenName(signal.token);
    const okxBalance = await getOKXBalance();
    const ourPositionSize = (okxBalance * signal.percentage) / 100;

    console.log('\n' + '='.repeat(80));
    console.log(`📊 Test Sinyali ${currentSignalIndex + 1}/${TEST_SIGNALS.length}`);
    console.log('='.repeat(80));
    console.log(`🎯 Tip: ${signal.type === 'BUY' ? '🟢 LONG' : '🔴 SHORT'} (${signal.leverage}x)`);
    console.log(`🪙 Token: ${signal.token} → ${okxToken}`);
    console.log(`📅 Tarih: ${signal.date}`);
    console.log(`📝 Açıklama: ${signal.description}`);
    console.log('');
    console.log(`💳 OKX Hesabımız Bilgileri:`);
    console.log(`   - Mevcut Bakiye: $${okxBalance.toFixed(2)} USDT`);
    console.log(`   - Açılacak Pozisyon: $${ourPositionSize.toFixed(2)} USDT`);
    console.log(`   - Enstrüman: ${okxToken}-USDT-SWAP`);
    console.log('');
    console.log('💡 "y" tuşuna basarak devam et, "q" ile çık');
}

async function processSignal() {
  const signal = TEST_SIGNALS[currentSignalIndex];
  const okxToken = getOKXTokenName(signal.token);
  const instId = `${okxToken}-USDT-SWAP`;

  const instrument = instrumentDetails.get(instId);
  if (!instrument) {
      console.log(`❌ HATA: '${instId}' için enstrüman bilgisi bulunamadı.`);
      currentSignalIndex++;
      await showCurrentSignal();
      return;
  }
  
  const lotSize = instrument.lotSz;
  const ctVal = parseFloat(instrument.ctVal);
  const minSz = parseFloat(instrument.minSz);
  
  const okxBalance = await getOKXBalance();
  const ourPositionSize = (okxBalance * signal.percentage) / 100;
  
  console.log(`\n🚀 Sinyal gönderiliyor: ${signal.type} ${okxToken}...`);

  try {
    console.log(`🔧 Kaldıraç ayarlanıyor: ${signal.leverage}x...`);
    await okxClient.setLeverage(instId, signal.leverage.toString(), 'isolated', 'long');
    await okxClient.setLeverage(instId, signal.leverage.toString(), 'isolated', 'short');
    console.log(`✅ Kaldıraç başarıyla ayarlandı (long/short): ${signal.leverage}x`);
    
    console.log(`📊 ${okxToken} anlık fiyatı alınıyor...`);
    const tickerResponse = await okxClient.getTicker(instId);
    const currentPrice = parseFloat(tickerResponse?.[0]?.last || 0);
    
    if (currentPrice > 0) {
      const amountInCoin = ourPositionSize / currentPrice;
      const contractsAmount = amountInCoin / ctVal; // <-- DOĞRU HESAPLAMA
      const finalContractsSize = roundToLotSize(contractsAmount, lotSize);

      console.log(`\n--- Hesaplama Detayları ---`);
      console.log(`💰 Pozisyon Büyüklüğü: ${ourPositionSize.toFixed(2)} USDT`);
      console.log(`📈 Anlık Fiyat: $${currentPrice.toFixed(4)}`);
      console.log(`🪙 Coin Miktarı: ${amountInCoin.toFixed(4)} ${okxToken}`);
      console.log(`📑 Sözleşme Değeri (ctVal): ${ctVal}`);
      console.log(`🧮 Ham Kontrat Sayısı: ${contractsAmount.toFixed(4)}`);
      console.log(`📏 Lot Size (API'den): ${lotSize}`);
      console.log(`✅ Yuvarlanmış Kontrat Sayısı: ${finalContractsSize}`);
      console.log(`📊 Min. Emir Miktarı (API'den): ${minSz}`);
      console.log(`---------------------------\n`);
      
      if (parseFloat(finalContractsSize) < minSz) {
        console.log(`⚠️ UYARI: Hesaplanan miktar (${finalContractsSize}), minimum emir miktarının (${minSz}) altında. Bu sinyal atlanıyor.`);
        currentSignalIndex++;
        await showCurrentSignal();
        return;
      }
      
      console.log(`📤 Market emri gönderiliyor...`);
      const posSide = signal.type === 'BUY' ? 'long' : 'short';
      const orderResponse = await okxClient.submitOrder(
        instId, 'isolated', signal.type === 'BUY' ? 'buy' : 'sell',
        posSide, 'market', finalContractsSize
      );
      
      if (orderResponse?.code === '0' && orderResponse.data?.[0]?.sCode === '0') {
        console.log(`🎉 EMİR BAŞARILI!`);
        console.log(`   Emir ID: ${orderResponse.data[0].ordId}`);
        console.log(`   Durum: ${orderResponse.data[0].sMsg}`);
      } else {
        console.log(`❌ Emir hatası:`, JSON.stringify(orderResponse, null, 2));
      }
    } else {
      console.log(`❌ Fiyat alınamadı - Ticker response:`, tickerResponse);
    }
  } catch (error) {
    console.log(`❌ İşlem hatası:`, error.message);
  }
  
  console.log('');
  currentSignalIndex++;
  await showCurrentSignal();
}

async function startTest() {
  await initializeInstrumentDetails(); 

  console.log('🧪 Gerçek Cüzdan Hareketleri Test Sistemi');
  // ... diğer loglar ...
  console.log('==========================================');
  console.log(`📊 Test Cüzdanı: ${TEST_ADDRESS}`);
  console.log(`💰 Test Cüzdanı Toplam Değeri: $${TOTAL_VALUE.toFixed(2)}`);
  console.log(`📈 Toplam Sinyal: ${TEST_SIGNALS.length}`);
  console.log('');
  console.log('🎯 Her "y" tuşuna bastığında bir sonraki sinyal test edilecek');
  console.log('   "q" tuşu ile çıkabilirsin');
  console.log('');

  await showCurrentSignal();
  
  rl.on('line', async (input) => {
    const command = input.trim().toLowerCase();
    if (command === 'y' || command === 'yes') {
      await processSignal();
    } else if (command === 'q' || command === 'quit') {
      console.log('\n👋 Test sonlandırıldı.');
      rl.close();
    } else {
      console.log('❓ Geçersiz komut. "y" (devam) veya "q" (çık) kullanın.');
    }
  });
}

// Testi başlat
startTest();