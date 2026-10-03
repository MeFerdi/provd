#!/usr/bin/env node
// Runs the same verification code the /verify page uses against a decision JSON.
//   node scripts/check-verify.mjs [path/to/decision.json] [--tamper]
// Exits 0 when every check passes (pending anchor is fine), 1 otherwise.
// --tamper flips one character inside `record` first, which must make the run fail.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, foldMerkle, parseLossless, pythonFloatRepr, verifyDecision, verifySignature } from "../src/lib/proof/verify-decision.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const tamper = args.includes("--tamper");
const file = args.find((a) => !a.startsWith("--")) ?? path.join(here, "..", "src", "data", "example-decision.json");

let failures = 0;
function expect(name, cond, extra = "") {
  console.log(`[${cond ? "ok" : "FAIL"}] ${name}${extra ? ` ${extra}` : ""}`);
  if (!cond) failures++;
}

// Canonicalization unit checks against known Python outputs.
const floatCases = [
  ["3.0", "3.0"], ["0.0", "0.0"], ["-0.0", "-0.0"], ["0.1", "0.1"], ["1e-05", "1e-05"], ["0.0001", "0.0001"],
  ["1e16", "1e+16"], ["1234567890123456.0", "1234567890123456.0"], ["1.5e300", "1.5e+300"], ["2.5E-7", "2.5e-07"],
  ["100.0", "100.0"], ["12345.678", "12345.678"],
];
for (const [input, want] of floatCases) {
  const got = pythonFloatRepr(input);
  expect(`python float repr ${input}`, got === want, got === want ? "" : `got ${got}, want ${want}`);
}
const canon = canonicalJson(parseLossless('{"b": 1, "a": {"z": [1, 2.50, "é\\n\\u0001"], "\\u00e9": null, "B": true}}'));
const wantCanon = '{"a":{"B":true,"z":[1,2.5,"é\\n\\u0001"],"é":null},"b":1}';
expect("canonical JSON (sorted keys, raw UTF-8, Python escapes)", canon === wantCanon, canon === wantCanon ? "" : canon);

// The real decision.
let text = readFileSync(file, "utf8");
if (tamper) {
  // Flip one character of the first string value inside "record" (a letter, so the JSON stays valid).
  const start = text.indexOf('"record"');
  const re = /"[a-z_]+"\s*:\s*"([A-Za-z])/g;
  re.lastIndex = start + 8;
  const m = re.exec(text);
  const at = m.index + m[0].length - 1;
  const flipped = text[at] === "a" ? "b" : "a";
  console.log(`tampering: record character at ${at} '${text[at]}' -> '${flipped}'`);
  text = text.slice(0, at) + flipped + text.slice(at + 1);
}

// Negative controls on the untouched file: a wrong digest or a flipped Merkle side must not pass.
if (!tamper) {
  const b = JSON.parse(text);
  const otherDigest = b.record_hash.replace(/^./, (c) => (c === "0" ? "1" : "0"));
  expect("signature rejects a different digest", !verifySignature(otherDigest, b.signature.value, b.signature.public_key));
  if (b.merkle?.proof?.length) {
    const flipped = b.merkle.proof.map((p, i) => (i === 0 ? { ...p, side: p.side === "left" ? "right" : "left" } : p));
    expect("merkle rejects a flipped sibling side", foldMerkle(b.record_hash, flipped) !== b.merkle.root);
  }
}

const result = verifyDecision(text);
console.log(`\ndecision ${result.intentId}`);
for (const c of result.checks) {
  const tag = { pass: "ok", fail: "FAIL", pending: "..", warn: "!!" }[c.status];
  console.log(`[${tag}] ${c.label}: ${c.detail}`);
  for (const [k, v] of Object.entries(c.values)) console.log(`       ${k}: ${v}`);
  if (c.status === "fail") failures++;
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
