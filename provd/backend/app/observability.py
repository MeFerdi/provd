import logging
import time
from typing import Callable
from uuid import uuid4

import structlog
from fastapi import Request, Response

from app.config import Settings

try:
	import sentry_sdk
except Exception:  # pragma: no cover
	sentry_sdk = None


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


async def request_context_middleware(request: Request, call_next: Callable) -> Response:
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
