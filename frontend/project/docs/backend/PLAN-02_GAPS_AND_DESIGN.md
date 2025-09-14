# Plan 2 — Gaps, Weak Spots, and Design Improvements (from audit + histories)

Objective
- Enumerate concrete coverage gaps and fragilities observed or expected from Plan 1 audit and from two Zerion histories. Propose design improvements to close each gap, prioritize them, and define acceptance tests that will later feed Plan 3 (implementation) and final validation.

Summary of key problem themes
1) Token normalization is incomplete
   - Stable variants (USDT0, USDT.e, bridged USDT/USDC) not unified ⇒ false positions like “USDT0 buy”.
   - Wrapped/native confusion (WBTC, WETH, weETH, eBTC) ⇒ inconsistent mapping to CEX assets.
   - Wormhole/bridged tickers (e.g., W) and idiosyncratic symbols cause mislabels.

2) Event classification coverage has holes
   - Aggregators (0x, Odos, 1inch, Uniswap v4) recognized unevenly across chains.
   - Lending (AAVE v2/v3) deposit/withdraw classified as trades in some flows.
   - Bridge correlation (Socket, Rango, L2 gateways) is weak ⇒ source-chain SEND and destination-chain RECEIVE not linked.
   - CEX transfers not robustly detected (Binance/OKX/Bybit address sets incomplete; direction inference fragile).
   - Approvals/Permit2 occasionally treated as meaningful portfolio changes.

3) Position ledger filters too permissive
   - Stable→stable or stable-variant→stable swaps open positions.
   - Lending aTokens create positions.
   - Bridge events incorrectly alter positions or are duplicated with prior swaps.

4) Notifications lack type granularity and dedupe
   - High-signal events (Bridge, CEX deposit/withdraw, large trades) are not prioritized.
   - No throttling/batching; duplicates for multi-hop aggregator routes.

5) Observability insufficiency
   - Missing structured decision logs (normalized assets, mapping verdict, confidence, idempotency key).
   - No counters for “unmapped asset” or “unknown protocol” events.

6) Idempotency and replay fragility
   - Backfills can double-apply ledger updates without stable idempotency keys.
   - Reorg tolerance unclear.


Detailed gaps and proposals
A) Token & Asset Normalization
- Gaps
  - USDT0 on Arbitrum treated as distinct asset; aEthUSDC/aEthUSDT/aEthWETH appear as positions; WBTC/WETH not mapped to BTC/ETH consistently; Wormhole W token unlabeled.
- Proposal
  - Token Registry service (per chain): address → canonical_asset_id, symbol, decimals, tags (wrapped, stable, bridged, aToken, restaked, wormhole, etc.).
  - Synonyms rules: {USDT0, USDT.e, axlUSDC, bridged USDT variants} → USDT (stable). Confidence: high.
  - Wrapped mapping: WETH→ETH, WBTC→BTC (cex_mappable=true). weETH/eBTC→DeFi_restaked (cex_mappable=false).
  - Maintenance: YAML or DB-backed registry with CI checks; hot reload in classifier.
- Acceptance
  - No “USDT0 position” ever; WBTC/WETH produce BTC/ETH intents; aTokens never hit ledger.

B) DEX/Protocol Classification Coverage
- Gaps
  - Odos/0x/Uniswap v4 across EVM chains partly handled; aggregator multi-hop produces duplicate trade events; function signatures not comprehensively mapped.
- Proposal
  - Adapter-per-protocol with canonical Swap event: {protocol, chainId, txHash, inputs[{asset, amount}], outputs[{asset, amount}], route, fees}.
  - Multi-hop collapse: coalesce hops within same tx into a single canonical swap (sum inputs/outputs in quote/base terms).
  - Protocol fingerprint library (router addresses + selectors) by chain.
- Acceptance
  - One swap per tx in ledger/notifications; correct base/quote mapping to CEX pairs.

C) Lending (AAVE)
- Gaps
  - aEthUSDC/aEthUSDT/aEthWETH misinterpreted as tradable assets.
- Proposal
  - Adapter for AAVE v2/v3: classify DEPOSIT/WITHDRAW/DEBT events; tag generated/minted aTokens; exclude from positions; optional DeFi notification channel.
- Acceptance
  - All AAVE events appear as LENDING_*; 0 of them open/close positions.

D) Bridge Correlation
- Gaps
  - Socket/Rango source↔destination correlation missing; bridge flows are split and unlinked.
- Proposal
  - Bridge correlator: recognize source-chain bridge call (router address + method), create pending bridge record with {src_chain, dst_chain, asset, amount, time, from, to, bridge_id?}; 
    correlate with destination RECEIVE within time window and heuristics (same address, bridge known recipients). Mark BRIDGE_OUT and BRIDGE_IN; never position.
- Acceptance
  - 95%+ of sample bridge flows correctly linked; notification fired once with both sides summarized.

E) CEX Transfers
- Gaps
  - Incomplete exchange address sets; direction detection brittle; “From Binance” string relied upon.
- Proposal
  - Maintain curated address sets per chain for Binance/OKX/Bybit; directional heuristics (to in set → CEX_DEPOSIT; from in set → CEX_WITHDRAW). Confidence score logged. Allow manual overrides.
- Acceptance
  - Wallet 1: “From Binance” receives detected; flag any sends to CEX as withdrawals. Wallet 2 large treasury-style sends don’t get mislabeled as CEX.

F) Position Ledger Rules
- Gaps
  - Stable/variant to stable trades open positions; aggregator duplicates; bridge actions change positions.
- Proposal
  - Ledger accepts only CEX-mappable trades (BTC,ETH,major alts) vs stable (USDT/USDC), with stable-variant unification. Reject: lending, approvals, bridges, trivial/dust mints. Enforce idempotency by {chainId, txHash, normalized_event_index}.
- Acceptance
  - Confusion matrix: 0 false positives for USDT0, aTokens, approvals; duplicates eliminated.

G) Notifications Engine
- Gaps
  - Mixed severity; duplicates; no throttling.
- Proposal
  - Event severity policy: HIGH (CEX withdraw/deposit, bridge out/in, large trade), MEDIUM (DEX swap), LOW (approval). Dedupe per tx; throttle per minute; batch multi-hop into one.
- Acceptance
  - Wallet 2 bursty trades grouped; one notification per tx route.

H) Observability & Idempotency
- Gaps
  - Missing decision logs; no counters for unmapped.
- Proposal
  - Structured logs with fields: tx, chainId, protocol, inputs/outputs, normalized assets, mapping decision, confidence, idempotency_key, outputs→{ledger:true/false, notification:true/false}.
  - Metrics: counters for unmapped_asset, unknown_protocol, bridge_correlation_misses. Tracing per tx.
- Acceptance
  - Dashboards show zero unmapped after registry is complete; bridge correlation success ≥95%.


Coverage derived from sample histories
- Wallet 1 (ETH/AVAX):
  - Detect and map USDT→WBTC (BUY BTC) and WBTC→USDT (SELL BTC).
  - Identify Socket bridge sequences (Uniswap+Socket on ETH; AVAX receive) and classify BRIDGE_OUT/IN. Notify “Bridge to Avalanche” with amounts.
  - AAVE approvals and deposits rendered as LENDING_*.
  - CEX “From Binance” receives flagged as CEX_DEPOSIT.

- Wallet 2 (Arbitrum heavy):
  - Normalize USDT0 to USDT; no positions opened for pure stable conversions.
  - Many WETH→USDT0 swaps via routers get coalesced by tx; map to ETH/USDT CEX pair (or ETH/USDC depending on policy).
  - AAVE deposits/withdraws (aEthUSDC/aEthWETH) strictly LENDING_*.
  - Large treasury-style sends treated as TRANSFER unless matched to CEX sets.


Prioritization (P0→P2)
- P0: Token Registry & Synonyms; Ledger filters; DEX adapter coalescing; AAVE adapter; Observability fields; Idempotency keys.
- P1: Bridge correlator; CEX address sets and heuristics; Notification policy & dedupe.
- P2: Extended protocol coverage; Price audit hooks; Reorg handling improvements; Feature flags.

Acceptance metrics to track post-fix
- ≥98% recall on meaningful trades in golden dataset.
- 0 false positions for USDT0 and aTokens.
- ≥95% bridge correlation success; ≤1% misclassification overall.
- Duplicates: 0 in replay.

Next
- Plan 3 will define the implementation work breakdown (tasks, APIs, data models, rollout, and test harness) based on this gap list.
