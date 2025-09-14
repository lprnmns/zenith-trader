import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;
const SEED = process.env.REGISTRY_SEED || path.join(process.cwd(), 'seed', 'tokens.yaml');

// Types
const TokenSchema = z.object({
  address: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  tags: z.array(z.string()).optional(),
  maps_to: z.string().optional(),
});
const ChainSchema = z.object({
  id: z.number(),
  name: z.string(),
  stables: z.array(z.string()).optional(),
  tokens: z.array(TokenSchema),
});
const SeedSchema = z.object({
  chains: z.array(ChainSchema),
});

export type CanonicalAsset = {
  asset_id: string; // e.g., BTC, ETH, USDT
  symbol: string;
  cex_symbol: string | null;
  tags: string[];
};

export type RegistryEntry = {
  chain_id: number;
  address: string; // normalized key
  asset: CanonicalAsset;
};

// In-memory registry
const REGISTRY = new Map<string, RegistryEntry>(); // key: `${chain_id}:${address_lower}`

function loadSeed(file: string) {
  const content = fs.readFileSync(file, 'utf8');
  const data = yaml.load(content);
  const parsed = SeedSchema.parse(data);

  for (const chain of parsed.chains) {
    for (const t of chain.tokens) {
      const assetId = t.maps_to ?? t.symbol;
      const entry: RegistryEntry = {
        chain_id: chain.id,
        address: t.address.toLowerCase(),
        asset: {
          asset_id: assetId,
          symbol: t.symbol,
          cex_symbol: ['WETH', 'ETH'].includes(assetId) ? 'ETH' : ['WBTC', 'BTC'].includes(assetId) ? 'BTC' : (chain.stables?.includes(assetId) ? assetId : null),
          tags: t.tags ?? [],
        },
      };
      REGISTRY.set(`${chain.id}:${t.address.toLowerCase()}`, entry);
    }
  }
}

loadSeed(SEED);

// Routes
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/v1/registry/resolve', (req, res) => {
  const chainId = Number(req.query.chain_id);
  const address = String(req.query.address || '').toLowerCase();
  if (!chainId || !address) return res.status(400).json({ error: 'chain_id and address required' });
  const entry = REGISTRY.get(`${chainId}:${address}`);
  if (!entry) return res.status(404).json({ error: 'not_found' });
  res.json(entry);
});

app.get('/v1/registry/normalize_symbol', (req, res) => {
  const symbol = String(req.query.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  // Simple synonyms for now
  const normalized = symbol === 'USDT0' ? 'USDT' : symbol;
  res.json({ input: symbol, normalized });
});

app.listen(PORT, () => {
  console.log(`[token-registry] listening on ${PORT}, seed: ${SEED}`);
});
