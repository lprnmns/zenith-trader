# Plan 3 — Implementation and System Test (Rollout Blueprint)

Objective
- Implement the fixes and enhancements from Plan 2, with a clear work breakdown, API/data model changes, rollout strategy, and a comprehensive test harness that proves recall/precision on the golden dataset built from the two Zerion histories.

Guiding principles
- Deterministic normalization before classification
- Canonical, protocol-agnostic event shapes (adapters map to these)
- Only CEX‑mappable trades hit the Position Ledger
- Idempotent outputs with stable keys; replay-safe and reorg-tolerant
- Telemetry-first (logs/metrics/traces) with dashboards and SLOs


Section A — Work Breakdown (Epics → Tasks)

A1) Token Registry & Synonyms (P0)
- Deliverables
  - token-registry service/module (library or microservice)
  - Data model: TokenAddress(chain_id, address, asset_id, symbol, decimals, tags[])
  - Synonyms: Stable variants (USDT0, USDT.e, axlUSDC…), wrapped/native relations (WETH↔ETH, WBTC↔BTC), restaked (weETH/eBTC/eUSD), aTokens (AAVE) 
- Tasks
  1) Seed registry for chains: Ethereum, Arbitrum, Avalanche (YAML/JSON + seeder)
  2) Add tags: stable|wrapped|restaked|atoken|wormhole|bridged|cex_mappable
  3) Resolver API: resolveByAddress(chain_id, address) → canonical asset; normalizeSymbol(symbol) → canonical
  4) CI check that all router/adapter tokens exist in registry
- Acceptance
  - USDT0 always normalized to USDT; WBTC/WETH map to BTC/ETH; aTokens are flagged and excluded from CEX mapping

A2) DEX Adapters & Multi‑hop Coalescing (P0)
- Deliverables
  - Protocol adapters for Uniswap v2/v3/v4, 0x, Odos, 1inch
  - CanonicalSwap event shape:
    {
      chain_id, tx_hash, protocol, route[],
      inputs: [{asset_id, amount}], outputs: [{asset_id, amount}],
      price_usd, block_time
    }
  - Coalescer: merge multi‑hop events within a tx into a single CanonicalSwap (sum inputs/outputs after normalization)
- Tasks
  1) Router fingerprint tables (addresses + function selectors) per chain
  2) Decode logs/calls → AdapterEvent → CanonicalSwap
  3) Coalesce by (chain_id, tx_hash)
  4) Map CanonicalSwap to CEX intent (base/quote) only if both assets resolvable and cex_mappable
- Acceptance
  - One swap per tx in outputs; correct base/quote for BTC/ETH/stables; stable↔stable swaps filtered for ledger

A3) Lending (AAVE v2/v3) Adapter (P0)
- Deliverables
  - CanonicalLending event: {type: deposit|withdraw|borrow|repay, asset_id, amount, aToken_id, tx_hash, chain_id, block_time}
- Tasks
  1) Identify AAVE pool/reserve contracts (per chain)
  2) Decode supply/withdraw/borrow/repay
  3) Classify as LENDING_*; exclude from ledger; optional DeFi notification stream
- Acceptance
  - 100% of AAVE events become LENDING_*; 0 ledger mutations

A4) Bridge Correlator (Socket/Rango/L2) (P1)
- Deliverables
  - PendingBridge store: {bridge, src_chain, dst_chain, from, to, asset_id, amount, tx_hash_src, window_expires_at}
  - Correlation engine: match destination receive (dst_chain) by heuristics and finalize pair (BRIDGE_OUT/IN)
- Tasks
  1) Router fingerprints and known recipients
  2) Write‑ahead record on source bridge call
  3) Background matcher scans receives in time window (e.g., 5–30 min), matches by address/amount/bridge pattern
  4) Emit a single logical event with both sides; no ledger effect
- Acceptance
  - ≥95% correlation on golden dataset bridge flows

A5) CEX Address Intelligence (P1)
- Deliverables
  - Curated address sets per chain for Binance/OKX/Bybit; confidence scores; manual overrides
  - Classifier returns CEX_DEPOSIT / CEX_WITHDRAW with {exchange, confidence}
- Tasks
  1) Store: cex_addresses(chain_id, address, exchange, direction_hint)
  2) Directional heuristic: to in set → DEPOSIT; from in set → WITHDRAW
  3) Enrichment job to update sets; allow runtime reload
- Acceptance
  - Wallet 1 “From Binance” receives flagged; sends to CEX detected; no mislabels on treasury/router addresses

A6) Position Ledger Rules & Idempotency (P0)
- Deliverables
  - Ledger accepts only CEX‑mappable CanonicalSwap mapped to pairs (BTC/USDT, ETH/USDT, …)
  - Idempotency key = hash(chain_id, tx_hash, normalized_index)
  - Reorg policy: soft delete or compensating entry on reorg signal
- Tasks
  1) Ledger policy module (should_accept(event) → bool and reason)
  2) Implement idempotent upsert; track provenance (classifier version)
  3) Reorg hooks from indexer (depth threshold)
- Acceptance
  - No USDT0/aToken/bridge/approval ever hits ledger; replay yields 0 duplicates

A7) Notifications Engine (P1)
- Deliverables
  - Severity policy: HIGH (bridge, cex transfer, large trade), MEDIUM (dex swap), LOW (approvals)
  - Dedupe per tx; throttle per minute; batch multi‑hop into one
- Tasks
  1) Template library per event type
  2) Dedupe keys = (chain_id, tx_hash, type)
  3) Throttle and batcher
- Acceptance
  - Wallet 2 burst trades yield one batched notification per tx; bridge fires once with both sides

A8) Observability & QA Harness (P0)
- Deliverables
  - Structured logs with: {tx, chain_id, protocol, inputs/outputs (normalized), mapping_decision, confidence, idempotency_key, outputs: {ledger, notify}}
  - Metrics: counters (unmapped_asset, unknown_protocol, bridge_correlation_miss), histograms (latency), gauges (backlog lag)
  - Tracing per tx pipeline
- Tasks
  1) Logging schema and redaction policy
  2) Prom/OTel instrumentation; Grafana dashboards
  3) Alerting on recall dips or lag spikes
- Acceptance
  - Dashboards show 0 unmapped after registry complete; lag within SLOs


Section B — Data Models & APIs
- CanonicalAsset
  - asset_id (string), symbol (string), cex_symbol (string|null), tags[string]
- CanonicalSwap
  - chain_id, tx_hash, protocol, route[], inputs[{asset_id, amount}], outputs[{asset_id, amount}], price_usd, block_time
- CanonicalLending
  - chain_id, tx_hash, type, asset_id, amount, aToken_id|null, block_time
- BridgeEvent
  - id, bridge, src_chain, dst_chain, src_tx, dst_tx, asset_id, amount, from, to, finalized_at
- LedgerEntry
  - idempotency_key, pair, side, qty, quote_qty, tx_hash, chain_id, occurred_at, classifier_version
- Notification
  - key, type, severity, title, body, metadata, created_at

Minimal APIs (pseudo)
- POST /internal/classify { chain_id, tx_hash } → { events: Canonical*[] }
- GET /internal/registry/resolve?chain_id&address → CanonicalAsset
- POST /internal/bridge/correlate (background; internal)
- POST /internal/ledger/apply { events[] } → { applied[], skipped[] }
- POST /internal/notify { notifications[] } → 202


Section C — Test Harness & Golden Dataset
- Build a replay runner:
  - Inputs: chain ranges + tx hashes (from Zerion export), local provider/archival RPC
  - Steps: ingest → normalize → classify → coalesce → map → ledger/notify
  - Output: NDJSON of all canonical events + decisions
- Expected labels: JSON for wallet_1 and wallet_2 (Plan 1 appendix) 
- Scoring: recall/precision, duplication rate, bridge match rate, valuation deviation
- CI job gate: fail PR if recall < target or misclassifications exceed budget


Section D — Rollout & Migration
- Feature flags:
  - ff_token_registry, ff_dex_coalesce, ff_aave_adapter, ff_bridge_correlator, ff_cex_intel, ff_notifications_v2, ff_ledger_policy_v2
- Phased rollout (by chain):
  1) Shadow mode: run new classifier in parallel; compare decisions; log-only
  2) Canary: enable on Avalanche → Arbitrum → Ethereum
  3) Full switch; keep shadow for 1 week
- Data migration: none for tokens (new registry alongside); ledger: provenance field to identify v2 entries


Section E — Timeline (aggressive but realistic)
- Week 1:
  - Token Registry (core) + seed; DEX adapters (Uniswap/0x/Odos/1inch); coalescer; basic tests
- Week 2:
  - AAVE adapter; Ledger policy v2 + idempotency; Observability + dashboards; initial replay results
- Week 3:
  - Bridge correlator; CEX intel; Notifications v2; tighten thresholds; CI gate
- Week 4:
  - Rollout (shadow → canary → full); post‑deploy monitoring; polish


Section F — Definition of Done (DoD)
- Golden dataset recall ≥ 98% on meaningful trades; misclassification ≤ 1%
- 0 false positions for USDT0 and aTokens
- Bridge correlation ≥ 95%; 0 duplicate ledger entries on replay
- Dashboards green; alerts quiet over 72h of production traffic


Section G — Risks & Mitigations
- Incomplete token metadata → Mitigation: manual overrides + fast registry updates
- Bridge heuristics ambiguous → Mitigation: longer window + address allowlists
- CEX address drift → Mitigation: scheduled refresh + user feedback pipeline
- RPC/backfill cost → Mitigation: range batching + caching


Section H — Next Steps after Implementation
- Expand to additional chains (Base, BSC, Polygon) via the same adapter model
- Add price audit hooks vs external providers
- Extend lending coverage (Compound, Morpho markets) and LSTs (stETH, rETH)
