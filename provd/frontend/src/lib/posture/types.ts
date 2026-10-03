// Mirrors the backend pydantic schemas (backend/app/schemas/posture.py). Keep in sync.

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type RiskLevel = "critical" | "high" | "medium" | "low";
export type Grade = "A" | "B" | "C" | "D" | "F";

export interface Verifier {
  address: string;
  name: string | null;
}

export interface UlnSide {
  library: string;
  is_default_library: boolean;
  confirmations: number;
  required_dvns: Verifier[];
  optional_dvns: Verifier[];
  optional_threshold: number;
  effective_verifiers: number;
}

export interface Pathway {
  eid: number;
  chain_name: string | null;
  peer: string;
  receive: UlnSide | null;
  send: UlnSide | null;
}

export interface AdminAccount {
  address: string;
  type: "eoa" | "safe" | "contract" | "none" | "unknown";
  threshold: number | null;
  owners: number | null;
}

export interface Admin {
  owner: AdminAccount | null;
  delegate: AdminAccount | null;
}

export interface Evidence {
  label: string;
  value: string;
  link: string | null;
}

export interface Finding {
  rule_id: string;
  severity: Severity;
  title: string;
  summary: string;
  why_it_matters: string;
  recommendation: string;
  pathways: number[];
  evidence: Evidence[];
}

export interface FindingRef {
  rule_id: string;
  severity: Severity;
  title: string;
}

export interface ChangeEvent {
  detected_at: string;
  kind: string;
  severity: Severity;
  summary: string;
  pathway: number | null;
  before: object | null;
  after: object | null;
}

export interface Posture {
  framework: "layerzero_v2";
  chain: string;
  contract: string;
  grade: Grade;
  score: number;
  risk_level: RiskLevel;
  pathways_total: number;
  single_verifier_pathways: number;
  admin: Admin;
  pathways: Pathway[];
  findings: Finding[];
  checked_at: string;
}

export interface ProtocolSummary {
  slug: string;
  name: string;
  category: string;
  framework: string;
  chain: string;
  contract: string;
  grade: Grade;
  score: number;
  risk_level: RiskLevel;
  pathways_total: number;
  single_verifier_pathways: number;
  top_findings: FindingRef[];
  checked_at: string;
  last_change_at: string | null;
}

export interface ProtocolDetail extends ProtocolSummary {
  website: string | null;
  admin: Admin;
  pathways: Pathway[];
  findings: Finding[];
  changes: ChangeEvent[];
}

export interface ProtocolList {
  generated_at: string;
  items: ProtocolSummary[];
}

export interface RatingsSnapshot {
  generated_at: string;
  /** True when the snapshot includes protocols not yet cleared for publication (local review only). */
  preview?: boolean;
  protocols: ProtocolDetail[];
}

export type EarlyAccessRole = "curator" | "insurer" | "protocol" | "fund" | "researcher" | "other";

export interface EarlyAccessRequest {
  email: string;
  organization?: string;
  role: EarlyAccessRole;
  message?: string;
}
