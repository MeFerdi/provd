import { Container } from "@/components/ui/container";
import { docsPathForSlug, renderMdxFile } from "@/lib/content/mdx";
import { fileExists } from "@/lib/content/fs";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Quickstart — Provd Docs",
};

export default async function QuickstartPage() {
  const mdxPath = docsPathForSlug(["quickstart"]);
  if (!(await fileExists(mdxPath))) notFound();

  const { frontmatter, content } = await renderMdxFile(mdxPath);

  return (
    <Container size="default">
      <div className="pb-14">
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-4">
          {frontmatter.title ?? "Quickstart"}
        </h1>
        {frontmatter.description ? <p className="text-text-secondary mb-8">{frontmatter.description}</p> : null}
        <article className="prose max-w-none break-words prose-pre:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:max-w-full prose-table:overflow-x-auto">{content}</article>
      </div>
    </Container>
  );
}

