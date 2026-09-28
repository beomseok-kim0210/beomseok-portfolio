import type { DocentPageContext } from "@/types/docent";

export interface DocentContextualHint {
  id: string;
  pathname: string;
  projectSlug: NonNullable<DocentPageContext["projectSlug"]>;
  sectionId: NonNullable<DocentPageContext["sectionId"]>;
  label: string;
  question: string;
  source: string;
}

/**
 * Authored prompts only. Facts in labels/questions are copied from canonical `src/data/**` data;
 * the LLM is never called merely to decide or write a suggestion.
 */
export const docentContextualHints: readonly DocentContextualHint[] = [
  {
    id: "hangarae-overview-dataset",
    pathname: "/projects/hangarae",
    projectSlug: "hangarae",
    sectionId: "overview",
    label: "66,950장에서 20,507장을 선별한 이유가 궁금하신가요?",
    question: "행가래에서 발 이미지 66,950장 중 20,507장을 선별한 기준과 이유를 설명해 주세요.",
    source: "src/data/hangaraeCaseStudy.ts:116",
  },
  {
    id: "hangarae-result-precision",
    pathname: "/projects/hangarae",
    projectSlug: "hangarae",
    sectionId: "result",
    label: "Precision을 0.447에서 0.982로 높인 과정을 볼까요?",
    question: "행가래에서 Precision을 0.447에서 0.982로 높인 과정을 설명해 주세요.",
    source: "src/data/hangaraeCaseStudy.ts:124",
  },
  {
    id: "hangarae-technology-keypoints",
    pathname: "/projects/hangarae",
    projectSlug: "hangarae",
    sectionId: "technology",
    label: "18개 keypoint를 어떻게 처리했는지 물어보세요.",
    question: "행가래에서 18개 keypoint의 3축 좌표를 어떻게 처리했나요?",
    source: "src/data/hangaraeCaseStudy.ts:269-276",
  },
  {
    id: "armi-architecture-reconnect",
    pathname: "/projects/armi",
    projectSlug: "armi",
    sectionId: "architecture",
    label: "재연결 뒤 활성 구독만 복원한 이유가 궁금하신가요?",
    question: "ARMI에서 connectionState와 subscriptionState를 분리하고 재연결 뒤 활성 구독만 복원한 이유를 설명해 주세요.",
    source: "src/data/armiCaseStudy.ts:146-156",
  },
  {
    id: "armi-technology-grpc",
    pathname: "/projects/armi",
    projectSlug: "armi",
    sectionId: "technology",
    label: "로봇 상태 이벤트에 gRPC를 쓴 흐름을 볼까요?",
    question: "ARMI가 gRPC로 로봇 상태 이벤트를 연결한 흐름을 설명해 주세요.",
    source: "src/data/armiCaseStudy.ts:238-245",
  },
] as const;

export function contextualHintFor(
  context: DocentPageContext,
): DocentContextualHint | null {
  if (!context.projectSlug || !context.sectionId) return null;
  return docentContextualHints.find(
    (hint) =>
      hint.pathname === context.pathname
      && hint.projectSlug === context.projectSlug
      && hint.sectionId === context.sectionId,
  ) ?? null;
}
