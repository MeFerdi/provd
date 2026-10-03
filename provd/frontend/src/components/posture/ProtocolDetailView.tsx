"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { EarlyAccessForm } from "@/components/early-access/EarlyAccessForm";
import { ChangeTimeline } from "@/components/posture/ChangeTimeline";
import { PostureBody, PostureHeader, PostureSection } from "@/components/posture/PostureView";
import { fetchProtocol } from "@/lib/posture/api";
import type { ProtocolDetail } from "@/lib/posture/types";

export function ProtocolDetailView({ initial }: { initial: ProtocolDetail }) {
  const [protocol, setProtocol] = React.useState<ProtocolDetail>(initial);

  // Prefer fresher data from the live API; keep the build-time snapshot if it is unreachable.
  React.useEffect(() => {
    let cancelled = false;
    fetchProtocol(initial.slug)
      .then((live) => {
        if (!cancelled && live && live.slug === initial.slug) setProtocol(live);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initial.slug]);

  return (
    <div className="space-y-12">
      <div>
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-muted">
          <Link href="/ratings" className="hover:text-text-primary">
            Ratings
          </Link>{" "}
          / <span className="text-text-secondary">{protocol.name}</span>
        </nav>
        <PostureHeader
          posture={protocol}
          title={protocol.name}
          subtitle={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{protocol.category}</span>
              <span aria-hidden="true">·</span>
              <span>LayerZero V2</span>
              {protocol.website ? (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={protocol.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent-secondary hover:underline"
                  >
                    Website <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </>
              ) : null}
            </span>
          }
        />
      </div>

      <PostureBody posture={protocol} />

      <PostureSection
        id="changes"
        title="Change history"
        description="Configuration changes detected by monitoring. Change alerts are not part of the grade."
      >
        <ChangeTimeline changes={protocol.changes} />
      </PostureSection>

      <PostureSection
        id="alerts"
        title="Get alerts for this protocol"
        description="Be notified when a verifier is removed, an admin key changes or a new weak route is opened. Alerts are in early access."
      >
        <EarlyAccessForm id="protocol-alerts" defaultMessage={`Alerts for: ${protocol.slug}`} />
      </PostureSection>
    </div>
  );
}
