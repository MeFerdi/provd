import { getApiBaseUrl } from "@/lib/env";
import type { EarlyAccessRequest, Posture, ProtocolDetail, ProtocolList } from "@/lib/posture/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function apiUrl(path: string): string {
  return `${getApiBaseUrl()}/api/v1${path}`;
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
    // FastAPI validation errors: detail is a list of { msg }
    if (Array.isArray(body.detail)) {
      const msgs = body.detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : null))
        .filter(Boolean);
      if (msgs.length) return msgs.join("; ");
    }
  } catch {
    // ignore non-JSON bodies
  }
  return null;
}

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 30000);
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Couldn't reach the Provd API. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await readDetail(response);
    throw new ApiError(response.status, messageForStatus(response.status, detail));
  }
  return (await response.json()) as T;
}

function messageForStatus(status: number, detail: string | null): string {
  if (status === 429) return "Too many requests. Please wait a minute and try again.";
  if (status === 502 || status === 503 || status === 504) return "Couldn't reach the chain right now, try again.";
  if (status === 422 || status === 400 || status === 404) return detail ?? "The request was not valid.";
  return detail ?? `Something went wrong (HTTP ${status}).`;
}

export function fetchProtocols(): Promise<ProtocolList> {
  return request<ProtocolList>("/protocols", { timeoutMs: 8000 });
}

export function fetchProtocol(slug: string): Promise<ProtocolDetail> {
  return request<ProtocolDetail>(`/protocols/${encodeURIComponent(slug)}`, { timeoutMs: 8000 });
}

export function scanContract(address: string, chain = "ethereum"): Promise<Posture> {
  return request<Posture>("/scan", {
    method: "POST",
    body: JSON.stringify({ chain, address }),
    timeoutMs: 60000,
  });
}

export function submitEarlyAccess(body: EarlyAccessRequest): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/early-access", {
    method: "POST",
    body: JSON.stringify(body),
    timeoutMs: 15000,
  });
}
