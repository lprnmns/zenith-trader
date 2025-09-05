// src/workers/alphaFinder.js
const { PrismaClient } = require('@prisma/client');
const config = require('../config');
const zerion = require('../services/zerionService');
const etherscan = require('../services/etherscanService');
const { analyzeWallet } = require('../services/analysisService');

const prisma = new PrismaClient();

function stddev(values) {
  const arr = values.map(Number).filter((v) => isFinite(v));
  if (arr.length === 0) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

async function getTopHoldersForSymbolId(tokenId) {
  return zerion.getTopTokenHolders(tokenId, 100);
}

async function getWalletTotalValueUsd(address) {
  try {
    const value = await zerion.getWalletTotalValueUsd(address);
    console.log(`[AlphaFinder] ${address} portfolio value from Zerion: $${value}`);
    return value;
  } catch (error) { 
    console.error(`[AlphaFinder] ${address} portfolio value error:`, error.message);
    return 0; 
  }
}

async function hasRecentTrades(address) {
  try {
    // Use same function as PnL calculation for consistency
    const trades = await zerion.getWalletTrades(address, 50);
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
    const recentTrades = (trades || []).filter((t) => t.date && new Date(t.date) >= thirtyDaysAgo);
    return recentTrades.length >= 4; // At least 4 trades in last 30 days
  } catch { return false; }
}

async function runOnce() {
  console.log('[AlphaFinder] Starting autonomous candidate discovery with Etherscan...');
  console.log('[AlphaFinder] Final criteria: $50K+ portfolio, 4+ trades (30d) - production mode');
  
  // Aday Bulma: SEED_TOKEN_IDS'den Etherscan ile keşif
  const candidateSet = new Set();
  
  for (const tokenAddress of config.SEED_TOKEN_IDS) {
    try {
      console.log(`[AlphaFinder] ${tokenAddress} token holders alınıyor...`);
      const holders = await etherscan.getTokenHolders(tokenAddress, 1, 200); // İlk 200 büyük sahip
      console.log(`[AlphaFinder] ${tokenAddress} için ${holders.length} token holder bulundu`);
      
      holders.forEach(holder => candidateSet.add(holder.address));
      
      // Rate limit: 2 req/sec için 600ms bekleme
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (error) {
      console.warn(`[AlphaFinder] ${tokenAddress} için token holders bulunamadı:`, error.message);
    }
  }
  
  const candidates = Array.from(candidateSet);
  console.log(`[AlphaFinder] Toplam benzersiz aday: ${candidates.length}`);
  
  // Adayları WatchedWallet tablosuna kaydet
  if (candidates.length > 0) {
    const watchedData = candidates.map(address => ({ address }));
    await prisma.watchedWallet.createMany({ 
      data: watchedData, 
      skipDuplicates: true 
    });
  }

  console.log(`[AlphaFinder] Starting analysis for ${candidates.length} candidates...`);
  console.log(`[AlphaFinder] Final filters: $50K+ portfolio, 4+ trades (30d) - production mode`);
  let passedCapitalFilter = 0;
  let passedActivityFilter = 0;
  let analyzed = 0;
  
  for (const address of candidates) {
    // Capital filter - $50K+ portfolio value
    const totalValue = await getWalletTotalValueUsd(address);
    if (totalValue < 50000) {
      console.log(`[AlphaFinder] ${address} capital filter failed: $${totalValue.toFixed(2)}`);
      continue;
    }
    passedCapitalFilter++;
    console.log(`[AlphaFinder] ${address} passed capital filter: $${totalValue.toFixed(2)}`);
    
    // Activity filter (30 days)
    const active = await hasRecentTrades(address);
    if (!active) {
      console.log(`[AlphaFinder] ${address} activity filter failed: less than 4 trades in last 30 days`);
      continue;
    }
    passedActivityFilter++;
    console.log(`[AlphaFinder] ${address} passed activity filter (4+ trades), checking performance...`);

    // Performance filter disabled - accept all wallets with 4+ trades
    console.log(`[AlphaFinder] ${address} starting deep analysis (performance filter disabled)...`);

    // Deep analysis
    const analysis = await analyzeWallet(address);
    const series = (analysis.cumulativePnlChart || []).map((p) => Number(p.cumulativePnl || 0));
    const sigma = stddev(series);
    const k = Math.max(100, Math.abs(series[series.length - 1] || 0)) || 100;
    const consistencyScore = Math.max(0, Math.min(1, 1 - (sigma / k))) * 100;

    // Custom PnL hesaplaması (realized + unrealized) - trade verilerinden
    console.log(`[AlphaFinder] ${address} için custom PnL hesaplama başlıyor...`);
    const pnl1d = await zerion.calculatePnLForPeriod(address, 1);
    const pnl7d = await zerion.calculatePnLForPeriod(address, 7);
    const pnl30d = await zerion.calculatePnLForPeriod(address, 30);
    
    const pnlPercent1d = pnl1d.pnlPercentage;
    const pnlPercent7d = pnl7d.pnlPercentage;
    const pnlPercent30d = pnl30d.pnlPercentage;
    
    // Açık pozisyon sayısını hesapla (proxy olarak son trade sayısını kullan)
    const recentTrades = await zerion.getWalletTrades(address, 50);
    const openPositionsCount = recentTrades.length;

    const mapped = {
      address,
      name: address,
      riskLevel: 'Medium',
      totalValue: Number(totalValue.toFixed(2)),
      consistencyScore: Number(consistencyScore.toFixed(2)),
      pnlPercent1d: Number(pnlPercent1d?.toFixed(2) || 0),
      pnlPercent7d: Number(pnlPercent7d?.toFixed(2) || 0),
      pnlPercent30d: Number(pnlPercent30d?.toFixed(2) || 0),
      openPositionsCount,
      lastAnalyzedAt: new Date(),
    };

    await prisma.suggestedWallet.upsert({
      where: { address },
      update: mapped,
      create: mapped,
    });
    analyzed++;
    console.log(`[AlphaFinder] ✅ ${address} analyzed and saved to SuggestedWallet`);
  }

  console.log(`[AlphaFinder] Analysis completed:`);
  console.log(`  📊 Total candidates: ${candidates.length}`);
  console.log(`  💰 Passed capital filter (>$50K): ${passedCapitalFilter}`);
  console.log(`  🔄 Passed activity filter (4+ trades): ${passedActivityFilter}`);
  console.log(`  ✅ Successfully analyzed and added to SuggestedWallet: ${analyzed}`);
  console.log('[AlphaFinder] Completed run.');
}

module.exports = { runOnce };


