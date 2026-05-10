from celery import Celery
from celery.signals import task_failure
from celery.utils.log import get_task_logger

try:
	import sentry_sdk
except Exception:  # pragma: no cover
	sentry_sdk = None

from app.config import get_settings


settings = get_settings()
logger = get_task_logger(__name__)

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
	task_acks_late=True,
	task_reject_on_worker_lost=True,
	task_track_started=True,
	worker_prefetch_multiplier=1,
	task_time_limit=settings.celery_task_time_limit_seconds,
	task_soft_time_limit=settings.celery_task_soft_time_limit_seconds,
	timezone="UTC",
	enable_utc=True,
	# No periodic jobs by default — add beat_schedule when scrape/refresh is product-critical.
	beat_schedule={},
)

if settings.sentry_dsn and sentry_sdk is not None:
	sentry_sdk.init(dsn=settings.sentry_dsn)


@task_failure.connect
def _on_task_failure(task_id, exception, sender, args, kwargs, traceback, einfo, **extras):
	logger.error(
		"Celery task failed",
		extra={
			"task_id": task_id,
			"task_name": getattr(sender, "name", "unknown"),
			"args": args,
			"kwargs": kwargs,
			"exception": str(exception),
		},
	)
	if settings.sentry_dsn and sentry_sdk is not None:
		sentry_sdk.capture_exception(exception)
