import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Provd",
    short_name: "Provd",
    description: "Counterparty risk scoring and dispute intelligence for African P2P crypto, stablecoin, and OTC platforms.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090E",
    theme_color: "#07090E",
    icons: [
      {
        src: "/provd.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
