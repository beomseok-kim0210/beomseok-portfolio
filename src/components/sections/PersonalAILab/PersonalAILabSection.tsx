import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { KnowledgeGraph } from "./KnowledgeGraph";

export function PersonalAILabSection() {
  return (
    <section id="lab" className="scene-shell flex min-h-screen items-center bg-[#F8FAFC] py-32">
      <div className="content-grid">
        <MotionBlock>
          <div className="mx-auto max-w-[860px] text-center">
            <p className="cinematic-label mb-8 text-blue-600">Research Lab</p>
            <h2 className="chapter-title">Personal AI Lab</h2>
            <p className="subtitle mx-auto mt-8 max-w-[620px] text-slate-700">
              프로젝트가 끝난 이후에도
              <br />
              AI Agent와 검색, 추론 구조를 실험하고 있습니다.
            </p>
            <p className="body-copy mx-auto mt-8 max-w-[720px] text-slate-600">
              Claw Dev는 멀티에이전트 협업, AI 검색, RAG, 프롬프트
              오케스트레이션, 코드 생성 검증 루프를 실험하는 개인 AI Lab입니다.
            </p>
            <Link
              href="/projects/claw-dev"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#111827] px-6 py-4 small-label text-white"
            >
              Open Claw Dev Lab <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </MotionBlock>
        <MotionBlock delay={0.12}>
          <KnowledgeGraph />
        </MotionBlock>
      </div>
    </section>
  );
}
