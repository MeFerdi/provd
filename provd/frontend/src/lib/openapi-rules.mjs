// Which operations in the generated OpenAPI spec are public, and which need an API key.
// Used by the playground's endpoint reference (src/lib/openapi.ts).

/** Not part of the public API: onboarding, admin and placeholders. */
export const INTERNAL_PREFIXES = ["/v1/auth", "/v1/clients", "/v1/keys", "/v1/admin", "/v1/assets", "/v1/developer", "/v1/webhooks"];

/** Endpoints that take `X-API-Key`. Everything else that is shown is public. */
export const KEYED_PREFIXES = ["/v1/actions", "/v1/decisions", "/v1/outcomes", "/v1/usage", "/v1/topups"];

/** Endpoints a sandbox key can't use (billing is live-only). */
export const LIVE_ONLY_PREFIXES = ["/v1/topups"];

export const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

function matchesPrefix(path, prefixes) {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/** @param {string} path */
export function isInternalPath(path) {
  return path === "/" || !path.startsWith("/v1/") || matchesPrefix(path, INTERNAL_PREFIXES);
}

/** @param {string} path @returns {"key" | "public"} */
export function authForPath(path) {
  return matchesPrefix(path, KEYED_PREFIXES) ? "key" : "public";
}

/** @param {string} method @param {string} path */
export function operationAnchor(method, path) {
  const slug = path.toLowerCase().replace(/[{}]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${method.toLowerCase()}-${slug}`;
}
