# Provd Backend

This is the backend service for Provd, a B2B fraud intelligence platform for African P2P cryptocurrency markets. It provides real-time risk scores and signals for counterparty entities, dispute analysis, and compliance tooling for exchanges, wallets, and platforms.

## Features
- FastAPI-based REST API
- Neo4j and PostgreSQL database integration
- Celery-powered background tasks
- Modular service architecture (scoring, dispute analysis, graph, caching)
- JWT-based authentication and API key management
- Alembic migrations for database schema
- Dockerized for local and production deployments

## Project Structure

```
backend/
├── alembic/                # Database migrations
├── alembic.ini             # Alembic config
├── app/
│   ├── api/                # API route definitions
│   │   └── v1/             # Versioned API endpoints
│   ├── config.py           # App configuration
│   ├── db/                 # Database connectors (Neo4j, Postgres)
│   ├── dependencies.py     # FastAPI dependencies
│   ├── main.py             # FastAPI app entrypoint
│   ├── models/             # SQLAlchemy/ORM models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic/services
│   └── tasks/              # Celery tasks
├── requirements.txt        # Python dependencies
```

## Getting Started

### Prerequisites
- Python 3.10+
- Docker & Docker Compose
- PostgreSQL (if not using Docker)
- Neo4j (if not using Docker)

### Local Development

1. **Clone the repo:**
   ```bash
   git clone https://github.com/MeFerdi/provd-web.git
   cd provd-web/provd/backend
   ```

2. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in secrets (DB URIs, JWT secret, etc).

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start the API server:**
   ```bash
   uvicorn app.main:app --reload
   ```

7. **Start Celery worker (in another terminal):**
   ```bash
   celery -A app.tasks.celery_app worker --loglevel=info
   ```

### Using Docker Compose

1. **Start all services:**
   ```bash
   docker-compose up --build
   ```
   This will launch the API, PostgreSQL, Neo4j, and Celery worker.

2. **Access the API:**
   - Default: http://localhost:8000
   - Docs: http://localhost:8000/docs

## Key Endpoints
- `/api/v1/trust/score` — Get risk score for a counterparty
- `/api/v1/dispute/analyze` — Analyze a trade dispute
- `/api/v1/auth/login` — Obtain JWT token
- `/api/v1/health` — Health check

## Migrations
- Use Alembic for schema changes:
  ```bash
  alembic revision --autogenerate -m "Describe change"
  alembic upgrade head
  ```

## Testing
- (Recommended) Use pytest for unit/integration tests.
- Example:
  ```bash
  pytest
  ```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `NEO4J_URI` — Neo4j connection string
- `SECRET_KEY` — JWT secret
- `CELERY_BROKER_URL` — Celery broker (e.g., Redis)
- See `.env.example` for all options

## Deployment
- Use `docker-compose.prod.yml` for production deployments
- Set all secrets and production DB URIs in your environment

## License
MIT (or your license here)

## Contact
- Security: security@provd.io
- General: hello@provd.io

---

For more details, see the [docs/](../docs/) folder.
