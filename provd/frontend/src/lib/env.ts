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
  "Provd checks P2P trades, payouts and escrow releases on Tron and Solana for sanctioned or frozen wallets, lookalikes and fraud history. 300 free checks a month.";

export const CONTACT_EMAIL = "hello@provd.tech";
export const SECURITY_EMAIL = "security@provd.tech";
/** Full URL for a versioned API path, e.g. apiUrl("/counterparties/tron/T..."). */
export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}/v1${path.startsWith("/") ? path : `/${path}`}`;
}

export const REPO_URL = "https://github.com/MeFerdi/provd-web";
