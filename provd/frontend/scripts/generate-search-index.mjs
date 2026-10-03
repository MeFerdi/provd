import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { HTTP_METHODS, authForPath, isInternalPath, operationAnchor } from "../src/lib/openapi-rules.mjs";

const root = process.cwd();
const contentRoot = path.join(root, "src", "content");
const outPath = path.join(root, "public", "search-index.json");
const contentManifestPath = path.join(root, "src", "lib", "content", "generated-content.json");
const openapiPath = path.join(root, "src", "data", "openapi.json");
const publicOpenapiPath = path.join(root, "public", "openapi.json");

/**
 * The API reference page renders endpoints from the generated OpenAPI spec, so they are not in the
 * MDX. Index each public operation as its own record so search can jump straight to it, and publish
 * the spec at /openapi.json for download.
 */
async function openapiRecords() {
  let raw;
  try {
    raw = await fs.readFile(openapiPath, "utf8");
  } catch {
    console.warn("No src/data/openapi.json; skipping API operations in the search index.");
    return [];
  }
  await fs.copyFile(openapiPath, publicOpenapiPath);
  console.log(`Copied ${path.relative(root, openapiPath)} to ${path.relative(root, publicOpenapiPath)}`);

  const spec = JSON.parse(raw);
  const out = [];
  for (const [p, item] of Object.entries(spec.paths ?? {})) {
    if (isInternalPath(p)) continue;
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      const summary = op.summary ?? "";
      out.push({
        type: "docs",
        url: `/docs/api-reference#${operationAnchor(method, p)}`,
        title: `${method.toUpperCase()} ${p}`,
        description: summary,
        date: "",
        tags: ["api", ...(op.tags ?? [])],
        headings: [summary],
        body: [summary, op.description ?? "", authForPath(p) === "key" ? "X-API-Key required" : "public, no key"].join(" "),
      });
    }
  }
  return out;
}

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
  const contentRecords = [];

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

    contentRecords.push({
      type: isDocs ? "docs" : "blog",
      url,
      slug,
      title: data.title ?? slug,
      description: data.description ?? "",
      date: data.date ?? "",
      tags: data.tags ?? [],
      content,
    });
  }

  // The /verify page fetches the example as text: a JSON import would rewrite numbers like 3.0 as 3
  // and break the hash.
  const examplePath = path.join(root, "src", "data", "example-decision.json");
  await fs
    .copyFile(examplePath, path.join(root, "public", "example-decision.json"))
    .then(() => console.log("Copied src/data/example-decision.json to public/example-decision.json"))
    .catch(() => console.warn("No src/data/example-decision.json; /verify will have no example."));

  const apiRecords = await openapiRecords();
  records.push(...apiRecords);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), records }, null, 2), "utf8");
  console.log(`Wrote ${records.length} records to ${path.relative(root, outPath)}`);

  await fs.mkdir(path.dirname(contentManifestPath), { recursive: true });
  await fs.writeFile(
    contentManifestPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), records: contentRecords }, null, 2),
    "utf8"
  );
  console.log(`Wrote ${contentRecords.length} content records to ${path.relative(root, contentManifestPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

