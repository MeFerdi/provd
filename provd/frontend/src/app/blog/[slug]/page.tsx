import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import Markdown from "@/components/ui/markdown";
import { getGeneratedBlogRecords } from "@/lib/content/generated-content";

type Props = {
  params: { slug: string };
};

export async function generateStaticParams() {
  return getGeneratedBlogRecords().map((post) => ({ slug: post.slug }));
}

export default function BlogPostPage({ params }: Props) {
  const { slug } = params;
  const post = getGeneratedBlogRecords().find((record) => record.slug === slug);

  if (!post) notFound();

  return (
    <div className="py-10">
      <Container size="default">
        <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Blog</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-4">
          {post.title ?? slug}
        </h1>
        {post.description ? <p className="text-text-secondary mb-6">{post.description}</p> : null}
        {post.date ? (
          <div className="text-xs font-mono tracking-[0.22em] uppercase text-text-muted mb-8">
            {String(post.date)}
          </div>
        ) : null}

        <Markdown>{post.content}</Markdown>
      </Container>
    </div>
  );
}
