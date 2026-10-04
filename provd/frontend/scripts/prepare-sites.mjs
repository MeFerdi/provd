// Runs before every build (npm "prebuild" hooks). Generates what the three sites read at build time:
//   - docs.provd.tech search index (sites/docs/public/search-index.json) and the docs content manifest
//     (src/lib/content/generated-content.json, used for the docs sitemap). Docs pages only: the endpoint
//     reference isn't public; the playground loads it from the API with a key.
//   - public/example-decision.json for provd.tech/verify.
//   - shared brand assets copied into each extra site's public/ folder (git-ignored copies).
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const contentRoot = path.join(root, "src", "content");
const docsPublic = path.join(root, "sites", "docs", "public");
const contentManifestPath = path.join(root, "src", "lib", "content", "generated-content.json");
const SHARED_ASSETS = ["provd-logo.svg", "provd.svg", "og-image.png"];
const EXTRA_SITES = ["docs", "playground"];

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
  const heads = [];
  for (const l of md.split("\n")) {
    const m = /^(#{1,3})\s+(.+)$/.exec(l.trim());
    if (m) heads.push(m[2].replace(/\s+/g, " ").trim());
  }
  return heads;
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

async function main() {
  const docsDir = path.join(contentRoot, "docs");
  const files = (await listFiles(docsDir)).filter((f) => f.endsWith(".mdx"));

  const records = [];
  const contentRecords = [];
  for (const file of files) {
    const { data, content } = matter(await fs.readFile(file, "utf8"));
    const slug = path.relative(docsDir, file).replace(/\\/g, "/").replace(/\.mdx$/, "");
    const url = `/${slug}`; // docs.provd.tech serves docs at the root
    const base = { type: "docs", url, title: data.title ?? slug, description: data.description ?? "", date: data.date ?? "", tags: data.tags ?? [] };
    records.push({ ...base, headings: headingsFromMarkdown(content), body: content.replace(/```[\s\S]*?```/g, " ") });
    contentRecords.push({ ...base, slug, content });
  }

  const generatedAt = new Date().toISOString();
  await writeJson(path.join(docsPublic, "search-index.json"), { generatedAt, records });
  console.log(`Wrote ${records.length} docs records to sites/docs/public/search-index.json`);
  await writeJson(contentManifestPath, { generatedAt, records: contentRecords });
  console.log(`Wrote ${contentRecords.length} content records to ${path.relative(root, contentManifestPath)}`);

  // The /verify page fetches the example as text: a JSON import would rewrite numbers like 3.0 as 3
  // and break the hash.
  await fs
    .copyFile(path.join(root, "src", "data", "example-decision.json"), path.join(root, "public", "example-decision.json"))
    .then(() => console.log("Copied src/data/example-decision.json to public/example-decision.json"))
    .catch(() => console.warn("No src/data/example-decision.json; /verify will have no example."));

  for (const site of EXTRA_SITES) {
    const dir = path.join(root, "sites", site, "public");
    await fs.mkdir(dir, { recursive: true });
    for (const asset of SHARED_ASSETS) await fs.copyFile(path.join(root, "public", asset), path.join(dir, asset));
  }
  console.log(`Copied ${SHARED_ASSETS.length} shared assets into ${EXTRA_SITES.map((s) => `sites/${s}/public`).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
