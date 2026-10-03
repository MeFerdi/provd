"""Public API shapes for protocol security-posture ratings.

These are the contract with the frontend (`frontend/src/lib/ratings-api.ts` and the exported
`ratings-snapshot.json`), so change them deliberately.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Severity = Literal["critical", "high", "medium", "low", "info"]
RiskLevel = Literal["critical", "high", "medium", "low"]
Grade = Literal["A", "B", "C", "D", "F"]
AccountType = Literal["eoa", "safe", "contract", "none", "unknown"]


class Verifier(BaseModel):
	address: str
	name: str | None = None


class UlnSide(BaseModel):
	library: str
	is_default_library: bool
	confirmations: int
	required_dvns: list[Verifier]
	optional_dvns: list[Verifier]
	optional_threshold: int
	effective_verifiers: int = Field(description="Minimum number of independent DVN attestations a message needs")


class Pathway(BaseModel):
	eid: int
	chain_name: str | None
	peer: str
	receive: UlnSide | None
	send: UlnSide | None


class AdminAccount(BaseModel):
	address: str
	type: AccountType
	threshold: int | None = None
	owners: int | None = None


class Admin(BaseModel):
	owner: AdminAccount | None
	delegate: AdminAccount | None


class Evidence(BaseModel):
	label: str
	value: str
	link: str | None = None


class Finding(BaseModel):
	rule_id: str
	severity: Severity
	title: str
	summary: str
	why_it_matters: str
	recommendation: str
	pathways: list[int] = Field(default_factory=list)
	evidence: list[Evidence] = Field(default_factory=list)


class FindingRef(BaseModel):
	rule_id: str
	severity: Severity
	title: str


class ChangeEvent(BaseModel):
	detected_at: datetime
	kind: str
	severity: Severity
	summary: str
	pathway: int | None = None
	before: dict | None = None
	after: dict | None = None


class Posture(BaseModel):
	framework: Literal["layerzero_v2"] = "layerzero_v2"
	chain: str
	contract: str
	grade: Grade
	score: int = Field(ge=0, le=100)
	risk_level: RiskLevel
	pathways_total: int
	single_verifier_pathways: int
	admin: Admin
	pathways: list[Pathway]
	findings: list[Finding]
	checked_at: datetime


class ProtocolSummary(BaseModel):
	slug: str
	name: str
	category: str
	framework: str
	chain: str
	contract: str
	grade: Grade
	score: int
	risk_level: RiskLevel
	pathways_total: int
	single_verifier_pathways: int
	top_findings: list[FindingRef]
	checked_at: datetime
	last_change_at: datetime | None


class ProtocolDetail(ProtocolSummary):
	website: str | None = None
	admin: Admin
	pathways: list[Pathway]
	findings: list[Finding]
	changes: list[ChangeEvent]


class ProtocolList(BaseModel):
	generated_at: datetime
	items: list[ProtocolSummary]


class ScanRequest(BaseModel):
	chain: Literal["ethereum"] = "ethereum"
	address: str = Field(pattern=r"^0x[0-9a-fA-F]{40}$")


class EarlyAccessRequest(BaseModel):
	email: EmailStr
	organization: str | None = Field(default=None, max_length=120)
	role: Literal["curator", "insurer", "protocol", "fund", "researcher", "other"] = "other"
	message: str | None = Field(default=None, max_length=1000)


class EarlyAccessCreated(BaseModel):
	ok: bool = True
