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
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6">
      <div className="mb-6 lg:hidden">
        <div className="text-xs mb-3 text-text-muted">Documentation</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {docsNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm transition",
                  active
                    ? "border-text-primary bg-white text-text-primary"
                    : "border-bg-border text-text-secondary hover:bg-bg-surface hover:text-text-primary"
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
            <div className="text-xs text-text-muted mb-4">Documentation</div>
            <SearchBox className="mb-5" />
            <nav className="space-y-6">
              {Object.entries(groupedNav).map(([group, items]) => (
                <div key={group}>
                  <div className="text-xs mb-2 px-3 text-text-muted">{group}</div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "block rounded-md px-3 py-2 text-sm transition border border-transparent",
                            active
                              ? "bg-bg-surface text-text-primary border-bg-border font-medium"
                              : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
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
