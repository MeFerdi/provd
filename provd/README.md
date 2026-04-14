# Provd

Provd is organized as a clean multi-service repository with the product code split by responsibility.

## Structure

- `frontend/`: Next.js marketing site and product UI
- `backend/`: FastAPI API and core application services
- `ml/`: model training and inference utilities
- `infra/`: deployment and infrastructure configuration
- `docs/`: source content for product and developer documentation

## Development

- Run frontend work from `provd/frontend`
- Run backend work from `provd/backend`
- Keep generated artifacts like `.next`, `out`, local `node_modules`, and local env files out of version control

## Local Setup

1. Copy the relevant `.env.example` file for the service you are working on.
2. Install dependencies inside the service directory only.
3. Start the service from its own directory.
