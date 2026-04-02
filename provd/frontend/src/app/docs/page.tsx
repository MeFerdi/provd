import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { docsNav } from "@/lib/nav";

export const metadata = {
  title: "Docs — Provd",
};

export default function DocsLandingPage() {
  const quickLinks = docsNav.filter((item) => item.href !== "/docs");
  const gettingStarted = quickLinks.filter((item) => item.category === "Getting Started");
  const reference = quickLinks.filter((item) => item.category === "Reference");

  return (
    <>
      <Section className="border-b border-bg-border pt-14 pb-16" padded={false}>
        <Container>
          <div className="max-w-3xl">
            <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Docs</div>
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              Provd documentation for fraud-intelligence integrations.
            </h1>
            <p className="text-text-secondary text-lg">
              Everything you need to integrate counterparty scoring, risk flags, and approval workflows into your P2P or
              stablecoin product.
            </p>
            <div className="mt-8 grid gap-4 rounded-2xl border border-bg-border bg-bg-surface/50 p-6 md:grid-cols-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">Start Here</div>
                <div className="font-sans font-semibold text-text-primary">Quickstart</div>
                <div className="mt-2 text-sm text-text-secondary">Get your first score request into an approval flow.</div>
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">Secure Access</div>
                <div className="font-sans font-semibold text-text-primary">Authentication</div>
                <div className="mt-2 text-sm text-text-secondary">Set up API keys and safe client-side hashing patterns.</div>
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">Full Reference</div>
                <div className="font-sans font-semibold text-text-primary">API Reference</div>
                <div className="mt-2 text-sm text-text-secondary">Review endpoints, request fields, and response semantics.</div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-5 py-3 font-sans font-semibold text-bg-base transition hover:opacity-90"
                href="/docs/quickstart"
              >
                Read quickstart
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-xl border border-bg-border px-5 py-3 font-sans font-semibold text-text-primary transition hover:bg-bg-surface"
                href="/docs/api-reference"
              >
                Open API reference
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-4 text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">Getting Started</div>
              <div className="space-y-4">
                {gettingStarted.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-2xl border border-bg-border bg-bg-surface/50 p-6 transition hover:bg-bg-elevated"
                  >
                    <div className="font-sans font-semibold text-text-primary mb-2">{item.title}</div>
                    <div className="text-sm text-text-secondary">{item.description}</div>
                    <div className="mt-4 text-sm text-accent-primary">Open page →</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-4 text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">Reference</div>
                <div className="space-y-4">
                  {reference.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-2xl border border-bg-border bg-bg-surface/50 p-6 transition hover:bg-bg-elevated"
                    >
                      <div className="font-sans font-semibold text-text-primary mb-2">{item.title}</div>
                      <div className="text-sm text-text-secondary">{item.description}</div>
                      <div className="mt-4 text-sm text-accent-primary">Open page →</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-bg-border bg-bg-surface/50 p-6">
                <div className="mb-3 text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">Integration Flow</div>
                <ol className="space-y-3 text-sm text-text-secondary">
                  <li>1. Read the quickstart to understand where Provd fits in your approval path.</li>
                  <li>2. Configure authentication and hash any sensitive identifiers before sending them.</li>
                  <li>3. Use the API reference to wire scoring, flags, and decisions into production flows.</li>
                </ol>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
