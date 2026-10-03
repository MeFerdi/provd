/**
 * Public pricing, mirrored from the backend's `GET /v1/pricing`.
 * Kept static so the site can be exported without calling the API at build time.
 * Update both places together.
 */
export const FREE_DAILY_CHECKS = 100;

export type BundleId = "10k" | "100k" | "1m";

export type Bundle = {
  id: BundleId;
  checks: number;
  priceUsd: number;
  perCheckUsd: number;
};

export const BUNDLES: Bundle[] = [
  { id: "10k", checks: 10_000, priceUsd: 150, perCheckUsd: 0.015 },
  { id: "100k", checks: 100_000, priceUsd: 1_000, perCheckUsd: 0.01 },
  { id: "1m", checks: 1_000_000, priceUsd: 7_000, perCheckUsd: 0.007 },
];

export const PAYMENT_METHODS = [
  { id: "usdt_tron", label: "USDT (TRC-20)" },
  { id: "mpesa", label: "M-Pesa" },
] as const;

export function formatUsd(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
