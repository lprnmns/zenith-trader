// src/services/zerionService.js
const axios = require('axios');
const config = require('../config');
const ZerionKeyPool = require('../utils/zerionKeyPool');

// Build a rotating key pool from env/config (prefer multi-key env)
const keyPool = new ZerionKeyPool(
  process.env.ZERION_API_KEYS || config.zerionApiKey || process.env.ZERION_API_KEY || '',
  {
    cooldownMs: process.env.ZERION_KEY_COOLDOWN_MS,
    notify: process.env.ZERION_NOTIFY_ON_THROTTLE,
    notifyCooldownMs: process.env.ZERION_NOTIFY_COOLDOWN_MS,
  }
);

function makeClient(activeKey) {
  return axios.create({
    baseURL: 'https://api.zerion.io/v1',
    headers: {
      accept: 'application/json',
      authorization: `Basic ${Buffer.from((activeKey || '') + ':', 'utf8').toString('base64')}`,
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    timeout: 20000,
  });
}

let activeKeyInfo = keyPool.getActiveKey() || { id: -1, key: '' };
let apiClient = makeClient(activeKeyInfo.key);

// Add request interceptor to add timestamp and refresh key if needed
apiClient.interceptors.request.use((cfg) => {
  cfg.params = cfg.params || {};
  cfg.params._t = Date.now();
  return cfg;
});

// Helper to retry once with a rotated key when throttled
async function requestWithRotation(method, url, options = {}) {
  try {
    // Respect global cooldown: try only if cooldown elapsed
    if (keyPool.inGlobalCooldown() && !keyPool.readyForGlobalRetry()) {
      const e = new Error('Global cooldown active for Zerion keys');
      e.code = 'ZERION_GLOBAL_COOLDOWN';
      throw e;
    }
    if (keyPool.readyForGlobalRetry()) {
      keyPool.clearGlobalCooldown({ notify: true });
    }
    return await apiClient.request({ method, url, ...options });
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.errors?.[0]?.detail || err?.message;
    if (status === 429 || /throttled/i.test(detail || '')) {
      if (activeKeyInfo && typeof activeKeyInfo.id === 'number') {
        keyPool.markThrottle(activeKeyInfo.id, { detail });
      }
      const next = keyPool.getActiveKey();
      if (next) {
        activeKeyInfo = next;
        apiClient = makeClient(next.key);
        return await apiClient.request({ method, url, ...options });
      } else {
        // All keys throttled: start global cooldown (1h default)
        keyPool.startGlobalCooldown({ message: 'All keys throttled (429). Pausing requests.' });
      }
    } else if (status === 401 || /unauthorized/i.test(detail || '')) {
      if (activeKeyInfo && typeof activeKeyInfo.id === 'number') {
        keyPool.markInvalid(activeKeyInfo.id, { detail });
      }
      const next = keyPool.getActiveKey();
      if (next && next.key !== activeKeyInfo.key) {
        activeKeyInfo = next;
        apiClient = makeClient(next.key);
        return await apiClient.request({ method, url, ...options });
      } else {
        // No valid key left -> start global cooldown
        keyPool.startGlobalCooldown({ message: 'All keys invalid or unavailable (401). Pausing requests.' });
      }
    } else if (err?.code === 'ZERION_GLOBAL_COOLDOWN') {
      // extend cooldown window on accidental retries
      keyPool.extendGlobalCooldown();
    }
    throw err;
  }
}

/**
 * Bir cüzdanın PnL önizlemesini, Zerion'un Portföy API'sinden alır.
 * @param {string} address - Cüzdan adresi.
 * @returns {Promise<Object|null>} Formatlanmış PnL verisi.
 */
async function getPerformancePreview(address) {
  try {
    const response = await requestWithRotation('get', `/wallets/${address}/portfolio`, { params: { currency: 'usd' } });
    const attr = response?.data?.data?.attributes || {};
    const ch = attr.changes || {};

    const result = {
      pnl1d: { usd: Number(ch.absolute_1d ?? 0), percent: Number(ch.percent_1d ?? 0) },
      pnl7d: { usd: Number(ch.absolute_7d ?? 0), percent: Number(ch.percent_7d ?? 0) },
      pnl30d: { usd: Number(ch.absolute_30d ?? 0), percent: Number(ch.percent_30d ?? 0) },
      pnl1y: { usd: Number(ch.absolute_1y ?? 0), percent: Number(ch.percent_1y ?? 0) },
      totalValueUsd: Number(
        attr.total_value_usd ??
        attr.total?.value ??
        attr.total?.portfolio_value_usd ??
        attr.net_usd ??
        attr.total?.net_usd ??
        0
      )
    };

    return result;
  } catch (error) {
    console.error(`[Zerion] PnL/portfolio fetch failed for ${address}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Belirli bir tarihten sonra gerçekleşen yeni trade sinyallerini getirir.
 * @param {string} address - Wallet address
 * @param {Date|string} sinceDate - Check trades after this date
 * @returns {Array} Array of trade signals [{type: 'BUY'|'SELL', token: 'ETH', amount: 1.5, date: Date}]
 */
async function getNewTradesForSignal(address, sinceDate) {
	try {
		console.log(`[Zerion] ${address} için yeni sinyal kontrolü (since: ${sinceDate?.toISOString?.() || sinceDate})`);
		
		// 🧪 FAKE TEST MODE - Generate fake signals
		const now = new Date();
		const fakeSignals = [
			{
				type: 'BUY',
				token: 'ETH',
				amount: 1.5,
				date: now,
				txHash: 'fake_tx_1'
			},
			{
				type: 'BUY', 
				token: 'BTC',
				amount: 0.1,
				date: now,
				txHash: 'fake_tx_2'
			}
		];
		
		console.log(`[Zerion] 🧪 FAKE TEST MODE - Generated ${fakeSignals.length} fake signals`);
		fakeSignals.forEach(signal => {
			console.log(`[Zerion] 🟢 FAKE ${signal.type} signal: ${signal.amount} ${signal.token}`);
		});
		
		return fakeSignals;
		
		/* REAL CODE - Disabled for testing
		const since = sinceDate ? new Date(sinceDate) : new Date(Date.now() - 30*60*1000); // Default: 30 min ago
		
		// Get recent transactions (trade, send, receive)
		const response = await apiClient.get(`/wallets/${address}/transactions`, {
			params: {
				'page[size]': 20,
				'filter[operation_types]': 'trade,send,receive'
			}
		});
		
		const transactions = response.data?.data || [];
		console.log(`[Zerion] Found ${transactions.length} recent transactions`);
		
		const signals = [];
		const isStable = (sym) => ['USDT','USDC','DAI','TUSD','USDP','FDUSD','BUSD'].includes(String(sym || '').toUpperCase());
		
		for (const tx of transactions) {
			const attr = tx.attributes || {};
			const txDate = new Date(attr.mined_at || attr.created_at);
			
			// Only check transactions after sinceDate
			if (txDate <= since) continue;
			
			const opType = attr.operation_type;
			const transfers = Array.isArray(attr.transfers) ? attr.transfers : [];
			
			if (opType === 'trade' && transfers.length >= 2) {
				// Direct trade
				const ins = transfers.filter(t => t.direction === 'in');
				const outs = transfers.filter(t => t.direction === 'out');
				
				for (const inTransfer of ins) {
					const inSymbol = inTransfer.fungible_info?.symbol;
					const inAmount = Number(inTransfer.quantity?.float || 0);
					
					if (inSymbol && !isStable(inSymbol) && inAmount > 0) {
						signals.push({
							type: 'BUY',
							token: inSymbol,
							amount: inAmount,
							date: txDate,
							txHash: tx.id
						});
						console.log(`[Zerion] 🟢 BUY signal: ${inAmount} ${inSymbol} at ${txDate.toISOString()}`);
					}
				}
				
				for (const outTransfer of outs) {
					const outSymbol = outTransfer.fungible_info?.symbol;
					const outAmount = Number(outTransfer.quantity?.float || 0);
					
					if (outSymbol && !isStable(outSymbol) && outAmount > 0) {
						signals.push({
							type: 'SELL',
							token: outSymbol,
							amount: outAmount,
							date: txDate,
							txHash: tx.id
						});
						console.log(`[Zerion] 🔴 SELL signal: ${outAmount} ${outSymbol} at ${txDate.toISOString()}`);
					}
				}
			}
			
			// For testing: treat any non-stable receive as potential BUY signal
			else if (opType === 'receive') {
				for (const transfer of transfers) {
					if (transfer.direction === 'in') {
						const symbol = transfer.fungible_info?.symbol;
						const amount = Number(transfer.quantity?.float || 0);
						
						if (symbol && !isStable(symbol) && amount > 0) {
							// Only add signal if significant amount (> $1 worth for testing)
							const usdValue = Number(transfer.fiat_value || 0);
							if (usdValue > 1) {
								signals.push({
									type: 'BUY',
									token: symbol,
									amount: amount,
									date: txDate,
									txHash: tx.id
								});
								console.log(`[Zerion] 📥 RECEIVE signal (treated as BUY): ${amount} ${symbol} ($${usdValue.toFixed(2)}) at ${txDate.toISOString()}`);
							}
						}
					}
				}
			}
		}
		
		console.log(`[Zerion] Generated ${signals.length} trading signals`);
		return signals;
		*/
		
	} catch (error) {
		console.error('[Zerion] Yeni sinyaller alınamadı:', error.response?.data || error.message);
		return [];
	}
}

/**
 * Fetch wallet transactions filtered to trades. Attempts to infer in/out values.
 * Returns { trades: Array<...>, next: string|null }
 */
async function getWalletTradesPage(address, cursor, operationTypes = ['trade']) {
  try {
    const params = {
      'filter[operation_types]': Array.isArray(operationTypes) ? operationTypes.join(',') : String(operationTypes || 'trade'),
      currency: 'usd',
      'page[size]': 100,
    };
    if (cursor) params['page[after]'] = cursor;
const response = await requestWithRotation('get', `/wallets/${address}/transactions`, { params });
    const items = response.data?.data || [];
    const trades = items.map((tx) => {
      const attr = tx.attributes || {};
      const opType = attr.operation_type || attr.type || null;
      const transfers = Array.isArray(attr.transfers) ? attr.transfers : [];
      const ins = transfers.filter((t) => t?.direction === 'in');
      const outs = transfers.filter((t) => t?.direction === 'out');
      const isStable = (sym) => ['USDT','USDC','DAI','TUSD','USDP','FDUSD','BUSD'].includes(String(sym || '').toUpperCase());
      const usdOf = (tr) => {
        const qty = Number(tr?.quantity?.float ?? tr?.value ?? 0) || 0;
        const sym = tr?.fungible_info?.symbol || tr?.symbol || null;
        const px = Number(tr?.price ?? tr?.fungible_info?.price?.value ?? 0) || 0;
        const fiat = Number(tr?.fiat_value ?? 0) || 0;
        if (fiat > 0) return fiat;
        if (qty > 0 && px > 0) return qty * px;
        if (qty > 0 && isStable(sym)) return qty; // $1 stable fallback
        return 0;
      };
      const sumUsd = (arr) => arr.reduce((s,t) => s + usdOf(t), 0);
      const inUsd = sumUsd(ins);
      const outUsd = sumUsd(outs);
      // primary tokens (largest by USD) to carry symbol/units
      const byUsdDesc = (a,b) => usdOf(b) - usdOf(a);
      const incoming = (ins.sort(byUsdDesc)[0]) || {};
      const outgoing = (outs.sort(byUsdDesc)[0]) || {};
      const inUnits = Number(incoming?.quantity?.float ?? incoming?.value ?? 0) || 0;
      const outUnits = Number(outgoing?.quantity?.float ?? outgoing?.value ?? 0) || 0;
      const inSymbol = incoming?.fungible_info?.symbol || incoming?.symbol || null;
      const outSymbol = outgoing?.fungible_info?.symbol || outgoing?.symbol || null;
      const inName = incoming?.fungible_info?.name || null;
      const outName = outgoing?.fungible_info?.name || null;
      const inId = incoming?.fungible_info?.id || null;
      const outId = outgoing?.fungible_info?.id || null;
      const inChain = incoming?.fungible_info?.implementations?.[0]?.chain_id || incoming?.chain?.id || null;
      const outChain = outgoing?.fungible_info?.implementations?.[0]?.chain_id || outgoing?.chain?.id || null;
      const inPriceUsd = Number(incoming?.price ?? incoming?.fungible_info?.price?.value ?? 0) || 0;
      const outPriceUsd = Number(outgoing?.price ?? outgoing?.fungible_info?.price?.value ?? 0) || 0;
      const minedAt = attr.mined_at || attr.timestamp || attr.created_at || null;
      const asset = inSymbol || outSymbol || 'UNKNOWN';
      const action = outUsd > 0 && inUnits === 0 ? 'SELL' : 'BUY'; // coarse fallback
      return {
        date: minedAt ? new Date(minedAt).toISOString() : null,
        operationType: opType,
        action,
        asset,
        amount: action === 'SELL' ? (outUnits || 0) : (inUnits || 0), // Token miktarı
        // PnL calculation için gerekli field'lar
        type: action?.toLowerCase(), // 'buy' veya 'sell'
        price: action === 'SELL' ? outPriceUsd : inPriceUsd,
        token: { symbol: action === 'SELL' ? outSymbol : inSymbol },
        _raw: {
          inUsd,
          outUsd,
          inUnits,
          outUnits,
          inSymbol,
          outSymbol,
          inId,
          outId,
          inChain,
          outChain,
          inPriceUsd,
          outPriceUsd,
          inName,
          outName,
        },
      };
    });
    const next = response.data?.links?.next_page_params?.page?.after || null;
    return { trades, next };
  } catch (error) {
    console.error('[Zerion] Trades alınamadı:', error.response?.data || error.message);
    return { trades: [], next: null };
  }
}

/**
 * Fetch up to maxCount trades by walking pages.
 */
async function getWalletTrades(address, maxCount = 500, operationTypes = ['trade']) {
  let all = [];
  let cursor = undefined;
  for (let i = 0; i < 10 && all.length < maxCount; i++) {
    const { trades, next } = await getWalletTradesPage(address, cursor, operationTypes);
    all = all.concat(trades);
    if (!next || trades.length === 0) break;
    cursor = next;
  }
  // Oldest to newest
  all.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return all;
}

/**
 * Helper to extract both sides of a trade explicitly for Position Ledger.
 * Returns normalized records with side symbols, units and USD.
 */
async function getWalletTradeTransfers(address, maxCount = 500) {
  console.log(`[Zerion] getWalletTradeTransfers called for ${address} at ${new Date().toISOString()}`);
  const poolCount = String(process.env.ZERION_API_KEYS || '').split(',').map(s=>s.trim()).filter(Boolean).length;
  console.log(`[Zerion] Key pool active: ${poolCount} keys`);
  console.log(`[Zerion] Cache busting timestamp: ${Date.now()}`);
  
  const raw = await getWalletTrades(address, maxCount, ['trade','send','receive']);
  console.log(`[Zerion] Raw trades fetched: ${raw.length} items`);
  
  // Log dates (no longer converting 2025 to 2024)
  if (raw.length > 0) {
    console.log(`[Zerion] First trade date: ${raw[0]?.date}`);
    console.log(`[Zerion] Last trade date: ${raw[raw.length - 1]?.date}`);
    console.log(`[Zerion] Sample trade:`, JSON.stringify(raw[0], null, 2).substring(0, 500));
  }
  
  let mapped = raw.map((t) => ({
    date: t.date,
    operationType: t.operationType || 'trade',
    inSymbol: t._raw?.inSymbol || null,
    outSymbol: t._raw?.outSymbol || null,
    inId: t._raw?.inId || null,
    outId: t._raw?.outId || null,
    inUsd: Number(t._raw?.inUsd ?? 0) || 0,
    outUsd: Number(t._raw?.outUsd ?? 0) || 0,
    inUnits: Number(t._raw?.inUnits ?? 0) || 0,
    outUnits: Number(t._raw?.outUnits ?? 0) || 0,
    inName: t._raw?.inName || null,
    outName: t._raw?.outName || null,
    inChain: t._raw?.inChain || null,
    outChain: t._raw?.outChain || null,
  }));
  
  console.log(`[Zerion] Mapped ${mapped.length} transfers`);
  if (mapped.length > 0) return mapped;
  // Fallback: fetch without operation type filter
  async function getPage(address, cursor) {
    const params = { currency: 'usd', 'page[size]': 100 };
    if (cursor) params['page[after]'] = cursor;
const response = await requestWithRotation('get', `/wallets/${address}/transactions`, { params });
    const items = response.data?.data || [];
    const recs = items.map((tx) => {
      const attr = tx.attributes || {};
      const transfers = Array.isArray(attr.transfers) ? attr.transfers : [];
      const incoming = transfers.find((t) => t?.direction === 'in') || {};
      const outgoing = transfers.find((t) => t?.direction === 'out') || {};
      const inUsd = Number(incoming?.fiat_value ?? 0) || 0;
      const outUsd = Number(outgoing?.fiat_value ?? 0) || 0;
      const inUnits = Number(incoming?.value ?? 0) || 0;
      const outUnits = Number(outgoing?.value ?? 0) || 0;
      const inSymbol = incoming?.fungible_info?.symbol || incoming?.symbol || null;
      const outSymbol = outgoing?.fungible_info?.symbol || outgoing?.symbol || null;
      const minedAt = attr.mined_at || attr.timestamp || attr.created_at || null;
      return { date: minedAt ? new Date(minedAt).toISOString() : null, inSymbol, outSymbol, inUsd, outUsd, inUnits, outUnits };
    });
    const next = response.data?.links?.next_page_params?.page?.after || null;
    return { recs, next };
  }
  let all = [];
  let cursor = undefined;
  for (let i = 0; i < 10 && all.length < maxCount; i++) {
    const { recs, next } = await getPage(address, cursor);
    all = all.concat(recs);
    if (!next || recs.length === 0) break;
    cursor = next;
  }
  // Oldest to newest
  all.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return all;
}

module.exports = { getPerformancePreview, getNewTradesForSignal, getWalletTrades, getWalletTradeTransfers };

/**
 * Fetch fungible prices by symbol list in one request. Returns Map(symbolUpper -> price)
 */
// Simple TTL cache for prices
const PRICE_TTL_MS = Number(process.env.PRICE_TTL_MS || 90000);
const priceCache = new Map(); // key: SYMBOL -> { value:number, ts:number }
function cacheGet(sym) {
  const k = String(sym || '').toUpperCase();
  const hit = priceCache.get(k);
  if (!hit) return undefined;
  if (Date.now() - hit.ts > PRICE_TTL_MS) {
    priceCache.delete(k);
    return undefined;
  }
  return hit.value;
}
function cacheSet(sym, val) {
  const k = String(sym || '').toUpperCase();
  priceCache.set(k, { value: Number(val), ts: Date.now() });
}

async function getPricesForSymbols(symbols = []) {
  const list = Array.from(new Set((symbols || []).filter(Boolean).map((s) => String(s).toUpperCase())));
  if (list.length === 0) return new Map();
  const out = new Map();
  try {
    console.log(`[Zerion] getPricesForSymbols at ${new Date().toISOString()}:`, list.join(','));
    // Query per symbol to ensure match; filter[query] doesn't support comma-joined lists reliably
    const requests = list.map(async (sym) => {
      // Try cache first
      const cached = cacheGet(sym);
      if (typeof cached === 'number' && cached > 0) {
        out.set(sym, cached);
        return;
      }
      try {
        // Note: timestamp already added via interceptor
        const resp = await requestWithRotation('get', '/fungibles', { 
          params: { 
            currency: 'usd', 
            'filter[query]': sym
          } 
        });
        const items = resp.data?.data || [];
        // Prefer exact symbol match if multiple results
        let best = items.find((d) => String(d?.attributes?.symbol || '').toUpperCase() === sym) || items[0];
        const price = best?.attributes?.price?.value;
        if (typeof price === 'number') {
          out.set(sym, Number(price));
          cacheSet(sym, price);
          console.log(`[Zerion] Price for ${sym}: $${price}`);
        } else {
          console.warn('[Zerion] No price in fungibles item for symbol', sym);
        }
      } catch (err) {
        console.warn('[Zerion] fungibles query failed for symbol', sym, err.response?.data || err.message);
      }
    });
    await Promise.all(requests);
    console.log('[Zerion] symbol->price resolved:', Object.fromEntries(out));

    // Fallback to Coingecko if Zerion did not return prices
    if (out.size === 0) {
      console.warn('[Zerion] Falling back to Coingecko for prices of:', list.join(','));
      try {
        const cg = await getPricesFromCoingecko(list);
        if (cg && cg.size > 0) {
          cg.forEach((v, k) => out.set(k, v));
          console.log('[Coingecko] Fallback symbol->price resolved:', Object.fromEntries(out));
        }
      } catch (e) {
        console.warn('[Coingecko] fallback failed:', e.message);
      }
    }
  } catch (error) {
    console.error('[Zerion] prices fetch failed:', error.response?.data || error.message);
  }
  return out;
}

module.exports.getPricesForSymbols = getPricesForSymbols;


/**
 * Fetch fungible prices by Zerion asset IDs. Returns Map(id -> price)
 */
async function getPricesByIds(ids = []) {
  const list = (ids || []).filter(Boolean);
  if (list.length === 0) return new Map();
  try {
    console.log('[Zerion] getPricesByIds:', list.length);
    const q = Array.from(new Set(list.map((s) => String(s).trim()))).join(',');
    const resp = await apiClient.get('/fungibles', { params: { currency: 'usd', 'filter[ids]': q, 'page[size]': 100 } });
    const out = new Map();
    for (const d of resp.data?.data || []) {
      const id = d?.id;
      const price = d?.attributes?.price?.value;
      if (id && typeof price === 'number') out.set(String(id), Number(price));
    }
    console.log('[Zerion] ids->price resolved count:', out.size);
    return out;
  } catch (error) {
    console.error('[Zerion] prices by ids fetch failed:', error.response?.data || error.message);
    return new Map();
  }
}

module.exports.getPricesByIds = getPricesByIds;

/**
 * Compute PnL percent for a wallet using charts/custom (start/end in epoch seconds)
 */
async function getPnLPercentViaCharts(address, days) {
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - days * 24 * 60 * 60;
    const resp = await apiClient.get(`/wallets/${address}/charts/custom`, {
      params: { start, end, currency: 'usd', _t: Date.now() },
    });
    const arr = resp?.data?.data || [];
    if (!Array.isArray(arr) || arr.length < 2) return 0;
    const pickVal = (p) => {
      const a = p?.attributes || p || {};
      return Number(
        a.value ?? a.total_value_usd ?? a.portfolio_value_usd ?? a.net_usd ?? a.total?.value ?? 0
      ) || 0;
    };
    const first = pickVal(arr[0]);
    const last = pickVal(arr[arr.length - 1]);
    if (first <= 0) return 0;
    return ((last - first) / first) * 100;
  } catch (error) {
    return 0;
  }
}

/**
 * Get PnL percent set for 1/7/30 days using charts method.
 */
async function getPnLSet(address) {
  // Compute in parallel for speed
  const [p1d, p7d, p30d, p365d] = await Promise.all([
    getPnLPercentViaCharts(address, 1),
    getPnLPercentViaCharts(address, 7),
    getPnLPercentViaCharts(address, 30),
    getPnLPercentViaCharts(address, 365),
  ]);
  return { p1d, p7d, p30d, p365d };
}

module.exports.getPnLPercentViaCharts = getPnLPercentViaCharts;
module.exports.getPnLSet = getPnLSet;

/**
 * Fallback: Fetch prices from Coingecko for a subset of common symbols.
 * Returns Map(symbolUpper -> price)
 */
let CG_BACKOFF_UNTIL = 0;

async function getPricesFromCoingecko(symbols = []) {
  const list = Array.from(new Set((symbols || []).filter(Boolean).map((s) => String(s).toUpperCase())));
  if (list.length === 0) return new Map();
  // Respect global backoff to avoid repeated 429s
  if (CG_BACKOFF_UNTIL && Date.now() < CG_BACKOFF_UNTIL) {
    return new Map();
  }
  const symbolToId = {
    ETH: 'ethereum',
    WETH: 'weth',
    WBTC: 'wrapped-bitcoin',
    BTC: 'bitcoin',
    UNI: 'uniswap',
    AVAX: 'avalanche-2',
    FET: 'fetch-ai',
    MNT: 'mantle',
    ZRO: 'layerzero',
    ARB: 'arbitrum',
    OP: 'optimism',
    SOL: 'solana',
    USDT: 'tether',
    USDC: 'usd-coin',
    RESOLV: 'resolv', // Add if exists
  };
  const ids = list.map((s) => symbolToId[s]).filter(Boolean);
  if (ids.length === 0) return new Map();
  try {
    console.log(`[Coingecko] Fetching fresh prices at ${new Date().toISOString()} for:`, list.join(','));
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd`;
    const resp = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    const out = new Map();
    for (const [sym, id] of Object.entries(symbolToId)) {
      if (!list.includes(sym)) continue;
      const price = resp.data?.[id]?.usd;
      if (typeof price === 'number') {
        out.set(sym, Number(price));
        console.log(`[Coingecko] Price for ${sym}: $${price}`);
      }
    }
    console.log('[Coingecko] symbol->price resolved:', Object.fromEntries(out));
    return out;
  } catch (error) {
    if (error?.response?.status === 429) {
      // Backoff 5 minutes on rate limit
      CG_BACKOFF_UNTIL = Date.now() + 5 * 60 * 1000;
      console.warn('[Coingecko] 429 rate limited. Backing off for 5 minutes.');
    } else {
      console.warn('[Coingecko] price fetch failed:', error.message);
    }
    return new Map();
  }
}

module.exports.getPricesFromCoingecko = getPricesFromCoingecko;

/**
 * Get top token holders (by value) for a given Zerion fungible ID.
 * Returns [{ address }]
 */
async function getTopTokenHolders(tokenId, count = 100) {
  try {
    const resp = await apiClient.get(`/fungibles/${tokenId}/wallets`, { params: { sort: '-value', 'page[size]': count } });
    const arr = resp.data?.data || [];
    return arr.map((item) => ({ address: item?.id })).filter((x) => x.address);
  } catch (error) {
    console.error(`[Zerion] top holders fetch failed for ${tokenId}:`, error.response?.data || error.message);
    return [];
  }
}

module.exports.getTopTokenHolders = getTopTokenHolders;

/**
 * Helper: collect addresses from transactions list
 */
function collectAddressesFromTransactions(list = []) {
  const set = new Set();
  for (const tx of list) {
    const attr = tx?.attributes || {};
    if (attr.sender) set.add(attr.sender);
    const transfers = Array.isArray(attr.transfers) ? attr.transfers : [];
    for (const t of transfers) {
      if (t?.address_from) set.add(t.address_from);
      if (t?.address_to) set.add(t.address_to);
    }
  }
  return set;
}

/**
 * Try to get candidate holders for a fungible id using multiple strategies.
 */
async function getCandidateAddressesForTokenId(tokenId, count = 100) {
  // Strategy 1: wallets under fungible (if available)
  try {
    const holders = await getTopTokenHolders(tokenId, count);
    if (holders.length > 0) return new Set(holders.map((h) => h.address));
  } catch {}
  // Strategy 2: recent transactions for the fungible
  try {
    const txResp = await apiClient.get(`/fungibles/${tokenId}/transactions`, {
      params: { 'filter[operation_types]': 'trade', 'page[size]': 200, sort: '-mined_at' }
    });
    return collectAddressesFromTransactions(txResp.data?.data || []);
  } catch (error) {
    console.warn('[Zerion] fungible transactions fallback failed for', tokenId, error.response?.data || error.message);
    return new Set();
  }
}

async function walletHasRecentTrade(address, sinceIso) {
  try {
    const resp = await apiClient.get(`/wallets/${address}/transactions`, {
      params: {
        'filter[operation_types]': 'trade',
        'filter[since]': sinceIso,
        'page[size]': 50,
        sort: '-mined_at'
      }
    });
    const arr = resp.data?.data || [];
    return arr.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * NEW SAFE FALLBACK: Discover candidates by
 * 1) Taking SEED_TOKEN_IDS from config
 * 2) For each token id, listing wallets holding that token via /wallets?filter[of_fungible_ids]
 * 3) Checking last-24h trade activity per wallet
 */
async function findRecentActiveWallets() {
  try {
    const tokenIds = Array.from(new Set((config.SEED_TOKEN_IDS || []).filter(Boolean)));
    if (tokenIds.length === 0) return new Set();
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const candidateSet = new Set();

    for (const tokenId of tokenIds) {
      try {
        const walletsResp = await apiClient.get('/wallets', {
          params: {
            'filter[of_fungible_ids]': tokenId,
            'page[size]': 100,
            sort: '-portfolio.total_value'
          }
        });
        const wallets = walletsResp.data?.data || [];
        for (const w of wallets) {
          const address = w?.id;
          if (!address) continue;
          const active = await walletHasRecentTrade(address, sinceIso);
          if (active) candidateSet.add(address);
        }
      } catch (err) {
        console.warn('[Zerion] wallets by fungible fallback failed for', tokenId, err.response?.data || err.message);
      }
    }
    return candidateSet;
  } catch (error) {
    console.error('[Zerion] findRecentActiveWallets failed:', error.response?.data || error.message);
    return new Set();
  }
}

module.exports.findRecentActiveWallets = findRecentActiveWallets;

/**
 * Belirli bir token'ı portföyünde tutan cüzdanların bir listesini getirir.
 * @param {string} tokenId - Zerion fungible ID'si.
 * @param {number} count - Kaç cüzdan getirileceği.
 * @returns {Promise<string[]>} - Cüzdan adreslerinin bir dizisi.
 */
async function getWalletsByTokenHolding(tokenId, count = 100) {
  try {
    const response = await apiClient.get('/wallets', {
      params: {
        'filter[of_fungible_ids]': tokenId,
        'sort': '-portfolio.total_value', // En büyük portföyden başla
        'page[size]': count
      }
    });
    return response.data.data.map(wallet => wallet.id); // Cüzdan adresi 'id' alanında gelir
  } catch (error) {
    console.error(`[Zerion] ${tokenId} token'ını tutan cüzdanlar alınamadı:`, error.message);
    return [];
  }
}

module.exports.getWalletsByTokenHolding = getWalletsByTokenHolding;

/**
 * Bir cüzdanın toplam portföy değerini USD olarak getirir.
 * @param {string} address - Cüzdan adresi.
 * @returns {Promise<number>} - Toplam portföy değeri USD.
 */
async function getWalletTotalValueUsd(address) {
  try {
    // 1) Preview üzerinden hızlı değer
    const preview = await getPerformancePreview(address);
    if (preview && typeof preview.totalValueUsd === 'number' && preview.totalValueUsd > 0) {
      return Number(preview.totalValueUsd);
    }

    // 2) Portföy endpoint'inden tüm alanları dene
    const response = await apiClient.get(`/wallets/${address}/portfolio`, { params: { currency: 'usd' } });
    const attr = response?.data?.data?.attributes || {};

    let total =
      Number(attr.total_value_usd ?? 0) ||
      Number(attr.total?.value ?? 0) ||
      Number(attr.total?.portfolio_value_usd ?? 0) ||
      Number(attr.net_usd ?? 0) ||
      Number(attr.total?.net_usd ?? 0) || 0;

    // 3) Eğer 0 ise dağılım alanlarını topla
    const sumVals = (obj) => Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    if (total <= 0) {
      const byType = attr.positions_distribution_by_type || {};
      const sumByType = sumVals(byType);
      if (sumByType > 0) total = sumByType;
    }
    if (total <= 0) {
      const byChain = attr.positions_distribution_by_chain || {};
      const sumByChain = sumVals(byChain);
      if (sumByChain > 0) total = sumByChain;
    }

    return Number(total || 0);
  } catch (error) {
    console.error(`[Zerion] ${address} için portföy değeri alınamadı:`, error.response?.data || error.message);
    return 0;
  }
}

module.exports.getWalletTotalValueUsd = getWalletTotalValueUsd;

/**
 * Belirli bir vade için PnL hesaplar (realized + unrealized)
 * @param {string} address - Cüzdan adresi
 * @param {number} days - Kaç gün geriye bakacak (7, 30, 365)
 * @returns {Promise<{pnlUSD: number, pnlPercentage: number}>}
 */
async function calculatePnLForPeriod(address, days) {
  try {
    console.log(`[Zerion] ${address} için ${days} günlük PnL hesaplanıyor...`);
    
    // Vade başlangıç tarihi
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Trade verilerini çek (daha fazla trade için limit artır)
    const trades = await getWalletTrades(address, 200);
    
    // Vade içindeki trade'leri filtrele
    const periodTrades = trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      return tradeDate >= startDate;
    });
    
    console.log(`[Zerion] ${address}: ${periodTrades.length} trade found for ${days}d period`);
    
    if (periodTrades.length === 0) {
      return { pnlUSD: 0, pnlPercentage: 0 };
    }
    
    // Token bazında pozisyonları hesapla
    const positions = calculatePositions(periodTrades);
    
    // Current prices al - 3-katmanlı sistem (position ledger'daki gibi)
    const tokenSymbols = Array.from(new Set(periodTrades.map(t => t.token?.symbol).filter(Boolean)));
    
    // 1. Zerion by symbol
    let currentPrices = await getPricesForSymbols(tokenSymbols);
    
    // 2. Coingecko fallback for missing symbols (like position ledger does)
    const missingSymbols = tokenSymbols.filter(s => !currentPrices.has(s.toUpperCase()));
    if (missingSymbols.length > 0) {
      console.log(`[Zerion] ${missingSymbols.length} symbols missing from Zerion, trying Coingecko fallback`);
      const cgMap = await getPricesFromCoingecko(missingSymbols);
      for (const [k, v] of cgMap.entries()) {
        currentPrices.set(k, v);
      }
    }
    
    // Realized PnL hesapla
    let realizedPnL = 0;
    let unrealizedPnL = 0;
    let totalInvested = 0;
    
    for (const [symbol, position] of Object.entries(positions)) {
      const currentPrice = currentPrices.get(symbol.toUpperCase()) || 0;
      
      // Realized PnL (kapalı trade'ler)
      realizedPnL += position.realizedPnL;
      
      // Unrealized PnL (açık pozisyonlar)
      if (position.netAmount !== 0 && currentPrice > 0) {
        const entryValue = Math.abs(position.netAmount) * position.avgEntryPrice;
        const currentValue = Math.abs(position.netAmount) * currentPrice;
        unrealizedPnL += currentValue - entryValue;
      }
      
      totalInvested += position.totalInvested;
    }
    
    const totalPnL = realizedPnL + unrealizedPnL;
    const pnlPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    
    console.log(`[Zerion] ${address} ${days}d PnL: $${totalPnL.toFixed(2)} (${pnlPercentage.toFixed(2)}%)`);
    console.log(`[Zerion] - Realized: $${realizedPnL.toFixed(2)}, Unrealized: $${unrealizedPnL.toFixed(2)}`);
    
    return {
      pnlUSD: totalPnL,
      pnlPercentage: pnlPercentage,
      realizedPnL: realizedPnL,
      unrealizedPnL: unrealizedPnL
    };
    
  } catch (error) {
    console.error(`[Zerion] ${address} ${days}d PnL calculation failed:`, error.message);
    return { pnlUSD: 0, pnlPercentage: 0, realizedPnL: 0, unrealizedPnL: 0 };
  }
}

/**
 * Trade'lerden pozisyonları hesaplar
 * @param {Array} trades - Trade listesi
 * @returns {Object} Token symbol -> position data mapping
 */
function calculatePositions(trades) {
  const positions = {};
  
  for (const trade of trades) {
    const symbol = trade.token?.symbol;
    if (!symbol) continue;
    
    if (!positions[symbol]) {
      positions[symbol] = {
        netAmount: 0,
        totalBought: 0,
        totalSold: 0,
        totalInvested: 0,
        avgEntryPrice: 0,
        realizedPnL: 0
      };
    }
    
    const pos = positions[symbol];
    const amount = Number(trade.amount || 0);
    const price = Number(trade.price || 0);
    const value = Math.abs(amount * price);
    
    if (trade.type === 'buy' || trade.type === 'receive') {
      pos.netAmount += amount;
      pos.totalBought += amount;
      pos.totalInvested += value;
      
      // Weighted average entry price güncelle
      if (pos.netAmount > 0) {
        pos.avgEntryPrice = pos.totalInvested / pos.totalBought;
      }
      
    } else if (trade.type === 'sell' || trade.type === 'send') {
      const sellAmount = Math.abs(amount);
      const sellValue = sellAmount * price;
      
      if (pos.netAmount > 0) {
        // Realized PnL hesapla
        const costBasis = sellAmount * pos.avgEntryPrice;
        pos.realizedPnL += sellValue - costBasis;
      }
      
      pos.netAmount -= sellAmount;
      pos.totalSold += sellAmount;
    }
  }
  
  return positions;
}

module.exports.calculatePnLForPeriod = calculatePnLForPeriod;

// Compute PnL percentages (1d/7d/30d/365d) using ledger/trade method
async function getLedgerPnLSet(address) {
  const [d1, d7, d30, d365] = await Promise.all([
    calculatePnLForPeriod(address, 1),
    calculatePnLForPeriod(address, 7),
    calculatePnLForPeriod(address, 30),
    calculatePnLForPeriod(address, 365),
  ]);
  return {
    p1d: Number(d1?.pnlPercentage || 0),
    p7d: Number(d7?.pnlPercentage || 0),
    p30d: Number(d30?.pnlPercentage || 0),
    p365d: Number(d365?.pnlPercentage || 0),
  };
}

module.exports.getLedgerPnLSet = getLedgerPnLSet;
