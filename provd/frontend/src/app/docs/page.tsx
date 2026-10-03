import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { CONTACT_EMAIL } from "@/lib/env";
import { docsNav } from "@/lib/nav";

export const metadata = {
  title: "Docs — Provd",
  description: "Provd API documentation: score P2P stablecoin trades, ramps and payouts before release.",
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
              Send a trade before you release it and get back a score, the reasons behind it and a decision record.
              One endpoint to start, 300 free checks a month.
            </p>
            <div className="mt-8 grid gap-4 rounded-md border border-bg-border bg-white p-6 md:grid-cols-3">
              <div>
                <div className="font-sans font-semibold text-text-primary">Quickstart</div>
                <div className="mt-2 text-sm text-text-secondary">Score a USDT-on-Tron P2P trade and report the outcome.</div>
              </div>
              <div>
                <div className="font-sans font-semibold text-text-primary">Pay as you go</div>
                <div className="mt-2 text-sm text-text-secondary">Free quota, the 402 response, bundles and top-ups.</div>
              </div>
              <div>
                <div className="font-sans font-semibold text-text-primary">API Reference</div>
                <div className="mt-2 text-sm text-text-secondary">Endpoints, risk scale, flag codes and errors.</div>
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
                <h3 className="mb-2 font-semibold text-text-primary">Need a key?</h3>
                <p className="text-sm text-text-secondary">
                  Email{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-secondary hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                  . To see what Provd returns first, try the{" "}
                  <Link href="/check" className="text-accent-secondary hover:underline">
                    public counterparty check
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
