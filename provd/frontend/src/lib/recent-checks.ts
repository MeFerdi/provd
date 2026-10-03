import type { RiskLevel } from "@/lib/counterparty";
import { RECENT_CHECKS_STORAGE_KEY } from "@/lib/storage-keys";
import { readStorageItem, removeStorageItem, writeStorageItem } from "@/lib/storage";

export type RecentCheck = { address: string; score: number; risk_level: RiskLevel; checked_at: string };

export const MAX_RECENT_CHECKS = 8;
const LEVELS = new Set(["low", "medium", "high", "critical"]);

/** Recent public checks, newest first. Lives only in this browser; bad or missing data reads as empty. */
export function readRecentChecks(): RecentCheck[] {
  try {
    const raw = readStorageItem(RECENT_CHECKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c): c is RecentCheck =>
          !!c && typeof c.address === "string" && typeof c.score === "number" && LEVELS.has(c.risk_level) && typeof c.checked_at === "string"
      )
      .slice(0, MAX_RECENT_CHECKS);
  } catch {
    return [];
  }
}

export function rememberCheck(entry: RecentCheck): RecentCheck[] {
  const next = [entry, ...readRecentChecks().filter((c) => c.address !== entry.address)].slice(0, MAX_RECENT_CHECKS);
  try {
    writeStorageItem(RECENT_CHECKS_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function clearRecentChecks(): void {
  try {
    removeStorageItem(RECENT_CHECKS_STORAGE_KEY);
  } catch {}
}
