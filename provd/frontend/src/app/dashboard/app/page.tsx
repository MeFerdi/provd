"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getDashboardPath, getStoredSession, type AuthSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

type TrustResponse = {
  entity_id: string;
  score: number;
  risk_level: string;
  cached: boolean;
};

export default function ApiUserDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [trust, setTrust] = useState<TrustResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      router.replace("/login");
      return;
    }

    const dashboardPath = getDashboardPath(stored.role);
    if (dashboardPath === "/dashboard/admin") {
      router.replace(dashboardPath);
      return;
    }
    setSession(stored);

    apiRequest<TrustResponse>("/api/v1/trust/score", {
      method: "POST",
      body: JSON.stringify({ entity_id: "dashboard-demo", amount: 100, currency: "USDT" }),
    })
      .then(setTrust)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load trust score"));
  }, [router]);

  if (!session) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <DashboardShell session={session}>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">API user overview</div>
            <h1 className="mt-3 text-3xl font-semibold text-text-primary">Your integration side</h1>
            <p className="mt-2 text-text-secondary">
              Review the scopes granted to your session and keep an eye on the trust score endpoint behavior.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Stat label="Role" value={session.role} />
            <Stat label="Scopes" value={String(session.scopes.length)} />
            <Stat label="Dashboard" value={getDashboardPath(session.role).replace("/dashboard/", "")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Trust score</div>
            <h2 className="mt-3 text-2xl font-semibold text-text-primary">Demo request status</h2>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
            ) : trust ? (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Entity <span className="font-medium text-text-primary">{trust.entity_id}</span> scored {trust.score.toFixed(1)}.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Risk level" value={trust.risk_level} />
                  <Stat label="Cached" value={trust.cached ? "yes" : "no"} />
                  <Stat label="Score" value={trust.score.toFixed(1)} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Loading trust score…</p>
            )}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
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