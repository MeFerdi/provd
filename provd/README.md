# Provd — risk checks for money movement on African rails

Before a platform releases funds (a P2P stablecoin trade, a mobile-money ramp), Provd scores the
transaction, explains the decision signal by signal, and keeps a tamper-evident record of the check.
Pay as you go: 100 free checks a day, then prepaid bundles topped up with USDT or M-Pesa.

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
- `POST /v1/actions/evaluate` for `p2p_trade` and `ramp_conversion` on **Tron (USDT-TRC20)**. Other chains and
  intent types are accepted and return `not_yet_supported` (not charged).
- Signals: `counterparty_graph` (frozen-address list + direct exposure, weighted by volume share; exposure to
  wallets the platform confirmed as fraud), `reversal_behavior` (the platform's own reversals/fraud reports and
  check velocity), `token_safety` (ramp intents; GoPlus, degrades with a coverage flag). Five more signals are
  registered as stubs.
- Risk list: every Tron address **Tether froze on USDT** (7,700+), synced by the indexer from on-chain events and
  bundled as a seed fixture.
- Pay-as-you-go: daily free quota → 402 with a purchase link; bundles; USDT top-ups auto-matched by unique amount;
  M-Pesa top-ups confirmed by an admin; exact usage ledger.
- Decision records: canonical JSON hashed with SHA-256, retrievable at `GET /v1/decisions/{id}`.
- Public scanner backend: `GET /v1/counterparties/tron/{address}` (no key, rate-limited).
- Not yet: Stellar adapter (stub), decision signing + on-chain anchoring (Phase B), auto-top-up from float,
  payout/OTC scoring (Phase C).

## Run locally
```bash
cp backend/.env.example backend/.env      # set BOOTSTRAP_ADMIN_CLIENT_ID/SECRET for admin calls
docker compose up --build                 # postgres + migrate + seed + API (:8000, docs at /docs) + indexer
cd frontend && npm install && npm run dev # site on :3000
```
Without Docker for the API: `cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt &&
.venv/bin/alembic upgrade head && .venv/bin/python -m app.indexer seed && .venv/bin/python app/main.py`.
Port busy? `POSTGRES_HOST_PORT=5435 docker compose up` and match `DATABASE_URL`.

Tests: `cd backend && .venv/bin/pip install aiosqlite && .venv/bin/python -m pytest`

## First platform in 5 calls
```bash
TOKEN=$(curl -s localhost:8000/v1/auth/token -H 'content-type: application/json' \
  -d '{"client_id":"<admin id>","client_secret":"<admin secret>"}' | jq -r .access_token)
CLIENT=$(curl -s localhost:8000/v1/clients -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"name":"Acme P2P"}' | jq -r .id)
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
| `accounts.billing_model` | `payg` today; `subscription` is rejected until Phase C |
| `tests/test_import_boundaries.py` | Fails if the engine imports chain-specific code |

## Roadmap
A wedge (this) → B signed decisions + merkle anchoring → C payouts/OTC, subscriptions for global platforms,
SIM-swap and timing signals → D Solana/EVM → E tokenized-asset verification.

Research behind the decision is in `research/`.
