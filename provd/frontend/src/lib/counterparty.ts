import { apiUrl } from "@/lib/env";

export type Chain = "tron" | "solana";
export type RiskLevel = "low" | "medium" | "high" | "critical";

const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Which chain an address belongs to, from its format; null if neither. */
export function detectChain(address: string): Chain | null {
  const a = address.trim();
  if (TRON_RE.test(a)) return "tron";
  if (SOLANA_RE.test(a)) return "solana";
  return null;
}

export const CHAIN_LABEL: Record<Chain, string> = { tron: "USDT on Tron", solana: "USDC and USDT on Solana" };
export const STABLE_LABEL: Record<Chain, string> = { tron: "USDT", solana: "USDC/USDT" };
export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type Coverage = "full" | "partial" | "none";

export type RiskFlag = { code: string; severity: Severity; reason: string };

export type Explanation = {
  signal: string;
  value: string | number | boolean | null;
  contribution: number;
  reason: string;
  source_refs: string[];
};

export type Activity = {
  transfers_read: number;
  most_recent_only: boolean;
  first_seen: string | null;
  last_seen: string | null;
  usdt_in: string;
  usdt_out: string;
  distinct_counterparties: number;
};

export type CounterpartyReport = {
  chain: string;
  address: string;
  score: number;
  risk_level: RiskLevel;
  risk_flags: RiskFlag[];
  explainability: Explanation[];
  activity: Activity;
  signal_coverage: Record<string, Coverage>;
  engine_version: string;
  checked_at: string;
};

export class CheckError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

function detailMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("detail" in body)) return null;
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join(" ");
  }
  return null;
}

export async function fetchCounterparty(chain: Chain, address: string, signal?: AbortSignal): Promise<CounterpartyReport> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`/counterparties/${chain}/${encodeURIComponent(address)}`), {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new CheckError("Couldn't reach the chain right now, try again.");
  }

  if (res.ok) return (await res.json()) as CounterpartyReport;

  if (res.status === 429) throw new CheckError("Too many checks, try again in a minute.", 429);
  if (res.status === 422 || res.status === 400 || res.status === 404) {
    const body = await res.json().catch(() => null);
    throw new CheckError(detailMessage(body) ?? "That doesn't look like a Tron or Solana address.", res.status);
  }
  throw new CheckError("Couldn't reach the chain right now, try again.", res.status);
}

export type LookalikeReport = {
  chain: Chain;
  address: string;
  verdict: "lookalike" | "suspicious" | "no_match";
  risk_level: RiskLevel;
  lookalike_of: { address: string; prefix: number; suffix: number }[];
  dust_sender: boolean | null;
  reasons: string[];
  checked_at: string;
};

export async function fetchLookalike(chain: Chain, address: string, known: string[], signal?: AbortSignal): Promise<LookalikeReport> {
  let res: Response;
  try {
    res = await fetch(apiUrl("/lookalike"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ chain, address, known }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new CheckError("Couldn't reach the chain right now, try again.");
  }
  if (res.ok) return (await res.json()) as LookalikeReport;
  if (res.status === 429) throw new CheckError("Too many checks, try again in a minute.", 429);
  const body = await res.json().catch(() => null);
  throw new CheckError(detailMessage(body) ?? "Couldn't check that address.", res.status);
}

/** Recommended action for a score, using the public thresholds. */
export function actionForLevel(level: RiskLevel): string {
  switch (level) {
    case "critical":
      return "Reject";
    case "high":
      return "Hold";
    case "medium":
      return "Manual review";
    default:
      return "Release";
  }
}

const TX_HASH_RE = /^[0-9a-fA-F]{64}$/; // Tron
const SOLANA_SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/; // Solana signatures are base58

export function isTxHash(ref: string): boolean {
  return TX_HASH_RE.test(ref) || SOLANA_SIG_RE.test(ref);
}

const SOURCE_LABELS: Record<string, string> = {
  ofac_sdn: "US Treasury OFAC sanctions list",
  tether_usdt_freeze: "Tether frozen-address list",
  tether_usdt_freeze_solana: "Tether frozen-address list (Solana)",
  circle_usdc_freeze_solana: "Circle frozen-address list (Solana)",
};

export function sourceLabel(ref: string): string {
  return SOURCE_LABELS[ref] ?? ref.replace(/_/g, " ");
}

export function explorerTx(chain: string, hash: string): string {
  return chain === "solana" ? `https://solscan.io/tx/${hash}` : tronscanTx(hash);
}

export function explorerAddress(chain: string, address: string): string {
  return chain === "solana" ? `https://solscan.io/account/${address}` : tronscanAddress(address);
}

export function explorerName(chain: string): string {
  return chain === "solana" ? "Solscan" : "Tronscan";
}

export function tronscanTx(hash: string): string {
  return `https://tronscan.org/#/transaction/${hash}`;
}

export function tronscanAddress(address: string): string {
  return `https://tronscan.org/#/address/${address}`;
}
