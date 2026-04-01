import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50">
      <div className="bg-bg-base border-b border-bg-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex items-center">
              <svg width="32" height="32" viewBox="0 0 48 32" fill="none" className="mr-2">
                <circle cx="16" cy="16" r="4" fill="rgb(var(--accent-primary))" />
                <circle cx="32" cy="8" r="4" fill="rgb(var(--accent-secondary))" />
                <circle cx="32" cy="24" r="4" fill="rgb(var(--accent-warning))" />
                <line
                  x1="19.2"
                  y1="16"
                  x2="28"
                  y2="10.4"
                  stroke="rgb(var(--text-secondary))"
                  strokeWidth="2"
                />
                <line
                  x1="19.2"
                  y1="16"
                  x2="28"
                  y2="21.6"
                  stroke="rgb(var(--text-secondary))"
                  strokeWidth="2"
                />
              </svg>
              <span className="font-sans font-semibold text-lg lowercase tracking-tight text-text-primary">provd</span>
            </span>
            <span className="hidden sm:inline text-xs font-mono text-accent-primary tracking-[0.22em] uppercase">
              Trust Infrastructure
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-sans text-text-secondary">
            <Link href="/docs" className="hover:text-text-primary transition">
              Docs
            </Link>
            <Link href="/pricing" className="hover:text-text-primary transition">
              Pricing
            </Link>
            <Link href="/blog" className="hover:text-text-primary transition">
              Blog
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button href="/docs/quickstart">Get API Access</Button>
          </div>
        </div>
      </div>
    </header>
  );
}
