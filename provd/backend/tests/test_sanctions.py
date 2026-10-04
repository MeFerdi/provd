"""OFAC sanctions screening: parsing the SDN list, precedence over issuer freezes, scoring, sync and seed."""
import json
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app import indexer
from app.models.rails import FlaggedAddress
from app.services import sanctions
from tests.test_rails_api import EXPOSED, FROZEN, env, intent  # noqa: F401  (env is a fixture)

SOL_SANCTIONED = "Fc1EwQUZyTEagaDvA1utHXCcZNyG1x2PLt2DfNu1cJdH"
NS = "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/XML"
SAMPLE = f"""<?xml version="1.0" standalone="yes"?>
<sdnList xmlns="{NS}">
  <publshInformation><Publish_Date>10/02/2026</Publish_Date><Record_Count>3</Record_Count></publshInformation>
  <sdnEntry><uid>101</uid><lastName>EXAMPLE EXCHANGE</lastName><sdnType>Entity</sdnType>
    <idList>
      <id><uid>1</uid><idType>Digital Currency Address - TRX</idType><idNumber>{FROZEN}</idNumber></id>
      <id><uid>2</uid><idType>Digital Currency Address - USDT</idType><idNumber>0xAbC0000000000000000000000000000000000001</idNumber></id>
      <id><uid>3</uid><idType>Digital Currency Address - XBT</idType><idNumber>1BoatSLRHtKNngkdXEeobR76b53LETtpyT</idNumber></id>
      <id><uid>4</uid><idType>Passport</idType><idNumber>X123</idNumber></id>
    </idList>
  </sdnEntry>
  <sdnEntry><uid>202</uid><firstName>Jane</firstName><lastName>DOE</lastName><sdnType>Individual</sdnType>
    <idList>
      <id><uid>5</uid><idType>Digital Currency Address - SOL</idType><idNumber>{SOL_SANCTIONED}</idNumber></id>
      <id><uid>6</uid><idType>Digital Currency Address - SOL</idType><idNumber>not-a-real-address</idNumber></id>
    </idList>
  </sdnEntry>
</sdnList>""".encode()


def test_parse_sdn_classifies_by_address_format():
	published, rows = sanctions.parse_sdn(SAMPLE)
	assert published == "10/02/2026"
	got = {(r.chain, r.address): r.reference for r in rows}
	assert got == {
		("tron", FROZEN): "SDN 101: EXAMPLE EXCHANGE",
		("evm", "0xabc0000000000000000000000000000000000001"): "SDN 101: EXAMPLE EXCHANGE",
		("solana", SOL_SANCTIONED): "SDN 202: Jane DOE",
	}  # Bitcoin, passports and malformed addresses are skipped; EVM lowercased


def _rows(sessions, portal):
	async def load():
		async with sessions() as db:
			return {(r.chain, r.address): r for r in (await db.execute(select(FlaggedAddress))).scalars().all()}

	return portal.call(load)


def test_sanctions_take_precedence_and_delisting_restores_the_freeze(env):  # noqa: F811
	client, tron, who, sessions, portal = env
	now = datetime.now(timezone.utc)
	_, entries = sanctions.parse_sdn(SAMPLE)

	async def apply(items):
		async with sessions() as db:
			result = await indexer.apply_sanctions(db, items, now)
			await db.commit()
			return result

	assert portal.call(apply, entries) == (3, 0)  # FROZEN was a Tether freeze; now sanctioned
	row = _rows(sessions, portal)[("tron", FROZEN)]
	assert row.source == "ofac_sdn" and row.reference.endswith("|prev:tether_usdt_freeze")

	async def resync_freezes():  # the fake Tron adapter re-emits FROZEN's freeze event
		async with sessions() as db:
			cp = await db.get(indexer.Checkpoint, indexer.FREEZE_CHECKPOINT)
			cp.cursor = None
			await db.commit()
			await indexer.sync_freeze_events(db)

	portal.call(resync_freezes)
	assert _rows(sessions, portal)[("tron", FROZEN)].source == "ofac_sdn"  # a freeze event never overrides sanctions

	assert portal.call(apply, [e for e in entries if e.chain != "tron"]) == (0, 1)  # FROZEN delisted
	restored = _rows(sessions, portal)[("tron", FROZEN)]
	assert restored.source == "tether_usdt_freeze" and restored.active  # still frozen by Tether
	assert portal.call(apply, []) == (0, 2)
	assert not _rows(sessions, portal)[("solana", SOL_SANCTIONED)].active  # delisted with nothing to restore


def test_scoring_names_sanctioned_wallets_and_holds_exposure(env):  # noqa: F811
	client, tron, who, sessions, portal = env
	_, entries = sanctions.parse_sdn(SAMPLE)

	async def apply():
		async with sessions() as db:
			await indexer.apply_sanctions(db, entries, datetime.now(timezone.utc))
			await db.commit()

	portal.call(apply)
	direct = client.post("/v1/actions/evaluate", json=intent(FROZEN)).json()
	assert direct["recommended_action"] == "reject"
	flag = direct["risk_flags"][0]
	assert flag["code"] == "SANCTIONED_ADDRESS" and "OFAC" in flag["reason"] and "EXAMPLE EXCHANGE" in flag["reason"]
	assert "|prev:" not in flag["reason"]
	exposed = client.post("/v1/actions/evaluate", json=intent(EXPOSED)).json()  # traded with FROZEN
	codes = {f["code"]: f for f in exposed["risk_flags"]}
	assert "SANCTIONS_EXPOSURE" in codes and "EXAMPLE EXCHANGE" in codes["SANCTIONS_EXPOSURE"]["reason"]
	assert "CP_FLAGGED_EXPOSURE" not in codes and exposed["recommended_action"] == "hold"


def test_sync_refreshes_daily_and_refuses_an_empty_list(env, monkeypatch):  # noqa: F811
	client, tron, who, sessions, portal = env
	payload = {"xml": SAMPLE}

	async def fake_fetch(timeout: float = 120.0):
		return payload["xml"]

	monkeypatch.setattr(sanctions, "fetch_sdn", fake_fetch)

	async def sync(force=False):
		async with sessions() as db:
			return await indexer.sync_sanctions(db, force=force)

	assert portal.call(sync) == (3, 0)
	assert portal.call(sync) == (0, 0)  # within the day: skipped
	payload["xml"] = SAMPLE.replace(b"Digital Currency Address", b"Something Else")
	with pytest.raises(ValueError):
		portal.call(sync, True)
	assert _rows(sessions, portal)[("solana", SOL_SANCTIONED)].active  # list kept


def test_seed_loads_the_bundled_snapshot(env):  # noqa: F811
	client, tron, who, sessions, portal = env
	bundled = json.loads(indexer.SANCTIONS_SEED.read_text())["addresses"]

	async def seed():
		async with sessions() as db:
			return await indexer.seed(db)

	portal.call(seed)
	rows = [r for r in _rows(sessions, portal).values() if r.source == "ofac_sdn" and r.active]
	assert len(rows) == len(bundled) > 400
	assert {r.chain for r in rows} == {"tron", "solana", "evm"}
