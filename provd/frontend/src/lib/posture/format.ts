import type { AdminAccount, Grade, RiskLevel, Severity, UlnSide } from "@/lib/posture/types";

export const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
export const GRADE_ORDER: Record<Grade, number> = { A: 0, B: 1, C: 2, D: 3, F: 4 };

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  critical: "Critical risk",
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
};

/** Tailwind classes per grade. Colour is always paired with the letter itself. */
export const GRADE_CLASSES: Record<Grade, string> = {
  A: "text-grade-a border-grade-a/50 bg-white",
  B: "text-grade-b border-grade-b/50 bg-white",
  C: "text-grade-c border-grade-c/50 bg-white",
  D: "text-grade-d border-grade-d/50 bg-white",
  F: "text-grade-f border-grade-f/50 bg-white",
};

export const SEVERITY_CLASSES: Record<Severity, string> = {
  critical: "text-[#B42318] bg-[#FEF3F2] border-[#FECDCA]",
  high: "text-[#B54708] bg-[#FFFAEB] border-[#FEDF89]",
  medium: "text-[#93370D] bg-[#FEF6EE] border-[#F9DBAF]",
  low: "text-[#475467] bg-[#F2F4F7] border-[#EAECF0]",
  info: "text-[#475467] bg-[#F2F4F7] border-[#EAECF0]",
};

export const GRADE_DESCRIPTION: Record<Grade, string> = {
  A: "Strong configuration",
  B: "Minor weaknesses",
  C: "Notable weaknesses",
  D: "Serious weaknesses",
  F: "Critical weaknesses",
};

export function shortAddress(address: string, head = 6, tail = 4): string {
  if (!address || address.length <= head + tail + 2) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function etherscanAddress(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

export function explorerAddress(chain: string, address: string): string | null {
  if (chain.toLowerCase() === "ethereum") return etherscanAddress(address);
  return null;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() <= 0) return "—";
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() <= 0) return "—";
  return `${d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

export function adminLabel(account: AdminAccount | null): string {
  if (!account) return "Not set";
  switch (account.type) {
    case "eoa":
      return "Single private key (EOA)";
    case "safe":
      return account.threshold != null && account.owners != null
        ? `Safe multisig, ${account.threshold}-of-${account.owners}`
        : "Safe multisig";
    case "contract":
      return "Contract";
    case "none":
      return "None";
    default:
      return "Unknown";
  }
}

export function chainLabel(eid: number, name: string | null): string {
  if (!name) return `eid ${eid}`;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function verifierNames(side: UlnSide | null): string {
  if (!side) return "—";
  const req = side.required_dvns.map((v) => v.name ?? shortAddress(v.address));
  const opt = side.optional_dvns.map((v) => v.name ?? shortAddress(v.address));
  const parts: string[] = [];
  if (req.length) parts.push(req.join(", "));
  if (opt.length) parts.push(`optional ${side.optional_threshold}-of-${opt.length}: ${opt.join(", ")}`);
  return parts.length ? parts.join(" · ") : "None";
}

export function humanizeKind(kind: string): string {
  const map: Record<string, string> = {
    "CHG-VERIFIER-REDUCED": "Verifier removed",
    "CHG-ADMIN-CHANGED": "Admin changed",
    "CHG-NEW-ROUTE": "New route",
  };
  return map[kind] ?? kind;
}
