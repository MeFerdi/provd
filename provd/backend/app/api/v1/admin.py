from urllib.parse import urlsplit, urlunsplit

from fastapi import APIRouter, Depends

from app.dependencies import require_permissions
from app.schemas.auth import AuthContext
from app.tasks.celery_app import celery_app

router = APIRouter(prefix="/admin", tags=["admin"])


def _mask_url(value: str) -> str:
	if not value:
		return value
	parsed = urlsplit(value)
	if parsed.password is None and parsed.username is None:
		return value
	netloc = parsed.hostname or ""
	if parsed.port:
		netloc = f"{netloc}:{parsed.port}"
	if parsed.username:
		netloc = f"{parsed.username}:***@{netloc}"
	return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))


@router.get("/celery/runtime", summary="Inspect Celery runtime configuration")
def get_celery_runtime(
	_: AuthContext = Depends(require_permissions(["trust:read"], allowed_roles=["admin"])),
) -> dict:
	conf = celery_app.conf
	beat_schedule = conf.get("beat_schedule", {}) or {}

	serializable_schedule = {
		name: {
			"task": job.get("task"),
			"schedule": str(job.get("schedule")),
			"args": list(job.get("args", [])),
		}
		for name, job in beat_schedule.items()
	}

	return {
		"app_name": celery_app.main,
		"broker_url": _mask_url(str(conf.get("broker_url", ""))),
		"result_backend": _mask_url(str(conf.get("result_backend", ""))),
		"default_queue": conf.get("task_default_queue"),
		"task_time_limit": conf.get("task_time_limit"),
		"task_soft_time_limit": conf.get("task_soft_time_limit"),
		"task_track_started": conf.get("task_track_started"),
		"task_acks_late": conf.get("task_acks_late"),
		"task_reject_on_worker_lost": conf.get("task_reject_on_worker_lost"),
		"worker_prefetch_multiplier": conf.get("worker_prefetch_multiplier"),
		"beat_schedule": serializable_schedule,
	}
