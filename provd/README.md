# Provd — security-posture monitoring for cross-chain protocols

Provd reads the security configuration of cross-chain protocols straight from the chain — which verifiers
must attest a message, who can change that, how many signatures the admin multisig needs — rates it with
explainable rules, and alerts when it weakens. Coverage today: LayerZero V2 OApps/OFTs on Ethereum.

Why: the two largest exploits of H1 2026 were configuration, not code. Kelp DAO's exploited route ran on a
single verifier for 381 days before it was used to release ~$292M — publicly readable the whole time.
See [`research/kelp-2026-04`](research/kelp-2026-04/README.md).

```
public RPC ──► collector (app/posture/layerzero.py) ──► rules (rules.py) ──► grade + findings
                         │                                      │
                         └──► snapshot store ──► diff (diff.py) ──► change alerts (webhook / Telegram)
                                        │
                                        └──► API (/api/v1/protocols, /scan) ──► site (/ratings, /scan)
```

## Repository

- `backend/` — FastAPI API, posture collector, rules, monitor CLI, Alembic migrations
- `frontend/` — Next.js static site: landing, ratings, scanner, methodology, research, docs
- `research/` — reproducible incident research (scripts + data)
- `ml/`, `infra/` — earlier work, not used by the current product

## Run locally

```bash
cp backend/.env.example backend/.env
docker compose up --build                                   # postgres + migrations + API on :8000
docker compose exec backend python -m app.cli seed          # load the protocols in app/data/protocols.json
docker compose exec backend python -m app.cli refresh       # read and rate them all once (a few minutes on public RPC)
docker compose --profile monitor up -d monitor              # re-read on a schedule, alert on changes

cd frontend && npm install && npm run dev                    # site on :3000 (NEXT_PUBLIC_API_URL defaults to :8000)
```

Without Docker for the API (Postgres still needed — `docker compose up -d postgres` is enough):

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # re-run after pulling: new deps
cp .env.example .env                                                  # DATABASE_URL points at localhost:5432
.venv/bin/alembic upgrade head
.venv/bin/python app/main.py          # or: cd app && ../.venv/bin/python main.py — API on :8000
```

Ports 5432/6379 busy? Set `POSTGRES_HOST_PORT` / `REDIS_HOST_PORT` and match the port in `DATABASE_URL`. Public RPCs rate-limit; set
`ETHEREUM_RPC_URLS` to your own provider for anything beyond local use.

Backend tests: `cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt aiosqlite && .venv/bin/python -m pytest`

## Ratings and the disclosure policy

Every protocol starts **unpublished**. The public site only renders published ratings.

1. `python -m app.cli refresh` — rate everything.
2. Review locally: `python -m app.cli export-snapshot --out ../frontend/src/data/ratings-snapshot.preview.json --include-unpublished`,
   then `NEXT_PUBLIC_RATINGS_PREVIEW=1 npm run dev` in `frontend/` (shows a "Preview — not published" banner;
   the preview file is gitignored).
3. For any new critical/high finding, notify the team privately (security contact or public channel).
4. After the team responds or 14 days pass: `python -m app.cli publish <slug>`.
5. Publish the site data: `python -m app.cli export-snapshot --out ../frontend/src/data/ratings-snapshot.json`, then build and deploy.

Ratings describe configuration, not code, and a good grade is not a guarantee. Rules and grading are
documented on `/methodology` and implemented in `backend/app/posture/rules.py` — keep the two in sync.

## API

| Endpoint | Auth | What |
|---|---|---|
| `GET /api/v1/protocols` | public | Published ratings |
| `GET /api/v1/protocols/{slug}` | public | Findings, routes, admin, change history |
| `POST /api/v1/scan` `{chain, address}` | public, rate-limited | Rate any LayerZero V2 OApp on Ethereum |
| `POST /api/v1/early-access` | public, rate-limited | Early-access request |
| `/api/v1/auth/token`, `/keys`, `/clients` | admin | API credentials |

OpenAPI: `/api/v1/openapi.json`, docs at `/docs`.

## Alerts

`python -m app.cli monitor` re-reads every protocol each `MONITOR_INTERVAL_SECONDS`. When the configuration
changes it stores a snapshot, records change events (`CHG-VERIFIER-REDUCED`, `CHG-NEW-ROUTE`,
`CHG-ADMIN-CHANGED`, …) and sends them to `ALERT_WEBHOOK_URL` and/or `TELEGRAM_ALERT_CHAT_ID`.
