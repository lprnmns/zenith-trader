const axios = require('axios');
const cfg = require('../src/config');
const key = cfg.zerionApiKey;
const auth = 'Basic ' + Buffer.from(key + ':').toString('base64');

async function main() {
  const addr = '0xc82b2e484b161d20eae386877d57c4e5807b5581';
  try {
    const tx = await axios.get(https://api.zerion.io/v1/wallets//transactions, {
      params: { 'filter[operation_types]': 'trade', currency: 'usd', 'page[size]': 5 },
      headers: { accept: 'application/json', authorization: auth },
    });
    console.log('tx_count', tx.data?.data?.length);
    const first = tx.data?.data?.[0]?.attributes || {};
    console.log('first_transfers');
    console.log(JSON.stringify(first.transfers, null, 2));

    const symSet = new Set();
    (tx.data?.data || []).forEach(it => {
      const t = it.attributes?.transfers || [];
      t.forEach(x => { if (x?.fungible_info?.symbol) symSet.add(x.fungible_info.symbol); });
    });
    const syms = Array.from(symSet).slice(0, 20).join(',');
    const fung = await axios.get('https://api.zerion.io/v1/fungibles', {
      params: { currency: 'usd', 'filter[query]': syms },
      headers: { accept: 'application/json', authorization: auth },
    });
    console.log('prices');
    console.log(JSON.stringify((fung.data?.data || []).map(d => ({ symbol: d.attributes?.symbol, price: d.attributes?.price?.value })), null, 2));
  } catch (e) {
    console.error('err', e.response?.data || e.message);
    process.exit(1);
  }
}
main();
