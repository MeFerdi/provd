"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getStoredSession, type AuthSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

type ClientMetrics = {
  total_trust_scores: number;
  active_integrations: number;
  risk_assessments_today: number;
  avg_trust_score: number;
  disputes_avoided: number;
  platform_coverage: number;
  response_time: number;
};

type TrustScore = {
  id: string;
  counterparty: string;
  score: number;
  risk_level: string;
  platform: string;
  last_updated: string;
  transaction_volume: number;
  currency: string;
};

const counterpartyWatchlist = [
  { name: "merchant_345678", region: "Kenya", risk: "medium", trades: 28, recommendation: "step-up verification" },
  { name: "user_123456", region: "Nigeria", risk: "low", trades: 44, recommendation: "auto-approve" },
  { name: "trader_789012", region: "Ghana", risk: "high", trades: 9, recommendation: "manual review" },
];

const actionQueue = [
  { title: "Large NGN off-ramp review", state: "Needs analyst", eta: "12 min", note: "Amount exceeds standard release threshold." },
  { title: "Repeat device fingerprint", state: "Monitor", eta: "Passive", note: "Seen across two counterparties in the last 24h." },
  { title: "Settlement callback audit", state: "Healthy", eta: "Live", note: "No failed callbacks in the current release window." },
];

const integrationChecklist = [
  { label: "Scoring endpoint uptime", value: "99.98%", tone: "good" },
  { label: "Average API latency", value: "< 100 ms", tone: "good" },
  { label: "Escalated releases today", value: "11 trades", tone: "warn" },
  { label: "Missing KYC payloads", value: "2 platforms", tone: "warn" },
];

export default function ClientDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [recentScores, setRecentScores] = useState<TrustScore[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      router.replace("/login");
      return;
    }

    if (stored.role !== "client" && stored.role !== "platform_client") {
      router.replace("/dashboard/admin");
      return;
    }

    setSession(stored);

    Promise.all([
      apiRequest<ClientMetrics>("/api/v1/client/metrics").then(setMetrics),
      apiRequest<TrustScore[]>("/api/v1/client/recent-scores").then(setRecentScores)
    ]).catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load dashboard data"));
  }, [router]);

  if (!session) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <DashboardShell session={session}>
      <section className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-text-primary">Counterparty Intelligence</h1>
          <p className="text-text-secondary">
            Monitor trust scores, assess counterparty risk, and optimize your P2P trading decisions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Trust Scores Generated"
            value={metrics ? metrics.total_trust_scores.toLocaleString() : "Loading"}
            detail="Total decisions routed through the scoring layer."
          />
          <KpiCard
            label="Assessments Today"
            value={metrics ? metrics.risk_assessments_today.toLocaleString() : "Loading"}
            detail="Current day release checks across your connected desks."
          />
          <KpiCard
            label="Average Trust Score"
            value={metrics ? `${metrics.avg_trust_score}%` : "Loading"}
            detail="Blended score across the most recent evaluated counterparties."
          />
          <KpiCard
            label="Protected Volume"
            value={metrics ? `${metrics.disputes_avoided.toLocaleString()} saves` : "Loading"}
            detail="Trades prevented from entering avoidable dispute flows."
          />
        </div>

        <div id="integrations" className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
          <Card>
            <CardHeader>
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Performance Overview</div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">Release Decisioning</h2>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
              ) : metrics ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Stat label="Active Integrations" value={metrics.active_integrations.toString()} />
                  <Stat label="Platform Coverage" value={`${metrics.platform_coverage}%`} />
                  <Stat label="Disputes Avoided" value={metrics.disputes_avoided.toLocaleString()} />
                  <Stat label="Average Response Time" value={`${metrics.response_time}ms`} />
                  <div className="rounded-2xl border border-bg-border bg-bg-base px-4 py-4 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Approval posture</div>
                        <div className="mt-2 text-lg font-semibold text-text-primary">Balanced automation with review guardrails</div>
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        Stable
                      </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm text-text-secondary">
                      Low-risk releases can continue automatically while medium and high-risk cases are being routed into an analyst queue with supporting context.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Loading performance metrics…</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">System Status</div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">Integration Health</h2>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Platform Coverage</span>
                      <span className="font-medium text-text-primary">{metrics.platform_coverage}%</span>
                    </div>
                    <div className="w-full bg-bg-border rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${metrics.platform_coverage}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Average Trust Score</span>
                      <span className="font-medium text-text-primary">{metrics.avg_trust_score}%</span>
                    </div>
                    <div className="w-full bg-bg-border rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{ width: `${metrics.avg_trust_score}%` }}></div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-text-primary">{metrics.response_time}ms</div>
                      <div className="text-xs text-text-muted uppercase tracking-[0.1em]">Avg Response Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-text-primary">{metrics.active_integrations}</div>
                      <div className="text-xs text-text-muted uppercase tracking-[0.1em]">Active Platforms</div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-bg-border pt-5">
                    {integrationChecklist.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-bg-base px-4 py-3">
                        <span className="text-sm text-text-secondary">{item.label}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.tone === "good"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Loading integration health…</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
          <Card id="scores">
            <CardHeader>
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Recent Assessments</div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">Latest Trust Scores</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentScores.map((score) => (
                  <div key={score.id} className="flex items-center justify-between gap-4 rounded-xl border border-bg-border bg-bg-base/50 p-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-3">
                        <span className="text-sm font-medium text-text-primary">{score.counterparty}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          score.risk_level === "low" ? "bg-green-500/20 text-green-300" :
                          score.risk_level === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                          score.risk_level === "high" ? "bg-orange-500/20 text-orange-300" :
                          "bg-red-500/20 text-red-300"
                        }`}>
                          {score.risk_level} risk
                        </span>
                        <span className="text-xs text-text-muted">{score.platform}</span>
                      </div>
                      <div className="text-sm text-text-secondary">
                        Trust Score: {score.score}% • Volume: {score.transaction_volume.toLocaleString()} {score.currency}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-text-primary">{score.score}%</div>
                      <div className="text-xs text-text-muted">
                        {new Date(score.last_updated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Watchlist</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Monitored Counterparties</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {counterpartyWatchlist.map((item) => (
                  <div key={item.name} className="rounded-xl border border-bg-border bg-bg-base px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-text-primary">{item.name}</div>
                        <div className="text-xs text-text-muted">{item.region} • {item.trades} prior trades</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.risk === "low"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : item.risk === "medium"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-red-500/15 text-red-300"
                      }`}>
                        {item.risk}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-text-secondary">{item.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Action Queue</div>
                <h2 className="mt-3 text-2xl font-semibold text-text-primary">Operator Follow-Ups</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionQueue.map((item) => (
                  <div key={item.title} className="rounded-xl border border-bg-border bg-bg-base px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-text-primary">{item.title}</div>
                      <span className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-text-secondary">{item.eta}</span>
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.14em] text-text-muted">{item.state}</div>
                    <p className="mt-2 text-sm text-text-secondary">{item.note}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

function KpiCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-text-muted">{label}</div>
        <div className="text-2xl font-semibold text-text-primary">{value}</div>
        <p className="text-sm text-text-secondary">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bg-border bg-bg-base px-4 py-3">
      <div className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</div>
      <div className="mt-2 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}
