// Independent verification of a Provd decision record (GET /v1/decisions/{intent_id}).
//
// Plain ES module on purpose: the /verify page and scripts/check-verify.mjs run exactly this code.
// Types live in verify-decision.d.mts.
//
// Canonical JSON must match the backend byte for byte:
//   json.dumps(record, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
// JSON.parse cannot do that, because it forgets how a number was written (Python writes the float 3.0
// as "3.0", JavaScript would write "3"). So we parse the text ourselves and keep every number literal,
// then print numbers the way Python does: integers as written, floats with Python's repr().

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/** A JSON number literal, kept exactly as written in the source text. */
export class JsonNumber {
  /** @param {string} raw */
  constructor(raw) {
    this.raw = raw;
  }
}

// ---------------------------------------------------------------------------------------------------
// Lossless JSON parser
// ---------------------------------------------------------------------------------------------------

/**
 * Parse JSON text, keeping number literals as JsonNumber and objects as Map (insertion order, last
 * duplicate key wins, as in Python).
 * @param {string} text
 */
export function parseLossless(text) {
  let i = 0;
  const n = text.length;

  const fail = (msg) => {
    throw new SyntaxError(`${msg} at position ${i}`);
  };
  const ws = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) i++;
      else break;
    }
  };

  const parseString = () => {
    // text[i] === '"'
    i++;
    let out = "";
    let start = i;
    while (true) {
      if (i >= n) fail("Unterminated string");
      const c = text[i];
      if (c === '"') {
        out += text.slice(start, i);
        i++;
        return out;
      }
      if (c === "\\") {
        out += text.slice(start, i);
        const e = text[i + 1];
        i += 2;
        switch (e) {
          case '"':
            out += '"';
            break;
          case "\\":
            out += "\\";
            break;
          case "/":
            out += "/";
            break;
          case "b":
            out += "\b";
            break;
          case "f":
            out += "\f";
            break;
          case "n":
            out += "\n";
            break;
          case "r":
            out += "\r";
            break;
          case "t":
            out += "\t";
            break;
          case "u": {
            const hex = text.slice(i, i + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("Bad unicode escape");
            out += String.fromCharCode(parseInt(hex, 16));
            i += 4;
            break;
          }
          default:
            fail("Bad escape");
        }
        start = i;
        continue;
      }
      if (c.charCodeAt(0) < 0x20) fail("Control character in string");
      i++;
    }
  };

  const parseNumber = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
    if (!m) fail("Bad number");
    i += m[0].length;
    return new JsonNumber(m[0]);
  };

  const parseValue = () => {
    ws();
    if (i >= n) fail("Unexpected end of input");
    const c = text[i];
    if (c === "{") {
      i++;
      const obj = new Map();
      ws();
      if (text[i] === "}") {
        i++;
        return obj;
      }
      while (true) {
        ws();
        if (text[i] !== '"') fail("Expected a key");
        const key = parseString();
        ws();
        if (text[i] !== ":") fail("Expected ':'");
        i++;
        obj.set(key, parseValue());
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return obj;
        }
        fail("Expected ',' or '}'");
      }
    }
    if (c === "[") {
      i++;
      const arr = [];
      ws();
      if (text[i] === "]") {
        i++;
        return arr;
      }
      while (true) {
        arr.push(parseValue());
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return arr;
        }
        fail("Expected ',' or ']'");
      }
    }
    if (c === '"') return parseString();
    if (c === "-" || (c >= "0" && c <= "9")) return parseNumber();
    if (text.startsWith("true", i)) {
      i += 4;
      return true;
    }
    if (text.startsWith("false", i)) {
      i += 5;
      return false;
    }
    if (text.startsWith("null", i)) {
      i += 4;
      return null;
    }
    fail(`Unexpected character '${c}'`);
  };

  // Tolerate a UTF-8 BOM from saved files.
  if (text.charCodeAt(0) === 0xfeff) i = 1;
  const value = parseValue();
  ws();
  if (i < n) fail("Unexpected trailing content");
  return value;
}

// ---------------------------------------------------------------------------------------------------
// Canonical JSON (Python json.dumps semantics)
// ---------------------------------------------------------------------------------------------------

/**
 * Python's repr() of a float, given its JSON literal.
 * Shortest round-trip digits (same in JS and Python), then Python's layout: positional notation when
 * the decimal exponent is in [-4, 16), always with a fractional part; otherwise d.ddde+XX.
 * @param {string} raw
 */
export function pythonFloatRepr(raw) {
  const x = Number(raw);
  if (!Number.isFinite(x)) throw new RangeError(`Number out of float range: ${raw}`);
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const sign = x < 0 ? "-" : "";
  const [mant, expStr] = Math.abs(x).toExponential().split("e");
  const digits = mant.replace(".", "");
  const exp = Number(expStr);
  if (exp >= -4 && exp < 16) {
    if (exp < 0) return `${sign}0.${"0".repeat(-exp - 1)}${digits}`;
    const intLen = exp + 1;
    if (digits.length <= intLen) return `${sign}${digits}${"0".repeat(intLen - digits.length)}.0`;
    return `${sign}${digits.slice(0, intLen)}.${digits.slice(intLen)}`;
  }
  const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
  const e = Math.abs(exp) < 10 ? `0${Math.abs(exp)}` : `${Math.abs(exp)}`;
  return `${sign}${m}e${exp < 0 ? "-" : "+"}${e}`;
}

/** Python json: a literal with a fraction or exponent is a float, anything else an int. */
function canonicalNumber(raw) {
  if (/[.eE]/.test(raw)) return pythonFloatRepr(raw);
  // Python's int(): "-0" becomes 0.
  return /^-0$/.test(raw) ? "0" : raw;
}

/** Python sorts str keys by code point; JS's default sort compares UTF-16 units. */
function compareCodePoints(a, b) {
  const ia = a[Symbol.iterator]();
  const ib = b[Symbol.iterator]();
  while (true) {
    const x = ia.next();
    const y = ib.next();
    if (x.done || y.done) return x.done === y.done ? 0 : x.done ? -1 : 1;
    const cx = x.value.codePointAt(0);
    const cy = y.value.codePointAt(0);
    if (cx !== cy) return cx - cy;
  }
}

/**
 * Canonical JSON of a value from parseLossless (or plain JS values).
 * Strings use JSON.stringify, which escapes exactly what Python's ensure_ascii=False escapes
 * (quote, backslash, control characters) and leaves everything else as raw UTF-8.
 */
export function canonicalJson(value) {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (value instanceof JsonNumber) return canonicalNumber(value.raw);
  if (typeof value === "number") {
    // Plain JS numbers have lost their literal; integers are the only safe case.
    if (Number.isInteger(value)) return String(value);
    return pythonFloatRepr(String(value));
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = value instanceof Map ? [...value.entries()] : Object.entries(value);
  entries.sort((a, b) => compareCodePoints(a[0], b[0]));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

// ---------------------------------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------------------------------

const HEX64 = /^[0-9a-f]{64}$/;

/** @param {string} canonical */
export function sha256Hex(canonical) {
  return bytesToHex(sha256(new TextEncoder().encode(canonical)));
}

/**
 * ECDSA secp256k1 over the 32-byte record_hash digest (already hashed: no second SHA-256).
 * @param {string} recordHashHex @param {string} signatureHex compact r||s @param {string} publicKeyHex SEC1
 */
export function verifySignature(recordHashHex, signatureHex, publicKeyHex) {
  try {
    const sig = hexToBytes(signatureHex.trim().toLowerCase());
    if (sig.length !== 64) return false;
    return secp256k1.verify(sig, hexToBytes(recordHashHex.toLowerCase()), hexToBytes(publicKeyHex.trim().toLowerCase()), {
      prehash: false,
      lowS: true,
    });
  } catch {
    return false;
  }
}

/**
 * Fold a Merkle inclusion proof. leaf = SHA256(0x00 || record_hash); node = SHA256(0x01 || left || right).
 * side "left" means the sibling is on the left.
 * @param {string} recordHashHex @param {{hash: string, side: string}[]} proof
 */
export function foldMerkle(recordHashHex, proof) {
  let current = sha256(concat(Uint8Array.of(0), hexToBytes(recordHashHex.toLowerCase())));
  for (const step of proof) {
    const sibling = hexToBytes(String(step.hash).toLowerCase());
    const pair = step.side === "left" ? concat(sibling, current) : concat(current, sibling);
    current = sha256(concat(Uint8Array.of(1), pair));
  }
  return bytesToHex(current);
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/**
 * Run every check on the text of a GET /v1/decisions/{intent_id} response.
 * @param {string} text
 * @param {{ publicKey?: string }} [options]
 */
export function verifyDecision(text, options = {}) {
  const tree = parseLossless(text);
  if (!(tree instanceof Map)) throw new TypeError("Expected a JSON object from GET /v1/decisions/{intent_id}");
  const bundle = JSON.parse(text);
  const rawRecord = tree.get("record");
  if (!(rawRecord instanceof Map)) throw new TypeError("No `record` object in this JSON");
  const recordHash = String(bundle.record_hash ?? "").toLowerCase();

  const checks = [];

  // (a) record hash
  const computed = sha256Hex(canonicalJson(rawRecord));
  checks.push({
    id: "hash",
    label: "Record hash",
    status: HEX64.test(recordHash) && computed === recordHash ? "pass" : "fail",
    detail:
      computed === recordHash
        ? "SHA-256 of the canonical record matches record_hash."
        : "SHA-256 of the canonical record does not match record_hash. The record was changed, or the JSON was re-serialized in a way that lost how numbers were written.",
    values: { computed, expected: recordHash || "(missing)" },
  });

  // (b) signature
  const sig = bundle.signature;
  const pinned = (options.publicKey ?? "").trim().toLowerCase();
  if (!sig || !sig.value) {
    checks.push({ id: "signature", label: "Signature", status: "fail", detail: "This record has no signature.", values: {} });
  } else {
    const key = pinned || String(sig.public_key ?? "").toLowerCase();
    const ok = Boolean(key) && HEX64.test(recordHash) && verifySignature(recordHash, sig.value, key);
    const embedded = String(sig.public_key ?? "").toLowerCase();
    let detail = ok
      ? `ECDSA secp256k1 signature over record_hash is valid for ${pinned ? "the pinned key" : "the key in the file"}.`
      : `Signature does not verify against ${pinned ? "the pinned key" : "the key in the file"}.`;
    if (ok && !pinned) detail += " Pin the key from /v1/proof/keys to rule out a swapped key.";
    if (pinned && embedded && pinned !== embedded) detail += " The pinned key differs from the key in the file.";
    checks.push({
      id: "signature",
      label: "Signature",
      status: ok ? "pass" : "fail",
      detail,
      values: { key_id: String(sig.key_id ?? "—"), public_key: key || "(missing)", key_source: pinned ? "pinned" : "file" },
    });
  }

  // (c) Merkle inclusion
  const merkle = bundle.merkle;
  if (!merkle) {
    checks.push({
      id: "merkle",
      label: "Merkle inclusion",
      status: "pending",
      detail: "Not sealed into a batch yet. Batches seal every few minutes; fetch the decision again.",
      values: {},
    });
  } else {
    let root = "";
    let ok = false;
    try {
      root = foldMerkle(recordHash, Array.isArray(merkle.proof) ? merkle.proof : []);
      ok = root === String(merkle.root ?? "").toLowerCase();
    } catch {
      ok = false;
    }
    const batchRoot = bundle.batch?.merkle_root ? String(bundle.batch.merkle_root).toLowerCase() : null;
    const rootMatchesBatch = batchRoot === null || batchRoot === root;
    checks.push({
      id: "merkle",
      label: "Merkle inclusion",
      status: ok && rootMatchesBatch ? "pass" : "fail",
      detail: ok
        ? rootMatchesBatch
          ? `Leaf ${merkle.leaf_index} folds to the batch root in ${merkle.proof?.length ?? 0} step${merkle.proof?.length === 1 ? "" : "s"}.`
          : "The proof folds to merkle.root, but batch.merkle_root is different."
        : "Folding the proof does not reproduce merkle.root.",
      values: { computed_root: root || "(error)", expected_root: String(merkle.root ?? "(missing)") },
    });
  }

  // (d) anchor (reported, not verified in the browser)
  const anchor = bundle.batch?.anchor ?? null;
  if (!anchor) {
    checks.push({ id: "anchor", label: "Bitcoin anchor", status: "pending", detail: "No batch yet, so nothing is anchored.", values: {} });
  } else {
    const st = String(anchor.status ?? "");
    const status = st === "anchored" ? "pass" : st === "pending" ? "pending" : "warn";
    const detail =
      st === "anchored"
        ? `Root anchored in Bitcoin via ${anchor.method}${anchor.reference ? ` (${anchor.reference})` : ""}. Confirm it yourself with the .ots file.`
        : st === "pending"
          ? `Root submitted to ${anchor.method} calendars. Bitcoin confirmation usually takes a few hours; the .ots file upgrades once it lands.`
          : st === "not_anchored"
            ? "Anchoring is turned off on this server. The root is recorded, but not timestamped on Bitcoin."
            : `Anchoring status: ${st || "unknown"}. The server retries failed submissions.`;
    checks.push({
      id: "anchor",
      label: "Bitcoin anchor",
      status,
      detail,
      values: {
        method: String(anchor.method ?? "—"),
        status: String(anchor.status ?? "—"),
        proof_url: String(anchor.proof_url ?? ""),
        root: String(bundle.batch?.merkle_root ?? merkle?.root ?? ""),
      },
    });
  }

  const ok = checks.every((c) => c.status !== "fail");
  return { ok, intentId: String(bundle.intent_id ?? ""), recordHash, checks, bundle };
}
