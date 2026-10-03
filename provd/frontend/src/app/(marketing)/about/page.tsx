import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { CONTACT_EMAIL, REPO_URL, SECURITY_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "About — Provd",
  description:
    "Provd reads the security configuration of cross-chain protocols from public on-chain data, rates it, and alerts when it weakens.",
  alternates: { canonical: "/about" },
};

const facts = [
  { label: "What it is", value: "Security-posture ratings and monitoring for cross-chain protocols" },
  { label: "What we read", value: "Bridge verifier (DVN) sets, multisig thresholds, admin keys" },
  { label: "Coverage today", value: "LayerZero V2 OApps and OFTs on Ethereum" },
  { label: "Who uses it", value: "Curators, allocators, insurers, protocol teams, funds and treasuries" },
];

const principles = [
  { title: "Evidence over opinion", body: "Every finding links to the on-chain source it was read from, so anyone can check it." },
  { title: "Explainable", body: "Every grade shows the rules that produced it. The rules are published in our methodology." },
  {
    title: "Responsible disclosure",
    body: "We notify teams privately before publishing new critical findings, and publish after 14 days or once fixed, whichever comes first.",
  },
  { title: "Independent", body: "No protocol pays for its rating. Paid plans buy monitoring and tooling, never a better grade." },
];

export default function AboutPage() {
  return (
    <main className="bg-bg-base">
      <Section className="border-b border-bg-border pb-16 pt-28" padded={false}>
        <Container size="xl" className="px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-end">
            <div className="max-w-3xl">
              <h1 className="mb-6 font-display text-4xl leading-[1.04] text-text-primary md:text-6xl">
                The settings that decide a bridge&apos;s security are public. Almost nobody reads them.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">
                A cross-chain protocol is only as strong as the verifiers that attest its messages and the keys that can
                change them. Those settings live on-chain and can change at any time, quietly. Provd reads them, rates
                them against published rules, and alerts you when they weaken.
              </p>
            </div>

            <Card className="bg-bg-surface">
              <CardContent className="grid gap-5 p-6 md:p-7">
                {facts.map((fact) => (
                  <div key={fact.label} className="border-b border-bg-border pb-4 last:border-b-0 last:pb-0">
                    <div className="mb-1 text-sm text-text-muted">{fact.label}</div>
                    <div className="text-sm leading-relaxed text-text-primary md:text-base">{fact.value}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      <Section className="border-b border-bg-border" variant="surface">
        <Container size="xl" className="px-4 sm:px-6">
          <div className="mb-10 max-w-3xl">
            <h2 className="font-display text-3xl leading-[1.05] text-text-primary md:text-5xl">How we work.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {principles.map((p) => (
              <Card key={p.title} className="h-full">
                <CardContent className="p-6 md:p-7">
                  <h3 className="mb-3 text-lg font-semibold text-text-primary">{p.title}</h3>
                  <p className="leading-relaxed text-text-secondary">{p.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section variant="base">
        <Container size="xl" className="px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
            <div>
              <h2 className="mb-5 font-display text-3xl leading-[1.05] text-text-primary md:text-5xl">Check our work.</h2>
              <p className="text-base leading-relaxed text-text-secondary md:text-lg">
                Our research is reproducible. The scripts and data behind our{" "}
                <a href="/blog/kelp-dao-381-days" className="text-accent-secondary hover:underline">
                  Kelp DAO analysis
                </a>{" "}
                are in{" "}
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-accent-secondary hover:underline">
                  our repository
                </a>
                , and the rules behind every grade are in the{" "}
                <a href="/methodology" className="text-accent-secondary hover:underline">
                  methodology
                </a>
                .
              </p>
              <div className="mt-8 overflow-hidden rounded-md border border-bg-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/home/hero-analytics.jpg"
                  width={1400}
                  height={933}
                  alt="Monitoring dashboard on a laptop screen"
                  loading="lazy"
                  decoding="async"
                  className="block h-auto max-h-[360px] w-full object-cover"
                />
              </div>
            </div>

            <Card className="self-start">
              <CardContent className="p-6 md:p-7">
                <h3 className="mb-4 text-base font-semibold text-text-primary">Contact</h3>
                <div className="space-y-4 text-sm md:text-base">
                  <div>
                    <div className="mb-1 text-text-secondary">General and early access</div>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-secondary hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                  <div>
                    <div className="mb-1 text-text-secondary">Security disclosures and rating questions from protocol teams</div>
                    <a href={`mailto:${SECURITY_EMAIL}`} className="text-accent-secondary hover:underline">
                      {SECURITY_EMAIL}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>
    </main>
  );
}
