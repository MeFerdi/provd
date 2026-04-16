"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";
import { getStoredSession, type AuthSession } from "@/lib/auth";
import { createJsonHeaders, requestErrorMessage } from "@/lib/http";
import {
  CHAIN_OPTIONS,
  DEFAULT_REQUEST,
  PLAYGROUND_PRESETS,
  SCORE_PATH,
  getMockBaseUrl,
  getSandboxApiKey,
  normalizeTrustResponse,
  runMockScore,
  type Chain,
  type ScoreRequest,
  type TrustResponse,
  type ValidationErrors,
  validateScoreRequest,
} from "@/lib/playground-config";
type AccessMode = "sandbox" | "live";

export default function PlaygroundPage() {
  const sandboxApiKey = useMemo(() => getSandboxApiKey(), []);
  const mockBaseUrl = useMemo(() => getMockBaseUrl(), []);

  const [apiKey, setApiKey] = useState(sandboxApiKey);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>("sandbox");
  const [request, setRequest] = useState<ScoreRequest>(PLAYGROUND_PRESETS[0]?.payload ?? DEFAULT_REQUEST);
  const [response, setResponse] = useState<TrustResponse | null>(null);
  const [activePreset, setActivePreset] = useState(0);
  const [activeCodeTab, setActiveCodeTab] = useState<"node" | "python">("node");
  const [status, setStatus] = useState("Ready. Choose a preset or fill the form, then run.");
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    const current = getStoredSession();
    setSession(current);
    if (current) {
      setAccessMode("live");
      setStatus("Signed-in session detected. Live mode enabled.");
    }
  }, []);

  const liveEnabled = Boolean(session);
  const endpointBaseUrl = accessMode === "live" ? API_BASE_URL : mockBaseUrl;

  const requestJson = useMemo(() => JSON.stringify(request, null, 2), [request]);
  const responseJson = useMemo(() => (response ? JSON.stringify(response, null, 2) : "{}"), [response]);

  const nodeSnippet = useMemo(
    () =>
      `const response = await fetch("${endpointBaseUrl}${SCORE_PATH}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "X-API-Key": "${apiKey || sandboxApiKey || "<your_api_key>"}"${accessMode === "live" ? ',\\n    "Authorization": "Bearer <access_token>"' : ""}\n  },\n  body: JSON.stringify(${requestJson})\n});\n\nconst data = await response.json();\nconsole.log(data);`,
    [accessMode, apiKey, endpointBaseUrl, requestJson, sandboxApiKey]
  );

  const pythonSnippet = useMemo(
    () =>
      `import requests\n\npayload = ${requestJson}\n\nresponse = requests.post(\n    "${endpointBaseUrl}${SCORE_PATH}",\n    headers={\n        "Content-Type": "application/json",\n        "X-API-Key": "${apiKey || sandboxApiKey || "<your_api_key>"}",${accessMode === "live" ? '\n        "Authorization": "Bearer <access_token>",' : ""}\n    },\n    json=payload,\n)\n\nprint(response.json())`,
    [accessMode, apiKey, endpointBaseUrl, requestJson, sandboxApiKey]
  );

  const riskBadgeClass =
    response?.risk_level === "high"
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : response?.risk_level === "medium"
        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

  const actionBadgeClass =
    response?.recommended_action === "block"
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : response?.recommended_action === "review"
        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

  function applyPreset(index: number) {
    setRequest(PLAYGROUND_PRESETS[index].payload);
    setActivePreset(index);
    setErrors({});
    setStatus(`Preset loaded: ${PLAYGROUND_PRESETS[index].label}`);
  }

  function updateContext<K extends keyof ScoreRequest["context"]>(key: K, value: ScoreRequest["context"][K]) {
    setRequest((prev) => ({ ...prev, context: { ...prev.context, [key]: value } }));
  }

  async function runSimulation() {
    const nextErrors = validateScoreRequest(request);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("Validation failed. Fix highlighted fields.");
      return;
    }

    if (accessMode === "live" && !liveEnabled) {
      setStatus("Live mode requires a signed-in account. Please sign in first.");
      return;
    }

    if (accessMode === "live") {
      try {
        const headers: Record<string, string> = {
          "X-API-Key": apiKey || sandboxApiKey || "",
        };
        const requestHeaders = createJsonHeaders({
          existingHeaders: headers,
          accessToken: session?.accessToken,
        });

        const liveResponse = await fetch(`${API_BASE_URL}${SCORE_PATH}`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(request),
        });

        if (liveResponse.ok) {
          const payload = (await liveResponse.json()) as TrustResponse;
          const normalized = normalizeTrustResponse(payload);
          setResponse(normalized);
          setStatus("Live request completed.");
          return;
        }

        const detail = await requestErrorMessage(liveResponse, `Request failed with status ${liveResponse.status}`);
        if (liveResponse.status >= 400 && liveResponse.status < 500) {
          setResponse(null);
          setStatus(`Live request failed (${liveResponse.status}): ${detail}`);
          return;
        }

        if (liveResponse.status >= 500) {
          const scored = runMockScore(request);
          setResponse(scored);
          setStatus(`Live endpoint returned ${liveResponse.status}; fallback mock used (${detail || scored.scenario}).`);
          return;
        }
      } catch {
        const scored = runMockScore(request);
        setResponse(scored);
        setStatus(`Live endpoint unavailable; fallback mock used (${scored.scenario}).`);
        return;
      }
    }

    const scored = runMockScore(request);
    setResponse(scored);
    setStatus(
      accessMode === "live"
        ? `Live endpoint unavailable, fallback mock returned (${scored.scenario}).`
        : `Completed. Scenario: ${scored.scenario}.`
    );
  }

  function resetToDefault() {
    setApiKey(sandboxApiKey);
    setRequest(PLAYGROUND_PRESETS[0]?.payload ?? DEFAULT_REQUEST);
    setResponse(null);
    setActivePreset(0);
    setErrors({});
    setStatus("Reset complete. Back to default low-risk scenario.");
  }

  function switchMode(mode: AccessMode) {
    if (mode === "live" && !liveEnabled) {
      setStatus("Sign in to unlock live mode. Sandbox remains available.");
      return;
    }
    setAccessMode(mode);
    setResponse(null);
    setStatus(mode === "live" ? "Live mode selected." : "Sandbox mode selected.");
  }

  return (
    <main className="bg-bg-base px-6 pt-24 pb-16">
      <section className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-5">
          <div className="inline-flex rounded-full border border-bg-border bg-bg-surface px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-text-muted">
            Counterparty Scoring Playground
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-text-primary sm:text-5xl">
            Simulate a real score request without writing any code.
          </h1>
          <p className="max-w-3xl text-lg text-text-secondary">
            This standalone page maps 1:1 to {SCORE_PATH} fields and returns realistic mock responses for fast partner evaluation.
          </p>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-bg-border bg-bg-surface/60 px-4 py-3 text-sm">
            <span className="rounded-md border border-bg-border bg-bg-base px-2 py-1 text-xs text-text-secondary">POST</span>
            <span className="font-mono text-text-primary">{SCORE_PATH}</span>
            <span className="ml-auto rounded-md border border-bg-border bg-bg-base px-2 py-1 text-xs text-text-secondary">
              Mode: {accessMode === "live" ? "Live Account" : "Mock Sandbox"}
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Access mode</div>
            <h2 className="mt-3 text-2xl font-semibold text-text-primary">One playground, two modes</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => switchMode("sandbox")}
                className={`rounded-xl border p-4 text-left transition ${
                  accessMode === "sandbox"
                    ? "border-accent-primary/60 bg-accent-primary/10"
                    : "border-bg-border bg-bg-base hover:bg-bg-elevated"
                }`}
              >
                <div className="text-sm font-semibold text-text-primary">Sandbox (public)</div>
                <div className="mt-1 text-xs text-text-secondary">Mock scoring, preset scenarios, no account required.</div>
              </button>
              <button
                type="button"
                onClick={() => switchMode("live")}
                className={`rounded-xl border p-4 text-left transition ${
                  accessMode === "live"
                    ? "border-accent-primary/60 bg-accent-primary/10"
                    : "border-bg-border bg-bg-base hover:bg-bg-elevated"
                }`}
              >
                <div className="text-sm font-semibold text-text-primary">Live (account)</div>
                <div className="mt-1 text-xs text-text-secondary">Real endpoint attempt with auth, fallback to mock if unavailable.</div>
              </button>
            </div>
            {!liveEnabled ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-bg-base p-3 text-sm text-text-secondary">
                <span>Live mode is locked until sign-in.</span>
                <Link href="/login" className="rounded-md border border-bg-border px-3 py-1.5 text-text-primary hover:bg-bg-elevated">
                  Sign in
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Authentication</div>
            <h2 className="mt-3 text-2xl font-semibold text-text-primary">API credentials</h2>
          </CardHeader>
          <CardContent>
            <Field label="X-API-Key">
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                placeholder={sandboxApiKey || "Enter your API key"}
              />
            </Field>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-secondary">
              <span>
                {accessMode === "live"
                  ? "Using account mode. Keep a valid API key selected for live execution."
                  : "Sandbox mode uses test key flows and mock scoring."}
              </span>
              <button
                type="button"
                onClick={() => setApiKey(sandboxApiKey)}
                className="rounded-md border border-bg-border px-2 py-1 hover:bg-bg-elevated"
              >
                Reset key
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Scenario presets</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Choose an example</h2>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {PLAYGROUND_PRESETS.map((preset, index) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(index)}
                    className={`rounded-xl border p-4 text-left transition ${
                      activePreset === index
                        ? "border-accent-primary/60 bg-accent-primary/10"
                        : "border-bg-border bg-bg-base hover:bg-bg-elevated"
                    }`}
                  >
                    <div className="text-sm font-semibold text-text-primary">{preset.label}</div>
                    <div className="mt-1 text-xs text-text-secondary">{preset.description}</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Request builder</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">{SCORE_PATH}</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-bg-border bg-bg-base/80 p-4 text-xs text-text-secondary">
                  Required: wallet_address, phone_hash, chain, context.rail, context.fiat_currency, context.asset, context.amount, context.side
                </div>
                <Field label="wallet_address" error={errors.wallet_address}>
                  <input
                    value={request.wallet_address}
                    onChange={(event) => setRequest((prev) => ({ ...prev, wallet_address: event.target.value }))}
                    className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                    placeholder="chain-specific wallet address"
                  />
                </Field>

                <Field label="phone_hash (sha256)" error={errors.phone_hash}>
                  <input
                    value={request.phone_hash}
                    onChange={(event) => setRequest((prev) => ({ ...prev, phone_hash: event.target.value }))}
                    className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                    placeholder="64-char sha256 hex"
                  />
                </Field>

                <Field label="chain">
                  <select
                    value={request.chain}
                    onChange={(event) => setRequest((prev) => ({ ...prev, chain: event.target.value as Chain }))}
                    className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                  >
                    {CHAIN_OPTIONS.map((chain) => (
                      <option key={chain} value={chain}>
                        {chain}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="context.rail" error={errors.rail}>
                    <input
                      value={request.context.rail}
                      onChange={(event) => updateContext("rail", event.target.value)}
                      className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                      placeholder="p2p"
                    />
                  </Field>

                  <Field label="context.fiat_currency" error={errors.fiat_currency}>
                    <input
                      value={request.context.fiat_currency}
                      onChange={(event) => updateContext("fiat_currency", event.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                      placeholder="NGN"
                    />
                  </Field>

                  <Field label="context.asset" error={errors.asset}>
                    <input
                      value={request.context.asset}
                      onChange={(event) => updateContext("asset", event.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                      placeholder="USDT"
                    />
                  </Field>

                  <Field label="context.amount" error={errors.amount}>
                    <input
                      type="number"
                      value={request.context.amount}
                      onChange={(event) => updateContext("amount", Number(event.target.value))}
                      className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                      placeholder="1000"
                    />
                  </Field>

                  <Field label="context.side">
                    <select
                        value={request.context.side}
                        onChange={(event) => updateContext("side", event.target.value as ScoreRequest["context"]["side"])}
                      className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                    >
                      <option value="buy">buy</option>
                      <option value="sell">sell</option>
                    </select>
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={runSimulation}>Run simulation</Button>
                  <Button onClick={resetToDefault} variant="secondary">
                    Reset
                  </Button>
                  <span className="text-sm text-text-secondary">{status}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Generated code</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Node.js + Python</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="inline-flex rounded-lg border border-bg-border bg-bg-base p-1">
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("node")}
                    className={`rounded-md px-3 py-1.5 text-xs ${activeCodeTab === "node" ? "bg-bg-elevated text-text-primary" : "text-text-secondary"}`}
                  >
                    Node.js
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("python")}
                    className={`rounded-md px-3 py-1.5 text-xs ${activeCodeTab === "python" ? "bg-bg-elevated text-text-primary" : "text-text-secondary"}`}
                  >
                    Python
                  </button>
                </div>
                {activeCodeTab === "node" ? <CodeBlock title="Node.js" body={nodeSnippet} /> : <CodeBlock title="Python" body={pythonSnippet} />}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Response summary</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Decision output</h2>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryItem label="Score" value={response ? String(response.score) : "-"} />
                  <SummaryItem label="Risk level" value={response ? response.risk_level : "-"} badgeClass={riskBadgeClass} />
                  <SummaryItem label="Recommended action" value={response ? response.recommended_action : "-"} badgeClass={actionBadgeClass} />
                  <SummaryItem label="Flags" value={response ? String(response.flags.length) : "-"} />
                </div>

                {response ? (
                  <div className="mt-4 rounded-xl border border-bg-border bg-bg-base p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Flags</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-primary">
                      {response.flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Response JSON</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Raw payload</h2>
              </CardHeader>
              <CardContent>
                <CodeBlock title="application/json" body={responseJson} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Request JSON</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Current body</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock title="application/json" body={requestJson} />
                <div className="rounded-xl border border-bg-border bg-bg-base p-4 text-sm text-text-secondary">
                  <p>Active endpoint: {endpointBaseUrl}{SCORE_PATH}</p>
                  <p className="mt-1">Model remains the same across sandbox and live modes.</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-text-secondary">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
}

function CodeBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-bg-border bg-[#0b1020] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-text-muted">{title}</div>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-6 text-[#e6edf7]">{body}</pre>
    </div>
  );
}

function SummaryItem({ label, value, badgeClass }: { label: string; value: string; badgeClass?: string }) {
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-base p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</div>
      <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${badgeClass ?? "border-bg-border text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
