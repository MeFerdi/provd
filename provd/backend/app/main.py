import sys
from contextlib import asynccontextmanager
from pathlib import Path

if __package__ in (None, ""):
	# Started as a script (`python main.py` inside app/): make the `app` package importable.
	sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import router as api_v1_router
from app.config import get_settings
from app.db.postgres import close_postgres
from app.observability import configure_logging, configure_sentry, request_context_middleware
from app.security import BodySizeLimitMiddleware, SecurityHeadersMiddleware, global_rate_limit_middleware, install_error_handlers
from app.services.rate_limit import public_limit


@asynccontextmanager
async def lifespan(_: FastAPI):
	try:
		yield
	finally:
		await close_postgres()


def create_app() -> FastAPI:
	settings = get_settings()
	configure_logging()
	configure_sentry(settings)
	docs = settings.api_docs_enabled
	app = FastAPI(
		title=settings.app_name,
		version=settings.app_version,
		# Interactive docs and the live spec are off in production unless EXPOSE_API_DOCS=true; the public
		# reference on the website is generated from the same spec (app.export_contract).
		openapi_url=f"{settings.api_v1_prefix}/openapi.json" if docs else None,
		docs_url="/docs" if docs else None,
		redoc_url="/redoc" if docs else None,
		lifespan=lifespan,
	)
	install_error_handlers(app)

	# Middleware runs outermost-last-added: size limit and host check first, then headers, CORS, rate limit.
	app.middleware("http")(request_context_middleware)
	app.middleware("http")(global_rate_limit_middleware)
	app.add_middleware(
		CORSMiddleware,
		allow_origins=settings.cors_origins,
		allow_credentials=False,  # API keys travel in headers, never cookies
		allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allow_headers=["Content-Type", "Authorization", "X-API-Key", "Idempotency-Key", "X-Platform-Context", "X-Request-ID"],
		expose_headers=["X-Request-ID", "Retry-After"],
		max_age=600,
	)
	app.add_middleware(SecurityHeadersMiddleware)
	if "*" not in settings.allowed_hosts:
		# localhost stays allowed for the container's own health check.
		app.add_middleware(TrustedHostMiddleware, allowed_hosts=[*settings.allowed_hosts, "localhost", "127.0.0.1"])
	app.add_middleware(BodySizeLimitMiddleware)

	app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

	@app.get("/", tags=["meta"], include_in_schema=False, dependencies=[Depends(public_limit)])
	def root() -> dict[str, str]:
		return {"service": settings.app_name, "version": settings.app_version, "status": "ok"}

	return app

app = create_app()


if __name__ == "__main__":
	import uvicorn

	uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
