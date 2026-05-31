import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { KnowledgeBrowser } from "@/features/knowledge/KnowledgeBrowser";
import { navItems } from "@/data/navigation";
import { getKnowledgeNotes } from "@/lib/knowledge";

export const metadata: Metadata = {
  title: "AI Knowledge",
  description:
    "Prompt Engineering, Voice AI, RAG, Multi-Agent, Computer Vision, MCP를 다루는 개인 AI 지식 베이스.",
};

export default function KnowledgePage() {
  const notes = getKnowledgeNotes();

  return (
    <main>
      <SiteHeader items={navItems} />
      <section className="section-shell section-pad bg-white pt-32">
        <div className="content-grid">
          <div className="mx-auto max-w-[920px] text-center">
            <p className="small-label mb-5 text-blue-600">AI Knowledge</p>
            <h1 className="section-title mx-auto">
              빠르게 변하는 AI 기술을 사용 가능한 지식으로 정리합니다.
            </h1>
            <p className="subtitle mx-auto mt-8 max-w-[760px] text-slate-700">
              모델 소식이 아니라, 실제 제품 구현에 필요한 개념과 판단 기준을
              정리합니다.
            </p>
          </div>
          <KnowledgeBrowser notes={notes} className="mt-14" />
        </div>
      </section>
    </main>
  );
}
