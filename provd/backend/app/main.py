from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_v1_router
from app.config import get_settings
from app.db.neo4j import close_neo4j, verify_neo4j
from app.db.postgres import close_postgres


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

	app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

	@app.get("/", tags=["meta"])
	def root() -> dict[str, str]:
		return {"service": settings.app_name, "version": settings.app_version, "status": "ok"}

	return app

app = create_app()
