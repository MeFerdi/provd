import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export const metadata = {
  title: "Careers — Provd",
};

export default function CareersPage() {
  return (
    <>
      <Section className="border-b border-bg-border pt-14 pb-16" padded={false}>
        <Container>
          <div className="max-w-2xl">
            <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Careers</div>
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              We&apos;re hiring soon.
            </h1>
            <p className="text-text-secondary text-lg">
              Provd is still in active product development, and we&apos;re not opening formal roles yet. As the company grows,
              we expect to hire across engineering, blockchain, compliance, and partnerships.
            </p>
            <div className="mt-8">
              <Button size="lg" href="/about">
                Learn more about Provd
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="rounded-2xl border border-bg-border bg-bg-surface/50">
            <div className="p-6 md:p-8 border-b border-bg-border">
              <div className="font-sans font-semibold text-text-primary">Planned hiring areas</div>
              <div className="text-sm text-text-secondary mt-1">
                We&apos;ll share specific roles once the company is ready to hire beyond the current solo-founder stage.
              </div>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              {[
                {
                  title: "Development",
                  body: "Frontend, backend, and product engineering as the platform matures.",
                },
                {
                  title: "Blockchain",
                  body: "Protocol, wallet, and onchain integration work across settlement rails.",
                },
                {
                  title: "Compliance",
                  body: "Policy, controls, and operational risk support for regulated market expansion.",
                },
                {
                  title: "Partnerships",
                  body: "Exchange, OTC, payment-rail, and ecosystem relationship building.",
                },
              ].map((area, index) => (
                <div
                  key={area.title}
                  className={`p-6 md:p-8 ${index < 2 ? "md:border-b" : ""} ${
                    index % 2 === 0 ? "md:border-r" : ""
                  } border-bg-border`}
                >
                  <div className="font-sans font-semibold text-text-primary">{area.title}</div>
                  <div className="text-sm text-text-secondary mt-2 leading-relaxed">{area.body}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-bg-border p-6 md:p-8">
              <div className="text-sm text-text-secondary">
                If you want to stay close to the company as roles open, keep an eye on this page and our company updates.
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
