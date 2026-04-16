"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getStoredSession, type AuthSession } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

type RuntimeConfig = {
  broker_url: string;
  result_backend: string;
  task_default_queue: string;
  beat_schedule_size: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
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

    apiRequest<RuntimeConfig>("/api/v1/admin/celery/runtime")
      .then(setConfig)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load runtime configuration"));
  }, [router]);

  if (!session) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <DashboardShell session={session}>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Admin overview</div>
            <h1 className="mt-3 text-3xl font-semibold text-text-primary">Operations control plane</h1>
            <p className="mt-2 text-text-secondary">
              Inspect worker runtime settings and confirm background jobs are wired as expected.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Stat label="Role" value={session.role} />
            <Stat label="Scopes" value={String(session.scopes.length)} />
            <Stat label="Access" value="restricted" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Celery runtime</div>
            <h2 className="mt-3 text-2xl font-semibold text-text-primary">Worker configuration</h2>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
            ) : config ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label="Broker" value={config.broker_url} />
                <Stat label="Backend" value={config.result_backend} />
                <Stat label="Queue" value={config.task_default_queue} />
                <Stat label="Beat jobs" value={String(config.beat_schedule_size)} />
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Loading runtime configuration…</p>
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
      <div className="mt-2 text-sm font-semibold text-text-primary break-all">{value}</div>
    </div>
  );
}
