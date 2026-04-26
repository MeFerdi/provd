import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "About — Provd",
};

const companyFacts = [
  {
    label: "Category",
    value: "Counterparty intelligence infrastructure",
  },
  {
    label: "Primary users",
    value: "Exchanges, wallets, stablecoin apps, and OTC desks",
  },
  {
    label: "Decision point",
    value: "Before a P2P trade is approved or released",
  },
  {
    label: "Headquarters",
    value: "Nairobi, Kenya",
  },
];

const principles = [
  {
    title: "We score risk, not people",
    body:
      "Our models focus on behavioral and relational signals like disputes, linked identifiers, payment reversals, and repeat patterns. We do not build demographic profiling systems.",
  },
  {
    title: "False positives matter",
    body:
      "A legitimate trader blocked in error is not a dashboard metric. It is a real product failure. We design for explainability, thresholds, and review workflows that teams can trust.",
  },
  {
    title: "Privacy is part of the architecture",
    body:
      "Identifiers are hashed before they leave partner infrastructure. Provd is built to learn from partner outcomes without requiring raw PII as the operating model.",
  },
  {
    title: "Local context is the product edge",
    body:
      "African P2P counterparty risk patterns are shaped by payment rails, messaging channels, and regional trading behavior. We build for that operating reality directly, not as an afterthought.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-bg-base">
      <Section className="border-b border-bg-border pt-24 pb-16" padded={false}>
        <Container size="xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-end">
            <div className="max-w-3xl">
              <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">
                Company
              </div>
              <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.02] mb-6">
                Provd builds the counterparty intelligence layer African P2P markets actually need.
              </h1>
              <p className="text-lg md:text-xl text-text-secondary leading-relaxed max-w-2xl">
                Most crypto security products were built for smart contracts, DeFi exploits, and
                onchain risk. Provd is built for the messier layer where African P2P counterparty
                risk actually emerges: payment reversals, repeat offenders, desk-to-desk migration,
                and offchain coordination before funds move.
              </p>
            </div>

            <Card className="bg-bg-surface">
              <CardContent className="grid gap-5 p-6 md:p-7">
                {companyFacts.map((fact) => (
                  <div key={fact.label} className="border-b border-bg-border pb-4 last:border-b-0 last:pb-0">
                    <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-text-muted mb-2">
                      {fact.label}
                    </div>
                    <div className="text-sm md:text-base text-text-primary leading-relaxed">
                      {fact.value}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      <Section className="border-b border-bg-border" variant="surface">
        <Container size="xl">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">
                The Problem
              </div>
              <h2 className="font-display text-3xl md:text-5xl text-text-primary leading-[1.05] mb-5">
                African P2P counterparty risk is a pre-chain problem.
              </h2>
              <div className="space-y-5 text-text-secondary text-base md:text-lg leading-relaxed">
                <p>
                  The highest-impact counterparty risk patterns in African crypto markets often happen before a
                  blockchain transaction is ever broadcast. Deals are coordinated in Telegram,
                  WhatsApp, and OTC channels, then settled through bank transfers or mobile money.
                </p>
                <p>
                  That creates a blind spot. A smart contract scanner cannot see a payment reversal
                  pattern on M-Pesa. An onchain risk engine cannot recognize that the same operator
                  was banned on one desk last week and resurfaced elsewhere today.
                </p>
                <p>
                  This is the gap Provd is built to close: turning fragmented counterparty signals into one
                  reusable decision layer.
                </p>
              </div>
            </div>

            <div className="grid gap-5">
              <Card>
                <CardContent className="p-6">
                  <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent-primary mb-3">
                    Risk Pattern 01
                  </div>
                  <div className="text-xl text-text-primary mb-2">Payment reversal after release</div>
                  <div className="text-text-secondary leading-relaxed">
                    Crypto is sent, then fiat is disputed or reversed through a banking or mobile
                    money rail days later.
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent-primary mb-3">
                    Risk Pattern 02
                  </div>
                  <div className="text-xl text-text-primary mb-2">Serial migration across platforms</div>
                  <div className="text-text-secondary leading-relaxed">
                    A fraudster loses one account, then opens a fresh one elsewhere with no shared
                    memory between platforms.
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-accent-primary mb-3">
                    Risk Pattern 03
                  </div>
                  <div className="text-xl text-text-primary mb-2">Coordinated offchain networks</div>
                  <div className="text-text-secondary leading-relaxed">
                    Multiple accounts reuse payment rails, devices, and identities to defraud users
                    at scale while looking independent at first glance.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="border-b border-bg-border" variant="base">
        <Container size="xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">
                What We Build
              </div>
              <h2 className="font-display text-3xl md:text-5xl text-text-primary leading-[1.05] mb-5">
                One API for counterparty decisions before approval.
              </h2>
              <p className="text-text-secondary text-base md:text-lg leading-relaxed">
                Provd gives risk and compliance teams a counterparty score, reason codes, and
                recommended action before a P2P trade is approved, released, or escalated.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-text-muted mb-3">
                    Input
                  </div>
                  <div className="text-lg text-text-primary mb-2">Identifiers + trade context</div>
                  <div className="text-sm text-text-secondary leading-relaxed">
                    Wallets, hashed phones, hashed bank details, trade amount, rail, and desk
                    context.
                  </div>
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-text-muted mb-3">
                    Intelligence layer
                  </div>
                  <div className="text-lg text-text-primary mb-2">Federated intelligence graph</div>
                  <div className="text-sm text-text-secondary leading-relaxed">
                    Linked disputes, repeat-offender history, partner-fed outcomes, and payment-rail
                    patterns.
                  </div>
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-text-muted mb-3">
                    Output
                  </div>
                  <div className="text-lg text-text-primary mb-2">Approve, review, or block</div>
                  <div className="text-sm text-text-secondary leading-relaxed">
                    Fast scoring with explainable flags so teams can automate low-risk flows and
                    review the rest.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="border-b border-bg-border" variant="surface">
        <Container size="xl">
          <div className="max-w-3xl mb-10">
            <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">
              Operating Principles
            </div>
            <h2 className="font-display text-3xl md:text-5xl text-text-primary leading-[1.05] mb-5">
              Built like infrastructure, not just marketing.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {principles.map((principle) => (
              <Card key={principle.title} className="h-full">
                <CardContent className="p-6 md:p-7">
                  <div className="text-xl text-text-primary mb-3">{principle.title}</div>
                  <div className="text-text-secondary leading-relaxed">{principle.body}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section variant="base">
        <Container size="xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div>
              <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">
                Company
              </div>
              <h2 className="font-display text-3xl md:text-5xl text-text-primary leading-[1.05] mb-5">
                Built in Nairobi for the rails that matter locally.
              </h2>
              <div className="space-y-5 text-text-secondary text-base md:text-lg leading-relaxed">
                <p>
                  Provd was founded in Nairobi in 2026 by operators working across African fintech,
                  crypto infrastructure, and machine learning. We are focused on the real operating
                  conditions of African trading desks, not a generic global risk product with local
                  copy pasted on top.
                </p>
                <p>
                  We build for the chains and rails that matter in-market, including BNB Chain,
                  Tron, and Celo, alongside the offchain payment systems that shape real counterparty
                  risk.
                </p>
                <p>
                  We are hiring across engineering, data science, and business development. If you
                  want to help build serious counterparty intelligence infrastructure for African
                  crypto markets, we would love to hear from you.
                </p>
              </div>
            </div>

            <Card className="self-start">
              <CardContent className="p-6 md:p-7">
                <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-text-muted mb-4">
                  Contact
                </div>
                <div className="space-y-4 text-sm md:text-base">
                  <div>
                    <div className="text-text-muted mb-1">General</div>
                    <div className="text-text-primary">contact@provd.io</div>
                  </div>
                  <div>
                    <div className="text-text-muted mb-1">Research</div>
                    <div className="text-text-primary">research@provd.io</div>
                  </div>
                  <div>
                    <div className="text-text-muted mb-1">Location</div>
                    <div className="text-text-primary">Nairobi, Kenya</div>
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
