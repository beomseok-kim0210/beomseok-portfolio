export const aboutProfile = [
  { label: "Name", value: ["Kim Beomseok"] },
  { label: "Role", value: ["AI Product Engineer"] },
  { label: "Location", value: ["Seoul, Korea"] },
  { label: "Education", value: ["International Trade Major"] },
  { label: "Training", value: ["Prompt Engineering Bootcamp", "SSAFY 14th"] },
  {
    label: "Interests",
    value: ["AI Agent", "RAG & Retrieval", "Computer Vision"],
  },
  {
    label: "Current Focus",
    value: ["AI Coding Orchestration"],
  },
  { label: "Selected Work", value: ["Digital Docent · BCOS · ARMI"] },
  { label: "Awards", value: ["2 Awards"] },
] as const;

export const aboutSnapshot = [
  { value: "0.980", label: "Digital Docent Hit@5" },
  { value: "272/272", label: "BCOS Tests" },
  { value: "0.988", label: "행가래 mAP50 · Model Eval" },
  { value: "5", label: "3D Reconstruction Models Compared" },
  { value: "6", label: "Claw Dev Agent Roles" },
  { value: "1st", label: "SSAFY Project Competition" },
] as const;

export const aboutIntroduction =
  "국제통상을 전공한 뒤 Prompt Engineering Bootcamp와 SSAFY를 거쳐 AI 제품 엔지니어링으로 영역을 확장했습니다. 모델 자체보다 데이터에서 판단을 거쳐 시스템 행동까지 연결되는 구조를 설계하며, Agent·RAG·Computer Vision·실시간 백엔드를 배포와 평가까지 이어 왔습니다. 실험과 실패의 결과를 근거로 구조를 바꾸는 방식으로 개발합니다.";

export const aboutJourney = [
  {
    step: "Step 01",
    year: "2023",
    title: "Prompt Engineering Bootcamp",
    groups: [
      {
        label: "Core Skills",
        items: ["Python", "Stable Diffusion", "RAG", "Prompt Engineering"],
      },
      { label: "Project", items: ["Wedding Dress AI"] },
      { label: "Achievement", items: ["Best Project Award"] },
    ],
  },
  {
    step: "Step 02",
    year: "2024",
    title: "Generative AI Grand Prize",
    groups: [
      { label: "Achievement", items: ["Best Project Award"] },
      { label: "Focus", items: ["Generative AI", "Prompt-based Product Design"] },
    ],
  },
  {
    step: "Step 03",
    year: "2025",
    title: "SSAFY",
    groups: [
      { label: "Core Skills", items: ["Python", "Algorithms", "Django", "Vue"] },
      { label: "Projects", items: ["ARMI", "행가래"] },
    ],
  },
  {
    step: "Step 04",
    year: "2026",
    title: "ARMI",
    groups: [
      {
        label: "Core Skills",
        items: ["Voice AI", "STT/TTS", "State Machine", "WebSocket", "Real-time Systems"],
      },
      { label: "Project", items: ["Healthcare Bedside AI"] },
    ],
  },
  {
    step: "Step 05",
    year: "2026",
    title: "행가래",
    groups: [
      {
        label: "Core Skills",
        items: ["YOLO", "Pose Estimation", "Redis", "Three.js", "AIoT"],
      },
      {
        label: "Metrics",
        items: ["18 Keypoints", "54 Values / Frame", "mAP50 0.988 · Model Eval"],
      },
      { label: "Achievement", items: ["SSAFY Project Competition 1st"] },
    ],
  },
  {
    step: "Step 06",
    year: "2026",
    title: "Claw Dev → BCOS",
    groups: [
      {
        label: "Progression",
        items: ["6개 역할 협업", "Task / Session Orchestration", "RFC / ADR"],
      },
      { label: "BCOS v1", items: ["제품 범위 Done", "Tests 272/272"] },
    ],
  },
  {
    step: "Step 07",
    year: "2026",
    title: "Digital Docent · Crime Scene",
    groups: [
      {
        label: "Production",
        items: ["Hybrid RAG", "Korean Lip-sync", "Hit@5 0.980"],
      },
      {
        label: "Game System",
        items: ["Crime Scene V1", "Evidence-driven Progression"],
      },
    ],
  },
] as const;

export const aboutFocusAreas = [
  {
    title: "AI Agent & Tool Action",
    description: "요청을 구조화하고 도구 호출과 실제 시스템 행동으로 연결합니다.",
    technologies: ["LangGraph", "Qwen", "Tool Calling", "Agent Orchestration"],
    projects: ["ARMI", "Claw Dev"],
  },
  {
    title: "RAG & Evaluation",
    description: "하이브리드 검색을 서비스에 배포하고 Hit@k와 MRR로 평가합니다.",
    technologies: ["BM25", "Dense Embedding", "RRF", "Hit@k / MRR"],
    projects: ["Digital Docent"],
  },
  {
    title: "AI Dev Workflow",
    description: "역할과 세션을 분리하고 프로젝트가 작업 기록과 판단 근거를 소유하게 합니다.",
    technologies: ["Claude Code", "Codex", "Task Orchestration", "RFC / ADR"],
    projects: ["BCOS", "Claw Dev"],
  },
  {
    title: "Computer Vision",
    description: "모델 평가와 실패 분석을 실제 제품 방향과 실시간 파이프라인으로 연결합니다.",
    technologies: ["YOLO Pose", "Depth Camera", "Jetson Nano", "Stable Diffusion"],
    projects: ["행가래", "Wedding Dress AI"],
  },
] as const;

export const aboutCapabilities = [
  {
    title: "AI Agent / LLM",
    summary: "모델의 판단을 도구 선택과 시스템 행동으로 연결합니다.",
    items: [
      { name: "LangGraph", usedIn: ["ARMI"] },
      { name: "Tool Calling", usedIn: ["ARMI"] },
      { name: "Agent orchestration", usedIn: ["Claw Dev", "BCOS"] },
      { name: "Prompt / grounding", usedIn: ["Digital Docent", "Wedding Dress AI"] },
      { name: "Qwen", usedIn: ["ARMI"] },
    ],
  },
  {
    title: "RAG / Retrieval",
    summary: "검색 조합부터 정량 평가와 실패 시 fallback까지 설계합니다.",
    items: [
      { name: "BM25", usedIn: ["Digital Docent"] },
      { name: "Dense Embedding (text-embedding-3-small)", usedIn: ["Digital Docent"] },
      { name: "Hybrid Retrieval + RRF", usedIn: ["Digital Docent"] },
      { name: "Chroma", usedIn: ["ARMI"] },
      { name: "Retrieval evaluation — Hit@k / MRR", usedIn: ["Digital Docent"] },
    ],
  },
  {
    title: "Multi-Agent / AI Dev Workflow",
    summary: "작업·역할·세션 경계를 분리해 AI 개발 흐름을 관리합니다.",
    items: [
      { name: "Claude Code", usedIn: ["BCOS", "Claw Dev"] },
      { name: "Codex", usedIn: ["BCOS"] },
      { name: "Task / session orchestration", usedIn: ["BCOS"] },
      { name: "RFC / ADR", usedIn: ["BCOS"] },
      { name: "Gemini → Ollama fallback", usedIn: ["Claw Dev"] },
    ],
  },
  {
    title: "Backend / Realtime",
    summary: "AI 판단과 클라이언트·로봇 상태를 실시간 흐름으로 연결합니다.",
    items: [
      { name: "Spring Boot", usedIn: ["ARMI"] },
      { name: "Redis", usedIn: ["ARMI", "행가래"] },
      { name: "WebSocket / STOMP", usedIn: ["ARMI"] },
      { name: "gRPC", usedIn: ["ARMI"] },
      { name: "Django", usedIn: ["SSAFY"] },
      { name: "Next.js API routes / streaming", usedIn: ["Digital Docent"] },
    ],
  },
  {
    title: "Computer Vision",
    summary: "모델 비교와 실기기 최적화를 거쳐 시각 데이터를 제품 입력으로 바꿉니다.",
    items: [
      { name: "YOLO Pose / YOLOv11-M", usedIn: ["행가래"] },
      { name: "Depth camera", usedIn: ["행가래"] },
      { name: "Jetson Nano on-device", usedIn: ["행가래"] },
      {
        name: "3D human reconstruction — SMPL / PIFuHD / ICON / ECON / PaMIR",
        usedIn: ["Wedding Dress AI"],
      },
      { name: "Stable Diffusion", usedIn: ["Wedding Dress AI"] },
    ],
  },
  {
    title: "Frontend / 3D",
    summary: "AI의 상태와 결과를 웹·앱·3D 인터페이스에서 전달합니다.",
    items: [
      { name: "React", usedIn: ["행가래"] },
      { name: "Next.js", usedIn: ["Digital Docent", "Crime Scene"] },
      { name: "TypeScript", usedIn: ["Digital Docent", "BCOS", "Claw Dev", "Crime Scene"] },
      { name: "Vue", usedIn: ["SSAFY"] },
      { name: "Flutter", usedIn: ["ARMI"] },
      { name: "Three.js / React Three Fiber", usedIn: ["행가래", "Crime Scene", "Digital Docent"] },
    ],
  },
  {
    title: "Infra / Production",
    summary: "웹과 음성 워커를 실제 운영 환경에 배포합니다.",
    items: [
      { name: "Vercel", usedIn: ["Digital Docent"] },
      { name: "RunPod Serverless", usedIn: ["Digital Docent voice"] },
      { name: "Docker", usedIn: ["Digital Docent voice worker"] },
    ],
  },
] as const;

// 역량별 도구 목록을 title/items 형식으로 제공합니다.
export const aboutToolbox = aboutCapabilities.map((group) => ({
  title: group.title,
  items: group.items.map((item) => item.name),
}));

export const aboutAwards = [
  {
    title: "Generative AI Grand Prize",
    description: "Wedding Dress AI · 생성형 AI 활용 산업융합 프로젝트 최우수상",
  },
  {
    title: "SSAFY Project Competition 1st",
    description: "행가래 · SSAFY 프로젝트 대회 1위",
  },
] as const;

export const aboutExploration = [
  { title: "Hybrid RAG", status: "Production" },
  { title: "AI Coding Orchestration", status: "v1 Shipped" },
  { title: "Korean Lip-sync", status: "Production" },
  { title: "Crime Scene V2", status: "Planned" },
] as const;
