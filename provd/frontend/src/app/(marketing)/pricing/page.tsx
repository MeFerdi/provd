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
              counterparty intelligence.
            </h1>
            <p className="text-text-secondary text-lg">
              Start with early access, then expand into live approval checks, review workflows, and partner intelligence as your African P2P volume grows.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" href="/docs/api-access">
                View access status
              </Button>
              <Button size="lg" variant="secondary" href="mailto:hello@provd.tech">
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
              <div className="rounded-2xl border border-bg-border bg-bg-base/45 p-5">
                <div className="font-sans font-semibold text-text-primary mb-1">Pilot / Early Access</div>
                <div className="font-mono text-accent-primary text-2xl">Free or low-cost</div>
                <div className="text-sm text-text-secondary mt-2">For early evaluation, beta onboarding, and limited-volume validation.</div>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  <li>Limited-volume access when the platform opens for beta</li>
                  <li>Best for design partners and first integration feedback loops</li>
                  <li>Focused rollout to one workflow or one operating use case</li>
                  <li>Availability depends on current development and beta timing</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-bg-border bg-bg-base/45 p-5">
                <div className="font-sans font-semibold text-text-primary mb-1">Starter</div>
                <div className="font-mono text-accent-primary text-2xl">$199-$399/mo</div>
                <div className="text-sm text-text-secondary mt-2">For a single desk, corridor, or launch market.</div>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  <li>Counterparty scoring API access for live approval checks</li>
                  <li>Score, risk level, flags, and recommended action response</li>
                  <li>Single workflow deployment for early production use</li>
                  <li>Best for smaller operators moving from pilot into active usage</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-bg-border bg-bg-base/45 p-5">
                <div className="font-sans font-semibold text-text-primary mb-1">Growth / Enterprise</div>
                <div className="font-mono text-accent-primary text-2xl">$999-$1,500/mo · Custom</div>
                <div className="text-sm text-text-secondary mt-2">For active review teams, broader deployment, and partner-led intelligence expansion.</div>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  <li>Review and dispute workflow support for operational teams</li>
                  <li>Support across multiple desks, rails, or countries</li>
                  <li>Partner and network-intelligence planning for larger platforms</li>
                  <li>Enterprise commercial terms and rollout support where needed</li>
                </ul>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
