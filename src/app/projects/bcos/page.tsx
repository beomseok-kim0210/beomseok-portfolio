import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "BCOS Case Study",
  description: "Task Contract, 호스트 검증, 독립 리뷰와 프로젝트 메모리를 연결한 AI coding orchestration.",
};

export default function BcosProjectPage() {
  const project = getProjectDetail("bcos");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
