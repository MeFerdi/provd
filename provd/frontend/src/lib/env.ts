export const DEFAULT_API_BASE_URL = "http://localhost:8000";

/** Base URL of the Provd API (without the /api/v1 suffix). */
export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  return (raw || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export const SITE_URL = "https://provd.tech";
export const SITE_NAME = "Provd";
export const SITE_TITLE = "Provd — Security posture monitoring for cross-chain protocols";
export const SITE_DESCRIPTION =
  "Provd monitors the security configuration of cross-chain protocols — verifier sets, admin keys, multisig thresholds — and alerts you when it changes. Every rating is built from public on-chain data you can verify.";

export const CONTACT_EMAIL = "hello@provd.tech";
export const SECURITY_EMAIL = "security@provd.tech";
export const REPO_URL = "https://github.com/MeFerdi/provd-web";
