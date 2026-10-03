import { cn } from "@/lib/cn";
import { chainLabel, SEVERITY_CLASSES, shortAddress, verifierNames } from "@/lib/posture/format";
import type { Pathway, UlnSide } from "@/lib/posture/types";

function EffectiveCell({ side }: { side: UlnSide | null }) {
  if (!side) return <span className="text-text-muted">—</span>;
  const single = side.effective_verifiers <= 1;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium",
        single ? SEVERITY_CLASSES.critical : "border-bg-border text-text-primary"
      )}
    >
      {side.effective_verifiers}
      {single ? <span className="font-normal">single verifier</span> : null}
    </span>
  );
}

function ConfigCell({ side }: { side: UlnSide | null }) {
  if (!side) return <span className="text-text-muted">—</span>;
  return side.is_default_library ? (
    <span className="text-grade-c">Default</span>
  ) : (
    <span className="text-text-secondary">Custom</span>
  );
}

function sortRoutes(pathways: Pathway[]): Pathway[] {
  return [...pathways].sort((a, b) => {
    const ea = a.receive?.effective_verifiers ?? 99;
    const eb = b.receive?.effective_verifiers ?? 99;
    if (ea !== eb) return ea - eb;
    return chainLabel(a.eid, a.chain_name).localeCompare(chainLabel(b.eid, b.chain_name));
  });
}

export function RoutesTable({ pathways }: { pathways: Pathway[] }) {
  if (!pathways.length) {
    return (
      <div className="rounded-md border border-bg-border bg-white p-5 text-sm text-text-secondary">
        No configured routes were found for this contract.
      </div>
    );
  }
  const rows = sortRoutes(pathways);

  return (
    <div>
      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((p) => (
          <li key={p.eid} className="rounded-md border border-bg-border bg-white p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-text-primary">{chainLabel(p.eid, p.chain_name)}</div>
                <div className="font-mono text-xs text-text-muted">eid {p.eid}</div>
              </div>
              <EffectiveCell side={p.receive} />
            </div>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              <dt className="text-text-muted">Verifiers</dt>
              <dd className="min-w-0 break-words text-text-primary">{verifierNames(p.receive)}</dd>
              <dt className="text-text-muted">Confirmations</dt>
              <dd className="text-text-primary">{p.receive?.confirmations ?? "—"}</dd>
              <dt className="text-text-muted">Config</dt>
              <dd>
                <ConfigCell side={p.receive} />
              </dd>
              <dt className="text-text-muted">Peer</dt>
              <dd className="font-mono text-xs text-text-secondary">{shortAddress(p.peer, 8, 6)}</dd>
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-md border border-bg-border md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Receive routes: verifiers required to accept a message from each source chain</caption>
          <thead className="border-b border-bg-border text-xs text-text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-normal">Source chain</th>
              <th scope="col" className="px-4 py-3 font-normal">eid</th>
              <th scope="col" className="px-4 py-3 font-normal">Receive verifiers</th>
              <th scope="col" className="px-4 py-3 font-normal">Effective</th>
              <th scope="col" className="px-4 py-3 font-normal">Confirmations</th>
              <th scope="col" className="px-4 py-3 font-normal">Config</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {rows.map((p) => (
              <tr key={p.eid} className="align-top">
                <th scope="row" className="px-4 py-3 font-semibold text-text-primary">
                  {chainLabel(p.eid, p.chain_name)}
                </th>
                <td className="px-4 py-3 font-mono text-xs text-text-muted">{p.eid}</td>
                <td className="max-w-[340px] px-4 py-3 text-text-secondary">{verifierNames(p.receive)}</td>
                <td className="px-4 py-3">
                  <EffectiveCell side={p.receive} />
                </td>
                <td className="px-4 py-3 text-text-primary">{p.receive?.confirmations ?? "—"}</td>
                <td className="px-4 py-3">
                  <ConfigCell side={p.receive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        &ldquo;Effective&rdquo; is the number of independent verifier attestations a message needs before this contract
        accepts it. &ldquo;Default&rdquo; means the route inherits LayerZero&apos;s default configuration.
      </p>
    </div>
  );
}
