import { notFound } from "next/navigation";
import path from "node:path";

import { Container } from "@/components/ui/container";
import { fileExists, listFilesRecursive } from "@/lib/content/fs";
import { docsPathForSlug, renderMdxFile } from "@/lib/content/mdx";

type Props = {
  params: { slug: string[] };
};

export async function generateStaticParams() {
  const docsRoot = path.join(process.cwd(), "src", "content", "docs");
  const files = await listFilesRecursive(docsRoot, [".mdx"]);

  return files.map((file) => {
    const relative = path.relative(docsRoot, file).replace(/\\/g, "/").replace(/\.mdx$/, "");
    return { slug: relative.split("/") };
  });
}

export default async function DocSlugPage({ params }: Props) {
  const { slug } = params;
  const mdxPath = docsPathForSlug(slug);

  if (!(await fileExists(mdxPath))) notFound();

  const { frontmatter, content } = await renderMdxFile(mdxPath);

  return (
    <Container size="default">
      <div className="pb-14">
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-4">
          {frontmatter.title ?? slug[slug.length - 1]}
        </h1>
        {frontmatter.description ? <p className="text-text-secondary mb-8">{frontmatter.description}</p> : null}

        <article className="prose max-w-none break-words prose-pre:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:max-w-full prose-table:overflow-x-auto">{content}</article>
      </div>
    </Container>
  );
}
