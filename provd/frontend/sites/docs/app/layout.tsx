import "@/app/globals.css";
import type { Metadata, Viewport } from "next";

import { DocsLayout } from "@/components/docs/DocsLayout";
import { RootChrome } from "@/components/shell/RootChrome";
import { SITE_URLS } from "@/lib/sites";

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

const title = "Provd Docs: integrate pre-release risk checks";
const description =
  "Guides for scoring stablecoin trades, ramps, payouts and escrow releases with Provd before funds leave: quickstart, sandbox, decision records, escrow integration, scores and flags.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URLS.docs),
  applicationName: "Provd Docs",
  title,
  description,
  icons: { icon: [{ url: "/provd.svg", type: "image/svg+xml" }], shortcut: ["/provd.svg"], apple: ["/provd.svg"] },
  openGraph: { type: "website", siteName: "Provd Docs", url: SITE_URLS.docs, title, description, images: ["/og-image.png"] },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
};

export default function DocsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className="bg-white">
      <body suppressHydrationWarning className="min-h-screen bg-bg-base font-sans text-text-primary">
        <RootChrome site="docs">
          <DocsLayout>{children}</DocsLayout>
        </RootChrome>
      </body>
    </html>
  );
}
