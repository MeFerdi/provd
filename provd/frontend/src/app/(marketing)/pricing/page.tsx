import type { Metadata } from "next";

import ContactSection from "@/components/marketing/ContactSection";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/env";
import { BUNDLES, FREE_DAILY_CHECKS, PAYMENT_METHODS, formatKes, formatUsd } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing — Provd",
  description: `Pay as you go. ${FREE_DAILY_CHECKS} free checks a day, then buy check bundles and top up with ${PAYMENT_METHODS.map((m) => m.label).join(" or ")}.`,
  alternates: { canonical: "/pricing" },
};

const PAYOUTS_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Provd for payouts")}`;

export default function PricingPage() {
  return (
    <main className="bg-white">
      <section className="border-b border-bg-border pb-14 pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h1 className="mb-5 max-w-3xl font-display text-4xl leading-[1.05] text-text-primary md:text-6xl">
            Pay for checks, not for seats.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-text-secondary">
            Start with {FREE_DAILY_CHECKS} free checks a day. When you need more, buy a bundle the way you buy airtime.
            No monthly plan, no minimum term.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div className="flex flex-col rounded-md border border-bg-border bg-white p-6">
            <h2 className="font-sans text-base font-semibold text-text-primary">Free</h2>
            <div className="mt-1 font-display text-3xl text-text-primary">$0</div>
            <ul className="mt-4 flex-1 space-y-2 text-[15px] text-text-secondary">
              <li>{FREE_DAILY_CHECKS} API checks a day, reset daily</li>
              <li>Public counterparty scanner on the website</li>
              <li>Decision records on every check</li>
            </ul>
            <Button href="/check" variant="secondary" size="lg" className="mt-6 w-full">
              Run a free check
            </Button>
          </div>

          <div className="min-w-0 rounded-md border border-bg-border bg-white">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-bg-border px-5 py-4 sm:px-6">
              <h2 className="font-sans text-base font-semibold text-text-primary">Check bundles</h2>
              <span className="text-sm text-text-muted">Early-access pricing</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="border-b border-bg-border text-sm text-text-muted">
                    <th scope="col" className="px-5 py-3 font-normal sm:px-6">
                      Bundle
                    </th>
                    <th scope="col" className="px-5 py-3 font-normal sm:px-6">
                      Price
                    </th>
                    <th scope="col" className="px-5 py-3 font-normal sm:px-6">
                      Per check
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-border">
                  {BUNDLES.map((b) => (
                    <tr key={b.id}>
                      <th scope="row" className="px-5 py-4 font-medium text-text-primary sm:px-6">
                        {b.checks.toLocaleString("en-US")} checks
                      </th>
                      <td className="px-5 py-4 text-text-primary sm:px-6">
                        {formatUsd(b.priceUsd)}
                        {b.priceKes ? <span className="block text-sm text-text-muted">{formatKes(b.priceKes)}</span> : null}
                      </td>
                      <td className="px-5 py-4 text-text-secondary sm:px-6">{formatUsd(b.perCheckUsd, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 border-t border-bg-border px-5 py-4 text-sm leading-relaxed text-text-secondary sm:px-6">
              <p>
                <span className="font-medium text-text-primary">Top up with</span>{" "}
                {PAYMENT_METHODS.map((m) => m.label).join(" or ")}. Auto top-up is coming.
              </p>
              <p>
                Checks are used only when a trade is actually scored. Requests for rails we don&apos;t support yet return{" "}
                <code className="font-mono text-text-primary">not_yet_supported</code> and are not charged.
              </p>
              <p>
                How the free quota, balance and top-ups fit together:{" "}
                <a href="/docs/pay-as-you-go" className="text-accent-secondary hover:underline">
                  pay as you go
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 rounded-md border border-bg-border bg-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-text-primary">Global platforms (payouts)</h2>
              <p className="mt-1 text-[15px] text-text-secondary">
                Payout and OTC checks are live. Steady-volume platforms can take a monthly plan with included checks and
                invoiced overage. Contact us.
              </p>
            </div>
            <a
              href={PAYOUTS_MAILTO}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-md border border-text-primary bg-white px-6 font-sans text-base font-medium text-text-primary transition-colors hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      <div className="border-t border-bg-border">
        <ContactSection />
      </div>
    </main>
  );
}
