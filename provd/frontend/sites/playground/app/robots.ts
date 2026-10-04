import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Only the gate page is public; the reference itself is loaded from the API with a key.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/" }] };
}
