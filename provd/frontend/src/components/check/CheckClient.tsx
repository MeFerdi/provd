"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, ExternalLink, History, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LEVEL_TEXT, RiskBadge } from "@/components/check/RiskBadge";
import {
  type CounterpartyReport,
  CheckError,
  actionForLevel,
  fetchTronCounterparty,
  isTxHash,
  sourceLabel,
  tronscanAddress,
  tronscanTx,
} from "@/lib/counterparty";
import { type RecentCheck, clearRecentChecks, readRecentChecks, rememberCheck } from "@/lib/recent-checks";

const EXAMPLES = [
  {
    address: "TJ7E73Hs7aeeLDFMmySj9MGhXNronC6qc9",
    label: "A frozen wallet",
    note: "On Tether's frozen list itself.",
  },
  {
    address: "TAhQxLpYMyUdxFqePrQpWJe4tydcC1Ysi4",
    label: "An exposed wallet",
    note: "Traded directly with frozen wallets.",
  },
];

type State =
  | { kind: "idle" }
  | { kind: "loading"; address: string }
  | { kind: "error"; address: string; message: string }
  | { kind: "done"; report: CounterpartyReport };

const inputClass =
  "h-12 w-full min-w-0 rounded-md border border-[#CFCFCA] bg-white px-3 font-mono text-[15px] text-text-primary placeholder:font-sans placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary";

export function CheckClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryAddress = (searchParams.get("address") ?? "").trim();

  const [input, setInput] = React.useState(queryAddress);
  const [state, setState] = React.useState<State>({ kind: "idle" });
  const [attempt, setAttempt] = React.useState(0);
  const [recent, setRecent] = React.useState<RecentCheck[]>([]);

  React.useEffect(() => {
    setRecent(readRecentChecks());
  }, []);

  React.useEffect(() => {
    setInput(queryAddress);
    if (!queryAddress) {
      setState({ kind: "idle" });
      return;
    }
    const controller = new AbortController();
    setState({ kind: "loading", address: queryAddress });
    fetchTronCounterparty(queryAddress, controller.signal)
      .then((report) => {
        setState({ kind: "done", report });
        setRecent(
          rememberCheck({
            address: report.address,
            score: report.score,
            risk_level: report.risk_level,
            checked_at: report.checked_at,
          })
        );
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof CheckError ? err.message : "Couldn't reach the chain right now, try again.";
        setState({ kind: "error", address: queryAddress, message });
      });
    return () => controller.abort();
  }, [queryAddress, attempt]);

  function check(raw: string) {
    const address = raw.trim();
    if (!address) return;
    setInput(address);
    if (address === queryAddress) {
      setAttempt((n) => n + 1);
      return;
    }
    router.replace(`${pathname}?address=${encodeURIComponent(address)}`, { scroll: false });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    check(input);
  }

  return (
    <div className="min-w-0">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row" role="search">
        <label htmlFor="tron-address" className="sr-only">
          Tron wallet address
        </label>
        <input
          id="tron-address"
          name="address"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tron wallet address, starting with T"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={inputClass}
        />
        <Button type="submit" size="lg" className="shrink-0" disabled={state.kind === "loading" || !input.trim()}>
          {state.kind === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Checking…
            </>
          ) : (
            "Check wallet"
          )}
        </Button>
      </form>
      <p className="mt-3 text-sm text-text-muted">
        USDT on Tron. Free, no account needed.
      </p>

      <div className="mt-10" aria-live="polite">
        {state.kind === "idle" ? (
          <div className="space-y-6">
            <Examples onPick={check} />
            {recent.length ? (
              <RecentChecks
                items={recent}
                onPick={check}
                onClear={() => {
                  clearRecentChecks();
                  setRecent([]);
                }}
              />
            ) : null}
            <EmptyState />
          </div>
        ) : null}
        {state.kind === "loading" ? (
          <div className="rounded-md border border-bg-border bg-white p-6 text-text-secondary">
            Reading recent USDT transfers for <span className="break-all font-mono text-text-primary">{state.address}</span>…
          </div>
        ) : null}
        {state.kind === "error" ? (
          <div role="alert" className="rounded-md border border-[#FECDCA] bg-[#FEF3F2] p-6">
            <p className="font-medium text-[#B42318]">{state.message}</p>
            <p className="mt-1 break-all font-mono text-sm text-text-secondary">{state.address}</p>
            <Button type="button" variant="secondary" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        ) : null}
        {state.kind === "done" ? <Report report={state.report} /> : null}
        {state.kind !== "idle" && recent.length > 1 ? (
          <div className="mt-10">
            <RecentChecks
              items={recent}
              current={queryAddress}
              onPick={check}
              onClear={() => {
                clearRecentChecks();
                setRecent([]);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Examples({ onPick }: { onPick: (address: string) => void }) {
  return (
    <div>
      <h2 className="font-sans text-base font-semibold text-text-primary">Try an example</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.address}
            type="button"
            onClick={() => onPick(ex.address)}
            className="min-w-0 rounded-md border border-bg-border bg-white p-4 text-left transition-colors hover:border-text-muted hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
          >
            <span className="block font-medium text-text-primary">{ex.label}</span>
            <span className="mt-0.5 block text-sm text-text-secondary">{ex.note}</span>
            <span className="mt-2 block break-all font-mono text-[13px] text-text-muted">{ex.address}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentChecks({
  items,
  current,
  onPick,
  onClear,
}: {
  items: RecentCheck[];
  current?: string;
  onPick: (address: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-md border border-bg-border bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-bg-border px-5 py-3 sm:px-6">
        <h2 className="inline-flex items-center gap-2 font-sans text-base font-semibold text-text-primary">
          <History className="h-4 w-4 text-text-muted" aria-hidden="true" />
          Recent checks
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1 text-sm text-text-secondary hover:bg-bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
        >
          Clear
        </button>
      </div>
      <ul className="divide-y divide-bg-border">
        {items.map((c) => (
          <li key={c.address}>
            <button
              type="button"
              onClick={() => onPick(c.address)}
              aria-current={c.address === current ? "true" : undefined}
              className="flex w-full min-w-0 items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-secondary sm:px-6"
            >
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-mono text-[13px] sm:text-sm ${c.address === current ? "font-semibold text-text-primary" : "text-text-primary"}`}>
                  {c.address}
                </span>
                <span className="mt-0.5 block text-xs text-text-muted">{fmtDate(c.checked_at)}</span>
              </span>
              <span className={`shrink-0 font-mono text-sm ${LEVEL_TEXT[c.risk_level]}`}>{c.score}</span>
              <RiskBadge level={c.risk_level} className="shrink-0" />
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-bg-border px-5 py-2.5 text-xs text-text-muted sm:px-6">
        Saved in this browser only. Click one to check it again.
      </p>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-bg-border bg-bg-surface p-6 sm:p-8">
      <h2 className="font-sans text-lg font-semibold text-text-primary">What you get</h2>
      <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-text-secondary">
        <li>A risk score from 0 to 1000 (higher is riskier) and a level: low, medium, high or critical.</li>
        <li>Each flag with the reason it fired, such as direct exposure to wallets Tether has frozen.</li>
        <li>The transactions behind the score, linked to Tronscan, and a summary of recent USDT activity.</li>
        <li>A link you can share with a colleague.</li>
      </ul>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

function fmtUsdt(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT`;
}

function humanize(s: string): string {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function CopyLinkButton() {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        ta.remove();
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button type="button" variant="secondary" onClick={copy}>
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Link copied" : "Copy link"}
    </Button>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score / 10));
  return (
    <div className="mt-4" aria-hidden="true">
      <div className="relative grid h-2 grid-cols-4 gap-px overflow-visible rounded-md">
        <div className="rounded-l-md bg-[#ABEFC6]" />
        <div className="bg-[#F9DBAF]" />
        <div className="bg-[#FEDF89]" />
        <div className="rounded-r-md bg-[#FECDCA]" />
        <div
          className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 bg-text-primary"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-text-muted">
        <span>0</span>
        <span>250</span>
        <span>500</span>
        <span>750</span>
        <span>1000</span>
      </div>
    </div>
  );
}

function Report({ report }: { report: CounterpartyReport }) {
  const { activity } = report;
  const coverage = Object.entries(report.signal_coverage ?? {});
  const txRefs = Array.from(
    new Set(report.explainability.flatMap((e) => e.source_refs).filter((ref) => isTxHash(ref)))
  );

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-bg-border bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-text-muted">Counterparty · USDT on Tron</p>
            <a
              href={tronscanAddress(report.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-full items-start gap-1.5 break-all font-mono text-[15px] text-text-primary hover:underline sm:text-base"
            >
              {report.address}
              <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-text-muted" aria-label="Open on Tronscan" />
            </a>
            <p className="mt-2 text-sm text-text-muted">
              Checked {fmtDate(report.checked_at)} · engine {report.engine_version}
            </p>
          </div>
          <div className="shrink-0">
            <CopyLinkButton />
          </div>
        </div>

        <div className="mt-6 border-t border-bg-border pt-6">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className={`font-display text-[56px] leading-none ${LEVEL_TEXT[report.risk_level]}`}>
              {report.score}
              <span className="ml-1 font-sans text-lg text-text-muted">/ 1000</span>
            </div>
            <RiskBadge level={report.risk_level} suffix="risk" size="lg" className="mb-1" />
          </div>
          <ScoreBar score={report.score} />
          <p className="mt-4 text-[15px] text-text-secondary">
            At this level the API recommends:{" "}
            <span className="font-medium text-text-primary">{actionForLevel(report.risk_level)}</span>
          </p>
        </div>
      </section>

      <section className="rounded-md border border-bg-border bg-white">
        <h2 className="border-b border-bg-border px-5 py-3.5 font-sans text-base font-semibold text-text-primary sm:px-6">
          Flags
        </h2>
        {report.risk_flags.length ? (
          <ul className="divide-y divide-bg-border">
            {report.risk_flags.map((f, i) => (
              <li key={`${f.code}-${i}`} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6">
                <RiskBadge level={f.severity} className="self-start" />
                <div className="min-w-0">
                  <div className="break-all font-mono text-sm text-text-primary">{f.code}</div>
                  <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{f.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-[15px] text-text-secondary sm:px-6">No flags raised on public data.</p>
        )}
      </section>

      <section className="rounded-md border border-bg-border bg-white">
        <h2 className="border-b border-bg-border px-5 py-3.5 font-sans text-base font-semibold text-text-primary sm:px-6">
          Why this score
        </h2>
        <ul className="divide-y divide-bg-border">
          {report.explainability.map((e, i) => (
            <li key={`${e.signal}-${i}`} className="px-5 py-4 sm:px-6">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium text-text-primary">{humanize(e.signal)}</span>
                <span className="shrink-0 font-mono text-sm text-text-primary">
                  {e.contribution > 0 ? `+${e.contribution}` : e.contribution}
                </span>
              </div>
              <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{e.reason}</p>
              {e.source_refs.filter((r) => !isTxHash(r)).length ? (
                <p className="mt-2 text-sm text-text-muted">
                  Source: {e.source_refs.filter((r) => !isTxHash(r)).map(sourceLabel).join(", ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        {txRefs.length ? (
          <div className="border-t border-bg-border px-5 py-4 sm:px-6">
            <h3 className="text-sm font-medium text-text-primary">Transactions behind this score</h3>
            <ul className="mt-2 space-y-1.5">
              {txRefs.map((hash) => (
                <li key={hash} className="min-w-0">
                  <a
                    href={tronscanTx(hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-sm text-accent-secondary hover:underline"
                  >
                    {hash}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
        <section className="rounded-md border border-bg-border bg-white">
          <h2 className="border-b border-bg-border px-5 py-3.5 font-sans text-base font-semibold text-text-primary sm:px-6">
            Recent USDT activity
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 text-[15px] sm:px-6">
            {[
              ["Transfers read", activity.transfers_read.toLocaleString("en-US")],
              ["Distinct counterparties", activity.distinct_counterparties.toLocaleString("en-US")],
              ["USDT in", fmtUsdt(activity.usdt_in)],
              ["USDT out", fmtUsdt(activity.usdt_out)],
              ["First seen", fmtDate(activity.first_seen)],
              ["Last seen", fmtDate(activity.last_seen)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm text-text-muted">{label}</dt>
                <dd className="mt-0.5 text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
          {activity.most_recent_only ? (
            <p className="border-t border-bg-border px-5 py-3 text-sm text-text-muted sm:px-6">
              Busy wallet: only the most recent transfers were read, so first seen may be later than the real first
              transfer.
            </p>
          ) : null}
        </section>

        <section className="rounded-md border border-bg-border bg-white">
          <h2 className="border-b border-bg-border px-5 py-3.5 font-sans text-base font-semibold text-text-primary sm:px-6">
            Signal coverage
          </h2>
          <ul className="divide-y divide-bg-border text-[15px]">
            {coverage.map(([name, level]) => (
              <li key={name} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                <span className="text-text-primary">{humanize(name)}</span>
                <span className={level === "full" ? "text-sm text-[#067647]" : "text-sm text-text-muted"}>{level}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-sm leading-relaxed text-text-secondary">
        Scores use public data only. Platforms add their own history via the API.{" "}
        <a href="/docs/quickstart" className="text-accent-secondary hover:underline">
          Score a full trade with the API
        </a>
        .
      </p>
    </div>
  );
}
