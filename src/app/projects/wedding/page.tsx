import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Wedding AI Case Study",
  description: "웨딩드레스 선택의 비용과 비교 기회 제약을 줄인 생성형 AI 서비스.",
};

export default function WeddingProjectPage() {
  const project = getProjectDetail("wedding");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
