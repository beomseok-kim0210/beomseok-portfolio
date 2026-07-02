"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { KnowledgeCard } from "@/features/knowledge/KnowledgeCard";
import { KnowledgeReader } from "@/features/knowledge/KnowledgeReader";
import type { KnowledgeNote } from "@/types/portfolio";

type KnowledgeBrowserProps = {
  notes: KnowledgeNote[];
  className?: string;
};

const FILTERS = [
  "All",
  "AI News",
  "Voice AI",
  "Prompt Engineering",
  "RAG",
  "Computer Vision",
  "MCP",
  "Agent",
];

export function KnowledgeBrowser({
  notes,
  className = "",
}: KnowledgeBrowserProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const filteredNotes = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesFilter =
        activeFilter === "All" ||
        note.category.includes(activeFilter) ||
        note.keywords.some((keyword) =>
          keyword.toLowerCase().includes(activeFilter.toLowerCase()),
        );

      if (!normalized) return matchesFilter;

      const matchesQuery = [
        note.title,
        note.category,
        note.summary,
        ...note.keywords,
      ].some((item) => item.toLowerCase().includes(normalized));

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, debouncedQuery, notes]);

  const openNote = openSlug
    ? notes.find((note) => note.slug === openSlug) ?? null
    : null;

  const [featured, ...rest] = filteredNotes;

  return (
    <section
      className={`section-shell bg-[#FAFAFA] pb-28 ${className}`}
    >
      {/* ─── 스티키 컨트롤 바 ─── */}
      <div className="sticky top-14 z-30 border-b border-slate-200/80 bg-[#FAFAFA]/85 backdrop-blur-md">
        <div className="content-grid flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 lg:max-w-[320px]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="sr-only">지식 검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search knowledge"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  activeFilter === filter
                    ? "bg-ink text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 에디토리얼 그리드 ─── */}
      <div className="content-grid pt-12">
        <p className="small-label mb-8 text-slate-400">
          {filteredNotes.length} / {notes.length} Notes
        </p>

        {filteredNotes.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/60 py-24 text-center">
            <p className="section-title text-slate-400">
              조건에 맞는 노트가 없습니다.
            </p>
            <p className="body-copy mt-3">
              검색어나 필터를 바꿔 다시 시도해 보세요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {featured ? (
              <MotionBlock>
                <KnowledgeCard note={featured} onOpen={setOpenSlug} featured />
              </MotionBlock>
            ) : null}

            {rest.length ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((note, index) => (
                  <MotionBlock
                    key={note.slug}
                    delay={Math.min(index * 0.05, 0.3)}
                  >
                    <KnowledgeCard note={note} onOpen={setOpenSlug} />
                  </MotionBlock>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <KnowledgeReader note={openNote} onClose={() => setOpenSlug(null)} />
    </section>
  );
}
