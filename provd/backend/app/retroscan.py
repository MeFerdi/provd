"""Licence-readiness retro-scan: what a platform's past payouts would have looked like through Provd.

A ramp or OTC desk exports its payouts (or counterparties) for a period, say the last 90 days. The scan reports
which of those wallets were sanctioned or frozen, which traded with sanctioned or frozen wallets, which payees
imitate other payees (address poisoning), and which payments were unusually large. Each finding is mapped to the
obligation it relates to under Kenya's VASP regime. It's run by Provd on a prospect's data, privately: the input
and the report never leave the machine it runs on.

    python -m app.retroscan payouts.csv --client "Acme Ramp" --out reports/acme
    python -m app.retroscan payouts.csv --client "Acme Ramp" --out reports/acme --refresh   # update risk lists first

CSV: a header row and an address column (`address`, `wallet`, `destination`, `to` or `recipient`). Optional columns:
`chain` (tron | solana; detected when missing), `amount`, `currency` (or `asset`), `date`, `reference` (or `id`).

The report is signed with DECISION_SIGNING_KEY when it's set (use the production key, so the signature verifies
against GET /v1/proof/keys); otherwise it's marked as an unsigned draft.
"""
from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import html
import json
import statistics
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy import func, select

from app.adapters.base import InvalidAddress
from app.adapters.solana import validate_solana_address
from app.config import get_settings
from app.db.postgres import get_session_factory
from app.engine.lookalike import FIXED_PREFIX, find_lookalikes
from app.engine.scoring import canonical_json, engine_config, evaluate
from app.engine.signals import SOURCE_NAMES
from app.models.rails import Checkpoint, FlaggedAddress
from app.schemas.actions import ActionIntent
from app.services import chain_data
from app.services.evaluate import IntentRejected, build_context

MAX_ROWS = 20_000
ADDRESS_COLUMNS = ("address", "wallet", "destination", "to", "recipient", "wallet_address")
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
# Flags from the full engine that are worth a line in the report (the rest are routine or need the platform's own history).
DEEP_FLAGS = {
	"SANCTIONED_ADDRESS", "SANCTIONS_EXPOSURE", "CP_ADDRESS_FROZEN", "CP_FLAGGED_EXPOSURE",
	"CP_INCIDENTAL_EXPOSURE", "DUST_SENDER", "RAPID_PASS_THROUGH",
}

# What each kind of finding relates to. Summaries of published legal commentary, not legal advice.
OBLIGATIONS = {
	"sanctions": (
		"Sanctions and targeted financial sanctions screening",
		"VASP Regulations 2026 (LN 134/2026), AML/CFT duties; revised targeted financial sanctions rules (Sep 2026): "
		"freeze within hours, report within 24 hours.",
	),
	"monitoring": (
		"Transaction monitoring and suspicious-transaction escalation",
		"VASP Regulations 2026 (LN 134/2026); Proceeds of Crime and Anti-Money Laundering Act s.44 (suspicious "
		"transaction reports to the Financial Reporting Centre).",
	),
	"records": (
		"Record all platform activity and keep records for 7 years",
		"VASP Regulations 2026 (LN 134/2026).",
	),
}


@dataclass
class Payee:
	chain: str
	address: str
	payments: int = 0
	totals: dict[str, Decimal] = field(default_factory=lambda: defaultdict(Decimal))
	first: str | None = None
	last: str | None = None
	references: list[str] = field(default_factory=list)

	def weight(self) -> Decimal:
		return sum(self.totals.values(), Decimal(0))


@dataclass
class Finding:
	kind: str  # sanctioned | frozen | exposure | lookalike | dust | pass_through | amount
	severity: str
	chain: str
	address: str
	detail: str
	obligation: str
	related: str | None = None

	def row(self) -> dict:
		return {k: getattr(self, k) for k in ("severity", "kind", "chain", "address", "related", "detail", "obligation")}


# --- input -------------------------------------------------------------------------------------------------

def detect_chain(address: str) -> str | None:
	if address.startswith("T") and len(address) == 34:
		return "tron"
	try:
		validate_solana_address(address)
		return "solana"
	except ValueError:
		return None


def read_payouts(path: Path) -> tuple[dict[tuple[str, str], Payee], list[dict], list[str]]:
	"""Payees keyed by (chain, address), the individual payments with amounts, and rejected rows."""
	payees: dict[tuple[str, str], Payee] = {}
	payments: list[dict] = []
	rejected: list[str] = []
	with path.open(newline="", encoding="utf-8-sig") as handle:
		reader = csv.DictReader(handle)
		columns = {c.strip().lower(): c for c in (reader.fieldnames or [])}
		addr_col = next((columns[c] for c in ADDRESS_COLUMNS if c in columns), None)
		if addr_col is None:
			raise SystemExit(f"No address column found. Expected one of: {', '.join(ADDRESS_COLUMNS)}")
		get = lambda row, *names: next((row[columns[n]].strip() for n in names if n in columns and row[columns[n]]), "")  # noqa: E731
		for line, row in enumerate(reader, start=2):
			if line - 1 > MAX_ROWS:
				raise SystemExit(f"More than {MAX_ROWS} rows; split the file.")
			address = (row.get(addr_col) or "").strip()
			if not address:
				continue
			chain = get(row, "chain").lower() or detect_chain(address)
			if chain not in ("tron", "solana"):
				rejected.append(f"line {line}: {address[:12]}… is not a Tron or Solana address")
				continue
			try:
				address = chain_data.adapter_for(chain).validate_address(address)
			except (InvalidAddress, ValueError) as exc:
				rejected.append(f"line {line}: {exc}")
				continue
			payee = payees.setdefault((chain, address), Payee(chain, address))
			payee.payments += 1
			date, ref = get(row, "date", "timestamp", "created_at"), get(row, "reference", "id", "ref")
			if date:
				payee.first = min(filter(None, [payee.first, date]))
				payee.last = max(filter(None, [payee.last, date]))
			if ref and len(payee.references) < 5:
				payee.references.append(ref)
			raw_amount = get(row, "amount", "value")
			if raw_amount:
				try:
					amount = Decimal(raw_amount.replace(",", ""))
				except InvalidOperation:
					rejected.append(f"line {line}: amount {raw_amount!r} isn't a number")
					continue
				currency = (get(row, "currency", "asset", "token") or "UNITS").upper()
				payee.totals[currency] += amount
				payments.append({"chain": chain, "address": address, "amount": amount, "currency": currency, "date": date, "reference": ref})
	return payees, payments, rejected


# --- checks ------------------------------------------------------------------------------------------------

async def list_hits(payees: dict[tuple[str, str], Payee]) -> list[Finding]:
	"""Payees that are themselves on a sanctions or issuer-freeze list."""
	findings = []
	async with get_session_factory()() as db:
		for chain in ("tron", "solana"):
			addresses = {a for (c, a) in payees if c == chain}
			flags = await chain_data.public_flags(db, chain, addresses)
			sanctioned = {a for a, s in flags.items() if s == "ofac_sdn"}
			references = await chain_data.flag_references(db, chain, sanctioned)
			for address, source in sorted(flags.items()):
				if source == "ofac_sdn":
					listed = f" Listed entity: {references[address]}." if references.get(address) else ""
					findings.append(Finding("sanctioned", "critical", chain, address, f"On the {SOURCE_NAMES[source]}.{listed}", "sanctions"))
				else:
					findings.append(Finding("frozen", "critical", chain, address, f"Wallet is {SOURCE_NAMES.get(source, source)}.", "monitoring"))
	return findings


def lookalike_pairs(payees: dict[tuple[str, str], Payee]) -> list[Finding]:
	"""Payees that start and end like another payee: the signature of address poisoning."""
	findings, seen = [], set()
	for chain in ("tron", "solana"):
		skip = FIXED_PREFIX.get(chain, 0)
		buckets: dict[tuple[str, str], list[str]] = defaultdict(list)
		for (c, address) in payees:
			if c == chain:
				buckets[(address[skip:skip + 3], address[-3:])].append(address)
		for group in buckets.values():
			for address in group:
				for match in find_lookalikes(address, group, chain):
					pair = tuple(sorted((address, match.known)))
					if pair in seen:
						continue
					seen.add(pair)
					a, b = payees[(chain, address)], payees[(chain, match.known)]
					# The payee paid less often is the likelier impostor.
					suspect, real = (a, b) if a.payments <= b.payments else (b, a)
					severity = "critical" if match.prefix >= 4 and match.suffix >= 4 else "high"
					findings.append(Finding(
						"lookalike", severity, chain, suspect.address,
						f"Shares its first {match.prefix + skip} and last {match.suffix} characters with another payee "
						f"({suspect.payments} vs {real.payments} payments). One of them is probably a poisoning lookalike.",
						"monitoring", related=real.address,
					))
	return findings


async def deep_scan(payees: list[Payee], concurrency: int) -> tuple[list[Finding], int, list[str]]:
	"""Full engine on the chosen payees: exposure to sanctioned/frozen wallets, dust bots, pass-through."""
	findings: list[Finding] = []
	errors: list[str] = []
	done = 0
	gate = asyncio.Semaphore(concurrency)
	sessions = get_session_factory()

	async def one(payee: Payee) -> None:
		nonlocal done
		async with gate, sessions() as db:
			intent = ActionIntent(chain=payee.chain, intent_type="payout", counterparty={"wallet_address": payee.address})
			try:
				ctx = await build_context(db, None, intent, datetime.now(timezone.utc))
				await db.commit()
			except IntentRejected as exc:
				errors.append(f"{payee.address}: {exc}")
				return
			except Exception as exc:  # noqa: BLE001 - one bad lookup must not stop the scan
				errors.append(f"{payee.address}: chain data unavailable ({type(exc).__name__})")
				return
			evaluation = evaluate(ctx)
			done += 1
			for flag in evaluation.flags:
				if flag.code not in DEEP_FLAGS:
					continue
				kind = {
					"SANCTIONED_ADDRESS": "sanctioned", "SANCTIONS_EXPOSURE": "exposure", "CP_ADDRESS_FROZEN": "frozen",
					"CP_FLAGGED_EXPOSURE": "exposure", "CP_INCIDENTAL_EXPOSURE": "exposure", "DUST_SENDER": "dust",
					"RAPID_PASS_THROUGH": "pass_through",
				}[flag.code]
				obligation = "sanctions" if flag.code.startswith("SANCTION") else "monitoring"
				findings.append(Finding(kind, flag.severity, payee.chain, payee.address, flag.reason, obligation))

	await asyncio.gather(*(one(p) for p in payees))
	return findings, done, errors


def amount_outliers(payments: list[dict]) -> list[Finding]:
	"""Payments far above what's normal for this file, per currency (needs 20+ payments in that currency)."""
	findings = []
	by_currency: dict[str, list[dict]] = defaultdict(list)
	for p in payments:
		by_currency[p["currency"]].append(p)
	for currency, rows in by_currency.items():
		if len(rows) < 20:
			continue
		amounts = sorted(float(r["amount"]) for r in rows)
		median = statistics.median(amounts)
		p99 = amounts[min(len(amounts) - 1, int(len(amounts) * 0.99))]
		threshold = max(p99, median * 10)
		for r in rows:
			if float(r["amount"]) >= threshold and float(r["amount"]) > median:
				when = f" on {r['date']}" if r["date"] else ""
				findings.append(Finding(
					"amount", "medium", r["chain"], r["address"],
					f"Payment of {r['amount']} {currency}{when} is {float(r['amount']) / median:.0f}x the median payment in this file ({median:g} {currency}).",
					"monitoring", related=r["reference"] or None,
				))
	return findings


async def list_freshness() -> dict:
	async with get_session_factory()() as db:
		counts = dict((await db.execute(
			select(FlaggedAddress.source, func.count()).where(FlaggedAddress.active.is_(True)).group_by(FlaggedAddress.source)
		)).all())
		checkpoints = {c.name: c for c in (await db.execute(select(Checkpoint))).scalars().all()}
	return {
		"addresses_by_list": {SOURCE_NAMES.get(k, k): v for k, v in sorted(counts.items())},
		"sanctions_list_updated": _freshness(checkpoints.get("ofac:sdn")),
		"tron_freezes_updated": _freshness(checkpoints.get("tron:usdt_freeze_events")),
		"solana_freezes_updated": _freshness(checkpoints.get("solana:stablecoin_frozen_snapshot")),
	}


def _freshness(cp: Checkpoint | None) -> str | None:
	"""When a list was last synced from its source; a seeded checkpoint has no cursor yet."""
	if cp is None:
		return None
	if not cp.cursor:
		return "bundled snapshot (run with --refresh to update from the source)"
	return cp.updated_at.replace(microsecond=0).isoformat()


# --- report ------------------------------------------------------------------------------------------------

def dedupe(findings: list[Finding]) -> list[Finding]:
	best: dict[tuple, Finding] = {}
	for f in findings:
		key = (f.kind if f.kind not in ("sanctioned", "frozen") else "listed", f.chain, f.address, f.related if f.kind in ("lookalike", "amount") else None)
		if key not in best or SEVERITY_ORDER[f.severity] < SEVERITY_ORDER[best[key].severity]:
			best[key] = f
	return sorted(best.values(), key=lambda f: (SEVERITY_ORDER[f.severity], f.kind, f.address))


def sign(summary: dict) -> dict:
	settings = get_settings()
	digest = hashlib.sha256(canonical_json(summary).encode()).hexdigest()
	if not settings.decision_signing_key:
		return {"status": "unsigned draft", "sha256": digest}
	from app.proof.signing import ALGORITHM, signer

	key = signer()
	return {"status": "signed", "sha256": digest, "algorithm": ALGORITHM, "key_id": key.key_id, "public_key": key.public_key_hex, "signature": key.sign(digest)}


KIND_LABEL = {
	"sanctioned": "Sanctioned wallet", "frozen": "Frozen by the issuer", "exposure": "Exposure to sanctioned or frozen wallets",
	"lookalike": "Lookalike payee (address poisoning)", "dust": "Behaves like a poisoning bot", "pass_through": "Funds passed straight through",
	"amount": "Unusual amount",
}


def render_html(client: str, summary: dict, findings: list[Finding], signature: dict) -> str:
	e = html.escape
	s = summary
	rows = "".join(
		f"<tr class='sev-{f.severity}'><td>{e(f.severity)}</td><td>{e(KIND_LABEL[f.kind])}</td><td>{e(f.chain)}</td>"
		f"<td class='mono'>{e(f.address)}</td><td>{e(f.detail)}{(' Related: <span class=mono>' + e(f.related) + '</span>') if f.related else ''}</td>"
		f"<td>{e(OBLIGATIONS[f.obligation][0])}</td></tr>"
		for f in findings
	) or "<tr><td colspan='6'>No findings.</td></tr>"
	counts = "".join(f"<div class='card'><div class='n'>{v}</div><div>{e(k)}</div></div>" for k, v in s["findings_by_kind"].items()) or "<div class='card'><div class='n'>0</div><div>findings</div></div>"
	obligations = "".join(
		f"<tr><td>{e(title)}</td><td>{e(source)}</td><td>"
		f"{'Covered going forward: a signed record for every check' if key == 'records' else s['findings_by_obligation'].get(key, 0)}</td></tr>"
		for key, (title, source) in OBLIGATIONS.items()
	)
	lists = "".join(f"<li>{e(k)}: {v:,} addresses</li>" for k, v in s["lists"]["addresses_by_list"].items())
	sig = (
		f"<p>Signed by Provd key <span class='mono'>{e(signature['key_id'])}</span> ({e(signature['algorithm'])}).<br>"
		f"SHA-256 of <span class='mono'>summary.json</span>: <span class='mono'>{e(signature['sha256'])}</span><br>"
		f"Signature: <span class='mono small'>{e(signature['signature'])}</span><br>"
		"Verify with the public key published at https://api.provd.tech/v1/proof/keys.</p>"
		if signature["status"] == "signed"
		else f"<p><strong>Unsigned draft.</strong> SHA-256 of summary.json: <span class='mono'>{e(signature['sha256'])}</span></p>"
	)
	return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Provd retro-scan: {e(client)}</title>
<style>
body{{font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;margin:32px auto;max-width:1100px;padding:0 24px}}
h1{{font:600 28px Georgia,serif;margin:0 0 4px}} h2{{font:600 19px Georgia,serif;margin:32px 0 8px}}
.muted{{color:#555}} .mono{{font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-all}} .small{{font-size:10px}}
.cards{{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}} .card{{border:1px solid #ddd;border-radius:6px;padding:10px 14px;min-width:150px}}
.card .n{{font:600 24px Georgia,serif}}
table{{border-collapse:collapse;width:100%;margin-top:8px}} th,td{{border-bottom:1px solid #e5e5e5;padding:6px 8px;text-align:left;vertical-align:top}}
th{{background:#f6f6f4;font-weight:600}} .sev-critical td:first-child{{color:#b42318;font-weight:600}} .sev-high td:first-child{{color:#b54708;font-weight:600}}
.note{{background:#f6f6f4;border-radius:6px;padding:10px 14px;font-size:12px;color:#444}}
@media print{{body{{margin:0}} tr{{break-inside:avoid}}}}
</style></head><body>
<p class="muted">Provd licence-readiness retro-scan · Confidential</p>
<h1>{e(client)}</h1>
<p class="muted">Generated {e(s['generated_at'])} · {s['payees']} payees from {s['payments']} rows ({e(s['input_file'])}) · engine {e(s['engine_version'])}</p>

<h2>Summary</h2>
<div class="cards">{counts}</div>
<p>{s['payees_scored']} of {s['payees']} payees had their on-chain counterparties analysed (the highest-value first);
every payee was checked against the sanctions and issuer-freeze lists, and against every other payee for lookalikes.</p>

<h2>Findings</h2>
<table><thead><tr><th>Severity</th><th>Finding</th><th>Chain</th><th>Address</th><th>Detail</th><th>Relates to</th></tr></thead><tbody>{rows}</tbody></table>

<h2>What the findings relate to</h2>
<table><thead><tr><th>Obligation</th><th>Source</th><th>Findings</th></tr></thead><tbody>{obligations}</tbody></table>
<p class="note">How Provd covers these going forward: every payout is checked before release and gets a signed decision record
(kept for 7 years, verifiable by anyone), with exports for suspicious-transaction reporting. Summaries of published legal
commentary, not legal advice: confirm your obligations with your advisers.</p>

<h2>Method and data</h2>
<ul>
<li>Risk lists used, as of the scan: <ul>{lists}</ul>
Sanctions list updated {e(s['lists']['sanctions_list_updated'] or 'unknown')}; Tron freezes {e(s['lists']['tron_freezes_updated'] or 'unknown')}; Solana freezes {e(s['lists']['solana_freezes_updated'] or 'unknown')}.</li>
<li>Exposure: each analysed wallet's recent USDT/USDC transfers and direct counterparties, from public blockchain data.</li>
<li>Lookalikes: payees sharing at least 3 leading and 3 trailing characters with another payee (Tron's fixed leading "T" excluded).</li>
<li>Amounts: payments at or above the 99th percentile and at least 10x the median for their currency (20+ payments needed).</li>
<li>Not covered here: Kenya's domestic targeted-sanctions list, the platform's own fraud and reversal history, SIM-swap signals.</li>
<li>Rows skipped: {s['rows_rejected']}. Payees not analysed because chain data was unavailable: {s['scan_errors']}.</li>
</ul>

<h2>Integrity</h2>
{sig}
</body></html>"""


async def run(args: argparse.Namespace) -> None:
	src = Path(args.csv)
	payees, payments, rejected = read_payouts(src)
	if not payees:
		raise SystemExit("No valid Tron or Solana addresses in the file.")
	if args.refresh:
		from app.indexer import run_pass, seed

		async with get_session_factory()() as db:
			await seed(db)
		await run_pass()
	print(f"{len(payees)} payees from {sum(p.payments for p in payees.values())} rows; {len(rejected)} rows skipped", file=sys.stderr)

	findings = await list_hits(payees)
	findings += lookalike_pairs(payees)
	ranked = sorted(payees.values(), key=lambda p: (p.weight(), p.payments), reverse=True)[: args.deep]
	deep, scored, errors = await deep_scan(ranked, args.concurrency)
	findings += deep
	findings += amount_outliers(payments)
	findings = dedupe(findings)

	by_kind: dict[str, int] = defaultdict(int)
	by_obligation: dict[str, int] = defaultdict(int)
	for f in findings:
		by_kind[KIND_LABEL[f.kind]] += 1
		by_obligation[f.obligation] += 1
	summary = {
		"client": args.client,
		"generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
		"engine_version": engine_config()["engine_version"],
		"input_file": src.name,
		"input_sha256": hashlib.sha256(src.read_bytes()).hexdigest(),
		"payments": sum(p.payments for p in payees.values()),
		"payees": len(payees),
		"payees_scored": scored,
		"rows_rejected": len(rejected),
		"scan_errors": len(errors),
		"lists": await list_freshness(),
		"findings_by_kind": dict(by_kind),
		"findings_by_obligation": dict(by_obligation),
		"findings": [f.row() for f in findings],
	}
	signature = sign(summary)

	out = Path(args.out)
	out.mkdir(parents=True, exist_ok=True)
	(out / "summary.json").write_text(canonical_json(summary))
	(out / "signature.json").write_text(json.dumps(signature, indent=1))
	with (out / "findings.csv").open("w", newline="", encoding="utf-8") as handle:
		writer = csv.DictWriter(handle, fieldnames=["severity", "kind", "chain", "address", "related", "detail", "obligation"])
		writer.writeheader()
		writer.writerows(f.row() for f in findings)
	(out / "report.html").write_text(render_html(args.client, summary, findings, signature), encoding="utf-8")
	if rejected or errors:
		(out / "skipped.txt").write_text("\n".join(rejected + errors) + "\n")
	print(f"{len(findings)} findings; report: {out / 'report.html'} ({signature['status']})", file=sys.stderr)


def main() -> None:
	parser = argparse.ArgumentParser(prog="python -m app.retroscan", description=__doc__.split("\n\n")[0])
	parser.add_argument("csv", help="Payouts or counterparties, one address per row")
	parser.add_argument("--client", required=True, help="Name shown on the report")
	parser.add_argument("--out", required=True, help="Directory for report.html, findings.csv, summary.json, signature.json")
	parser.add_argument("--deep", type=int, default=300, help="How many payees get full on-chain analysis, highest value first (default 300)")
	parser.add_argument("--concurrency", type=int, default=4, help="Parallel chain lookups (default 4)")
	parser.add_argument("--refresh", action="store_true", help="Update the sanctions and freeze lists before scanning")
	asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
	main()
