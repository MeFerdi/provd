import "./globals.css";
import type { Metadata } from "next";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { RootChrome } from "@/components/shell/RootChrome";

export const metadata: Metadata = {
  metadataBase: new URL("https://provd.io"),
  applicationName: "Provd",
  title: "Provd",
  description: "Counterparty risk scoring and dispute intelligence for African P2P crypto, stablecoin, and OTC platforms.",
  icons: {
    icon: [{ url: "/provd.svg", type: "image/svg+xml" }],
    shortcut: ["/provd.svg"],
    apple: ["/provd.svg"],
  },
  openGraph: {
    title: "Provd",
    description: "Counterparty risk scoring and dispute intelligence for African P2P crypto, stablecoin, and OTC platforms.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body suppressHydrationWarning className="bg-bg-base text-text-primary font-sans min-h-screen">
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
