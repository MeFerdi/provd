"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { type SiteId, type SiteLink, siteHref } from "@/lib/sites";

type NavLink = SiteLink & { label: string; developerOnly?: boolean };

const NAV_LINKS: NavLink[] = [
  { site: "main", path: "/check", label: "Check" },
  { site: "main", path: "/verify", label: "Verify" },
  { site: "main", path: "/pricing", label: "Pricing" },
  { site: "docs", path: "/", label: "Docs" },
  { site: "playground", path: "/", label: "Playground", developerOnly: true },
  { site: "main", path: "/about", label: "About" },
];

export default function Navbar({ site = "main" }: { site?: SiteId }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const links = NAV_LINKS.filter((link) => site !== "main" || !link.developerOnly).map((link) => ({
    ...link,
    href: siteHref(site, link.site, link.path),
  }));
  const isActive = (link: NavLink) =>
    link.site === site && (link.path === "/" ? site !== "main" : pathname === link.path || pathname?.startsWith(`${link.path}/`));
  const apiKeyHref = siteHref(site, "main", "/early-access");

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-bg-border bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href={siteHref(site, "main", "/")} className="flex shrink-0 items-center" aria-label="Provd homepage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/provd-logo.svg" alt="Provd" width={107} height={30} className="h-[30px] w-auto" />
          {site !== "main" ? (
            <span className="ml-2 border-l border-bg-border pl-2 font-sans text-[15px] text-text-secondary">
              {site === "docs" ? "Docs" : "Playground"}
            </span>
          ) : null}
        </Link>

        <nav aria-label="Main" className="hidden flex-1 justify-center gap-7 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link) ? "page" : undefined}
              className={cn(
                "font-sans text-[15px] text-text-primary underline-offset-[6px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary",
                isActive(link) && "underline"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden lg:block">
          <Button href={apiKeyHref} variant="secondary">
            Get an API key
          </Button>
        </div>

        <button
          type="button"
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen ? (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-bg-border bg-white lg:hidden">
          <ul className="mx-auto max-w-7xl divide-y divide-bg-border px-4 sm:px-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3.5 font-sans text-base text-text-primary hover:underline"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto max-w-7xl px-4 pb-5 pt-2 sm:px-6" onClick={() => setMobileOpen(false)}>
            <Button href={apiKeyHref} variant="secondary" size="lg" className="w-full">
              Get an API key
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
