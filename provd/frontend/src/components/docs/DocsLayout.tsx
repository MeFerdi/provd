"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { docsNav } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { SearchBox } from "@/components/search/SearchBox";

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="text-xs font-mono tracking-[0.22em] uppercase text-text-muted mb-4">Documentation</div>
            <SearchBox className="mb-5" />
            <nav className="space-y-1">
              {docsNav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm transition border border-transparent",
                      active
                        ? "bg-bg-surface/70 text-text-primary border-bg-border"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/40"
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

