import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getCareersContent } from "@/lib/content/careers";

export const metadata = {
  title: "Careers — Provd",
};

export default function CareersPage() {
  const content = getCareersContent();

  return (
    <>
      <Section className="border-b border-bg-border pt-14 pb-16" padded={false}>
        <Container>
          <div className="max-w-2xl">
            <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">{content.status.eyebrow}</div>
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              {content.status.title}
            </h1>
            <p className="text-text-secondary text-lg">
              {content.status.description}
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
              <div className="font-sans font-semibold text-text-primary">{content.areas_intro.title}</div>
              <div className="text-sm text-text-secondary mt-1">{content.areas_intro.description}</div>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              {content.areas.map((area, index) => (
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
              <div className="text-sm text-text-secondary">{content.footer_note}</div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
