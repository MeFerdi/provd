"use client";

import { useEffect, useState } from "react";

/** Paystack appends ?reference=<top-up id> to the callback URL. */
export function TopupReference() {
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReference(params.get("reference") ?? params.get("trxref"));
  }, []);

  if (!reference) return null;
  return (
    <div className="mt-8 rounded-md border border-bg-border bg-bg-surface p-5">
      <div className="text-sm text-text-muted">Top-up reference</div>
      <div className="mt-1 break-all font-mono text-[15px] text-text-primary">{reference}</div>
    </div>
  );
}
