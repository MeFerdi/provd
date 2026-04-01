import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export const metadata = {
  title: "Docs — Provd",
};

export default function DocsLandingPage() {
  return (
    <>
      <Section className="border-b border-bg-border pt-14 pb-16" padded={false}>
        <Container>
          <div className="max-w-2xl">
            <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Docs</div>
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              Integrate Provd in minutes.
            </h1>
            <p className="text-text-secondary text-lg">
              Quickstart, authentication, and API reference for trust scoring and risk flags.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link className="text-accent-primary hover:underline" href="/docs/quickstart">
                Start with Quickstart →
              </Link>
              <Link className="text-accent-primary hover:underline" href="/docs/api-reference">
                Jump to API Reference →
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-5 md:grid-cols-3">
            <Link href="/docs/quickstart" className="rounded-2xl border border-bg-border bg-bg-surface/50 p-6 hover:bg-bg-elevated transition">
              <div className="font-sans font-semibold text-text-primary mb-1">Quickstart</div>
              <div className="text-sm text-text-secondary">Get a score in your P2P flow.</div>
            </Link>
            <Link href="/docs/authentication" className="rounded-2xl border border-bg-border bg-bg-surface/50 p-6 hover:bg-bg-elevated transition">
              <div className="font-sans font-semibold text-text-primary mb-1">Authentication</div>
              <div className="text-sm text-text-secondary">API keys, hashing, and safety.</div>
            </Link>
            <Link href="/docs/api-reference" className="rounded-2xl border border-bg-border bg-bg-surface/50 p-6 hover:bg-bg-elevated transition">
              <div className="font-sans font-semibold text-text-primary mb-1">API Reference</div>
              <div className="text-sm text-text-secondary">Endpoints, fields, and responses.</div>
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}

