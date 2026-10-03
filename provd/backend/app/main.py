import sys
from contextlib import asynccontextmanager
from pathlib import Path

if __package__ in (None, ""):
	# Started as a script (`python main.py` inside app/): make the `app` package importable.
	sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_v1_router
from app.config import get_settings
from app.db.postgres import close_postgres
from app.observability import configure_logging, configure_sentry, request_context_middleware


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


if __name__ == "__main__":
	import uvicorn

	uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
