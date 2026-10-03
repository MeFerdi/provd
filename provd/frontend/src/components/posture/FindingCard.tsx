import { ChevronDown, ExternalLink } from "lucide-react";

import { SeverityBadge } from "@/components/posture/Badges";
import { chainLabel, SEVERITY_ORDER } from "@/lib/posture/format";
import type { Finding, Pathway } from "@/lib/posture/types";

function routeName(eid: number, pathways: Pathway[]): string {
  const p = pathways.find((x) => x.eid === eid);
  return chainLabel(eid, p?.chain_name ?? null);
}

export function FindingCard({ finding, pathways, defaultOpen = false }: { finding: Finding; pathways: Pathway[]; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-md border border-bg-border bg-white open:bg-bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-md p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary sm:p-5 [&::-webkit-details-marker]:hidden">
        <SeverityBadge severity={finding.severity} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-sans font-semibold text-text-primary">{finding.title}</div>
          <div className="mt-1 text-sm leading-relaxed text-text-secondary">{finding.summary}</div>
          <div className="mt-2 font-mono text-[11px] text-text-muted">{finding.rule_id}</div>
        </div>
        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-text-muted transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t border-bg-border px-4 pb-5 pt-4 text-sm sm:px-5">
        <div>
          <div className="mb-1 text-sm font-medium text-text-primary">Why it matters</div>
          <p className="leading-relaxed text-text-secondary">{finding.why_it_matters}</p>
        </div>
        <div>
          <div className="mb-1 text-sm font-medium text-text-primary">Recommendation</div>
          <p className="leading-relaxed text-text-secondary">{finding.recommendation}</p>
        </div>
        {finding.pathways.length ? (
          <div>
            <div className="mb-2 text-sm font-medium text-text-primary">
              Affected routes ({finding.pathways.length})
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {finding.pathways.map((eid) => (
                <li
                  key={eid}
                  className="rounded border border-bg-border bg-white px-2 py-0.5 font-mono text-xs text-text-secondary"
                >
                  {routeName(eid, pathways)} <span className="text-text-muted">({eid})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {finding.evidence.length ? (
          <div>
            <div className="mb-2 text-sm font-medium text-text-primary">Evidence</div>
            <dl className="divide-y divide-bg-border rounded-md border border-bg-border">
              {finding.evidence.map((ev, i) => (
                <div key={`${ev.label}-${i}`} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-text-muted">{ev.label}</dt>
                  <dd className="min-w-0 break-all font-mono text-xs text-text-primary">
                    {ev.link ? (
                      <a
                        href={ev.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent-secondary hover:underline"
                      >
                        {ev.value}
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      ev.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function FindingsList({ findings, pathways }: { findings: Finding[]; pathways: Pathway[] }) {
  if (!findings.length) {
    return (
      <div className="rounded-md border border-bg-border bg-white p-5 text-sm text-text-secondary">
        No findings. None of the{" "}
        <a href="/methodology" className="text-accent-secondary hover:underline">
          methodology rules
        </a>{" "}
        matched this configuration. That is not a guarantee of safety: ratings cover configuration, not code.
      </div>
    );
  }
  const sorted = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return (
    <div className="space-y-3">
      {sorted.map((f, i) => (
        <FindingCard key={`${f.rule_id}-${i}`} finding={f} pathways={pathways} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
