export const DEFAULT_API_BASE_URL = "http://localhost:8000";

/** Base URL of the Provd API host (without the /v1 prefix). */
export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  return (raw || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export const SITE_URL = "https://provd.tech";
export const SITE_NAME = "Provd";
export const SITE_TITLE = "Provd: pre-release risk checks for stablecoin money movement";
export const SITE_DESCRIPTION =
  "Risk checks for P2P stablecoin trades, on- and off-ramps and payouts, on any local payment rail. Provd scores a transaction before funds are released, explains why, and keeps a record of every check. Pay as you go, with 300 free checks a month, then bundles from $20.";

export const CONTACT_EMAIL = "hello@provd.tech";
export const SECURITY_EMAIL = "security@provd.tech";
/** Full URL for a versioned API path, e.g. apiUrl("/counterparties/tron/T..."). */
export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}/v1${path.startsWith("/") ? path : `/${path}`}`;
}

export const REPO_URL = "https://github.com/MeFerdi/provd-web";
