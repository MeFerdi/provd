import type { MetadataRoute } from "next";

import { getGeneratedDocsRecords } from "@/lib/content/generated-content";
import { SITE_URLS } from "@/lib/sites";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const urls = ["/", ...getGeneratedDocsRecords().map((r) => r.url)];
  return [...new Set(urls)].map((path) => ({ url: `${SITE_URLS.docs}${path === "/" ? "" : path}`, changeFrequency: "weekly" }));
}
