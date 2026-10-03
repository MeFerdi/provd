import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { AdminPanel } from "@/components/posture/AdminPanel";
import { GradeBadge, RiskBadge } from "@/components/posture/Badges";
import { FindingsList } from "@/components/posture/FindingCard";
import { RoutesTable } from "@/components/posture/RoutesTable";
import { explorerAddress, formatDateTime, GRADE_DESCRIPTION } from "@/lib/posture/format";
import type { Posture } from "@/lib/posture/types";

export type PostureCore = Omit<Posture, "framework"> & { framework: string };

export function PostureSection({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="font-display text-2xl text-text-primary md:text-3xl">
        {title}
      </h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Grade, score, risk level, contract and timestamp. */
export function PostureHeader({ posture, title, subtitle }: { posture: PostureCore; title?: ReactNode; subtitle?: ReactNode }) {
  const explorer = explorerAddress(posture.chain, posture.contract);
  return (
    <div className="rounded-md border border-bg-border bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <GradeBadge grade={posture.grade} size="lg" />
        <div className="min-w-0 flex-1">
          {title ? <h1 className="font-display text-3xl leading-tight text-text-primary md:text-4xl">{title}</h1> : null}
          {subtitle ? <div className="mt-1 text-sm text-text-secondary">{subtitle}</div> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-sans text-sm font-medium text-text-primary">
              Grade {posture.grade} · {GRADE_DESCRIPTION[posture.grade]}
            </span>
            <RiskBadge risk={posture.risk_level} />
          </div>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-bg-border pt-5 text-sm lg:grid-cols-4">
        <div>
          <dt className="text-xs text-text-muted">Score</dt>
          <dd className="mt-1 text-lg text-text-primary">{posture.score}/100</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Single-verifier routes</dt>
          <dd className="mt-1 text-lg text-text-primary">
            <span className={posture.single_verifier_pathways > 0 ? "text-grade-f" : undefined}>
              {posture.single_verifier_pathways}
            </span>
            /{posture.pathways_total}
          </dd>
        </div>
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <dt className="text-xs text-text-muted">Contract ({posture.chain})</dt>
          <dd className="mt-1 break-all font-mono text-xs text-text-primary">
            {explorer ? (
              <a href={explorer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-secondary hover:underline">
                {posture.contract}
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="sr-only">View on Etherscan (opens in a new tab)</span>
              </a>
            ) : (
              posture.contract
            )}
          </dd>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <dt className="text-xs text-text-muted">Checked</dt>
          <dd className="mt-1 text-text-primary">
            <time dateTime={posture.checked_at}>{formatDateTime(posture.checked_at)}</time>
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Findings, routes and admin sections, shared by /ratings/[slug] and /scan. */
export function PostureBody({ posture }: { posture: PostureCore }) {
  return (
    <div className="space-y-12">
      <PostureSection
        id="findings"
        title={`Findings (${posture.findings.length})`}
        description={
          <>
            Each finding comes from a published rule. See the{" "}
            <a href="/methodology" className="text-accent-secondary hover:underline">
              methodology
            </a>{" "}
            for how findings turn into a grade.
          </>
        }
      >
        <FindingsList findings={posture.findings} pathways={posture.pathways} />
      </PostureSection>

      <PostureSection
        id="routes"
        title={`Routes (${posture.pathways_total})`}
        description="Inbound routes to this contract on Ethereum and the verifiers (DVNs) that must attest a message before it is accepted. Weakest routes first."
      >
        <RoutesTable pathways={posture.pathways} />
      </PostureSection>

      <PostureSection id="admin" title="Admin" description="Who can change this contract's security configuration.">
        <AdminPanel admin={posture.admin} />
      </PostureSection>
    </div>
  );
}
