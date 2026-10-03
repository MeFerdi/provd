import type { Metadata } from "next";

import { EarlyAccessForm } from "@/components/early-access/EarlyAccessForm";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Early access — Provd",
  description: "Request early access to Provd monitoring and alerts for cross-chain protocol security configuration.",
  alternates: { canonical: "/early-access" },
};

export default function EarlyAccessPage() {
  return (
    <main className="bg-bg-base pb-20 pt-28">
      <Container size="default" className="px-4 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <h1 className="mb-5 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">
            Get alerts before a weak setting becomes an incident.
          </h1>
          <p className="text-lg leading-relaxed text-text-secondary">
            Monitoring, alerts, watchlists and API access are in early access. Tell us what you need to watch. Design
            partners get free access during the beta.
          </p>
        </div>
        <EarlyAccessForm id="early-access-page" />
      </Container>
    </main>
  );
}
