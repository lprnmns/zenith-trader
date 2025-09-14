export type CanonicalAsset = {
  asset_id: string; // canonical id e.g., BTC, ETH, USDT
  symbol: string;   // chain-local symbol e.g., WBTC, WETH, USDT0
  cex_symbol: string | null; // e.g., BTC, ETH, USDT
  tags: string[];   // stable|wrapped|restaked|atoken|native|...
};

export type RegistryEntry = {
  chain_id: number;
  address: string; // normalized key
  asset: CanonicalAsset;
};

export type CanonicalSwapIO = { asset_id: string; amount: string };

export type CanonicalSwap = {
  chain_id: number;
  tx_hash: string;
  protocol: string; // uniswap, 0x, odos, 1inch
  route?: string[];
  inputs: CanonicalSwapIO[];
  outputs: CanonicalSwapIO[];
  price_usd?: number;
  block_time: string; // ISO
};

export type LedgerEntry = {
  idempotency_key: string;
  pair: string; // e.g., BTC/USDT
  side: 'buy' | 'sell';
  qty: number; // base quantity
  quote_qty: number; // quote amount
  chain_id: number;
  tx_hash: string;
  occurred_at: string;
  classifier_version: string;
};

export type Notification = {
  key: string; // idempotency key for notification
  type: string; // BRIDGE, CEX_DEPOSIT, TRADE, etc.
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type TransferEvent = {
  chain: string; // 'ethereum' | 'arbitrum' | ...
  direction: 'in' | 'out';
  address: string; // counterparty address
  asset_id: string;
  amount: string;
  tx_hash: string;
  occurred_at: string;
};

export type BridgeEvent = {
  bridge: string; // socket | rango | gateway
  src_chain: string;
  dst_chain: string;
  asset_id: string;
  amount: string;
  from: string;
  to: string;
  src_tx: string;
  dst_tx?: string;
  occurred_at: string;
};

export type LendingEvent = {
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay';
  chain_id: number;
  asset_id: string;
  amount: string;
  aToken_id?: string;
  tx_hash: string;
  occurred_at: string;
};
