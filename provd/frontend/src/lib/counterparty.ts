import { apiUrl } from "@/lib/env";

export type RiskLevel = "low" | "medium" | "high" | "critical";
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

export async function fetchTronCounterparty(address: string, signal?: AbortSignal): Promise<CounterpartyReport> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`/counterparties/tron/${encodeURIComponent(address)}`), {
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
    throw new CheckError(detailMessage(body) ?? "That doesn't look like a Tron address.", res.status);
  }
  throw new CheckError("Couldn't reach the chain right now, try again.", res.status);
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

const TX_HASH_RE = /^[0-9a-fA-F]{64}$/;

export function isTxHash(ref: string): boolean {
  return TX_HASH_RE.test(ref);
}

const SOURCE_LABELS: Record<string, string> = {
  tether_usdt_freeze: "Tether frozen-address list",
};

export function sourceLabel(ref: string): string {
  return SOURCE_LABELS[ref] ?? ref.replace(/_/g, " ");
}

export function tronscanTx(hash: string): string {
  return `https://tronscan.org/#/transaction/${hash}`;
}

export function tronscanAddress(address: string): string {
  return `https://tronscan.org/#/address/${address}`;
}
