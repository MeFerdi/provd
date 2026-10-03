"""Compare two postures of the same contract and describe what changed.

These are the alerts: a verifier removed, an admin swapped, a new route opened. They are separate
from the grade, which only describes the current state.
"""
from datetime import datetime, timezone

from app.schemas.posture import AdminAccount, ChangeEvent, Pathway, Posture, UlnSide


def _side_summary(side: UlnSide | None) -> dict | None:
	if side is None:
		return None
	return {
		"effective_verifiers": side.effective_verifiers,
		"required": [v.name or v.address for v in side.required_dvns],
		"optional": [v.name or v.address for v in side.optional_dvns],
		"optional_threshold": side.optional_threshold,
		"confirmations": side.confirmations,
		"library": side.library,
	}


def _account_summary(account: AdminAccount | None) -> dict | None:
	return None if account is None else account.model_dump()


def _label(p: Pathway) -> str:
	return f"{p.chain_name or 'eid'} ({p.eid})"


def fingerprint(posture: Posture) -> dict:
	"""The security-relevant state, used to decide whether anything changed between two reads."""
	return {
		"owner": _account_summary(posture.admin.owner),
		"delegate": _account_summary(posture.admin.delegate),
		"pathways": {
			str(p.eid): {"peer": p.peer, "receive": _side_summary(p.receive), "send": _side_summary(p.send)}
			for p in sorted(posture.pathways, key=lambda p: p.eid)
		},
	}


def diff(previous: Posture, current: Posture, now: datetime | None = None) -> list[ChangeEvent]:
	now = now or datetime.now(timezone.utc)
	events: list[ChangeEvent] = []
	before = {p.eid: p for p in previous.pathways}
	after = {p.eid: p for p in current.pathways}

	for eid in sorted(after.keys() - before.keys()):
		p = after[eid]
		weak = p.receive is not None and p.receive.effective_verifiers <= 1
		events.append(
			ChangeEvent(
				detected_at=now,
				kind="CHG-NEW-ROUTE",
				severity="critical" if weak else "info",
				summary=f"New route opened: {_label(p)}"
				+ (" — accepts messages from a single verifier" if weak else ""),
				pathway=eid,
				after=_side_summary(p.receive),
			)
		)
	for eid in sorted(before.keys() - after.keys()):
		events.append(
			ChangeEvent(detected_at=now, kind="CHG-ROUTE-REMOVED", severity="info", summary=f"Route closed: {_label(before[eid])}", pathway=eid)
		)
	for eid in sorted(before.keys() & after.keys()):
		old, new = _side_summary(before[eid].receive), _side_summary(after[eid].receive)
		if old == new or old is None or new is None:
			continue
		if new["effective_verifiers"] < old["effective_verifiers"]:
			kind, severity = "CHG-VERIFIER-REDUCED", "critical"
			summary = f"Verifiers reduced on {_label(after[eid])}: {old['effective_verifiers']} → {new['effective_verifiers']}"
		elif new["required"] != old["required"] or new["optional"] != old["optional"]:
			kind, severity = "CHG-VERIFIER-CHANGED", "medium"
			summary = f"Verifier set changed on {_label(after[eid])}"
		else:
			kind, severity = "CHG-CONFIG-CHANGED", "low"
			summary = f"Route configuration changed on {_label(after[eid])}"
		events.append(ChangeEvent(detected_at=now, kind=kind, severity=severity, summary=summary, pathway=eid, before=old, after=new))

	for role, old, new in (
		("Owner", previous.admin.owner, current.admin.owner),
		("Delegate", previous.admin.delegate, current.admin.delegate),
	):
		if _account_summary(old) != _account_summary(new):
			events.append(
				ChangeEvent(
					detected_at=now,
					kind="CHG-ADMIN-CHANGED",
					severity="high",
					summary=f"{role} changed",
					before=_account_summary(old),
					after=_account_summary(new),
				)
			)
	return events
