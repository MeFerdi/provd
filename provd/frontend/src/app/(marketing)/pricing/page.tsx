import type { Metadata } from "next";
import { Check } from "lucide-react";

import EarlyAccessSection from "@/components/marketing/EarlyAccessSection";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { CONTACT_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Pricing — Provd",
  description:
    "Public ratings, the contract scanner and research are free. Monitoring, alerts, watchlists and API access are in early access.",
  alternates: { canonical: "/pricing" },
};

type Plan = {
  name: string;
  price: string;
  audience: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Public",
    price: "Free",
    audience: "For anyone checking a protocol.",
    features: ["Public ratings", "Contract scanner", "Research", "Methodology"],
    cta: { label: "See the ratings", href: "/ratings" },
  },
  {
    name: "Protocol",
    price: "Early access",
    audience: "For teams that run cross-chain contracts.",
    features: [
      "Continuous monitoring of your own contracts",
      "Alerts on every configuration change",
      "Pre-change review of proposed settings",
    ],
    cta: { label: "Request early access", href: "#early-access" },
    highlight: true,
  },
  {
    name: "Pro",
    price: "Early access",
    audience: "For curators, insurers and funds.",
    features: ["Watchlists across protocols", "Webhook & API access", "Change history export", "Due-diligence reports"],
    cta: { label: "Request early access", href: "#early-access" },
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Talk to us",
    audience: "For coverage beyond the defaults.",
    features: ["Custom coverage: more chains and frameworks", "SLAs"],
    cta: { label: "Talk to us", href: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Provd Enterprise")}` },
  },
];

export default function PricingPage() {
  return (
    <>
      <Section className="border-b border-bg-border pb-14 pt-28" padded={false}>
        <Container className="px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="mb-5 font-display text-4xl leading-[1.05] text-text-primary md:text-6xl">
              Ratings are free. Monitoring is in early access.
            </h1>
            <p className="text-lg text-text-secondary">
              Public ratings, the scanner and our research stay free. Paid plans are being shaped with design partners —
              design partners get free access during the beta.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="py-14 sm:py-20" padded={false}>
        <Container className="px-4 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="flex flex-col rounded-md border border-bg-border bg-white p-6"
              >
                <h2 className="mb-1 font-sans text-base font-semibold text-text-primary">{plan.name}</h2>
                <div className="font-display text-2xl font-bold text-text-primary">{plan.price}</div>
                <p className="mt-2 text-sm text-text-secondary">{plan.audience}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-text-secondary">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-text-primary" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.cta.href.startsWith("/") ? (
                  <Button size="lg" variant="secondary" href={plan.cta.href} className="mt-6 w-full">
                    {plan.cta.label}
                  </Button>
                ) : (
                  <a
                    href={plan.cta.href}
                    className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md border border-text-primary bg-white px-6 font-sans text-base font-medium text-text-primary transition-colors hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
                  >
                    {plan.cta.label}
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-text-muted">
            No protocol pays for its rating. Paid plans buy monitoring and tooling, never a better grade.
          </p>
        </Container>
      </Section>

      <EarlyAccessSection />
    </>
  );
}
