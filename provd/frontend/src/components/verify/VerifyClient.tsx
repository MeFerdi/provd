"use client";

import * as React from "react";
import { AlertTriangle, Check, Clock, Copy, Download, FileUp, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getApiBaseUrl } from "@/lib/env";
import { type Check as VerifyCheck, type CheckStatus, type VerifyResult, verifyDecision } from "@/lib/proof/verify-decision.mjs";

type Outcome = { kind: "idle" } | { kind: "error"; message: string } | { kind: "done"; result: VerifyResult };
type KeyState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; keyId: string };

const textareaClass =
  "block h-64 w-full min-w-0 resize-y rounded-md border border-[#CFCFCA] bg-white p-3 font-mono text-[13px] leading-relaxed text-text-primary placeholder:font-sans placeholder:text-[15px] placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary";
const inputClass =
  "h-11 w-full min-w-0 rounded-md border border-[#CFCFCA] bg-white px-3 font-mono text-[13px] text-text-primary placeholder:font-sans placeholder:text-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary";

const STATUS_META: Record<CheckStatus, { label: string; icon: React.ElementType; row: string; badge: string }> = {
  pass: { label: "Pass", icon: Check, row: "", badge: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]" },
  fail: { label: "Fail", icon: X, row: "bg-[#FEF3F2]", badge: "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]" },
  pending: { label: "Pending", icon: Clock, row: "", badge: "border-bg-border bg-bg-surface text-text-secondary" },
  warn: { label: "Check", icon: AlertTriangle, row: "", badge: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]" },
};

export function VerifyClient() {
  const [text, setText] = React.useState("");
  const [pinnedKey, setPinnedKey] = React.useState("");
  const [outcome, setOutcome] = React.useState<Outcome>({ kind: "idle" });
  const [keyState, setKeyState] = React.useState<KeyState>({ kind: "idle" });
  const [loadingExample, setLoadingExample] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const run = React.useCallback((source: string, key: string, scroll = false) => {
    if (!source.trim()) {
      setOutcome({ kind: "error", message: "Paste the JSON from GET /v1/decisions/{intent_id}, or upload the file." });
      return;
    }
    try {
      setOutcome({ kind: "done", result: verifyDecision(source, { publicKey: key }) });
    } catch (err) {
      setOutcome({ kind: "error", message: err instanceof Error ? `Couldn't read this JSON: ${err.message}` : "Couldn't read this JSON." });
    }
    if (scroll) window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  async function loadExample() {
    setLoadingExample(true);
    try {
      // Fetched as text on purpose: parsing and re-printing would change number literals.
      const res = await fetch("/example-decision.json", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.text();
      setText(body);
      run(body, pinnedKey, true);
    } catch {
      setOutcome({ kind: "error", message: "Couldn't load the example. Reload the page and try again." });
    } finally {
      setLoadingExample(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const body = await file.text();
    setText(body);
    run(body, pinnedKey, true);
  }

  async function fetchKeys() {
    setKeyState({ kind: "loading" });
    try {
      const res = await fetch(`${getApiBaseUrl()}/v1/proof/keys`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { keys?: { key_id: string; public_key: string }[] };
      const keys = data.keys ?? [];
      if (!keys.length) throw new Error("no keys published");
      let wantedId = "";
      try {
        wantedId = String(JSON.parse(text)?.signature?.key_id ?? "");
      } catch {}
      const key = keys.find((k) => k.key_id === wantedId) ?? keys[0];
      setPinnedKey(key.public_key);
      setKeyState({ kind: "ok", keyId: key.key_id });
      if (outcome.kind === "done") run(text, key.public_key);
    } catch (err) {
      setKeyState({
        kind: "error",
        message: `Couldn't fetch ${getApiBaseUrl()}/v1/proof/keys (${err instanceof Error ? err.message : "network error"}). Paste the key instead.`,
      });
    }
  }

  return (
    <div className="min-w-0">
      <div className="rounded-md border border-bg-border bg-white">
        <div className="flex flex-col gap-3 border-b border-bg-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <label htmlFor="decision-json" className="font-sans text-base font-semibold text-text-primary">
            Decision JSON
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={loadExample} disabled={loadingExample}>
              {loadingExample ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Try an example
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Upload file
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} onChange={onFile} />
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <textarea
            id="decision-json"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Paste the response of GET /v1/decisions/{intent_id}, starting with {"intent_id": …'
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={textareaClass}
          />

          <div className="mt-4">
            <label htmlFor="pinned-key" className="text-sm font-medium text-text-primary">
              Public key to check against <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <p className="mt-0.5 text-sm text-text-secondary">
              Leave empty to use the key in the file. Pin the published key so a forged record can&apos;t bring its own.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="pinned-key"
                value={pinnedKey}
                onChange={(e) => {
                  setPinnedKey(e.target.value);
                  setKeyState({ kind: "idle" });
                }}
                placeholder="Compressed secp256k1 key, 66 hex characters"
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
              <Button type="button" variant="secondary" className="h-11 shrink-0" onClick={fetchKeys} disabled={keyState.kind === "loading"}>
                {keyState.kind === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Fetch from /v1/proof/keys
              </Button>
            </div>
            {keyState.kind === "ok" ? <p className="mt-2 text-sm text-[#067647]">Pinned key {keyState.keyId} from the API.</p> : null}
            {keyState.kind === "error" ? <p className="mt-2 text-sm text-[#B42318]">{keyState.message}</p> : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="button" size="lg" onClick={() => run(text, pinnedKey, true)} disabled={!text.trim()}>
              Verify
            </Button>
            <p className="text-sm text-text-muted">Runs in your browser. Nothing is sent to Provd.</p>
          </div>
        </div>
      </div>

      <div ref={resultRef} className="mt-8 scroll-mt-24" aria-live="polite">
        {outcome.kind === "error" ? (
          <div role="alert" className="rounded-md border border-[#FECDCA] bg-[#FEF3F2] p-5 text-[15px] text-[#B42318]">
            {outcome.message}
          </div>
        ) : null}
        {outcome.kind === "done" ? <Results result={outcome.result} /> : null}
      </div>
    </div>
  );
}

function Results({ result }: { result: VerifyResult }) {
  const record = (result.bundle.record ?? {}) as {
    created_at?: string;
    intent?: { chain?: string; intent_type?: string; counterparty?: { wallet_address?: string | null } };
    decision?: { score?: number; risk_level?: string; recommended_action?: string };
  };
  const failed = result.checks.filter((c) => c.status === "fail");
  const pending = result.checks.filter((c) => c.status === "pending");
  const anchor = result.checks.find((c) => c.id === "anchor");

  return (
    <div className="space-y-6">
      <section
        className={cn(
          "rounded-md border p-5 sm:p-6",
          failed.length ? "border-[#FECDCA] bg-[#FEF3F2]" : "border-[#ABEFC6] bg-[#ECFDF3]"
        )}
      >
        <h2 className={cn("font-display text-3xl", failed.length ? "text-[#B42318]" : "text-[#067647]")}>
          {failed.length ? "This record does not verify." : "This record is authentic."}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-text-primary">
          {failed.length
            ? `${failed.map((c) => c.label.toLowerCase()).join(" and ")} failed. Don't rely on this record.`
            : pending.length
              ? "The hash, signature and Merkle inclusion check out. Anchoring on Bitcoin is still in progress."
              : "The hash, signature and Merkle inclusion check out, and the batch root is anchored on Bitcoin."}
        </p>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Meta label="Intent" value={result.intentId || "—"} mono />
          <Meta label="Decided" value={record.created_at ? fmtDate(record.created_at) : "—"} />
          <Meta
            label="Decision"
            value={
              record.decision
                ? `${record.decision.score ?? "—"} / 1000 · ${record.decision.risk_level ?? "—"} · ${record.decision.recommended_action ?? "—"}`
                : "—"
            }
          />
          <Meta label="Counterparty" value={record.intent?.counterparty?.wallet_address ?? "—"} mono />
        </dl>
      </section>

      <section className="rounded-md border border-bg-border bg-white">
        <h2 className="border-b border-bg-border px-5 py-3.5 font-sans text-base font-semibold text-text-primary sm:px-6">Checks</h2>
        <ol className="divide-y divide-bg-border">
          {result.checks.map((c, i) => (
            <CheckRow key={c.id} check={c} index={i + 1} />
          ))}
        </ol>
      </section>

      {anchor && anchor.values.proof_url ? <AnchorBlock check={anchor} /> : null}
    </div>
  );
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-muted">{label}</dt>
      <dd className={cn("mt-0.5 break-all text-text-primary", mono && "font-mono text-[13px]")}>{value}</dd>
    </div>
  );
}

function CheckRow({ check, index }: { check: VerifyCheck; index: number }) {
  const meta = STATUS_META[check.status];
  const Icon = meta.icon;
  const values = Object.entries(check.values).filter(([k]) => k !== "proof_url");
  return (
    <li className={cn("px-5 py-4 sm:px-6", meta.row)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-sm font-medium", meta.badge)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          {meta.label}
        </span>
        <h3 className="font-sans text-[15px] font-semibold text-text-primary">
          {index}. {check.label}
        </h3>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{check.detail}</p>
      {values.length ? (
        <dl className="mt-3 grid gap-1.5 text-sm">
          {values.map(([k, v]) => (
            <div key={k} className="grid min-w-0 gap-x-3 sm:grid-cols-[140px_minmax(0,1fr)]">
              <dt className="text-text-muted">{k.replace(/_/g, " ")}</dt>
              <dd className="min-w-0 break-all font-mono text-[13px] text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

function AnchorBlock({ check }: { check: VerifyCheck }) {
  const url = `${getApiBaseUrl()}${check.values.proof_url}`;
  const command = `ots verify -d ${check.values.root} batch.ots`;
  return (
    <section className="rounded-md border border-bg-border bg-white p-5 sm:p-6">
      <h2 className="font-sans text-base font-semibold text-text-primary">Check the Bitcoin anchor yourself</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">
        The browser can&apos;t read Bitcoin, so this step uses the OpenTimestamps client. Download the batch proof and run:
      </p>
      <CodeLine text={command} />
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={url}
          download="batch.ots"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-text-primary bg-white px-4 text-sm font-medium text-text-primary hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download batch.ots
        </a>
        <span className="self-center text-sm text-text-muted">
          Needs <code className="font-mono">pip install opentimestamps-client</code>
        </span>
      </div>
    </section>
  );
}

function CodeLine({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-bg-border bg-bg-surface p-3">
      <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-text-primary">{text}</code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-sm text-text-secondary hover:bg-white hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
        aria-label="Copy command"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}
