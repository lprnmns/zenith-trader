const analysisService = require('./analysisService');
const zerionService = require('./zerionService');

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

    // Get wallet total value
    const totalValue = await zerionService.getWalletTotalValueUsd(address);
    if (!totalValue || totalValue <= 0) {
      console.log(`[PositionSignal] ${address} için toplam değer alınamadı: ${totalValue}`);
      return [];
    }

    console.log(`[PositionSignal] ${address} toplam değeri: $${totalValue.toFixed(2)}`);

    // Get previous trade history from cache
    const previousHistory = tradeHistoryCache.get(address) || [];
    const currentHistory = currentAnalysis.tradeHistory || [];

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
          
          // Calculate position percentage
          const positionValue = currentTrade.amountUsd;
          const positionPercentage = (positionValue / totalValue) * 100;
          
          // Minimum threshold check (10 USDT)
          if (positionValue >= 10) {
            const signal = {
              type: 'BUY',
              token: currentTrade.asset,
              amount: currentTrade.amountUsd,
              percentage: positionPercentage,
              date: currentTrade.date,
              txHash: tradeId,
              leverage: 3, // 3x for LONG positions
              totalValue: totalValue
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
    for (const currentTrade of currentHistory) {
      if (currentTrade.sales && Array.isArray(currentTrade.sales)) {
        for (const sale of currentTrade.sales) {
          const saleId = `${currentTrade.id}-sale-${sale.date}`;
          
          // Check if this sale is new
          const previousTrade = previousHistory.find(t => t.id === currentTrade.id);
          const previousSales = previousTrade?.sales || [];
          const previousSale = previousSales.find(s => s.date === sale.date);
          
          if (!previousSale && !processedTrades.has(saleId)) {
            processedTrades.add(saleId);
            
            // Calculate position percentage
            const positionValue = sale.amountSoldUsd;
            const positionPercentage = (positionValue / totalValue) * 100;
            
            // Minimum threshold check (10 USDT)
            if (positionValue >= 10) {
              const signal = {
                type: 'SELL',
                token: currentTrade.asset,
                amount: positionValue,
                percentage: positionPercentage,
                date: sale.date,
                txHash: saleId,
                leverage: 1, // 1x for SHORT positions
                totalValue: totalValue
              };
              
              newSignals.push(signal);
              console.log(`[PositionSignal] 🔴 Yeni SHORT sinyali: ${currentTrade.asset} - $${positionValue.toFixed(2)} (${positionPercentage.toFixed(2)}%)`);
            } else {
              console.log(`[PositionSignal] ⚠️ Çok küçük satış atlandı: ${currentTrade.asset} - $${positionValue.toFixed(2)}`);
            }
          }
        }
      }
    }

    // Update cache with current history
    tradeHistoryCache.set(address, currentHistory);

    console.log(`[PositionSignal] ${address} için ${newSignals.length} yeni sinyal bulundu`);
    return newSignals;

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
