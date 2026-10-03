"""Operator commands.

    python -m app.cli seed                       # upsert protocols from app/data/protocols.json
    python -m app.cli refresh [--slug SLUG]      # read every (or one) protocol once, record changes
    python -m app.cli monitor                    # refresh forever, every MONITOR_INTERVAL_SECONDS
    python -m app.cli publish SLUG [SLUG ...]    # make ratings public (after notifying the team)
    python -m app.cli unpublish SLUG [SLUG ...]
    python -m app.cli export-snapshot --out ../frontend/src/data/ratings-snapshot.json [--include-unpublished]
"""
import argparse
import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

from app.config import get_settings
from app.db.postgres import get_session_factory
from app.models.posture import Protocol
from app.services import posture as service

logger = logging.getLogger("provd.cli")
SEED_FILE = Path(__file__).resolve().parent / "data" / "protocols.json"


async def seed(sessions, path: Path = SEED_FILE) -> int:
	entries = json.load(open(path))
	async with sessions() as db:
		existing = {p.slug: p for p in (await db.execute(select(Protocol))).scalars().all()}
		for entry in entries:
			protocol = existing.get(entry["slug"])
			if protocol is None:
				protocol = Protocol(id=str(uuid4()), slug=entry["slug"], published=entry.get("published", False))
				db.add(protocol)
			protocol.name = entry["name"]
			protocol.category = entry["category"]
			protocol.chain = entry["chain"]
			protocol.contract = entry["contract"].lower()
			protocol.website = entry.get("website")
		await db.commit()
	return len(entries)


async def refresh(sessions, slug: str | None = None) -> None:
	async with sessions() as db:
		stmt = select(Protocol).order_by(Protocol.slug)
		if slug:
			stmt = stmt.where(Protocol.slug == slug)
		protocols = list((await db.execute(stmt)).scalars().all())
		client = service.evm_client()
		for protocol in protocols:
			try:
				await service.refresh_protocol(db, client, protocol)
			except Exception:  # noqa: BLE001 - one bad contract or RPC hiccup must not stop the sweep
				await db.rollback()
				logger.exception("posture.refresh_failed slug=%s", protocol.slug)


async def monitor(sessions) -> None:
	interval = get_settings().monitor_interval_seconds
	while True:
		started = datetime.now(timezone.utc)
		await refresh(sessions)
		elapsed = (datetime.now(timezone.utc) - started).total_seconds()
		logger.info("monitor.sweep_complete elapsed_s=%.1f next_in_s=%d", elapsed, interval)
		await asyncio.sleep(max(30, interval - elapsed))


async def set_published(sessions, slugs: list[str], published: bool) -> None:
	async with sessions() as db:
		for protocol in (await db.execute(select(Protocol).where(Protocol.slug.in_(slugs)))).scalars().all():
			protocol.published = published
		await db.commit()


async def export_snapshot(sessions, out: Path, include_unpublished: bool) -> int:
	async with sessions() as db:
		summaries = await service.list_protocols(db, include_unpublished=include_unpublished)
		details = [await service.protocol_detail(db, s.slug, include_unpublished=include_unpublished) for s in summaries]
	payload = {
		"generated_at": datetime.now(timezone.utc).isoformat(),
		# A preview snapshot contains protocols not yet cleared for publication; never deploy one.
		"preview": include_unpublished,
		"protocols": [d.model_dump(mode="json") for d in details if d],
	}
	out.parent.mkdir(parents=True, exist_ok=True)
	out.write_text(json.dumps(payload, indent=1) + "\n")
	return len(payload["protocols"])


def main() -> None:
	logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
	logging.getLogger("httpx").setLevel(logging.WARNING)
	parser = argparse.ArgumentParser(prog="python -m app.cli")
	sub = parser.add_subparsers(dest="command", required=True)
	sub.add_parser("seed")
	refresh_cmd = sub.add_parser("refresh")
	refresh_cmd.add_argument("--slug")
	sub.add_parser("monitor")
	for name in ("publish", "unpublish"):
		sub.add_parser(name).add_argument("slugs", nargs="+")
	export = sub.add_parser("export-snapshot")
	export.add_argument("--out", type=Path, required=True)
	export.add_argument("--include-unpublished", action="store_true")
	args = parser.parse_args()

	sessions = get_session_factory()
	if args.command == "seed":
		print(f"seeded {asyncio.run(seed(sessions))} protocols")
	elif args.command == "refresh":
		asyncio.run(refresh(sessions, args.slug))
	elif args.command == "monitor":
		asyncio.run(monitor(sessions))
	elif args.command in ("publish", "unpublish"):
		asyncio.run(set_published(sessions, args.slugs, args.command == "publish"))
	elif args.command == "export-snapshot":
		count = asyncio.run(export_snapshot(sessions, args.out, args.include_unpublished))
		print(f"exported {count} protocols to {args.out}" + (" (PREVIEW — includes unpublished)" if args.include_unpublished else ""))


if __name__ == "__main__":
	main()
