"""Explainable rules that turn a LayerZero OApp's configuration into findings and a grade.

Every finding carries the evidence that triggered it, so a grade can always be traced back to the
on-chain values behind it. /methodology on the site documents these rules; keep the two in sync.
"""
from app.schemas.posture import Admin, AdminAccount, Evidence, Finding, Pathway, Posture

SEVERITY_PENALTY = {"critical": 35, "high": 20, "medium": 8, "low": 3, "info": 0}
SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"]
ETHERSCAN = "https://etherscan.io/address/"


def _route_label(pathway: Pathway) -> str:
	return f"{pathway.chain_name or 'eid ' + str(pathway.eid)} ({pathway.eid})"


def _account_label(account: AdminAccount) -> str:
	if account.type == "safe":
		return f"Safe {account.threshold}-of-{account.owners}"
	return {"eoa": "single key (EOA)", "contract": "contract", "none": "none", "unknown": "unknown"}[account.type]


def single_verifier(pathways: list[Pathway]) -> Finding | None:
	weak = [p for p in pathways if p.receive and p.receive.effective_verifiers <= 1]
	if not weak:
		return None
	sample = weak[0].receive
	names = ", ".join(v.name or v.address for v in (sample.required_dvns or sample.optional_dvns)) or "none"
	return Finding(
		rule_id="LZ-SINGLE-VERIFIER",
		severity="critical",
		title=f"{len(weak)} of {len(pathways)} routes accept messages from a single verifier",
		summary=f"Inbound messages on {len(weak)} route(s) need only one DVN attestation to be executed.",
		why_it_matters=(
			"If that one verifier is compromised, misconfigured or fed false data, it can approve a forged "
			"message and release funds. This is the configuration behind the April 2026 Kelp DAO exploit."
		),
		recommendation="Require at least two independent DVNs (ideally 2-of-N with distinct operators) on every route.",
		pathways=[p.eid for p in weak],
		evidence=[
			Evidence(label="Routes affected", value=", ".join(_route_label(p) for p in weak[:12]) + (" …" if len(weak) > 12 else "")),
			Evidence(label="Verifier on first affected route", value=names),
		],
	)


def single_operator(pathways: list[Pathway]) -> Finding | None:
	weak = []
	for p in pathways:
		dvns = p.receive.required_dvns if p.receive else []
		named = {v.name for v in dvns if v.name}
		if len(dvns) >= 2 and len(named) == 1 and len(named) == len({v.name for v in dvns}):
			weak.append(p)
	if not weak:
		return None
	operator = next(v.name for v in weak[0].receive.required_dvns if v.name)
	return Finding(
		rule_id="LZ-SINGLE-OPERATOR",
		severity="high",
		title="Required verifiers are all run by one operator",
		summary=f"On {len(weak)} route(s) every required DVN belongs to {operator}.",
		why_it_matters="Multiple DVNs from one operator share infrastructure and keys, so they fail together.",
		recommendation="Mix operators so no single organisation can attest a message alone.",
		pathways=[p.eid for p in weak],
		evidence=[Evidence(label="Operator", value=operator)],
	)


def default_config(pathways: list[Pathway]) -> Finding | None:
	weak = [p for p in pathways if p.receive and p.receive.is_default_library]
	if not weak:
		return None
	return Finding(
		rule_id="LZ-DEFAULT-CONFIG",
		severity="medium",
		title=f"{len(weak)} route(s) rely on LayerZero's default configuration",
		summary="These routes use the default library or default verifier settings instead of an explicit configuration.",
		why_it_matters="Defaults can change without the protocol acting, so the route's security is not under the team's control.",
		recommendation="Set the receive library and ULN config explicitly for every route.",
		pathways=[p.eid for p in weak],
		evidence=[Evidence(label="Routes", value=", ".join(_route_label(p) for p in weak[:12]))],
	)


def admin_findings(admin: Admin) -> list[Finding]:
	findings: list[Finding] = []
	if admin.delegate and admin.delegate.type == "eoa":
		findings.append(
			Finding(
				rule_id="ADM-EOA-DELEGATE",
				severity="critical",
				title="A single private key can change the verifier configuration",
				summary=(
					"The LayerZero delegate — the account allowed to set DVNs and libraries — is an EOA, so one signature "
					"can change the configuration. Off-chain protections such as MPC or hardware custody may exist but are not visible on-chain."
				),
				why_it_matters="Whoever holds that key can swap in their own verifier and approve any message. Kelp's exploited route was configured by such a key.",
				recommendation="Move the delegate role to a multisig (with a timelock for config changes).",
				evidence=[Evidence(label="Delegate", value=admin.delegate.address, link=ETHERSCAN + admin.delegate.address)],
			)
		)
	if admin.owner and admin.owner.type == "eoa":
		findings.append(
			Finding(
				rule_id="ADM-EOA-OWNER",
				severity="high",
				title="The contract owner is a single private key",
				summary=(
					"The OApp owner can set peers and the delegate, and is an EOA. Off-chain protections such as MPC or "
					"hardware custody may exist but are not visible on-chain."
				),
				why_it_matters="A single leaked or phished key can redirect routes or hand configuration to an attacker.",
				recommendation="Transfer ownership to a multisig.",
				evidence=[Evidence(label="Owner", value=admin.owner.address, link=ETHERSCAN + admin.owner.address)],
			)
		)
	seen: set[str] = set()
	for role, account in (("Delegate", admin.delegate), ("Owner", admin.owner)):
		if not account or account.type != "safe" or account.address in seen or account.threshold is None:
			continue
		seen.add(account.address)
		if account.threshold <= 2:
			findings.append(
				Finding(
					rule_id="ADM-LOW-THRESHOLD",
					severity="high" if account.threshold == 1 else "medium",
					title=f"{role} multisig needs only {account.threshold} signature{'s' if account.threshold > 1 else ''}",
					summary=f"The {role.lower()} is a Safe with a {account.threshold}-of-{account.owners} threshold.",
					why_it_matters="Low thresholds let one or two compromised signers change security-critical settings.",
					recommendation="Raise the threshold (e.g. at least 3 signers, a majority of owners).",
					evidence=[Evidence(label=role, value=f"{account.address} ({_account_label(account)})", link=ETHERSCAN + account.address)],
				)
			)
	return findings


def low_confirmations(pathways: list[Pathway], defaults: dict[int, int]) -> Finding | None:
	weak = [p for p in pathways if p.receive and p.eid in defaults and p.receive.confirmations < defaults[p.eid]]
	if not weak:
		return None
	return Finding(
		rule_id="LZ-LOW-CONFIRMATIONS",
		severity="low",
		title=f"{len(weak)} route(s) wait fewer block confirmations than LayerZero's default",
		summary="Verifiers attest after fewer source-chain confirmations than the reference default.",
		why_it_matters="Fewer confirmations increase exposure to source-chain reorgs.",
		recommendation="Use at least the default confirmation count for each source chain.",
		pathways=[p.eid for p in weak],
		evidence=[
			Evidence(label=_route_label(p), value=f"{p.receive.confirmations} (default {defaults[p.eid]})") for p in weak[:8]
		],
	)


def grade(findings: list[Finding]) -> tuple[int, str, str]:
	score = max(0, 100 - sum(SEVERITY_PENALTY[f.severity] for f in findings))
	letter = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F"
	if any(f.severity == "critical" for f in findings) and letter in "ABC":
		letter = "D"
	worst = next((s for s in SEVERITY_ORDER if any(f.severity == s for f in findings)), "low")
	risk = worst if worst in ("critical", "high", "medium") else "low"
	return score, letter, risk


def evaluate(raw: dict) -> Posture:
	pathways: list[Pathway] = raw["pathways"]
	admin = Admin(owner=raw["owner"], delegate=raw["delegate"])
	candidates = [
		single_verifier(pathways),
		single_operator(pathways),
		default_config(pathways),
		*admin_findings(admin),
		low_confirmations(pathways, raw.get("default_confirmations", {})),
	]
	findings = sorted((f for f in candidates if f), key=lambda f: SEVERITY_ORDER.index(f.severity))
	score, letter, risk = grade(findings)
	return Posture(
		chain=raw["chain"],
		contract=raw["contract"],
		grade=letter,
		score=score,
		risk_level=risk,
		pathways_total=len(pathways),
		single_verifier_pathways=sum(1 for p in pathways if p.receive and p.receive.effective_verifiers <= 1),
		admin=admin,
		pathways=pathways,
		findings=findings,
		checked_at=raw["checked_at"],
	)

