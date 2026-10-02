import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Digital Docent Case Study",
  description: "Hybrid RAG(BM25+Dense, RRF), PageContext, Supertonic/LAM 음성을 연결한 AI 도슨트를 production에 배포했습니다.",
};

export default function AiDocentProjectPage() {
  const project = getProjectDetail("ai-docent");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
