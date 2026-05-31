import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "행가래 Case Study",
  description: "AIoT 재활 보조 시스템과 온디바이스 포즈 인식 개선 사례.",
};

export default function HangaraeProjectPage() {
  const project = getProjectDetail("hangarae");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
