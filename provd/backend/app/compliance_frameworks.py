"""Which compliance obligations Provd's evidence relates to, per framework.

FATF's Recommendations are the global baseline: they apply to virtual asset service providers (R.15) and every
FATF-member jurisdiction transposes them, so the default framework works anywhere. Jurisdiction profiles add the
local instrument names. These are summaries of published standards and commentary, not legal advice.
"""
from __future__ import annotations

# Obligation keys used by the retro-scan and the evidence pack.
SANCTIONS, MONITORING, REPORTING, RECORDS = "sanctions", "monitoring", "reporting", "records"

FRAMEWORKS: dict[str, dict] = {
	"fatf": {
		"name": "FATF Recommendations (global baseline for virtual asset service providers)",
		"obligations": {
			SANCTIONS: ("Targeted financial sanctions screening", "FATF R.6 and R.7, applied to VASPs by R.15."),
			MONITORING: ("Ongoing monitoring of transactions", "FATF R.10 (ongoing due diligence), applied to VASPs by R.15."),
			REPORTING: ("Suspicious transaction reporting to the financial intelligence unit", "FATF R.20, applied to VASPs by R.15."),
			RECORDS: ("Keep transaction records for at least five years", "FATF R.11, applied to VASPs by R.15."),
		},
	},
	"kenya": {
		"name": "Kenya: Virtual Asset Service Providers Act 2025 and Regulations 2026",
		"obligations": {
			SANCTIONS: (
				"Sanctions and targeted financial sanctions screening",
				"VASP Regulations 2026 (LN 134/2026), AML/CFT duties; revised targeted financial sanctions rules (Sep 2026): "
				"freeze within hours, report within 24 hours.",
			),
			MONITORING: ("Transaction monitoring", "VASP Regulations 2026 (LN 134/2026), AML/CFT duties."),
			REPORTING: (
				"Suspicious transaction reports to the Financial Reporting Centre",
				"Proceeds of Crime and Anti-Money Laundering Act s.44; filed through goAML.",
			),
			RECORDS: ("Record all platform activity and keep records for seven years", "VASP Regulations 2026 (LN 134/2026)."),
		},
	},
}

DEFAULT_FRAMEWORK = "fatf"
DISCLAIMER = "Summaries of published standards and legal commentary, not legal advice: confirm your obligations with your advisers."


def framework(name: str | None) -> dict:
	key = (name or DEFAULT_FRAMEWORK).lower()
	if key not in FRAMEWORKS:
		raise ValueError(f"Unknown framework {name!r}; choose from {', '.join(sorted(FRAMEWORKS))}")
	return FRAMEWORKS[key]
