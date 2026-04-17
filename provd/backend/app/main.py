from contextlib import asynccontextmanager
import logging
import time
from uuid import uuid4

from fastapi import FastAPI
from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
import structlog

try:
	import sentry_sdk
except Exception:  # pragma: no cover
	sentry_sdk = None

from app.api.v1.router import router as api_v1_router
from app.config import Settings, get_settings
from app.db.neo4j import close_neo4j, verify_neo4j
from app.db.postgres import close_postgres


def configure_logging() -> None:
	logging.basicConfig(level=logging.INFO, format="%(message)s")
	structlog.configure(
		processors=[
			structlog.contextvars.merge_contextvars,
			structlog.processors.TimeStamper(fmt="iso", utc=True),
			structlog.processors.add_log_level,
			structlog.processors.JSONRenderer(),
		],
		logger_factory=structlog.stdlib.LoggerFactory(),
		cache_logger_on_first_use=True,
	)


def configure_sentry(settings: Settings) -> None:
	if settings.sentry_dsn and sentry_sdk is not None:
		sentry_sdk.init(
			dsn=settings.sentry_dsn,
			environment=settings.app_env,
			traces_sample_rate=0.1,
		)


async def request_context_middleware(request: Request, call_next) -> Response:
	request_id = request.headers.get("X-Request-ID") or str(uuid4())
	trace_id = request.headers.get("X-Trace-ID") or request_id

	structlog.contextvars.clear_contextvars()
	structlog.contextvars.bind_contextvars(request_id=request_id, trace_id=trace_id, path=request.url.path)
	logger = structlog.get_logger("http")

	started = time.perf_counter()
	try:
		response = await call_next(request)
		elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
		logger.info(
			"request.complete",
			method=request.method,
			status_code=response.status_code,
			elapsed_ms=elapsed_ms,
		)
	except Exception:
		elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
		logger.exception("request.error", method=request.method, elapsed_ms=elapsed_ms)
		raise
	finally:
		structlog.contextvars.clear_contextvars()

	response.headers["X-Request-ID"] = request_id
	response.headers["X-Trace-ID"] = trace_id
	return response


@asynccontextmanager
async def lifespan(_: FastAPI):
	await verify_neo4j()
	try:
		yield
	finally:
		await close_neo4j()
		await close_postgres()


def create_app() -> FastAPI:
	settings = get_settings()
	configure_logging()
	configure_sentry(settings)
	app = FastAPI(
		title=settings.app_name,
		version=settings.app_version,
		openapi_url=f"{settings.api_v1_prefix}/openapi.json",
		docs_url="/docs",
		redoc_url="/redoc",
		lifespan=lifespan,
	)

	app.add_middleware(
		CORSMiddleware,
		allow_origins=settings.cors_origins,
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)

	app.middleware("http")(request_context_middleware)

	app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

	@app.get("/", tags=["meta"])
	def root() -> dict[str, str]:
		return {"service": settings.app_name, "version": settings.app_version, "status": "ok"}

	return app

app = create_app()
