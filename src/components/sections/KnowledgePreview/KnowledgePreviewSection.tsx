import { MotionBlock } from "@/components/ui/MotionBlock";
import Link from "next/link";
import { ArrowRight, NotebookTabs } from "lucide-react";
import type { KnowledgeNote } from "@/types/portfolio";

type KnowledgePreviewSectionProps = {
  notes: KnowledgeNote[];
};

export function KnowledgePreviewSection({ notes }: KnowledgePreviewSectionProps) {
  const previewNotes = notes.slice(0, 6);

  return (
    <section id="knowledge" className="section-shell section-pad bg-white">
      <div className="content-grid">
        <MotionBlock>
          <p className="cinematic-label mb-8 text-blue-600">AI Knowledge</p>
          <h2 className="chapter-title">
            빠르게 변하는 AI 기술을
            <br />
            사용 가능한 지식으로 정리합니다.
          </h2>
          <p className="subtitle mt-8 max-w-[760px] text-slate-700">
            모델 소식이 아니라, 실제 제품 구현에 필요한 개념과 판단 기준을
            정리합니다.
          </p>
        </MotionBlock>
        <MotionBlock delay={0.08}>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {previewNotes.map((note) => (
              <Link
                key={note.slug}
                href="/knowledge"
                className="group min-h-[240px] rounded-[32px] border border-slate-200 bg-[#FAFAFA] p-6 transition-colors hover:bg-white"
              >
                <NotebookTabs className="mb-12 h-6 w-6 text-blue-600" />
                <p className="small-label text-slate-500">{note.category}</p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight">
                  {note.title}
                </h3>
                <div className="mt-8 grid grid-cols-2 gap-3 text-[13px] leading-6 text-slate-500">
                  <p>{note.difficulty}</p>
                  <p>{note.readingTime}</p>
                  <p>{note.lastUpdated}</p>
                  <p>{note.keywords[0]}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/knowledge"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#111827] px-6 small-label text-white transition-transform hover:scale-[1.02]"
            >
              Open Knowledge Base <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </MotionBlock>
      </div>
    </section>
  );
}
