"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getStoredSession, type AuthSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

type PlatformMetrics = {
  total_integrations: number;
  active_platforms: number;
  total_trust_scores: number;
  risk_assessments_today: number;
  disputes_resolved: number;
  avg_response_time: number;
  system_uptime: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
};

type Dispute = {
  id: string;
  platform: string;
  counterparty: string;
  amount: number;
  currency: string;
  risk_level: string;
  status: string;
  created_at: string;
};

const platformMonitors = [
  { name: "Binance P2P", throughput: "3.8k checks", status: "healthy", note: "Stable callback success with low risk drift." },
  { name: "Paxful KE", throughput: "1.4k checks", status: "review", note: "Slight increase in manual reviews from mobile-origin trades." },
  { name: "Noones NG", throughput: "980 checks", status: "healthy", note: "Below latency budget and resolving cleanly." },
];

const operationFeed = [
  { title: "Policy threshold update", detail: "High-risk dispute escalation threshold increased for USDT off-ramp lanes.", owner: "Risk Ops" },
  { title: "Partner onboarding", detail: "Two new platform environments are awaiting production key activation.", owner: "Integrations" },
  { title: "Evidence review backlog", detail: "Three disputes are waiting on external payout confirmations.", owner: "Case Desk" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [recentDisputes, setRecentDisputes] = useState<Dispute[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      router.replace("/login");
      return;
    }

    if (stored.role !== "admin" && stored.role !== "platform_admin") {
      router.replace("/dashboard/app");
      return;
    }

    setSession(stored);

    Promise.all([
      apiRequest<PlatformMetrics>("/api/v1/admin/platform/metrics").then(setMetrics),
      apiRequest<Dispute[]>("/api/v1/admin/disputes/recent").then(setRecentDisputes)
    ]).catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load dashboard data"));
  }, [router]);

  if (!session) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <DashboardShell session={session}>
      <section className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-text-primary">Platform Administration</h1>
          <p className="text-text-secondary">
            Monitor counterparty risk scoring performance and manage dispute resolution across integrated platforms.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminKpi
            label="Integrated Platforms"
            value={metrics ? metrics.total_integrations.toString() : "Loading"}
            detail="Live and staged partner connections under management."
          />
          <AdminKpi
            label="Trust Scores Generated"
            value={metrics ? metrics.total_trust_scores.toLocaleString() : "Loading"}
            detail="Cross-platform assessments completed by the network."
          />
          <AdminKpi
            label="Assessments Today"
            value={metrics ? metrics.risk_assessments_today.toLocaleString() : "Loading"}
            detail="Active traffic processed through the fraud-intelligence layer."
          />
          <AdminKpi
            label="System Uptime"
            value={metrics ? `${metrics.system_uptime}%` : "Loading"}
            detail="Service availability across risk scoring and dispute surfaces."
          />
        </div>

        <div id="platform-ops" className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
          <Card>
            <CardHeader>
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Platform Overview</div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">Network Operations</h2>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
              ) : metrics ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Stat label="Total Integrations" value={metrics.total_integrations.toString()} />
                  <Stat label="Active Platforms" value={metrics.active_platforms.toString()} />
                  <Stat label="Trust Scores Generated" value={metrics.total_trust_scores.toLocaleString()} />
                  <Stat label="Assessments Today" value={metrics.risk_assessments_today.toLocaleString()} />
                  <Stat label="System Uptime" value={`${metrics.system_uptime}%`} />
                  <Stat label="Avg Response Time" value={`${metrics.avg_response_time}ms`} />
                  <div className="rounded-2xl border border-bg-border bg-bg-base px-4 py-4 sm:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Command status</div>
                        <div className="mt-2 text-lg font-semibold text-text-primary">Platform policies are synchronized across active partners</div>
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        In sync
                      </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm text-text-secondary">
                      Monitoring, scoring, and dispute workflows are available for all active environments. Pending work is limited to onboarding and evidence collection.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Loading platform metrics…</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Risk Distribution</div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">Assessment Breakdown</h2>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-400">Low Risk</span>
                    <span className="text-sm font-medium">{metrics.risk_distribution.low}%</span>
                  </div>
                  <div className="w-full bg-bg-border rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: `${metrics.risk_distribution.low}%` }}></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-yellow-400">Medium Risk</span>
                    <span className="text-sm font-medium">{metrics.risk_distribution.medium}%</span>
                  </div>
                  <div className="w-full bg-bg-border rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${metrics.risk_distribution.medium}%` }}></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-400">High Risk</span>
                    <span className="text-sm font-medium">{metrics.risk_distribution.high}%</span>
                  </div>
                  <div className="w-full bg-bg-border rounded-full h-2">
                    <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${metrics.risk_distribution.high}%` }}></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-400">Critical Risk</span>
                    <span className="text-sm font-medium">{metrics.risk_distribution.critical}%</span>
                  </div>
                  <div className="w-full bg-bg-border rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{ width: `${metrics.risk_distribution.critical}%` }}></div>
                  </div>

                  <div className="space-y-3 border-t border-bg-border pt-5">
                    {platformMonitors.map((item) => (
                      <div key={item.name} className="rounded-xl border border-bg-border bg-bg-base px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-text-primary">{item.name}</div>
                            <div className="text-xs text-text-muted">{item.throughput}</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.status === "healthy" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-text-secondary">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Loading risk distribution…</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
          <Card id="disputes">
            <CardHeader>
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Dispute Management</div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">Recent Disputes</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDisputes.map((dispute) => (
                  <div key={dispute.id} className="flex items-center justify-between gap-4 rounded-xl border border-bg-border bg-bg-base/50 p-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-3">
                        <span className="text-sm font-medium text-text-primary">{dispute.platform}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          dispute.risk_level === "high" ? "bg-red-500/20 text-red-300" :
                          dispute.risk_level === "medium" ? "bg-yellow-500/20 text-yellow-300" :
                          "bg-green-500/20 text-green-300"
                        }`}>
                          {dispute.risk_level}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          dispute.status === "resolved" ? "bg-green-500/20 text-green-300" :
                          "bg-yellow-500/20 text-yellow-300"
                        }`}>
                          {dispute.status}
                        </span>
                      </div>
                      <div className="text-sm text-text-secondary">
                        Counterparty: {dispute.counterparty} • {dispute.amount.toLocaleString()} {dispute.currency}
                      </div>
                    </div>
                    <div className="text-xs text-text-muted">
                      {new Date(dispute.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Operations Feed</div>
              <h2 className="mt-3 text-2xl font-semibold text-text-primary">Admin Follow-Ups</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {operationFeed.map((item) => (
                <div key={item.title} className="rounded-xl border border-bg-border bg-bg-base px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-text-primary">{item.title}</div>
                    <span className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-text-secondary">{item.owner}</span>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </DashboardShell>
  );
}

function AdminKpi({ label, value, detail }: { label: string; value: string; detail: string }) {
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
      <div className="mt-2 text-sm font-semibold text-text-primary break-all">{value}</div>
    </div>
  );
}
