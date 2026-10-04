import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckClient } from "@/components/check/CheckClient";
import { LookalikePanel } from "@/components/check/LookalikePanel";

export const metadata: Metadata = {
  title: "Counterparty check | Provd",
  description:
    "Free risk check for Tron and Solana wallets: exposure to frozen wallets, recent stablecoin activity, a 0 to 1000 risk score, and a lookalike-address check against address poisoning.",
  alternates: { canonical: "/check" },
};

export default function CheckPage() {
  return (
    <main className="bg-white pb-20 pt-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="mb-4 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">
          Check a counterparty before you release.
        </h1>
        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-text-secondary">
          Paste the wallet you are about to pay, on Tron or Solana. Provd reads its recent transfers and checks who it
          has dealt with against the wallets Tether and Circle have frozen.
        </p>
        <Suspense fallback={<div className="h-12 rounded-md border border-bg-border bg-bg-surface" />}>
          <CheckClient />
        </Suspense>
        <div className="mt-14">
          <LookalikePanel />
        </div>
      </div>
    </main>
  );
}
