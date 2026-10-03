import type { MetadataRoute } from "next";

import { getGeneratedBlogRecords, getGeneratedDocsRecords } from "@/lib/content/generated-content";
import { SITE_URL } from "@/lib/env";
import { listSnapshotProtocols } from "@/lib/posture/snapshot";

export const dynamic = "force-static";

const STATIC_PATHS = [
  "/",
  "/ratings",
  "/scan",
  "/methodology",
  "/pricing",
  "/early-access",
  "/about",
  "/blog",
  "/docs",
  "/careers",
  "/privacy-policy",
  "/terms",
  "/data-processing",
  "/cookie-policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = [
    ...STATIC_PATHS,
    ...listSnapshotProtocols().map((p) => `/ratings/${p.slug}`),
    ...getGeneratedBlogRecords().map((r) => r.url),
    ...getGeneratedDocsRecords().map((r) => r.url),
  ];
  return Array.from(new Set(urls)).map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
