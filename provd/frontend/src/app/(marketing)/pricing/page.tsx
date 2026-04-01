import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export const metadata = {
  title: "Pricing — Provd",
};

export default function PricingPage() {
  return (
    <>
      <Section className="border-b border-bg-border pt-14 pb-16" padded={false}>
        <Container>
          <div className="max-w-2xl">
            <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Pricing</div>
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              Clear pricing for
              <br />
              real-time risk.
            </h1>
            <p className="text-text-secondary text-lg">
              Start with scoring and flags, then add dispute intelligence and partner signals as your P2P volume grows.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" href="/docs/quickstart">
                Start building →
              </Button>
              <Button size="lg" variant="secondary" href="/careers">
                Talk to sales
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="rounded-2xl border border-bg-border bg-bg-surface/50 p-8 md:p-10">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <div className="font-sans font-semibold text-text-primary mb-1">Starter</div>
                <div className="font-mono text-accent-primary text-2xl">$500/mo</div>
                <div className="text-sm text-text-secondary mt-2">For early-stage P2P products.</div>
              </div>
              <div>
                <div className="font-sans font-semibold text-text-primary mb-1">Growth</div>
                <div className="font-mono text-accent-primary text-2xl">$2,500/mo</div>
                <div className="text-sm text-text-secondary mt-2">For exchanges with meaningful volume.</div>
              </div>
              <div>
                <div className="font-sans font-semibold text-text-primary mb-1">Enterprise</div>
                <div className="font-mono text-accent-primary text-2xl">Custom</div>
                <div className="text-sm text-text-secondary mt-2">For large platforms and bespoke coverage.</div>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

