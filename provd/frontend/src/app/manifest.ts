import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION } from "@/lib/env";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Provd: pre-release risk checks for stablecoin money movement",
    short_name: "Provd",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [{ src: "/provd.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
