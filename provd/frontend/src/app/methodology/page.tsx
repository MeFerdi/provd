import type { Metadata } from "next";

import { GradeBadge, SeverityBadge } from "@/components/posture/Badges";
import { Container } from "@/components/ui/container";
import { SECURITY_EMAIL } from "@/lib/env";
import type { Grade, Severity } from "@/lib/posture/types";

export const metadata: Metadata = {
  title: "Methodology — Provd",
  description:
    "How Provd rates cross-chain security configuration: the rules, severities, score deductions, grade thresholds, data sources, limitations and disclosure policy.",
  alternates: { canonical: "/methodology" },
};

const DEDUCTIONS: { severity: Severity; points: number }[] = [
  { severity: "critical", points: 35 },
  { severity: "high", points: 20 },
  { severity: "medium", points: 8 },
  { severity: "low", points: 3 },
  { severity: "info", points: 0 },
];

const GRADES: { grade: Grade; rule: string }[] = [
  { grade: "A", rule: "Score ≥ 90" },
  { grade: "B", rule: "Score ≥ 75" },
  { grade: "C", rule: "Score ≥ 60" },
  { grade: "D", rule: "Score ≥ 40" },
  { grade: "F", rule: "Score < 40" },
];

type Rule = { id: string; severity: Severity; severityNote?: string; title: string; body: string };

const RULES: Rule[] = [
  {
    id: "LZ-SINGLE-VERIFIER",
    severity: "critical",
    title: "Route accepts messages attested by only one verifier",
    body: "A route is single-verifier when it has 1 required DVN and 0 optional DVNs, or an optional threshold of 1 with no required DVNs. One compromised or misled verifier can then forge messages to the contract.",
  },
  {
    id: "LZ-SINGLE-OPERATOR",
    severity: "high",
    title: "All required verifiers are run by the same operator",
    body: "Multiple DVNs on a route only add security if they fail independently. When every required verifier is operated by the same party, there is no operator diversity.",
  },
  {
    id: "LZ-DEFAULT-CONFIG",
    severity: "medium",
    title: "Route relies on LayerZero's default configuration",
    body: "The route uses LayerZero's default configuration instead of an explicit one, so its security can change without the protocol taking any action.",
  },
  {
    id: "ADM-EOA-DELEGATE",
    severity: "critical",
    title: "Verifier configuration is controlled by a single private key",
    body: "The account that can change the contract's verifier configuration (the endpoint delegate) is an externally owned account (EOA). Whoever holds that one key can weaken every route.",
  },
  {
    id: "ADM-EOA-OWNER",
    severity: "high",
    title: "Contract owner is a single private key",
    body: "The contract owner is an EOA. The owner can typically set peers and delegates, so a single key controls the contract's trust settings.",
  },
  {
    id: "ADM-LOW-THRESHOLD",
    severity: "high",
    severityNote: "High if the Safe needs 1 signature; medium if it needs 2.",
    title: "Admin multisig threshold is low",
    body: "The admin is a Safe multisig, but few signatures are needed to act. A 1-signature Safe offers the same protection as a single key.",
  },
  {
    id: "LZ-LOW-CONFIRMATIONS",
    severity: "low",
    title: "Route waits fewer block confirmations than recommended",
    body: "The route waits fewer source-chain block confirmations than the recommended minimum. We use LayerZero's default for that source chain as the reference.",
  },
];

const CHANGES: { id: string; severity: Severity; note?: string; body: string }[] = [
  { id: "CHG-VERIFIER-REDUCED", severity: "critical", body: "A route now requires fewer verifier attestations than before." },
  { id: "CHG-ADMIN-CHANGED", severity: "high", body: "The owner or delegate account changed." },
  {
    id: "CHG-NEW-ROUTE",
    severity: "info",
    note: "Escalates to critical if the new route is single-verifier.",
    body: "A new route (peer) was opened.",
  },
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-4 scroll-mt-24 font-display text-2xl text-text-primary md:text-3xl">
      {children}
    </h2>
  );
}

const TOC = [
  ["scoring", "Scoring"],
  ["rules", "Rules"],
  ["changes", "Change alerts"],
  ["data", "Data sources"],
  ["limitations", "Limitations"],
  ["disclosure", "Disclosure policy"],
];

export default function MethodologyPage() {
  return (
    <main className="bg-bg-base pb-20 pt-28">
      <Container className="px-4 sm:px-6">
        <div className="mb-12 max-w-3xl">
          <h1 className="mb-5 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">
            How a configuration becomes a grade.
          </h1>
          <p className="text-lg leading-relaxed text-text-secondary">
            Every Provd rating is produced by the explainable rules on this page, applied to configuration read from
            public on-chain data. Every finding shows the rule that produced it and the evidence it is based on.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24 space-y-2 text-sm">
              <div className="text-xs mb-3 text-text-muted">On this page</div>
              {TOC.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="block text-text-secondary hover:text-text-primary">
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div className="min-w-0 max-w-3xl space-y-16">
            <section>
              <H2 id="scoring">Scoring</H2>
              <p className="leading-relaxed text-text-secondary">
                The score starts at 100. Each finding deducts points according to its severity, and the score cannot go
                below 0. The score maps to a grade. <strong className="text-text-primary">Any critical finding caps the
                grade at D</strong>, whatever the score. The risk level is the highest finding severity (critical, high
                or medium); with no finding above low, the risk level is low.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-md border border-bg-border">
                  <table className="w-full text-left text-sm">
                    <caption className="border-b border-bg-border px-4 py-2.5 text-left text-sm text-text-muted">
                      Deduction per finding
                    </caption>
                    <tbody className="divide-y divide-bg-border">
                      {DEDUCTIONS.map((d) => (
                        <tr key={d.severity}>
                          <th scope="row" className="px-4 py-2.5 font-normal">
                            <SeverityBadge severity={d.severity} />
                          </th>
                          <td className="px-4 py-2.5 text-right text-text-primary">−{d.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="overflow-hidden rounded-md border border-bg-border">
                  <table className="w-full text-left text-sm">
                    <caption className="border-b border-bg-border px-4 py-2.5 text-left text-sm text-text-muted">
                      Grade thresholds
                    </caption>
                    <tbody className="divide-y divide-bg-border">
                      {GRADES.map((g) => (
                        <tr key={g.grade}>
                          <th scope="row" className="px-4 py-2 font-normal">
                            <GradeBadge grade={g.grade} size="sm" />
                          </th>
                          <td className="px-4 py-2 text-right text-text-primary">{g.rule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-4 text-sm text-text-muted">
                Example: one critical and one medium finding give 100 − 35 − 8 = 57, which is grade D on score alone. One
                critical finding alone gives 65 (grade C on score), capped to D.
              </p>
            </section>

            <section>
              <H2 id="rules">Rules</H2>
              <p className="mb-6 leading-relaxed text-text-secondary">
                Rules run against every route and admin account of a contract. A rule that matches several routes produces
                one finding listing the affected routes.
              </p>
              <div className="space-y-4">
                {RULES.map((r) => (
                  <article key={r.id} className="rounded-md border border-bg-border bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={r.severity} />
                      <code className="font-mono text-xs text-text-secondary">{r.id}</code>
                    </div>
                    <h3 className="mt-3 font-sans text-lg font-semibold text-text-primary">{r.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{r.body}</p>
                    {r.severityNote ? <p className="mt-2 text-sm text-text-muted">{r.severityNote}</p> : null}
                  </article>
                ))}
              </div>
            </section>

            <section>
              <H2 id="changes">Change alerts</H2>
              <p className="mb-6 leading-relaxed text-text-secondary">
                Monitoring compares each new read with the previous one. Changes raise alerts; they are recorded in a
                protocol&apos;s change history and are not part of the grade.
              </p>
              <ul className="space-y-3">
                {CHANGES.map((c) => (
                  <li key={c.id} className="rounded-md border border-bg-border bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={c.severity} />
                      <code className="font-mono text-xs text-text-secondary">{c.id}</code>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">
                      {c.body} {c.note ? <span className="text-text-muted">{c.note}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <H2 id="data">Data sources</H2>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed text-text-secondary">
                <li>
                  Contract reads over public RPC: <code className="font-mono text-[0.9em] text-text-primary">EndpointV2.getConfig</code>,{" "}
                  <code className="font-mono text-[0.9em] text-text-primary">getReceiveLibrary</code> / <code className="font-mono text-[0.9em] text-text-primary">getSendLibrary</code>,{" "}
                  <code className="font-mono text-[0.9em] text-text-primary">delegates</code>, the OApp&apos;s <code className="font-mono text-[0.9em] text-text-primary">peers</code> and{" "}
                  <code className="font-mono text-[0.9em] text-text-primary">owner</code>, and Safe <code className="font-mono text-[0.9em] text-text-primary">getThreshold</code> /{" "}
                  <code className="font-mono text-[0.9em] text-text-primary">getOwners</code>.
                </li>
                <li>DVN operator names from LayerZero&apos;s public metadata registry.</li>
              </ul>
            </section>

            <section>
              <H2 id="limitations">Limitations</H2>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed text-text-secondary">
                <li>Ratings cover configuration, not code. They are not an audit.</li>
                <li>A good grade is not a guarantee that a protocol is safe.</li>
                <li>Operator names come from LayerZero&apos;s registry; we do not independently verify who runs each DVN.</li>
                <li>Only Ethereum-side configuration is read today. The source-chain side of each route is not yet rated.</li>
              </ul>
            </section>

            <section>
              <H2 id="disclosure">Disclosure policy</H2>
              <p className="leading-relaxed text-text-secondary">
                New critical findings are shared privately with the protocol team first, through its security contact or a
                public channel, and published after 14 days or once fixed, whichever comes first. Configuration that has
                already been exploited or is already public is published immediately. Protocol teams can reach us at{" "}
                <a href={`mailto:${SECURITY_EMAIL}`} className="text-accent-secondary hover:underline">
                  {SECURITY_EMAIL}
                </a>
                . No protocol pays for its rating.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </main>
  );
}
