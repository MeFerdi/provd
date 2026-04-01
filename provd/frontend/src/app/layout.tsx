import "./globals.css";
import { DM_Serif_Display, IBM_Plex_Mono, DM_Sans } from "next/font/google";
import type { Metadata } from "next";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { SiteShell } from "@/components/shell/SiteShell";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const ibmMono = IBM_Plex_Mono({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-mono" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://provd.io"),
  title: "Provd — Trust Infrastructure for African P2P Crypto",
  description: "AI-powered counterparty risk scoring for African P2P crypto markets. Real-time fraud intelligence for exchanges and platforms.",
  openGraph: {
    title: "Provd — Trust Infrastructure for African P2P Crypto",
    description: "AI-powered counterparty risk scoring for African P2P crypto markets.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${ibmMono.variable} ${dmSans.variable}`.trim()}>
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
