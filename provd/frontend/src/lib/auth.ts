"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/env";
import { SESSION_STORAGE_KEY } from "@/lib/storage-keys";
import {
  readSessionStorageItem,
  readStorageItem,
  removeSessionStorageItem,
  removeStorageItem,
  writeSessionStorageItem,
} from "@/lib/storage";

export type AuthRole = "admin" | "service" | "user" | (string & {});

export type AuthSession = {
  accessToken: string;
  tokenType: "bearer";
  role: AuthRole;
  scopes: string[];
  expiresIn: number;
  expiresAt?: number;
  authType?: "bearer" | "api_key";
  principalId?: string;
  apiKey?: string;
};

function isSessionExpired(session: AuthSession): boolean {
  if (!Number.isFinite(session.expiresAt)) return true;
  return Date.now() >= Number(session.expiresAt);
}

function parseSession(raw: string): AuthSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;

    if (!parsed || typeof parsed.accessToken !== "string" || parsed.accessToken.length === 0) {
      return null;
    }

    const expiresIn = Number(parsed.expiresIn);
    const expiresAt =
      typeof parsed.expiresAt === "number" && Number.isFinite(parsed.expiresAt)
        ? parsed.expiresAt
        : Date.now() + Math.max(0, expiresIn || 0) * 1000;

    const session: AuthSession = {
      accessToken: parsed.accessToken,
      tokenType: "bearer",
      role: (parsed.role ?? "user") as AuthRole,
      scopes: Array.isArray(parsed.scopes) ? parsed.scopes : [],
      expiresIn: Number.isFinite(expiresIn) ? expiresIn : 0,
      expiresAt,
      authType: parsed.authType,
      principalId: parsed.principalId,
      apiKey: parsed.apiKey,
    };

    return session;
  } catch {
    return null;
  }
}

export function getStoredSession(): AuthSession | null {
  const sessionRaw = readSessionStorageItem(SESSION_STORAGE_KEY);

  if (sessionRaw) {
    const session = parseSession(sessionRaw);
    if (!session || isSessionExpired(session)) {
      clearSession();
      return null;
    }
    return session;
  }

  // Legacy fallback: migrate old localStorage session to sessionStorage.
  const legacyRaw = readStorageItem(SESSION_STORAGE_KEY);
  if (!legacyRaw) return null;

  const legacySession = parseSession(legacyRaw);
  removeStorageItem(SESSION_STORAGE_KEY);

  if (!legacySession || isSessionExpired(legacySession)) {
    removeSessionStorageItem(SESSION_STORAGE_KEY);
    return null;
  }

  writeSessionStorageItem(SESSION_STORAGE_KEY, JSON.stringify(legacySession));
  return legacySession;
}

export function saveSession(session: AuthSession): void {
  const ttlSeconds = Number.isFinite(session.expiresIn) ? Math.max(0, session.expiresIn) : 0;
  const normalizedSession: AuthSession = {
    ...session,
    tokenType: "bearer",
    expiresIn: ttlSeconds,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };

  writeSessionStorageItem(SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
  // Remove any stale legacy value if present.
  removeStorageItem(SESSION_STORAGE_KEY);
}

export function clearSession(): void {
  removeSessionStorageItem(SESSION_STORAGE_KEY);
  // Backward-compat cleanup for older builds.
  removeStorageItem(SESSION_STORAGE_KEY);
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

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  return { session, setSession, apiBaseUrl };
}
