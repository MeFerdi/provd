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
            Start protecting your users today.
          </h2>
          <p className="font-sans text-lg md:text-xl text-text-secondary mb-9 max-w-2xl mx-auto leading-relaxed">
            Join exchanges across Sub-Saharan Africa using Provd&apos;s fraud intelligence network to protect P2P traders.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" href="/docs/quickstart">
              Get API Access →
            </Button>
            <Button size="lg" variant="secondary" href="/pricing">
              Schedule a demo
            </Button>
          </div>
        </div>
        </AnimatedCard>
      </Container>
    </Section>
  );
}
