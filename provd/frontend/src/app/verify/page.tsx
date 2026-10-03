import type { Metadata } from "next";

import { VerifyClient } from "@/components/verify/VerifyClient";

export const metadata: Metadata = {
  title: "Verify a decision — Provd",
  description:
    "Check a Provd decision record in your browser: recompute its hash, verify the secp256k1 signature and fold the Merkle proof to the Bitcoin-anchored batch root.",
  alternates: { canonical: "/verify" },
};

const STEPS = [
  ["Hash", "SHA-256 of the record as canonical JSON (keys sorted, no whitespace, UTF-8) must equal record_hash."],
  ["Signature", "The secp256k1 signature must be valid for record_hash under Provd's published key."],
  ["Merkle inclusion", "Folding the proof from the record's leaf must reproduce the batch root."],
  ["Bitcoin anchor", "The batch root is timestamped on Bitcoin through OpenTimestamps; you check that with the .ots file."],
];

export default function VerifyPage() {
  return (
    <main className="bg-white pb-20 pt-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 className="mb-4 font-display text-4xl leading-[1.05] text-text-primary md:text-5xl">
          Verify a decision record.
        </h1>
        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-text-secondary">
          Paste the JSON from <code className="font-mono text-[0.9em] text-text-primary">GET /v1/decisions/&#123;intent_id&#125;</code>.
          Your browser checks that the record is the one Provd signed and sealed, without trusting Provd.
        </p>

        <VerifyClient />

        <section className="mt-14 grid gap-8 border-t border-bg-border pt-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl text-text-primary">What is checked</h2>
            <ol className="mt-4 space-y-3 text-[15px] leading-relaxed text-text-secondary">
              {STEPS.map(([title, body], i) => (
                <li key={title}>
                  <span className="font-medium text-text-primary">
                    {i + 1}. {title}.
                  </span>{" "}
                  {body}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="font-display text-2xl text-text-primary">From the command line</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
              The same checks in Python, for scripts and audits:{" "}
              <a href="/tools/verify_decision.py" download className="text-accent-secondary hover:underline">
                verify_decision.py
              </a>
              .
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-bg-border bg-bg-surface p-3 font-mono text-[13px] text-text-primary">
              {`pip install cryptography
python verify_decision.py decision.json \\
  --public-key <key from /v1/proof/keys>`}
            </pre>
            <h3 className="mt-6 font-sans text-base font-semibold text-text-primary">A note on numbers</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
              The hash covers the record exactly as Provd&apos;s Python serializer writes it: integers as-is, decimals in
              Python&apos;s shortest form, such as <code className="font-mono text-text-primary">3.0</code>. This page reads
              numbers as written, so paste the API response unchanged. Tools that rewrite{" "}
              <code className="font-mono text-text-primary">3.0</code> as <code className="font-mono text-text-primary">3</code>{" "}
              (for example saving through JavaScript&apos;s JSON.stringify) will make the hash check fail even though the
              record is genuine.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
              More on how records are built:{" "}
              <a href="/docs/decisions" className="text-accent-secondary hover:underline">
                decision records
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
