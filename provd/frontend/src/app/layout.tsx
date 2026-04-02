import "./globals.css";
import type { Metadata } from "next";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { SiteShell } from "@/components/shell/SiteShell";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://provd.io"),
  title: "Provd — Fraud Intelligence Infrastructure for African P2P Crypto",
  description: "Counterparty risk scoring and dispute intelligence for African P2P crypto, stablecoin, and OTC platforms.",
  openGraph: {
    title: "Provd — Fraud Intelligence Infrastructure for African P2P Crypto",
    description: "Counterparty risk scoring and dispute intelligence for African P2P crypto, stablecoin, and OTC platforms.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body className="bg-bg-base text-text-primary font-sans min-h-screen">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
