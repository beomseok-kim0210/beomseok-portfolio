import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "AI Docent Case Study",
  description: "페이지 문맥, 검색 근거, 대화, 음성과 3D 아바타를 연결한 포트폴리오 AI 도슨트.",
};

export default function AiDocentProjectPage() {
  const project = getProjectDetail("ai-docent");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
