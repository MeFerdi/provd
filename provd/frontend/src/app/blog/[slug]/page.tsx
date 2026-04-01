import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { blogPathForSlug, renderMdxFile } from "@/lib/content/mdx";
import { fileExists } from "@/lib/content/fs";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const mdxPath = blogPathForSlug(slug);

  if (!(await fileExists(mdxPath))) notFound();

  const { frontmatter, content } = await renderMdxFile(mdxPath);

  return (
    <div className="py-10">
      <Container size="default">
        <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Blog</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-4">
          {frontmatter.title ?? slug}
        </h1>
        {frontmatter.description ? <p className="text-text-secondary mb-6">{frontmatter.description}</p> : null}
        {frontmatter.date ? (
          <div className="text-xs font-mono tracking-[0.22em] uppercase text-text-muted mb-8">
            {String(frontmatter.date)}
          </div>
        ) : null}

        <article className="prose prose-invert max-w-none">{content}</article>
      </Container>
    </div>
  );
}

