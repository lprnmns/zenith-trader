// src/services/analysisService.js
const zerionService = require('./zerionService');

/**
 * Analyze a wallet using Zerion data only. Returns Position Ledger payload.
 * @param {string} address
 */
async function analyzeWallet(address) {
  // 1) Pull raw activities (trade, send, receive) normalized
  const transfers = await zerionService.getWalletTradeTransfers(address, 1000);

  // 1.a) Pre-process: detect synthetic trades from send/receive pairs and merge with direct trades
  const detected = normalizeAndDetectTrades(transfers);

  // 2) Build purchases and sales lists from any swap using USD valuations
  const purchases = [];
  const sales = [];
  // Extended timeframe to 2 years to include 2024 trades (adjustable as needed)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const isStable = (sym) => ['USDT','USDC','DAI','TUSD','USDP','FDUSD','BUSD'].includes(String(sym || '').toUpperCase());
  for (const t of detected) {
    const dt = t.date ? new Date(t.date) : null;
    if (dt && dt < twoYearsAgo) continue; // limit to last 2y to include 2024 trades

    // Use normalized BUY/SELL from detected list when available
    if (t.action === 'BUY') {
      const assetSym = String(t.assetSymbol || t.inSymbol || '');
      if (assetSym && !isStable(assetSym)) {
        const costUsd = Number(t.costUsd || t.outUsd || t.inUsd || 0);
        if (costUsd > 0) {
          const units = Number(t.units || t.inUnits || 0);
          const costPerUnit = (units > 0 && costUsd > 0) ? (costUsd / units) : null;
          const unitsRemaining = units > 0 ? units : null;
          purchases.push({ id: `buy-${purchases.length+1}`, date: t.date?.slice(0,10) || null, asset: assetSym, assetIds: [t.inId].filter(Boolean), costPerUnit, amountUsd: costUsd, unitsRemaining, costUsdRemaining: costUsd, sales: [], status: 'OPEN' });
        }
      }
    } else if (t.action === 'SELL') {
      const assetSym = String(t.assetSymbol || t.outSymbol || '');
      if (assetSym && !isStable(assetSym)) {
        const proceedsUsd = Number(t.proceedsUsd || t.inUsd || t.outUsd || 0);
        if (proceedsUsd > 0) {
          const unitsSold = Number(t.unitsSold || t.outUnits || 0) || null;
          sales.push({ date: t.date?.slice(0,10) || null, asset: assetSym, proceedsUsd, unitsSold });
        }
      }
    } else {
      // Fallback to legacy inference
      const inSym = String(t.inSymbol || '');
      if (inSym && !isStable(inSym)) {
        const costUsd = t.outUsd > 0 ? t.outUsd : (t.inUsd > 0 ? t.inUsd : 0);
        if (costUsd > 0) {
          const units = Number(t.inUnits || 0);
          const costPerUnit = (units > 0 && costUsd > 0) ? (costUsd / units) : null; // derive execution price
          const unitsRemaining = units > 0 ? units : null;
          purchases.push({ id: `buy-${purchases.length+1}`, date: t.date?.slice(0,10) || null, asset: inSym, assetIds: [t.inId].filter(Boolean), costPerUnit, amountUsd: costUsd, unitsRemaining, costUsdRemaining: costUsd, sales: [], status: 'OPEN' });
        }
      }
      const outSym = String(t.outSymbol || '');
      if (outSym && !isStable(outSym)) {
        const proceedsUsd = t.inUsd > 0 ? t.inUsd : (t.outUsd > 0 ? t.outUsd : 0);
        if (proceedsUsd > 0) {
          const unitsSold = Number(t.outUnits || 0) || null;
          sales.push({ date: t.date?.slice(0,10) || null, asset: outSym, proceedsUsd, unitsSold });
        }
      }
    }
  }

  // Seed synthetic purchases for assets that have sales but no purchases in range
  const saleAssets = new Set(sales.map((s) => s.asset));
  const purchaseAssets = new Set(purchases.map((p) => p.asset));
  for (const asset of saleAssets) {
    if (!purchaseAssets.has(asset)) {
      // Use the first sale's proceeds to create a zero-PnL seed lot
      const firstSale = sales.find((s) => s.asset === asset);
      if (firstSale) {
        purchases.push({ id: `seed-${asset}-${firstSale.date}`,
          date: firstSale.date,
          asset,
          costPerUnit: null,
          amountUsd: firstSale.proceedsUsd,
          unitsRemaining: null,
          costUsdRemaining: firstSale.proceedsUsd,
          sales: [],
          status: 'OPEN',
        });
      }
    }
  }

  // 3) FIFO match sales against purchases per asset
  const byAssetPurchases = new Map();
  for (const p of purchases) {
    if (!byAssetPurchases.has(p.asset)) byAssetPurchases.set(p.asset, []);
    byAssetPurchases.get(p.asset).push(p);
  }
  for (const list of byAssetPurchases.values()) list.sort((a,b) => (a.date||'').localeCompare(b.date||''));

  const cumulativePnlChart = [];
  let cumulative = 0;
  for (const s of sales.sort((a,b) => (a.date||'').localeCompare(b.date||''))) {
    const plist = byAssetPurchases.get(s.asset) || [];
    if (plist.length === 0) continue;
    const totalUnitsSold = Number(s.unitsSold || 0);
    if (totalUnitsSold <= 0) continue;
    let remainingUnits = totalUnitsSold;
    let costMatchedUsd = 0;
    for (let i = 0; i < plist.length && remainingUnits > 1e-12; i++) {
      const lot = plist[i];
      // If we don't know unitsRemaining (null seed), fallback to cost-based proportional allocation
      if (lot.unitsRemaining == null || lot.costPerUnit == null) {
        const share = Math.min(1, remainingUnits / totalUnitsSold);
        const proceedsForLot = s.proceedsUsd * share;
        const use = Math.min(lot.costUsdRemaining, proceedsForLot);
        const realizedLot = proceedsForLot - use;
        lot.costUsdRemaining -= use;
        if (lot.costUsdRemaining < 1e-10) lot.costUsdRemaining = 0;
        lot.sales.push({ date: s.date, amountSoldUsd: proceedsForLot, realizedPnlUsd: realizedLot, realizedPnlPercent: use > 0 ? (realizedLot / use) * 100 : null });
        lot.status = lot.costUsdRemaining > 1e-10 ? 'PARTIALLY_CLOSED' : (realizedLot >= 0 ? 'CLOSED_PROFIT' : 'CLOSED_LOSS');
        costMatchedUsd += use;
        remainingUnits -= totalUnitsSold * share;
        continue;
      }
      const takeUnits = Math.min(lot.unitsRemaining, remainingUnits);
      const unitsShare = takeUnits / totalUnitsSold;
      const proceedsForUnits = s.proceedsUsd * unitsShare;
      const costForUnits = (lot.costPerUnit || 0) * takeUnits;
      const realizedLot = proceedsForUnits - costForUnits;
      lot.unitsRemaining -= takeUnits;
      if (lot.unitsRemaining < 1e-12) lot.unitsRemaining = 0;
      lot.costUsdRemaining = (lot.costPerUnit || 0) * lot.unitsRemaining;
      lot.sales.push({ date: s.date, amountSoldUsd: proceedsForUnits, realizedPnlUsd: realizedLot, realizedPnlPercent: costForUnits > 0 ? (realizedLot / costForUnits) * 100 : null });
      lot.status = lot.unitsRemaining > 1e-12 ? 'PARTIALLY_CLOSED' : (realizedLot >= 0 ? 'CLOSED_PROFIT' : 'CLOSED_LOSS');
      costMatchedUsd += costForUnits;
      remainingUnits -= takeUnits;
    }
    const realized = s.proceedsUsd - costMatchedUsd;
    cumulative += realized;
    cumulativePnlChart.push({ date: s.date, cumulativePnl: Number(cumulative.toFixed(6)) });
  }

  // 4) Unrealized PnL for open/partial lots using current prices - ALWAYS FRESH
  try {
    const symbolSet = new Set();
    const idSet = new Set();
    for (const [asset, list] of byAssetPurchases.entries()) {
      for (const lot of list) {
        if (lot.unitsRemaining && lot.unitsRemaining > 1e-12) {
          symbolSet.add(String(asset).toUpperCase());
          if (Array.isArray(lot.assetIds)) lot.assetIds.forEach((i) => i && idSet.add(String(i)));
        }
      }
    }

    console.log(`[AnalysisService] Fetching FRESH prices at ${new Date().toISOString()} for:`, Array.from(symbolSet).join(','));

    // Single batched lookups with cache busting
    let symbolToPrice = new Map();
    if (symbolSet.size > 0) {
      symbolToPrice = await zerionService.getPricesForSymbols(Array.from(symbolSet));
    }
    let idToPrice = new Map();
    if (idSet.size > 0) {
      idToPrice = await zerionService.getPricesByIds(Array.from(idSet));
    }

    // Fallback for missing symbols via Coingecko (only the missing ones)
    const missingSymbols = Array.from(symbolSet).filter((s) => !symbolToPrice.has(s));
    if (missingSymbols.length > 0) {
      console.log(`[AnalysisService] Fetching ${missingSymbols.length} missing prices from Coingecko:`, missingSymbols);
      const cgMap = await zerionService.getPricesFromCoingecko(missingSymbols);
      for (const [k, v] of cgMap.entries()) symbolToPrice.set(k, v);
    }
    
    console.log(`[AnalysisService] Fresh prices fetched:`, Object.fromEntries(symbolToPrice));

    // Compute unrealized per lot
    for (const [assetRaw, list] of byAssetPurchases.entries()) {
      const asset = String(assetRaw).toUpperCase();
      for (const lot of list) {
        // CLOSED lots: null out unrealized
        if (!lot.unitsRemaining || lot.unitsRemaining <= 1e-12) {
          lot.unrealizedPnlUsd = null;
          lot.unrealizedPnlPercent = null;
          continue;
        }

        let price = symbolToPrice.get(asset);
        if (!price && Array.isArray(lot.assetIds)) {
          for (const id of lot.assetIds) {
            if (idToPrice.has(String(id))) { price = idToPrice.get(String(id)); break; }
          }
        }

        if (typeof price !== 'number' || !isFinite(price) || price <= 0) {
          // Could not price → mark as unavailable
          lot.unrealizedPnlUsd = null;
          lot.unrealizedPnlPercent = null;
          continue;
        }

        // remainingCost primarily from costPerUnit * unitsRemaining; fallback to costUsdRemaining
        const units = Number(lot.unitsRemaining);
        const remainingCost = (lot.costPerUnit != null && isFinite(lot.costPerUnit))
          ? (Number(lot.costPerUnit) * units)
          : (lot.costUsdRemaining != null ? Number(lot.costUsdRemaining) : null);

        if (remainingCost == null) {
          lot.unrealizedPnlUsd = null;
          lot.unrealizedPnlPercent = null;
          continue;
        }

        const currentValue = price * units;
        const unrealUsd = currentValue - remainingCost;
        const unrealPct = remainingCost > 0 ? (unrealUsd / remainingCost) * 100 : 0;
        lot.unrealizedPnlUsd = Number(unrealUsd.toFixed(6));
        lot.unrealizedPnlPercent = Number(unrealPct.toFixed(6));
      }
    }
  } catch (e) {
    // Fiyat alınamadıysa: açık/kısmi açık lotlar için null set et
    for (const [asset, list] of byAssetPurchases.entries()) {
      for (const lot of list) {
        if (lot.unitsRemaining && lot.unitsRemaining > 1e-12) {
          lot.unrealizedPnlUsd = null;
          lot.unrealizedPnlPercent = null;
        } else {
          lot.unrealizedPnlUsd = null;
          lot.unrealizedPnlPercent = null;
        }
      }
    }
  }

  // 5) Build tradeHistory rows from purchases
  const tradeHistory = purchases.map((p) => ({
    id: p.id,
    date: p.date,
    action: 'BUY',
    asset: p.asset,
    costPerUnit: p.costPerUnit != null ? Number(p.costPerUnit) : null,
    amountUsd: Number(p.amountUsd),
    unrealizedPnlUsd: p.unrealizedPnlUsd ?? null,
    unrealizedPnlPercent: p.unrealizedPnlPercent ?? null,
    status: p.status,
    sales: p.sales,
  })).sort((a,b) => (b.date||'').localeCompare(a.date||''));

  // 6) Calculate TOTAL PnL including unrealized gains
  // First, get total realized PnL from all sales
  const realizedEntries = [];
  let totalRealizedPnl = 0;
  for (const p of purchases) {
    for (const s of p.sales) {
      realizedEntries.push(s);
      totalRealizedPnl += Number(s.realizedPnlUsd || 0);
    }
  }
  
  // Calculate total unrealized PnL from open positions
  let totalUnrealizedPnl = 0;
  let openPositionsCount = 0;
  for (const p of purchases) {
    if (p.unrealizedPnlUsd != null && isFinite(p.unrealizedPnlUsd)) {
      totalUnrealizedPnl += p.unrealizedPnlUsd;
      openPositionsCount++;
    }
  }
  
  // Build enhanced chart with current portfolio value
  // Add a final point showing current total PnL (realized + unrealized)
  const enhancedChart = [...cumulativePnlChart];
  const today = new Date().toISOString().slice(0, 10);
  const totalCurrentPnl = totalRealizedPnl + totalUnrealizedPnl;
  
  // Add current total PnL as the last point if different from last realized
  const lastChartPoint = enhancedChart[enhancedChart.length - 1];
  if (!lastChartPoint || lastChartPoint.date !== today || Math.abs(lastChartPoint.cumulativePnl - totalCurrentPnl) > 0.01) {
    enhancedChart.push({
      date: today,
      cumulativePnl: Number(totalCurrentPnl.toFixed(6)),
      isCurrentValue: true // Mark this as current portfolio value
    });
  }
  
  // Calculate win rate from realized trades
  const wins = realizedEntries.filter((s) => Number(s.realizedPnlUsd) > 0).length;
  const totalTrades = realizedEntries.length;
  const winRatePercent = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgTradeSizeUsd = totalTrades > 0 ? (realizedEntries.reduce((sum, s) => sum + Number(s.amountSoldUsd || 0), 0) / totalTrades) : 0;

  const summary = {
    winRatePercent: Number(winRatePercent.toFixed(2)),
    totalTrades,
    avgTradeSizeUsd: Number(avgTradeSizeUsd.toFixed(2)),
    totalPnl: Number(totalCurrentPnl.toFixed(2)),
    realizedPnl: Number(totalRealizedPnl.toFixed(2)),
    unrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
    openPositions: openPositionsCount
  };
  
  console.log(`[AnalysisService] PnL Summary:`, {
    realized: totalRealizedPnl.toFixed(2),
    unrealized: totalUnrealizedPnl.toFixed(2),
    total: totalCurrentPnl.toFixed(2),
    chartPoints: enhancedChart.length
  });

  return { summary, cumulativePnlChart: enhancedChart, tradeHistory };
}

module.exports = { analyzeWallet };


/**
 * Build unified BUY/SELL list from mixed trade/send/receive records.
 * Input items contain: { date, operationType, inSymbol, outSymbol, inUsd, outUsd, inUnits, outUnits }
 */
function normalizeAndDetectTrades(items) {
  const isStable = (sym) => ['USDT','USDC','DAI','TUSD','USDP','FDUSD','BUSD'].includes(String(sym || '').toUpperCase());
  const direct = [];
  const sends = [];
  const receives = [];
  for (const x of items) {
    const op = String(x.operationType || '').toLowerCase();
    if (op === 'trade') {
      direct.push(x);
    } else if (op === 'send') {
      sends.push(x);
    } else if (op === 'receive') {
      receives.push(x);
    }
  }

  // Pair send/receive → synthetic trade (two-pass: strict then relaxed)
  const paired = [];
  // Persist used indices across passes to avoid duplicate pairing
  const usedSend = new Set();
  const usedRecv = new Set();
  const tryPair = (timeWindowMs, pctTol) => {
    for (let i = 0; i < sends.length; i++) {
      if (usedSend.has(i)) continue;
      const s = sends[i];
      const sTime = s.date ? new Date(s.date).getTime() : null;
      if (!sTime) continue;
      const sUsd = Number(s.outUsd || s.inUsd || 0);
      if (sUsd <= 0) continue;

      // choose best receive candidate within window by highest USD, ignore scammy zero-USD names
      let bestIdx = -1;
      let bestR = null;
      let bestUsd = 0;
      for (let j = 0; j < receives.length; j++) {
        if (usedRecv.has(j)) continue;
        const r = receives[j];
        const rTime = r.date ? new Date(r.date).getTime() : null;
        if (!rTime) continue;
        const dtMs = rTime - sTime;
        if (Math.abs(dtMs) > timeWindowMs) continue;
        const rName = r.inName || r.outName || '';
        const looksScam = /airdrop|claim|bonus|gift|reward/i.test(rName) && (Number(r.inUsd || 0) === 0);
        if (looksScam) continue;
        const rUsd = Number(r.inUsd || r.outUsd || 0);
        if (rUsd > bestUsd) { bestUsd = rUsd; bestR = r; bestIdx = j; }
      }
      if (bestR == null || bestUsd <= 0) continue;
      const tol = sUsd * pctTol;
      if (Math.abs(bestUsd - sUsd) > tol) continue;

      const rSym = bestR.inSymbol || bestR.outSymbol;
      const sSym = s.inSymbol || s.outSymbol;
      if (!isStable(rSym)) {
        paired.push({
          date: bestR.date,
          action: 'BUY',
          assetSymbol: rSym,
          costUsd: sUsd,
          units: Number(bestR.inUnits || bestR.outUnits || 0),
          inSymbol: rSym, outSymbol: sSym, inUsd: bestUsd, outUsd: sUsd,
          operationType: 'synthetic_trade'
        });
        usedSend.add(i); usedRecv.add(bestIdx); continue;
      }
      // receive stable → SELL
      paired.push({
        date: bestR.date,
        action: 'SELL',
        assetSymbol: sSym || rSym,
        proceedsUsd: bestUsd,
        unitsSold: Number(s.outUnits || s.inUnits || 0),
        inSymbol: bestR.inSymbol || bestR.outSymbol, outSymbol: sSym, inUsd: bestUsd, outUsd: sUsd,
        operationType: 'synthetic_trade'
      });
      usedSend.add(i); usedRecv.add(bestIdx);
    }
  };
  // Pass 1: 3 min, 8% (covers most socket/bridge hops)
  tryPair(3 * 60 * 1000, 0.08);
  // Pass 2: 20 min, 20% (relaxed for cross-chain slippage+fees)
  tryPair(20 * 60 * 1000, 0.20);

  // Direct trades passthrough
  const directMapped = direct.map((t) => {
    const inSym = t.inSymbol; const outSym = t.outSymbol;
    const buyLikely = inSym && !isStable(inSym);
    const sellLikely = outSym && !isStable(outSym);
    const inUsd = Number(t.inUsd || 0); const outUsd = Number(t.outUsd || 0);
    if (buyLikely && (!sellLikely || outUsd >= inUsd)) {
      return {
        date: t.date,
        action: 'BUY',
        assetSymbol: inSym,
        costUsd: outUsd > 0 ? outUsd : inUsd,
        units: Number(t.inUnits || 0),
        operationType: 'trade',
        inSymbol: t.inSymbol, outSymbol: t.outSymbol, inUsd, outUsd, inUnits: t.inUnits, outUnits: t.outUnits,
      };
    }
    if (sellLikely) {
      return {
        date: t.date,
        action: 'SELL',
        assetSymbol: outSym,
        proceedsUsd: inUsd > 0 ? inUsd : outUsd,
        unitsSold: Number(t.outUnits || 0),
        operationType: 'trade',
        inSymbol: t.inSymbol, outSymbol: t.outSymbol, inUsd, outUsd, inUnits: t.inUnits, outUnits: t.outUnits,
      };
    }
    // Fallback: treat as BUY by in side
    return {
      date: t.date,
      action: 'BUY',
      assetSymbol: inSym || outSym,
      costUsd: outUsd > 0 ? outUsd : inUsd,
      units: Number(t.inUnits || t.outUnits || 0),
      operationType: 'trade',
      inSymbol: t.inSymbol, outSymbol: t.outSymbol, inUsd, outUsd, inUnits: t.inUnits, outUnits: t.outUnits,
    };
  });

  // Merge results
  let result = directMapped.concat(paired);
  // Exact de-duplication: drop identical action/asset/date/units/value entries
  const seen = new Set();
  result = result.filter((r) => {
    const dateKey = r.date || '';
    const unitsKey = (r.units != null ? Number(r.units) : Number(r.unitsSold || 0)).toFixed(10);
    const value = r.action === 'BUY' ? Number(r.costUsd || r.outUsd || r.inUsd || 0)
                                     : Number(r.proceedsUsd || r.inUsd || r.outUsd || 0);
    const valueKey = value.toFixed(6);
    const key = `${r.action}|${r.assetSymbol}|${dateKey}|${unitsKey}|${valueKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Sort oldest→newest for deterministic FIFO; outer pipeline reverses later where needed
  result.sort((a,b) => (a.date||'').localeCompare(b.date||''));
  return result;
}


