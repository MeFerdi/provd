"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearSession, getDashboardPath, getStoredSession, type AuthSession } from "@/lib/auth";

export function AuthCta() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  if (!session) {
    return <Button href="/login">Sign in</Button>;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex flex-col text-right">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Signed in</span>
        <span className="text-sm text-text-primary capitalize">{session.role}</span>
      </div>
      <Button href={getDashboardPath(session.role)}>Dashboard</Button>
      <button
        type="button"
        className="text-sm text-text-secondary hover:text-text-primary transition"
        onClick={() => {
          clearSession();
          setSession(null);
        }}
      >
        Logout
      </button>
    </div>
  );
}
