import crypto from 'crypto';
import { CanonicalSwap } from './types.js';

export function coalesceSwaps(swaps: CanonicalSwap[]): CanonicalSwap[] {
  const byTx = new Map<string, CanonicalSwap[]>();
  for (const s of swaps) {
    const k = `${s.chain_id}:${s.tx_hash}`;
    if (!byTx.has(k)) byTx.set(k, []);
    byTx.get(k)!.push(s);
  }
  const result: CanonicalSwap[] = [];
  for (const [key, arr] of byTx.entries()) {
    if (arr.length === 1) {
      result.push(arr[0]);
      continue;
    }
    // naive coalescing: take first’s metadata and sum IO
    const base = arr[0];
    const sum = (ios: { asset_id: string; amount: string }[]) => {
      const map = new Map<string, number>();
      for (const io of ios) {
        const v = (map.get(io.asset_id) || 0) + Number(io.amount);
        map.set(io.asset_id, v);
      }
      return Array.from(map.entries()).map(([asset_id, v]) => ({ asset_id, amount: String(v) }));
    };
    const merged: CanonicalSwap = {
      ...base,
      inputs: sum(arr.flatMap(a => a.inputs)),
      outputs: sum(arr.flatMap(a => a.outputs)),
      route: Array.from(new Set(arr.flatMap(a => a.route || []))),
    };
    result.push(merged);
  }
  return result;
}

export function makeIdempotencyKey(chain_id: number, tx_hash: string, index = 0): string {
  return crypto.createHash('sha256').update(`${chain_id}:${tx_hash}:${index}`).digest('hex');
}
