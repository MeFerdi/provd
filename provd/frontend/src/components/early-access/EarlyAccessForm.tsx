"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { CONTACT_EMAIL } from "@/lib/env";
import { ApiError, submitEarlyAccess } from "@/lib/posture/api";
import type { EarlyAccessRole } from "@/lib/posture/types";

const ROLES: { value: EarlyAccessRole; label: string }[] = [
  { value: "curator", label: "Vault curator / allocator" },
  { value: "insurer", label: "Insurer / risk underwriter" },
  { value: "protocol", label: "Protocol team" },
  { value: "fund", label: "Fund / treasury" },
  { value: "researcher", label: "Security researcher" },
  { value: "other", label: "Other" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  "w-full rounded-md border border-[#CFCFCA] bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary";

export type EarlyAccessFormProps = {
  /** Pre-fills the message box, e.g. "Alerts for: kelp-rseth". */
  defaultMessage?: string;
  defaultRole?: EarlyAccessRole;
  className?: string;
  id?: string;
};

export function EarlyAccessForm({ defaultMessage = "", defaultRole, className, id = "early-access-form" }: EarlyAccessFormProps) {
  const [email, setEmail] = React.useState("");
  const [organization, setOrganization] = React.useState("");
  const [role, setRole] = React.useState<EarlyAccessRole | "">(defaultRole ?? "");
  const [message, setMessage] = React.useState(defaultMessage);
  const [status, setStatus] = React.useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!role) {
      setError("Please choose the option that best describes you.");
      return;
    }
    setStatus("submitting");
    try {
      await submitEarlyAccess({
        email: email.trim(),
        role,
        organization: organization.trim() || undefined,
        message: message.trim() || undefined,
      });
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      setError(`${msg} You can also email us at ${CONTACT_EMAIL}.`);
    }
  }

  if (status === "done") {
    return (
      <div
        role="status"
        className={cn("rounded-md border border-bg-border bg-white p-6", className)}
      >
        <CheckCircle2 className="h-6 w-6 text-grade-a" aria-hidden="true" />
        <div className="mt-3 font-sans text-lg font-semibold text-text-primary">Thanks — you&apos;re on the list.</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          We&apos;ll reach out personally as we open access. Questions in the meantime:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-secondary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      noValidate
      className={cn("rounded-md border border-bg-border bg-white p-5 sm:p-6", className)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-medium text-text-primary">
            Work email <span className="text-text-muted">(required)</span>
          </label>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor={`${id}-org`} className="mb-1.5 block text-sm font-medium text-text-primary">
            Organization
          </label>
          <input
            id={`${id}-org`}
            type="text"
            autoComplete="organization"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${id}-role`} className="mb-1.5 block text-sm font-medium text-text-primary">
            I am a… <span className="text-text-muted">(required)</span>
          </label>
          <select
            id={`${id}-role`}
            required
            value={role}
            onChange={(e) => setRole(e.target.value as EarlyAccessRole | "")}
            className={inputClass}
          >
            <option value="" disabled>
              Choose one
            </option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-message`} className="mb-1.5 block text-sm font-medium text-text-primary">
            What do you want to monitor?
          </label>
          <textarea
            id={`${id}-message`}
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputClass}
            placeholder="Protocols, contracts or chains you care about"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-accent-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-text-muted sm:max-w-sm">
          We only use these details to contact you about Provd access. No marketing lists, never sold or shared. See our{" "}
          <a href="/privacy-policy" className="underline hover:text-text-primary">
            privacy policy
          </a>
          .
        </p>
        <Button type="submit" size="lg" disabled={status === "submitting"} className="w-full whitespace-nowrap sm:w-auto sm:shrink-0">
          {status === "submitting" ? "Sending…" : "Request early access"}
        </Button>
      </div>
    </form>
  );
}
