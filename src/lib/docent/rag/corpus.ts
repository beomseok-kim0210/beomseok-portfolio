/**
 * RAG 코퍼스 — 포트폴리오의 구조화 데이터에서 결정론적으로 만든다.
 *
 * 정본 원칙: 사이트가 실제로 렌더하는 데이터 파일(src/data/*)이 근거다. 손으로 다시 쓴
 * 약력 덩어리는 만들지 않는다. 같은 사실이 여러 파일에 있으면(예: 행가래 Precision 이
 * projects.ts / projectDetails.ts / challenges.ts / hangaraeCaseStudy.ts 네 곳) 케이스
 * 스터디를 정본으로 두고, 요약본은 낮은 우선순위로 남긴다 — 지우지 않는 이유는 카드
 * 문구가 방문자가 실제로 읽은 문장이기 때문이다.
 *
 * 제외: docentFallback.ts(생성 요약이자 폴백 답변 — 근거가 아니다), ai-news-* /
 * ai-tips-* 일일 노트(제3자 뉴스 요약 — 포트폴리오 사실이 아니다), studyNotes.ts
 * (노션 링크 인덱스 — 본문 없음), 컴포넌트 안의 UI 문구.
 *
 * ID 는 배열 위치가 아니라 구조 키(프로젝트 × 섹션 × 항목 키)에서 나온다. 항목에
 * 고유 키가 없으면(예: result 문장 배열) 순서 번호를 쓴다 — 그 배열은 원본 배열
 * 순서를 보존하므로 결정론적이다.
 */
import { createHash } from "node:crypto";

import {
  aboutAwards,
  aboutExploration,
  aboutFocusAreas,
  aboutIntroduction,
  aboutJourney,
  aboutProfile,
  aboutSnapshot,
  aboutToolbox,
} from "@/data/about";
import {
  armiInteractionDecisions,
  armiRealtimeSteps,
  armiRecap,
  armiResults,
  armiStateGroups,
  armiTechGroups,
  armiTroubleshooting,
} from "@/data/armiCaseStudy";
import {
  clawdevAgents,
  clawdevHero,
  clawdevInterfaces,
  clawdevLimitations,
  clawdevLoopMeta,
  clawdevMemory,
  clawdevModelMeta,
  clawdevModelProfiles,
  clawdevPhases,
  clawdevRecap,
  clawdevResilience,
  clawdevResults,
  clawdevRetryMeta,
  clawdevReviewRounds,
  clawdevSchemaRetry,
  clawdevTechGroups,
} from "@/data/clawdevCaseStudy";
import { docentDevlog, docentOrigin, docentRoadmap } from "@/data/docentDevlog";
import {
  hangaraeHero,
  hangaraeRecap,
  hangaraeResultMetrics,
  hangaraeResultParagraph,
  hangaraeTechGroups,
  hangaraeTroubles,
} from "@/data/hangaraeCaseStudy";
import { projectDetails } from "@/data/projectDetails";
import { projects } from "@/data/projects";
import { skills } from "@/data/skills";
import { timeline } from "@/data/timeline";
import {
  weddingComparisonNote,
  weddingComparisonRows,
  weddingEnvironmentSummary,
  weddingExperts,
  weddingFailureRows,
  weddingLearned,
  weddingPivot,
  weddingProblem,
  weddingPromptMethods,
  weddingRecap,
  weddingResearchInsight,
  weddingResearchQuestion,
  weddingResearchStats,
  weddingTimeline,
  weddingVisualAnalysis,
} from "@/data/weddingResearch";
import { getKnowledgeNotes } from "@/lib/knowledge";

import type {
  CorpusSource,
  EntityType,
  ProjectId,
  RagChunk,
  Section,
  SourceType,
} from "./types";

import { PROJECT_ENTITIES, projectEntity, type ProjectEntity } from "./entities";
export { PROJECT_ENTITIES, projectEntity, type ProjectEntity };

/* ------------------------------------------------------------------- 빌더 */

const PRIORITY = {
  caseStudy: 1.0,
  projectDetail: 0.95,
  projectCard: 0.85,
  about: 0.9,
  devlog: 0.9,
  skills: 0.8,
  knowledge: 0.6,
} as const;

interface Draft {
  id: string;
  text: string;
  sourceType: SourceType;
  sourcePath: string;
  sourceId: string;
  entityType: EntityType;
  entityId: string;
  projectId?: ProjectId;
  section: Section;
  title: string;
  tags?: string[];
  provenance: string;
  priority: number;
  updatedAt?: string;
}

function clean(s: string): string {
  return s.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
}

function hash12(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

function finish(d: Draft): RagChunk {
  const text = clean(d.text);
  const p = d.projectId ? projectEntity(d.projectId) : undefined;
  return {
    id: d.id,
    text,
    sourceType: d.sourceType,
    sourcePath: d.sourcePath,
    sourceId: d.sourceId,
    entityType: d.entityType,
    entityId: d.entityId,
    projectId: d.projectId,
    projectSlug: d.projectId,
    projectTitle: p?.title,
    section: d.section,
    title: clean(d.title),
    tags: [...new Set((d.tags ?? []).map((t) => clean(t)).filter(Boolean))],
    provenance: d.provenance,
    priority: d.priority,
    contentHash: hash12(text),
    updatedAt: d.updatedAt,
  };
}

function list(items: readonly string[]): string {
  return items.map((s) => clean(s)).join(" · ");
}

/** 카드/문장 배열을 항목당 한 조각으로. `key` 가 없으면 순서 번호. */
function each<T>(
  items: readonly T[],
  make: (item: T, index: number) => Draft | null,
): Draft[] {
  const out: Draft[] = [];
  items.forEach((item, i) => {
    const d = make(item, i);
    if (d) out.push(d);
  });
  return out;
}

function projectsCards(): Draft[] {
  const src = "src/data/projects.ts";
  const out: Draft[] = [];
  for (const p of projects) {
    const id = p.key as ProjectId;
    const base = { sourceType: "structured_data" as const, sourcePath: src, sourceId: `projects:${id}`, entityType: "project" as const, entityId: id, projectId: id, priority: PRIORITY.projectCard };
    out.push({ ...base, id: `project:${id}:overview:card`, section: "overview", title: `${p.name} — ${p.label}`,
      text: `${p.headline} ${p.description} ${p.impact}`, tags: [p.label, ...p.sections],
      provenance: `projects.ts → projects[key=${id}] headline/description/impact` });
    if (p.role) out.push({ ...base, id: `project:${id}:role:card`, section: "role", title: `${p.name} 역할`, text: `${p.identity ?? ""} 역할: ${p.role}`, provenance: `projects.ts → projects[key=${id}].role` });
    if (p.award) out.push({ ...base, id: `project:${id}:award:card`, section: "award", title: `${p.name} 수상`, text: `${p.name}: ${p.award}`, provenance: `projects.ts → projects[key=${id}].award` });
    out.push({ ...base, id: `project:${id}:technology:card`, section: "technology", title: `${p.name} 기술`, text: `${p.name}에 쓰인 기술: ${list(p.technologies)}`, tags: [...p.technologies], provenance: `projects.ts → projects[key=${id}].technologies` });
    out.push(...each(p.productCards, (c) => ({ ...base, id: `project:${id}:architecture:card:${slug(c.title)}`, section: "architecture", title: `${p.name} — ${c.title}`, text: `${c.description}${c.keywords ? ` (${list(c.keywords)})` : ""}`, tags: c.keywords ? [...c.keywords] : [], provenance: `projects.ts → projects[key=${id}].productCards[title=${c.title}]` })));
    if (p.metrics) out.push({ ...base, id: `project:${id}:metric:card`, section: "metric", title: `${p.name} 지표`, entityType: "project_metric",
      text: p.metrics.map((m) => `${m.label}: ${m.before ? `${m.before} → ` : ""}${m.after}${m.caption ? ` ${m.caption}` : ""}`).join(", "),
      provenance: `projects.ts → projects[key=${id}].metrics` });
  }
  return out;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "");
}

function projectDetailChunks(): Draft[] {
  const src = "src/data/projectDetails.ts";
  const out: Draft[] = [];
  for (const d of projectDetails) {
    const id = d.slug;
    const base = { sourceType: "structured_data" as const, sourcePath: src, sourceId: `projectDetails:${id}`, entityType: "project" as const, entityId: id, projectId: id, priority: PRIORITY.projectDetail };
    out.push({ ...base, id: `project:${id}:overview:detail`, section: "overview", title: `${d.title} — ${d.subtitle}`, text: `${d.title}(${d.label}): ${d.description} 핵심 질문: ${d.problemQuestion.join(" ")}`, tags: [d.label], provenance: `projectDetails.ts → [slug=${id}] description/problemQuestion` });
    out.push({ ...base, id: `project:${id}:role:detail`, section: "role", title: `${d.title}에서 맡은 역할`, text: `${d.title}에서 김범석이 맡은 역할: ${list(d.role)}`, tags: [...d.role], provenance: `projectDetails.ts → [slug=${id}].role` });
    out.push({ ...base, id: `project:${id}:technology:detail`, section: "technology", title: `${d.title} 기술 스택`, text: `${d.title} 기술 스택: ${list(d.techStack)}`, tags: [...d.techStack], provenance: `projectDetails.ts → [slug=${id}].techStack` });
    out.push({ ...base, id: `project:${id}:architecture:detail`, section: "architecture", title: `${d.title} 아키텍처 — ${d.architecture.title}`, text: `${d.architecture.description} ${d.architecture.items.map((i) => `${i.title}: ${i.description}${i.tech ? ` (${list(i.tech)})` : ""}`).join(" ")}`, tags: d.architecture.items.flatMap((i) => i.tech ?? []), provenance: `projectDetails.ts → [slug=${id}].architecture` });
    out.push(...each(d.highlights, (h) => ({ ...base, id: `project:${id}:metric:highlight:${slug(h.label)}`, section: "metric", entityType: "project_metric" as const, title: `${d.title} ${h.label}: ${h.value}`, text: `${d.title} ${h.label} — ${h.value}: ${h.description}`, provenance: `projectDetails.ts → [slug=${id}].highlights[label=${h.label}]` })));
    out.push(...each(d.troubleshooting, (t) => ({ ...base, id: `project:${id}:troubleshooting:detail:${slug(t.title)}`, section: "troubleshooting", entityType: "project_troubleshooting" as const, title: `${d.title} 트러블슈팅 — ${t.title}`, text: `문제: ${t.problem} 분석: ${t.investigation} 해결: ${t.solution} 결과: ${t.result}`, tags: [...t.tech], provenance: `projectDetails.ts → [slug=${id}].troubleshooting[title=${t.title}] (challenges.ts 공유)` })));
    out.push({ ...base, id: `project:${id}:result:detail`, section: "result", title: `${d.title} 결과와 배운 점`, text: list(d.result), provenance: `projectDetails.ts → [slug=${id}].result` });
  }
  return out;
}

function armiChunks(): Draft[] {
  const id: ProjectId = "armi";
  const src = "src/data/armiCaseStudy.ts";
  const base = { sourceType: "structured_data" as const, sourcePath: src, sourceId: "caseStudy:armi", entityType: "project" as const, entityId: id, projectId: id, priority: PRIORITY.caseStudy };
  const out: Draft[] = [];
  out.push({ ...base, id: `project:${id}:overview:recap`, section: "overview", title: "ARMI 한 줄 정의와 역할", text: armiRecap.definition, provenance: "armiCaseStudy.ts → armiRecap.definition" });
  out.push({ ...base, id: `project:${id}:role:recap`, section: "role", title: "ARMI에서 맡은 역할 (케이스 스터디)", text: `ARMI에서 김범석이 맡은 역할: ${armiRecap.definition.split("저는")[1] ?? armiRecap.definition}`, provenance: "armiCaseStudy.ts → armiRecap.definition (역할 문장)" });
  out.push({ ...base, id: `project:${id}:architecture:state-machine`, section: "architecture", title: "ARMI 음성 상태 머신", text: armiStateGroups.map((g) => `${g.title}: ${g.nodes.join(" → ")} — 규칙: ${g.rule}`).join(" "), tags: ["State Machine", "STT", "TTS"], provenance: "armiCaseStudy.ts → armiStateGroups" });
  out.push({ ...base, id: `project:${id}:architecture:realtime-flow`, section: "architecture", title: "ARMI 실시간 이벤트 흐름", text: `REST → WebSocket → 구독 순서: ${armiRealtimeSteps.join(" → ")}`, tags: ["WebSocket", "STOMP"], provenance: "armiCaseStudy.ts → armiRealtimeSteps" });
  out.push(...each(armiInteractionDecisions, (d) => ({ ...base, id: `project:${id}:decision:${slug(d.title)}`, section: "decision", entityType: "project_decision" as const, title: `ARMI 결정 — ${d.title}`, text: `문제: ${d.problem} 결정: ${d.decision} 결과: ${d.result}`, provenance: `armiCaseStudy.ts → armiInteractionDecisions[title=${d.title}]` })));
  out.push(...each(armiTroubleshooting, (t) => ({ ...base, id: `project:${id}:decision:${slug(t.category)}`, section: "decision", entityType: "project_decision" as const, title: `ARMI 기술 결정 — ${t.title}`, text: `검토한 방법: ${t.approaches.join(" / ")} 선택 이유: ${t.rationale}`, tags: [...t.tech], provenance: `armiCaseStudy.ts → armiTroubleshooting[category=${t.category}] approaches/rationale` })));
  out.push(...each(armiTroubleshooting, (t) => ({ ...base, id: `project:${id}:troubleshooting:${slug(t.category)}`, section: "troubleshooting", entityType: "project_troubleshooting" as const, title: `ARMI ${t.category} — ${t.title}`, text: `진단: ${t.diagnosis} 원인: ${t.cause} 검토한 방법: ${t.approaches.join(" / ")} 선택 이유: ${t.rationale} 해결: ${t.summary.solution} 결과: ${t.summary.result} 인사이트: ${t.insight}`, tags: [...t.tech], provenance: `armiCaseStudy.ts → armiTroubleshooting[category=${t.category}]` })));
  out.push({ ...base, id: `project:${id}:lesson:results`, section: "lesson", title: "ARMI에서 세운 기준", text: armiResults.map((r) => `${r.title}: ${r.description}`).join(" "), provenance: "armiCaseStudy.ts → armiResults" });
  out.push({ ...base, id: `project:${id}:technology:groups`, section: "technology", title: "ARMI 기술 그룹", text: armiTechGroups.map((g) => `${g.title}: ${g.items.join(", ")}`).join(" / "), tags: armiTechGroups.flatMap((g) => [...g.items]), provenance: "armiCaseStudy.ts → armiTechGroups" });
  out.push(...each(armiRecap.reflection, (r, i) => ({ ...base, id: `project:${id}:lesson:reflection:${i + 1}`, section: "lesson", title: `ARMI 회고 ${i + 1}`, text: r, provenance: `armiCaseStudy.ts → armiRecap.reflection[${i}]` })));
  out.push({ ...base, id: `project:${id}:lesson:takeaways`, section: "lesson", title: "ARMI 핵심 교훈", text: armiRecap.takeaways.map((t) => `${t.label}: ${t.note}`).join(" "), provenance: "armiCaseStudy.ts → armiRecap.takeaways" });
  return out;
}

function hangaraeChunks(): Draft[] {
  const id: ProjectId = "hangarae";
  const src = "src/data/hangaraeCaseStudy.ts";
  const base = { sourceType: "structured_data" as const, sourcePath: src, sourceId: "caseStudy:hangarae", entityType: "project" as const, entityId: id, projectId: id, priority: PRIORITY.caseStudy };
  const out: Draft[] = [];
  out.push({ ...base, id: `project:${id}:overview:recap`, section: "overview", title: "행가래 한 줄 정의와 역할", text: `${hangaraeHero.subtitle} ${hangaraeRecap.definition}`, tags: [...hangaraeHero.metrics], provenance: "hangaraeCaseStudy.ts → hangaraeHero.subtitle + hangaraeRecap.definition" });
  out.push({ ...base, id: `project:${id}:role:recap`, section: "role", title: "행가래에서 맡은 역할 (케이스 스터디)", text: `행가래에서 김범석이 맡은 역할: ${hangaraeRecap.definition.split("저는")[1] ?? hangaraeRecap.definition}`, provenance: "hangaraeCaseStudy.ts → hangaraeRecap.definition (역할 문장)" });
  for (const t of hangaraeTroubles) {
    out.push({ ...base, id: `project:${id}:troubleshooting:${t.id}`, section: "troubleshooting", entityType: "project_troubleshooting", title: `행가래 ${t.label} — ${t.title}`, text: `진단: ${t.diagnosis} 문제: ${t.problem} 원인: ${t.cause} 검토한 방법: ${t.approaches.join(" / ")} 결정: ${t.decision} 이유: ${t.rationale} 결과: ${t.result} 인사이트: ${t.insight}`, tags: [...t.tech], provenance: `hangaraeCaseStudy.ts → hangaraeTroubles[id=${t.id}]` });
    out.push({ ...base, id: `project:${id}:decision:${t.id}`, section: "decision", entityType: "project_decision", title: `행가래 기술 결정 — ${t.title}`, text: `검토: ${t.approaches.join(" / ")} 선택: ${t.decision} 왜: ${t.rationale}`, tags: [...t.tech], provenance: `hangaraeCaseStudy.ts → hangaraeTroubles[id=${t.id}] approaches/decision/rationale` });
    if (t.metrics) out.push({ ...base, id: `project:${id}:metric:${t.id}`, section: "metric", entityType: "project_metric", title: `행가래 수치 — ${t.title}`, text: `${t.decision} 결과 수치: ${t.metrics.map((m) => `${m.label} ${m.before} → ${m.after}`).join(", ")}`, tags: [...t.tech], provenance: `hangaraeCaseStudy.ts → hangaraeTroubles[id=${t.id}].metrics` });
  }
  out.push({ ...base, id: `project:${id}:metric:result-metrics`, section: "metric", entityType: "project_metric", title: "행가래 결과 지표", text: hangaraeResultMetrics.map((m) => `${m.value} ${m.label}: ${m.description}`).join(" "), provenance: "hangaraeCaseStudy.ts → hangaraeResultMetrics" });
  out.push({ ...base, id: `project:${id}:result:paragraph`, section: "result", title: "행가래의 핵심 결과", text: hangaraeResultParagraph, provenance: "hangaraeCaseStudy.ts → hangaraeResultParagraph" });
  out.push({ ...base, id: `project:${id}:technology:groups`, section: "technology", title: "행가래 기술 그룹", text: hangaraeTechGroups.map((g) => `${g.label}: ${g.items.join(", ")}`).join(" / "), tags: hangaraeTechGroups.flatMap((g) => [...g.items]), provenance: "hangaraeCaseStudy.ts → hangaraeTechGroups" });
  out.push({ ...base, id: `project:${id}:lesson:takeaways`, section: "lesson", title: "행가래 핵심 교훈", text: hangaraeRecap.takeaways.map((t) => `${t.label}: ${t.note}`).join(" "), provenance: "hangaraeCaseStudy.ts → hangaraeRecap.takeaways" });
  out.push(...each(hangaraeRecap.reflection, (r, i) => ({ ...base, id: `project:${id}:lesson:reflection:${i + 1}`, section: "lesson", title: `행가래 회고 ${i + 1}`, text: r, provenance: `hangaraeCaseStudy.ts → hangaraeRecap.reflection[${i}]` })));
  return out;
}

function weddingChunks(): Draft[] {
  const id: ProjectId = "wedding";
  const src = "src/data/weddingResearch.ts";
  const base = { sourceType: "structured_data" as const, sourcePath: src, sourceId: "caseStudy:wedding", entityType: "project" as const, entityId: id, projectId: id, priority: PRIORITY.caseStudy };
  const out: Draft[] = [];
  out.push({ ...base, id: `project:${id}:overview:recap`, section: "overview", title: "Wedding AI 한 줄 정의와 역할", text: weddingRecap.definition, provenance: "weddingResearch.ts → weddingRecap.definition" });
  out.push({ ...base, id: `project:${id}:role:recap`, section: "role", title: "Wedding AI에서 맡은 역할 (케이스 스터디)", text: `Wedding AI에서 김범석이 맡은 역할: ${weddingRecap.definition.split("저는")[1] ?? weddingRecap.definition}`, provenance: "weddingResearch.ts → weddingRecap.definition (역할 문장)" });
  out.push({ ...base, id: `project:${id}:problem:tour`, section: "problem", title: `Wedding AI 문제 정의 — ${clean(weddingProblem.title)}`, text: weddingProblem.paragraphs.join(" "), provenance: "weddingResearch.ts → weddingProblem.paragraphs" });
  out.push({ ...base, id: `project:${id}:problem:research-question`, section: "problem", title: "Wedding AI 연구 질문 — 왜 2D→3D 를 검토했나", text: weddingResearchQuestion.join(" "), provenance: "weddingResearch.ts → weddingResearchQuestion" });
  out.push({ ...base, id: `project:${id}:metric:research-stats`, section: "metric", entityType: "project_metric", title: "Wedding AI 연구 규모", text: weddingResearchStats.map((s) => `${s.value} ${s.label} (${s.caption.join(", ")})`).join("; "), provenance: "weddingResearch.ts → weddingResearchStats" });
  for (const m of weddingTimeline) {
    out.push({ ...base, id: `project:${id}:decision:model:${slug(m.model)}`, section: "decision", entityType: "project_decision", title: `Wedding AI 모델 검토 — ${m.model} (${m.result})`, text: `${m.model} (${m.type}). 가정: ${m.coreAssumption} 시도 이유: ${m.whyTried} 결과: ${m.result} — ${m.reason} 결론: ${m.outcome}`, tags: [m.model], provenance: `weddingResearch.ts → weddingTimeline[model=${m.model}]` });
  }
  out.push({ ...base, id: `project:${id}:metric:model-comparison`, section: "metric", entityType: "project_metric", title: "Wedding AI 모델 비교표 (논문 참고 지표)", text: `${weddingComparisonRows.map((r) => `${r.model} ${r.year}: ${r.representation}, body prior ${r.bodyPrior}, 공개 지표 ${r.publishedMetric}, 드레스 볼륨 적합도 ${r.volumetricDressFit}, 판단: ${r.portfolioDecision}`).join("; ")}. ${weddingComparisonNote}`, tags: weddingComparisonRows.map((r) => r.model), provenance: "weddingResearch.ts → weddingComparisonRows + weddingComparisonNote" });
  out.push({ ...base, id: `project:${id}:troubleshooting:environment`, section: "troubleshooting", entityType: "project_troubleshooting", title: "Wedding AI 환경 재현 문제", text: weddingEnvironmentSummary.join(" "), tags: ["PyTorch", "CUDA", "PyTorch3D", "Conda"], provenance: "weddingResearch.ts → weddingEnvironmentSummary" });
  out.push({ ...base, id: `project:${id}:troubleshooting:volume-collapse`, section: "troubleshooting", entityType: "project_troubleshooting", title: "Wedding AI 실패 분석 — 볼륨 붕괴", text: `${weddingResearchInsight.mainInsight} ${weddingResearchInsight.conclusion}`, provenance: "weddingResearch.ts → weddingResearchInsight" });
  out.push({ ...base, id: `project:${id}:metric:failure-matrix`, section: "metric", entityType: "project_metric", title: "Wedding AI 모델별 실패 매트릭스 (1-5 점)", text: weddingFailureRows.map((r) => `${r.model}: body prior ${r.bodyPrior}, topology ${r.topologyFlexibility}, occlusion ${r.occlusionRobustness}, volumetric garment ${r.volumetricGarment}, environment repro ${r.environmentReproducibility} — ${r.failureSummary}`).join("; "), tags: weddingFailureRows.map((r) => r.model), provenance: "weddingResearch.ts → weddingFailureRows" });
  out.push({ ...base, id: `project:${id}:troubleshooting:econ-visual`, section: "troubleshooting", entityType: "project_troubleshooting", title: "Wedding AI ECON 실험 — 머메이드 성공 vs 볼가운 실패", text: `${weddingVisualAnalysis.caption} ${weddingVisualAnalysis.explanation}`, provenance: "weddingResearch.ts → weddingVisualAnalysis" });
  out.push({ ...base, id: `project:${id}:decision:pivot`, section: "decision", entityType: "project_decision", title: "Wedding AI 방향 전환 — 3D 복원에서 비교 도구로", text: `원래 목표: ${weddingPivot.originalGoal}. 최종 방향: ${weddingPivot.finalDirection}. 이유: ${weddingPivot.reason} 판단: ${weddingPivot.insight} 그래서: ${weddingPivot.therefore}`, provenance: "weddingResearch.ts → weddingPivot" });
  out.push({ ...base, id: `project:${id}:architecture:expert-prompts`, section: "architecture", title: "Wedding AI 전문가 프롬프트 구조", text: `역할 기반 전문가 프롬프트 5종: ${weddingExperts.map((e) => `${e.title}(${e.description})`).join(", ")}. 프롬프트 기법: ${weddingPromptMethods.join(", ")}.`, tags: [...weddingPromptMethods], provenance: "weddingResearch.ts → weddingExperts + weddingPromptMethods" });
  out.push({ ...base, id: `project:${id}:lesson:learned`, section: "lesson", title: `Wedding AI 배운 점 — ${clean(weddingLearned.title)}`, text: `${weddingLearned.paragraphs.join(" ")} (${weddingLearned.quote})`, provenance: "weddingResearch.ts → weddingLearned" });
  out.push({ ...base, id: `project:${id}:lesson:takeaways`, section: "lesson", title: "Wedding AI 핵심 교훈", text: weddingRecap.takeaways.map((t) => `${t.label}: ${t.note}`).join(" "), provenance: "weddingResearch.ts → weddingRecap.takeaways" });
  out.push(...each(weddingRecap.reflection, (r, i) => ({ ...base, id: `project:${id}:lesson:reflection:${i + 1}`, section: "lesson", title: `Wedding AI 회고 ${i + 1}`, text: r, provenance: `weddingResearch.ts → weddingRecap.reflection[${i}]` })));
  return out;
}

function clawdevChunks(): Draft[] {
  const id: ProjectId = "claw-dev";
  const src = "src/data/clawdevCaseStudy.ts";
  const base = { sourceType: "structured_data" as const, sourcePath: src, sourceId: "caseStudy:claw-dev", entityType: "project" as const, entityId: id, projectId: id, priority: PRIORITY.caseStudy };
  const out: Draft[] = [];
  out.push({ ...base, id: `project:${id}:overview:recap`, section: "overview", title: "Claw Dev 한 줄 정의와 역할", text: `${clawdevHero.premise} ${clawdevHero.subPremise} ${clawdevRecap.definition}`, provenance: "clawdevCaseStudy.ts → clawdevHero.premise + clawdevRecap.definition" });
  out.push({ ...base, id: `project:${id}:role:recap`, section: "role", title: "Claw Dev에서 맡은 역할 (케이스 스터디)", text: `Claw Dev에서 김범석이 맡은 역할: ${clawdevRecap.definition.split("만드는")[1] ?? clawdevRecap.definition}`, provenance: "clawdevCaseStudy.ts → clawdevRecap.definition (역할 문장)" });
  out.push({ ...base, id: `project:${id}:metric:hero-stats`, section: "metric", entityType: "project_metric", title: "Claw Dev 규모 수치", text: clawdevHero.stats.map((s) => `${s.value} ${s.label} (${s.detail})`).join("; "), provenance: "clawdevCaseStudy.ts → clawdevHero.stats" });
  out.push({ ...base, id: `project:${id}:architecture:agents`, section: "architecture", title: "Claw Dev 6개 역할 에이전트", text: clawdevAgents.map((a) => `${a.role}(${a.tagline}): ${a.objective} 제약: ${a.constraints.join(", ")}`).join(" "), tags: clawdevAgents.map((a) => a.role), provenance: "clawdevCaseStudy.ts → clawdevAgents" });
  out.push({ ...base, id: `project:${id}:architecture:phases`, section: "architecture", title: "Claw Dev 오케스트레이션 8단계", text: clawdevPhases.map((p) => `${p.label}(${p.actor}): ${p.detail}`).join(" "), provenance: "clawdevCaseStudy.ts → clawdevPhases" });
  out.push({ ...base, id: `project:${id}:architecture:verify-loop`, section: "architecture", title: "Claw Dev 검증·수리 루프", text: `생성한 코드를 node --check, tsc --noEmit, node --test 로 실제 실행해 검증한다. ${clawdevLoopMeta.reviewRounds}, ${clawdevLoopMeta.repairCycles}, ${clawdevLoopMeta.stall}. 재프롬프트: ${clawdevRetryMeta.retries} (${clawdevRetryMeta.client}).`, tags: ["node --test", "tsc", "Zod"], provenance: "clawdevCaseStudy.ts → clawdevLoopMeta + clawdevRetryMeta" });
  out.push({ ...base, id: `project:${id}:decision:llm-fallback`, section: "decision", entityType: "project_decision", title: "Claw Dev LLM 폴백 설계 — Gemini → Ollama", text: `Primary ${clawdevResilience.primary.name}(${clawdevResilience.primary.sub}), fallback ${clawdevResilience.fallback.name}(${clawdevResilience.fallback.sub}). 트리거: ${clawdevResilience.triggers.join(", ")}. ${clawdevResilience.behavior} 지원 모델군: ${clawdevModelMeta.families.join(", ")}.`, tags: ["Gemini", "Ollama", "qwen3.5"], provenance: "clawdevCaseStudy.ts → clawdevResilience + clawdevModelMeta" });
  out.push({ ...base, id: `project:${id}:architecture:memory`, section: "architecture", title: "Claw Dev 프로젝트 메모리 (RAG 아님, 파일 기반)", text: `${clawdevMemory.fields.map((f) => `${f.label}: ${f.detail}`).join(", ")}. ${clawdevMemory.continueMode}`, provenance: "clawdevCaseStudy.ts → clawdevMemory" });
  out.push({ ...base, id: `project:${id}:architecture:interfaces`, section: "architecture", title: "Claw Dev 인터페이스 — CLI 와 Web", text: `${clawdevInterfaces.shared} 를 공유하는 두 인터페이스: ${clawdevInterfaces.nodes.map((n) => `${n.name}(${n.stack}) — ${n.detail}`).join("; ")}`, provenance: "clawdevCaseStudy.ts → clawdevInterfaces" });
  out.push({ ...base, id: `project:${id}:architecture:model-profiles`, section: "architecture", title: "Claw Dev 단계별 모델 파라미터", text: `단계마다 temperature/numPredict 를 다르게 준다 (qwen3.5 기준): ${clawdevModelProfiles.map((p) => `${p.stage} temp=${p.temperature} numPredict=${p.numPredict} — ${p.note}`).join("; ")}`, provenance: "clawdevCaseStudy.ts → clawdevModelProfiles" });
  out.push(...each(clawdevReviewRounds, (r) => ({ ...base, id: `project:${id}:troubleshooting:review-${slug(r.round)}`, section: "troubleshooting", entityType: "project_troubleshooting" as const, title: `Claw Dev 코드 리뷰 — ${r.round}: ${r.title}`, text: `리뷰어 ${r.reviewer}(${r.reaction}): ${r.note} 검증: ${r.checks.map((c) => `${c.name}(${c.command}) ${c.status} — ${c.summary}`).join(", ")}. 결과: ${r.outcome}`, provenance: `clawdevCaseStudy.ts → clawdevReviewRounds[round=${r.round}]` })));
  out.push({ ...base, id: `project:${id}:architecture:schema-retry`, section: "architecture", title: "Claw Dev 스키마 재시도 — Zod 검증 실패 시 재프롬프트", text: `${clawdevRetryMeta.client}. ${clawdevRetryMeta.retries} 예: ${clawdevSchemaRetry.map((f) => `[${f.label}] ${f.lines.join(" ")}`).join(" → ")}`, provenance: "clawdevCaseStudy.ts → clawdevSchemaRetry + clawdevRetryMeta" });
  out.push({ ...base, id: `project:${id}:result:results`, section: "result", title: "Claw Dev 결과", text: clawdevResults.map((r) => `${r.label} ${r.value}: ${r.detail}`).join(" "), provenance: "clawdevCaseStudy.ts → clawdevResults" });
  out.push({ ...base, id: `project:${id}:result:limitations`, section: "result", title: "Claw Dev 한계", text: clawdevLimitations.join(" "), provenance: "clawdevCaseStudy.ts → clawdevLimitations" });
  out.push({ ...base, id: `project:${id}:technology:groups`, section: "technology", title: "Claw Dev 기술 그룹", text: clawdevTechGroups.map((g) => `${g.label}: ${g.items.join(", ")}`).join(" / "), tags: clawdevTechGroups.flatMap((g) => g.items), provenance: "clawdevCaseStudy.ts → clawdevTechGroups" });
  out.push({ ...base, id: `project:${id}:lesson:takeaways`, section: "lesson", title: "Claw Dev 핵심 교훈", text: clawdevRecap.takeaways.map((t) => `${t.label}: ${t.note}`).join(" "), provenance: "clawdevCaseStudy.ts → clawdevRecap.takeaways" });
  out.push(...each(clawdevRecap.reflection, (r, i) => ({ ...base, id: `project:${id}:lesson:reflection:${i + 1}`, section: "lesson", title: `Claw Dev 회고 ${i + 1}`, text: r, provenance: `clawdevCaseStudy.ts → clawdevRecap.reflection[${i}]` })));
  return out;
}

function docentChunks(): Draft[] {
  const id: ProjectId = "docent";
  const src = "src/data/docentDevlog.ts";
  const base = { sourceType: "structured_data" as const, sourcePath: src, sourceId: "devlog:docent", entityType: "devlog" as const, entityId: id, projectId: id, priority: PRIORITY.devlog };
  const out: Draft[] = [];
  out.push({ ...base, id: `project:${id}:overview:origin`, section: "overview", title: `AI 도슨트 — ${docentOrigin.heading}`, text: `${docentOrigin.label} ${docentOrigin.date}: ${docentOrigin.body}`, provenance: "docentDevlog.ts → docentOrigin" });
  out.push(...each(docentDevlog, (e) => ({ ...base, id: `project:${id}:devlog:${e.date.replace(/\./g, "")}:${slug(e.title)}`, section: "devlog", title: `AI 도슨트 개발기 ${e.date} — ${e.title}`, text: `${e.body}${e.state ? ` 상태: ${e.state}` : ""}${e.caveat ? ` 한계: ${e.caveat}` : ""}`, tags: [...e.tags], provenance: `docentDevlog.ts → docentDevlog[date=${e.date}, title=${e.title}]`, updatedAt: e.date })));
  out.push(...each(docentRoadmap, (r) => ({ ...base, id: `project:${id}:roadmap:${slug(r.title)}`, section: "roadmap", title: `AI 도슨트 로드맵 — ${r.title}`, text: r.body, provenance: `docentDevlog.ts → docentRoadmap[title=${r.title}]` })));
  return out;
}

function profileChunks(): Draft[] {
  const src = "src/data/about.ts";
  const base = { sourceType: "structured_data" as const, sourcePath: src, sourceId: "about", entityType: "profile" as const, entityId: "profile", priority: PRIORITY.about };
  const out: Draft[] = [];
  out.push({ ...base, id: "profile:profile:card", section: "profile", title: "김범석 프로필", text: aboutProfile.map((p) => `${p.label}: ${p.value.join(", ")}`).join("; "), provenance: "about.ts → aboutProfile" });
  out.push({ ...base, id: "profile:profile:introduction", section: "profile", title: "김범석 소개", text: aboutIntroduction, provenance: "about.ts → aboutIntroduction" });
  out.push({ ...base, id: "profile:profile:snapshot", section: "metric", title: "김범석 스냅샷 수치", text: aboutSnapshot.map((s) => `${s.value} ${s.label}`).join(", "), provenance: "about.ts → aboutSnapshot" });
  out.push(...each(aboutJourney, (j) => ({ ...base, id: `profile:journey:${j.step.toLowerCase().replace(/\s+/g, "-")}`, section: "journey", entityType: (j.title.includes("Bootcamp") || j.title === "SSAFY" ? "education" : "experience") as EntityType, title: `여정 ${j.step} ${j.year} — ${j.title}`, text: `${j.year} ${j.title}: ${j.groups.map((g) => `${g.label}: ${g.items.join(", ")}`).join("; ")}`, tags: j.groups.flatMap((g) => [...g.items]), provenance: `about.ts → aboutJourney[step=${j.step}]` })));
  out.push(...each(aboutFocusAreas, (f) => ({ ...base, id: `profile:focus:${slug(f.title)}`, section: "focus", title: `포커스 영역 — ${f.title}`, text: `${f.title}: ${f.description} 기술: ${f.technologies.join(", ")}. 관련 프로젝트: ${f.projects.join(", ")}.`, tags: [...f.technologies, ...f.projects], provenance: `about.ts → aboutFocusAreas[title=${f.title}]` })));
  out.push({ ...base, id: "profile:skill:toolbox", section: "skill", entityType: "skill", title: "기술 스택 (Toolbox)", text: aboutToolbox.map((t) => `${t.title}: ${t.items.join(", ")}`).join("; "), tags: aboutToolbox.flatMap((t) => [...t.items]), provenance: "about.ts → aboutToolbox" });
  out.push(...each(aboutAwards, (a) => ({ ...base, id: `profile:award:${slug(a.title)}`, section: "award", title: `수상 — ${a.title}`, text: `${a.title}: ${a.description}`, provenance: `about.ts → aboutAwards[title=${a.title}]` })));
  out.push({ ...base, id: "profile:focus:exploration", section: "focus", title: "지금 탐구 중인 주제", text: aboutExploration.map((e) => `${e.title}: ${e.status}`).join(", "), provenance: "about.ts → aboutExploration" });
  out.push(...each(timeline, (t) => ({ ...base, sourcePath: "src/data/timeline.ts", sourceId: "timeline", id: `profile:journey:timeline:${slug(t.title)}`, section: "journey", entityType: "experience" as const, title: `타임라인 — ${t.title} (${t.label})`, text: t.description, provenance: `timeline.ts → timeline[title=${t.title}]` })));
  return out;
}

function skillChunks(): Draft[] {
  const src = "src/data/skills.ts";
  return skills.flatMap((g) => g.items.map((item) => ({
    sourceType: "structured_data" as const, sourcePath: src, sourceId: "skills", entityType: "skill" as const, entityId: `skill:${slug(item.technology)}`, priority: PRIORITY.skills,
    id: `skill:${slug(g.category)}:${slug(item.technology)}`, section: "skill" as const, title: `${g.category} — ${item.technology}`,
    text: `${item.technology} (${g.category}): ${item.description}. 사용한 곳: ${item.usedIn}.`, tags: [item.technology, item.usedIn],
    provenance: `skills.ts → skills[category=${g.category}].items[technology=${item.technology}]`,
  })));
}

/** 날짜가 붙은 뉴스/팁 노트는 제3자 요약이라 제외. 주제 노트 8편만. */
function knowledgeChunks(): Draft[] {
  // getKnowledgeNotes() 는 lastUpdated 로 정렬하는데, 이 8편은 전부 같은 달이라 동점이면
  // fs.readdirSync 의 파일시스템 순서로 갈린다 — 호스트마다(특히 fresh clone) 달라질 수
  // 있다. slug 로 다시 정렬해 조각 순서를 완전히 결정론적으로 고정한다.
  const notes = getKnowledgeNotes()
    .filter((n) => !/^ai-(news|tips)-\d{4}-\d{2}-\d{2}$/.test(n.slug))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return notes.map((n) => ({
    sourceType: "markdown_note" as const, sourcePath: `knowledge/${n.slug}.md`, sourceId: `knowledge:${n.slug}`, entityType: "knowledge" as const, entityId: `knowledge:${n.slug}`, priority: PRIORITY.knowledge,
    id: `knowledge:${n.slug}`, section: "note" as const, title: `지식 노트 — ${n.title}`,
    text: `${n.summary} ${n.body.slice(0, 1200)}`, tags: [...n.keywords, n.category],
    provenance: `knowledge/${n.slug}.md frontmatter summary + body[0:1200]`,
  }));
}

/* ------------------------------------------------------------------ 공개 API */

let cached: RagChunk[] | null = null;

export function buildCorpus(): RagChunk[] {
  const drafts = [
    ...projectsCards(),
    ...projectDetailChunks(),
    ...armiChunks(),
    ...hangaraeChunks(),
    ...weddingChunks(),
    ...clawdevChunks(),
    ...docentChunks(),
    ...profileChunks(),
    ...skillChunks(),
    ...knowledgeChunks(),
  ];
  const seen = new Set<string>();
  for (const d of drafts) {
    if (seen.has(d.id)) throw new Error(`duplicate chunk id: ${d.id}`);
    seen.add(d.id);
  }
  return drafts.map(finish).filter((c) => c.text.length > 0);
}

export function getCorpus(): RagChunk[] {
  if (!cached) cached = buildCorpus();
  return cached;
}

/** 코퍼스 인벤토리 — 어떤 원천이 들어갔고 무엇이 정본인지. */
export function corpusInventory(): CorpusSource[] {
  const owner = "Kim Beomseok (portfolio author)";
  return [
    { sourceId: "caseStudy:armi", sourceType: "structured_data", sourcePath: "src/data/armiCaseStudy.ts", entityType: "project", entityId: "armi", title: "ARMI case study", contentOwner: owner, canonical: true, priority: PRIORITY.caseStudy },
    { sourceId: "caseStudy:hangarae", sourceType: "structured_data", sourcePath: "src/data/hangaraeCaseStudy.ts", entityType: "project", entityId: "hangarae", title: "행가래 case study", contentOwner: owner, canonical: true, priority: PRIORITY.caseStudy },
    { sourceId: "caseStudy:wedding", sourceType: "structured_data", sourcePath: "src/data/weddingResearch.ts", entityType: "project", entityId: "wedding", title: "Wedding AI research case study", contentOwner: owner, canonical: true, priority: PRIORITY.caseStudy },
    { sourceId: "caseStudy:claw-dev", sourceType: "structured_data", sourcePath: "src/data/clawdevCaseStudy.ts", entityType: "project", entityId: "claw-dev", title: "Claw Dev case study", contentOwner: owner, canonical: true, priority: PRIORITY.caseStudy, note: "에이전트 수 6 (about.ts 의 '5 Role-Based Agents' 와 충돌 — 케이스 스터디가 정본)" },
    { sourceId: "projectDetails:*", sourceType: "structured_data", sourcePath: "src/data/projectDetails.ts", entityType: "project", entityId: "armi|hangarae|wedding|claw-dev", title: "Project detail pages (role/techStack/architecture/troubleshooting/result)", contentOwner: owner, canonical: false, priority: PRIORITY.projectDetail, note: "troubleshooting 은 challenges.ts 를 공유" },
    { sourceId: "projects:*", sourceType: "structured_data", sourcePath: "src/data/projects.ts", entityType: "project", entityId: "armi|hangarae|wedding", title: "Home project cards", contentOwner: owner, canonical: false, priority: PRIORITY.projectCard, note: "요약본. 행가래 metrics 는 케이스 스터디와 동일 수치" },
    { sourceId: "devlog:docent", sourceType: "structured_data", sourcePath: "src/data/docentDevlog.ts", entityType: "devlog", entityId: "docent", title: "AI Docent devlog", contentOwner: owner, canonical: true, priority: PRIORITY.devlog },
    { sourceId: "about", sourceType: "structured_data", sourcePath: "src/data/about.ts", entityType: "profile", entityId: "profile", title: "About (profile/journey/focus/toolbox/awards)", contentOwner: owner, canonical: true, priority: PRIORITY.about, note: "'4 Major Projects' 문구는 케이스 스터디 4건(ARMI/행가래/Wedding/Claw Dev)과 일치; '5 Role-Based Agents' 는 Claw Dev 케이스 스터디(6)와 불일치" },
    { sourceId: "timeline", sourceType: "structured_data", sourcePath: "src/data/timeline.ts", entityType: "experience", entityId: "profile", title: "Journey timeline", contentOwner: owner, canonical: false, priority: PRIORITY.about },
    { sourceId: "skills", sourceType: "structured_data", sourcePath: "src/data/skills.ts", entityType: "skill", entityId: "skill:*", title: "Skills page (technology → usedIn)", contentOwner: owner, canonical: true, priority: PRIORITY.skills },
    { sourceId: "knowledge:*", sourceType: "markdown_note", sourcePath: "knowledge/<topic>.md", entityType: "knowledge", entityId: "knowledge:*", title: "Topic knowledge notes (8)", contentOwner: owner, canonical: true, priority: PRIORITY.knowledge, note: "ai-news-*/ai-tips-* 일일 노트는 제3자 요약이라 제외" },
  ];
}

export const EXCLUDED_SOURCES = [
  { sourcePath: "src/data/clawdevCaseStudy.ts (clawdevDebateScript)", reason: "예시 토론 대화 스크립트 — clawdevPhases 의 'discussion/reaction' 조각이 같은 사실을 서술 형태로 이미 담는다. 삽화용 대화문 자체는 근거로 인용할 사실이 아니다." },
  { sourcePath: "src/data/docentFallback.ts", reason: "생성 요약 + 폴백 답변. 근거가 아니라 폴백 출력이다." },
  { sourcePath: "knowledge/ai-news-*.md, knowledge/ai-tips-*.md", reason: "제3자 뉴스/팁 요약. 포트폴리오 사실이 아니다." },
  { sourcePath: "src/data/studyNotes.ts", reason: "노션 링크 인덱스. 본문이 없다." },
  { sourcePath: "src/components/**", reason: "UI 문구. 데이터 파일이 정본이다." },
  { sourcePath: "src/data/designPrompts.ts, lab.ts, floatingProjects.ts, videoSources.ts, navigation.ts", reason: "디자인/네비게이션 메타데이터. 사실 근거가 아니다." },
] as const;
