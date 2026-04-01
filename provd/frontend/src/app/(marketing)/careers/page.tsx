import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export const metadata = {
  title: "Careers — Provd",
};

const roles = [
  {
    title: "Frontend Engineer",
    location: "Remote (Africa-friendly)",
    type: "Full-time",
  },
  {
    title: "Applied ML Engineer",
    location: "Remote (Africa-friendly)",
    type: "Full-time",
  },
  {
    title: "Partnerships (Exchanges & Rails)",
    location: "Nairobi / Remote",
    type: "Full-time",
  },
] as const;

export default function CareersPage() {
  return (
    <>
      <Section className="border-b border-bg-border pt-14 pb-16" padded={false}>
        <Container>
          <div className="max-w-2xl">
            <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Careers</div>
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              Help build the next layer of trust.
            </h1>
            <p className="text-text-secondary text-lg">
              We’re building real-time fraud intelligence for African crypto markets. If you care about security, data,
              and great UX, we’d love to meet you.
            </p>
            <div className="mt-8">
              <Button size="lg" href="/about">
                Learn more about Provd →
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="rounded-2xl border border-bg-border bg-bg-surface/50">
            <div className="p-6 md:p-8 border-b border-bg-border">
              <div className="font-sans font-semibold text-text-primary">Open roles</div>
              <div className="text-sm text-text-secondary mt-1">We’ll replace these placeholders when CMS/jobs are wired.</div>
            </div>
            <div className="divide-y divide-bg-border">
              {roles.map((r) => (
                <div key={r.title} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-sans font-semibold text-text-primary">{r.title}</div>
                    <div className="text-sm text-text-secondary mt-1">
                      {r.location} · {r.type}
                    </div>
                  </div>
                  <Button variant="secondary" href="/docs/quickstart">
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

