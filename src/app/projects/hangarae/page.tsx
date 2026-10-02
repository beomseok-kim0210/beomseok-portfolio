import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "행가래 Case Study",
  description: "YOLO Pose와 Depth 기반 재활 운동 자세 분석을 Jetson Nano에서 실행하고 실시간 피드백으로 연결했습니다.",
};

export default function HangaraeProjectPage() {
  const project = getProjectDetail("hangarae");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
