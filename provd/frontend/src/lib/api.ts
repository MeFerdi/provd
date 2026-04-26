import { clearSession, getStoredSession, saveSession, type AuthSession } from "@/lib/auth";
import { createJsonHeaders, requestErrorMessage } from "@/lib/http";
import { getApiBaseUrl } from "@/lib/env";

export const API_BASE_URL = getApiBaseUrl();

// Mock response function for testing when backend is not available
function getMockResponse<T>(path: string, session: AuthSession): T {
  if (path === "/api/v1/admin/celery/runtime") {
    return {
      app_name: "provd",
      broker_url: "redis://redis:6379/0",
      result_backend: "redis://redis:6379/1",
      default_queue: "celery",
      task_time_limit: 120,
      task_soft_time_limit: 90,
      task_track_started: true,
      task_acks_late: false,
      task_reject_on_worker_lost: false,
      worker_prefetch_multiplier: 4,
      beat_schedule: {
        "refresh-trust-scores": {
          task: "tasks.refresh_trust_scores",
          schedule: "900",
          args: []
        },
        "scrape-community-data": {
          task: "tasks.scrape_community_data",
          schedule: "1800",
          args: []
        }
      }
    } as T;
  }

  if (path === "/api/v1/admin/platform/metrics") {
    return {
      total_integrations: 24,
      active_platforms: 18,
      total_trust_scores: 1250000,
      risk_assessments_today: 8500,
      disputes_resolved: 156,
      avg_response_time: 245,
      system_uptime: 99.7,
      risk_distribution: {
        low: 68,
        medium: 24,
        high: 6,
        critical: 2
      }
    } as T;
  }

  if (path === "/api/v1/admin/disputes/recent") {
    return [
      {
        id: "dsp-001",
        platform: "LocalBitcoins NG",
        counterparty: "user_789123",
        amount: 2500,
        currency: "NGN",
        risk_level: "high",
        status: "under_review",
        created_at: "2026-04-25T14:30:00Z"
      },
      {
        id: "dsp-002",
        platform: "Paxful KE",
        counterparty: "trader_456789",
        amount: 150,
        currency: "USDT",
        risk_level: "medium",
        status: "resolved",
        created_at: "2026-04-25T12:15:00Z"
      }
    ] as T;
  }

  if (path === "/api/v1/trust/score") {
    return {
      entity_id: "dashboard-demo",
      score: 85.7,
      risk_level: "low",
      cached: false
    } as T;
  }

  if (path === "/api/v1/client/metrics") {
    return {
      total_trust_scores: 8750,
      active_integrations: 7,
      risk_assessments_today: 1250,
      avg_trust_score: 72.4,
      disputes_avoided: 41,
      platform_coverage: 84,
      response_time: 89
    } as T;
  }

  if (path === "/api/v1/client/recent-scores") {
    return [
      {
        id: "score-001",
        counterparty: "user_123456",
        score: 89,
        risk_level: "low",
        platform: "Binance P2P",
        last_updated: "2026-04-26T10:30:00Z",
        transaction_volume: 500,
        currency: "USDT"
      },
      {
        id: "score-002",
        counterparty: "trader_789012",
        score: 45,
        risk_level: "high",
        platform: "Paxful",
        last_updated: "2026-04-26T09:15:00Z",
        transaction_volume: 1200,
        currency: "NGN"
      },
      {
        id: "score-003",
        counterparty: "merchant_345678",
        score: 77,
        risk_level: "medium",
        platform: "Noones",
        last_updated: "2026-04-26T08:45:00Z",
        transaction_volume: 300,
        currency: "KES"
      }
    ] as T;
  }

  // Default mock response
  return {} as T;
}

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

  try {
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
  } catch (error) {
    // If backend is not available, return mock data for testing
    if (session?.accessToken?.startsWith('mock-token-')) {
      return getMockResponse<T>(path, session);
    }
    throw error;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestJson<T>(path, init, true);
}

export async function publicApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requestJson<T>(path, init, false);
}

export async function loginWithCredentials(clientId: string, clientSecret: string): Promise<AuthSession> {
  try {
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
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Unable to reach the API at ${API_BASE_URL}. Start the backend and verify your environment configuration.`);
    }

    throw error;
  }
}

export { clearSession };
