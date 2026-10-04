import "@/app/globals.css";
import type { Metadata, Viewport } from "next";

import { RootChrome } from "@/components/shell/RootChrome";
import { SITE_URLS } from "@/lib/sites";

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

const title = "Provd API playground";
const description = "Every Provd endpoint, with a free sandbox to try each call against test wallets. Opens with your sandbox key.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URLS.playground),
  applicationName: title,
  title,
  description,
  icons: { icon: [{ url: "/provd.svg", type: "image/svg+xml" }], shortcut: ["/provd.svg"], apple: ["/provd.svg"] },
  openGraph: { type: "website", siteName: title, url: SITE_URLS.playground, title, description, images: ["/og-image.png"] },
};

export default function PlaygroundRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className="bg-white">
      <body suppressHydrationWarning className="min-h-screen bg-bg-base font-sans text-text-primary">
        <RootChrome site="playground">
          <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">{children}</main>
        </RootChrome>
      </body>
    </html>
  );
}
