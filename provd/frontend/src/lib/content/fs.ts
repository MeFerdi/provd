import { promises as fs } from "node:fs";
import path from "node:path";

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listFilesRecursive(dir: string, exts: string[]) {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await listFilesRecursive(p, exts)));
      continue;
    }
    if (exts.some((ext) => e.name.toLowerCase().endsWith(ext))) out.push(p);
  }
  return out;
}

