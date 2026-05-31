import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Claw Dev Lab",
  description: "멀티에이전트, AI 검색, RAG, 검증 루프를 실험하는 개인 AI Lab.",
};

export default function ClawDevProjectPage() {
  const project = getProjectDetail("claw-dev");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
