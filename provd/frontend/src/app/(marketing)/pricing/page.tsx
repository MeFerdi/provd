import type { Metadata } from "next";

import ContactSection from "@/components/marketing/ContactSection";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/env";
import { BUNDLES, FREE_MONTHLY_CHECKS, PAYMENT_METHODS, PLANS, formatKes, formatUsd, joinOr } from "@/lib/pricing";
import { docsUrl } from "@/lib/sites";

export const metadata: Metadata = {
  title: "Pricing | Provd",
  description: `Pay as you go. ${FREE_MONTHLY_CHECKS} free checks a month, then check bundles from ${formatUsd(BUNDLES[0].priceUsd)} topped up with ${joinOr(PAYMENT_METHODS.map((m) => m.label))}. Monthly plans for global payout platforms.`,
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
            Start with {FREE_MONTHLY_CHECKS} free checks a month. When you go live, buy a bundle the way you buy airtime,
            from {formatUsd(BUNDLES[0].priceUsd)}. No minimum term. Global payout platforms can take a monthly plan.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div className="flex flex-col rounded-md border border-bg-border bg-white p-6">
            <h2 className="font-sans text-base font-semibold text-text-primary">Free</h2>
            <div className="mt-1 font-display text-3xl text-text-primary">$0</div>
            <ul className="mt-4 flex-1 space-y-2 text-[15px] text-text-secondary">
              <li>{FREE_MONTHLY_CHECKS} API checks a month, enough to integrate and test</li>
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
                {joinOr(PAYMENT_METHODS.map((m) => m.label))}. Auto top-up is coming.
              </p>
              <p>
                Checks are used only when a trade is actually scored. Requests for rails we don&apos;t support yet return{" "}
                <code className="font-mono text-text-primary">not_yet_supported</code> and are not charged.
              </p>
              <p>
                How the free quota, balance and top-ups fit together:{" "}
                <a href={docsUrl("/pay-as-you-go")} className="text-accent-secondary hover:underline">
                  pay as you go
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl text-text-primary sm:text-3xl">Global payout platforms</h2>
            <span className="text-sm text-text-muted">Monthly, billed in USD by invoice</span>
          </div>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
            For platforms paying out across borders at steady volume. Each plan includes a set number of checks a month;
            after that, overage is invoiced, drawn from a prepaid balance, or stopped, as you choose.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-md border border-bg-border bg-white p-6">
                <h3 className="font-sans text-base font-semibold text-text-primary">{plan.name}</h3>
                <div className="mt-1 font-display text-3xl text-text-primary">
                  {plan.monthlyUsd === null ? (
                    "Custom"
                  ) : (
                    <>
                      <span className="font-sans text-sm text-text-muted">from </span>
                      {formatUsd(plan.monthlyUsd)}
                      <span className="font-sans text-sm text-text-muted"> / month</span>
                    </>
                  )}
                </div>
                <p className="mt-3 flex-1 text-[15px] text-text-secondary">
                  {plan.includedChecks === null
                    ? "Volume, overage terms and support agreed with you."
                    : `${plan.includedChecks.toLocaleString("en-US")} checks a month included.`}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-4 rounded-md border border-bg-border bg-bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-text-secondary">
              Payout and OTC checks are live. Plans are set up with you directly. Tell us your volume and corridors.
            </p>
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
