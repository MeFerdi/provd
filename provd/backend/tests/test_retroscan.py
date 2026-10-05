"""The licence-readiness retro-scan: list hits, exposure, lookalike payees and amount outliers, end to end."""
import argparse
import asyncio
import csv
import json
from datetime import datetime, timezone

import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.retroscan as retroscan
from app.models.rails import FlaggedAddress
from app.services import chain_data, sandbox
from tests.test_rails_api import CLEAN, EXPOSED, FROZEN, TABLES, FakeTron

LOOK_REAL, LOOK_FAKE = sandbox.WALLETS["tron"]["clean"], sandbox.WALLETS["tron"]["lookalike"]  # share 4+4 characters
SANCTIONED = "TT5WntFnuqoDtafg2C7Sbx2q7xmZEZyK1y"  # a valid address we put on the OFAC list below


@pytest.fixture()
def db(monkeypatch):
	engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

	@event.listens_for(engine.sync_engine, "connect")
	def _fns(conn, _):
		conn.create_function("char_length", 1, lambda v: None if v is None else len(v))

	sessions = async_sessionmaker(engine, expire_on_commit=False)

	async def setup():
		async with engine.begin() as conn:
			await conn.run_sync(lambda s: [t.__table__.create(s) for t in TABLES])
		async with sessions() as s:
			now = datetime.now(timezone.utc)
			s.add(FlaggedAddress(chain="tron", address=FROZEN, source="tether_usdt_freeze", flagged_at=now, active=True))
			s.add(FlaggedAddress(chain="tron", address=SANCTIONED, source="ofac_sdn", reference="EXAMPLE ENTITY", flagged_at=now, active=True))
			await s.commit()

	monkeypatch.setattr(retroscan, "get_session_factory", lambda: sessions)
	chain_data.set_adapter("tron", FakeTron())

	def scan(**kw):
		# aiosqlite connections belong to one event loop: set up and scan in the same one.
		async def go():
			await setup()
			await retroscan.run(argparse.Namespace(deep=50, concurrency=2, refresh=False, **kw))
			await engine.dispose()

		asyncio.run(go())

	yield scan
	chain_data.set_adapter("tron", None)


def _write(path, rows):
	with path.open("w", newline="") as h:
		w = csv.DictWriter(h, fieldnames=["Wallet", "amount", "currency", "date", "reference"])
		w.writeheader()
		w.writerows(rows)


def test_full_scan_finds_every_kind_and_maps_it(tmp_path, db, monkeypatch):
	rows = [{"Wallet": CLEAN, "amount": "100", "currency": "USDT", "date": f"2026-09-{d:02d}", "reference": f"p{d}"} for d in range(1, 26)]
	rows += [
		{"Wallet": FROZEN, "amount": "120", "currency": "USDT", "date": "2026-09-02", "reference": "f1"},
		{"Wallet": SANCTIONED, "amount": "90", "currency": "USDT", "date": "2026-09-03", "reference": "s1"},
		{"Wallet": EXPOSED, "amount": "110", "currency": "USDT", "date": "2026-09-04", "reference": "e1"},
		{"Wallet": LOOK_REAL, "amount": "100", "currency": "USDT", "date": "2026-09-05", "reference": "r1"},
		{"Wallet": LOOK_REAL, "amount": "100", "currency": "USDT", "date": "2026-09-06", "reference": "r2"},
		{"Wallet": LOOK_FAKE, "amount": "100", "currency": "USDT", "date": "2026-09-07", "reference": "x1"},
		{"Wallet": CLEAN, "amount": "50000", "currency": "USDT", "date": "2026-09-28", "reference": "big"},
		{"Wallet": "not-an-address", "amount": "1", "currency": "USDT", "date": "", "reference": ""},
	]
	src, out = tmp_path / "payouts.csv", tmp_path / "report"
	_write(src, rows)
	monkeypatch.setattr(retroscan.get_settings(), "decision_signing_key", "")
	db(csv=str(src), client="Acme Ramp", out=str(out))

	summary = json.loads((out / "summary.json").read_text())
	found = {(f["kind"], f["address"]) for f in summary["findings"]}
	assert ("frozen", FROZEN) in found
	assert ("sanctioned", SANCTIONED) in found
	assert ("exposure", EXPOSED) in found  # traded with the frozen wallet
	assert ("lookalike", LOOK_FAKE) in found  # the less-paid twin is the suspect
	assert any(k == "amount" and a == CLEAN for k, a in found)
	sanctioned = next(f for f in summary["findings"] if f["kind"] == "sanctioned")
	assert "EXAMPLE ENTITY" in sanctioned["detail"] and sanctioned["obligation"] == "sanctions"
	assert summary["rows_rejected"] == 1 and summary["payees"] == 6
	assert summary["findings"][0]["severity"] == "critical"  # most severe first
	assert json.loads((out / "signature.json").read_text())["status"] == "unsigned draft"
	report = (out / "report.html").read_text()
	assert "Acme Ramp" in report and "Transaction monitoring" in report and "<script" not in report
	assert len(list(csv.DictReader((out / "findings.csv").open()))) == len(summary["findings"])


def test_report_is_signed_with_the_decision_key(tmp_path, db, monkeypatch):
	from app.proof.signing import signer, verify

	monkeypatch.setattr(retroscan.get_settings(), "decision_signing_key", "11" * 32)
	signer.cache_clear()
	src, out = tmp_path / "p.csv", tmp_path / "r"
	_write(src, [{"Wallet": FROZEN, "amount": "1", "currency": "USDT", "date": "", "reference": ""}])
	try:
		db(csv=str(src), client="X", out=str(out))
		sig = json.loads((out / "signature.json").read_text())
		import hashlib

		assert sig["status"] == "signed"
		assert hashlib.sha256((out / "summary.json").read_bytes()).hexdigest() == sig["sha256"]
		assert verify(sig["public_key"], sig["sha256"], sig["signature"])
	finally:
		signer.cache_clear()


def test_payee_names_and_details_are_escaped_in_the_report():
	summary = {
		"generated_at": "t", "payees": 1, "payments": 1, "input_file": "<b>.csv", "engine_version": "v", "payees_scored": 0,
		"findings_by_kind": {}, "findings_by_obligation": {}, "rows_rejected": 0, "scan_errors": 0,
		"lists": {"addresses_by_list": {}, "sanctions_list_updated": None, "tron_freezes_updated": None, "solana_freezes_updated": None},
	}
	finding = retroscan.Finding("amount", "medium", "tron", "T<script>", "<img src=x onerror=alert(1)>", "monitoring", related="<i>")
	page = retroscan.render_html("<script>alert(1)</script>", summary, [finding], {"status": "unsigned draft", "sha256": "0"})
	assert "<script>" not in page and "<img" not in page and "&lt;script&gt;" in page


def test_input_without_an_address_column_is_refused(tmp_path):
	src = tmp_path / "bad.csv"
	src.write_text("name,amount\nx,1\n")
	with pytest.raises(SystemExit, match="No address column"):
		retroscan.read_payouts(src)
