import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Claw Dev Case Study",
  description: "6역할 협업형 multi-agent의 동적 토론, 실제 도구 검증과 자율 repair loop를 구현했습니다.",
};

export default function ClawDevProjectPage() {
  const project = getProjectDetail("claw-dev");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
