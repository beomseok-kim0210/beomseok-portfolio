import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Crime Scene Case Study",
  description: "진실을 데이터로 고정하고 증거 기반 진행과 자유형 AI 심문을 연결한 3D 추리 게임 V1을 구현했습니다.",
};

export default function CrimeSceneProjectPage() {
  const project = getProjectDetail("crime-scene");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
