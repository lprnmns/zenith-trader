// src/services/okxService.js
const crypto = require('crypto');
const axios = require('axios');

class OKXService {
    constructor(apiKey, secretKey, passphrase, isDemo = true) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.passphrase = passphrase;
        this.baseURL = 'https://www.okx.com';
        this.isDemo = isDemo;
    }

    // Kimlik doğrulama başlıklarını oluştur
    getAuthHeaders(method, requestPath, body = '') {
        const timestamp = new Date().toISOString();
        
        let prehashString = `${timestamp}${method.toUpperCase()}${requestPath}`;
        if (body) {
            prehashString += JSON.stringify(body);
        }

        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(prehashString)
            .digest('base64');

        const headers = {
            'Content-Type': 'application/json',
            'OK-ACCESS-KEY': this.apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': this.passphrase
        };

        if (this.isDemo) {
            headers['x-simulated-trading'] = '1';
        }

        return headers;
    }

    // API isteği yap
    async makeRequest(method, endpoint, body = null) {
        const url = this.baseURL + endpoint;
        const headers = this.getAuthHeaders(method, endpoint, body);

        try {
            let response;
            if (method.toUpperCase() === 'POST') {
                response = await axios.post(url, body, { headers });
            } else if (method.toUpperCase() === 'GET') {
                // GET isteklerinde body olmaz, parametreler endpoint'e eklenir.
                response = await axios.get(url, { headers, params: body });
            }
            return response.data;
        } catch (error) {
            console.error('OKX API Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }

    // Kaldıraç ayarla
    async setLeverage(instId, lever, mgnMode, posSide) {
        const endpoint = '/api/v5/account/set-leverage';
        // DÜZELTME: posSide parametresi artık zorunlu ve her zaman gönderiliyor.
        const body = {
            instId,
            lever: lever.toString(),
            mgnMode,
            posSide 
        };
        
        return await this.makeRequest('POST', endpoint, body);
    }

    // Emir gönder
    async submitOrder(instId, tdMode, side, posSide, ordType, sz) {
        const endpoint = '/api/v5/trade/order';
        const body = {
            instId,
            tdMode,
            side,
            ordType,
            sz: sz.toString()
        };
        
        // posSide, vadeli işlemlerde (özellikle long/short modunda) zorunludur.
        if (posSide) {
            body.posSide = posSide;
        }

        return await this.makeRequest('POST', endpoint, body);
    }

    // Bakiye al
    async getBalance() {
        const endpoint = '/api/v5/account/balance';
        const response = await this.makeRequest('GET', endpoint);
        return response.data || response;
    }

    // Ticker al (Bu fonksiyon public bir endpoint kullanır, auth gerektirmez ama makeRequest ile de çalışır)
    async getTicker(instId) {
        const endpoint = `/api/v5/market/ticker`;
        const params = { instId };
        // Public endpoint olduğu için auth'suz da çağrılabilir ama makeRequest yapısı bozulmasın.
        const response = await axios.get(this.baseURL + endpoint, { params });
        return response.data.data || response.data;
    }

    // Enstrüman bilgilerini al
    async getInstruments(instType) {
        // DÜZELTME: Dokümantasyondaki doğru ve kimlik doğrulama gerektiren endpoint kullanıldı.
        const endpoint = `/api/v5/account/instruments?instType=${instType}`;
        const response = await this.makeRequest('GET', endpoint);
        return response.data || response;
    }
}

module.exports = OKXService;


