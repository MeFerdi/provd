import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/env";

export const dynamic = "force-static";

const STATIC_PATHS = [
  "/",
  "/check",
  "/verify",
  "/pricing",
  "/early-access",
  "/about",
  "/careers",
  "/privacy-policy",
  "/terms",
  "/data-processing",
  "/cookie-policy",
  "/security",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [...STATIC_PATHS];
  return Array.from(new Set(urls)).map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
