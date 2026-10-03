import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckClient } from "@/components/check/CheckClient";

export const metadata: Metadata = {
  title: "Counterparty check — Provd",
  description:
    "Free risk check for a Tron wallet: exposure to addresses Tether has frozen, recent USDT activity and a 0–1000 risk score, explained.",
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
          Paste the Tron wallet you are about to send USDT to. Provd reads its recent transfers and checks who it has
          dealt with against the 7,700+ wallets Tether has frozen.
        </p>
        <Suspense fallback={<div className="h-12 rounded-md border border-bg-border bg-bg-surface" />}>
          <CheckClient />
        </Suspense>
      </div>
    </main>
  );
}
