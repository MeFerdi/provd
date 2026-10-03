import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { ApiOperationIndex, ApiOperations } from "@/components/docs/ApiOperations";
import { Container } from "@/components/ui/container";
import { fileExists } from "@/lib/content/fs";
import { docsPathForSlug, renderMdxFile } from "@/lib/content/mdx";
import { publicOperationGroups, specInfo } from "@/lib/openapi";

export const metadata = {
  title: "API Reference | Provd Docs",
  description: "Every public Provd endpoint, generated from the OpenAPI spec, plus the risk scale, flag codes and errors.",
  alternates: { canonical: "/docs/api-reference" },
};

const proseClass =
  "prose max-w-none break-words prose-pre:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:max-w-full prose-table:overflow-x-auto";

export default async function ApiReferencePage() {
  const mdxPath = docsPathForSlug(["api-reference"]);
  if (!(await fileExists(mdxPath))) notFound();

  const { frontmatter, content } = await renderMdxFile(mdxPath);
  const groups = publicOperationGroups();
  const count = groups.reduce((n, g) => n + g.operations.length, 0);

  return (
    <Container size="default">
      <div className="pb-14">
        <h1 className="mb-4 font-display text-4xl leading-[1.08] text-text-primary md:text-5xl">
          {frontmatter.title ?? "API Reference"}
        </h1>
        {frontmatter.description ? <p className="mb-6 text-text-secondary">{frontmatter.description}</p> : null}

        <div className="mb-10 flex flex-col gap-3 rounded-md border border-bg-border bg-bg-surface p-4 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <p>
            {count} endpoints, generated from {specInfo.title} {specInfo.version} (OpenAPI {specInfo.openapi}).
          </p>
          <a
            href="/openapi.json"
            download="provd-openapi.json"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-text-primary bg-white px-3 font-medium text-text-primary hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download OpenAPI spec
          </a>
        </div>

        <article className={proseClass}>{content}</article>

        <section aria-labelledby="endpoints" className="mt-14">
          <h2 id="endpoints" className="mb-4 scroll-mt-24 font-display text-3xl text-text-primary">
            Endpoints
          </h2>
          <ApiOperationIndex groups={groups} />
          <div className="mt-10">
            <ApiOperations groups={groups} />
          </div>
        </section>
      </div>
    </Container>
  );
}
