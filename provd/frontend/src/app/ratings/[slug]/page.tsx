import type { Metadata } from "next";

import { PreviewBanner } from "@/components/posture/PreviewBanner";
import { ProtocolDetailView } from "@/components/posture/ProtocolDetailView";
import { RatingsEmpty } from "@/components/posture/RatingsEmpty";
import { Container } from "@/components/ui/container";
import { getSnapshotProtocol, listSnapshotProtocols, PLACEHOLDER_SLUG } from "@/lib/posture/snapshot";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  const slugs = listSnapshotProtocols().map((p) => ({ slug: p.slug }));
  // `output: "export"` needs at least one param; render an empty-state page until ratings exist.
  return slugs.length ? slugs : [{ slug: PLACEHOLDER_SLUG }];
}

export function generateMetadata({ params }: Props): Metadata {
  const p = getSnapshotProtocol(params.slug);
  if (!p) return { title: "Ratings — Provd", robots: { index: false } };
  const desc = `${p.name} is graded ${p.grade} (${p.score}/100) by Provd. ${p.single_verifier_pathways} of ${p.pathways_total} routes rely on a single verifier. Built from public on-chain data.`;
  return {
    title: `${p.name} security rating: ${p.grade} — Provd`,
    description: desc,
    alternates: { canonical: `/ratings/${p.slug}` },
    openGraph: { title: `${p.name}: grade ${p.grade}`, description: desc },
  };
}

export default function ProtocolRatingPage({ params }: Props) {
  const protocol = getSnapshotProtocol(params.slug);
  return (
    <main className="bg-bg-base pb-20 pt-28">
      <Container className="px-4 sm:px-6">
        <PreviewBanner />
        {protocol ? <ProtocolDetailView initial={protocol} /> : <RatingsEmpty />}
      </Container>
    </main>
  );
}
