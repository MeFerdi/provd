import type { Metadata } from "next";

import { TopupReference } from "./TopupReference";

export const metadata: Metadata = {
  title: "Payment received | Provd",
  description: "Your card payment is being confirmed.",
  robots: { index: false, follow: false },
};

export default function TopupCompletePage() {
  return (
    <main className="bg-white">
      <section className="pb-24 pt-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h1 className="mb-5 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">Thanks, payment received.</h1>
          <div className="space-y-4 text-lg leading-relaxed text-text-secondary">
            <p>
              Your checks are credited as soon as Paystack confirms the charge, usually within a minute. You can close
              this page.
            </p>
            <p>
              See your balance with <code className="font-mono text-base text-text-primary">GET /v1/usage</code>, or
              check this top-up with <code className="font-mono text-base text-text-primary">GET /v1/topups</code>.
            </p>
          </div>
          <TopupReference />
          <p className="mt-8 text-[15px] text-text-secondary">
            Not credited after a few minutes? Email{" "}
            <a href="mailto:hello@provd.tech?subject=Card%20top-up" className="text-accent-secondary hover:underline">
              hello@provd.tech
            </a>{" "}
            with the reference.
          </p>
        </div>
      </section>
    </main>
  );
}
