/**
 * Turns the generated OpenAPI spec (src/data/openapi.json, written by the backend's
 * `python -m app.export_contract`) into a model the API reference renders at build time.
 *
 * Nothing here knows about specific endpoints or schemas: the spec is walked generically, so a
 * regenerated file with new paths, tags, fields or $refs shows up without code changes. The only
 * hand-kept rules are which path prefixes are internal and which need an API key.
 */
import spec from "@/data/openapi.json";
import { HTTP_METHODS, authForPath, isInternalPath, operationAnchor } from "@/lib/openapi-rules.mjs";

export { authForPath, isInternalPath, operationAnchor };

type Json = Record<string, unknown>;

export type SchemaObject = {
  $ref?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  default?: unknown;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  additionalProperties?: boolean | SchemaObject;
  anyOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  allOf?: SchemaObject[];
  nullable?: boolean;
};

export type FieldRow = {
  /** Dotted path, e.g. `counterparty.wallet_address` or `risk_flags[].code`. */
  name: string;
  depth: number;
  type: string;
  required: boolean;
  nullable: boolean;
  description?: string;
  enumValues?: string[];
  constraints: string[];
};

export type ParamRow = FieldRow & { location: string };

export type ResponseModel = {
  status: string;
  description: string;
  /** Present when the response has a documented JSON body. */
  type?: string;
  fields: FieldRow[];
};

export type Operation = {
  id: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
  tag: string;
  auth: "key" | "public";
  deprecated: boolean;
  params: ParamRow[];
  body?: { required: boolean; type: string; fields: FieldRow[] };
  responses: ResponseModel[];
};

export type TagGroup = { name: string; title: string; description?: string; operations: Operation[] };

/** Auth is documented separately, so this header parameter is not repeated in every table. */
const AUTH_HEADERS = new Set(["x-api-key", "authorization"]);

const components = ((spec as Json).components ?? {}) as { schemas?: Record<string, SchemaObject> };

function resolveRef(ref: string): { name: string; schema: SchemaObject } | null {
  const m = /^#\/components\/schemas\/(.+)$/.exec(ref);
  if (!m) return null;
  const name = decodeURIComponent(m[1]);
  const schema = components.schemas?.[name];
  return schema ? { name, schema } : null;
}

/** Follows $ref (and single-member allOf wrappers). Returns the target and its component name. */
function deref(schema: SchemaObject | undefined, seen: Set<string> = new Set()): { schema: SchemaObject; refName?: string } {
  if (!schema) return { schema: {} };
  if (schema.$ref) {
    const hit = resolveRef(schema.$ref);
    if (!hit || seen.has(hit.name)) return { schema: {}, refName: hit?.name };
    seen.add(hit.name);
    const inner = deref(hit.schema, seen);
    // Keep a description written next to the $ref (FastAPI puts field docs there).
    return { schema: { ...inner.schema, description: schema.description ?? inner.schema.description }, refName: hit.name };
  }
  if (schema.allOf && schema.allOf.length === 1 && !schema.properties) {
    const inner = deref(schema.allOf[0], seen);
    return { schema: { ...inner.schema, description: schema.description ?? inner.schema.description }, refName: inner.refName };
  }
  return { schema };
}

function isNullSchema(s: SchemaObject) {
  return s.type === "null" || (Array.isArray(s.type) && s.type.length === 1 && s.type[0] === "null");
}

/** Splits `anyOf: [X, null]` into X plus a nullable flag. Multi-member unions stay as anyOf. */
function unwrapNullable(schema: SchemaObject): { schema: SchemaObject; nullable: boolean } {
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants) {
    const nonNull = variants.filter((v) => !isNullSchema(v));
    const nullable = nonNull.length !== variants.length;
    if (nonNull.length === 1) {
      return {
        schema: { ...nonNull[0], description: schema.description ?? nonNull[0].description, default: schema.default ?? nonNull[0].default },
        nullable,
      };
    }
    return { schema: { ...schema, anyOf: nonNull, oneOf: undefined }, nullable };
  }
  if (Array.isArray(schema.type) && schema.type.includes("null")) {
    const rest = schema.type.filter((t) => t !== "null");
    return { schema: { ...schema, type: rest.length === 1 ? rest[0] : rest }, nullable: true };
  }
  return { schema, nullable: Boolean(schema.nullable) };
}

/** $ref -> nullable unwrap -> $ref again, so `anyOf: [{$ref}, null]` lands on the component. */
function resolveSchema(input: SchemaObject | undefined): { schema: SchemaObject; nullable: boolean; refName?: string } {
  const first = deref(input);
  const { schema: unwrapped, nullable } = unwrapNullable(first.schema);
  const second = deref(unwrapped);
  return { schema: second.schema, nullable, refName: second.refName ?? first.refName };
}

function typeLabel(input: SchemaObject | undefined, depth = 0): string {
  if (!input || depth > 6) return "any";
  const { schema: s0, refName } = deref(input);
  const { schema: s } = unwrapNullable(s0);
  const variants = s.anyOf ?? s.oneOf;
  if (variants && variants.length) return Array.from(new Set(variants.map((v) => typeLabel(v, depth + 1)))).join(" | ");
  if (s.const !== undefined) return JSON.stringify(s.const);
  const t = Array.isArray(s.type) ? s.type.join(" | ") : s.type;
  if (t === "array") return `array of ${typeLabel(s.items, depth + 1)}`;
  if (t === "object" || s.properties) {
    if (refName) return refName;
    if (s.additionalProperties && typeof s.additionalProperties === "object" && !s.properties) {
      return `map of ${typeLabel(s.additionalProperties, depth + 1)}`;
    }
    return "object";
  }
  if (t === "string" && s.format) return `string (${s.format})`;
  if (t) return t;
  if (refName) return refName;
  return "any";
}

function fmt(v: unknown) {
  return typeof v === "string" ? v : JSON.stringify(v);
}

function constraintsOf(s: SchemaObject): string[] {
  const out: string[] = [];
  if (s.minLength !== undefined && s.maxLength !== undefined) out.push(`${s.minLength}–${s.maxLength} characters`);
  else if (s.maxLength !== undefined) out.push(`max ${s.maxLength} characters`);
  else if (s.minLength !== undefined) out.push(`min ${s.minLength} characters`);
  if (s.minimum !== undefined && s.maximum !== undefined) out.push(`${s.minimum}–${s.maximum}`);
  else if (s.minimum !== undefined) out.push(`≥ ${s.minimum}`);
  else if (s.maximum !== undefined) out.push(`≤ ${s.maximum}`);
  if (s.exclusiveMinimum !== undefined) out.push(`> ${s.exclusiveMinimum}`);
  if (s.exclusiveMaximum !== undefined) out.push(`< ${s.exclusiveMaximum}`);
  if (s.minItems !== undefined) out.push(`min ${s.minItems} items`);
  if (s.maxItems !== undefined) out.push(`max ${s.maxItems} items`);
  if (s.pattern) out.push(`pattern ${s.pattern}`);
  if (s.default !== undefined && s.default !== null && !(typeof s.default === "object" && Object.keys(s.default as object).length === 0)) {
    out.push(`default ${fmt(s.default)}`);
  }
  return out;
}

/** For union types, constraints and enums from each variant are merged into one row. */
function describeLeaf(s: SchemaObject): { constraints: string[]; enumValues?: string[] } {
  const variants = s.anyOf ?? s.oneOf;
  const parts = variants && variants.length ? variants.map((v) => deref(v).schema) : [s];
  const constraints = new Set<string>(constraintsOf(s));
  const enums = new Set<string>();
  for (const p of parts) {
    constraintsOf(p).forEach((c) => constraints.add(c));
    p.enum?.forEach((e) => enums.add(fmt(e)));
  }
  return { constraints: Array.from(constraints), enumValues: enums.size ? Array.from(enums) : undefined };
}

/**
 * Flattens a schema into rows. Objects nest with `parent.child`, arrays of objects with `parent[].child`.
 * Component schemas are expanded once per branch to stop recursive types from looping.
 */
export function schemaFields(input: SchemaObject | undefined, prefix = "", depth = 0, seen: Set<string> = new Set()): FieldRow[] {
  if (!input || depth > 6) return [];
  const { schema: s, refName } = resolveSchema(input);
  if (refName && seen.has(refName)) return [];
  const nextSeen = refName ? new Set(seen).add(refName) : seen;

  // Arrays at the top level: describe the items.
  if (s.type === "array" && !prefix) return schemaFields(s.items, "[]", depth, nextSeen);

  const props = s.properties ?? {};
  const required = new Set(s.required ?? []);
  const rows: FieldRow[] = [];
  for (const [key, raw] of Object.entries(props)) {
    const name = prefix ? `${prefix}.${key}` : key;
    const { schema: inner, nullable } = resolveSchema(raw);
    const leaf = describeLeaf(inner);
    rows.push({
      name,
      depth,
      type: typeLabel(raw),
      required: required.has(key),
      nullable,
      description: raw.description ?? inner.description,
      enumValues: leaf.enumValues,
      constraints: leaf.constraints,
    });
    if (inner.properties) rows.push(...schemaFields(raw, name, depth + 1, nextSeen));
    else if (inner.type === "array" && inner.items) {
      const item = resolveSchema(inner.items).schema;
      if (item.properties) rows.push(...schemaFields(inner.items, `${name}[]`, depth + 1, nextSeen));
    }
  }
  return rows;
}

function titleCase(tag: string) {
  return tag.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function jsonSchemaOf(content: unknown): SchemaObject | undefined {
  if (!content || typeof content !== "object") return undefined;
  const c = content as Record<string, { schema?: SchemaObject }>;
  const key = Object.keys(c).find((k) => k.includes("json")) ?? Object.keys(c)[0];
  return key ? c[key]?.schema : undefined;
}

function buildOperation(path: string, method: string, op: Json, pathItem: Json): Operation {
  const rawParams = [...((pathItem.parameters as Json[]) ?? []), ...((op.parameters as Json[]) ?? [])];
  const params: ParamRow[] = [];
  for (const p0 of rawParams) {
    const p = (p0.$ref ? (resolveRef(String(p0.$ref))?.schema as Json) : p0) ?? p0;
    const name = String(p.name ?? "");
    if (!name || (p.in === "header" && AUTH_HEADERS.has(name.toLowerCase()))) continue;
    const schema = (p.schema ?? {}) as SchemaObject;
    const { schema: inner, nullable } = resolveSchema(schema);
    const leaf = describeLeaf(inner);
    params.push({
      name,
      location: String(p.in ?? ""),
      depth: 0,
      type: typeLabel(schema),
      required: Boolean(p.required),
      nullable,
      description: (p.description as string) ?? inner.description,
      enumValues: leaf.enumValues,
      constraints: leaf.constraints,
    });
  }

  let body: Operation["body"];
  const rb = op.requestBody as Json | undefined;
  if (rb) {
    const schema = jsonSchemaOf(rb.content);
    body = { required: Boolean(rb.required), type: typeLabel(schema), fields: schemaFields(schema) };
  }

  const responses: ResponseModel[] = Object.entries((op.responses as Record<string, Json>) ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, r]) => {
      const schema = jsonSchemaOf(r.content);
      const isValidation = status === "422" && schema?.$ref?.endsWith("/HTTPValidationError");
      return {
        status,
        description: String(r.description ?? ""),
        type: schema && !isValidation ? typeLabel(schema) : undefined,
        fields: schema && !isValidation ? schemaFields(schema) : [],
      };
    });

  return {
    id: operationAnchor(method, path),
    method: method.toUpperCase(),
    path,
    summary: String(op.summary ?? op.operationId ?? `${method.toUpperCase()} ${path}`),
    description: op.description ? String(op.description) : undefined,
    tag: ((op.tags as string[]) ?? [])[0] ?? "other",
    auth: authForPath(path),
    deprecated: Boolean(op.deprecated),
    params,
    body,
    responses,
  };
}

/** All public operations, grouped by their first tag, in spec order. */
export function publicOperationGroups(): TagGroup[] {
  const paths = ((spec as Json).paths ?? {}) as Record<string, Json>;
  const declared = (((spec as Json).tags as { name: string; description?: string }[]) ?? []).filter(Boolean);
  const groups = new Map<string, TagGroup>();
  for (const t of declared) groups.set(t.name, { name: t.name, title: titleCase(t.name), description: t.description, operations: [] });

  for (const [path, item] of Object.entries(paths)) {
    if (isInternalPath(path)) continue;
    for (const method of HTTP_METHODS) {
      const op = item[method] as Json | undefined;
      if (!op || (op as Json)["x-internal"]) continue;
      const operation = buildOperation(path, method, op, item);
      if (!groups.has(operation.tag)) groups.set(operation.tag, { name: operation.tag, title: titleCase(operation.tag), operations: [] });
      groups.get(operation.tag)!.operations.push(operation);
    }
  }
  return Array.from(groups.values()).filter((g) => g.operations.length);
}

export const specInfo = {
  title: String(((spec as Json).info as Json | undefined)?.title ?? "API"),
  version: String(((spec as Json).info as Json | undefined)?.version ?? ""),
  openapi: String((spec as Json).openapi ?? ""),
};
