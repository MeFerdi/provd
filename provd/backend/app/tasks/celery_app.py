from celery import Celery

from app.config import get_settings


settings = get_settings()

celery_app = Celery(
	"provd",
	broker=settings.celery_broker_url,
	backend=settings.celery_result_backend,
	include=[
		"app.tasks.community_scrape",
		"app.tasks.graph_ingest",
		"app.tasks.score_refresh",
	],
)

celery_app.conf.update(
	task_default_queue="provd-default",
	task_serializer="json",
	result_serializer="json",
	accept_content=["json"],
	timezone="UTC",
	enable_utc=True,
)
