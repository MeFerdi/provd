"use client";

import * as React from "react";
import MiniSearch from "minisearch";
import Link from "next/link";
import { Search } from "lucide-react";

import { cn } from "@/lib/cn";

type Record = {
  type: "docs" | "blog";
  url: string;
  title: string;
  description?: string;
  headings?: string[];
  body?: string;
};

type SearchIndex = {
  generatedAt: string;
  records: Record[];
};

type SearchHit = {
  type: "docs" | "blog";
  url: string;
  title: string;
  description?: string;
  score: number;
};

export function SearchBox({ className }: { className?: string }) {
  const [q, setQ] = React.useState("");
  const [index, setIndex] = React.useState<MiniSearch<Record> | null>(null);
  const [records, setRecords] = React.useState<Record[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/search-index.json");
      const data = (await res.json()) as SearchIndex;
      if (cancelled) return;
      setRecords(data.records);

      const ms = new MiniSearch<Record>({
        fields: ["title", "description", "headings", "body"],
        storeFields: ["type", "url", "title", "description"],
        searchOptions: {
          boost: { title: 4, headings: 2 },
          fuzzy: 0.2,
          prefix: true,
        },
      });

      ms.addAll(data.records);
      setIndex(ms);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = React.useMemo(() => {
    if (!index) return [];
    const query = q.trim();
    if (query.length < 2) return [];
    const hits = index.search(query) as unknown as SearchHit[];
    return hits.slice(0, 8);
  }, [index, q]);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search docs and research…"
          aria-label="Search docs and research"
          className="w-full h-11 rounded-md border border-bg-border bg-white pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
        />
      </div>

      {q.trim().length >= 2 ? (
        <div className="mt-3 rounded-md border border-bg-border bg-white overflow-hidden">
          <div className="text-xs px-4 py-3 text-text-muted border-b border-bg-border">
            Results ({results.length})
          </div>
          <div className="divide-y divide-bg-border">
            {results.length ? (
              results.map((r) => (
                <Link key={r.url} href={r.url} className="block px-4 py-3 hover:bg-bg-elevated transition">
                  <div className="text-xs text-text-muted">{r.type === "blog" ? "Research" : "Docs"}</div>
                  <div className="mt-1 font-sans font-semibold text-text-primary">{r.title}</div>
                  {r.description ? <div className="mt-1 text-sm text-text-secondary">{r.description}</div> : null}
                </Link>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-text-secondary">No matches. Try a different query.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 text-xs text-text-muted">{index ? "Type at least 2 characters." : "Loading search index…"}</div>
      )}
    </div>
  );
}

