"""Compliance evidence packs: screening coverage, exceptions, draft STRs and signed records for a period."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.compliance_frameworks import FRAMEWORKS
from app.dependencies import account_id, get_db_session, require_permissions
from app.evidence import PeriodError, build_pack, iter_records, period, render_html
from app.schemas.auth import AuthContext
from app.services.rate_limit import enforce

router = APIRouter(prefix="/evidence", tags=["evidence"])
admin_router = APIRouter(prefix="/admin/accounts", tags=["admin"])
_evaluator = require_permissions(["actions:evaluate"])
_admin = require_permissions(["keys:read"], allowed_roles=["admin"])

FROM = Query(default=None, alias="from", description="First day (YYYY-MM-DD, UTC). Default: 29 days before `to`.")
TO = Query(default=None, alias="to", description="Last day, inclusive (YYYY-MM-DD, UTC). Default: today.")
FRAMEWORK = Query(default="fatf", description=f"Obligations to map to: {', '.join(sorted(FRAMEWORKS))}")


async def _pack_response(db: AsyncSession, account: str, start: date | None, end: date | None, framework: str, fmt: str):
	try:
		pack = await build_pack(db, account, start, end, framework)
	except (PeriodError, ValueError) as exc:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
	if fmt == "html":
		name = f"provd-evidence-{pack['period']['from']}-to-{pack['period']['to']}.html"
		return HTMLResponse(render_html(pack), headers={"Content-Disposition": f'attachment; filename="{name}"'})
	return pack


@router.get("", summary="Compliance evidence pack for a period (JSON, or a printable HTML report)")
async def evidence_pack(
	start: date | None = FROM, end: date | None = TO, framework: str = FRAMEWORK,
	format: Literal["json", "html"] = Query(default="json"),
	db: AsyncSession = Depends(get_db_session), ctx: AuthContext = Depends(_evaluator),
):
	await enforce(f"evidence:{ctx.principal_id}", 30, 3600)
	return await _pack_response(db, account_id(ctx), start, end, framework, format)


@router.get("/records", summary="Every decision record in a period, with proofs (JSON lines)")
async def evidence_records(
	start: date | None = FROM, end: date | None = TO,
	db: AsyncSession = Depends(get_db_session), ctx: AuthContext = Depends(_evaluator),
):
	await enforce(f"evidence-records:{ctx.principal_id}", 30, 3600)
	try:
		_, _, first, last = period(start, end)
	except PeriodError as exc:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
	name = f"provd-records-{first.isoformat()}-to-{last.isoformat()}.jsonl"
	return StreamingResponse(
		iter_records(db, account_id(ctx), first, last), media_type="application/x-ndjson",
		headers={"Content-Disposition": f'attachment; filename="{name}"'},
	)


@admin_router.get("/{account}/evidence", include_in_schema=False, summary="Admin: evidence pack for any account (pilots)")
async def admin_evidence_pack(
	account: str, start: date | None = FROM, end: date | None = TO, framework: str = FRAMEWORK,
	format: Literal["json", "html"] = Query(default="json"),
	db: AsyncSession = Depends(get_db_session), _: AuthContext = Depends(_admin),
):
	return await _pack_response(db, account, start, end, framework, format)
