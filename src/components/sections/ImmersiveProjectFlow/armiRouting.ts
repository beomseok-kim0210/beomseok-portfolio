import type { Point } from "./geometry";

// Editorial projection coordinates, not runtime state or measured telemetry.
export const routingAnchors: readonly Point[] = [
  [520, 295], [615, 310], [710, 325], [790, 350], [875, 380],
  [950, 300], [1040, 370], [1130, 265], [1235, 185], [1360, 380],
  [1240, 555], [855, 620], [980, 655], [1120, 710],
];

export const systemRoutes = {
  input: "M410 250 L470 250 L520 295 L710 325 L790 350 L875 380",
  response: "M875 380 L950 300 L1130 265 L1235 185 L1410 155 L1580 70",
  search: "M875 380 L1040 370 L1220 350 L1360 380 L1610 330",
  robot: "M875 380 L1040 370 L1135 450 L1240 555 L1580 675",
  memory: "M875 380 L930 465 L1120 710 L980 655 L855 620 L795 505 L875 380",
} as const;

export const systemLabels = [
  { name: "VOICE", detail: "음성 요청", x: 492, y: 234 },
  { name: "STT", detail: "음성 → 텍스트", x: 678, y: 278 },
  { name: "LANGGRAPH", detail: "REQUEST ROUTING", x: 918, y: 399, hub: true },
  { name: "RESPONSE", detail: "텍스트 답변", x: 1235, y: 117, branch: "response" },
  { name: "SEARCH", detail: "Tavily 검색", x: 1260, y: 306, branch: "search" },
  { name: "ROBOT ACTION", detail: "가능한 행동 분기", x: 1240, y: 580, branch: "robot" },
  { name: "REDIS", detail: "원문 · 실시간 상태", x: 790, y: 646, branch: "memory" },
  { name: "CHROMA", detail: "장기 기억 의미 검색", x: 1010, y: 705, branch: "memory" },
] as const;
