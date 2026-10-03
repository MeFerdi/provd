/**
 * Public pricing, read from src/data/pricing.json — the same price list the backend serves at
 * `GET /v1/pricing`, exported by `python -m app.export_contract ../frontend/src/data`.
 * Don't edit numbers here: regenerate the JSON instead. Only display labels live in this file.
 */
import pricing from "@/data/pricing.json";

type RawBundle = { checks: number; price_usd: number; price_kes?: number; per_check_usd?: number };
type RawPricing = { free_daily_checks: number; bundles: Record<string, RawBundle>; payment_methods: string[] };

const raw = pricing as RawPricing;

export const FREE_DAILY_CHECKS: number = raw.free_daily_checks;

export type Bundle = {
  id: string;
  checks: number;
  priceUsd: number;
  priceKes?: number;
  perCheckUsd: number;
};

export const BUNDLES: Bundle[] = Object.entries(raw.bundles)
  .map(([id, b]) => ({
    id,
    checks: b.checks,
    priceUsd: b.price_usd,
    priceKes: b.price_kes,
    perCheckUsd: b.per_check_usd ?? b.price_usd / b.checks,
  }))
  .sort((a, b) => a.checks - b.checks);

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  usdt_tron: "USDT (TRC-20)",
  mpesa: "M-Pesa",
};

export const PAYMENT_METHODS: { id: string; label: string }[] = raw.payment_methods.map((id) => ({
  id,
  label: PAYMENT_METHOD_LABELS[id] ?? id.replace(/_/g, " "),
}));

export function formatUsd(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatKes(value: number): string {
  return `KES ${value.toLocaleString("en-US")}`;
}
