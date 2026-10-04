"use client";

import { useMemo, useState } from "react";
import { KeyRound, Lock, Play } from "lucide-react";

import { ApiOperationIndex, ApiOperations } from "@/components/docs/ApiOperations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getApiBaseUrl } from "@/lib/env";
import { LIVE_ONLY_PREFIXES } from "@/lib/openapi-rules.mjs";
import { type Operation, type SpecInfo, type TagGroup, referenceFromSpec } from "@/lib/openapi";
import { siteHref } from "@/lib/sites";

type Scenario = { wallet: string; expect: string; flags: string[]; what: string };
type Reference = {
  environment: string;
  openapi: unknown;
  sandbox: { chains: Record<string, Record<string, string>>; scenarios: Scenario[]; notes: string[] };
};
type Loaded = { reference: Reference; groups: TagGroup[]; info: SpecInfo };
type Result = { status: number; ms: number; body: string };

const SANDBOX_PREFIX = "sbx_";
const CHAINS = ["tron", "solana"] as const;
type Chain = (typeof CHAINS)[number];

const STABLE: Record<Chain, string> = { tron: "USDT_TRC20", solana: "USDC" };

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function newIntentId() {
  return `play-${Math.random().toString(36).slice(2, 10)}`;
}

/** Ready-to-send example bodies for the calls developers make first. */
function exampleBody(op: Operation, chain: Chain, wallets: Record<string, string>, intentId: string): string {
  const key = `${op.method} ${op.path}`;
  switch (key) {
    case "POST /v1/actions/evaluate":
      return pretty({
        intent_id: newIntentId(),
        chain,
        intent_type: "p2p_trade",
        counterparty: { wallet_address: wallets.clean },
        rails: { fiat_rail: "mpesa", crypto_asset: STABLE[chain] },
        amounts: { crypto: "250", fiat: "32500", fiat_currency: "KES" },
        known_counterparties: [wallets.clean],
      });
    case "POST /v1/outcomes":
      return pretty({ intent_id: intentId || "play-…", chain, outcome: "completed" });
    case "POST /v1/decisions/{intent_id}/attestation":
      return chain === "tron"
        ? pretty({ target: "evm", chain_id: 728126428, verifying_contract: "0x00000000000000000000000000000000000000e5", amount_base_units: 250000000 })
        : pretty({ target: "solana", program_id: "11111111111111111111111111111111", amount_base_units: 250000000 });
    case "POST /v1/lookalike":
      return pretty({ chain, address: wallets.lookalike, known: [wallets.clean] });
    default:
      return op.body ? "{}" : "";
  }
}

function pathDefaults(op: Operation, chain: Chain, wallets: Record<string, string>, intentId: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const p of op.params.filter((p) => p.location === "path")) {
    values[p.name] = p.name === "intent_id" ? intentId : p.name === "chain" ? chain : p.name === "address" ? wallets.clean : "";
  }
  return values;
}

function Gate({ onOpen, error, busy }: { onOpen: (key: string) => void; error: string; busy: boolean }) {
  const [value, setValue] = useState("");
  const [warning, setWarning] = useState("");
  const submit = () => {
    const key = value.trim();
    if (!key) return;
    if (!key.startsWith(SANDBOX_PREFIX)) {
      // Never send it: a live key typed into a web page should be treated as exposed.
      setWarning("That isn't a sandbox key. Never paste a live key into a website; use your sandbox key, which starts with sbx_.");
      return;
    }
    setWarning("");
    onOpen(key);
  };
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">Provd API playground.</h1>
      <p className="mb-8 text-lg leading-relaxed text-text-secondary">
        Every endpoint, field and response, with a sandbox to try each call against test wallets: a clean wallet, a
        lookalike, a sanctioned wallet and more. Nothing is charged and no live data is used. Open it with your
        sandbox key.
      </p>
      <form
        className="rounded-md border border-bg-border bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="sandbox-key" className="mb-2 block text-sm font-medium text-text-primary">
          Sandbox key
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="sandbox-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sbx_…"
            className="h-11 w-full min-w-0 rounded-md border border-bg-border px-3 font-mono text-sm sm:flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
          />
          <Button type="submit" size="lg" disabled={busy}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {busy ? "Opening…" : "Open the playground"}
          </Button>
        </div>
        {warning || error ? (
          <p role="alert" className="mt-3 text-sm text-[#B42318]">
            {warning || error}
          </p>
        ) : null}
        <p className="mt-4 text-sm text-text-muted">
          The key stays in this tab&apos;s memory and is sent only to the Provd API. Closing or reloading the page forgets it.
        </p>
      </form>
      <p className="mt-6 text-sm text-text-secondary">
        No key yet? Email{" "}
        <a href="mailto:hello@provd.tech" className="text-accent-secondary hover:underline">
          hello@provd.tech
        </a>{" "}
        and you&apos;ll get a sandbox key and a live key. Meanwhile, the{" "}
        <a href={siteHref("playground", "docs", "/")} className="text-accent-secondary hover:underline">
          docs
        </a>{" "}
        explain every concept.
      </p>
    </div>
  );
}

function SandboxWallets({ reference, chain, onUse }: { reference: Reference; chain: Chain; onUse: (wallet: string) => void }) {
  const wallets = reference.sandbox.chains[chain] ?? {};
  return (
    <div className="overflow-x-auto rounded-md border border-bg-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-bg-surface text-text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Test wallet</th>
            <th className="px-3 py-2 font-medium">Expect</th>
            <th className="px-3 py-2 font-medium">What it is</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-bg-border">
          {reference.sandbox.scenarios.map((s) => (
            <tr key={s.wallet} className="align-top">
              <td className="w-[300px] px-3 py-2">
                <div className="font-medium text-text-primary">{s.wallet}</div>
                <div className="break-all font-mono text-xs text-text-muted">{wallets[s.wallet]}</div>
              </td>
              <td className="px-3 py-2">
                <code className="text-xs">{s.expect}</code>
                {s.flags.length ? <div className="mt-1 font-mono text-[11px] text-text-muted">{s.flags.join(", ")}</div> : null}
              </td>
              <td className="px-3 py-2 text-text-secondary">{s.what}</td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onUse(wallets[s.wallet])}
                  className="whitespace-nowrap rounded-md border border-bg-border px-2 py-1 text-xs text-text-primary hover:bg-bg-surface"
                >
                  Use it
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Console({ apiKey, loaded, chain, setChain }: { apiKey: string; loaded: Loaded; chain: Chain; setChain: (c: Chain) => void }) {
  const wallets = loaded.reference.sandbox.chains[chain] ?? {};
  const operations = useMemo(
    () =>
      loaded.groups
        .flatMap((g) => g.operations)
        .filter((op) => !LIVE_ONLY_PREFIXES.some((p) => op.path === p || op.path.startsWith(`${p}/`))),
    [loaded]
  );
  const [opId, setOpId] = useState(() => operations.find((o) => o.path === "/v1/actions/evaluate")?.id ?? operations[0]?.id);
  const op = operations.find((o) => o.id === opId) ?? operations[0];
  const [intentId, setIntentId] = useState("");
  const [params, setParams] = useState<Record<string, string>>(() => (op ? pathDefaults(op, chain, wallets, "") : {}));
  const [body, setBody] = useState(() => (op ? exampleBody(op, chain, wallets, "") : ""));
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const select = (next: Operation, nextChain: Chain = chain, wallet?: string) => {
    const w = loaded.reference.sandbox.chains[nextChain] ?? {};
    setOpId(next.id);
    setParams(pathDefaults(next, nextChain, w, intentId));
    let example = exampleBody(next, nextChain, w, intentId);
    if (wallet && next.path === "/v1/actions/evaluate") {
      const parsed = JSON.parse(example);
      parsed.counterparty.wallet_address = wallet;
      example = pretty(parsed);
    }
    setBody(example);
    setResult(null);
  };

  if (!op) return null;
  const path = op.path.replace(/\{(\w+)\}/g, (_, name: string) => encodeURIComponent(params[name] ?? ""));
  const url = `${getApiBaseUrl()}${path}`;
  const sendsBody = Boolean(op.body) && op.method !== "GET";
  const needsKey = op.auth === "key";
  const curl = [
    `curl -s${op.method === "GET" ? "" : ` -X ${op.method}`} ${url}`,
    needsKey ? `  -H "X-API-Key: $PROVD_SANDBOX_KEY"` : null,
    sendsBody ? `  -H "Content-Type: application/json"` : null,
    sendsBody ? `  -d '${body.replace(/\s*\n\s*/g, " ")}'` : null,
  ]
    .filter(Boolean)
    .join(" \\\n");

  const send = async () => {
    setBusy(true);
    const started = performance.now();
    try {
      const response = await fetch(url, {
        method: op.method,
        headers: { ...(needsKey ? { "X-API-Key": apiKey } : {}), ...(sendsBody ? { "Content-Type": "application/json" } : {}) },
        body: sendsBody ? body : undefined,
      });
      const text = await response.text();
      let shown = text;
      try {
        const json = JSON.parse(text);
        shown = pretty(json);
        if (op.path === "/v1/actions/evaluate" && typeof json.intent_id === "string") setIntentId(json.intent_id);
      } catch {
        /* not JSON (e.g. an .ots proof) */
      }
      setResult({ status: response.status, ms: Math.round(performance.now() - started), body: shown });
    } catch {
      setResult({ status: 0, ms: Math.round(performance.now() - started), body: "Couldn't reach the Provd API. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 text-sm font-medium text-text-primary">Sandbox test wallets ({chain})</div>
        <SandboxWallets
          reference={loaded.reference}
          chain={chain}
          onUse={(wallet) => select(operations.find((o) => o.path === "/v1/actions/evaluate") ?? op, chain, wallet)}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-0 flex-1 flex-col text-sm">
              <span className="mb-1 text-text-muted">Endpoint</span>
              <select
                value={op.id}
                onChange={(e) => select(operations.find((o) => o.id === e.target.value) ?? op)}
                className="h-10 min-w-0 rounded-md border border-bg-border bg-white px-2 font-mono text-xs"
              >
                {operations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.method} {o.path}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-text-muted">Chain</span>
              <select
                value={chain}
                onChange={(e) => {
                  const next = e.target.value as Chain;
                  setChain(next);
                  select(op, next);
                }}
                className="h-10 rounded-md border border-bg-border bg-white px-2 text-sm"
              >
                {CHAINS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-text-secondary">
            {op.summary}.{" "}
            {needsKey ? (
              <span className="text-text-muted">Uses your sandbox key: test wallets, free.</span>
            ) : (
              <span className="text-text-muted">Public endpoint: live public data, no key.</span>
            )}
          </p>
          {op.params
            .filter((p) => p.location === "path")
            .map((p) => (
              <label key={p.name} className="flex flex-col text-sm">
                <span className="mb-1 font-mono text-xs text-text-muted">{p.name}</span>
                <input
                  value={params[p.name] ?? ""}
                  onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                  placeholder={p.name === "intent_id" ? "Run evaluate first, or paste an intent_id" : ""}
                  className="h-10 rounded-md border border-bg-border px-3 font-mono text-xs"
                />
              </label>
            ))}
          {sendsBody ? (
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-text-muted">Body (JSON)</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                spellCheck={false}
                rows={14}
                className="rounded-md border border-bg-border p-3 font-mono text-xs leading-relaxed"
              />
            </label>
          ) : null}
          <Button onClick={send} disabled={busy} size="lg">
            <Play className="h-4 w-4" aria-hidden="true" />
            {busy ? "Sending…" : `Send ${op.method}`}
          </Button>
          <div>
            <div className="mb-1 text-sm text-text-muted">From your server</div>
            <pre className="overflow-x-auto rounded-md bg-[#111] p-3 font-mono text-xs leading-relaxed text-white">{curl}</pre>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between text-sm text-text-muted">
            <span>Response</span>
            {result ? (
              <span className={cn("font-mono", result.status >= 200 && result.status < 300 ? "text-[#067647]" : "text-[#B42318]")}>
                {result.status || "network error"} · {result.ms} ms
              </span>
            ) : null}
          </div>
          <pre className="h-[560px] overflow-auto whitespace-pre-wrap break-words rounded-md border border-bg-border bg-bg-surface p-3 font-mono text-xs leading-relaxed text-text-primary">
            {result ? result.body : "Send a request to see the response."}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function Playground() {
  // The key lives only in this component's state: never in storage, cookies or the URL.
  const [apiKey, setApiKey] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chain, setChain] = useState<Chain>("tron");

  const open = async (key: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/developer/reference`, { headers: { "X-API-Key": key } });
      if (response.status === 401 || response.status === 403) {
        setError("That key wasn't accepted. Check that it's an active sandbox key.");
        return;
      }
      if (response.status === 429) {
        setError("Too many attempts. Wait a minute and try again.");
        return;
      }
      if (!response.ok) {
        setError("The Provd API couldn't load the reference. Try again shortly.");
        return;
      }
      const reference = (await response.json()) as Reference;
      setApiKey(key);
      setLoaded({ reference, ...referenceFromSpec(reference.openapi) });
    } catch {
      setError("Couldn't reach the Provd API. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const lock = () => {
    setApiKey("");
    setLoaded(null);
  };

  if (!loaded) return <Gate onOpen={open} error={error} busy={busy} />;

  const count = loaded.groups.reduce((n, g) => n + g.operations.length, 0);
  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">Playground.</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">
            Sandbox: calls with your key score test wallets, free, isolated from live data. In production, make the
            same calls from your server with your live key.
          </p>
        </div>
        <Button variant="secondary" onClick={lock}>
          <Lock className="h-4 w-4" aria-hidden="true" />
          Forget key
        </Button>
      </div>

      <section aria-labelledby="try" className="mb-16">
        <h2 id="try" className="mb-4 font-display text-3xl text-text-primary">
          Try it
        </h2>
        <Console apiKey={apiKey} loaded={loaded} chain={chain} setChain={setChain} />
      </section>

      <section aria-labelledby="endpoints">
        <h2 id="endpoints" className="mb-2 scroll-mt-24 font-display text-3xl text-text-primary">
          Endpoints
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          {count} endpoints, from {loaded.info.title} {loaded.info.version} (OpenAPI {loaded.info.openapi}). Scores, flags and
          errors are explained in the{" "}
          <a href={siteHref("playground", "docs", "/reference")} className="text-accent-secondary hover:underline">
            docs
          </a>
          .
        </p>
        <ApiOperationIndex groups={loaded.groups} />
        <div className="mt-10">
          <ApiOperations groups={loaded.groups} />
        </div>
      </section>
    </div>
  );
}
