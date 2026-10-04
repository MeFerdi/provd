import type { Metadata } from "next";

import Capabilities from "@/components/marketing/Capabilities";
import ContactSection from "@/components/marketing/ContactSection";
import Hero from "@/components/marketing/Hero";
import HowItWorks from "@/components/marketing/HowItWorks";
import Markets from "@/components/marketing/Markets";
import Problem from "@/components/marketing/Problem";
import Segments from "@/components/marketing/Segments";
import { JsonLd } from "@/components/seo/JsonLd";
import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/env";
import { SITE_URLS } from "@/lib/sites";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Who Provd is and what the free tools are, for search engines and AI answer engines.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: "Provd Technologies Ltd.",
      url: SITE_URL,
      logo: `${SITE_URL}/provd-logo.svg`,
      email: CONTACT_EMAIL,
      foundingLocation: { "@type": "Place", name: "Kenya" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebApplication",
      name: "Provd wallet risk and lookalike check",
      url: `${SITE_URL}/check`,
      applicationCategory: "SecurityApplication",
      operatingSystem: "Any (web browser)",
      description:
        "Free check for Tron and Solana wallets: OFAC sanctions, wallets frozen by Tether or Circle, risky counterparties, and lookalike addresses used in address-poisoning scams.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebAPI",
      name: "Provd API",
      description: "Pre-release risk checks for stablecoin trades, ramps, payouts and escrow releases, with signed decision records.",
      documentation: SITE_URLS.docs,
      provider: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function HomePage() {
  return (
    <main className="bg-white">
      <JsonLd data={structuredData} />
      <Hero />
      <Problem />
      <Segments />
      <HowItWorks />
      <Capabilities />
      <Markets />
      <ContactSection />
    </main>
  );
}
