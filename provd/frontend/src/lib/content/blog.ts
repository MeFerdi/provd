import path from "node:path";

import matter from "gray-matter";

import { listFilesRecursive } from "@/lib/content/fs";

export type BlogPost = {
  slug: string;
  title: string;
  description?: string;
  date?: string;
  tags?: string[];
};

const blogDir = path.join(process.cwd(), "src", "content", "blog");

export async function listBlogPosts(): Promise<BlogPost[]> {
  const files = await listFilesRecursive(blogDir, [".mdx"]);
  const posts: BlogPost[] = [];

  for (const file of files) {
    const raw = await import("node:fs/promises").then((m) => m.readFile(file, "utf8"));
    const { data } = matter(raw);

    const rel = path.relative(blogDir, file).replace(/\\/g, "/");
    const slug = rel.replace(/\.mdx$/, "");

    const dateValue = (data as { date?: unknown }).date;
    const date =
      typeof dateValue === "string"
        ? dateValue
        : dateValue instanceof Date
          ? dateValue.toISOString().slice(0, 10)
          : undefined;

    posts.push({
      slug,
      title: (data.title as string) ?? slug,
      description: data.description as string | undefined,
      date,
      tags: data.tags as string[] | undefined,
    });
  }

  return posts.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

