const axios = require('axios');
const crypto = require('crypto');

// API bilgileri
const API_KEY = '82cf6d49-61d4-4bc0-80fa-d507e11688cd';
const SECRET_KEY = 'D34E625EAF20941DA3665B25377A26E2';
const PASSPHRASE = 'Kgkput_4896';

class OKXTester {
    constructor() {
        this.baseURL = 'https://www.okx.com';
    }

    getAuthHeaders(method, endpoint, body = '') {
        const timestamp = new Date().toISOString();
        const prehashString = `${timestamp}${method.toUpperCase()}${endpoint}${body ? JSON.stringify(body) : ''}`;
        const signature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(prehashString)
            .digest('base64');

        return {
            'Content-Type': 'application/json',
            'OK-ACCESS-KEY': API_KEY,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': PASSPHRASE
        };
    }

    async makeRequest(method, endpoint, body = null) {
        const url = this.baseURL + endpoint;
        const headers = this.getAuthHeaders(method, endpoint, body);

        try {
            let response;
            if (method.toUpperCase() === 'POST') {
                response = await axios.post(url, body, { headers });
            } else {
                response = await axios.get(url, { headers });
            }
            return response.data;
        } catch (error) {
            console.error('❌ API Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    async getBalance() {
        console.log('\n📊 Bakiye kontrolü...');
        const response = await this.makeRequest('GET', '/api/v5/account/balance');
        const usdtBalance = response.data[0]?.details?.find(d => d.ccy === 'USDT');
        console.log('✅ Mevcut USDT bakiyesi:', usdtBalance?.availBal || 0);
        return parseFloat(usdtBalance?.availBal || 0);
    }

    async getInstrumentInfo(instId) {
        console.log(`\n🔍 ${instId} enstrüman bilgisi alınıyor...`);
        const response = await this.makeRequest('GET', `/api/v5/public/instruments?instType=SWAP&instId=${instId}`);
        if (response.data && response.data[0]) {
            const inst = response.data[0];
            console.log('✅ Enstrüman bilgileri:');
            console.log('  - Contract Value:', inst.ctVal);
            console.log('  - Contract Multiplier:', inst.ctMult);
            console.log('  - Lot Size:', inst.lotSz);
            console.log('  - Min Size:', inst.minSz);
            console.log('  - Tick Size:', inst.tickSz);
            console.log('  - Settlement Currency:', inst.settleCcy);
            return inst;
        }
        return null;
    }

    async getCurrentPrice(instId) {
        console.log(`\n💱 ${instId} güncel fiyat alınıyor...`);
        const response = await this.makeRequest('GET', `/api/v5/market/ticker?instId=${instId}`);
        const price = parseFloat(response.data[0]?.last);
        console.log('✅ Güncel fiyat:', price);
        return price;
    }

    async setLeverage(instId, lever, mgnMode = 'isolated') {
        console.log(`\n⚙️ ${instId} için kaldıraç ayarlanıyor: ${lever}x`);
        
        // Futures için hem long hem short taraf için ayrı ayrı ayarla
        const posSides = ['long', 'short'];
        
        for (const posSide of posSides) {
            try {
                const body = {
                    instId,
                    lever: lever.toString(),
                    mgnMode,
                    posSide
                };
                
                const response = await this.makeRequest('POST', '/api/v5/account/set-leverage', body);
                console.log(`✅ ${posSide} tarafı için kaldıraç ${lever}x ayarlandı`);
            } catch (error) {
                console.log(`⚠️ ${posSide} tarafı için kaldıraç ayarlanamadı:`, error.response?.data?.msg);
            }
        }
    }

    async placeOrder(instId, side, size, tdMode = 'isolated') {
        console.log(`\n📝 Emir gönderiliyor...`);
        console.log(`  - Instrument: ${instId}`);
        console.log(`  - Side: ${side}`);
        console.log(`  - Size: ${size} contracts`);
        console.log(`  - Mode: ${tdMode}`);

        const body = {
            instId,
            tdMode,
            side,
            posSide: side === 'buy' ? 'long' : 'short',
            ordType: 'market',
            sz: size.toString()
        };

        try {
            const response = await this.makeRequest('POST', '/api/v5/trade/order', body);
            
            if (response.code === '0') {
                console.log('✅ EMİR BAŞARILI!');
                console.log('  - Order ID:', response.data[0]?.ordId);
                console.log('  - Client Order ID:', response.data[0]?.clOrdId);
                return response;
            } else {
                console.log('❌ EMİR BAŞARISIZ!');
                console.log('  - Hata kodu:', response.code);
                console.log('  - Hata mesajı:', response.msg);
                if (response.data && response.data[0]) {
                    console.log('  - Detaylı hata:', response.data[0].sMsg);
                }
                return response;
            }
        } catch (error) {
            console.log('❌ EMİR GÖNDERİLEMEDİ!');
            throw error;
        }
    }
}

async function testSmallPosition() {
    const tester = new OKXTester();
    
    try {
        console.log('========================================');
        console.log('🚀 OKX FUTURES TEST - KÜÇÜK POZİSYON');
        console.log('========================================');
        
        // 1. Bakiye kontrolü
        const balance = await tester.getBalance();
        
        // 2. ETH-USDT-SWAP bilgilerini al
        const instId = 'ETH-USDT-SWAP';
        const instInfo = await tester.getInstrumentInfo(instId);
        
        // 3. Güncel fiyatı al
        const currentPrice = await tester.getCurrentPrice(instId);
        
        // 4. Pozisyon hesaplama
        const positionSizeUSDT = 7; // 7 USDT'lik pozisyon
        const leverage = 3;
        
        // Contract hesaplama
        const ctVal = parseFloat(instInfo.ctVal); // Her contract'ın BTC değeri
        const minSz = parseFloat(instInfo.minSz); // Minimum contract sayısı
        const lotSz = parseFloat(instInfo.lotSz); // Lot size
        
        console.log('\n📐 Pozisyon hesaplama:');
        console.log(`  - Hedef pozisyon: ${positionSizeUSDT} USDT`);
        console.log(`  - Kaldıraç: ${leverage}x`);
        console.log(`  - Güncel ETH fiyatı: ${currentPrice} USDT`);
        console.log(`  - Contract değeri: ${ctVal} ETH`);
        console.log(`  - Contract USDT değeri: ${ctVal * currentPrice} USDT`);
        
        // Contract sayısını hesapla (USDT değeri / (contract ETH değeri * ETH fiyatı))
        let contractCount = positionSizeUSDT / (ctVal * currentPrice);
        
        // Lot size'a yuvarla
        contractCount = Math.round(contractCount / lotSz) * lotSz;
        
        // Minimum size kontrolü
        if (contractCount < minSz) {
            contractCount = minSz;
        }
        
        console.log(`  - Hesaplanan contract sayısı: ${contractCount}`);
        console.log(`  - Toplam pozisyon değeri: ${contractCount * ctVal * currentPrice} USDT`);
        
        // 5. Kaldıraç ayarla
        await tester.setLeverage(instId, leverage);
        
        // 6. Emir gönder
        console.log('\n❓ Devam edilsin mi? (Evet için ENTER, iptal için CTRL+C)');
        // Kullanıcı onayı için bekle
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
        const orderResult = await tester.placeOrder(instId, 'buy', contractCount);
        
        console.log('\n========================================');
        console.log('✅ TEST TAMAMLANDI');
        console.log('========================================');
        
    } catch (error) {
        console.error('\n❌ Test başarısız:', error.message);
    }
}

// Testi çalıştır
console.log('Test başlatılıyor...\n');
testSmallPosition();
