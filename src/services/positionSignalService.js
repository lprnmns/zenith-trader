const analysisService = require('./analysisService');
const zerionService = require('./zerionService');
const stableCoinService = require('./stableCoinService');
const tokenMappings = require('./tokenMappings');
const cexDetectionService = require('./cexDetectionService');
const logger = require('../utils/logger');
// Cache for storing previous trade history to detect new positions
const tradeHistoryCache = new Map();

/**
 * Get new trading signals based on Position Ledger changes
 * @param {string} address - Wallet address to monitor
 * @param {Date} sinceDate - Last check date
 * @returns {Array} Array of trading signals
 */
async function getNewPositionSignals(address, sinceDate) {
  try {
    console.log(`[PositionSignal] ${address} için pozisyon değişikliklerini kontrol ediyor...`);
    
    // Get current wallet analysis (Position Ledger)
    const currentAnalysis = await analysisService.analyzeWallet(address);
    if (!currentAnalysis || !currentAnalysis.tradeHistory) {
      console.log(`[PositionSignal] ${address} için analiz bulunamadı`);
      return [];
    }

    // Get wallet total value (NOW)
    const totalValue = await zerionService.getWalletTotalValueUsd(address);
    if (!totalValue || totalValue <= 0) {
      console.log(`[PositionSignal] ${address} için toplam değer alınamadı: ${totalValue}`);
      return [];
    }

    console.log(`[PositionSignal] ${address} toplam değeri: $${totalValue.toFixed(2)}`);

    // Cache portfolio value per date to minimize Zerion chart calls
    const portfolioAtDateCache = new Map(); // key: date ISO -> number
    const getPortfolioBase = async (dateIso) => {
      const key = String(dateIso || '').slice(0, 19); // trim millis for cache hit
      if (portfolioAtDateCache.has(key)) return portfolioAtDateCache.get(key);
      let v = 0;
      try {
        v = await zerionService.getPortfolioValueAtDate(address, dateIso);
      } catch (e) {
        v = 0;
      }
      if (!v || v <= 0) v = totalValue; // safe fallback
      portfolioAtDateCache.set(key, v);
      return v;
    };

    // Filter trades by date - only get trades after sinceDate or server start time
    const serverStartTime = sinceDate || new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago if no sinceDate
    const currentHistory = currentAnalysis.tradeHistory.filter(trade => {
      const tradeDate = new Date(trade.date);
      return tradeDate >= serverStartTime;
    });

    console.log(`[PositionSignal] ${address} için ${currentAnalysis.tradeHistory.length} işlemden ${currentHistory.length} tanesi son ${sinceDate ? 'kontrol tarihinden' : 'sunucu başlangıcından'} sonra`);

    // Get previous trade history from cache
    const previousHistory = tradeHistoryCache.get(address) || [];

    // Find new trades by comparing current vs previous
    const newSignals = [];
    const processedTrades = new Set();

    // Check for new BUY signals (new positions opened)
    for (const currentTrade of currentHistory) {
      if (currentTrade.action === 'BUY') {
        const tradeId = currentTrade.id;
        const previousTrade = previousHistory.find(t => t.id === tradeId);
        
        // If this trade is new (not in previous history)
        if (!previousTrade && !processedTrades.has(tradeId)) {
          processedTrades.add(tradeId);
          
// Calculate position percentage using portfolio value at trade date
          const positionValue = currentTrade.amountUsd;
          const baseAtDate = await getPortfolioBase(currentTrade.date);
          let positionPercentage = (positionValue / baseAtDate) * 100;
          if (process.env.PERCENTAGE_CLAMP_100 !== '0' && isFinite(positionPercentage)) {
            if (positionPercentage > 100) positionPercentage = 100;
            if (positionPercentage < 0) positionPercentage = 0;
          }
          
          // Normalize potential provider aliases (e.g., USDT0 -> USDT)
          const assetSym = String(currentTrade.asset || '').toUpperCase();
          const normalizedStable = stableCoinService.getNormalizedStableSymbol(assetSym);
          
          // Skip stable coin purchases (including mapped variants like USDT0)
          if (normalizedStable) {
            console.log(`[PositionSignal] 🚫 Stable coin purchase ignored: ${assetSym} -> ${normalizedStable}`);
            continue;
          }
          
          // Check if token should be ignored (dead/scam/defi-wrapper)
          if (tokenMappings.shouldIgnore(assetSym)) {
            console.log(`[PositionSignal] ⚠️ Ignored token: ${assetSym}`);
            continue;
          }
          
          // Check for CEX transfers (if trade has address info)
          if (currentTrade.to || currentTrade.from) {
            const cexDetection = cexDetectionService.detectCEXTransfer({
              to: currentTrade.to,
              from: currentTrade.from
            });
            
            if (cexDetection.isCEXTransfer) {
              console.log(`[PositionSignal] 💱 CEX transfer ignored: ${cexDetection.exchangeName} (${cexDetection.direction}) - ${currentTrade.asset}`);
              continue;
            }
          }
          
          // Dynamic threshold based on wallet size (min 10 USDT or 0.1% of wallet)
          const minThreshold = Math.max(10, totalValue * 0.001);
          
          // Minimum threshold check
          if (positionValue >= minThreshold) {
            // Derive units and price if possible from analysis (costPerUnit)
            const costPerUnit = (currentTrade.costPerUnit != null && isFinite(Number(currentTrade.costPerUnit))) ? Number(currentTrade.costPerUnit) : null;
            const units = (costPerUnit && costPerUnit > 0) ? (Number(currentTrade.amountUsd || 0) / costPerUnit) : null;

            const signal = {
              type: 'BUY',
              token: currentTrade.asset,
              amount: currentTrade.amountUsd,
              percentage: positionPercentage,
              date: currentTrade.date,
              txHash: tradeId,
              leverage: 3, // 3x for LONG positions
              totalValue: baseAtDate,
              // Enriched fields for notification formatting
              price: costPerUnit || undefined,
              units: (units && isFinite(units)) ? units : undefined,
            };
            
            newSignals.push(signal);
            console.log(`[PositionSignal] 🟢 Yeni LONG sinyali: ${currentTrade.asset} - $${positionValue.toFixed(2)} (${positionPercentage.toFixed(2)}%)`);
          } else {
            console.log(`[PositionSignal] ⚠️ Çok küçük pozisyon atlandı: ${currentTrade.asset} - $${positionValue.toFixed(2)}`);
          }
        }
      }
    }

    // Check for new SELL signals (positions closed)
    // IMPORTANT: Sell'leri sadece currentHistory içindeki BUY'lara bağlı okumak yerine,
    // tüm tradeHistory içinden sale.date >= serverStartTime olanları tarıyoruz.
    for (const anyTrade of currentAnalysis.tradeHistory) {
      if (anyTrade.sales && Array.isArray(anyTrade.sales)) {
        for (const sale of anyTrade.sales) {
          const saleDate = new Date(sale.date);
          if (!(saleDate >= serverStartTime)) continue; // sadece zaman penceresindeki satışlar

          const saleId = `${anyTrade.id}-sale-${sale.date}`;

          // Check if this sale is new (avoid duplicates across runs)
          const previousTrade = previousHistory.find(t => t.id === anyTrade.id);
          const previousSales = previousTrade?.sales || [];
          const previousSale = previousSales.find(s => s.date === sale.date);

          if (!previousSale && !processedTrades.has(saleId)) {
            processedTrades.add(saleId);

            // Normalize/ignore checks for SELL flow
            const assetSym = String(anyTrade.asset || '').toUpperCase();
            const normalizedStable = stableCoinService.getNormalizedStableSymbol(assetSym);
            // Skip if selling a stable (or mapped stable variant)
            if (normalizedStable) {
              console.log(`[PositionSignal] 🚫 Stable coin sale ignored: ${assetSym} -> ${normalizedStable}`);
              continue;
            }
            // Skip ignored tokens (dead/scam/wrappers)
            if (tokenMappings.shouldIgnore(assetSym)) {
              console.log(`[PositionSignal] ⚠️ Ignored token (sell): ${assetSym}`);
              continue;
            }

// Calculate position percentage using portfolio value at sale date
            const positionValue = sale.amountSoldUsd;
            const baseAtDate = await getPortfolioBase(sale.date);
            let positionPercentage = (positionValue / baseAtDate) * 100;
            if (process.env.PERCENTAGE_CLAMP_100 !== '0' && isFinite(positionPercentage)) {
              if (positionPercentage > 100) positionPercentage = 100;
              if (positionPercentage < 0) positionPercentage = 0;
            }

            // Minimum threshold check (10 USDT)
            if (positionValue >= 10) {
              // Derive approximate price/units if available
              const unitsSold = (anyTrade && anyTrade.unitsRemaining != null) ? null : (sale.unitsSold != null ? Number(sale.unitsSold) : null);
              const approxPrice = (unitsSold && unitsSold > 0) ? (Number(sale.amountSoldUsd || 0) / unitsSold) : null;

              const signal = {
                type: 'SELL',
                token: assetSym,
                amount: positionValue,
                percentage: positionPercentage,
                date: sale.date,
                txHash: saleId,
                leverage: 1, // 1x for SHORT positions
                totalValue: baseAtDate,
                // Enriched fields for notification formatting
                price: (approxPrice && isFinite(approxPrice)) ? approxPrice : undefined,
                units: (unitsSold && isFinite(unitsSold)) ? unitsSold : undefined,
              };

              newSignals.push(signal);
              console.log(`[PositionSignal] 🔴 Yeni SHORT sinyali: ${assetSym} - $${positionValue.toFixed(2)} (${positionPercentage.toFixed(2)}%)`);
            } else {
              console.log(`[PositionSignal] ⚠️ Çok küçük satış atlandı: ${assetSym} - $${positionValue.toFixed(2)}`);
            }
          }
        }
      }
    }

    // SELL sinyallerini event-bazlı birleştir (token+date'e göre)
    const mergedSignals = [];
    const sellBuckets = new Map(); // key: TOKEN|DATE -> { amount, date, token }

    for (const sig of newSignals) {
      if (sig.type !== 'SELL') {
        mergedSignals.push(sig);
        continue;
      }
      const key = `${String(sig.token).toUpperCase()}|${sig.date}`;
      const cur = sellBuckets.get(key) || { type: 'SELL', token: String(sig.token).toUpperCase(), amount: 0, date: sig.date, leverage: 1 };
      cur.amount += Number(sig.amount || 0);
      sellBuckets.set(key, cur);
    }

// Kovaları finalize et ve yüzdeyi yeniden hesapla
    for (const [, v] of sellBuckets.entries()) {
      const baseAtDate = await getPortfolioBase(v.date);
      let percent = (Number(v.amount || 0) / baseAtDate) * 100;
      if (process.env.PERCENTAGE_CLAMP_100 !== '0' && isFinite(percent)) {
        if (percent > 100) percent = 100;
        if (percent < 0) percent = 0;
      }
      mergedSignals.push({
        type: 'SELL',
        token: v.token,
        amount: v.amount,
        percentage: percent,
        date: v.date,
        txHash: `${v.token}-sell-${v.date}`,
        leverage: 1,
        totalValue: baseAtDate
      });
    }

    // Update cache with current history
    tradeHistoryCache.set(address, currentHistory);

    console.log(`[PositionSignal] ${address} için ${mergedSignals.length} yeni sinyal bulundu (orijinal: ${newSignals.length}, birleştirilmiş SELL: ${mergedSignals.filter(s=>s.type==='SELL').length})`);
    return mergedSignals;

  } catch (error) {
    console.error(`[PositionSignal] ${address} için sinyal alınamadı:`, error.message);
    return [];
  }
}

/**
 * Clear cache for a specific wallet (useful for testing)
 * @param {string} address - Wallet address
 */
function clearCache(address) {
  if (address) {
    tradeHistoryCache.delete(address);
    console.log(`[PositionSignal] Cache temizlendi: ${address}`);
  } else {
    tradeHistoryCache.clear();
    console.log(`[PositionSignal] Tüm cache temizlendi`);
  }
}

/**
 * Get cache status for debugging
 * @param {string} address - Wallet address
 */
function getCacheStatus(address) {
  const cached = tradeHistoryCache.get(address);
  return {
    address,
    hasCache: !!cached,
    tradeCount: cached ? cached.length : 0,
    lastUpdated: cached ? new Date() : null
  };
}

module.exports = {
  getNewPositionSignals,
  clearCache,
  getCacheStatus
};
