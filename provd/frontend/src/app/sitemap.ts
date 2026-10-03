import type { MetadataRoute } from "next";

import { getGeneratedDocsRecords } from "@/lib/content/generated-content";
import { SITE_URL } from "@/lib/env";

export const dynamic = "force-static";

const STATIC_PATHS = [
  "/",
  "/check",
  "/verify",
  "/pricing",
  "/early-access",
  "/about",
  "/docs",
  "/careers",
  "/privacy-policy",
  "/terms",
  "/data-processing",
  "/cookie-policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [...STATIC_PATHS, ...getGeneratedDocsRecords().map((r) => r.url)];
  return Array.from(new Set(urls)).map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
