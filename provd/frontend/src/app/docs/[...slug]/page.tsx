import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { docsPathForSlug, renderMdxFile } from "@/lib/content/mdx";
import { fileExists } from "@/lib/content/fs";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function DocSlugPage({ params }: Props) {
  const { slug } = await params;
  const mdxPath = docsPathForSlug(slug);

  if (!(await fileExists(mdxPath))) notFound();

  const { frontmatter, content } = await renderMdxFile(mdxPath);

  return (
    <Container size="default">
      <div className="pb-14">
        <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Docs</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-4">
          {frontmatter.title ?? slug[slug.length - 1]}
        </h1>
        {frontmatter.description ? <p className="text-text-secondary mb-8">{frontmatter.description}</p> : null}

        <article className="prose prose-invert max-w-none">
          {content}
        </article>
      </div>
    </Container>
  );
}

