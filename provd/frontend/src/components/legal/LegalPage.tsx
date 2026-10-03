import { Container } from "@/components/ui/container";
import Markdown from "@/components/ui/markdown";
import { Section } from "@/components/ui/section";

export const LEGAL_LAST_UPDATED = "2 October 2026";

export function LegalPage({ title, content }: { title: string; content: string }) {
  return (
    <Section className="pb-16 pt-28" padded={false}>
      <Container size="default" className="px-4 sm:px-6">
        <h1 className="mb-5 font-display text-4xl leading-[1.08] text-text-primary md:text-5xl">{title}</h1>
        <div className="mb-8 rounded-md border border-bg-border bg-bg-surface px-5 py-4 text-sm text-text-secondary">
          <div className="font-sans font-semibold text-text-primary">Provd Technologies Ltd.</div>
          <div className="mt-1">Last updated: {LEGAL_LAST_UPDATED}</div>
        </div>
        <Markdown className="prose max-w-none break-words prose-table:block prose-table:overflow-x-auto">{content}</Markdown>
      </Container>
    </Section>
  );
}
