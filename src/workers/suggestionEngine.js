// src/workers/suggestionEngine.js
const { PrismaClient } = require('@prisma/client');
const { analyzeWallet } = require('../services/analysisService');

const prisma = new PrismaClient();

function stddev(values) {
  const arr = values.map((v) => Number(v)).filter((v) => isFinite(v));
  if (arr.length === 0) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / arr.length;
  return Math.sqrt(variance);
}

function normalizeScore(value, min, max) {
  if (!isFinite(value)) return 0;
  if (max === min) return 0;
  const x = (value - min) / (max - min);
  return Math.max(0, Math.min(1, x)) * 100;
}

async function computeMetricsForWallet(address) {
  try {
    const analysis = await analyzeWallet(address);
    if (!analysis) return null;

    // Filter realized sales last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // One-month PnL percent: realized PnL over cost in last 30 days
    let realizedUsd = 0;
    let investedUsd = 0;
    for (const row of analysis.tradeHistory || []) {
      const sales = Array.isArray(row.sales) ? row.sales : [];
      for (const s of sales) {
        const d = s.date ? new Date(s.date) : null;
        if (d && d >= thirtyDaysAgo) {
          realizedUsd += Number(s.realizedPnlUsd || 0);
          investedUsd += Number(s.amountSoldUsd || 0) - Number(s.realizedPnlUsd || 0);
        }
      }
    }
    const oneMonthPnlPercent = investedUsd > 0 ? (realizedUsd / investedUsd) * 100 : 0;

    // Consistency: stddev of cumulative pnl; lower deviation => higher score
    const series = (analysis.cumulativePnlChart || []).map((p) => Number(p.cumulativePnl || 0));
    const sigma = stddev(series);
    // Normalize inversely: take range heuristic based on dataset
    // Use min=high sigma, max=0 => remap: score = (1 - clamp(sigma/k)) * 100
    const k = (Math.max(100, Math.abs(series[series.length - 1] || 0)) || 100);
    const consistencyScore = Math.max(0, Math.min(1, 1 - (sigma / k))) * 100;

    const winRatePercent = Number(analysis.summary?.winRatePercent || 0);

    // Open positions count in last 30 days
    let openPositionsCount = 0;
    for (const row of analysis.tradeHistory || []) {
      const status = String(row.status || '').toUpperCase();
      const openedAt = row.date ? new Date(row.date) : null;
      if ((status === 'OPEN' || status === 'PARTIALLY_CLOSED') && openedAt && openedAt >= thirtyDaysAgo) {
        openPositionsCount += 1;
      }
    }

    // Additional timeframe PnLs: derive from cumulativePnlChart by window
    const byDate = (analysis.cumulativePnlChart || []).map(p => ({ date: new Date(p.date), value: Number(p.cumulativePnl || 0) }))
      .sort((a,b) => a.date - b.date);
    const last = byDate[byDate.length - 1];
    function pctSince(days) {
      if (!last) return null;
      const fromDate = new Date(last.date.getTime() - days * 24 * 60 * 60 * 1000);
      // find first >= fromDate
      const start = byDate.find(p => p.date >= fromDate) || byDate[0];
      if (!start) return null;
      const delta = last.value - start.value;
      const base = Math.abs(start.value) > 1e-9 ? Math.abs(start.value) : 1000; // heuristic base
      return (delta / base) * 100;
    }
    const pnlPercent1d = pctSince(1);
    const pnlPercent7d = pctSince(7);
    const pnlPercent30d = pctSince(30);
    const pnlPercent180d = pctSince(180);
    const pnlPercent365d = pctSince(365);

    const smartScore = ((pnlPercent30d ?? 0) * 0.4) + (winRatePercent * 0.3) + (consistencyScore * 0.3);

    return {
      address,
      name: address,
      riskLevel: 'Medium',
      pnlPercent1d: pnlPercent1d != null ? Number(pnlPercent1d.toFixed(2)) : null,
      pnlPercent7d: pnlPercent7d != null ? Number(pnlPercent7d.toFixed(2)) : null,
      pnlPercent30d: pnlPercent30d != null ? Number(pnlPercent30d.toFixed(2)) : null,
      pnlPercent180d: pnlPercent180d != null ? Number(pnlPercent180d.toFixed(2)) : null,
      pnlPercent365d: pnlPercent365d != null ? Number(pnlPercent365d.toFixed(2)) : null,
      openPositionsCount,
      consistencyScore: Number(consistencyScore.toFixed(2)),
      smartScore: Number(smartScore.toFixed(2)),
      lastAnalyzedAt: new Date(),
    };
  } catch (e) {
    console.warn('[SuggestionEngine] compute failed for', address, e.message);
    return null;
  }
}

async function runOnce() {
  const seeds = await prisma.watchedWallet.findMany();
  console.log(`[SuggestionEngine] Running for ${seeds.length} wallets...`);
  for (const w of seeds) {
    const metrics = await computeMetricsForWallet(w.address);
    if (!metrics) continue;
    await prisma.suggestedWallet.upsert({
      where: { address: metrics.address },
      update: metrics,
      create: metrics,
    });
  }
  console.log('[SuggestionEngine] Completed run.');
}

module.exports = { runOnce };


