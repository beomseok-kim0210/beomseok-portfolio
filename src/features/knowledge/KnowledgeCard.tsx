"use client";

import { ArrowUpRight } from "lucide-react";
import type { KnowledgeNote } from "@/types/portfolio";

type KnowledgeCardProps = {
  note: KnowledgeNote;
  onOpen: (slug: string) => void;
  featured?: boolean;
};

export function KnowledgeCard({
  note,
  onOpen,
  featured = false,
}: KnowledgeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(note.slug)}
      aria-label={`${note.title} 노트 열기`}
      className={`group relative flex w-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_80px_rgba(17,24,39,0.08)] ${
        featured ? "md:p-9 lg:min-h-[320px]" : ""
      }`}
    >
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-4">
          <span className="small-label text-blue-600">{note.category}</span>
          <span className="small-label text-slate-400">{note.readingTime}</span>
        </div>

        <h3
          className={`mt-6 font-semibold leading-tight text-ink ${
            featured
              ? "text-3xl md:text-[2.6rem] md:leading-[1.05]"
              : "text-2xl"
          }`}
        >
          {note.title}
        </h3>

        {note.summary ? (
          <p
            className={`body-copy mt-4 ${
              featured ? "knowledge-clamp-3 max-w-[46ch]" : "knowledge-clamp-2"
            }`}
          >
            {note.summary}
          </p>
        ) : null}

        <div className="mt-auto pt-8">
          <div className="flex flex-wrap gap-2">
            {note.keywords.slice(0, featured ? 4 : 3).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-600"
              >
                {keyword}
              </span>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-[13px] text-slate-500">
            <span>
              {note.difficulty} · {note.lastUpdated}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-ink transition-colors group-hover:text-blue-600">
              Read
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* 호버 시 채워지는 하단 액센트 라인 */}
      <span className="knowledge-card-accent absolute inset-x-0 bottom-0 h-[3px] bg-blue-600" />
    </button>
  );
}
