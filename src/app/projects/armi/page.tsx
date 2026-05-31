import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "ARMI Case Study",
  description: "환자의 음성 요청과 로봇, Watch 알림을 연결한 병상 보조 서비스.",
};

export default function ARMIProjectPage() {
  const project = getProjectDetail("armi");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
