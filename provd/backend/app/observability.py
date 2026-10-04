import json
import logging
import re
import time
from typing import Callable
from uuid import uuid4

from fastapi import Request, Response

from app.config import Settings

try:
	import sentry_sdk
except Exception:  # pragma: no cover
	sentry_sdk = None

_http_logger = logging.getLogger("provd.http")
# Request and trace ids from callers are only kept if short and plain (they end up in logs and headers).
_SAFE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class JsonFormatter(logging.Formatter):
	def format(self, record: logging.LogRecord) -> str:
		entry = {
			"time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
			"level": record.levelname,
			"logger": record.name,
			"message": record.getMessage(),
		}
		if record.exc_info:
			entry["exception"] = self.formatException(record.exc_info)
		return json.dumps(entry, ensure_ascii=False)


def configure_logging() -> None:
	from app.config import get_settings

	handler = logging.StreamHandler()
	if get_settings().log_format == "json":
		handler.setFormatter(JsonFormatter())
	else:
		handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
	root = logging.getLogger()
	root.handlers[:] = [handler]
	root.setLevel(logging.INFO)


def _safe_id(value: str | None) -> str | None:
	return value if value and _SAFE_ID.match(value) else None


def configure_sentry(settings: Settings) -> None:
	if settings.sentry_dsn and sentry_sdk is not None:
		sentry_sdk.init(
			dsn=settings.sentry_dsn,
			environment=settings.app_env,
			traces_sample_rate=0.1,
			send_default_pii=False,
		)


async def request_context_middleware(request: Request, call_next: Callable) -> Response:
	request_id = _safe_id(request.headers.get("X-Request-ID")) or str(uuid4())
	trace_id = _safe_id(request.headers.get("X-Trace-ID")) or request_id
	request.state.request_id = request_id
	started = time.perf_counter()
	try:
		response = await call_next(request)
		elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
		_http_logger.info(
			"request.complete method=%s path=%s status=%s elapsed_ms=%s request_id=%s trace_id=%s",
			request.method,
			request.url.path,
			response.status_code,
			elapsed_ms,
			request_id,
			trace_id,
		)
	except Exception:
		elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
		_http_logger.exception(
			"request.error method=%s path=%s elapsed_ms=%s request_id=%s trace_id=%s",
			request.method,
			request.url.path,
			elapsed_ms,
			request_id,
			trace_id,
		)
		raise

	response.headers["X-Request-ID"] = request_id
	response.headers["X-Trace-ID"] = trace_id
	return response
