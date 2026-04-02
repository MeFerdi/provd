import { AnimatedCard } from "./AnimatedCard";
import { Button } from "../ui/button";
import { Container } from "../ui/container";
import { Section } from "../ui/section";
import { Card, CardContent } from "../ui/card";

export default function Pricing() {
  return (
    <Section className="border-b border-bg-border" variant="base">
      <Container>
        <div className="grid items-end gap-10 md:grid-cols-2">
          <div>
            <div className="uppercase text-accent-primary font-mono text-[0.7rem] sm:text-xs tracking-[0.22em] mb-3">
              Deployment
            </div>
            <h2 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.06]">Integration options for different teams</h2>
          </div>
          <p className="text-text-secondary text-lg md:text-xl max-w-xl md:justify-self-end leading-relaxed">
            Provd can be introduced as a simple scoring endpoint, a review workflow input, or a broader shared fraud-intelligence
            layer across multiple desks and rails.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <AnimatedCard index={0}>
            <Card className="h-full bg-bg-surface">
              <CardContent className="p-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted mb-3">API Layer</div>
                <div className="font-sans font-semibold text-lg md:text-xl text-text-primary mb-3">Counterparty scoring</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>Score counterparties before release</li>
                  <li>Return risk level and reason flags</li>
                  <li>Integrate directly into existing approval logic</li>
                </ul>
                <Button className="w-full" size="lg" variant="secondary" href="/docs/quickstart">
                  Read quickstart
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <Card className="h-full bg-bg-surface border-accent-primary/40">
              <CardContent className="p-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted mb-3">Operations</div>
                <div className="font-sans font-semibold text-lg md:text-xl text-text-primary mb-3">Review and dispute workflows</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>Use flags in operator review queues</li>
                  <li>Attach dispute evidence and case context</li>
                  <li>Support analysts handling higher-risk trades</li>
                </ul>
                <Button className="w-full" size="lg" href="/docs/api-reference">
                  View API reference
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard index={2}>
            <Card className="h-full bg-bg-surface">
              <CardContent className="p-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted mb-3">Network</div>
                <div className="font-sans font-semibold text-lg md:text-xl text-text-primary mb-3">Partner and corridor intelligence</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>Share signals across partner systems</li>
                  <li>Expand coverage across rails and regions</li>
                  <li>Support governance, audit, and reporting needs</li>
                </ul>
                <Button className="w-full" size="lg" variant="outline" href="/about">
                  Learn more
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </Container>
    </Section>
  );
}
