// Test OKX API directly with given credentials
const axios = require('axios');
const crypto = require('crypto');

// API bilgileri (sizin verdiğiniz)
const API_KEY = '82cf6d49-61d4-4bc0-80fa-d507e11688cd';
const SECRET_KEY = 'D34E625EAF20941DA3665B25377A26E2';
const PASSPHRASE = 'Kgkput_4896';

async function testOKXAPI() {
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const endpoint = '/api/v5/account/balance';
    
    // Signature oluştur
    const prehashString = `${timestamp}${method}${endpoint}`;
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(prehashString)
        .digest('base64');
    
    const headers = {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': API_KEY,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': PASSPHRASE
    };
    
    try {
        console.log('Testing LIVE environment (without x-simulated-trading header)...');
        const response = await axios.get('https://www.okx.com' + endpoint, { headers });
        console.log('✅ SUCCESS - Live API works!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ LIVE API failed:', error.response?.data || error.message);
        
        // Demo ortamı dene
        console.log('\nTesting DEMO environment (with x-simulated-trading header)...');
        headers['x-simulated-trading'] = '1';
        
        try {
            const demoResponse = await axios.get('https://www.okx.com' + endpoint, { headers });
            console.log('✅ SUCCESS - Demo API works!');
            console.log('Response:', JSON.stringify(demoResponse.data, null, 2));
        } catch (demoError) {
            console.log('❌ DEMO API also failed:', demoError.response?.data || demoError.message);
        }
    }
}

testOKXAPI();
