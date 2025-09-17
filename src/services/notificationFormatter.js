const stableCoinService = require('./stableCoinService');

function isStable(symbol) {
  if (!symbol) return false;
  // Returns normalized symbol if stable, else null/undefined
  const norm = stableCoinService.getNormalizedStableSymbol(String(symbol).toUpperCase());
  return !!norm;
}

function shortAddr(addr) {
  if (!addr || typeof addr !== 'string') return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtUsd(n) {
  const v = Number(n);
  if (!isFinite(v)) return undefined;
  if (Math.abs(v) >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  return `$${v.toFixed(2)}`;
}

function fmtUnits(n, maxDecimals = 6) {
  const v = Number(n);
  if (!isFinite(v)) return undefined;
  // trim to 6 decimals by default
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals });
}

function buildTitle(direction, token) {
  const sym = (token || '').toUpperCase();
  if (direction === 'BUY') return `📈 ${sym} Buy`;
  if (direction === 'SELL') return `📉 ${sym} Sell`;
  return `🔄 ${sym} Swap`;
}

function buildBody(parts) {
  // Join non-empty segments with bullets
  return parts.filter(Boolean).join(' • ');
}

function deriveDirectionAndToken(input) {
  // Normalize fields
  const type = (input.type || input.direction || input.action || '').toUpperCase();
  const token = input.token || input.asset || input.toToken || input.fromToken || '';

  if (type === 'BUY' || type === 'SELL') {
    return { direction: type, token: token };
  }

  // SWAP inference
  const from = (input.fromToken || '').toUpperCase();
  const to = (input.toToken || '').toUpperCase();

  if (from && to) {
    const fromStable = isStable(from);
    const toStable = isStable(to);
    if (fromStable && !toStable) {
      return { direction: 'BUY', token: to };
    }
    if (!fromStable && toStable) {
      return { direction: 'SELL', token: from };
    }
    // alt→alt swap
    return { direction: 'SWAP', token: to || token };
  }

  // Fallback
  return { direction: 'BUY', token: token };
}

function formatWalletMovement(raw, options = {}) {
  // Expected inputs (best-effort):
  // { type|direction|action, token|asset, fromToken, toToken, amountUsd, percentage, units, priceUsd, walletAddress, timestamp }
  const amountUsd = raw.amountUsd ?? raw.amount ?? raw.valueUsd;
  const units = raw.units;
  const priceUsd = raw.priceUsd ?? raw.price;
  const percentage = raw.percentage;
  const walletAddress = raw.walletAddress;

  const { direction, token } = deriveDirectionAndToken(raw);

  const title = buildTitle(direction, token);

  // Build body segments
  const segments = [];
  if (direction === 'SWAP' && raw.fromToken && raw.toToken) {
    segments.push(`${(raw.fromToken || '').toUpperCase()} → ${(raw.toToken || '').toUpperCase()}`);
  }

  // Prefer units with USD in parentheses if available
  if (units && amountUsd) {
    segments.push(`${fmtUnits(units)} ${(token || '').toUpperCase()} (${fmtUsd(amountUsd)})`);
  } else if (amountUsd) {
    segments.push(`${fmtUsd(amountUsd)}`);
  }

  if (typeof percentage === 'number' && isFinite(percentage)) {
    segments.push(`${percentage.toFixed(2)}% of portfolio`);
  }

  if (priceUsd && isFinite(Number(priceUsd))) {
    segments.push(`~${fmtUsd(priceUsd)}`);
  }

  if (walletAddress) {
    segments.push(`Wallet ${shortAddr(walletAddress)}`);
  }

  const body = buildBody(segments);
  return { title, body };
}

function formatCopyTradingResult(signal, result, options = {}) {
  const dir = (signal?.type || signal?.signalType || '').toUpperCase();
  const token = (signal?.token || '').toUpperCase();
  const success = !!result?.success;
  const title = success ? `📈 Copy Trade Success` : `⚠️ Copy Trade Failed`;
  const details = [];
  if (dir && token) details.push(`${token} ${dir}`);
  if (typeof signal?.percentage === 'number') details.push(`${signal.percentage.toFixed(2)}%`);
  if (typeof signal?.amount === 'number') details.push(fmtUsd(signal.amount));
  if (result?.okxOrderIds?.length) details.push(`orders: ${result.okxOrderIds.length}`);
  const body = details.join(' • ');
  return { title, body };
}

module.exports = {
  formatWalletMovement,
  formatCopyTradingResult,
};
