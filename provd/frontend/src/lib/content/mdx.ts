import path from "node:path";
import { promises as fs } from "node:fs";

import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import { compileMDX } from "next-mdx-remote/rsc";

import { formatContentDate } from "@/lib/content/date";

export type MdxFrontmatter = {
  title?: string;
  description?: string;
  /** YAML dates may be parsed as Date by gray-matter */
  date?: string;
  tags?: string[];
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
    components: {},
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

