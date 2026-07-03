import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { KnowledgeBrowser } from "@/features/knowledge/KnowledgeBrowser";
import { StudyNotes } from "@/features/knowledge/StudyNotes";
import { navItems } from "@/data/navigation";
import { getKnowledgeNotes } from "@/lib/knowledge";

export const metadata: Metadata = {
  title: "AI Knowledge",
  description:
    "Prompt Engineering, Voice AI, RAG, Multi-Agent, Computer Vision, MCP를 다루는 개인 AI 지식 베이스.",
};

export default function KnowledgePage() {
  const notes = getKnowledgeNotes();

  const categoryCount = new Set(notes.map((note) => note.category)).size;
  const lastUpdated = notes
    .map((note) => note.lastUpdated)
    .sort((a, b) => b.localeCompare(a))[0];

  const stats = [
    { label: "Notes", value: String(notes.length).padStart(2, "0") },
    { label: "Domains", value: String(categoryCount).padStart(2, "0") },
    { label: "Updated", value: lastUpdated ?? "—" },
  ];

  return (
    <main>
      <SiteHeader items={navItems} />

      {/* ─── 다크 시네마틱 히어로 밴드 ─── */}
      <section className="scene-shell knowledge-hero-band">
        <div className="content-grid relative z-10 pb-16 pt-36 md:pb-24 md:pt-44">
          <div className="grid gap-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <MotionBlock>
              <p className="cinematic-label text-blue-400">AI Knowledge</p>
              <h1 className="cinematic-title mt-6 max-w-[15ch] text-white">
                빠르게 변하는 AI를 <br className="hidden md:block" />
                쓸 수 있는 지식으로.
              </h1>
              <p className="subtitle mt-7 max-w-[52ch] text-slate-300">
                모델 소식이 아니라, 실제 제품 구현에 필요한 개념과 판단 기준을
                정리합니다. 카드를 열면 몰입형 리딩 뷰로 이어집니다.
              </p>
            </MotionBlock>

            <MotionBlock delay={0.12}>
              <dl className="grid grid-cols-3 gap-4 border-t border-white/15 pt-6 lg:grid-cols-1 lg:gap-0 lg:border-none lg:pt-0">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="lg:border-t lg:border-white/15 lg:py-4"
                  >
                    <dt className="small-label text-slate-400">{stat.label}</dt>
                    <dd className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </MotionBlock>
          </div>
        </div>
      </section>

      {/* ─── 브라우즈 그리드 + 몰입 리딩 ─── */}
      <KnowledgeBrowser notes={notes} />

      {/* ─── 노션 학습 노트 인덱스 (링크 연동) ─── */}
      <StudyNotes />
    </main>
  );
}
