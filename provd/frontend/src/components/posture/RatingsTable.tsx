"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";

import { GradeBadge, SeverityBadge } from "@/components/posture/Badges";
import { fetchProtocols } from "@/lib/posture/api";
import { formatDate, GRADE_ORDER, SEVERITY_ORDER } from "@/lib/posture/format";
import type { Grade, ProtocolSummary } from "@/lib/posture/types";

type SortKey = "grade" | "name" | "category" | "single" | "checked";

const inputClass =
  "h-10 rounded-md border border-bg-border bg-white px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary";

function topFinding(p: ProtocolSummary) {
  return [...p.top_findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])[0] ?? null;
}

function compare(a: ProtocolSummary, b: ProtocolSummary, key: SortKey): number {
  switch (key) {
    case "grade":
      return GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || b.score - a.score;
    case "name":
      return a.name.localeCompare(b.name);
    case "category":
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    case "single": {
      const ra = a.pathways_total ? a.single_verifier_pathways / a.pathways_total : 0;
      const rb = b.pathways_total ? b.single_verifier_pathways / b.pathways_total : 0;
      return ra - rb || a.single_verifier_pathways - b.single_verifier_pathways;
    }
    case "checked":
      return a.checked_at.localeCompare(b.checked_at);
  }
}

export function RatingsTable({ initial }: { initial: ProtocolSummary[] }) {
  const [items, setItems] = React.useState<ProtocolSummary[]>(initial);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [grade, setGrade] = React.useState<Grade | "all">("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("grade");
  const [desc, setDesc] = React.useState(true);

  // Refresh grades from the live API when it is reachable. Only protocols that exist in the
  // build-time snapshot are updated, so every row keeps a working static detail page.
  React.useEffect(() => {
    if (!initial.length) return;
    let cancelled = false;
    fetchProtocols()
      .then((live) => {
        if (cancelled) return;
        const bySlug = new Map(live.items.map((p) => [p.slug, p]));
        setItems((prev) => prev.map((p) => bySlug.get(p.slug) ?? p));
      })
      .catch(() => {
        /* fall back to the snapshot silently */
      });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const categories = React.useMemo(() => Array.from(new Set(items.map((p) => p.category))).sort(), [items]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (grade === "all" || p.grade === grade) &&
        (!q || p.name.toLowerCase().includes(q) || p.contract.toLowerCase().includes(q))
    );
    // "desc" means worst-first for grade / single-verifier, newest-first for dates, Z-A for text.
    const sorted = filtered.sort((a, b) => compare(a, b, sortKey));
    return desc ? sorted.reverse() : sorted;
  }, [items, query, category, grade, sortKey, desc]);

  function sortBy(key: SortKey) {
    if (key === sortKey) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(key === "grade" || key === "single" || key === "checked");
    }
  }

  function sortHeader(k: SortKey, children: React.ReactNode) {
    const active = sortKey === k;
    return (
      <th key={k} scope="col" aria-sort={active ? (desc ? "descending" : "ascending") : "none"} className="px-4 py-3 font-normal">
        <button
          type="button"
          onClick={() => sortBy(k)}
          className="text-xs inline-flex items-center gap-1 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
        >
          {children}
          {active ? desc ? <ArrowDown className="h-3 w-3" aria-hidden="true" /> : <ArrowUp className="h-3 w-3" aria-hidden="true" /> : null}
        </button>
      </th>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 sm:min-w-[220px]">
          <label htmlFor="ratings-search" className="mb-1 block text-xs text-text-muted">
            Search
          </label>
          <input
            id="ratings-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Protocol name or contract"
            className={`${inputClass} w-full`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div>
            <label htmlFor="ratings-category" className="mb-1 block text-xs text-text-muted">
              Category
            </label>
            <select id="ratings-category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} w-full`}>
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ratings-grade" className="mb-1 block text-xs text-text-muted">
              Grade
            </label>
            <select id="ratings-grade" value={grade} onChange={(e) => setGrade(e.target.value as Grade | "all")} className={`${inputClass} w-full`}>
              <option value="all">All grades</option>
              {(["A", "B", "C", "D", "F"] as Grade[]).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="sm:hidden">
          <label htmlFor="ratings-sort" className="mb-1 block text-xs text-text-muted">
            Sort by
          </label>
          <select
            id="ratings-sort"
            value={`${sortKey}:${desc ? "desc" : "asc"}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":");
              setSortKey(k as SortKey);
              setDesc(d === "desc");
            }}
            className={`${inputClass} w-full`}
          >
            <option value="grade:desc">Weakest grade first</option>
            <option value="grade:asc">Strongest grade first</option>
            <option value="single:desc">Most single-verifier routes</option>
            <option value="name:asc">Name A–Z</option>
            <option value="checked:desc">Recently checked</option>
          </select>
        </div>
      </div>

      <p className="mb-3 text-xs text-text-muted" aria-live="polite">
        Showing {rows.length} of {items.length} protocols
      </p>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((p) => {
          const tf = topFinding(p);
          return (
            <li key={p.slug}>
              <Link
                href={`/ratings/${p.slug}`}
                className="block rounded-md border border-bg-border bg-white p-4 hover:bg-bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary"
              >
                <div className="flex items-start gap-3">
                  <GradeBadge grade={p.grade} />
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-semibold text-text-primary [overflow-wrap:anywhere]">{p.name}</div>
                    <div className="text-xs text-text-muted">{p.category}</div>
                  </div>
                  <div className="shrink-0 text-right text-sm text-text-primary">
                    {p.single_verifier_pathways}/{p.pathways_total}
                    <div className="text-xs text-text-muted">single-verifier</div>
                  </div>
                </div>
                {tf ? (
                  <div className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
                    <SeverityBadge severity={tf.severity} />
                    <span className="min-w-0">{tf.title}</span>
                  </div>
                ) : null}
                <div className="mt-3 text-xs text-text-muted">Checked {formatDate(p.checked_at)}</div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-md border border-bg-border md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Protocol security ratings. Column headers sort the table.</caption>
          <thead className="border-b border-bg-border text-xs text-text-muted">
            <tr>
              {sortHeader("grade", "Grade")}
              {sortHeader("name", "Protocol")}
              {sortHeader("category", "Category")}
              {sortHeader("single", "Single-verifier routes")}
              <th scope="col" className="text-xs px-4 py-3 font-normal">
                Top finding
              </th>
              {sortHeader("checked", "Last checked")}
            </tr>
          </thead>
          <tbody className="divide-y divide-bg-border">
            {rows.map((p) => {
              const tf = topFinding(p);
              return (
                <tr key={p.slug} className="align-top hover:bg-bg-surface">
                  <td className="px-4 py-3">
                    <GradeBadge grade={p.grade} size="sm" />
                  </td>
                  <th scope="row" className="px-4 py-3 font-semibold">
                    <Link href={`/ratings/${p.slug}`} className="text-text-primary hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs font-normal text-text-muted">Score {p.score}</div>
                  </th>
                  <td className="px-4 py-3 text-text-secondary">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className={p.single_verifier_pathways > 0 ? "text-grade-f" : "text-text-primary"}>
                      {p.single_verifier_pathways}
                    </span>
                    <span className="text-text-muted">/{p.pathways_total}</span>
                  </td>
                  <td className="max-w-[320px] px-4 py-3 text-text-secondary">
                    {tf ? (
                      <div className="flex items-start gap-2">
                        <SeverityBadge severity={tf.severity} />
                        <span>{tf.title}</span>
                      </div>
                    ) : (
                      <span className="text-text-muted">None</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{formatDate(p.checked_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!rows.length ? <p className="mt-6 text-sm text-text-secondary">No protocols match these filters.</p> : null}
    </div>
  );
}
