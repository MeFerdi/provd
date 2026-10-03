import Link from "next/link";

import { CONTACT_EMAIL, SECURITY_EMAIL } from "@/lib/env";

type FooterLink = { href: string; label: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/ratings", label: "Ratings" },
      { href: "/scan", label: "Scan" },
      { href: "/methodology", label: "Methodology" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Research & docs",
    links: [
      { href: "/blog", label: "Research" },
      { href: "/docs", label: "Docs" },
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
            Ratings and alerts for the security configuration of cross-chain protocols, built from public on-chain data.
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
        © {new Date().getFullYear()} Provd Technologies Ltd. Ratings describe configuration, not code, and are not
        investment advice.
      </div>
    </footer>
  );
}
