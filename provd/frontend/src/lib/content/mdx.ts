import path from "node:path";
import { promises as fs } from "node:fs";

import { createElement } from "react";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import { compileMDX } from "next-mdx-remote/rsc";

import { formatContentDate } from "@/lib/content/date";
import { siteHref } from "@/lib/sites";

export type MdxFrontmatter = {
  title?: string;
  description?: string;
  /** YAML dates may be parsed as Date by gray-matter */
  date?: string;
  tags?: string[];
};

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as { props: { children?: React.ReactNode } }).props.children);
  return "";
}

export function headingId(children: React.ReactNode): string {
  return textOf(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Docs content links to `/docs/<page>` for other docs pages and to plain site paths (`/check`, `/verify`,
 * `/contracts/...`) for provd.tech. On docs.provd.tech, docs pages live at the root, everything else is on the
 * main site, and the endpoint reference (`/docs/api-reference`) is the playground.
 */
export function docsContentHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href === "/docs/api-reference" || href.startsWith("/docs/api-reference#")) return siteHref("docs", "playground", "/");
  if (href === "/docs" || href.startsWith("/docs#")) return href.slice(5) || "/";
  if (href.startsWith("/docs/")) return href.slice(5);
  return siteHref("docs", "main", href);
}

/** Headings get ids so pages can link to sections (e.g. /reference#errors). */
const headingComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => createElement("h2", { id: headingId(children), className: "scroll-mt-24" }, children),
  h3: ({ children }: { children?: React.ReactNode }) => createElement("h3", { id: headingId(children), className: "scroll-mt-24" }, children),
};

export async function renderMdxFile(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const { content, data } = matter(raw);
  const rawData = data as Record<string, unknown>;

  const frontmatter: MdxFrontmatter = {
    title: rawData.title as string | undefined,
    description: rawData.description as string | undefined,
    date: formatContentDate(rawData.date),
    tags: rawData.tags as string[] | undefined,
  };

  const compiled = await compileMDX<MdxFrontmatter>({
    source: content,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
    components: {
      ...headingComponents,
      a: ({ href = "", children }: { href?: string; children?: React.ReactNode }) => createElement("a", { href: docsContentHref(href) }, children),
    },
  });

  return {
    frontmatter,
    content: compiled.content,
  };
}

export function docsPathForSlug(slug: string[]) {
  return path.join(process.cwd(), "src", "content", "docs", `${slug.join("/")}.mdx`);
}

export function blogPathForSlug(slug: string) {
  return path.join(process.cwd(), "src", "content", "blog", `${slug}.mdx`);
}

