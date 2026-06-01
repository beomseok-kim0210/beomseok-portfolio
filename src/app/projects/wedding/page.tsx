import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailLayout } from "@/components/project/ProjectDetailLayout";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Wedding AI Case Study",
  description:
    "2D to 3D wedding dress reconstruction research, model evaluation, and product decision case study.",
};

export default function WeddingProjectPage() {
  const project = getProjectDetail("wedding");
  if (!project) notFound();
  return <ProjectDetailLayout project={project} />;
}
