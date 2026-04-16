export async function readResponseText(response: Response): Promise<string> {
  const text = await response.text();
  return text.trim();
}

export function createJsonHeaders(options: {
  existingHeaders?: HeadersInit;
  accessToken?: string;
  apiKey?: string;
  includeAuth?: boolean;
} = {}): Headers {
  const { existingHeaders, accessToken, apiKey, includeAuth = true } = options;
  const headers = new Headers(existingHeaders);

  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");

  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }

  if (includeAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

export async function readResponseDetail(response: Response): Promise<string> {
  const text = await readResponseText(response);
  if (!text) {
    return response.statusText;
  }

  try {
    const body = JSON.parse(text) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail.trim()) {
      return body.detail;
    }
    return JSON.stringify(body);
  } catch {
    return text;
  }
}

export async function requestErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  const detail = await readResponseDetail(response);
  return detail || fallbackMessage;
}
