"use client";

import { useEffect, useMemo, useState } from "react";

export type AuthRole = "admin" | "service" | "user" | (string & {});

export type AuthSession = {
  accessToken: string;
  tokenType: "bearer";
  role: AuthRole;
  scopes: string[];
  expiresIn: number;
  authType?: "bearer" | "api_key";
  principalId?: string;
  apiKey?: string;
};

const SESSION_KEY = "provd.session";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function isAdminRole(role?: string): boolean {
  return role === "admin" || role === "platform_admin";
}

export function getDashboardPath(role?: string): string {
  return isAdminRole(role) ? "/dashboard/admin" : "/dashboard/app";
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000", []);

  return { session, setSession, apiBaseUrl };
}
