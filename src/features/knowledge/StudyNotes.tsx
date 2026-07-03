import { ArrowUpRight } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { studyCategories, studyNoteCount } from "@/data/studyNotes";

export function StudyNotes() {
  return (
    <section
      id="study"
      className="scene-shell border-t border-slate-200 bg-white"
    >
      <div className="content-grid py-20 md:py-28">
        <MotionBlock>
          <p className="cinematic-label text-blue-600">Study Notes</p>
          <h2 className="section-title mt-5 max-w-[720px]">
            AI·LLM을 밑바닥부터 정리한 학습 노트.
          </h2>
          <p className="body-copy mt-5 max-w-[680px]">
            기초 방법론부터 NLP·CNN·LLM·RAG·Agent·경량화까지, 개념을 직접
            정리하며 쌓은 {studyNoteCount}개의 노트입니다. 각 항목은 Notion 원문
            으로 연결됩니다.
          </p>
        </MotionBlock>

        {/* 카테고리 퀵 내비 */}
        <MotionBlock delay={0.06}>
          <div className="mt-10 flex flex-wrap gap-2">
            {studyCategories.map((category, index) => (
              <a
                key={category.name}
                href={`#study-${index}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-ink"
              >
                {category.name}
                <span className="ml-1.5 text-slate-400">
                  {category.notes.length}
                </span>
              </a>
            ))}
          </div>
        </MotionBlock>

        {/* 카테고리별 노트 목록 */}
        <div className="mt-14 flex flex-col gap-14">
          {studyCategories.map((category, index) => (
            <MotionBlock key={category.name}>
              <div
                id={`study-${index}`}
                className="scroll-mt-24 border-t border-slate-100 pt-8"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-xl font-semibold text-ink">
                    {category.name}
                  </h3>
                  <span className="small-label text-slate-400">
                    {String(category.notes.length).padStart(2, "0")} Notes
                  </span>
                </div>

                <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {category.notes.map((note, noteIndex) => (
                    <li key={note.url}>
                      <a
                        href={note.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_50px_rgba(17,24,39,0.06)]"
                      >
                        <span
                          aria-hidden="true"
                          className="text-lg leading-none"
                        >
                          {note.emoji}
                        </span>
                        <span className="flex-1 text-[14px] font-medium leading-snug text-ink">
                          <span className="mr-1 text-slate-400">
                            {noteIndex + 1}.
                          </span>
                          {note.title}
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-600" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
