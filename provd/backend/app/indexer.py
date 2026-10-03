"""Indexer worker: keeps the public risk list and USDT top-ups current, and seals/anchors decision batches.

    python -m app.indexer seed          # load bundled fixtures (risk-list snapshot) if the table is empty
    python -m app.indexer run --once    # one sync pass: freeze events + deposit matching
    python -m app.indexer run           # loop every INDEXER_INTERVAL_SECONDS
    python -m app.indexer snapshot      # write the current risk list to the seed file

Idempotent: events upsert on (chain, address); top-ups match a unique amount and a tx hash is used once.
"""
import argparse
import asyncio
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

from sqlalchemy import func, select

from app.adapters.base import AdapterUnavailable
from app.config import get_settings
from app.db.postgres import get_session_factory
from app.models.rails import Checkpoint, CreditPurchase, FlaggedAddress
from app.proof.batching import advance_anchors, seal_batch
from app.services import billing, chain_data

logger = logging.getLogger("provd.indexer")
SEED_DIR = Path(__file__).resolve().parent / "seed"
FREEZE_SEED = SEED_DIR / "tron_usdt_frozen.json"
FREEZE_CHECKPOINT = "tron:usdt_freeze_events"


async def _checkpoint(db, name: str) -> Checkpoint:
	cp = await db.get(Checkpoint, name)
	if cp is None:
		cp = Checkpoint(name=name, cursor=None)
		db.add(cp)
	return cp


async def sync_freeze_events(db) -> int:
	cp = await _checkpoint(db, FREEZE_CHECKPOINT)
	events, cursor = await chain_data.adapter_for("tron").fetch_events(cp.cursor)
	for event in events:  # oldest first, so a later unfreeze wins
		row = await db.get(FlaggedAddress, ("tron", event.address))
		if row is None:
			row = FlaggedAddress(chain="tron", address=event.address, source=event.source, reference=event.tx_hash, flagged_at=event.timestamp)
			db.add(row)
		row.active = event.kind == "address_frozen"
		row.reference = event.tx_hash
		if event.kind == "address_frozen":
			row.flagged_at = event.timestamp
	cp.cursor = cursor
	cp.updated_at = datetime.now(timezone.utc)
	await db.commit()
	return len(events)


async def match_deposits(db) -> int:
	"""Confirm pending USDT top-ups whose exact amount arrived at the deposit address."""
	address = get_settings().usdt_deposit_address
	if not address:
		return 0
	pending = (await db.execute(select(CreditPurchase).where(CreditPurchase.status == "pending", CreditPurchase.method == "usdt_tron"))).scalars().all()
	if not pending:
		return 0
	history = await chain_data.adapter_for("tron").counterparty_history(address)
	used = {r for (r,) in (await db.execute(select(CreditPurchase.reference).where(CreditPurchase.reference.is_not(None)))).all()}
	by_amount = {Decimal(p.amount_due): p for p in pending}
	matched = 0
	for transfer in history.transfers:
		if transfer.to_address != address or transfer.tx_hash in used:
			continue
		purchase = by_amount.pop(transfer.amount, None)
		if purchase and transfer.timestamp >= purchase.created_at.replace(tzinfo=purchase.created_at.tzinfo or timezone.utc):
			billing.confirm_purchase(purchase, transfer.tx_hash)
			used.add(transfer.tx_hash)
			matched += 1
	await db.commit()
	return matched


async def seed(db) -> int:
	if (await db.execute(select(func.count()).select_from(FlaggedAddress))).scalar_one():
		return 0
	data = json.loads(FREEZE_SEED.read_text())
	for row in data["addresses"]:
		db.add(FlaggedAddress(chain="tron", address=row["address"], source=data["source"], reference=row.get("tx"),
		                      flagged_at=datetime.fromisoformat(row["flagged_at"]), active=True))
	cp = await _checkpoint(db, FREEZE_CHECKPOINT)
	cp.cursor = data["cursor"]
	await db.commit()
	return len(data["addresses"])


async def snapshot(db) -> int:
	rows = (await db.execute(select(FlaggedAddress).where(FlaggedAddress.chain == "tron", FlaggedAddress.active.is_(True)))).scalars().all()
	cp = await db.get(Checkpoint, FREEZE_CHECKPOINT)
	SEED_DIR.mkdir(exist_ok=True)
	FREEZE_SEED.write_text(json.dumps({
		"source": "tether_usdt_freeze",
		"description": "Tron addresses frozen by Tether on the USDT-TRC20 contract (AddedBlackList minus RemovedBlackList).",
		"generated_at": datetime.now(timezone.utc).isoformat(),
		"cursor": cp.cursor if cp else None,
		"addresses": [{"address": r.address, "tx": r.reference, "flagged_at": r.flagged_at.isoformat()} for r in sorted(rows, key=lambda r: r.address)],
	}, separators=(",", ":")) + "\n")
	return len(rows)


async def run(once: bool) -> None:
	sessions = get_session_factory()
	while True:
		async with sessions() as db:
			try:
				events = await sync_freeze_events(db)
				deposits = await match_deposits(db)
				logger.info("indexer.pass freeze_events=%d deposits_matched=%d", events, deposits)
			except AdapterUnavailable as exc:
				await db.rollback()
				logger.warning("indexer.upstream_unavailable %s", exc)
			batch = await seal_batch(db)
			anchors = await advance_anchors(db)
			if batch or anchors:
				logger.info("indexer.proof batch=%s anchors_changed=%d", batch.id if batch else None, anchors)
		if once:
			return
		await asyncio.sleep(get_settings().indexer_interval_seconds)


def main() -> None:
	logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
	logging.getLogger("httpx").setLevel(logging.WARNING)
	parser = argparse.ArgumentParser(prog="python -m app.indexer")
	sub = parser.add_subparsers(dest="command", required=True)
	sub.add_parser("seed")
	sub.add_parser("snapshot")
	run_cmd = sub.add_parser("run")
	run_cmd.add_argument("--once", action="store_true")
	args = parser.parse_args()

	async def _with_db(fn):
		async with get_session_factory()() as db:
			return await fn(db)

	if args.command == "seed":
		print(f"seeded {asyncio.run(_with_db(seed))} flagged addresses")
	elif args.command == "snapshot":
		print(f"wrote {asyncio.run(_with_db(snapshot))} addresses to {FREEZE_SEED}")
	else:
		asyncio.run(run(args.once))


if __name__ == "__main__":
	main()
