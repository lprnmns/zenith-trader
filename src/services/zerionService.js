// src/services/zerionService.js
const axios = require('axios');
const config = require('../config');

const apiClient = axios.create({
	baseURL: 'https://api.zerion.io/v1',
	headers: {
		'accept': 'application/json',
		'authorization': `Basic ${Buffer.from(config.zerionApiKey + ':', 'utf8').toString('base64')}`
	}
});

/**
 * Bir cüzdanın PnL önizlemesini, Zerion'un Portföy API'sinden alır.
 * @param {string} address - Cüzdan adresi.
 * @returns {Promise<Object|null>} Formatlanmış PnL verisi.
 */
async function getPerformancePreview(address) {
	try {
		const response = await apiClient.get(`/wallets/${address}/portfolio`);
		const portfolio = response.data.data.attributes;
		
		// Debug logs removed for production
		
		const results = {
			"1G": { pnlUSD: portfolio.changes?.absolute_1d, pnlPercentage: portfolio.changes?.percent_1d },
			"1H": { pnlUSD: portfolio.changes?.absolute_7d, pnlPercentage: portfolio.changes?.percent_7d },
			"1A": { pnlUSD: portfolio.changes?.absolute_30d, pnlPercentage: portfolio.changes?.percent_30d },
			"1Y": { pnlUSD: portfolio.changes?.absolute_1y, pnlPercentage: portfolio.changes?.percent_1y }
		};
		console.log(`[Zerion] ${address} için PnL verisi başarıyla alındı.`);
		return results;
	} catch (error) {
		console.error(`[Zerion] PnL alınamadı:`, error.response?.data || error.message);
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
    const response = await apiClient.get(`/wallets/${address}/transactions`, { params });
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
  const raw = await getWalletTrades(address, maxCount, ['trade','send','receive']);
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
  if (mapped.length > 0) return mapped;
  // Fallback: fetch without operation type filter
  async function getPage(address, cursor) {
    const params = { currency: 'usd', 'page[size]': 100 };
    if (cursor) params['page[after]'] = cursor;
    const response = await apiClient.get(`/wallets/${address}/transactions`, { params });
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
async function getPricesForSymbols(symbols = []) {
  const list = Array.from(new Set((symbols || []).filter(Boolean).map((s) => String(s).toUpperCase())));
  if (list.length === 0) return new Map();
  const out = new Map();
  try {
    console.log('[Zerion] getPricesForSymbols:', list.join(','));
    // Query per symbol to ensure match; filter[query] doesn't support comma-joined lists reliably
    const requests = list.map(async (sym) => {
      try {
        const resp = await apiClient.get('/fungibles', { params: { currency: 'usd', 'filter[query]': sym } });
        const items = resp.data?.data || [];
        // Prefer exact symbol match if multiple results
        let best = items.find((d) => String(d?.attributes?.symbol || '').toUpperCase() === sym) || items[0];
        const price = best?.attributes?.price?.value;
        if (typeof price === 'number') out.set(sym, Number(price));
        else console.warn('[Zerion] No price in fungibles item for symbol', sym);
      } catch (err) {
        console.warn('[Zerion] fungibles query failed for symbol', sym, err.response?.data || err.message);
      }
    });
    await Promise.all(requests);
    console.log('[Zerion] symbol->price resolved:', Object.fromEntries(out));
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
 * Fallback: Fetch prices from Coingecko for a subset of common symbols.
 * Returns Map(symbolUpper -> price)
 */
async function getPricesFromCoingecko(symbols = []) {
  const list = Array.from(new Set((symbols || []).filter(Boolean).map((s) => String(s).toUpperCase())));
  if (list.length === 0) return new Map();
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
  };
  const ids = list.map((s) => symbolToId[s]).filter(Boolean);
  if (ids.length === 0) return new Map();
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd`;
    const resp = await axios.get(url, { timeout: 10000 });
    const out = new Map();
    for (const [sym, id] of Object.entries(symbolToId)) {
      if (!list.includes(sym)) continue;
      const price = resp.data?.[id]?.usd;
      if (typeof price === 'number') out.set(sym, Number(price));
    }
    console.log('[Coingecko] symbol->price resolved:', Object.fromEntries(out));
    return out;
  } catch (error) {
    console.warn('[Coingecko] price fetch failed:', error.message);
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
    const response = await apiClient.get(`/wallets/${address}/portfolio`);
    const portfolio = response.data.data.attributes;
    return Number(portfolio.total?.positions || 0);
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


