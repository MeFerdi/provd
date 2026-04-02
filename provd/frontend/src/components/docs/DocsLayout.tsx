"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { docsNav } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { SearchBox } from "@/components/search/SearchBox";

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const groupedNav = docsNav.reduce<Record<string, typeof docsNav>>((groups, item) => {
    const key = item.category ?? "Reference";
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 lg:hidden">
        <div className="mb-3 text-xs font-mono tracking-[0.22em] uppercase text-text-muted">Documentation</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {docsNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition",
                  active
                    ? "border-bg-border bg-bg-surface/70 text-text-primary"
                    : "border-bg-border/60 text-text-secondary hover:bg-bg-surface/40 hover:text-text-primary"
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="text-xs font-mono tracking-[0.22em] uppercase text-text-muted mb-4">Documentation</div>
            <SearchBox className="mb-5" />
            <nav className="space-y-6">
              {Object.entries(groupedNav).map(([group, items]) => (
                <div key={group}>
                  <div className="mb-2 px-3 text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">{group}</div>
                  <div className="space-y-1">
                    {items.map((item) => {
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
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
