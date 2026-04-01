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
              Pricing
            </div>
            <h2 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.06]">Plans that scale with you</h2>
          </div>
          <p className="text-text-secondary text-lg md:text-xl max-w-xl md:justify-self-end leading-relaxed">
            Start small, then expand coverage as your P2P volume grows. All plans include core scoring and real-time flags.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-bg-border bg-bg-surface p-1 text-sm md:text-base">
            <button type="button" className="rounded-full px-4 py-2 font-sans font-semibold text-text-primary bg-bg-base">
              Monthly
            </button>
            <button
              type="button"
              className="rounded-full px-4 py-2 font-sans font-semibold text-text-secondary hover:text-text-primary"
            >
              Annual <span className="text-accent-primary">(2 months free)</span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <AnimatedCard index={0}>
            <Card className="h-full bg-bg-surface">
              <CardContent className="p-8">
                <div className="font-sans font-semibold text-lg md:text-xl text-text-primary mb-1">Starter</div>
                <div className="font-mono text-accent-primary text-3xl md:text-4xl mb-4">$500/mo</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>10K API calls</li>
                  <li>Core scoring API</li>
                  <li>Email support</li>
                </ul>
                <Button className="w-full" size="lg" variant="secondary" href="/docs/quickstart">
                  Start free trial
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <Card className="h-full bg-bg-surface border-accent-primary/40">
              <CardContent className="p-8">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <div className="font-sans font-semibold text-lg md:text-xl text-text-primary">Growth</div>
                  <div className="rounded border border-accent-primary px-2 py-1 text-xs font-mono text-accent-primary">
                    Most popular
                  </div>
                </div>
                <div className="font-mono text-accent-primary text-3xl md:text-4xl mb-4">$2,500/mo</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>100K API calls</li>
                  <li>Core + dispute intelligence</li>
                  <li>Priority support</li>
                </ul>
                <Button className="w-full" size="lg" href="/pricing">
                  Get started
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard index={2}>
            <Card className="h-full bg-bg-surface">
              <CardContent className="p-8">
                <div className="font-sans font-semibold text-lg md:text-xl text-text-primary mb-1">Enterprise</div>
                <div className="font-mono text-accent-primary text-3xl md:text-4xl mb-4">Custom</div>
                <ul className="text-text-secondary text-sm md:text-base mb-8 space-y-2">
                  <li>Unlimited calls</li>
                  <li>Full suite + compliance reporting</li>
                  <li>Dedicated CSM + SLA</li>
                </ul>
                <Button className="w-full" size="lg" variant="outline" href="/careers">
                  Contact sales
                </Button>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </Container>
    </Section>
  );
}
