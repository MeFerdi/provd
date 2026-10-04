"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/check/RiskBadge";
import { type LookalikeReport, CheckError, detectChain, fetchLookalike } from "@/lib/counterparty";

/** A real case from Solana mainnet: a wallet received 17,950.70 USDT from EKYWxPNq…vJKC, then dust from a copy. */
const EXAMPLE = {
  destination: "EKYWHE68zW33SkFNmcqPneowxagcsgjpqYmLVs4yvJKC",
  known: ["EKYWxPNqtscvebruQdj7HkPL6CyFLJamwNnrLgi1vJKC", "85LZNbzXhCUcwnyDBCBcdE3AdnL62zRwj8s73xj9rUQZ"],
};

const fieldClass =
  "w-full min-w-0 rounded-md border border-[#CFCFCA] bg-white px-3 font-mono text-[14px] text-text-primary placeholder:font-sans placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; report: LookalikeReport };

/** Show an address with its first `prefix` and last `suffix` characters emphasised. */
function Marked({ address, prefix, suffix }: { address: string; prefix: number; suffix: number }) {
  const head = address.slice(0, prefix);
  const middle = address.slice(prefix, address.length - suffix);
  const tail = address.slice(address.length - suffix);
  return (
    <span className="font-mono text-[14px]">
      {/* matched characters never split across lines; only the middle wraps */}
      <mark className="inline-block whitespace-nowrap rounded-sm bg-[#FEF0C7] px-0.5 font-semibold text-text-primary">{head}</mark>
      <span className="break-all text-text-muted">{middle}</span>
      <mark className="inline-block whitespace-nowrap rounded-sm bg-[#FEF0C7] px-0.5 font-semibold text-text-primary">{tail}</mark>
    </span>
  );
}

export function LookalikePanel() {
  const [destination, setDestination] = React.useState("");
  const [known, setKnown] = React.useState("");
  const [state, setState] = React.useState<State>({ kind: "idle" });

  async function run(dest: string, list: string) {
    const address = dest.trim();
    const chain = detectChain(address);
    if (!chain) {
      setState({ kind: "error", message: "That doesn't look like a Tron or Solana address." });
      return;
    }
    const addresses = Array.from(new Set(list.split(/[\s,]+/).map((a) => a.trim()).filter(Boolean))).slice(0, 200);
    setState({ kind: "loading" });
    try {
      setState({ kind: "done", report: await fetchLookalike(chain, address, addresses) });
    } catch (err) {
      setState({ kind: "error", message: err instanceof CheckError ? err.message : "Couldn't check that address." });
    }
  }

  function tryExample() {
    setDestination(EXAMPLE.destination);
    setKnown(EXAMPLE.known.join("\n"));
    void run(EXAMPLE.destination, EXAMPLE.known.join("\n"));
  }

  return (
    <section id="lookalike" className="scroll-mt-28 rounded-md border border-bg-border bg-white p-5 sm:p-6">
      <h2 className="font-sans text-xl font-semibold text-text-primary">Is this the address you meant?</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
        Scammers create addresses that start and end like ones you&apos;ve paid, then send you a tiny amount so the copy sits
        in your history. Paste the address you&apos;re about to pay and the addresses you&apos;ve paid before.
      </p>

      <form
        className="mt-5 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(destination, known);
        }}
      >
        <div>
          <label htmlFor="lookalike-destination" className="mb-1.5 block text-sm font-medium text-text-primary">
            Address you&apos;re about to pay
          </label>
          <input
            id="lookalike-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Tron or Solana address"
            autoComplete="off"
            spellCheck={false}
            className={`${fieldClass} h-11`}
          />
        </div>
        <div>
          <label htmlFor="lookalike-known" className="mb-1.5 block text-sm font-medium text-text-primary">
            Addresses you&apos;ve paid before <span className="font-normal text-text-muted">(one per line, up to 200)</span>
          </label>
          <textarea
            id="lookalike-known"
            value={known}
            onChange={(e) => setKnown(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="Paste from your payout list or address book"
            className={`${fieldClass} py-2`}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" size="lg" disabled={state.kind === "loading" || !destination.trim()}>
            {state.kind === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking…
              </>
            ) : (
              "Check address"
            )}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={tryExample} disabled={state.kind === "loading"}>
            Try a real case
          </Button>
        </div>
        <p className="text-xs text-text-muted">Free, no account needed. Your list is used for this check only and isn&apos;t stored.</p>
      </form>

      <div className="mt-5" aria-live="polite">
        {state.kind === "error" ? (
          <div role="alert" className="rounded-md border border-[#FECDCA] bg-[#FEF3F2] p-4 text-[15px] font-medium text-[#B42318]">
            {state.message}
          </div>
        ) : null}
        {state.kind === "done" ? <Result report={state.report} /> : null}
      </div>
    </section>
  );
}

const VERDICT: Record<LookalikeReport["verdict"], { title: string; tone: string }> = {
  lookalike: { title: "Don't send: this is a lookalike", tone: "border-[#FECDCA] bg-[#FEF3F2]" },
  suspicious: { title: "Careful: this address behaves like a poisoning bot", tone: "border-[#FEDF89] bg-[#FFFAEB]" },
  no_match: { title: "No lookalike found", tone: "border-bg-border bg-bg-surface" },
};

function Result({ report }: { report: LookalikeReport }) {
  const verdict = VERDICT[report.verdict];
  const match = report.lookalike_of[0];
  return (
    <div className={`rounded-md border p-5 ${verdict.tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-sans text-lg font-semibold text-text-primary">{verdict.title}</h3>
        <RiskBadge level={report.risk_level} />
      </div>
      {match ? (
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-text-muted">You&apos;re about to pay</dt>
            <dd className="mt-0.5">
              <Marked address={report.address} prefix={match.prefix} suffix={match.suffix} />
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">The address you&apos;ve actually paid</dt>
            <dd className="mt-0.5">
              <Marked address={match.address} prefix={match.prefix} suffix={match.suffix} />
            </dd>
          </div>
        </dl>
      ) : null}
      <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-text-primary">
        {report.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
