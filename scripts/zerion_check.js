const axios = require('axios');
const cfg = require('../src/config');
const key = cfg.zerionApiKey;

async function callWithBasic() {
  const headers = { accept: 'application/json', authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') };
  try {
    const r = await axios.get('https://api.zerion.io/v1/fungibles', { params: { currency: 'usd', 'filter[query]': 'UNI,WETH,WBTC,MNT,ZRO' }, headers });
    console.log('basic_ok', (r.data?.data||[]).length);
  } catch(e) {
    console.log('basic_err', e.response?.status, e.response?.data?.errors?.[0]?.title);
  }
}

async function callWithApiKey() {
  const headers = { accept: 'application/json', 'x-api-key': key };
  try {
    const r = await axios.get('https://api.zerion.io/v1/fungibles', { params: { currency: 'usd', 'filter[query]': 'UNI,WETH,WBTC,MNT,ZRO' }, headers });
    console.log('xapikey_ok', (r.data?.data||[]).length);
    console.log(JSON.stringify((r.data?.data||[]).map(d=>({symbol:d.attributes?.symbol, price:d.attributes?.price?.value})), null, 2));
  } catch(e) {
    console.log('xapikey_err', e.response?.status, e.response?.data?.errors?.[0]?.title);
  }
}

async function txNoCurrency() {
  const headers = { accept: 'application/json', authorization: 'Basic ' + Buffer.from(key + ':').toString('base64') };
  const addr = '0xc82b2e484b161d20eae386877d57c4e5807b5581';
  try {
    const r = await axios.get('https://api.zerion.io/v1/wallets/' + addr + '/transactions', { params: { 'filter[operation_types]': 'trade', 'page[size]': 5 }, headers });
    console.log('no_currency_tx', (r.data?.data||[]).length);
    const t = r.data?.data?.[0]?.attributes?.transfers || [];
    console.log(JSON.stringify(t, null, 2));
  } catch(e) {
    console.log('tx_no_currency_err', e.response?.status, e.response?.data?.errors?.[0]?.title);
  }
}

(async()=>{ await callWithBasic(); await callWithApiKey(); await txNoCurrency(); })();
