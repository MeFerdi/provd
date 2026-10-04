import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { CONTACT_EMAIL, SECURITY_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "About | Provd",
  description:
    "Provd checks stablecoin trades, ramps, payouts and escrow releases before funds leave: sanctions and frozen-wallet screening, lookalike addresses and your own history, explained and signed.",
  alternates: { canonical: "/about" },
};

const facts = [
  { label: "What it is", value: "A risk check that runs before a platform releases funds" },
  { label: "Who it's for", value: "P2P desks, non-custodial escrows, licensed on- and off-ramps and payout platforms" },
  { label: "Live today", value: "USDT on Tron and USDC/USDT on Solana: sanctions (OFAC) and frozen-wallet screening, lookalike detection, signed decision records and on-chain release attestations" },
  { label: "Next", value: "EVM chains, more sanctions lists (UN, EU, UK), auto top-up" },
];

export default function AboutPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-bg-border pb-16 pt-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-end">
          <div className="max-w-3xl">
            <h1 className="mb-6 font-display text-4xl leading-[1.04] text-text-primary md:text-6xl">
              The release decision deserves more than a guess.
            </h1>
            <div className="max-w-2xl space-y-4 text-lg leading-relaxed text-text-secondary">
              <p>
                Every day, P2P desks, ramps, payout platforms and escrows decide in seconds whether to send stablecoins
                against a payment: mobile money, Pix, UPI or a bank transfer. When it goes wrong (a reversal, a fake
                confirmation, a hijacked number, a lookalike address), the loss lands after the funds are gone, and on-chain
                there is no undo.
              </p>
              <p>
                Provd is a small team in Kenya building the check that runs before release: a score, the reasons behind it,
                and a signed record you can show an auditor or a bank later. Escrow contracts can verify a Provd release on-chain.
                We are early. The public checks and the API are live on Tron and Solana, and we are working with a first set of
                platforms to decide what comes next.
              </p>
            </div>
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
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <div>
            <h2 className="mb-5 font-display text-3xl leading-[1.05] text-text-primary md:text-5xl">How we work.</h2>
            <ul className="divide-y divide-bg-border border-y border-bg-border text-base leading-relaxed md:text-lg">
              <li className="py-4 text-text-secondary">
                <span className="font-medium text-text-primary">Explained, not black-box.</span> Every score lists the
                signals that moved it.
              </li>
              <li className="py-4 text-text-secondary">
                <span className="font-medium text-text-primary">Your data stays yours.</span> Outcomes you report shape
                your own checks only. We never pool them across platforms.
              </li>
              <li className="py-4 text-text-secondary">
                <span className="font-medium text-text-primary">No raw phone numbers.</span> The API takes hashed
                identifiers only.
              </li>
            </ul>
          </div>

          <Card className="self-start">
            <CardContent className="p-6 md:p-7">
              <h3 className="mb-4 text-base font-semibold text-text-primary">Contact</h3>
              <div className="space-y-4 text-sm md:text-base">
                <div>
                  <div className="mb-1 text-text-secondary">API keys, pilots and general questions</div>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-secondary hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </div>
                <div>
                  <div className="mb-1 text-text-secondary">Security disclosures</div>
                  <a href={`mailto:${SECURITY_EMAIL}`} className="text-accent-secondary hover:underline">
                    {SECURITY_EMAIL}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
