import type { Metadata } from "next";

import { PreviewBanner } from "@/components/posture/PreviewBanner";
import { RatingsEmpty } from "@/components/posture/RatingsEmpty";
import { RatingsTable } from "@/components/posture/RatingsTable";
import { Container } from "@/components/ui/container";
import { formatDateTime } from "@/lib/posture/format";
import { getSnapshot } from "@/lib/posture/snapshot";
import type { ProtocolSummary } from "@/lib/posture/types";

export const metadata: Metadata = {
  title: "Ratings — Provd",
  description:
    "Security-posture ratings for LayerZero V2 contracts on Ethereum: verifier sets, admin keys and multisig thresholds, graded A–F from public on-chain data.",
  alternates: { canonical: "/ratings" },
};

export default function RatingsPage() {
  const snapshot = getSnapshot();
  const items: ProtocolSummary[] = snapshot.protocols.map(
    ({ website: _w, admin: _a, pathways: _p, findings: _f, changes: _c, ...summary }) => summary
  );

  return (
    <main className="bg-bg-base pb-20 pt-28">
      <Container className="px-4 sm:px-6">
        <PreviewBanner />
        <div className="mb-10 max-w-3xl">
          <h1 className="mb-5 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">
            Cross-chain security posture, graded.
          </h1>
          <p className="text-lg leading-relaxed text-text-secondary">
            Each protocol is rated from its live configuration on Ethereum: how many independent verifiers must attest a
            message, and who can change that. Grades follow the published{" "}
            <a href="/methodology" className="text-accent-secondary hover:underline">
              methodology
            </a>
            . Coverage today: LayerZero V2 OApps and OFTs.
          </p>
          {items.length ? (
            <p className="mt-4 text-sm text-text-muted">Snapshot generated {formatDateTime(snapshot.generated_at)}</p>
          ) : null}
        </div>

        {items.length ? <RatingsTable initial={items} /> : <RatingsEmpty />}
      </Container>
    </main>
  );
}
