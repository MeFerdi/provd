import published from "@/data/ratings-snapshot.json";
import preview from "@/data/ratings-snapshot.preview.json";
import type { ProtocolDetail, RatingsSnapshot } from "@/lib/posture/types";

// The preview snapshot includes protocols whose teams haven't been notified yet (see the disclosure
// policy). It is only used when explicitly requested, never by a default build.
const usePreview = process.env.NEXT_PUBLIC_RATINGS_PREVIEW === "1";
const data = (usePreview ? preview : published) as unknown as RatingsSnapshot;

/** Slug used when the snapshot is empty, so `output: "export"` still has one page to build. */
export const PLACEHOLDER_SLUG = "pending";

export function getSnapshot(): RatingsSnapshot {
  return {
    generated_at: data.generated_at,
    preview: Boolean(data.preview),
    protocols: Array.isArray(data.protocols) ? data.protocols : [],
  };
}

export function listSnapshotProtocols(): ProtocolDetail[] {
  return getSnapshot().protocols;
}

export function getSnapshotProtocol(slug: string): ProtocolDetail | undefined {
  return listSnapshotProtocols().find((p) => p.slug === slug);
}

export function snapshotIsEmpty(): boolean {
  return listSnapshotProtocols().length === 0;
}
