"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/api";
import { getStoredSession, type AuthSession } from "@/lib/auth";
import { createJsonHeaders, requestErrorMessage } from "@/lib/http";
import {
  DEFAULT_REQUEST,
  LIVE_SCORE_PATH,
  PLAYGROUND_PRESETS,
  SANDBOX_SCORE_PATH,
  getMockBaseUrl,
  getRecommendedAction,
  getSandboxApiKey,
  normalizeTrustResponse,
  runMockScore,
  type LiveTrustPayload,
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
  const scorePath = accessMode === "live" ? LIVE_SCORE_PATH : SANDBOX_SCORE_PATH;
  const endpointBaseUrl = accessMode === "live" ? API_BASE_URL : mockBaseUrl;

  const requestJson = useMemo(() => JSON.stringify(request, null, 2), [request]);
  const responseJson = useMemo(() => (response ? JSON.stringify(response, null, 2) : "{}"), [response]);

  const nodeSnippet = useMemo(
    () =>
      `const response = await fetch("${endpointBaseUrl}${scorePath}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "X-API-Key": "${apiKey || sandboxApiKey || "<your_api_key>"}"${accessMode === "live" ? ',\\n    "Authorization": "Bearer <access_token>"' : ""}\n  },\n  body: JSON.stringify(${requestJson})\n});\n\nconst data = await response.json();\nconsole.log(data);`,
    [accessMode, apiKey, endpointBaseUrl, requestJson, sandboxApiKey, scorePath]
  );

  const pythonSnippet = useMemo(
    () =>
      `import requests\n\npayload = ${requestJson}\n\nresponse = requests.post(\n    "${endpointBaseUrl}${scorePath}",\n    headers={\n        "Content-Type": "application/json",\n        "X-API-Key": "${apiKey || sandboxApiKey || "<your_api_key>"}",${accessMode === "live" ? '\n        "Authorization": "Bearer <access_token>",' : ""}\n    },\n    json=payload,\n)\n\nprint(response.json())`,
    [accessMode, apiKey, endpointBaseUrl, requestJson, sandboxApiKey, scorePath]
  );

  const riskBadgeClass =
    response?.risk_level === "high"
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : response?.risk_level === "medium"
        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

  const actionBadgeClass =
    getRecommendedAction(response?.risk_level) === "block"
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : getRecommendedAction(response?.risk_level) === "review"
        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

  const signalNames = response?.signals.map((signal) => signal.name) ?? [];

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

        const liveResponse = await fetch(`${API_BASE_URL}${LIVE_SCORE_PATH}`, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(request),
        });

        if (liveResponse.ok) {
          const payload = (await liveResponse.json()) as LiveTrustPayload;
          const normalized = normalizeTrustResponse(payload);
          setResponse(normalized);
          setStatus("Live request completed.");
          return;
        }

        const detail = await requestErrorMessage(liveResponse, `Request failed with status ${liveResponse.status}`);
        if (liveResponse.status === 404 || liveResponse.status === 405) {
          const scored = runMockScore(request);
          setResponse(scored);
          setStatus(`Live route not found (${liveResponse.status}); fallback mock used.`);
          return;
        }

        if (liveResponse.status >= 400 && liveResponse.status < 500) {
          setResponse(null);
          setStatus(`Live request failed (${liveResponse.status}): ${detail}`);
          return;
        }

        if (liveResponse.status >= 500) {
          const scored = runMockScore(request);
          setResponse(scored);
          setStatus(`Live endpoint returned ${liveResponse.status}; fallback mock used (${detail || "sandbox response"}).`);
          return;
        }
      } catch {
        const scored = runMockScore(request);
        setResponse(scored);
        setStatus("Live endpoint unavailable; fallback mock used.");
        return;
      }
    }

    const scored = runMockScore(request);
    setResponse(scored);
    setStatus(accessMode === "live" ? "Live endpoint unavailable, fallback mock returned." : "Completed in sandbox mode.");
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
            Test the API without writing code
          </h1>
          <p className="max-w-3xl text-lg text-text-secondary">
            Simulate real trust score requests with mock data. Switch to live mode to test with your actual API credentials.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Request Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Configuration</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Set up your request</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-text-primary mb-2">Mode</div>
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={() => switchMode("sandbox")}
                        className={`rounded-lg border p-3 text-left transition ${
                          accessMode === "sandbox"
                            ? "border-accent-primary/60 bg-accent-primary/10"
                            : "border-bg-border bg-bg-base hover:bg-bg-elevated"
                        }`}
                      >
                        <div className="text-sm font-medium text-text-primary">Sandbox</div>
                        <div className="text-xs text-text-secondary">Mock responses, no auth required</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode("live")}
                        className={`rounded-lg border p-3 text-left transition ${
                          accessMode === "live"
                            ? "border-accent-primary/60 bg-accent-primary/10"
                            : "border-bg-border bg-bg-base hover:bg-bg-elevated"
                        }`}
                      >
                        <div className="text-sm font-medium text-text-primary">Live</div>
                        <div className="text-xs text-text-secondary">Real API calls with authentication</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-text-primary mb-2">API Key</div>
                    <input
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                      placeholder={sandboxApiKey || "Enter your API key"}
                    />
                    <button
                      type="button"
                      onClick={() => setApiKey(sandboxApiKey)}
                      className="mt-2 text-xs text-text-secondary hover:text-text-primary"
                    >
                      Reset to default
                    </button>
                  </div>
                </div>

                {!liveEnabled && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                    Live mode requires authentication. <Link href="/login" className="font-medium text-text-primary underline">Sign in</Link> to unlock it.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Parameters</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Request payload</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-bg-border bg-bg-base/80 p-3 text-sm text-text-secondary">
                  Required: entity_id, amount, currency. Context fields provide additional metadata.
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="entity_id" error={errors.entity_id}>
                    <input
                      value={request.entity_id}
                      onChange={(event) => setRequest((prev) => ({ ...prev, entity_id: event.target.value }))}
                      className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                      placeholder="counterparty identifier"
                    />
                  </Field>

                  <Field label="amount" error={errors.amount}>
                    <input
                      type="number"
                      value={request.amount}
                      onChange={(event) => setRequest((prev) => ({ ...prev, amount: Number(event.target.value) }))}
                      className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                      placeholder="100"
                    />
                  </Field>

                  <Field label="currency" error={errors.currency}>
                    <input
                      value={request.currency}
                      onChange={(event) => setRequest((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                      className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                      placeholder="USDT"
                    />
                  </Field>

                  <Field label="context.channel">
                    <input
                      value={request.context.channel ?? ""}
                      onChange={(event) => updateContext("channel", event.target.value)}
                      className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                      placeholder="playground"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="context.rail" error={errors.rail}>
                    <input
                      value={request.context.rail}
                      onChange={(event) => updateContext("rail", event.target.value)}
                      className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                      placeholder="p2p"
                    />
                  </Field>

                  <Field label="context.fiat_currency" error={errors.fiat_currency}>
                    <input
                      value={request.context.fiat_currency}
                      onChange={(event) => updateContext("fiat_currency", event.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                      placeholder="NGN"
                    />
                  </Field>

                  <Field label="context.asset" error={errors.asset}>
                    <input
                      value={request.context.asset}
                      onChange={(event) => updateContext("asset", event.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                      placeholder="USDT"
                    />
                  </Field>
                </div>

                <Field label="context.side" error={errors.side}>
                  <select
                    value={request.context.side}
                    onChange={(event) => updateContext("side", event.target.value as ScoreRequest["context"]["side"])}
                    className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary"
                  >
                    <option value="buy">buy</option>
                    <option value="sell">sell</option>
                  </select>
                </Field>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={runSimulation}>Send Request</Button>
                  <Button onClick={resetToDefault} variant="secondary">
                    Reset
                  </Button>
                  <span className="text-sm text-text-secondary">{status}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Examples</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Preset scenarios</h2>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PLAYGROUND_PRESETS.map((preset, index) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(index)}
                      className={`rounded-lg border p-3 text-left transition ${
                        activePreset === index
                          ? "border-accent-primary/60 bg-accent-primary/10"
                          : "border-bg-border bg-bg-base hover:bg-bg-elevated"
                      }`}
                    >
                      <div className="text-sm font-medium text-text-primary">{preset.label}</div>
                      <div className="mt-1 text-xs text-text-secondary">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Response Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Results</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">API Response</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {response ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-bg-border bg-bg-base p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-text-muted">Score</div>
                        <div className="mt-2 text-2xl font-semibold text-text-primary">{response.score}</div>
                      </div>
                      <div className="rounded-lg border border-bg-border bg-bg-base p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-text-muted">Risk Level</div>
                        <div className="mt-2 text-sm font-medium text-text-primary">{response.risk_level}</div>
                        <div className="mt-1 text-xs text-text-secondary">{getRecommendedAction(response.risk_level)}</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-bg-border bg-bg-base p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-text-muted">Signals ({response.signals.length})</div>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {signalNames.map((signalName) => (
                          <li key={signalName} className="rounded-full border border-bg-border bg-bg-surface px-2 py-1 text-xs text-text-primary">
                            {signalName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-bg-border bg-bg-base p-8 text-center text-text-secondary">
                    <div className="text-sm">No response yet</div>
                    <div className="mt-1 text-xs">Configure your request and click &quot;Send Request&quot;</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Raw Data</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">JSON Payloads</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-text-primary mb-2">Request</div>
                  <CodeBlock title="application/json" body={requestJson} />
                </div>
                {response && (
                  <div>
                    <div className="text-sm font-medium text-text-primary mb-2">Response</div>
                    <CodeBlock title="application/json" body={responseJson} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Code Samples</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Implementation</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="inline-flex overflow-hidden rounded-lg border border-bg-border bg-bg-base">
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("node")}
                    className={`px-3 py-2 text-xs ${activeCodeTab === "node" ? "bg-bg-elevated text-text-primary" : "text-text-secondary"}`}
                  >
                    Node.js
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("python")}
                    className={`px-3 py-2 text-xs ${activeCodeTab === "python" ? "bg-bg-elevated text-text-primary" : "text-text-secondary"}`}
                  >
                    Python
                  </button>
                </div>
                {activeCodeTab === "node" ? <CodeBlock title="Node.js" body={nodeSnippet} /> : <CodeBlock title="Python" body={pythonSnippet} />}
              </CardContent>
            </Card>
          </div>
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
