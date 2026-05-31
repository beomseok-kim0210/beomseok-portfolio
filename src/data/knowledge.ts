import type { KnowledgeCategory } from "@/types/portfolio";

export const knowledgeCategories: KnowledgeCategory[] = [
  {
    title: "Voice AI",
    description:
      "STT, TTS, 발화자 검증, 웨이크워드, 마이크 소유권 구조를 정리합니다.",
  },
  {
    title: "Prompt Engineering",
    description:
      "Few-shot, CoT, Role Prompting, 전문가 프롬프트 구조를 정리합니다.",
  },
  {
    title: "RAG",
    description: "검색, 임베딩, 벡터DB, 응답 품질 개선 방식을 정리합니다.",
  },
  {
    title: "Multi-Agent",
    description: "역할 분리, 에이전트 협업, 검증 루프를 정리합니다.",
  },
  {
    title: "Computer Vision",
    description:
      "YOLO, pose estimation, tracking point, 온디바이스 추론 구조를 정리합니다.",
  },
  {
    title: "MCP",
    description: "AI 도구 연결과 컨텍스트 관리 구조를 정리합니다.",
  },
  {
    title: "AI Search",
    description: "Tavily, Perplexity, 웹 검색 품질 개선 방식을 정리합니다.",
  },
  {
    title: "Agent Architecture",
    description: "AI Agent의 상태, 기억, 도구 사용 흐름을 정리합니다.",
  },
];
