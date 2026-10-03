import { SeverityBadge } from "@/components/posture/Badges";
import { formatDateTime, humanizeKind } from "@/lib/posture/format";
import type { ChangeEvent } from "@/lib/posture/types";

export function ChangeTimeline({ changes }: { changes: ChangeEvent[] }) {
  if (!changes.length) {
    return (
      <div className="rounded-md border border-bg-border bg-white p-5 text-sm text-text-secondary">
        No configuration changes detected since monitoring started.
      </div>
    );
  }
  const sorted = [...changes].sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  return (
    <ol className="relative space-y-5 border-l border-bg-border pl-5">
      {sorted.map((c, i) => (
        <li key={`${c.detected_at}-${i}`} className="relative">
          <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border border-text-muted bg-white" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            <time dateTime={c.detected_at} className="text-xs text-text-muted">
              {formatDateTime(c.detected_at)}
            </time>
            <SeverityBadge severity={c.severity} />
            <span className="text-xs text-text-muted">{humanizeKind(c.kind)}</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-text-primary">{c.summary}</p>
          {c.pathway != null ? <div className="mt-1 font-mono text-xs text-text-muted">Route eid {c.pathway}</div> : null}
        </li>
      ))}
    </ol>
  );
}
