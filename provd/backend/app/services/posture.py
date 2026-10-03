import hashlib
import json
import logging
from datetime import datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chains.evm import EvmClient
from app.config import get_settings
from app.models.posture import PostureChange, PostureSnapshot, Protocol
from app.posture.diff import diff, fingerprint
from app.posture.layerzero import read_posture
from app.posture.rules import evaluate
from app.schemas.posture import ChangeEvent, FindingRef, Posture, ProtocolDetail, ProtocolSummary
from app.services.alerts import send_alerts

logger = logging.getLogger("provd.posture")


def evm_client(chain: str = "ethereum") -> EvmClient:
	settings = get_settings()
	if chain != "ethereum":
		raise ValueError(f"Unsupported chain: {chain}")
	return EvmClient(settings.ethereum_rpc_urls, timeout=settings.rpc_timeout_seconds)


async def scan_contract(client: EvmClient, address: str, chain: str = "ethereum") -> Posture:
	return evaluate(await read_posture(client, address, chain))


def _fingerprint_hash(posture: Posture) -> str:
	return hashlib.sha256(json.dumps(fingerprint(posture), sort_keys=True, default=str).encode()).hexdigest()


async def latest_snapshot(db: AsyncSession, protocol_id: str) -> PostureSnapshot | None:
	stmt = (
		select(PostureSnapshot)
		.where(PostureSnapshot.protocol_id == protocol_id)
		.order_by(PostureSnapshot.checked_at.desc())
		.limit(1)
	)
	return (await db.execute(stmt)).scalar_one_or_none()


async def record_posture(db: AsyncSession, protocol: Protocol, posture: Posture) -> list[ChangeEvent]:
	"""Store a new snapshot if the configuration changed and return the change events (empty on first read)."""
	previous = await latest_snapshot(db, protocol.id)
	digest = _fingerprint_hash(posture)
	protocol.last_checked_at = posture.checked_at
	events: list[ChangeEvent] = []
	if previous is not None and previous.fingerprint == digest:
		# Same on-chain configuration. Re-store the evaluation so rule and wording updates reach
		# existing ratings without a configuration change, but keep the row (it is the change log).
		previous.posture = posture.model_dump(mode="json")
		previous.grade, previous.score, previous.risk_level = posture.grade, posture.score, posture.risk_level
	else:
		if previous is not None:
			events = diff(Posture.model_validate(previous.posture), posture, now=posture.checked_at)
			for event in events:
				db.add(PostureChange(id=str(uuid4()), protocol_id=protocol.id, **event.model_dump()))
		db.add(
			PostureSnapshot(
				id=str(uuid4()),
				protocol_id=protocol.id,
				fingerprint=digest,
				grade=posture.grade,
				score=posture.score,
				risk_level=posture.risk_level,
				posture=posture.model_dump(mode="json"),
				checked_at=posture.checked_at,
			)
		)
	await db.commit()
	return events


async def refresh_protocol(db: AsyncSession, client: EvmClient, protocol: Protocol) -> list[ChangeEvent]:
	posture = await scan_contract(client, protocol.contract, protocol.chain)
	events = await record_posture(db, protocol, posture)
	if events:
		await send_alerts(protocol, events)
	logger.info(
		"posture.refreshed slug=%s grade=%s routes=%d changes=%d",
		protocol.slug, posture.grade, posture.pathways_total, len(events),
	)
	return events


def _summary(protocol: Protocol, snapshot: PostureSnapshot, last_change_at: datetime | None) -> ProtocolSummary:
	posture = Posture.model_validate(snapshot.posture)
	return ProtocolSummary(
		slug=protocol.slug,
		name=protocol.name,
		category=protocol.category,
		framework=protocol.framework,
		chain=protocol.chain,
		contract=protocol.contract,
		grade=posture.grade,
		score=posture.score,
		risk_level=posture.risk_level,
		pathways_total=posture.pathways_total,
		single_verifier_pathways=posture.single_verifier_pathways,
		top_findings=[FindingRef(rule_id=f.rule_id, severity=f.severity, title=f.title) for f in posture.findings[:3]],
		checked_at=protocol.last_checked_at or snapshot.checked_at,
		last_change_at=last_change_at,
	)


async def _rated_protocols(db: AsyncSession, include_unpublished: bool) -> list[tuple[Protocol, PostureSnapshot, datetime | None]]:
	stmt = select(Protocol).order_by(Protocol.name)
	if not include_unpublished:
		stmt = stmt.where(Protocol.published.is_(True))
	protocols = list((await db.execute(stmt)).scalars().all())
	last_changes = dict(
		(await db.execute(select(PostureChange.protocol_id, func.max(PostureChange.detected_at)).group_by(PostureChange.protocol_id))).all()
	)
	rows = []
	for protocol in protocols:
		snapshot = await latest_snapshot(db, protocol.id)
		if snapshot is not None:
			rows.append((protocol, snapshot, last_changes.get(protocol.id)))
	return rows


async def list_protocols(db: AsyncSession, include_unpublished: bool = False) -> list[ProtocolSummary]:
	return [_summary(p, s, c) for p, s, c in await _rated_protocols(db, include_unpublished)]


async def protocol_detail(db: AsyncSession, slug: str, include_unpublished: bool = False) -> ProtocolDetail | None:
	stmt = select(Protocol).where(Protocol.slug == slug)
	if not include_unpublished:
		stmt = stmt.where(Protocol.published.is_(True))
	protocol = (await db.execute(stmt)).scalar_one_or_none()
	if protocol is None:
		return None
	snapshot = await latest_snapshot(db, protocol.id)
	if snapshot is None:
		return None
	changes = list(
		(
			await db.execute(
				select(PostureChange)
				.where(PostureChange.protocol_id == protocol.id)
				.order_by(PostureChange.detected_at.desc())
				.limit(100)
			)
		).scalars().all()
	)
	posture = Posture.model_validate(snapshot.posture)
	summary = _summary(protocol, snapshot, changes[0].detected_at if changes else None)
	return ProtocolDetail(
		**summary.model_dump(),
		website=protocol.website,
		admin=posture.admin,
		pathways=posture.pathways,
		findings=posture.findings,
		changes=[
			ChangeEvent(
				detected_at=c.detected_at, kind=c.kind, severity=c.severity, summary=c.summary,
				pathway=c.pathway, before=c.before, after=c.after,
			)
			for c in changes
		],
	)

