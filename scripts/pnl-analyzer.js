#!/usr/bin/env node
"use strict";

// scripts/pnl-analyzer.js
// Standalone diagnostic script to compute wallet total value and PnL metrics
// Usage:
//   node scripts/pnl-analyzer.js 0xWallet1 [0xWallet2 ...]
// Requires env: ZERION_API_KEYS (comma-separated) or ZERION_API_KEY

require('dotenv').config();
const path = require('path');
const fs = require('fs');

const {
  getWalletTrades,
  getPnLSet,
  getPricesForSymbols,
  getPricesFromCoingecko,
  getWalletTotalValueUsd,
} = require(path.resolve(__dirname, '../src/services/zerionService'));

function toFixed(n, d = 2) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Number(x.toFixed(d)) : 0;
}

function sortByDateAsc(arr) {
  return [...arr].sort((a, b) => (new Date(a.date || 0)) - (new Date(b.date || 0)));
}

// FIFO lot-based realized PnL and open positions
function buildLedgerAndPnL(trades) {
  const lots = {}; // symbol -> [{units, price} ...]
  let realizedPnL = 0;
  let closedCount = 0;
  let winCount = 0;
  let totalSellValue = 0;
  let totalSellCount = 0;

  const norm = (t) => {
    // trade.type: 'buy' or 'sell'; price: usd; amount: units; token.symbol
    const sym = (t.token?.symbol || '').toUpperCase();
    return {
      date: t.date ? new Date(t.date) : null,
      type: (t.type || t.action || '').toLowerCase(),
      symbol: sym,
      units: Number(t.amount || 0),
      price: Number(t.price || 0),
    };
  };

  for (const raw of sortByDateAsc(trades)) {
    const t = norm(raw);
    if (!t.symbol || !Number.isFinite(t.units) || !Number.isFinite(t.price)) continue;
    lots[t.symbol] ||= [];

    if (t.type === 'buy' || t.type === 'receive') {
      // add a lot
      lots[t.symbol].push({ units: Math.abs(t.units), price: t.price });
    } else if (t.type === 'sell' || t.type === 'send') {
      let qty = Math.abs(t.units);
      let pnlThisTrade = 0;
      while (qty > 0 && lots[t.symbol].length > 0) {
        const lot = lots[t.symbol][0];
        const consume = Math.min(qty, lot.units);
        pnlThisTrade += (t.price - lot.price) * consume;
        lot.units -= consume;
        qty -= consume;
        if (lot.units <= 0.00000001) lots[t.symbol].shift();
      }
      // If qty remains but no lots (short or unmatched), skip remaining
      realizedPnL += pnlThisTrade;
      closedCount += 1;
      if (pnlThisTrade > 0) winCount += 1;
      totalSellValue += Math.abs(t.units * t.price);
      totalSellCount += 1;
    }
  }

  // Open positions map symbol -> net units and avg entry price
  const open = {};
  for (const [symbol, arr] of Object.entries(lots)) {
    if (!arr || arr.length === 0) continue;
    const netUnits = arr.reduce((s, l) => s + l.units, 0);
    if (netUnits <= 0) continue;
    const totalCost = arr.reduce((s, l) => s + l.units * l.price, 0);
    open[symbol] = {
      netUnits: toFixed(netUnits, 8),
      avgEntry: netUnits > 0 ? totalCost / netUnits : 0,
    };
  }

  const avgTradeSizeUsd = totalSellCount > 0 ? totalSellValue / totalSellCount : 0;
  const winRatePercent = closedCount > 0 ? (winCount / closedCount) * 100 : 0;

  return {
    realizedPnL: toFixed(realizedPnL, 2),
    winRatePercent: toFixed(winRatePercent, 2),
    totalTrades: closedCount,
    avgTradeSizeUsd: toFixed(avgTradeSizeUsd, 2),
    openPositions: open,
  };
}

async function currentPricesForSymbols(symbols) {
  const up = Array.from(new Set(symbols.map((s) => String(s).toUpperCase()).filter(Boolean)));
  if (up.length === 0) return new Map();

  let map = await getPricesForSymbols(up);
  if (!map || map.size === 0) {
    const cg = await getPricesFromCoingecko(up);
    map = cg || new Map();
  }
  return map;
}

async function analyzeWallet(address) {
  // 1) Trades
  const trades = await getWalletTrades(address, 500);

  // 2) Ledger and realized metrics
  const ledger = buildLedgerAndPnL(trades);

  // 3) Current prices and unrealized
  const symbols = Object.keys(ledger.openPositions);
  const priceMap = await currentPricesForSymbols(symbols);
  let unrealizedPnL = 0;
  for (const [sym, pos] of Object.entries(ledger.openPositions)) {
    const px = Number(priceMap.get(sym.toUpperCase()) || 0);
    if (px > 0 && pos.netUnits > 0) {
      unrealizedPnL += (px - pos.avgEntry) * pos.netUnits;
    }
  }

  // 4) Total PnL
  const totalPnL = ledger.realizedPnL + unrealizedPnL;

  // 5) Portfolio value
  const totalValueUsd = await getWalletTotalValueUsd(address);

  // 6) PnL percentages (1W/1M/1Y)
  const pnls = await getPnLSet(address);

  const out = {
    address,
    summary: {
      winRatePercent: toFixed(ledger.winRatePercent, 2),
      totalTrades: ledger.totalTrades,
      avgTradeSizeUsd: toFixed(ledger.avgTradeSizeUsd, 2),
      totalPnl: toFixed(totalPnL, 2),
      realizedPnl: toFixed(ledger.realizedPnL, 2),
      unrealizedPnl: toFixed(unrealizedPnL, 2),
      openPositions: Object.keys(ledger.openPositions).length,
      totalValueUsd: toFixed(totalValueUsd, 2),
    },
    pnlPercents: {
      pnlPercent1d: toFixed(pnls?.p1d ?? 0, 2),
      pnlPercent7d: toFixed(pnls?.p7d ?? 0, 2),
      pnlPercent30d: toFixed(pnls?.p30d ?? 0, 2),
      pnlPercent365d: toFixed(pnls?.p365d ?? 0, 2),
    },
    openPositions: ledger.openPositions,
  };
  return out;
}

async function main() {
  const addrs = process.argv.slice(2).filter(Boolean);
  if (addrs.length === 0) {
    console.error('Usage: node scripts/pnl-analyzer.js 0xWallet1 [0xWallet2 ...]');
    process.exit(1);
  }
  const results = [];
  for (const a of addrs) {
    try {
      const r = await analyzeWallet(a);
      results.push(r);
    } catch (e) {
      results.push({ address: a, error: e?.response?.data || e?.message || String(e) });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Fatal:', e?.message || e);
    process.exit(1);
  });
}

