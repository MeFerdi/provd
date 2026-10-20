# Provd

Pre-release risk checks for stablecoin money movement: P2P trades, ramps, payouts and escrow releases, on Tron and Solana, for any local payment rail. Built in Kenya.

> This repository is the public engineering snapshot of Provd: the product code, tests and technical research. Business strategy, go-to-market and market-validation material are not included. Live product: https://provd.tech

## Monorepo Structure

See the full project structure and setup instructions in this README.

- **frontend/** — Next.js 14 App Router (marketing, dashboard)
- **backend/** — FastAPI API (core scoring, dispute, auth)
- **ml/** — ML pipeline (PyTorch, PyG, TorchServe)
- **infra/** — Infrastructure as code (Terraform, Nginx)
- **docs/** — Developer documentation

## Getting Started

1. Create local secrets: `cd provd/backend && python3 -m app.secret_store init` (writes git-ignored `.env` files with fresh random values; no secret is ever committed).
2. Run `docker-compose up` to start all services.
3. Access:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - ML Service: http://localhost:8001
   - Flower (Celery): http://localhost:5555
   - MLflow: http://localhost:5050

## Development

- All config is via environment variables. No secrets in code.
- See `/docs` for API reference and authentication details.
