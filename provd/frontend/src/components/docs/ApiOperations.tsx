import { cn } from "@/lib/cn";
import type { FieldRow, Operation, ParamRow, TagGroup } from "@/lib/openapi";

const METHOD_CLASS: Record<string, string> = {
  GET: "text-[#067647] border-[#ABEFC6]",
  POST: "text-[#175CD3] border-[#B2DDFF]",
  PUT: "text-[#B54708] border-[#FEDF89]",
  PATCH: "text-[#B54708] border-[#FEDF89]",
  DELETE: "text-[#B42318] border-[#FECDCA]",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-md border bg-white px-2 font-mono text-xs font-semibold",
        METHOD_CLASS[method] ?? "border-bg-border text-text-primary"
      )}
    >
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: Operation["auth"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-xs",
        auth === "key" ? "border-text-primary text-text-primary" : "border-bg-border text-text-muted"
      )}
    >
      {auth === "key" ? "API key" : "Public"}
    </span>
  );
}

function FieldNotes({ row }: { row: FieldRow }) {
  const parts: React.ReactNode[] = [];
  if (row.description) parts.push(<span key="d">{row.description}</span>);
  if (row.enumValues?.length) {
    parts.push(
      <span key="e">
        One of{" "}
        {row.enumValues.map((v, i) => (
          <span key={v}>
            {i ? ", " : ""}
            <code className="font-mono text-[13px] text-text-primary">{v}</code>
          </span>
        ))}
        .
      </span>
    );
  }
  if (row.constraints.length) parts.push(<span key="c" className="text-text-muted">{row.constraints.join(" · ")}</span>);
  if (row.nullable) parts.push(<span key="n" className="text-text-muted">May be null.</span>);
  if (!parts.length) return <span className="text-text-muted">—</span>;
  return <span className="flex flex-col gap-0.5">{parts}</span>;
}

function FieldTable({ rows, showLocation = false }: { rows: (FieldRow | ParamRow)[]; showLocation?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-md border border-bg-border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-bg-border bg-bg-surface text-text-muted">
            <th scope="col" className="px-3 py-2 font-normal">Field</th>
            {showLocation ? <th scope="col" className="px-3 py-2 font-normal">In</th> : null}
            <th scope="col" className="px-3 py-2 font-normal">Type</th>
            <th scope="col" className="px-3 py-2 font-normal">Required</th>
            <th scope="col" className="px-3 py-2 font-normal">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bg-border">
          {rows.map((row) => {
            const parent = row.name.includes(".") ? row.name.slice(0, row.name.lastIndexOf(".") + 1) : "";
            const leaf = row.name.slice(parent.length);
            return (
              <tr key={`${"location" in row ? row.location : ""}-${row.name}`} className="align-top">
                <td className="px-3 py-2.5" style={{ paddingLeft: `${0.75 + row.depth * 1}rem` }}>
                  <code className="whitespace-nowrap font-mono text-[13px]">
                    {parent ? <span className="text-text-muted">{parent}</span> : null}
                    <span className="text-text-primary">{leaf}</span>
                  </code>
                </td>
                {showLocation ? <td className="px-3 py-2.5 text-text-secondary">{"location" in row ? row.location : ""}</td> : null}
                <td className="px-3 py-2.5 font-mono text-[13px] text-text-secondary">{row.type}</td>
                <td className="px-3 py-2.5 text-text-secondary">{row.required ? "yes" : "no"}</td>
                <td className="px-3 py-2.5 leading-relaxed text-text-secondary">
                  <FieldNotes row={row} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 mt-6 font-sans text-sm font-semibold text-text-primary">{children}</h4>;
}

function OperationCard({ op }: { op: Operation }) {
  const success = op.responses.filter((r) => r.status.startsWith("2"));
  const others = op.responses.filter((r) => !r.status.startsWith("2"));
  return (
    <section id={op.id} className="scroll-mt-24 rounded-md border border-bg-border bg-white">
      <header className="border-b border-bg-border px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={op.method} />
          <code className="min-w-0 break-all font-mono text-[15px] text-text-primary">{op.path}</code>
          <AuthBadge auth={op.auth} />
          {op.deprecated ? <span className="text-xs text-text-muted">Deprecated</span> : null}
        </div>
        <h3 className="mt-2 font-sans text-base font-semibold text-text-primary">{op.summary}</h3>
        {op.description ? <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-text-secondary">{op.description}</p> : null}
      </header>
      <div className="px-4 pb-5 sm:px-5">
        {op.params.length ? (
          <>
            <SubHeading>Parameters</SubHeading>
            <FieldTable rows={op.params} showLocation />
          </>
        ) : null}
        {op.body ? (
          <>
            <SubHeading>
              Request body <span className="font-normal text-text-muted">· {op.body.type}{op.body.required ? "" : " · optional"}</span>
            </SubHeading>
            {op.body.fields.length ? <FieldTable rows={op.body.fields} /> : <p className="text-sm text-text-secondary">JSON {op.body.type}.</p>}
          </>
        ) : null}
        {success.map((r) => (
          <div key={r.status}>
            <SubHeading>
              Response <span className="font-mono font-normal text-text-secondary">{r.status}</span>
              {r.type ? <span className="font-normal text-text-muted"> · {r.type}</span> : null}
            </SubHeading>
            {r.fields.length ? (
              <FieldTable rows={r.fields} />
            ) : (
              <p className="text-sm text-text-secondary">
                {r.type ? `JSON ${r.type}. Fields are not described in the spec yet.` : r.description || "No body."}
              </p>
            )}
          </div>
        ))}
        {others.length ? (
          <p className="mt-4 text-sm text-text-muted">
            Also returns{" "}
            {others.map((r, i) => (
              <span key={r.status}>
                {i ? ", " : ""}
                <code className="font-mono text-text-secondary">{r.status}</code> {r.description.toLowerCase()}
              </span>
            ))}
            . See <a href="#errors" className="text-accent-secondary hover:underline">errors</a>.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function ApiOperationIndex({ groups }: { groups: TagGroup[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-bg-border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-bg-border bg-bg-surface text-text-muted">
            <th scope="col" className="px-3 py-2 font-normal">Endpoint</th>
            <th scope="col" className="px-3 py-2 font-normal">Auth</th>
            <th scope="col" className="px-3 py-2 font-normal">What it does</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bg-border">
          {groups.flatMap((g) =>
            g.operations.map((op) => (
              <tr key={op.id} className="align-top">
                <td className="px-3 py-2.5">
                  <a href={`#${op.id}`} className="group inline-flex items-start gap-2">
                    <MethodBadge method={op.method} />
                    <code className="whitespace-nowrap font-mono text-[13px] text-text-primary group-hover:underline">{op.path}</code>
                  </a>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{op.auth === "key" ? "API key" : "Public"}</td>
                <td className="px-3 py-2.5 text-text-secondary">{op.summary}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ApiOperations({ groups }: { groups: TagGroup[] }) {
  return (
    <div className="space-y-12">
      {groups.map((g) => (
        <div key={g.name} id={`tag-${g.name}`} className="scroll-mt-24">
          <h3 className="mb-1 font-display text-2xl text-text-primary">{g.title}</h3>
          {g.description ? <p className="mb-4 text-text-secondary">{g.description}</p> : <div className="mb-4" />}
          <div className="space-y-6">
            {g.operations.map((op) => (
              <OperationCard key={op.id} op={op} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
