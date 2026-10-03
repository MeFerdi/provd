import type { Metadata } from "next";

import { ScanClient } from "@/components/posture/ScanClient";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Scan a contract — Provd",
  description:
    "Paste a LayerZero V2 OApp or OFT address on Ethereum and get its verifier sets, admin keys and an A–F grade with evidence, read live from the chain.",
  alternates: { canonical: "/scan" },
};

export default function ScanPage() {
  return (
    <main className="bg-bg-base pb-20 pt-28">
      <Container className="px-4 sm:px-6">
        <div className="mb-8 max-w-3xl">
          <h1 className="mb-5 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">Scan a contract.</h1>
          <p className="text-lg leading-relaxed text-text-secondary">
            Paste a LayerZero V2 OApp or OFT address. Provd reads its receive and send verifier sets, libraries, owner
            and delegate straight from the chain and grades the result using the{" "}
            <a href="/methodology" className="text-accent-secondary hover:underline">
              published rules
            </a>
            . Free, no account needed.
          </p>
        </div>
        <ScanClient />
      </Container>
    </main>
  );
}
