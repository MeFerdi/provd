"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "@/lib/env";
import { SESSION_STORAGE_KEY } from "@/lib/storage-keys";
import { readStorageItem, removeStorageItem, writeStorageItem } from "@/lib/storage";

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

export function getStoredSession(): AuthSession | null {
  const raw = readStorageItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    removeStorageItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  writeStorageItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
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
