import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Wedding Dress AI Case Study",
  description:
    "웨딩드레스 3D 복원 모델 비교와 실패 원인 분석을 거쳐 Stable Diffusion 기반 생성으로 방향을 전환했습니다.",
};

export default function WeddingProjectPage() {
  const project = getProjectDetail("wedding");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
