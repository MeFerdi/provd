import Link from "next/link";

import { CONTACT_EMAIL } from "@/lib/env";
import { type SiteId, type SiteLink, siteHref } from "@/lib/sites";

type FooterLink = SiteLink & { label: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { site: "main", path: "/check", label: "Counterparty check" },
      { site: "main", path: "/check#lookalike", label: "Lookalike check" },
      { site: "main", path: "/verify", label: "Verify a decision" },
      { site: "main", path: "/pricing", label: "Pricing" },
      { site: "main", path: "/early-access", label: "Get an API key" },
    ],
  },
  {
    title: "Developers",
    links: [
      { site: "docs", path: "/quickstart", label: "Quickstart" },
      { site: "docs", path: "/non-custodial", label: "Escrow integration" },
      { site: "docs", path: "/decisions", label: "Decision records" },
      { site: "docs", path: "/reference", label: "Scores, flags and errors" },
      { site: "playground", path: "/", label: "Playground and sandbox" },
    ],
  },
  {
    title: "Company",
    links: [
      { site: "main", path: "/about", label: "About" },
      { site: "main", path: `mailto:${CONTACT_EMAIL}`, label: "Contact", external: true },
      { site: "main", path: "/security", label: "Security" },
      { site: "main", path: "/careers", label: "Careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { site: "main", path: "/privacy-policy", label: "Privacy Policy" },
      { site: "main", path: "/terms", label: "Terms of Service" },
      { site: "main", path: "/data-processing", label: "Data Processing" },
      { site: "main", path: "/cookie-policy", label: "Cookie Policy" },
    ],
  },
];

export default function Footer({ site = "main" }: { site?: SiteId }) {
  return (
    <footer className="border-t border-bg-border bg-bg-surface px-4 pb-8 pt-14 text-text-secondary sm:px-6">
      <div className="mx-auto mb-10 grid max-w-7xl grid-cols-2 gap-10 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/provd-logo.svg" alt="Provd" width={107} height={30} className="h-[30px] w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Pre-release risk checks for stablecoin trades, ramps, payouts and escrows. Built in Kenya, for local rails everywhere.
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
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.path} className="hover:text-text-primary hover:underline">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={siteHref(site, l.site, l.path)} className="hover:text-text-primary hover:underline">
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
