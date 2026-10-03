import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import Markdown from "@/components/ui/markdown";
import { getGeneratedBlogRecords } from "@/lib/content/generated-content";

type Props = {
  params: { slug: string };
};

export function generateMetadata({ params }: Props): Metadata {
  const post = getGeneratedBlogRecords().find((record) => record.slug === params.slug);
  if (!post) return { title: "Research — Provd" };
  return {
    title: `${post.title} — Provd Research`,
    description: post.description || undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description || undefined },
  };
}

export async function generateStaticParams() {
  return getGeneratedBlogRecords().map((post) => ({ slug: post.slug }));
}

export default function BlogPostPage({ params }: Props) {
  const { slug } = params;
  const post = getGeneratedBlogRecords().find((record) => record.slug === slug);

  if (!post) notFound();

  return (
    <article className="pb-20 pt-28">
      <Container size="default">
        <Link href="/blog" className="mb-4 inline-block text-sm text-accent-secondary hover:underline">← Research</Link>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-4">
          {post.title ?? slug}
        </h1>
        {post.description ? <p className="mb-4 text-lg leading-relaxed text-text-secondary">{post.description}</p> : null}
        {post.date ? (
          <div className="mb-8 border-b border-bg-border pb-6 text-sm text-text-muted">
            {String(post.date)}
          </div>
        ) : null}

        <Markdown className="prose prose-lg max-w-none prose-headings:font-display prose-table:block prose-table:overflow-x-auto prose-pre:overflow-x-auto break-words">{post.content}</Markdown>
      </Container>
    </article>
  );
}
