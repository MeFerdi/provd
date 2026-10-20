# Provd — pre-release risk checks for stablecoin money movement

Before a platform releases funds (a P2P stablecoin trade, an on/off-ramp, a payout — on any local rail:
M-Pesa, Pix, UPI, bank transfer), Provd scores the
transaction, explains the decision signal by signal, and keeps a tamper-evident record of the check.
Pay as you go: 300 free checks a month, then prepaid bundles from $20 (1k checks) topped up by card (Paystack), USDT or M-Pesa; monthly plans for global payout platforms.

Each platform's checks use its **own history plus public chain data**. Nothing is pooled across platforms.

```
ActionIntent ──► chain adapter (Tron) ──► normalized history ─┐
                                                            ├─► signals ─► score · flags · action ─► decision record (sha256)
public risk list (Tether freezes) ──────────────────────────┤                                         │
platform's own outcomes (reversals, fraud) ─────────────────┘                                         ▼
                                                                                         metered API (/v1/actions/evaluate)
indexer ──► freeze events, USDT top-up matching
```

## What's in the MVP (Phase A)
- `POST /v1/actions/evaluate` for `p2p_trade`, `ramp_conversion`, `payout` and `otc_settlement` on **Tron
  (USDT-TRC20)** and **Solana (USDC and USDT)**. Other chains and intent types are accepted and return
  `not_yet_supported` (not charged).
- Signals: `counterparty_graph` (frozen-address list + direct exposure, weighted by volume share; exposure to
  wallets the platform confirmed as fraud), `reversal_behavior` (the platform's own reversals/fraud reports and
  check velocity), `token_safety` (ramp intents; GoPlus, degrades with a coverage flag), and since Phase C:
  `amount_pattern` (spikes vs the counterparty's history, platform p99 outliers, structuring under thresholds),
  `float_and_timing` (rapid pass-through, off-hours, float strain) and `account_takeover_proxies` (SIM swap /
  device / credential / new-destination timestamps supplied by the platform's provider in `account_signals`).
  `lookalike_destination` catches address poisoning on Tron and Solana: destinations that imitate a payee
  (learned from released checks or sent as `known_counterparties`) and addresses that only send dust
  (`app/engine/lookalike.py`, dependency-free). Free public version: `POST /v1/lookalike`.
  `asset_backing` and `venue_risk` are registered stubs (Phase E).
- Risk list: every Tron address **Tether froze on USDT** (7,700+), synced by the indexer from on-chain events and
  bundled as a seed fixture; on Solana, owners of USDC and USDT accounts frozen by Circle and Tether, snapshotted
  hourly by the indexer.
- Sanctions: digital currency addresses on the US Treasury OFAC SDN list (Tron, Solana, EVM), refreshed daily
  from the official XML and bundled as a seed snapshot (`app/services/sanctions.py`). Sanctions take precedence
  over issuer freezes; flags `SANCTIONED_ADDRESS` (reject) and `SANCTIONS_EXPOSURE` (hold).
- Release attestations for non-custodial escrows: `POST /v1/decisions/{intent_id}/attestation` (EIP-712 for
  EVM/Tron, keccak layout for Solana), signed with a separate key; Solidity `ProvdReleaseVerifier` + example escrow
  and an end-to-end test on a local chain in `contracts/`.
- Solana adapter (`app/adapters/solana.py`): wallet and associated-token-account histories over any Solana RPC
  (free public endpoints keep about a day; set `SOLANA_RPC_URL` to Helius or Alchemy for full history).
- Pay-as-you-go: monthly free quota (`FREE_MONTHLY_CHECKS`, default 300) → 402 with a purchase link; bundles; USDT top-ups auto-matched by unique amount;
  card and M-Pesa top-ups through Paystack Checkout (M-Pesa falls back to a manual paybill confirmed by an
  admin when Paystack isn't configured) (signed `charge.success`
  webhook at `/v1/webhooks/paystack`, amount/currency checked before credit, indexer re-verifies missed
  webhooks; card is off until `PAYSTACK_SECRET_KEY` is set); exact usage ledger recording what paid for each check.
- Subscriptions (global platforms, Phase C): monthly included checks with overage on prepaid balance, invoice,
  or block; `PUT /v1/admin/accounts/{id}/billing` and a monthly statement for invoicing.
- Proof layer (Phase B): every decision record is hashed (SHA-256, canonical JSON), **signed** (secp256k1,
  key published at `GET /v1/proof/keys`), sealed into a **Merkle batch** every `BATCH_INTERVAL_SECONDS`, and the
  batch root is **timestamped on Bitcoin via OpenTimestamps** (free, no wallet). `GET /v1/decisions/{id}` returns
  the record, signature, inclusion proof and anchor status; `GET /v1/proof/batches/{id}/ots` serves the `.ots`
  proof. `backend/tools/verify_decision.py` (also on the site at `/tools/verify_decision.py`) verifies a record
  without trusting Provd.
- Public scanner backend: `GET /v1/counterparties/tron/{address}` (no key, rate-limited).
- Not yet: Stellar adapter (stub), auto-top-up from float, Solana/EVM (Phase D), asset verification (Phase E).
  Tron-memo anchoring is a documented stub (`ANCHOR_METHOD=tron_memo`) for when a funded wallet is available.

## Run locally
```bash
(cd backend && python3 -m app.secret_store init)   # git-ignored .env files with fresh random dev secrets
docker compose up --build                 # postgres + migrate + seed + API (:8000, docs at /docs) + indexer
cd frontend && npm install && npm run dev # provd.tech on :3000
npm run dev:docs                          # docs.provd.tech on :3001
npm run dev:playground                    # playground.provd.tech on :3002 (needs CORS_ORIGINS to include it)
```
The frontend builds three static sites from one codebase (`frontend/src/lib/sites.ts`): the main site
(`src/app`), the docs (`sites/docs`, guides only) and the playground (`sites/playground`). The endpoint reference
isn't published on any of them: the playground loads it from `GET /v1/developer/reference` with a sandbox key.
Without Docker for the API: `cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt &&
.venv/bin/alembic upgrade head && .venv/bin/python -m app.indexer seed && .venv/bin/python app/main.py`.

Secrets are declared in one place, `backend/app/secret_store.py`, and never written in code, compose files or the
repository. `python -m app.secret_store check` lists which are set (never their values); production reads them from
the platform's secret store, as `NAME` or as a file at `NAME_FILE`.
Port busy? `POSTGRES_HOST_PORT=5435 docker compose up` and match `DATABASE_URL`.

Tests: `cd backend && .venv/bin/pip install aiosqlite && .venv/bin/python -m pytest`

## First platform in 5 calls
```bash
TOKEN=$(curl -s localhost:8000/v1/auth/token -H 'content-type: application/json' \
  -d '{"client_id":"<admin id>","client_secret":"<admin secret>"}' | jq -r .access_token)
CLIENT=$(curl -s localhost:8000/v1/clients -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"name":"Acme P2P"}' | jq -r .id)
# Every platform gets two keys: sandbox (sbx_..., test wallets, free; for the playground and their tests) and live.
SANDBOX=$(curl -s localhost:8000/v1/keys -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "{\"name\":\"sandbox\",\"client_id\":\"$CLIENT\",\"environment\":\"sandbox\"}" | jq -r .api_key)
KEY=$(curl -s localhost:8000/v1/keys -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "{\"name\":\"prod\",\"client_id\":\"$CLIENT\"}" | jq -r .api_key)
curl -s localhost:8000/v1/actions/evaluate -H "X-API-Key: $KEY" -H 'content-type: application/json' \
  -d '{"chain":"tron","intent_type":"p2p_trade","counterparty":{"wallet_address":"TJ7E73Hs7aeeLDFMmySj9MGhXNronC6qc9"},"rails":{"fiat_rail":"mpesa","crypto_asset":"USDT_TRC20"}}'
curl -s localhost:8000/v1/outcomes -H "X-API-Key: $KEY" -H 'content-type: application/json' -d '{"intent_id":"<id>","outcome":"reversed"}'
```

## Extension points (built to grow without rework)
| Where | What |
|---|---|
| `app/schemas/actions.py` | Open chain and intent-type sets; `SCORED_*` decides what is evaluated |
| `app/adapters/base.py` | `ChainAdapter` protocol + normalized types; Stellar/Solana/EVM stubs in `stubs.py` |
| `app/engine/config.json` | Signal registry: weights, cost units, intents, enabled/planned |
| `app/engine/pricing.json` | Bundle prices (**placeholders** — set real prices before launch) |
| `accounts.billing_model` | `payg` or `subscription` (plan, included checks, overage mode) |
| `app/export_contract.py` | Writes the price list into the frontend (the spec only with `--spec`, for local use) |
| `app/services/sandbox.py` | Sandbox test wallets and scenarios behind `sbx_` keys |
| `tests/test_import_boundaries.py` | Fails if the engine imports chain-specific code |
| `app/proof/anchors.py` | `AnchorAdapter`: OpenTimestamps (default), none, Tron memo (stub) |

Production needs `DECISION_SIGNING_KEY` (32-byte hex secp256k1 key — keep it in a secrets manager; rotating it
publishes a new key id, old records stay verifiable with the old public key).

## Roadmap
A wedge (this) → B signed decisions + merkle anchoring → C payouts/OTC, subscriptions for global platforms,
SIM-swap and timing signals → D Solana/EVM → E tokenized-asset verification.

Technical research (the Kelp exploit replay and the Solana measurement) is in `research/`.
