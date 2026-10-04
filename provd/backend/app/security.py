"""HTTP hardening applied to every request: security headers, body size limit, global per-IP rate limit,
and error responses that never echo request data or internals."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import get_settings
from app.services.rate_limit import client_ip, enforce

logger = logging.getLogger("provd.security")

_DOCS_PATHS = ("/docs", "/redoc")


class SecurityHeadersMiddleware:
	"""Headers for a JSON API: no sniffing, no framing, no referrer, no caching of authenticated responses."""

	def __init__(self, app: ASGIApp) -> None:
		self.app = app

	async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
		if scope["type"] != "http":
			await self.app(scope, receive, send)
			return
		path: str = scope.get("path", "")
		request_headers = {k.lower(): v for k, v in scope.get("headers", [])}
		authenticated = b"authorization" in request_headers or b"x-api-key" in request_headers
		production = not get_settings().is_non_production

		async def send_with_headers(message: Message) -> None:
			if message["type"] == "http.response.start":
				headers = [(k, v) for k, v in message.get("headers", []) if k.lower() != b"server"]
				extra = {
					b"x-content-type-options": b"nosniff",
					b"x-frame-options": b"DENY",
					b"referrer-policy": b"no-referrer",
					b"permissions-policy": b"camera=(), microphone=(), geolocation=(), payment=()",
					b"cross-origin-opener-policy": b"same-origin",
				}
				if not path.startswith(_DOCS_PATHS):
					extra[b"content-security-policy"] = b"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
				if production:
					extra[b"strict-transport-security"] = b"max-age=63072000; includeSubDomains"
				if authenticated:
					extra[b"cache-control"] = b"no-store"
				present = {k.lower() for k, _ in headers}
				headers += [(k, v) for k, v in extra.items() if k not in present]
				message["headers"] = headers
			await send(message)

		await self.app(scope, receive, send_with_headers)


class _BodyTooLarge(Exception):
	pass


class BodySizeLimitMiddleware:
	"""Reject request bodies over MAX_REQUEST_BODY_BYTES, whether or not Content-Length is sent."""

	def __init__(self, app: ASGIApp) -> None:
		self.app = app

	async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
		if scope["type"] != "http":
			await self.app(scope, receive, send)
			return
		limit = get_settings().max_request_body_bytes
		for key, value in scope.get("headers", []):
			if key.lower() == b"content-length":
				try:
					if int(value) > limit:
						await _send_json(send, 413, {"detail": f"Request body larger than {limit} bytes"})
						return
				except ValueError:
					await _send_json(send, 400, {"detail": "Invalid Content-Length"})
					return

		received = 0
		too_large = False
		replaced = False

		async def limited_receive() -> Message:
			nonlocal received, too_large
			message = await receive()
			if message["type"] == "http.request":
				received += len(message.get("body", b""))
				if received > limit:
					too_large = True
					raise _BodyTooLarge
			return message

		async def guarded_send(message: Message) -> None:
			# The framework may turn the read error into its own 400; answer 413 instead.
			nonlocal replaced
			if too_large:
				if message["type"] == "http.response.start" and not replaced:
					replaced = True
					await _send_json(send, 413, {"detail": f"Request body larger than {limit} bytes"})
				return
			await send(message)

		try:
			await self.app(scope, limited_receive, guarded_send)
		except _BodyTooLarge:
			if not replaced:
				await _send_json(send, 413, {"detail": f"Request body larger than {limit} bytes"})


async def _send_json(send: Send, status_code: int, body: dict) -> None:
	import json

	payload = json.dumps(body).encode()
	await send({"type": "http.response.start", "status": status_code, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(payload)).encode())]})
	await send({"type": "http.response.body", "body": payload})


async def global_rate_limit_middleware(request: Request, call_next):
	"""Flood protection: a generous per-IP ceiling on every request, before routing and authentication."""
	try:
		await enforce(f"global:{client_ip(request)}", get_settings().global_rate_limit_per_minute, 60)
	except StarletteHTTPException as exc:
		return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=exc.headers)
	return await call_next(request)


def install_error_handlers(app: FastAPI) -> None:
	@app.exception_handler(RequestValidationError)
	async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
		# Never echo the submitted values back (they may contain secrets or hostile text).
		errors = [{"loc": list(err.get("loc", [])), "msg": err.get("msg", "Invalid value"), "type": err.get("type", "value_error")} for err in exc.errors()]
		return JSONResponse({"detail": errors}, status_code=422)

	@app.exception_handler(Exception)
	async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
		request_id = getattr(request.state, "request_id", None)
		logger.exception("request.unhandled path=%s request_id=%s", request.url.path, request_id)
		headers = {"X-Request-ID": request_id} if request_id else None
		return JSONResponse({"detail": "Internal server error", "request_id": request_id}, status_code=500, headers=headers)
