import Link from "next/link";

import example from "@/data/example-decision.json";

/**
 * Hero visual: a real decision from the live API (src/data/example-decision.json, the same record /verify
 * uses), shown the way a platform sees it at the moment of release.
 */
type Signal = { signal: string; contribution: number };

const SIGNAL_LABELS: Record<string, string> = {
  counterparty_graph: "Counterparty network",
  reversal_behavior: "Your reversal history",
  amount_pattern: "Amount pattern",
  account_takeover_proxies: "Account takeover",
  float_and_timing: "Float and timing",
};

const ACTION_STYLES: Record<string, string> = {
  release: "border-grade-a/40 bg-grade-a/10 text-grade-a",
  manual_review: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
  hold: "border-accent-warning/40 bg-accent-warning/10 text-accent-warning",
  reject: "border-accent-danger/40 bg-accent-danger/10 text-accent-danger",
};

function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function DecisionPreview() {
  const { record, record_hash: recordHash } = example;
  const { decision, intent } = record;
  const fiat = Number(intent.amounts.fiat).toLocaleString("en-US");
  const crypto = Number(intent.amounts.crypto).toLocaleString("en-US");
  const signals = (record.signals as Signal[]).filter((s) => s.signal in SIGNAL_LABELS).slice(0, 3);
  const reason = decision.risk_flags[0]?.reason.replace("wallet(s)", "wallets");

  return (
    <figure className="w-full max-w-[440px]">
      <div className="rounded-md border border-bg-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-bg-border px-5 py-3">
          <span className="text-sm font-medium text-text-primary">Before release</span>
          <span className="text-sm text-text-muted">P2P trade · M-Pesa to USDT</span>
        </div>

        <div className="px-5 pt-5">
          <div className="text-[15px] text-text-secondary">
            Buyer says they paid <span className="text-text-primary">{intent.amounts.fiat_currency} {fiat}</span>.
            You&apos;re about to send <span className="text-text-primary">{crypto} USDT</span> to{" "}
            <span className="font-mono text-[13px] text-text-primary">{shortAddress(intent.counterparty.wallet_address)}</span>.
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <div className="font-display text-[44px] leading-none text-text-primary">{decision.score}</div>
              <div className="mt-1 text-sm text-text-muted">risk score out of 1000</div>
            </div>
            <span
              className={`rounded-md border px-4 py-2 text-base font-semibold ${ACTION_STYLES[decision.recommended_action] ?? ""}`}
            >
              {titleCase(decision.recommended_action)}
            </span>
          </div>

          {reason ? (
            <p className="mt-4 border-l-2 border-accent-warning pl-3 text-[15px] leading-relaxed text-text-primary">{reason}</p>
          ) : null}

          <ul className="mt-5 divide-y divide-bg-border border-y border-bg-border text-[14px]">
            {signals.map((s) => (
              <li key={s.signal} className="flex items-center justify-between py-2">
                <span className="text-text-secondary">{SIGNAL_LABELS[s.signal]}</span>
                <span className={s.contribution > 0 ? "font-medium text-text-primary" : "text-text-muted"}>
                  {s.contribution > 0 ? `+${s.contribution}` : "0"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-[13px]">
          <span className="text-text-muted">
            Signed and timestamped on Bitcoin · <span className="font-mono">{recordHash.slice(0, 10)}…</span>
          </span>
          <Link href="/verify" className="text-accent-secondary hover:underline">
            Verify this record
          </Link>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-text-muted">A real decision from the live API, on real Tron data.</figcaption>
    </figure>
  );
}
