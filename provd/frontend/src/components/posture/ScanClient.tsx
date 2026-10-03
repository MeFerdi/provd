"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import { PostureBody, PostureHeader } from "@/components/posture/PostureView";
import { Button } from "@/components/ui/button";
import { ApiError, scanContract } from "@/lib/posture/api";
import type { Posture } from "@/lib/posture/types";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function ScanClient() {
  const [address, setAddress] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Posture | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = new URLSearchParams(window.location.search).get("address");
    if (fromUrl && ADDRESS_RE.test(fromUrl)) setAddress(fromUrl);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = address.trim();
    setError(null);
    if (!ADDRESS_RE.test(value)) {
      setError("Enter a contract address: 0x followed by 40 hexadecimal characters.");
      return;
    }
    setStatus("loading");
    setResult(null);
    try {
      const posture = await scanContract(value, "ethereum");
      setResult(posture);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} noValidate className="rounded-md border border-bg-border bg-white p-4 sm:p-6">
        <label htmlFor="scan-address" className="mb-2 block text-sm font-medium text-text-primary">
          LayerZero V2 OApp or OFT contract on Ethereum
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="scan-address"
            name="address"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x…"
            aria-describedby="scan-help"
            aria-invalid={error ? true : undefined}
            className="h-12 w-full min-w-0 flex-1 rounded-md border border-bg-border bg-white px-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
          />
          <Button type="submit" size="lg" disabled={status === "loading"} className="h-12 sm:w-36">
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Scanning
              </>
            ) : (
              <>
                <Search className="h-4 w-4" aria-hidden="true" /> Scan
              </>
            )}
          </Button>
        </div>
        <p id="scan-help" className="mt-2 text-xs text-text-muted">
          Chain: Ethereum mainnet. A scan reads the contract&apos;s current configuration over public RPC and can take
          up to a minute for contracts with many routes.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-accent-danger">
            {error}
          </p>
        ) : null}
        {status === "loading" ? (
          <p role="status" className="mt-3 text-sm text-text-secondary">
            Reading verifier sets, libraries, owner and delegate from the chain…
          </p>
        ) : null}
      </form>

      {result ? (
        <div ref={resultRef} tabIndex={-1} className="mt-10 space-y-12 focus:outline-none" aria-label="Scan result">
          <PostureHeader posture={result} title="Scan result" />
          <PostureBody posture={result} />
          <p className="text-xs text-text-muted">
            A scan is a point-in-time read of the configuration, not a code audit. A good grade is not a guarantee.
          </p>
        </div>
      ) : null}
    </div>
  );
}
