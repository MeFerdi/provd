# Security

How the Provd API protects itself and its customers' data, what each control covers, and what it doesn't.
Report vulnerabilities to security@provd.tech.

## What we protect

| Asset | Why it matters |
|---|---|
| API keys and the admin credentials | Access to scoring, billing and customer data |
| The decision-signing key | Anyone holding it could forge decision records |
| The attestation-signing key | Escrow contracts release funds on its signature; anyone holding it could authorise releases |
| Decision records and outcomes | Customers' trade history; signed proof they rely on |
| Prepaid balances and plans | Money |
| The scoring engine (weights, thresholds) | Product value; knowing them precisely helps an attacker shape transactions to pass |

## Controls

### Authentication and access

- API keys are 256-bit random values, stored only as SHA-256 hashes, shown once at creation. Malformed keys
  are rejected before any database lookup.
- Scopes are explicit; API keys can only carry known scopes (no wildcards). Admin operations need
  `billing:admin` or the admin role, and are hidden from the public API spec.
- Bearer tokens (admin tooling only) are HS256/384/512 JWTs that must carry `exp`, `iat`, `sub`, `iss` and `aud`;
  tokens without an audience or issuer, signed with another key, or unsigned are rejected.
- Every customer-facing record is scoped to the caller's account; other accounts' decisions return 404.

### Rate limiting and brute-force protection

All counters live in Redis in production, shared by every worker and instance (the app refuses to start
with in-memory counters when more than one worker runs). If Redis is unreachable, counting continues
in memory for that process instead of failing open.

| Limit | Default | Applies to |
|---|---|---|
| Public | 120 / min per IP | Every unauthenticated endpoint |
| Scanner | 20 / min per IP | `GET /v1/counterparties/...` |
| API key | 600 / min per key | Every authenticated call |
| Bad credentials | 20 / min per IP | Wrong or malformed keys and tokens; the IP is then refused before any lookup |
| Token endpoint | 10 / min per IP | `POST /v1/auth/token` |
| Login lockout | 5 failures per 15 min | Per client id and IP pair (an attacker elsewhere can't lock the real admin out) |
| Webhooks | 300 / min per IP | Inbound payment webhooks |
| Global | 3,000 / min per IP | Every request (flood protection) |

Behind a proxy, the client IP comes from the edge's header (`CLIENT_IP_HEADER`, e.g. `CF-Connecting-IP`) or
the right-hand side of `X-Forwarded-For`, never the client-controlled leftmost value.

### Input handling

- Bodies are capped at 64 KB (including chunked uploads).
- Identifiers callers choose (`intent_id`, `Idempotency-Key`) are limited to letters, digits and `. _ : -`.
- Free-form JSON (`context`, `venue`, `asset`) is capped at 4 KB, 4 levels deep and 50 keys, with plain JSON
  values only. `X-Platform-Context` is capped at 1 KB.
- Control and invisible formatting characters (including bidirectional overrides and zero-width characters)
  are stripped from caller text before it's stored.
- Wallet addresses are fully validated on scored chains (Tron checksum) and limited to safe characters on others;
  database access goes through the ORM with bound parameters.
- Validation errors never echo submitted values; unexpected errors return a generic message and a request id.

### Release attestations

- Signed with their own key (`ATTESTATION_SIGNING_KEY`), never the decision-record key, so a signature in one
  format can never be passed off as the other. Production refuses to start without it, or if it equals the record key.
- Issued only for the caller's own `release` decisions under 24 hours old, for the scored wallet and at most the
  scored amount, valid for at most an hour, and bound to one chain and contract (or Solana program). Every issued
  attestation is recorded.
- Contracts must check expiry and mark attestations used; `ProvdReleaseVerifier` does both and rejects malleable
  (high-s) signatures. Rotating the key means updating `provdSigner` in deployed contracts.

### Payments

- Paystack webhooks are accepted only with a valid HMAC-SHA512 signature; an optional source-IP allow-list
  (`PAYSTACK_WEBHOOK_IPS`) adds a second check. Amount and currency must match before anything is credited;
  replays credit once.
- Paid checks are reserved under a row lock on the account, so concurrent requests can't spend the same
  prepaid check twice (verified against Postgres: four simultaneous checks on one remaining check, one succeeds).
  A reservation is refunded if the evaluation fails.

### Transport and headers

- HTTPS only in production (HSTS), host allow-list (`ALLOWED_HOSTS`), CORS limited to listed origins and never
  with credentials.
- API responses: `nosniff`, `DENY` framing, `no-referrer`, a `default-src 'none'` content security policy, and
  `no-store` on authenticated responses. No `Server` header.
- The website (`frontend/public/_headers`): strict CSP (own origin plus the API only, no third-party scripts),
  HSTS, `DENY` framing.

### Secrets and operations

- Production refuses to start without strong secrets, explicit CORS origins and hosts, a signing key, and a
  shared rate-limit backend.
- Secrets live in the hosting platform's secret store (or KMS for the signing key, see `DEPLOYMENT.md`), never
  in the image or repository. The container runs as a non-root user.
- Every secret is declared once, in `app/secret_store.py`, and read from the environment (`NAME`) or a mounted
  file (`NAME_FILE`, for Docker and Kubernetes secrets). No secret has a default in code; compose files take the
  database password from a git-ignored file. Local development secrets are random per machine
  (`python -m app.secret_store init`), and test keys are generated at run time.
- Production refuses to start if a secret is missing, too short, or an example/placeholder value, or if
  `DATABASE_URL` wasn't set explicitly.
- The repository is scanned for secrets (GitGuardian; `.gitguardian.yaml` and `.gitleaks.toml` list the only
  exclusions, public blockchain data).
- Sentry is configured without personal data; logs carry request ids, not request bodies.
- The background worker is a guaranteed singleton (Postgres advisory lock), so batches and payment matching
  are never processed twice.

## Prompt injection

The Provd API contains no language model, so nothing in it can be "prompted": every score and reason is
produced by fixed code from structured inputs. The risk is downstream. Customers may feed decision records
to their own AI tools, and records include text callers supplied (`context`, `X-Platform-Context`). We
therefore keep caller text short, strip hidden characters, store it only under `intent.context`, and never
copy it into reasons or flags. Tools reading records should treat `intent.context` as untrusted data.

## Reverse engineering

- The scoring engine, its weights and thresholds run only on the server and are never sent to clients. Public
  health shows only status and engine version; internals are on an admin-only endpoint. Interactive API docs and
  the live spec are off in production; internal routes are excluded from the published spec.
- The website is static and ships no source maps. Anyone can read a website's JavaScript; ours contains no
  secrets or scoring logic.
- **What we can't prevent:** a customer can learn about the engine by sending many checks and comparing
  scores and explanations (the explanations are a product feature). Per-key rate limits, usage-based pricing and
  monitoring for unusual probing patterns make that slow and visible, not impossible.

## Verification

- `tests/test_security.py` runs against the real application (all middleware, real authentication): rate limits,
  lockout, token validation, body limits, input cleaning, headers, CORS, production configuration, refunds.
- Row-level billing locks and the worker advisory lock are verified against Postgres; the production image was
  run with two workers and Redis to confirm shared limits and the login lockout.
