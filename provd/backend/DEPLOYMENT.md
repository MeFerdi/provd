# Deployment and scaling

Proposed stack for running the Provd backend in production, from the first customers to millions of checks
a month. Prices are rough monthly estimates in USD and change often **[verify before buying]**.

## What runs

```
                    Cloudflare (DNS, TLS, WAF, rate limits)
                        |                         |
   provd.tech, docs.provd.tech,           api.provd.tech
   playground.provd.tech (static sites,           |
   Cloudflare Pages)                              |
                                       API service (FastAPI, N instances)
                                          |        |          |
                               Postgres (managed)  Redis   Secrets / KMS
                                          |
                               Worker (exactly 1): indexer, batch sealing,
                               Bitcoin anchoring, deposit + card reconciliation
                                          |
        External: TronGrid, GoPlus, Paystack, OpenTimestamps calendars, (Solana RPC)
```

| Component | Role | Scales how |
|---|---|---|
| API | `POST /v1/actions/evaluate` and the rest of `/v1` | Horizontally, stateless (once rate limits use Redis) |
| Worker | `python -m app.indexer run`: freeze events, USDT top-up matching, card payment reconciliation, Merkle sealing, OTS anchoring | Vertically; one copy only |
| Postgres | Decisions, outcomes, billing, risk list, history cache, batches | Managed instance; read replica later; partition `decisions` by month later |
| Redis | Shared rate-limit counters (scanner, public endpoints); later, hot caches | Managed, small |
| Static sites | `frontend`: provd.tech (`out/`), docs.provd.tech (`sites/docs/out`), playground.provd.tech (`sites/playground/out`) | CDN, effectively unlimited |

## Interim: Render free plan

Until the VPS, the API runs on Render's free plan: one Docker web service (`provd/backend`, start command
`./start.sh`, which runs migrations and the seed before the server), a free Postgres and a free Key Value (Redis),
in Frankfurt. Settings that differ from the stage-1 plan:

- `RUN_WORKER_IN_API=true` and `WEB_CONCURRENCY=1`: the free plan has no background workers, so the worker loop runs
  inside the API process (the Postgres worker lock still guarantees one pass at a time).
- `.github/workflows/keep-api-warm.yml` pings `/v1/health` every 10 minutes: free services sleep after 15 minutes
  without traffic, which would also pause the worker. Delete it when moving off the free plan.
- **The free Postgres is deleted 30 days after creation and has no backups.** Move the data (`pg_dump` /
  `pg_restore`) to a paid database or the VPS before then.
- Free Key Value is memory-only: rate-limit counters reset on restart, which is acceptable.

## The three websites

One codebase (`frontend/`), three Cloudflare Pages projects. Each builds with `NEXT_PUBLIC_API_URL=https://api.provd.tech`.

| Site | Pages project | Build command | Output | Custom domain |
|---|---|---|---|---|
| Marketing, checks, verify, pricing, legal | existing project | `npm run build` | `out` | `provd.tech` |
| Docs (guides and concepts, no endpoint list) | `provd-docs` | `npm run build:docs` | `sites/docs/out` | `docs.provd.tech` |
| Playground (endpoint reference + sandbox) | `provd-playground` | `npm run build:playground` | `sites/playground/out` | `playground.provd.tech` |

- Root directory for all three: `provd/frontend`. Adding the custom domain in each Pages project creates its DNS
  record in Cloudflare.
- The API must allow the playground's origin: `CORS_ORIGINS=https://provd.tech,https://www.provd.tech,https://playground.provd.tech`.
- `provd.tech/docs/*` redirects to `docs.provd.tech` and `/docs/api-reference` to the playground (`public/_redirects`).
- The endpoint reference is served only by `GET /v1/developer/reference` (API key required). In production the API's
  own `/docs` and `/v1/openapi.json` stay off (`EXPOSE_API_DOCS` unset).
- Every customer gets two keys: a sandbox key (`"environment": "sandbox"`, prefix `sbx_`) for the playground and
  their tests, and a live key for their server. Live keys are refused from browsers.

## Stage 1: launch (now to about 10 customers, up to ~100,000 checks a month)

Goal: reliable, cheap, almost no ops work for one founder.

| Need | Recommended | Alternatives | Rough cost |
|---|---|---|---|
| API + worker | **Render**: one Web Service (Docker) + one Background Worker, deploy from GitHub | Fly.io (has a Johannesburg region), Railway | $15 to $50 |
| Postgres | **Render Postgres** (daily backups, point-in-time recovery on paid plans) | Neon, Supabase, DigitalOcean Managed Postgres | $20 to $50 |
| Redis | Render Key Value (small) | Upstash | $0 to $10 |
| Static sites | **Cloudflare Pages**, three projects (see "The three websites") | Vercel, Netlify | $0 |
| DNS, TLS, WAF | **Cloudflare** (free plan; proxy `api.provd.tech`) | | $0 |
| Secrets | Platform environment variables (encrypted at rest); `DECISION_SIGNING_KEY` set once, never in git | 1Password / Doppler | $0 |
| Errors | **Sentry** (free tier) | | $0 |
| Uptime | **Better Stack** or UptimeRobot on `/v1/health` | | $0 |
| CI/CD | **GitHub Actions**: tests, build image, deploy, migrations | | $0 |
| **Total** | | | **about $40 to $110** |

**Region:** Frankfurt or Johannesburg. Most of a check's time is spent waiting on chain data, so 150 ms of
network latency from Nairobi or Lagos doesn't matter. Choose by data-protection advice (Kenya's Data
Protection Act covers cross-border transfers; Provd stores hashed phone identifiers, not raw numbers)
**[verify with counsel]**.

### Settings for stage 1

| Setting | Value | Why |
|---|---|---|
| `ENVIRONMENT` | `production` | Enables production validation (secrets required) |
| `WEB_CONCURRENCY` / gunicorn `-w` | 2 to 4 per instance | The image runs 1 worker by default |
| `RATE_LIMIT_BACKEND` | `redis` | Shared counters once there is more than one API instance |
| `TRUST_PROXY_HEADERS` | `true` behind Cloudflare | Correct client IPs for rate limits |
| `DATABASE_URL` | managed Postgres, TLS required | |
| Every secret in `app/secret_store.py` | from the secrets store | See "Secrets" below |

### Secrets

All secrets are declared in `backend/app/secret_store.py`; nothing else in the code, images or compose files
holds one. Required in production: `SECRET_KEY`, `DATABASE_URL`, `DECISION_SIGNING_KEY`,
`ATTESTATION_SIGNING_KEY` (different from the decision key) and the two bootstrap client id/secret pairs.
Optional: `PAYSTACK_SECRET_KEY`, `TRONGRID_API_KEY`, `GOPLUS_API_KEY`, `SOLANA_RPC_URL` (Helius/Alchemy URLs embed a
key), `REDIS_URL`, `SENTRY_DSN`.

1. Generate the ones Provd creates itself: `python -m app.secret_store generate` (prints fresh values once; paste
   them straight into the secret store and clear your terminal).
2. Set each one in the platform's secret store as `NAME`, or mount it as a file and set `NAME_FILE` to its path
   (Docker/Kubernetes secrets; `docker-compose.prod.yml` shows this for a single host).
3. Check on the server: `python -m app.secret_store check` lists what's set, never the values. The app refuses to
   start in production with a missing, short or placeholder secret.
4. Rotate: `SECRET_KEY` (signs out admin sessions) and the bootstrap secrets any time; signing keys as described
   under backups below; provider keys in the provider's dashboard, then here.

### Release pipeline (GitHub Actions)

1. On pull request: `pytest`, frontend `type-check` and `build`, `check-verify.mjs`.
2. On merge to `main`: build the backend image, push to GitHub Container Registry (GHCR) tagged with the commit.
3. Run `alembic upgrade head` as a one-off release step **before** the new API version takes traffic
   (migrations are additive; never drop a column in the same release that stops using it).
4. Deploy API, then worker. Smoke test: `GET /v1/health` and one `evaluate` call with a staging key.
5. Frontend: regenerate the contract (`python -m app.export_contract`), build, deploy to Cloudflare Pages.

## Stage 2: growth (about 1 to 10 million checks a month, first payout-platform plans)

| Change | Why |
|---|---|
| 2 to 4 API instances with autoscaling on CPU and latency | Throughput and zero-downtime deploys |
| Connection pooling: SQLAlchemy pool per process (`pool_size` 5, `max_overflow` 5) or **PgBouncer** in transaction mode (then set asyncpg `statement_cache_size=0`) | Today every request opens a new connection (`NullPool`) |
| Postgres: bigger instance, point-in-time recovery, one read replica for reporting and the public scanner | Keep evaluate fast while analytics run |
| Partition `decisions` by month; archive records older than 13 months to object storage (Cloudflare R2 or S3, Parquet) with their proofs | A decision record is a few KB: 1M checks a month adds several GB. Keep records for as long as customers' audits require **[verify retention]** |
| TronGrid paid plan (or a second provider) and a longer history cache | Upstream rate limits become the bottleneck before our CPU does |
| **Signing keys in a cloud KMS** (AWS KMS and Google Cloud KMS both offer secp256k1 signing keys): the decision-record key and, first, the attestation key, since escrow contracts release funds on its signature | The private keys never sit in an environment variable |
| Metrics: OpenTelemetry to Grafana Cloud (free tier) or Datadog; dashboards for evaluate latency p50/p95, 402 rate, upstream errors, batch lag, anchor lag | Know about problems before customers do |
| Status page | Payout platforms will ask |
| Staging environment with its own database and keys | Safe testing of releases and pricing changes |

Rough cost: $300 to $800 a month, mostly Postgres, TronGrid and observability.

## Stage 3: scale (tens of millions of checks a month, enterprise customers)

Move to a hyperscaler when customers require it (security questionnaires, data residency, SLAs), not before.

| Need | AWS | Google Cloud |
|---|---|---|
| Containers | ECS on Fargate (API autoscaled; worker as a single-task service) | Cloud Run (API) + a single always-on instance for the worker |
| Postgres | Aurora PostgreSQL or RDS with Multi-AZ | Cloud SQL (HA) or AlloyDB |
| Redis | ElastiCache | Memorystore |
| Keys | KMS (secp256k1) | Cloud KMS (secp256k1) |
| Edge | Cloudflare in front, or CloudFront + WAF | Cloudflare, or Cloud Armor |
| Region | af-south-1 (Cape Town) or eu-west | africa-south1 (Johannesburg) or europe-west |

Also at this stage: our own Tron full node (no upstream rate limits, lower latency), a per-customer
dedicated deployment option for large payout platforms, SOC 2 readiness, and an external penetration test.

## Changes made for multi-instance readiness (done)

| # | Change | Where |
|---|---|---|
| 1 | Pooled database connections (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`); `DB_PGBOUNCER=true` for transaction-mode PgBouncer | `app/db/postgres.py` |
| 2 | Shared Redis rate limits by default in production; the app refuses in-memory limits with more than one worker | `app/config.py`, `app/services/rate_limit.py` |
| 3 | Worker singleton via a Postgres advisory lock; a second worker skips its pass | `app/indexer.py` |
| 4 | Paid checks reserved under an account row lock, refunded if the evaluation fails | `app/services/billing.py`, `app/services/evaluate.py` |
| 5 | Workers from `WEB_CONCURRENCY`, graceful shutdown, no `Server` header, container health check | `Dockerfile`, `app/gunicorn_worker.py` |
| 6 | JSON logs (`LOG_FORMAT=json`), sanitised request ids, Sentry without personal data | `app/observability.py` |

Security hardening that came with these changes is described in `SECURITY.md`.

## Backups and recovery

- Managed Postgres point-in-time recovery (at least 7 days in stage 1, 30 days in stage 2).
- Weekly logical dump (`pg_dump`) to object storage in a different provider, kept 90 days.
- Decision records are also independently provable: each batch root is anchored to Bitcoin, and the
  `.ots` proofs are stored with the batch. Losing the database would lose records, not the ability to verify
  ones customers already hold.
- Restore drill once a quarter: restore the latest backup to staging and run the test suite against it.
- The signing key is backed up in the secrets manager (or lives in KMS). Rotating it is supported: each record
  carries its `signing_key_id`, and `GET /v1/proof/keys` should list old public keys as well as the current one.

## Security checklist for launch

- [ ] All secrets in the platform's secret store; none in the image or repository.
- [ ] Postgres not reachable from the internet (private networking or IP allow-list); TLS required.
- [ ] Cloudflare proxy on `api.provd.tech` with WAF managed rules and a rate-limit rule on `/v1/counterparties/*`.
- [ ] Paystack webhook URL set to `https://api.provd.tech/v1/webhooks/paystack`; only signed events are accepted (built in).
- [ ] Admin endpoints require the `billing:admin` scope; admin credentials rotated from the local defaults.
- [ ] Dependency updates via Dependabot; image rebuilt weekly for OS patches.
- [ ] Logs exclude request bodies with hashed identifiers beyond what is needed for debugging.
