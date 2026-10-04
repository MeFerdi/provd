import type { Metadata } from "next";

import { SandboxSignup } from "@/components/developer/SandboxSignup";
import { CONTACT_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Get an API key | Provd",
  description:
    "Get a free Provd sandbox key instantly and try every API call against test wallets. Live keys for P2P desks, ramps, payout platforms and escrows: talk to us.",
  alternates: { canonical: "/early-access" },
};

const LIVE_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Provd live API key")}&body=${encodeURIComponent(
  "Platform:\nWhat you settle (P2P, ramp, payouts, escrow):\nRough monthly volume:\n"
)}`;

export default function EarlyAccessPage() {
  return (
    <main className="bg-white pb-20 pt-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h1 className="mb-4 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">Get an API key.</h1>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-text-secondary">
          Start with a sandbox key right now: it scores test wallets (a clean wallet, a lookalike, a sanctioned wallet and
          more) for free, so you can build your integration today. Go live when you&apos;re ready.
        </p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section id="sandbox" aria-labelledby="sandbox-title" className="scroll-mt-28 rounded-md border border-bg-border p-6">
            <h2 id="sandbox-title" className="font-sans text-xl font-semibold text-text-primary">
              Sandbox key, now
            </h2>
            <p className="mb-5 mt-1 text-[15px] text-text-secondary">Instant and free. No card, no call.</p>
            <SandboxSignup site="main" />
          </section>
          <section aria-labelledby="live-title" className="rounded-md border border-bg-border bg-bg-surface p-6">
            <h2 id="live-title" className="font-sans text-xl font-semibold text-text-primary">
              Live key
            </h2>
            <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">
              Tell us what your platform settles and roughly how much. We&apos;ll send a live key, with 300 free checks a
              month, and help you wire the first check into your release flow.
            </p>
            <a href={LIVE_MAILTO} className="mt-5 block break-all font-sans text-lg font-medium text-text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            <a
              href={LIVE_MAILTO}
              className="mt-4 inline-flex h-12 items-center justify-center rounded-md border border-accent-primary bg-accent-primary px-6 font-sans text-base font-medium text-white transition-colors hover:border-[#333333] hover:bg-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary focus-visible:ring-offset-2"
            >
              Talk to us
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
