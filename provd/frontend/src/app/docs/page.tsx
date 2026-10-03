import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { docsNav } from "@/lib/nav";

export const metadata = {
  title: "Docs — Provd",
  description: "Provd API documentation: protocol ratings, contract scans and response types.",
  alternates: { canonical: "/docs" },
};

export default function DocsLandingPage() {
  const quickLinks = docsNav.filter((item) => item.href !== "/docs");
  const gettingStarted = quickLinks.filter((item) => item.category === "Getting Started");
  const reference = quickLinks.filter((item) => item.category === "Reference");

  return (
    <>
      <Section className="border-b border-bg-border pt-4 pb-16" padded={false}>
        <Container>
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              Provd API documentation.
            </h1>
            <p className="text-text-secondary text-lg">
              Read protocol ratings, scan LayerZero V2 contracts and pull findings with evidence into your own risk
              tooling. The public endpoints need no API key.
            </p>
            <div className="mt-8 grid gap-4 rounded-md border border-bg-border bg-white p-6 md:grid-cols-3">
              <div>
                <div className="font-sans font-semibold text-text-primary">Quickstart</div>
                <div className="mt-2 text-sm text-text-secondary">Three requests: list ratings, fetch a protocol, scan a contract.</div>
              </div>
              <div>
                <div className="font-sans font-semibold text-text-primary">Authentication</div>
                <div className="mt-2 text-sm text-text-secondary">Public access, rate limits and API keys for early-access plans.</div>
              </div>
              <div>
                <div className="font-sans font-semibold text-text-primary">API Reference</div>
                <div className="mt-2 text-sm text-text-secondary">Endpoints, response types and error codes.</div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/docs/quickstart" size="lg">
                Open the quickstart
              </Button>
              <Button href="/docs/api-reference" size="lg" variant="secondary">
                Open API reference
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-4 text-sm font-medium text-text-primary">Getting started</div>
              <div className="space-y-4">
                {gettingStarted.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md border border-bg-border bg-white p-6 hover:border-text-muted"
                  >
                    <div className="font-sans font-semibold text-text-primary mb-2">{item.title}</div>
                    <div className="text-sm text-text-secondary">{item.description}</div>
                    <div className="mt-4 text-sm text-accent-secondary">Open page →</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-4 text-sm font-medium text-text-primary">Reference</div>
                <div className="space-y-4">
                  {reference.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-md border border-bg-border bg-white p-6 hover:border-text-muted"
                    >
                      <div className="font-sans font-semibold text-text-primary mb-2">{item.title}</div>
                      <div className="text-sm text-text-secondary">{item.description}</div>
                      <div className="mt-4 text-sm text-accent-secondary">Open page →</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-bg-border bg-white p-6">
                <h3 className="mb-2 font-semibold text-text-primary">How grades work</h3>
                <p className="text-sm text-text-secondary">
                  Every grade in an API response is produced by the published rules.{" "}
                  <Link href="/methodology" className="text-accent-secondary hover:underline">
                    Read the methodology
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
