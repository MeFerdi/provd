"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getDashboardPath, getStoredSession, saveSession } from "@/lib/auth";
import { loginWithCredentials } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState("provd-dev-client");
  const [clientSecret, setClientSecret] = useState("provd-dev-secret");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      router.replace(getDashboardPath(session.role));
    }
  }, [router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await loginWithCredentials(clientId, clientSecret);
      saveSession(session);
      router.push(getDashboardPath(session.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-bg-base px-6 py-20">
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Sign in</div>
            <h1 className="mt-3 text-3xl font-semibold text-text-primary">Access your dashboard</h1>
            <p className="mt-2 text-text-secondary">
              Use your bearer credentials to sign in. Your token role determines whether you land in the admin or API-user dashboard.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-2">
                <span className="text-sm text-text-secondary">Client ID</span>
                <input
                  className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-text-secondary">Client secret</span>
                <input
                  className="w-full rounded-xl border border-bg-border bg-bg-base px-4 py-3 text-text-primary outline-none focus:border-accent-primary"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
