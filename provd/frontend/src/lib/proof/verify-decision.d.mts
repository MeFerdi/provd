export declare class JsonNumber {
  readonly raw: string;
  constructor(raw: string);
}

export type JsonLossless = null | boolean | string | JsonNumber | JsonLossless[] | Map<string, JsonLossless>;

export type CheckStatus = "pass" | "fail" | "pending" | "warn";

export type Check = {
  id: "hash" | "signature" | "merkle" | "anchor";
  label: string;
  status: CheckStatus;
  detail: string;
  values: Record<string, string>;
};

export type DecisionBundle = {
  intent_id?: string;
  record?: Record<string, unknown>;
  record_hash?: string;
  signature?: { algorithm?: string; key_id?: string; public_key?: string; value?: string } | null;
  merkle?: { leaf_index?: number; proof?: { hash: string; side: "left" | "right" }[]; root?: string } | null;
  batch?: {
    batch_id?: string;
    merkle_root?: string;
    leaf_count?: number;
    sealed_at?: string;
    anchor?: {
      method?: string;
      status?: string;
      reference?: string | null;
      anchored_at?: string | null;
      proof_url?: string | null;
    } | null;
  } | null;
  [key: string]: unknown;
};

export type VerifyResult = {
  ok: boolean;
  intentId: string;
  recordHash: string;
  checks: Check[];
  bundle: DecisionBundle;
};

export declare function parseLossless(text: string): JsonLossless;
export declare function pythonFloatRepr(raw: string): string;
export declare function canonicalJson(value: unknown): string;
export declare function sha256Hex(canonical: string): string;
export declare function verifySignature(recordHashHex: string, signatureHex: string, publicKeyHex: string): boolean;
export declare function foldMerkle(recordHashHex: string, proof: { hash: string; side: string }[]): string;
export declare function verifyDecision(text: string, options?: { publicKey?: string }): VerifyResult;
