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
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

from sqlalchemy import func, select, text

from app.adapters.base import AdapterUnavailable
from app.config import get_settings
from app.db.postgres import get_postgres_engine, get_session_factory
from app.models.rails import Checkpoint, CreditPurchase, FlaggedAddress
from app.proof.batching import advance_anchors, seal_batch
from app.services import billing, chain_data, paystack, sanctions

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


SANCTIONS_CHECKPOINT = "ofac:sdn"
SANCTIONS_INTERVAL = timedelta(hours=24)
SANCTIONS_SEED = SEED_DIR / "ofac_sdn_addresses.json"


def _with_previous(reference: str | None, previous: str | None) -> str:
	"""Sanctioned rows keep the source they had before ("...|prev:<source>") so delisting can restore it."""
	base = (reference or "").split("|prev:")[0]
	return f"{base}|prev:{previous}"[:128] if previous else base[:128]


def _previous(reference: str | None) -> str | None:
	return reference.split("|prev:", 1)[1] if reference and "|prev:" in reference else None


async def apply_sanctions(db, entries: list, now: datetime) -> tuple[int, int]:
	"""Make the OFAC rows match `entries` (dicts or SanctionedAddress with chain, address, reference).
	Returns (newly sanctioned, delisted)."""
	current = {}
	for e in entries:
		e = e if isinstance(e, dict) else {"chain": e.chain, "address": e.address, "reference": e.reference}
		current[(e["chain"], e["address"])] = e["reference"]
	existing = {(r.chain, r.address): r for r in (await db.execute(select(FlaggedAddress))).scalars().all()}
	added = removed = 0
	for key, reference in current.items():
		row = existing.get(key)
		if row is None:
			db.add(FlaggedAddress(chain=key[0], address=key[1], source=sanctions.SOURCE, reference=reference[:128], flagged_at=now, active=True))
			added += 1
		elif row.source != sanctions.SOURCE or not row.active:
			previous = row.source if row.source != sanctions.SOURCE and row.active else _previous(row.reference)
			row.source, row.active, row.flagged_at = sanctions.SOURCE, True, now
			row.reference = _with_previous(reference, previous)
			added += 1
		else:
			row.reference = _with_previous(reference, _previous(row.reference))
	for key, row in existing.items():
		if row.source == sanctions.SOURCE and row.active and key not in current:
			previous = _previous(row.reference)
			if previous:  # delisted, but still frozen by its issuer: restore that entry
				row.source, row.reference = previous, None
			else:
				row.active = False
			removed += 1
	return added, removed


async def sync_sanctions(db, now: datetime | None = None, force: bool = False) -> tuple[int, int]:
	"""Daily: download the OFAC SDN list and apply its digital currency addresses."""
	now = now or datetime.now(timezone.utc)
	cp = await _checkpoint(db, SANCTIONS_CHECKPOINT)
	if not force and cp.cursor and now - _aware(cp.updated_at) < SANCTIONS_INTERVAL:
		return 0, 0
	published, entries = sanctions.parse_sdn(await sanctions.fetch_sdn())
	if not entries:  # never wipe the list because of an empty or malformed download
		raise ValueError("OFAC SDN download contained no digital currency addresses")
	result = await apply_sanctions(db, entries, now)
	cp.cursor, cp.updated_at = published or now.date().isoformat(), now
	await db.commit()
	return result


SOLANA_FREEZE_CHECKPOINT = "solana:stablecoin_frozen_snapshot"
SOLANA_FREEZE_INTERVAL = timedelta(hours=1)


async def sync_solana_frozen(db, now: datetime | None = None, force: bool = False) -> tuple[int, int]:
	"""Snapshot the owners of frozen USDC/USDT token accounts on Solana into the risk list (at most hourly).
	Returns (newly flagged, unflagged)."""
	now = now or datetime.now(timezone.utc)
	cp = await _checkpoint(db, SOLANA_FREEZE_CHECKPOINT)
	if not force and cp.cursor and now - _aware(cp.updated_at) < SOLANA_FREEZE_INTERVAL:
		return 0, 0
	current = await chain_data.adapter_for("solana").frozen_owners()
	rows = {r.address: r for r in (await db.execute(select(FlaggedAddress).where(FlaggedAddress.chain == "solana"))).scalars().all()}
	added = removed = 0
	for owner, source in current.items():
		row = rows.get(owner)
		if row is None:
			db.add(FlaggedAddress(chain="solana", address=owner, source=source, reference=None, flagged_at=now, active=True))
			added += 1
		elif not row.active:
			row.active, row.flagged_at = True, now
			added += 1
	for owner, row in rows.items():
		if row.active and owner not in current and row.source.endswith("_solana"):
			row.active = False
			removed += 1
	cp.cursor, cp.updated_at = str(len(current)), now
	await db.commit()
	return added, removed


def _aware(value: datetime) -> datetime:
	return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def sync_freeze_events(db) -> int:
	cp = await _checkpoint(db, FREEZE_CHECKPOINT)
	events, cursor = await chain_data.adapter_for("tron").fetch_events(cp.cursor)
	for event in events:  # oldest first, so a later unfreeze wins
		row = await db.get(FlaggedAddress, ("tron", event.address))
		if row is not None and row.source == sanctions.SOURCE:
			# Sanctions take precedence: a Tether freeze/unfreeze never overrides or removes a sanctioned entry.
			# Remember the freeze so a later delisting restores it.
			row.reference = _with_previous(row.reference, event.source if event.kind == "address_frozen" else None)
			continue
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


async def reconcile_card_payments(db, now: datetime | None = None) -> int:
	"""Safety net for missed Paystack webhooks: verify pending card/M-Pesa checkouts between 2 minutes and 24 hours old."""
	if not paystack.enabled():
		return 0
	now = now or datetime.now(timezone.utc)
	pending = (
		await db.execute(
			select(CreditPurchase).where(
				CreditPurchase.status == "pending", CreditPurchase.method.in_(list(paystack.CHANNELS)), CreditPurchase.checkout_url.is_not(None),
				CreditPurchase.created_at <= now - timedelta(minutes=2), CreditPurchase.created_at >= now - timedelta(hours=24),
			).limit(50)
		)
	).scalars().all()
	changed = 0
	for purchase in pending:
		try:
			if paystack.settle(purchase, await paystack.client().verify(purchase.id)) != "pending":
				changed += 1
		except paystack.PaystackUnavailable as exc:
			logger.warning("indexer.paystack_unavailable %s", exc)
			break
	await db.commit()
	return changed


async def seed(db) -> int:
	added = await _seed_freezes(db)
	if not (await db.execute(select(func.count()).select_from(FlaggedAddress).where(FlaggedAddress.source == sanctions.SOURCE))).scalar_one():
		data = json.loads(SANCTIONS_SEED.read_text())
		n, _ = await apply_sanctions(db, data["addresses"], datetime.now(timezone.utc))
		cp = await _checkpoint(db, SANCTIONS_CHECKPOINT)
		cp.cursor = None  # seeded from the bundled snapshot; the worker refreshes it on its first pass
		await db.commit()
		added += n
	return added


async def _seed_freezes(db) -> int:
	if (await db.execute(select(func.count()).select_from(FlaggedAddress).where(FlaggedAddress.chain == "tron", FlaggedAddress.source != sanctions.SOURCE))).scalar_one():
		return 0
	data = json.loads(FREEZE_SEED.read_text())
	present = {a for (a,) in (await db.execute(select(FlaggedAddress.address).where(FlaggedAddress.chain == "tron"))).all()}
	for row in data["addresses"]:
		if row["address"] in present:  # already sanctioned; apply_sanctions keeps the freeze as its previous source
			continue
		db.add(FlaggedAddress(chain="tron", address=row["address"], source=data["source"], reference=row.get("tx"),
		                      flagged_at=datetime.fromisoformat(row["flagged_at"]), active=True))
	cp = await _checkpoint(db, FREEZE_CHECKPOINT)
	cp.cursor = data["cursor"]
	await db.commit()
	return len(data["addresses"])


async def snapshot(db) -> int:
	rows = (await db.execute(select(FlaggedAddress).where(
		FlaggedAddress.chain == "tron", FlaggedAddress.active.is_(True), FlaggedAddress.source == "tether_usdt_freeze",
	))).scalars().all()
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


# Arbitrary constant identifying "the Provd worker" for pg_try_advisory_lock.
WORKER_LOCK_KEY = 0x50524F5644  # "PROVD"


@asynccontextmanager
async def worker_lock():
	"""Yield True if this process holds the worker lock for the pass, False if another worker does.

	The checkpoint, Merkle sealing and payment matching must only ever run in one process. A session-level
	Postgres advisory lock on a dedicated connection guarantees that across machines; it's released when the
	pass ends or the connection drops (e.g. the worker crashes). Non-Postgres databases (tests) skip it."""
	engine = get_postgres_engine()
	if engine.dialect.name != "postgresql":
		yield True
		return
	async with engine.connect() as conn:
		acquired = bool((await conn.execute(text("SELECT pg_try_advisory_lock(:k)"), {"k": WORKER_LOCK_KEY})).scalar())
		try:
			yield acquired
		finally:
			if acquired:
				await conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": WORKER_LOCK_KEY})
				await conn.commit()


async def run_pass() -> bool:
	"""One indexer pass. Returns False if another worker holds the lock (nothing done)."""
	sessions = get_session_factory()
	async with worker_lock() as acquired:
		if not acquired:
			logger.info("indexer.skip another worker holds the lock")
			return False
		async with sessions() as db:
			try:
				events = await sync_freeze_events(db)
				deposits = await match_deposits(db)
				logger.info("indexer.pass freeze_events=%d deposits_matched=%d", events, deposits)
			except AdapterUnavailable as exc:
				await db.rollback()
				logger.warning("indexer.upstream_unavailable %s", exc)
			if cards := await reconcile_card_payments(db):  # independent of Tron availability
				logger.info("indexer.card_payments_settled %d", cards)
			try:
				added, removed = await sync_sanctions(db)
				if added or removed:
					logger.info("indexer.sanctions added=%d delisted=%d", added, removed)
			except Exception as exc:  # noqa: BLE001 - a failed download keeps the current list
				await db.rollback()
				logger.warning("indexer.sanctions_unavailable %s", exc)
			try:
				added, removed = await sync_solana_frozen(db)
				if added or removed:
					logger.info("indexer.solana_frozen added=%d removed=%d", added, removed)
			except AdapterUnavailable as exc:
				await db.rollback()
				logger.warning("indexer.solana_unavailable %s", exc)
			batch = await seal_batch(db)
			anchors = await advance_anchors(db)
			if batch or anchors:
				logger.info("indexer.proof batch=%s anchors_changed=%d", batch.id if batch else None, anchors)
	return True


async def run(once: bool) -> None:
	while True:
		try:
			await run_pass()
		except asyncio.CancelledError:
			raise
		except Exception:  # noqa: BLE001 - one failed pass (e.g. the database restarting) must not stop the worker
			if once:
				raise
			logger.exception("indexer.pass_failed; retrying next interval")
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
