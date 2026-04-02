import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import Markdown from "@/components/ui/markdown";
import { getGeneratedDocsRecords } from "@/lib/content/generated-content";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = {
  params: Promise<{ slug: string[] }>;
};

export async function generateStaticParams() {
  return getGeneratedDocsRecords().map((record) => ({ slug: record.slug.split("/") }));
}

export default async function DocSlugPage({ params }: Props) {
  const { slug } = await params;
  const record = getGeneratedDocsRecords().find((entry) => entry.slug === slug.join("/"));

  if (!record) notFound();

  return (
    <Container size="default">
      <div className="pb-14">
        <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Docs</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-4">
          {record.title ?? slug[slug.length - 1]}
        </h1>
        {record.description ? <p className="text-text-secondary mb-8">{record.description}</p> : null}

        <Markdown>{record.content}</Markdown>
      </div>
    </Container>
  );
}

