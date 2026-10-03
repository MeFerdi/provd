// The preview ratings snapshot (unpublished protocols) is generated locally and never committed.
// Create an empty one when missing so imports resolve in fresh checkouts and CI.
import { promises as fs } from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "src", "data", "ratings-snapshot.preview.json");
try {
  await fs.access(file);
} catch {
  await fs.writeFile(file, JSON.stringify({ generated_at: "1970-01-01T00:00:00Z", preview: true, protocols: [] }, null, 1) + "\n");
}
