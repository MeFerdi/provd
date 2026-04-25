import { AnimatedCard } from "./AnimatedCard";
import { Button } from "../ui/button";
import { Container } from "../ui/container";
import { Section } from "../ui/section";

export default function CTA() {
  return (
    <Section className="border-b border-bg-border" variant="elevated">
      <Container>
        <AnimatedCard index={0}>
          <div className="rounded-lg border border-bg-border bg-bg-surface px-6 py-12 md:px-12 md:py-16 text-center">
          <h2 className="font-display text-4xl md:text-6xl text-text-primary mb-5 leading-[1.06]">
            See what your current thresholds are missing.
          </h2>
          <p className="font-sans text-lg md:text-xl text-text-secondary mb-9 max-w-2xl mx-auto leading-relaxed">
            Open the playground to run a live counterparty score, or read the quickstart to integrate Provd into your first approval workflow in under an hour.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" href="/playground">
              Open playground
            </Button>
            <Button size="lg" href="/docs/quickstart">
              Read quickstart
            </Button>
            <Button size="lg" variant="secondary" href="/docs/api-reference">
              View API reference
            </Button>
          </div>
        </div>
        </AnimatedCard>
      </Container>
    </Section>
  );
}
