import "./globals.css";
import type { Metadata, Viewport } from "next";
import { RootChrome } from "@/components/shell/RootChrome";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/env";

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [{ url: "/provd.svg", type: "image/svg+xml" }],
    shortcut: ["/provd.svg"],
    apple: ["/provd.svg"],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className="bg-white">
      <body suppressHydrationWarning className="bg-bg-base text-text-primary font-sans min-h-screen">
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
