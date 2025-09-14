# Plan 1 — Backend System Audit and Event Taxonomy (Foundations)

Goal
- Build an authoritative map of our current backend that ingests wallet activity, normalizes it, classifies events, maps them to CEX-executable actions, updates the position ledger, and notifies users. Produce a gaps/risks report and a labeled “golden dataset” from two sample wallets to measure recall/precision.

Why now
- The strategy engine and notifications depend on correct, complete, de-duplicated classification of on-chain events. Recent misses (e.g., USDT0, lending aTokens, bridge flows) show we need a robust normalization + classification layer with strong observability.

Scope
- Chains in scope: Ethereum (L1), Arbitrum, Avalanche initially (expandable).
- Protocols in scope (from histories): Uniswap v4, 0x, Odos, 1inch, AAVE (aEthUSDC/aEthUSDT/aEthWETH), Socket (bridge), Permit2, MEV labels, CEX transfers (Binance), generic ERC-20 approvals, Transfers, Failed executes.
- Assets in scope: USDT/USDC and variants (USDT0, bridged symbols), WETH/ETH wrap/unwrap, WBTC<->USDT, alt tokens (ZRO, FET, MORPHO, UNI, ondo), AAVE aTokens (aEthUSDC, aEthUSDT, aEthWETH), wormhole tokens (W), dust/mints.

Deliverables
1) System architecture inventory (services, queues, DBs, schedulers, watchers, workers).
2) Dataflow diagrams for ingestion → normalization → classification → mapping → ledger → notifications.
3) Token registry & synonyms catalog (canonical asset_id per chain address and symbol variants).
4) Event taxonomy + classification rules (drafted below, to be validated against code).
5) Golden dataset (wallet_1, wallet_2), labeled expected classifications with rationales.
6) Observability plan (logs, metrics, traces, dashboards) and QA plan (recall/precision targets).

Acceptance criteria
- We can run the existing system on the golden dataset (backfill or replay) and quantify:
  - Event recall: ≥ 98% of meaningful trades/moves detected
  - Misclassification rate: ≤ 1% of meaningful trades
  - Duplicates/idempotency incidents: 0 on replay
  - 100% of “should-not-be-a-position” events filtered from position ledger (e.g., USDT0 “stable variant” swaps, AAVE aTokens, approvals)


Phase A — Codebase & Infra Discovery (What exists today?)
1) Repos/services
- Identify all backend services (api, indexer/watchers per chain, classifier, notifier, position-ledger, schedulers, price-service, token-registry, bridge-service, cex-mapping).
- Note languages, frameworks, deployment targets, job schedules, and infra (queues, DBs, caches). 

2) Ingestion
- How are we ingesting on-chain activity? (direct RPC logs? archive node? Alchemy/Infura providers?)
- Current supported chains and providers, backfill strategy, cursoring, and reorg handling.
- Which event types are parsed (Transfer, Swap, Approval, Permit2, AAVE events, Bridge emits)?

3) Normalization layer
- Current token metadata source (address → symbol, decimals, chainId), stable synonym handling, wrapped/native pairs (WETH↔ETH, WBTC↔BTC), bridged variants (USDT.e, USDT0, etc.).
- Price feeds (per block or trade-time), FX for USD valuations.

4) Classification rules
- Where in code are rules implemented? Pattern-based on contract addresses + function selectors? Protocol adapters? Heuristic fallbacks?
- How do we map a swap path to “CEX-executable meaning” (e.g., USDT→WBTC = BUY BTC on CEX)?
- How are bridge events recognized/correlated source→destination?

5) Mapping to CEX instruments
- Canonical asset set and pair mapping: {WBTC,WETH,weETH,…} → {BTC,ETH} with confidence levels.
- Unsupported DeFi assets (OND O, MORPHO, ZRO, FET) handling: notify as DeFi trade but do not create CEX-executable intents.

6) Position Ledger & Notifications
- Which events feed ledger vs notifications? Filtering logic? Idempotency keys?
- Currently known false positives (e.g., USDT0 buys opening “positions”).

7) Observability & SRE
- Logs (structured?), traces, metrics (per chain per protocol), dead-letter queues.
- Dashboards/alerts for drop in throughput, spike in errors, lag behind tip.

Artifacts: Architecture doc; sequence diagrams; component inventory.


Phase B — Data Quality & Golden Dataset (How well does it work?)
1) Golden dataset creation
- Build CSV/JSON test fixtures from Zerion histories provided (wallet_1, wallet_2): block range, tx hashes, decoded events. Label expected classifications (see Taxonomy below). 
- Include CEX transfer heuristics: known Binance addresses; “From Binance” transfers.

2) Replay/backfill
- Run indexer on the golden dataset time ranges with clean DB. Export the system’s detected classifications and compare with labels.
- Compute:
  - Recall of meaningful trades (DEX swaps, bridge-in/out, CEX transfers, lending deposit/withdraw)
  - Misclassifications (e.g., AAVE deposits marked as buys)
  - Duplicates
  - Latency vs block timestamp

3) Price & valuation spot-checks
- For every trade, compare our USD valuation with an external source within tolerance (±0.5%).

Artifacts: Labeled dataset; validation report with confusion matrix.


Phase C — Observability Upgrade (Make misses visible)
- Add structured logs for: detected event type, protocol, inputs/outputs, normalized assets, mapping decision, confidence, idempotency key, and whether it hit Ledger/Notifications.
- Metrics: per-protocol counts, misses, confidence histograms, “unmapped asset” counters, bridge correlations success rate.
- Traces: end-to-end tx processing (ingest → normalize → classify → map → outputs).
- Dashboards: recall, precision, lag, error rates; top unmapped assets/symbols.

Artifacts: Log fields spec; dashboards; alert policies.


Appendix — Event Taxonomy & Rules (from sample histories)
Legend of types
- DEX_SWAP: On-chain swaps via Uniswap/0x/Odos/1inch.
- WRAP_UNWRAP: ETH↔WETH, similar wrappers.
- LENDING_DEPOSIT / LENDING_WITHDRAW: AAVE aTokens (aEthUSDC/aEthUSDT/aEthWETH) mints/burns.
- BRIDGE_OUT / BRIDGE_IN: Socket (and others) source-chain send followed by destination-chain receive (correlate via tx time/address and known bridge contracts).
- CEX_DEPOSIT / CEX_WITHDRAW: Transfers to/from known Binance/OKX/Bybit addresses.
- TRANSFER: Plain ERC-20/native transfer not attributed to protocols.
- APPROVAL / PERMIT2: Allowance changes — never ledger-affecting.
- FAILED_TX: No ledger effect; maybe warn if repeated.

Canonical asset mapping (examples)
- WBTC → BTC (CEX-executable)
- WETH → ETH (CEX-executable)
- USDT0 / USDT.e / bridged-USDT → USDT (Stable synonym); DO NOT open “USDT0 position”. 
- AET (aEthUSDC/aEthUSDT/aEthWETH) → AAVE aTokens ⇒ not CEX-executable; treat as Lending.
- weETH/eBTC/eUSD (restaked assets) → informational DeFi assets; not CEX-executable.

Rule snippets
- DEX_SWAP: If path ultimately USDT→WBTC: classify BUY BTC (side=buy, pair=BTC/USDT). If WBTC→USDT: SELL BTC. Similarly WETH↔USDT → ETH side.
- Bridge: If Uniswap/0x trade precedes a Socket Send (source chain) and AVAX receive on Avalanche within a short window: classify BRIDGE_OUT (src) + BRIDGE_IN (dst). Do not open CEX position.
- AAVE: Deposit → LENDING_DEPOSIT; Withdraw → LENDING_WITHDRAW. Never position; notify if user opts into DeFi notifications.
- Approvals/Permit2: informational only; optional security notification.
- CEX: If counterparty matches known Binance address set or logs include “From Binance”: classify CEX_DEPOSIT. Similarly outgoing → CEX_WITHDRAW (notify strongly; high user interest).
- Dust/mints (e.g., tiny USDT mints) → ignore unless user opts into “all activity”.

Sample interpretations (Wallet 1 highlights)
- Jul 4: USDT→WBTC via Odos → BUY BTC (CEX pair BTC/USDT). Jul 13: WBTC→USDT → SELL BTC.
- Aug 26 03:55–03:56: USDT→ETH (DEX_SWAP), then Send (Ethereum) and Receive (Avalanche) with Socket/Uniswap: BRIDGE_OUT to Avalanche + BRIDGE_IN AVAX. No CEX trade; send notification “Bridge to Avalanche”.
- Multiple AAVE approvals/deposits/mints → LENDING_*; never ledger positions.
- “Receive from Binance” → CEX_DEPOSIT notification; conversely “Send to Binance” would be CEX_WITHDRAW.
- USDT0, on Arbitrum (Wallet 2) from many WETH→USDT0 swaps → treat as USDT; do not create “USDT0 position”.

Sample interpretations (Wallet 2 highlights)
- Heavy WETH↔USDC swaps (1inch) → map to ETH/USDC pair (or ETH/USDT after stable conversion if we unify stables for CEX mapping).
- AAVE deposits/withdraws (aEthUSDC,aEthWETH) → LENDING_*.
- Large sends/receives to addresses labeled (e.g., 0x2df1…3df7) tied to treasury/router → model as TRANSFER/BRIDGE depending on contract fingerprints.


Execution checklist (for audit week)
- [ ] Inventory repos/services and draw dataflow
- [ ] Extract token-registry and current synonyms logic
- [ ] Grep/trace where DEX swaps, bridge, lending, CEX transfers are detected
- [ ] List protocol adapters in code (Uniswap/0x/Odos/1inch/AAVE/Socket/Permit2)
- [ ] Run backfill/replay for wallet_1 and wallet_2 time ranges into a clean DB
- [ ] Export classifications; build confusion matrix vs labeled expectations
- [ ] Quantify misses/mislabels and identify patterns (USDT0, aTokens, bridge correlations)
- [ ] Add/verify structured logs and metrics to observe misses

Timeline & ownership
- Discovery & diagrams: 1–1.5 days
- Golden dataset + replay & validation: 1 day
- Observability upgrades: 0.5 day

Risks
- Incomplete token registry across chains
- Unreliable bridge correlation without canonical identifiers
- CEX address identification precision

Next
- After this audit, proceed to Plan 2 to enumerate concrete gaps, weak spots, and coverage holes found in the replay (with counts and examples).
