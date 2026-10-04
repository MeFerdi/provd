"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/env";
import { type SiteId, siteHref } from "@/lib/sites";

type Created = { api_key: string; playground_url: string; docs_url: string };

const field =
  "h-11 w-full min-w-0 rounded-md border border-[#CFCFCA] bg-white px-3 text-[15px] text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary";

/**
 * Creates a sandbox key on the spot. The key is shown once and kept only in this component's state.
 * `onKey` lets the playground open itself straight away with the new key.
 */
export function SandboxSignup({ site, onKey }: { site: SiteId; onKey?: (key: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/developer/sandbox-keys"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null, company: company.trim() || null, website: website || null }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 201) {
        setCreated(body as Created);
        return;
      }
      if (response.status === 422) setError("Check your email address and try again.");
      else if (response.status === 429) setError("Too many sign-ups from your network. Try again in an hour.");
      else setError(typeof body.detail === "string" ? body.detail : "Couldn't create a key right now. Try again shortly.");
    } catch {
      setError("Couldn't reach Provd. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the key stays visible for manual copying */
    }
  };

  if (created) {
    return (
      <div className="rounded-md border border-[#ABEFC6] bg-[#ECFDF3] p-5" role="status">
        <div className="font-sans text-base font-semibold text-text-primary">Your sandbox key</div>
        <div className="mt-3 flex items-stretch gap-2">
          <code className="min-w-0 flex-1 break-all rounded-md border border-bg-border bg-white px-3 py-2.5 font-mono text-[13px] text-text-primary">
            {created.api_key}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy the key"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-bg-border bg-white px-3 text-sm text-text-primary hover:bg-bg-surface"
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          <strong className="font-semibold text-text-primary">Copy it now: it&apos;s shown only once.</strong> Keep it in your
          secret store. It scores the sandbox test wallets for free; for a live key, email{" "}
          <a href="mailto:hello@provd.tech" className="text-accent-secondary hover:underline">
            hello@provd.tech
          </a>
          .
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {onKey ? (
            <Button size="lg" onClick={() => onKey(created.api_key)}>
              Open the playground with this key
            </Button>
          ) : (
            <Button href={siteHref(site, "playground", "/")} size="lg">
              Open the playground
            </Button>
          )}
          <Button href={siteHref(site, "docs", "/quickstart")} size="lg" variant="secondary">
            Read the quickstart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-text-primary">
          Work email
        </label>
        <input id="signup-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-text-primary">
            Name <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input id="signup-name" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="signup-company" className="mb-1.5 block text-sm font-medium text-text-primary">
            Company <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input id="signup-company" autoComplete="organization" maxLength={150} value={company} onChange={(e) => setCompany(e.target.value)} className={field} />
        </div>
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="signup-website">Website</label>
        <input id="signup-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <div>
        <Button type="submit" size="lg" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? "Creating your key…" : "Get a sandbox key"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[#B42318]">
          {error}
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-text-muted">
        Free and instant. We&apos;ll use your email to follow up about your integration; see the{" "}
        <a href={siteHref(site, "main", "/privacy-policy")} className="underline hover:text-text-primary">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
