"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Activity, BarChart3, BookOpen, Building2, ChevronRight, LifeBuoy, Scale, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clearSession, type AuthSession, getDashboardPath } from "@/lib/auth";

export function DashboardShell({ session, children }: { session: AuthSession; children: ReactNode }) {
  const isAdmin = useMemo(() => session.role === "admin" || session.role === "platform_admin", [session.role]);
  const navigation = useMemo(
    () =>
      isAdmin
        ? [
            { href: "/dashboard/admin", label: "Overview", icon: BarChart3 },
            { href: "/dashboard/admin#platform-ops", label: "Platform Ops", icon: Building2 },
            { href: "/dashboard/admin#disputes", label: "Disputes", icon: Scale },
            { href: "/docs/api-reference", label: "API Reference", icon: BookOpen },
          ]
        : [
            { href: "/dashboard/app", label: "Overview", icon: BarChart3 },
            { href: "/dashboard/app#scores", label: "Trust Scores", icon: ShieldCheck },
            { href: "/dashboard/app#integrations", label: "Integrations", icon: Activity },
            { href: "/docs/quickstart", label: "Quickstart", icon: LifeBuoy },
          ],
    [isAdmin]
  );
  const roleLabel = isAdmin ? "platform administrator" : "client operator";

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-bg-border bg-bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href={getDashboardPath(session.role)} className="flex items-center gap-3">
            <Image
              src="/provd.svg"
              alt="Provd logo"
              width={480}
              height={240}
              className="h-11 w-auto"
              priority
            />
            <div>
              <div className="text-sm font-semibold text-text-primary">Provd Control Center</div>
              <div className="text-xs text-text-secondary capitalize">{roleLabel}</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-text-secondary">
              <span className="rounded-full border border-bg-border px-3 py-1">{session.scopes.length} scopes</span>
              <span className="rounded-full border border-bg-border px-3 py-1">{isAdmin ? "admin workspace" : "client workspace"}</span>
            </div>
            <Button href={isAdmin ? "/docs/api-reference" : "/docs/quickstart"} variant="secondary">
              Docs
            </Button>
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

      <div className="mx-auto grid max-w-7xl items-start gap-6 px-6 pb-8 pt-28 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-bg-border bg-bg-surface/70 p-4 lg:sticky lg:top-24">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-text-muted">Navigation</div>
          <div className="flex flex-col gap-2 text-sm">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
                  href={item.href}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </span>
                  <ChevronRight size={14} />
                </Link>
              );
            })}
          </div>
        </aside>

        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
