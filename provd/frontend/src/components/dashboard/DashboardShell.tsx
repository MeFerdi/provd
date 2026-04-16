"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { clearSession, type AuthSession, getDashboardPath } from "@/lib/auth";

export function DashboardShell({ session, children }: { session: AuthSession; children: ReactNode }) {
  const isAdmin = useMemo(() => session.role === "admin" || session.role === "platform_admin", [session.role]);

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-bg-border bg-bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href={getDashboardPath(session.role)} className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary font-semibold">
              P
            </span>
            <div>
              <div className="text-sm font-semibold text-text-primary">Provd Dashboard</div>
              <div className="text-xs text-text-secondary capitalize">{session.role}</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-text-secondary">
              <span className="rounded-full border border-bg-border px-3 py-1">{session.scopes.length} scopes</span>
              <span className="rounded-full border border-bg-border px-3 py-1">{isAdmin ? "admin view" : "api user view"}</span>
            </div>
            <Button href="/docs/quickstart" variant="secondary">Docs</Button>
            <button
              type="button"
              className="rounded-md border border-bg-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface transition"
              onClick={() => {
                clearSession();
                window.location.href = "/login";
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-bg-border bg-bg-surface/70 p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-text-muted">Navigation</div>
          <div className="flex flex-col gap-2 text-sm">
            <Link className="rounded-xl px-3 py-2 hover:bg-bg-elevated transition" href={getDashboardPath(session.role)}>
              Overview
            </Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-bg-elevated transition" href="/dashboard/app">
              API User Dashboard
            </Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-bg-elevated transition" href="/dashboard/admin">
              Admin Dashboard
            </Link>
            <Link className="rounded-xl px-3 py-2 hover:bg-bg-elevated transition" href="/docs/api-reference">
              API Reference
            </Link>
          </div>
        </aside>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
