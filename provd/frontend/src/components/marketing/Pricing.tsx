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
            <h2 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.06]">Start with one workflow. Scale across every corridor.</h2>
          </div>
          <p className="text-text-secondary text-lg md:text-xl max-w-xl md:justify-self-end leading-relaxed">
            Provd integrates at the point of approval, one endpoint, no pipeline rebuild. Start with a single desk or corridor and expand as your volume and partner network grow.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <AnimatedCard index={0}>
            <Card className="h-full bg-bg-surface">
              <CardContent className="p-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted mb-3">Pilot / Early Access</div>
                <div className="font-sans font-semibold text-lg md:text-xl text-text-primary mb-1">Early access</div>
                <div className="font-mono text-accent-primary text-2xl mb-4">Free or low-cost</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>Score counterparties in one live approval workflow</li>
                  <li>Validate precision against your existing thresholds</li>
                  <li>Measure the trades you were blocking that you shouldn&apos;t have been</li>
                  <li>Available to design partners and early evaluators</li>
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
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted mb-3">Starter</div>
                <div className="font-sans font-semibold text-lg md:text-xl text-text-primary mb-1">Counterparty scoring</div>
                <div className="font-mono text-accent-primary text-2xl mb-4">$199–$399/mo</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>One API call per trade, before release</li>
                  <li>Score, risk level, reason flags, and recommended action</li>
                  <li>Single desk, corridor, or approval flow</li>
                  <li>For operators ready to move from manual review to precision scoring</li>
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
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted mb-3">Growth / Enterprise</div>
                <div className="font-sans font-semibold text-lg md:text-xl text-text-primary mb-1">Operations and network intelligence</div>
                <div className="font-mono text-accent-primary text-2xl mb-4">$999–$1,500/mo · Custom</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>Full review and dispute workflow support</li>
                  <li>Coverage across multiple desks, rails, and markets</li>
                  <li>Partner network intelligence, contribute and consume shared signals</li>
                  <li>Enterprise onboarding, governance alignment, and custom terms</li>
                </ul>
                <Button className="w-full" size="lg" variant="outline" href="mailto:hello@provd.tech">
                  Talk to sales
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </Container>
    </Section>
  );
}
