import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const contentRoot = path.join(root, "src", "content");
const outPath = path.join(root, "public", "search-index.json");

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p)));
    else out.push(p);
  }
  return out;
}

function headingsFromMarkdown(md) {
  const lines = md.split("\n");
  const heads = [];
  for (const l of lines) {
    const m = /^(#{1,3})\s+(.+)$/.exec(l.trim());
    if (!m) continue;
    heads.push(m[2].replace(/\s+/g, " ").trim());
  }
  return heads;
}

async function main() {
  const docsDir = path.join(contentRoot, "docs");
  const blogDir = path.join(contentRoot, "blog");

  const allFiles = [
    ...(await listFiles(docsDir).catch(() => [])),
    ...(await listFiles(blogDir).catch(() => [])),
  ].filter((f) => f.endsWith(".mdx"));

  const records = [];

  for (const file of allFiles) {
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);

    const rel = path.relative(contentRoot, file).replace(/\\/g, "/");
    const isDocs = rel.startsWith("docs/");
    const isBlog = rel.startsWith("blog/");

    const slug = rel.replace(/^(docs|blog)\//, "").replace(/\.mdx$/, "");
    const url = isDocs ? `/docs/${slug}` : isBlog ? `/blog/${slug}` : `/${slug}`;

    records.push({
      type: isDocs ? "docs" : "blog",
      url,
      title: data.title ?? slug,
      description: data.description ?? "",
      date: data.date ?? "",
      tags: data.tags ?? [],
      headings: headingsFromMarkdown(content),
      body: content.replace(/```[\s\S]*?```/g, " "),
    });
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), records }, null, 2), "utf8");
  console.log(`Wrote ${records.length} records to ${path.relative(root, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

