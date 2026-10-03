import Link from "next/link";

import { CONTACT_EMAIL, SECURITY_EMAIL } from "@/lib/env";

type FooterLink = { href: string; label: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/check", label: "Counterparty check" },
      { href: "/verify", label: "Verify a decision" },
      { href: "/pricing", label: "Pricing" },
      { href: "/early-access", label: "Get an API key" },
    ],
  },
  {
    title: "Docs",
    links: [
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/pay-as-you-go", label: "Pay as you go" },
      { href: "/docs/api-reference", label: "API reference" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: `mailto:${CONTACT_EMAIL}`, label: "Contact", external: true },
      { href: `mailto:${SECURITY_EMAIL}`, label: "Security disclosure", external: true },
      { href: "/careers", label: "Careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/data-processing", label: "Data Processing" },
      { href: "/cookie-policy", label: "Cookie Policy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-bg-border bg-bg-surface px-4 pb-8 pt-14 text-text-secondary sm:px-6">
      <div className="mx-auto mb-10 grid max-w-7xl grid-cols-2 gap-10 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/provd-logo.svg" alt="Provd" width={107} height={30} className="h-[30px] w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Risk checks for P2P stablecoin trades and mobile-money ramps. Built for African rails.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-3 inline-block text-sm text-accent-secondary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="mb-3 text-sm font-semibold text-text-primary">{col.title}</div>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  {l.external ? (
                    <a href={l.href} className="hover:text-text-primary hover:underline">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="hover:text-text-primary hover:underline">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-7xl border-t border-bg-border pt-6 text-xs text-text-muted">
        © {new Date().getFullYear()} Provd Technologies Ltd. Scores are risk signals to support your decision, not
        financial or legal advice.
      </div>
    </footer>
  );
}
