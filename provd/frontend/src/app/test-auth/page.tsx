"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { saveSession, type AuthSession } from "@/lib/auth";
import { isTestAuthEnabled } from "@/lib/env";

const MOCK_USERS = {
  admin: {
    role: "admin",
    description: "Admin Dashboard - Full system access"
  },
  client: {
    role: "client",
    description: "Client Dashboard - API user access"
  }
};

export default function TestAuthPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const nextEnabled = isTestAuthEnabled();
    setEnabled(nextEnabled);

    if (!nextEnabled) {
      router.replace("/login");
    }
  }, [router]);

  const handleLogin = async (userType: "admin" | "client") => {
    if (!enabled) {
      return;
    }

    const user = MOCK_USERS[userType];

    const mockSession: AuthSession = {
      accessToken: `mock-token-${userType}-${Date.now()}`,
      tokenType: "bearer",
      role: user.role,
      scopes: ["read", "write"],
      expiresIn: 3600,
    };

    saveSession(mockSession);

    router.push(user.role === "admin" ? "/dashboard/admin" : "/dashboard/app");
  };

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-bg-base px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Test Authentication</div>
            <h1 className="mt-3 text-3xl font-semibold text-text-primary">Choose a user to test dashboards</h1>
            <p className="mt-2 text-text-secondary">
              Select an account type to view the corresponding dashboard with mock authentication.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Internal beta access only. Enable this page with `NEXT_PUBLIC_ENABLE_TEST_AUTH=true`.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-bg-border bg-bg-base p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Admin User</h3>
                <p className="text-sm text-text-secondary mb-4">
                  {MOCK_USERS.admin.description}
                </p>
                <Button
                  onClick={() => handleLogin("admin")}
                  className="w-full"
                >
                  Login as Admin
                </Button>
              </div>

              <div className="rounded-xl border border-bg-border bg-bg-base p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Client User</h3>
                <p className="text-sm text-text-secondary mb-4">
                  {MOCK_USERS.client.description}
                </p>
                <Button
                  onClick={() => handleLogin("client")}
                  className="w-full"
                >
                  Login as Client
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-bg-border bg-bg-surface p-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">How to use:</h4>
              <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                <li>Use this page only for internal UI validation.</li>
                <li>Choose an internal role simulation and you&apos;ll be redirected to the matching dashboard.</li>
                <li>Use the regular login page with backend-issued credentials for staging and production authentication.</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
