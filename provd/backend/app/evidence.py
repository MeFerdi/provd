"""Compliance evidence pack: what a platform did to screen its releases over a period, in a form a regulator, a
bank or an auditor can check.

For any period it assembles screening coverage (every release checked, and what was decided), every exception
(holds, rejects, reviews) with its reasons and reported outcome, draft suspicious-transaction reports for the
releases that warrant one, how this evidences each obligation of the chosen framework (FATF by default, or a
jurisdiction profile), and the full set of signed, Bitcoin-anchored decision records. The pack itself is signed,
so any edit is detectable.

Served by GET /v1/evidence (JSON or a printable HTML report) and GET /v1/evidence/records (every record, as JSON
lines). Drafts are drafts: the platform's compliance officer reviews and files them.
"""
from __future__ import annotations

import hashlib
import html
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.compliance_frameworks import DISCLAIMER, MONITORING, RECORDS, REPORTING, SANCTIONS, framework as get_framework
from app.engine.scoring import canonical_json
from app.models.rails import AnchorBatch, Decision, Outcome
from app.proof.signing import ALGORITHM, signer_for
from app.services.sandbox import is_sandbox_account

PACK_VERSION = "provd-evidence-pack/v1"
MAX_PERIOD_DAYS = 400
MAX_EXCEPTIONS = 2000
EXCEPTION_ACTIONS = ("reject", "hold", "manual_review")
FRAUD_OUTCOMES = ("fraud_confirmed", "fake_confirmation")
SANCTION_FLAGS = {"SANCTIONED_ADDRESS", "SANCTIONS_EXPOSURE"}


class PeriodError(ValueError):
	pass


def period(start: date | None, end: date | None, today: date | None = None) -> tuple[datetime, datetime, date, date]:
	"""[start 00:00, day after end 00:00) in UTC. Defaults to the last 30 days, ending today."""
	today = today or datetime.now(timezone.utc).date()
	end = end or today
	start = start or end - timedelta(days=29)
	if start > end:
		raise PeriodError("'from' must be on or before 'to'")
	if (end - start).days + 1 > MAX_PERIOD_DAYS:
		raise PeriodError(f"A pack covers at most {MAX_PERIOD_DAYS} days; request several periods")
	return (
		datetime.combine(start, time.min, tzinfo=timezone.utc),
		datetime.combine(end + timedelta(days=1), time.min, tzinfo=timezone.utc),
		start,
		end,
	)


def _aware(value: datetime) -> datetime:
	return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _flags(decision: Decision) -> list[dict]:
	return list(((decision.record or {}).get("decision") or {}).get("risk_flags") or [])


async def _latest_outcomes(db: AsyncSession, account_id: str, intent_ids: list[str]) -> dict[str, Outcome]:
	latest: dict[str, Outcome] = {}
	for i in range(0, len(intent_ids), 500):
		rows = await db.execute(
			select(Outcome).where(Outcome.account_id == account_id, Outcome.intent_id.in_(intent_ids[i : i + 500]))
		)
		for o in rows.scalars().all():
			if o.intent_id not in latest or _aware(o.occurred_at) > _aware(latest[o.intent_id].occurred_at):
				latest[o.intent_id] = o
	return latest


def _str_draft(d: Decision, flags: list[dict], outcome: Outcome | None, anchor_status: str | None) -> dict:
	critical = [f for f in flags if f.get("severity") == "critical"] or flags
	grounds = " ".join(f.get("reason", "") for f in critical).strip()
	indicators = [f.get("code") for f in flags]
	if outcome and outcome.outcome in FRAUD_OUTCOMES:
		what = {"fraud_confirmed": "fraud", "fake_confirmation": "paid against a fake payment confirmation"}[outcome.outcome]
		grounds = f"The platform later confirmed this transaction as {what}. {grounds}".strip()
		indicators.append(f"OUTCOME_{outcome.outcome.upper()}")
	action = {"reject": "Release refused before the funds left", "hold": "Release held for review"}.get(d.recommended_action, "Released")
	return {
		"draft_id": f"STR-{d.intent_id}",
		"status": "DRAFT: review, complete and file through your financial intelligence unit's channel (e.g. goAML)",
		"report_type": "STR",
		"transaction": {
			"date": _aware(d.created_at).isoformat(),
			"type": d.intent_type,
			"chain": d.chain,
			"asset": d.amount_unit,
			"amount": d.amount,
			"destination_wallet": d.wallet_address,
			"transaction_hash": None,
			"platform_reference": d.idempotency_key or d.intent_id,
		},
		"subject": {"wallet": d.wallet_address, "phone_hash": d.phone_hash, "name": None, "identification": None},
		"grounds_for_suspicion": grounds,
		"indicators": indicators,
		"action_taken": f"{action} (Provd recommended: {d.recommended_action}, score {d.score}).",
		"outcome_reported": outcome.outcome if outcome else None,
		"supporting_evidence": {
			"intent_id": d.intent_id,
			"record_hash": d.record_hash,
			"signature": d.signature,
			"signing_key_id": d.signing_key_id,
			"anchor_status": anchor_status,
			"verify": "https://provd.tech/verify",
		},
		"to_complete": ["reporting entity details", "subject name and identification (from your KYC)", "on-chain transaction hash, if funds moved"],
	}


def _sign(account_id: str, body: dict) -> dict:
	digest = hashlib.sha256(canonical_json(body).encode()).hexdigest()
	key = signer_for(account_id)
	return {"algorithm": ALGORITHM, "sha256": digest, "key_id": key.key_id, "public_key": key.public_key_hex, "value": key.sign(digest)}


async def build_pack(
	db: AsyncSession, account_id: str, start: date | None = None, end: date | None = None, framework: str | None = None,
	now: datetime | None = None,
) -> dict:
	fw = get_framework(framework)
	since, until, first_day, last_day = period(start, end, (now or datetime.now(timezone.utc)).date())
	decisions = (
		await db.execute(
			select(Decision)
			.where(Decision.account_id == account_id, Decision.created_at >= since, Decision.created_at < until)
			.order_by(Decision.created_at, Decision.intent_id)
		)
	).scalars().all()

	batch_ids = {d.batch_id for d in decisions if d.batch_id}
	batches: dict[str, str] = {}
	if batch_ids:
		rows = await db.execute(select(AnchorBatch.id, AnchorBatch.anchor_status).where(AnchorBatch.id.in_(batch_ids)))
		batches = dict(rows.all())

	by_action, by_chain, by_type, flag_counts = Counter(), Counter(), Counter(), Counter()
	volume: dict[str, float] = defaultdict(float)
	signed = anchored = 0
	for d in decisions:
		by_action[d.recommended_action] += 1
		by_chain[d.chain] += 1
		by_type[d.intent_type] += 1
		if d.amount is not None and d.amount_unit:
			volume[d.amount_unit] += d.amount
		signed += bool(d.signature)
		anchored += batches.get(d.batch_id or "") == "anchored"
		for f in _flags(d):
			flag_counts[f.get("code")] += 1

	exceptions_all = [d for d in decisions if d.recommended_action in EXCEPTION_ACTIONS]
	outcomes = await _latest_outcomes(db, account_id, [d.intent_id for d in decisions])
	exceptions = []
	str_drafts = []
	for d in exceptions_all[:MAX_EXCEPTIONS]:
		flags = _flags(d)
		outcome = outcomes.get(d.intent_id)
		exceptions.append({
			"intent_id": d.intent_id,
			"date": _aware(d.created_at).isoformat(),
			"type": d.intent_type,
			"chain": d.chain,
			"wallet": d.wallet_address,
			"amount": d.amount,
			"asset": d.amount_unit,
			"action": d.recommended_action,
			"score": d.score,
			"flags": [{"code": f.get("code"), "severity": f.get("severity"), "reason": f.get("reason")} for f in flags],
			"outcome_reported": outcome.outcome if outcome else None,
			"record_hash": d.record_hash,
		})
	for d in decisions:
		flags = _flags(d)
		outcome = outcomes.get(d.intent_id)
		critical_reject = d.recommended_action == "reject" and any(f.get("severity") == "critical" for f in flags)
		confirmed_fraud = outcome is not None and outcome.outcome in FRAUD_OUTCOMES
		if (critical_reject or confirmed_fraud) and len(str_drafts) < MAX_EXCEPTIONS:
			str_drafts.append(_str_draft(d, flags, outcome, batches.get(d.batch_id or "")))

	sanction_hits = sum(1 for d in decisions if any(f.get("code") in SANCTION_FLAGS for f in _flags(d)))
	ob = fw["obligations"]
	obligations = [
		{"key": SANCTIONS, "title": ob[SANCTIONS][0], "source": ob[SANCTIONS][1],
		 "evidence": f"{len(decisions)} releases screened against the US Treasury OFAC list before release; {sanction_hits} matched a sanctioned wallet or its direct counterparties.",
		 "count": sanction_hits},
		{"key": MONITORING, "title": ob[MONITORING][0], "source": ob[MONITORING][1],
		 "evidence": f"{len(decisions)} releases scored before release; {len(exceptions_all)} held, rejected or sent to review, each with its reasons and reported outcome.",
		 "count": len(exceptions_all)},
		{"key": REPORTING, "title": ob[REPORTING][0], "source": ob[REPORTING][1],
		 "evidence": f"{len(str_drafts)} draft suspicious-transaction reports prepared from the decision records (rejected on critical grounds, or confirmed fraud).",
		 "count": len(str_drafts)},
		{"key": RECORDS, "title": ob[RECORDS][0], "source": ob[RECORDS][1],
		 "evidence": f"{signed} of {len(decisions)} decision records signed; {anchored} already anchored to Bitcoin. Every record is exportable and independently verifiable.",
		 "count": len(decisions)},
	]

	pack = {
		"pack": PACK_VERSION,
		"account_id": account_id,
		"environment": "sandbox" if is_sandbox_account(account_id) else "live",
		"period": {"from": first_day.isoformat(), "to": last_day.isoformat(), "timezone": "UTC"},
		"generated_at": (now or datetime.now(timezone.utc)).replace(microsecond=0).isoformat(),
		"framework": {"name": fw["name"], "disclaimer": DISCLAIMER},
		"coverage": {
			"checks": len(decisions),
			"by_action": dict(by_action),
			"by_chain": dict(by_chain),
			"by_type": dict(by_type),
			"volume_by_asset": {k: round(v, 6) for k, v in sorted(volume.items())},
			"signed": signed,
			"anchored": anchored,
		},
		"top_flags": [{"code": c, "count": n} for c, n in flag_counts.most_common(15)],
		"obligations": obligations,
		"exceptions": exceptions,
		"exceptions_total": len(exceptions_all),
		"str_drafts": str_drafts,
		"records": {
			"count": len(decisions),
			"export": f"/v1/evidence/records?from={first_day.isoformat()}&to={last_day.isoformat()}",
			"verify": "Each record: sha256(canonical JSON of `record`) equals `record_hash`; the signature verifies with the key at "
			"GET /v1/proof/keys; the Merkle proof folds to the batch root, which is timestamped on Bitcoin. Or paste it into https://provd.tech/verify.",
		},
	}
	pack["signature"] = _sign(account_id, pack)
	return pack


async def iter_records(db: AsyncSession, account_id: str, start: date | None, end: date | None) -> AsyncIterator[str]:
	"""Every decision record in the period with its proof, one JSON object per line, oldest first."""
	from app.api.v1.proof import proof_bundle

	since, until, *_ = period(start, end)
	last: tuple | None = None
	while True:
		query = select(Decision).where(Decision.account_id == account_id, Decision.created_at >= since, Decision.created_at < until)
		if last:
			query = query.where((Decision.created_at > last[0]) | ((Decision.created_at == last[0]) & (Decision.intent_id > last[1])))
		page = (await db.execute(query.order_by(Decision.created_at, Decision.intent_id).limit(500))).scalars().all()
		if not page:
			return
		for d in page:
			yield canonical_json(await proof_bundle(db, d)) + "\n"
		last = (page[-1].created_at, page[-1].intent_id)


# --- printable report ----------------------------------------------------------------------------------------

def render_html(pack: dict) -> str:
	e = html.escape
	c = pack["coverage"]
	action = c["by_action"]
	cards = [
		("Releases checked", c["checks"]),
		("Released", action.get("release", 0)),
		("Sent to review", action.get("manual_review", 0)),
		("Held", action.get("hold", 0)),
		("Rejected", action.get("reject", 0)),
		("Draft STRs", len(pack["str_drafts"])),
	]
	cards_html = "".join(f"<div class='card'><div class='n'>{v:,}</div><div>{e(k)}</div></div>" for k, v in cards)
	volume = ", ".join(f"{v:,.2f} {e(k)}" for k, v in c["volume_by_asset"].items()) or "no amounts sent"
	obligations = "".join(
		f"<tr><td>{e(o['title'])}<div class='muted small'>{e(o['source'])}</div></td><td>{e(o['evidence'])}</td></tr>" for o in pack["obligations"]
	)
	exceptions = "".join(
		f"<tr><td>{e(x['date'][:16].replace('T', ' '))}</td><td>{e(x['action'])}</td><td>{x['score']}</td><td>{e(x['chain'])}</td>"
		f"<td class='mono'>{e(x['wallet'] or '')}</td><td>{e(str(x['amount']) + ' ' + (x['asset'] or '') if x['amount'] is not None else '')}</td>"
		f"<td>{'<br>'.join(e(f['reason'] or f['code'] or '') for f in x['flags'])}</td><td>{e(x['outcome_reported'] or '')}</td></tr>"
		for x in pack["exceptions"][:500]
	) or "<tr><td colspan='8'>No holds, rejects or reviews in this period.</td></tr>"
	more = pack["exceptions_total"] - min(len(pack["exceptions"]), 500)
	more_note = f"<p class='muted'>{more:,} more in the JSON pack.</p>" if more > 0 else ""
	drafts = "".join(
		f"<div class='draft'><div class='draft-h'>{e(s['draft_id'])} · {e(s['transaction']['date'][:10])} · {e(s['transaction']['chain'])}</div>"
		f"<dl><dt>Status</dt><dd>{e(s['status'])}</dd><dt>Destination wallet</dt><dd class='mono'>{e(s['transaction']['destination_wallet'] or '')}</dd>"
		f"<dt>Amount</dt><dd>{e(str(s['transaction']['amount']) + ' ' + (s['transaction']['asset'] or '') if s['transaction']['amount'] is not None else 'not sent')}</dd>"
		f"<dt>Grounds for suspicion</dt><dd>{e(s['grounds_for_suspicion'])}</dd><dt>Indicators</dt><dd class='mono'>{e(', '.join(filter(None, s['indicators'])))}</dd>"
		f"<dt>Action taken</dt><dd>{e(s['action_taken'])}</dd><dt>Outcome reported</dt><dd>{e(s['outcome_reported'] or 'none')}</dd>"
		f"<dt>Evidence</dt><dd class='mono'>record {e(s['supporting_evidence']['record_hash'])}</dd>"
		f"<dt>To complete</dt><dd>{e('; '.join(s['to_complete']))}</dd></dl></div>"
		for s in pack["str_drafts"][:200]
	) or "<p>No releases in this period met the criteria for a draft report (rejected on critical grounds, or confirmed fraud).</p>"
	flags = ", ".join(f"{e(f['code'])} ({f['count']})" for f in pack["top_flags"]) or "none"
	sig = pack["signature"]
	sandbox = "<p class='warn'>Sandbox data: test wallets, not real activity.</p>" if pack["environment"] == "sandbox" else ""
	return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Provd evidence pack {e(pack['period']['from'])} to {e(pack['period']['to'])}</title>
<style>
body{{font:14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;margin:32px auto;max-width:1100px;padding:0 24px}}
h1{{font:600 28px Georgia,serif;margin:0 0 4px}} h2{{font:600 19px Georgia,serif;margin:32px 0 8px}}
.muted{{color:#555}} .small{{font-size:12px}} .mono{{font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-all}}
.cards{{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}} .card{{border:1px solid #ddd;border-radius:6px;padding:10px 14px;min-width:130px}} .card .n{{font:600 24px Georgia,serif}}
table{{border-collapse:collapse;width:100%;margin-top:8px}} th,td{{border-bottom:1px solid #e5e5e5;padding:6px 8px;text-align:left;vertical-align:top}} th{{background:#f6f6f4;font-weight:600}}
.draft{{border:1px solid #ddd;border-radius:6px;padding:12px 16px;margin:10px 0;break-inside:avoid}} .draft-h{{font-weight:600;margin-bottom:6px}}
dl{{display:grid;grid-template-columns:200px 1fr;gap:4px 12px;margin:0}} dt{{color:#555}} dd{{margin:0}}
.note{{background:#f6f6f4;border-radius:6px;padding:10px 14px;font-size:12px;color:#444}} .warn{{background:#fffaeb;border:1px solid #fedf89;border-radius:6px;padding:8px 12px}}
@media print{{body{{margin:0}} tr{{break-inside:avoid}}}}
</style></head><body>
<p class="muted">Provd compliance evidence pack · Confidential</p>
<h1>Screening evidence, {e(pack['period']['from'])} to {e(pack['period']['to'])}</h1>
<p class="muted">Account {e(pack['account_id'])} · generated {e(pack['generated_at'])} · framework: {e(pack['framework']['name'])}</p>
{sandbox}
<h2>Coverage</h2>
<div class="cards">{cards_html}</div>
<p>Volume checked: {volume}. Chains: {e(', '.join(f'{k} ({v:,})' for k, v in c['by_chain'].items()) or 'none')}. Most frequent flags: {flags}.</p>

<h2>How this evidences each obligation</h2>
<table><thead><tr><th>Obligation</th><th>Evidence in this pack</th></tr></thead><tbody>{obligations}</tbody></table>
<p class="note">{e(pack['framework']['disclaimer'])}</p>

<h2>Exceptions: holds, rejects and reviews ({pack['exceptions_total']:,})</h2>
<table><thead><tr><th>Date (UTC)</th><th>Action</th><th>Score</th><th>Chain</th><th>Wallet</th><th>Amount</th><th>Reasons</th><th>Outcome</th></tr></thead><tbody>{exceptions}</tbody></table>
{more_note}

<h2>Draft suspicious-transaction reports ({len(pack['str_drafts']):,})</h2>
{drafts}

<h2>Records and verification</h2>
<p>{pack['records']['count']:,} decision records in this period ({c['signed']:,} signed, {c['anchored']:,} anchored to Bitcoin so far). Download them all from
<span class="mono">{e(pack['records']['export'])}</span>. {e(pack['records']['verify'])}</p>

<h2>Integrity</h2>
<p>This pack is signed by Provd key <span class="mono">{e(sig['key_id'])}</span> ({e(sig['algorithm'])}). SHA-256 of the pack (canonical JSON, without
<span class="mono">signature</span>): <span class="mono">{e(sig['sha256'])}</span>. Signature: <span class="mono small">{e(sig['value'])}</span>. Public keys: https://api.provd.tech/v1/proof/keys.</p>
</body></html>"""
