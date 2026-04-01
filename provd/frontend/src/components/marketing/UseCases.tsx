import { AnimatedCard } from "./AnimatedCard";
import { Container } from "../ui/container";
import { Section } from "../ui/section";
import { Card, CardContent } from "../ui/card";

const cases = [
  {
    id: "F1",
    title: "Unilateral non-delivery",
    body: "Counterparty fails to deliver crypto or fiat after payment.",
    foot: "Detection: inactivity, no prior successful trades, dispute-graph flags.",
  },
  {
    id: "F2",
    title: "Payment reversal fraud",
    body: "Fiat payment is reversed after crypto is released.",
    foot: "Detection: account hash linked to reversals, velocity patterns, partner flags.",
  },
  {
    id: "F3",
    title: "Serial platform migration",
    body: "Fraudster moves between platforms to avoid detection.",
    foot: "Detection: cross-platform graphs, fingerprint reuse, rapid account creation.",
  },
  {
    id: "F4",
    title: "Coordinated networks",
    body: "Multiple accounts act in concert to defraud users.",
    foot: "Detection: cluster analysis, shared hashes, dispute co-occurrence.",
  },
  {
    id: "F5",
    title: "Social engineering preludes",
    body: "Victim is manipulated into unsafe actions before trade.",
    foot: "Detection: conversation signals, flagged hashes, prior scam patterns.",
  },
];

export default function UseCases() {
  return (
    <Section className="border-b border-bg-border" variant="base">
      <Container>
        <div className="grid items-end gap-10 md:grid-cols-2">
          <div>
            <div className="uppercase text-accent-primary font-mono text-[0.7rem] sm:text-xs tracking-[0.22em] mb-3">
              Use cases
            </div>
            <h2 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.06]">The fraud Provd stops</h2>
          </div>
          <p className="text-text-secondary text-lg md:text-xl max-w-xl md:justify-self-end leading-relaxed">
            Block repeat offenders, reversal scams, and coordinated networks by identifying the counterparty—not just the
            address.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {cases.slice(0, 3).map((c, i) => (
            <AnimatedCard key={c.id} index={i}>
              <Card className="h-full bg-bg-surface">
                <CardContent className="p-6 md:p-7">
                  <div className="font-mono text-accent-primary text-sm mb-2">{c.id}</div>
                  <div className="font-sans text-lg md:text-xl font-semibold text-text-primary mb-2">{c.title}</div>
                  <div className="text-text-secondary text-sm md:text-base mb-3 leading-relaxed">{c.body}</div>
                  <div className="text-xs text-text-muted leading-relaxed">{c.foot}</div>
                </CardContent>
              </Card>
            </AnimatedCard>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {cases.slice(3).map((c, i) => (
            <AnimatedCard key={c.id} index={i + 3}>
              <Card className="h-full bg-bg-surface">
                <CardContent className="p-6 md:p-7">
                  <div className="font-mono text-accent-primary text-sm mb-2">{c.id}</div>
                  <div className="font-sans text-lg md:text-xl font-semibold text-text-primary mb-2">{c.title}</div>
                  <div className="text-text-secondary text-sm md:text-base mb-3 leading-relaxed">{c.body}</div>
                  <div className="text-xs text-text-muted leading-relaxed">{c.foot}</div>
                </CardContent>
              </Card>
            </AnimatedCard>
          ))}
        </div>
      </Container>
    </Section>
  );
}
