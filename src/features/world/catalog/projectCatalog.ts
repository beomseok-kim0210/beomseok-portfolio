import { getProjectDetail } from "@/data/projectDetails";
import { projects } from "@/data/projects";
import { projectCards } from "@/data/projectCards";
import type { ProjectSlug, Project } from "@/types/portfolio";
import type { ProjectCatalogEntry } from "../types/contracts";

// Stable World identity -> existing route/data. Docent deliberately has three names.
export const projectIdentityMappings: readonly {
  projectId: string;
  routeSlug: ProjectSlug;
  summaryKey?: Project["key"];
  participation: ProjectCatalogEntry["worldParticipation"];
}[] = [
  { projectId: "armi", routeSlug: "armi", summaryKey: "armi", participation: "main" },
  { projectId: "hangarae", routeSlug: "hangarae", summaryKey: "hangarae", participation: "main" },
  { projectId: "wedding", routeSlug: "wedding", summaryKey: "wedding", participation: "main" },
  { projectId: "digital-docent", routeSlug: "ai-docent", summaryKey: "docent", participation: "experimental" },
  { projectId: "bcos", routeSlug: "bcos", participation: "experimental" },
  { projectId: "crime-scene", routeSlug: "crime-scene", participation: "experimental" },
  { projectId: "claw-dev", routeSlug: "claw-dev", participation: "excluded" },
];

export const projectCatalog: readonly ProjectCatalogEntry[] = projectIdentityMappings.map((mapping) => {
  const detail = getProjectDetail(mapping.routeSlug);
  if (!detail) throw new Error(`Missing project data: ${mapping.routeSlug}`);
  const card = projectCards.find((entry) => entry.slug === mapping.routeSlug);
  if (!card) throw new Error(`Missing project card: ${mapping.routeSlug}`);
  if (mapping.summaryKey && !projects.some((project) => project.key === mapping.summaryKey)) {
    throw new Error(`Missing project summary: ${mapping.summaryKey}`);
  }
  return {
    projectId: mapping.projectId,
    routeSlug: detail.slug,
    href: card.href,
    title: detail.title,
    category: detail.label,
    projectType: card.scope,
    dataReference: { sourceId: "project-details", key: detail.slug },
    summaryReference: mapping.summaryKey
      ? { sourceId: "projects", key: mapping.summaryKey }
      : undefined,
    mediaReference: detail.media,
    worldParticipation: mapping.participation,
  };
});

/** Adapter reads existing factual data; World entries never own narrative copies. */
export function resolveExistingProjectData(entry: ProjectCatalogEntry) {
  if (entry.dataReference.sourceId !== "project-details") return undefined;
  return getProjectDetail(entry.dataReference.key);
}
