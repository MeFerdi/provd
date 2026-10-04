/**
 * Provd runs three static sites from this codebase:
 *   main        provd.tech             marketing, checks, verify, pricing, legal   (src/app)
 *   docs        docs.provd.tech        guides and concepts, no endpoint list       (sites/docs/app)
 *   playground  playground.provd.tech  endpoint reference + sandbox console        (sites/playground/app)
 * Links within a site stay relative; links to another site are absolute. Local dev overrides the URLs with
 * NEXT_PUBLIC_{MAIN,DOCS,PLAYGROUND}_URL (see package.json dev scripts).
 */
export type SiteId = "main" | "docs" | "playground";

export const SITE_URLS: Record<SiteId, string> = {
  main: (process.env.NEXT_PUBLIC_MAIN_URL || "https://provd.tech").replace(/\/+$/, ""),
  docs: (process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.provd.tech").replace(/\/+$/, ""),
  playground: (process.env.NEXT_PUBLIC_PLAYGROUND_URL || "https://playground.provd.tech").replace(/\/+$/, ""),
};

export type SiteLink = { site: SiteId; path: string };

/** href for `path` on `target`, as seen from a page on `current`. */
export function siteHref(current: SiteId, target: SiteId, path = "/"): string {
  return current === target ? path : `${SITE_URLS[target]}${path === "/" ? "" : path}`;
}

export const docsUrl = (path = "/") => siteHref("main", "docs", path);
export const playgroundUrl = (path = "/") => siteHref("main", "playground", path);
export const mainUrl = (path = "/") => siteHref("docs", "main", path);
