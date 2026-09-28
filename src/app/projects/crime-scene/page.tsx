import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Crime Scene Case Study",
  description: "3D 탐색, 단서 수집, 자유형 AI 심문과 최종 추리를 연결한 웹 기반 크라임씬.",
};

export default function CrimeSceneProjectPage() {
  const project = getProjectDetail("crime-scene");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
