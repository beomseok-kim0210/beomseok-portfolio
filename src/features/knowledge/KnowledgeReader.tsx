"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { MarkdownNote } from "@/components/ui/MarkdownNote";
import type { KnowledgeNote } from "@/types/portfolio";

type KnowledgeReaderProps = {
  note: KnowledgeNote | null;
  onClose: () => void;
  onKeywordSelect?: (keyword: string) => void;
};

export function KnowledgeReader({
  note,
  onClose,
  onKeywordSelect,
}: KnowledgeReaderProps) {
  const reduceMotion = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = Boolean(note);

  // ESC 닫기 + body 스크롤 잠금 + 포커스 이동
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {note ? (
        <motion.div
          key="knowledge-reader"
          className="fixed inset-0 z-[60] flex justify-center bg-[#0b1120]/70 backdrop-blur-xl"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${note.title} 읽기`}
        >
          <motion.article
            data-lenis-prevent
            className="knowledge-scroll relative my-0 h-full w-full max-w-[860px] overflow-y-auto bg-[#FAFAFA] px-6 pb-24 pt-20 md:my-8 md:h-auto md:max-h-[calc(100vh-4rem)] md:rounded-[32px] md:px-14 md:pt-16 md:shadow-[0_40px_120px_rgba(17,24,39,0.4)]"
            initial={
              reduceMotion
                ? { opacity: 1 }
                : { opacity: 0, y: 48, filter: "blur(12px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 32, filter: "blur(12px)" }
            }
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 md:right-8 md:top-8"
            >
              <X className="h-5 w-5" />
            </button>

            <header className="reading-width">
              <p className="cinematic-label text-blue-600">{note.category}</p>
              <h2 className="story-title mt-5 text-ink">{note.title}</h2>
              <p className="mt-5 text-[13px] text-slate-500">
                {note.difficulty} · {note.readingTime} · Updated{" "}
                {note.lastUpdated}
              </p>
              {note.keywords.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {note.keywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => onKeywordSelect?.(keyword)}
                      className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                    >
                      #{keyword}
                    </button>
                  ))}
                </div>
              ) : null}
            </header>

            <div className="mt-10 border-t border-slate-200 pt-10">
              <div className="reading-width">
                <MarkdownNote body={note.body} />
              </div>
            </div>
          </motion.article>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
