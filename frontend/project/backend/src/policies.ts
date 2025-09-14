export function shouldAcceptForLedger(baseAsset: string, quoteAsset: string): boolean {
  // Accept only if base is CEX-mappable major (BTC/ETH/AVAX?) and quote is stable USDT/USDC
  const majors = new Set(['BTC', 'ETH']);
  const stables = new Set(['USDT', 'USDC']);
  return majors.has(baseAsset) && stables.has(quoteAsset);
}

export function normalizeStable(symbol: string): string {
  // Fast stable synonym normalize
  const s = symbol.toUpperCase();
  if (s === 'USDT0' || s === 'USDT.E') return 'USDT';
  if (s === 'USDC.E' || s === 'USDC0') return 'USDC';
  return s;
}
