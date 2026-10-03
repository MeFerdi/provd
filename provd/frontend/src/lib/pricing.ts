/**
 * Public pricing, read from src/data/pricing.json — the same price list the backend serves at
 * `GET /v1/pricing`, exported by `python -m app.export_contract ../frontend/src/data`.
 * Don't edit numbers here: regenerate the JSON instead. Only display labels live in this file.
 */
import pricing from "@/data/pricing.json";

type RawBundle = { checks: number; price_usd: number; price_kes?: number; per_check_usd?: number };
type RawPlan = { name: string; monthly_usd: number | null; monthly_included_checks: number | null };
type RawPricing = {
  free_monthly_checks: number;
  bundles: Record<string, RawBundle>;
  plans?: Record<string, RawPlan>;
  payment_methods: string[];
};

const raw = pricing as RawPricing;

export const FREE_MONTHLY_CHECKS: number = raw.free_monthly_checks;

export type Plan = { id: string; name: string; monthlyUsd: number | null; includedChecks: number | null };

/** Monthly plans for global payout platforms, cheapest first; custom-priced plans last. */
export const PLANS: Plan[] = Object.entries(raw.plans ?? {})
  .map(([id, p]) => ({ id, name: p.name, monthlyUsd: p.monthly_usd, includedChecks: p.monthly_included_checks }))
  .sort((a, b) => (a.monthlyUsd ?? Infinity) - (b.monthlyUsd ?? Infinity));

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
  card: "card (Visa, Mastercard, via Paystack)",
  usdt_tron: "USDT (TRC-20)",
  mpesa: "M-Pesa",
};

export const PAYMENT_METHODS: { id: string; label: string }[] = raw.payment_methods.map((id) => ({
  id,
  label: PAYMENT_METHOD_LABELS[id] ?? id.replace(/_/g, " "),
}));

/** "a, b or c" */
export function joinOr(items: string[]): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

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
