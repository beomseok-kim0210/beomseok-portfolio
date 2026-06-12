// src/data/clawdevCaseStudy.ts
// Claw Dev (claw-dev-lab) 멀티에이전트 오케스트레이션 워크스페이스 케이스 스터디 데이터.
// 모든 내용은 실제 레포(github.com/beomseok-kim0210/claw-dev-lab)의 코드/구조에 근거함.

export type ClawdevStat = {
  value: string;
  label: string;
  detail: string;
};

export const clawdevHero = {
  eyebrow: "Personal AI Lab",
  title: ["AI Agent는 혼자 답하는 도구가 아니라", "함께 일하는 팀이 될 수 있을까?"],
  premise:
    "Claw Dev는 6개 역할 에이전트가 하나의 채팅방에서 토론하고, 합의하고, 실제 코드를 생성한 뒤 서로의 코드를 리뷰하고, node·tsc·test로 직접 검증하고, 실패하면 스스로 수리하는 멀티에이전트 개발 워크스페이스입니다.",
  subPremise:
    "프롬프트 한 번으로 답을 받는 구조가 아니라, 소프트웨어 팀의 협업 과정 자체를 오케스트레이션으로 재현하는 것이 목표였습니다.",
  stats: [
    { value: "6", label: "Role Agents", detail: "PM + Backend·Frontend·AI·Infra·Test" },
    { value: "8", label: "Orchestration Phases", detail: "토론부터 자가 수리까지" },
    { value: "3", label: "Real Verify Tools", detail: "node --check · tsc · node --test" },
    { value: "100%", label: "Schema-Validated", detail: "모든 LLM 출력 Zod 검증" },
  ] satisfies ClawdevStat[],
};

// ─── 6 Role Agents ─────────────────────────────────────────────
export type ClawdevAgent = {
  id: string;
  role: string;
  tagline: string;
  objective: string;
  responsibilities: string[];
  constraints: string[];
  accent: string;
};

export const clawdevAgents: ClawdevAgent[] = [
  {
    id: "pm",
    role: "PM",
    tagline: "Orchestrator",
    objective: "요청을 해석해 MVP 범위를 정하고, 토론을 중재하며, 최종 결정과 리뷰 병목을 정리한다.",
    responsibilities: ["요청 해석 · MVP 범위 설정", "토론 중재 · 최종 의사결정", "리뷰 병목 우선순위화 (PM 개입)"],
    constraints: ["없는 기능을 임의로 만들지 않는다", "결정은 토론·근거에서만 도출한다"],
    accent: "#60A5FA",
  },
  {
    id: "backend",
    role: "Backend",
    tagline: "API · Data · State",
    objective: "백엔드 관점에서 API, 데이터 구조, 상태 관리의 핵심 주장을 정리한다.",
    responsibilities: ["API 구조 · 서버 엔트리포인트", "데이터 계약 (contracts)", "백엔드 코드 생성"],
    constraints: ["API 설계 최소 3개 이상 강제", "리스트에 없는 기능 발명 금지"],
    accent: "#34D399",
  },
  {
    id: "frontend",
    role: "Frontend",
    tagline: "Screen · Flow · UX",
    objective: "화면과 흐름을 설계하고 클라이언트 로직과 UX 리스크를 검토한다.",
    responsibilities: ["화면 · 플로우 설계", "정적 자산 · 클라이언트 로직", "UX 리뷰"],
    constraints: ["최소 항목 수 강제 (화면/플로우 ≥3)", "백엔드 계약 범위를 넘지 않는다"],
    accent: "#F472B6",
  },
  {
    id: "ai",
    role: "AI",
    tagline: "Domain Logic",
    objective: "추천·요약·분석 흐름과 도메인 로직을 설계하고 AI 리스크를 검토한다.",
    responsibilities: ["추천 · 요약 · 분석 흐름", "도메인 로직", "AI 리스크 리뷰"],
    constraints: ["판단 가능한 근거만 사용", "과장된 성능 주장 금지"],
    accent: "#A78BFA",
  },
  {
    id: "infra",
    role: "Infra",
    tagline: "Env · Deploy · Ops",
    objective: "환경 변수, 배포, 런타임/운영 문서를 정리하고 통합 리스크를 검토한다.",
    responsibilities: ["환경 변수 · 배포 · Docker", "런타임 · 운영 문서", "통합 리스크 리뷰"],
    constraints: ["외부 의존성은 명시적으로만", "배포 도메인은 사용자에게 확인"],
    accent: "#FBBF24",
  },
  {
    id: "test",
    role: "Test",
    tagline: "Quality Gate",
    objective: "테스트 전략을 세우고 스모크/계약 테스트를 작성하며 차단 이슈를 식별한다.",
    responsibilities: ["테스트 전략 수립", "스모크 · 계약 테스트 파일", "차단 이슈 · 품질 게이트 식별"],
    constraints: ["Blocking 발견 시 challenge로 표시", "검증 통과 전 합의 불가"],
    accent: "#22D3EE",
  },
];

// ─── Orchestration Phases ─────────────────────────────────────
export type ClawdevPhase = {
  key: string;
  label: string;
  actor: string;
  summary: string;
  detail: string;
  emits: string;
};

export const clawdevPhases: ClawdevPhase[] = [
  {
    key: "pm-initial",
    label: "PM Initial",
    actor: "PM",
    summary: "문제 정의 · MVP 목표 · 성공 기준",
    detail: "PM이 사용자 요청을 해석해 문제 진술, MVP 목표, 성공 기준을 먼저 고정합니다.",
    emits: "[pm.initial] problem framed · success criteria set",
  },
  {
    key: "discussion",
    label: "Free Discussion",
    actor: "5 Roles",
    summary: "해시 로테이션 순서 토론 · msg 상호 참조",
    detail: "5개 역할이 요청 문자열 해시(% 5) 순서로 발언하고, 이전 메시지를 msg-### ID로 참조하며 구조화된 주장을 만듭니다.",
    emits: "[discussion] 5 roles · cross-referenced via msg-id",
  },
  {
    key: "reaction",
    label: "Reaction Cycle",
    actor: "5 Roles",
    summary: "support · refine · challenge",
    detail: "각 에이전트는 자신이 아닌 이전 발언에 support/refine/challenge로 반응하고 position과 adjustment를 제시합니다.",
    emits: "[reaction] support · refine · challenge resolved",
  },
  {
    key: "clarification",
    label: "Clarification",
    actor: "Clarification Agent",
    summary: "외부 미지수만 질문 (설계 질문 금지)",
    detail: "API 키·OAuth·배포 도메인처럼 스스로 결정할 수 없는 외부 미지수만 묻습니다. 'API 몇 개?' 같은 설계 질문은 하지 않습니다.",
    emits: "[clarification] external unknowns only · ≤3 questions",
  },
  {
    key: "pm-final",
    label: "PM Final",
    actor: "PM",
    summary: "MVP 범위 · 비목표 · 전달 계획",
    detail: "PM이 토론과 답변을 종합해 MVP 범위, 명시적 비목표(non-goals), 전달 계획으로 확정합니다.",
    emits: "[pm.final] scope locked · non-goals declared",
  },
  {
    key: "spec",
    label: "Spec (Parallel)",
    actor: "5 Roles",
    summary: "5개 스펙 문서 동시 생성",
    detail: "backend·frontend·ai·infra·test 스펙 문서가 Promise.all로 병렬 생성됩니다. 각 스펙은 타입드 예제 코드를 포함합니다.",
    emits: "[spec] 5 docs generated in parallel",
  },
  {
    key: "implementation",
    label: "Implementation Plan",
    actor: "Planner",
    summary: "정확히 6개 task · 담당·인수기준",
    detail: "정확히 6개 task(task-##, 담당 역할, 목표, 산출물, 인수 기준)와 마일스톤, 킥오프 프롬프트를 생성합니다.",
    emits: "[plan] 6 tasks · owners · acceptance criteria",
  },
  {
    key: "coding",
    label: "Coding + Verify Loop",
    actor: "Owners + Reviewers",
    summary: "생성 → 리뷰 → 검증 → 수리",
    detail: "담당별 코드 생성 후 비-owner 역할이 리뷰하고, 실제 도구로 검증하고, 실패하면 PM 개입·재작성·자율 수리 루프로 이어집니다.",
    emits: "[coding] draft → review → verify → repair → ✓",
  },
];

// ─── Debate Transcript (대표 시나리오) ───────────────────────────
export type ClawdevDebateMessage = {
  msgId: string;
  speaker: string;
  role: string;
  content: string;
  refs?: string[];
  reaction?: "support" | "refine" | "challenge";
  accent: string;
};

export const clawdevDebateScript: ClawdevDebateMessage[] = [
  {
    msgId: "msg-001",
    speaker: "PM",
    role: "pm",
    content: "요청을 '재무 리포트 요약 대시보드'로 해석합니다. MVP는 데이터 수집 · 요약 · 단일 화면 표시로 한정합니다.",
    accent: "#60A5FA",
  },
  {
    msgId: "msg-002",
    speaker: "Backend",
    role: "backend",
    content: "수집 API, 요약 API, 조회 API 3개로 분리하고 응답 계약을 Zod로 고정하겠습니다.",
    refs: ["msg-001"],
    accent: "#34D399",
  },
  {
    msgId: "msg-003",
    speaker: "AI",
    role: "ai",
    content: "요약은 추출 단계와 생성 단계를 나눠야 환각을 줄일 수 있습니다. Backend 요약 API에 근거 필드를 추가하죠.",
    refs: ["msg-002"],
    reaction: "refine",
    accent: "#A78BFA",
  },
  {
    msgId: "msg-004",
    speaker: "Test",
    role: "test",
    content: "Blocking: 외부 재무 API 키가 없으면 수집 API 계약 검증이 불가합니다. 클러리피케이션이 필요합니다.",
    refs: ["msg-002"],
    reaction: "challenge",
    accent: "#22D3EE",
  },
  {
    msgId: "msg-005",
    speaker: "Frontend",
    role: "frontend",
    content: "단일 화면에 요약 카드 + 근거 토글을 두면 AI가 제안한 근거 필드를 그대로 노출할 수 있습니다. 동의합니다.",
    refs: ["msg-003"],
    reaction: "support",
    accent: "#F472B6",
  },
  {
    msgId: "msg-006",
    speaker: "PM",
    role: "pm",
    content: "Test의 차단 이슈를 우선 처리합니다. 외부 API 키만 사용자에게 확인하고, 근거 필드는 채택해 스펙에 반영합니다.",
    refs: ["msg-004", "msg-003"],
    accent: "#60A5FA",
  },
];

// ─── Verification & Review Loop ───────────────────────────────
export type ClawdevVerifyCheck = {
  name: string;
  command: string;
  status: "passed" | "failed" | "skipped";
  summary: string;
};

export type ClawdevReviewRound = {
  round: string;
  title: string;
  reviewer: string;
  reaction: "support" | "refine" | "challenge";
  note: string;
  checks: ClawdevVerifyCheck[];
  outcome: string;
};

export const clawdevReviewRounds: ClawdevReviewRound[] = [
  {
    round: "Round 1",
    title: "초안 생성 후 첫 검증",
    reviewer: "Test",
    reaction: "challenge",
    note: "Blocking: server.js가 라우트 등록 전에 listen을 호출합니다.",
    checks: [
      { name: "Syntax", command: "node --check", status: "passed", summary: "구문 통과" },
      { name: "Types", command: "tsc --noEmit", status: "passed", summary: "타입 통과 (외부 타입은 warning)" },
      { name: "Tests", command: "node --test", status: "failed", summary: "smoke 테스트 1건 실패" },
    ],
    outcome: "검증 실패 → PM 개입 → owner(backend) 재작성",
  },
  {
    round: "Round 2",
    title: "재작성 후 부분 재검증",
    reviewer: "Backend",
    reaction: "refine",
    note: "Follow-up: 라우트 등록 순서 수정, 에러 핸들러 추가.",
    checks: [
      { name: "Syntax", command: "node --check", status: "passed", summary: "구문 통과" },
      { name: "Types", command: "tsc --noEmit", status: "passed", summary: "타입 통과" },
      { name: "Tests", command: "node --test", status: "passed", summary: "smoke 테스트 통과" },
    ],
    outcome: "전원 support + 검증 실패 0 → 루프 종료 ✓",
  },
];

export const clawdevRepairInference = [
  { pattern: "public/*", owner: "Frontend", reason: "정적 자산 · 클라이언트 경로" },
  { pattern: "src/server*", owner: "Backend", reason: "서버 엔트리포인트" },
  { pattern: "*.test.mjs", owner: "Test", reason: "테스트 파일" },
  { pattern: "Dockerfile · .env", owner: "Infra", reason: "배포 · 환경" },
];

export const clawdevLoopMeta = {
  reviewRounds: "MAX_CODE_REVIEW_ROUNDS = 2",
  repairCycles: "MAX_AUTONOMOUS_REPAIR_CYCLES = 3",
  stall: "한 사이클에서 변경 파일이 없으면 stall로 종료",
};

// ─── Schema-First Retry (자가교정 터미널) ──────────────────────
export type ClawdevRetryFrame = {
  label: string;
  tone: "error" | "system" | "success";
  lines: string[];
};

export const clawdevSchemaRetry: ClawdevRetryFrame[] = [
  {
    label: "Attempt 1 — invalid",
    tone: "error",
    lines: [
      "{",
      '  "apis": "수집, 요약, 조회",   // ✗ expected array',
      '  "dataModels": []             // ✗ min 3 required',
      "}",
      "ZodError: apis (expected array) · dataModels (min 3)",
    ],
  },
  {
    label: "Re-prompt",
    tone: "system",
    lines: [
      "> The previous response was invalid.",
      "> apis: expected array, received string",
      "> dataModels: array must contain at least 3 item(s)",
      "> Return JSON that matches the schema.",
    ],
  },
  {
    label: "Attempt 2 — valid",
    tone: "success",
    lines: [
      "{",
      '  "apis": ["collect", "summarize", "query"],',
      '  "dataModels": ["Report", "Summary", "Source"]',
      "}",
      "✓ parsed · Zod validation passed",
    ],
  },
];

export const clawdevRetryMeta = {
  client: "OllamaClient · /api/chat · format: json",
  extract: "extractJson() — <think>…</think> · ```json 펜스 제거",
  retries: "최대 3회 재시도, 매 실패마다 검증 에러로 재프롬프트",
};

// ─── Model Profiles (단계 × 파라미터) ─────────────────────────
export type ClawdevModelProfile = {
  stage: string;
  temperature: number;
  numPredict: number;
  note: string;
  highlight?: boolean;
};

// qwen3.5 기준 실값
export const clawdevModelProfiles: ClawdevModelProfile[] = [
  { stage: "pm-initial", temperature: 0.18, numPredict: 720, note: "범위 설정 · 약간의 발산 허용" },
  { stage: "discussion", temperature: 0.12, numPredict: 640, note: "역할 주장 · 절제된 다양성" },
  { stage: "clarification", temperature: 0.1, numPredict: 480, note: "질문 최소화 · 보수적" },
  { stage: "spec", temperature: 0.1, numPredict: 920, note: "스펙 문서 · 일관성 우선" },
  { stage: "code-review", temperature: 0.08, numPredict: 960, note: "리뷰 · 낮은 온도로 정확도" },
  { stage: "codegen", temperature: 0.05, numPredict: 3200, note: "코드 생성 · 최저 온도 · 최대 토큰", highlight: true },
];

export const clawdevModelMeta = {
  families: ["qwen / qwen-coder", "deepseek", "llama", "gemma", "mistral", "generic"],
  resolver: "resolveGenerationProfile(model, stage) — 모델군 감지 후 단계 프로파일에 패밀리 오버라이드 적용",
};

// ─── Resilience (LLM 폴백) ─────────────────────────────────────
export const clawdevResilience = {
  primary: { name: "Gemini", sub: "@google/genai · primary" },
  fallback: { name: "Ollama", sub: "qwen3.5 · local fallback" },
  triggers: ["3연속 실패", "quota", "429", "rate limit", "billing"],
  behavior:
    "FallbackLLMClient가 primary 호출을 시도하다 quota/rate-limit을 감지하거나 3연속 실패하면 이후 모든 호출을 로컬 Ollama로 라우팅하고 onFallback 콜백을 발생시킵니다.",
};

// ─── Project Memory ───────────────────────────────────────────
export const clawdevMemory = {
  path: "<target>/.multi-agent/project-memory.json",
  fields: [
    { label: "Recent Requests", detail: "최근 요청 목록" },
    { label: "Last Build Brief", detail: "직전 빌드 브리프" },
    { label: "Workspace Index", detail: "워크스페이스 파일 인덱스" },
    { label: "Unresolved Findings", detail: "미해결 리뷰 발견 사항" },
  ],
  continueMode:
    "동일 타깃 폴더에 재실행하면 기존 파일을 읽어 continue 모드로 진입하고, 역할별로 스코프된 이전 상태를 각 에이전트 컨텍스트에 주입합니다. (벡터 DB 아님 — 파일 기반)",
};

// ─── Dual Interface ───────────────────────────────────────────
export const clawdevInterfaces = {
  shared: "MultiAgentOrchestrator",
  hooks: ["onMessage", "onPhase", "onArtifacts", "onCodeActivity", "onClarificationRequest"],
  nodes: [
    {
      name: "Ink CLI",
      stack: "ink + React 19",
      detail: "터미널 인터랙티브 UI. tsx로 즉시 실행.",
    },
    {
      name: "Web (SSE)",
      stack: "raw Node http + vanilla JS",
      detail: "Express 없이 순수 http 서버. SSE로 실시간 이벤트 스트리밍.",
    },
  ],
};

// ─── Results & Limitations ────────────────────────────────────
export const clawdevResults: ClawdevStat[] = [
  { value: "Real", label: "Verification", detail: "데모가 아니라 node·tsc·test를 실제 실행해 통과 여부로 루프를 돈다" },
  { value: "2-Stage", label: "Code Gen", detail: "파일 플랜 → 파일별 생성, 이전 파일을 컨텍스트로 누적해 교차 참조 유지" },
  { value: "Graceful", label: "Degradation", detail: "Gemini→Ollama 폴백 · LLM리뷰→휴리스틱 폴백으로 끊기지 않는다" },
];

export const clawdevLimitations = [
  "긴 E2E 실행은 qwen3.5 로컬 추론 지연이 병목입니다.",
  "일부 로직은 여전히 휴리스틱 폴백에 의존합니다.",
  "프로젝트 메모리는 파일 기반이라 팀 규모의 장기 저장에는 한계가 있습니다.",
  "생성 코드 품질은 요청 복잡도와 모델에 따라 편차가 있습니다.",
];

// ─── Tech Stack ───────────────────────────────────────────────
export type ClawdevTechGroup = {
  label: string;
  items: string[];
};

export const clawdevTechGroups: ClawdevTechGroup[] = [
  { label: "Runtime", items: ["TypeScript", "Node 22", "tsx", "ESM"] },
  { label: "LLM", items: ["Ollama (qwen3.5)", "Google Gemini", "Fallback Client"] },
  { label: "Validation", items: ["Zod v4", "Structured Generation", "Self-correcting Retry"] },
  { label: "CLI", items: ["ink", "ink-text-input", "React 19", "picocolors"] },
  { label: "Web", items: ["raw http", "SSE", "vanilla JS", "dotenv"] },
];
