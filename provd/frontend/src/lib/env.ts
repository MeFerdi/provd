export const DEFAULT_API_BASE_URL = "http://localhost:8000";
export const DEFAULT_MOCK_BASE_URL = "https://sandbox.provd.network/mock";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;
}

export function getSandboxApiKey(): string {
  return process.env.NEXT_PUBLIC_PROVD_SANDBOX_API_KEY ?? "";
}

export function getMockBaseUrl(): string {
  return process.env.NEXT_PUBLIC_PROVD_MOCK_BASE_URL ?? DEFAULT_MOCK_BASE_URL;
}

export function isTestAuthEnabled(): boolean {
  return (process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH ?? "").toLowerCase() === "true";
}
