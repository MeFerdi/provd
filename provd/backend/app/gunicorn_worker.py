"""Gunicorn worker for production: no `Server` header (don't advertise the stack), proxy headers left to
the app's own client-IP logic (TRUST_PROXY_HEADERS / CLIENT_IP_HEADER)."""
from uvicorn.workers import UvicornWorker


class ProvdUvicornWorker(UvicornWorker):
	CONFIG_KWARGS = {**UvicornWorker.CONFIG_KWARGS, "server_header": False, "proxy_headers": False}
