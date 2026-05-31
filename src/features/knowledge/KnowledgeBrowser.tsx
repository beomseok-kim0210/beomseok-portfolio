"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MarkdownNote } from "@/components/ui/MarkdownNote";
import type { KnowledgeNote } from "@/types/portfolio";

type KnowledgeBrowserProps = {
  notes: KnowledgeNote[];
  className?: string;
};

export function KnowledgeBrowser({
  notes,
  className = "",
}: KnowledgeBrowserProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeSlug, setActiveSlug] = useState(notes[0]?.slug ?? "");

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const filters = useMemo(
    () => [
      "All",
      "Voice AI",
      "Prompt Engineering",
      "RAG",
      "Computer Vision",
      "MCP",
      "Agent",
    ],
    [],
  );

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

  const activeNote =
    notes.find((note) => note.slug === activeSlug) ?? filteredNotes[0] ?? notes[0];

  return (
    <div
      className={`rounded-[40px] border border-slate-200 bg-[#FAFAFA] p-4 md:p-6 ${className}`}
    >
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-4">
          <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search knowledge</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search knowledge system"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-4 py-3 small-label transition-colors ${
                activeFilter === filter
                  ? "bg-[#111827] text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {filteredNotes.map((note) => (
            <button
              key={note.slug}
              type="button"
              onClick={() => setActiveSlug(note.slug)}
              className={`rounded-[28px] border p-5 text-left transition-colors ${
                activeNote?.slug === note.slug
                  ? "border-slate-900 bg-white"
                  : "border-slate-200 bg-white/70 hover:bg-white"
              }`}
            >
              <div className="mb-8 flex items-center justify-between gap-4">
                <span className="small-label text-blue-600">{note.category}</span>
                <span className="small-label text-slate-400">
                  {note.readingTime}
                </span>
              </div>
              <h3 className="text-2xl font-semibold leading-tight">{note.title}</h3>
              <div className="mt-8 grid grid-cols-2 gap-3 text-[13px] leading-6 text-slate-500">
                <p>Difficulty: {note.difficulty}</p>
                <p>Updated: {note.lastUpdated}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="min-h-[640px] rounded-[32px] border border-slate-200 bg-white p-7 md:p-10">
          {activeNote ? (
            <>
              <p className="cinematic-label text-blue-600">Knowledge OS</p>
              <h3 className="mt-6 text-4xl font-semibold leading-tight">
                {activeNote.title}
              </h3>
              <p className="mt-5 max-w-[760px] text-[15px] leading-7 text-slate-600">
                {activeNote.summary}
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {activeNote.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-slate-100 px-3 py-1 small-label text-slate-600"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="mt-8 rounded-[24px] bg-[#FAFAFA] p-6">
                <MarkdownNote body={activeNote.body} />
              </div>
            </>
          ) : (
            <p className="text-slate-500">No knowledge note found.</p>
          )}
          </div>
      </div>
    </div>
  );
}
