
import { Container } from "@/components/ui/container";
import { renderMdxFile } from "@/lib/content/mdx";
import { notFound } from "next/navigation";

export const metadata = {
  title: "About — Provd",
};

export default async function AboutPage() {
  const mdxPath = require("path").join(process.cwd(), "src/content/about.md");
  let content: any = null;
  try {
    content = (await renderMdxFile(mdxPath)).content;
  } catch {
    notFound();
  }
  return (
    <Container size="default">
      <div className="pb-14">
        <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Company</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-4">
          About Provd
        </h1>
        <article className="prose prose-invert max-w-none">{content}</article>
      </div>
    </Container>
  );
}

