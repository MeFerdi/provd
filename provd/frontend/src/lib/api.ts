import { clearSession, getStoredSession, saveSession, type AuthSession } from "@/lib/auth";
import { createJsonHeaders, requestErrorMessage } from "@/lib/http";
import { getApiBaseUrl } from "@/lib/env";

export const API_BASE_URL = getApiBaseUrl();

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  scopes: string[];
  role: string;
};

async function requestJson<T>(path: string, init: RequestInit = {}, includeAuth = true): Promise<T> {
  const session = getStoredSession();
  const headers = createJsonHeaders({
    existingHeaders: init.headers,
    accessToken: session?.accessToken,
    includeAuth,
  });

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearSession();
  }

  if (!response.ok) {
    const detail = await requestErrorMessage(response, `Request failed with status ${response.status}`);
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestJson<T>(path, init, true);
}

export async function publicApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestJson<T>(path, init, false);
}

export async function loginWithCredentials(clientId: string, clientSecret: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

  if (!response.ok) {
    const detail = await requestErrorMessage(response, `Login failed with status ${response.status}`);
    throw new Error(detail || `Login failed with status ${response.status}`);
  }

  const body = (await response.json()) as LoginResponse;

  const session: AuthSession = {
    accessToken: body.access_token,
    tokenType: body.token_type,
    role: body.role,
    scopes: body.scopes ?? [],
    expiresIn: body.expires_in,
  };

  saveSession(session);
  return session;
}

export { clearSession };
