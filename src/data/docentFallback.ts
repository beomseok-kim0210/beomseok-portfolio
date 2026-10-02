import type { DocentEmotion } from "@/types/docent";

export interface DocentFallbackEntry {
  keywords: string[];
  emotion: DocentEmotion;
  answer: string;
  answerEn?: string;
}

export const docentFallbackEntries: DocentFallbackEntry[] = [
  {
    keywords: ["누구", "소개", "자기소개", "who", "yourself", "introduce", "about you", "범석"],
    emotion: "smile",
    answer:
      "안녕하세요. 김범석의 포트폴리오를 안내하는 AI 도슨트입니다. 범석 님은 국제통상 전공에서 출발해 Prompt Engineering Bootcamp와 SSAFY를 거쳐 AI 제품 엔지니어링으로 영역을 확장했습니다. 데이터에서 판단을 거쳐 시스템 행동까지 연결하는 구조를 설계하며, 배포와 평가까지 이어 왔습니다.",
    answerEn:
      "Hello! I'm the AI docent for Beomseok Kim's portfolio. He moved from International Trade into AI product engineering through a Prompt Engineering Bootcamp and SSAFY. He designs systems that connect data, decisions, and actions, then deploys and evaluates them.",
  },
  {
    keywords: ["프로젝트", "만들었", "작품", "projects", "built", "portfolio", "works", "bcos", "crime scene", "crime-scene", "크라임"],
    emotion: "smile",
    answer:
      "공개 프로젝트는 Digital Docent(하이브리드 RAG 포트폴리오 안내), BCOS(작업·세션 중심 AI 코딩 오케스트레이션), ARMI(병상 환자 AI 에이전트), Crime Scene(3D 탐색·AI 심문 추리 게임), 행가래(재활 운동 자세 분석), Claw Dev(역할 기반 멀티에이전트 개발 도구), Wedding Dress AI(드레스 착용 이미지 생성)입니다.",
    answerEn:
      "Public projects: Digital Docent (hybrid RAG portfolio guide), BCOS (task and session AI coding orchestration), ARMI (bedside AI agent), Crime Scene (3D investigation and AI interrogation game), Hangarae (rehab exercise pose analysis), Claw Dev (role-based multi-agent development tool), and Wedding Dress AI (dress try-on image generation).",
  },
  {
    keywords: ["armi", "아르미", "병실", "간호", "음성", "voice", "healthcare", "hospital"],
    emotion: "smile",
    answer:
      "ARMI는 병상 환자의 음성·텍스트 요청을 Qwen 30B 기반 LangGraph 에이전트가 답변·로봇 동작·검색·기억 조회로 연결하는 팀 프로젝트입니다. 범석 님은 에이전트 라우팅과 구조화 출력, Tavily 검색, Redis·Chroma 기억 흐름, 환자·의료진·Watch UI와 음성 상태 흐름을 담당했습니다.",
    answerEn:
      "ARMI is a team project using a Qwen 30B LangGraph agent to route bedside voice or text requests to answers, robot actions, search, or memory retrieval. Beomseok handled agent routing, structured output, Tavily search, Redis/Chroma memory, patient/staff/Watch UIs, and voice state flows.",
  },
  {
    keywords: ["행가래", "hangarae", "재활", "운동", "요로", "비전", "yolo", "rehab", "pose"],
    emotion: "smile",
    answer:
      "행가래는 YOLO Pose와 뎁스 카메라로 재활 운동 자세를 분석하는 팀 프로젝트로, SSAFY 프로젝트 대회 1위를 수상했습니다. 범석 님은 실시간 피드백 UI·Three.js 시각화와 발 이미지 20,507장 선별·라벨링, YOLOv11-M 파인튜닝을 담당했습니다. 모델 평가 Precision은 0.447에서 0.982로 개선됐습니다.",
    answerEn:
      "Hangarae is a team project analyzing rehab exercise poses with YOLO Pose and a depth camera. It won 1st place in the SSAFY Project Competition. Beomseok handled realtime feedback UI, Three.js visualization, selection and labeling of 20,507 foot images, and YOLOv11-M fine-tuning. Model evaluation precision improved from 0.447 to 0.982.",
  },
  {
    keywords: ["wedding", "웨딩", "드레스", "dress", "생성형", "stable diffusion"],
    emotion: "smile",
    answer:
      "Wedding Dress AI는 드레스 착용 이미지 생성을 탐구한 팀 프로젝트로, 생성형 AI 활용 산업융합 프로젝트 최우수상을 받았습니다. 범석 님은 3D 인체 복원 모델을 비교하고 드레스 형상 복원의 한계를 분석한 뒤, Stable Diffusion 생성과 전문가 역할 기반 프롬프트 구조로 방향을 전환했습니다.",
    answerEn:
      "Wedding Dress AI is a team project exploring dress try-on image generation. It received the Best Project Award in the Generative AI Industrial Convergence Project. Beomseok compared 3D human reconstruction models, analyzed their limits with dress geometry, and pivoted to Stable Diffusion generation with expert role-based prompts.",
  },
  {
    keywords: ["claw", "클로", "mcp", "멀티에이전트", "multi-agent", "agent", "에이전트"],
    emotion: "smile",
    answer:
      "Claw Dev는 PM·Backend·Frontend·AI·Infra·Test의 6개 역할이 협업하는 개인 개발 도구 프로젝트입니다. 동적 토론, Zod 스키마 검증, 실제 도구 검사와 최대 3회 자동 수정 루프, Gemini→Ollama 폴백을 구현했습니다. 이 프로젝트의 한계를 바탕으로 작업·세션 중심의 BCOS로 발전시켰습니다.",
    answerEn:
      "Claw Dev is a solo development tool with six roles: PM, Backend, Frontend, AI, Infra, and Test. It implements dynamic discussion, Zod schema validation, real tool checks, up to three repair attempts, and Gemini-to-Ollama fallback. Its limitations led to BCOS's task and session orchestration.",
  },
  {
    keywords: ["기술", "스택", "스킬", "skills", "tech", "stack", "다루"],
    emotion: "neutral",
    answer:
      "역량은 AI Agent / LLM(LangGraph·Qwen·Tool Calling), RAG / Retrieval(BM25·Dense Embedding·RRF·Chroma·검색 평가), Multi-Agent / AI Dev Workflow(Claude Code·Codex·작업·세션 오케스트레이션), Backend / Realtime(Spring Boot·Redis·WebSocket·gRPC), Computer Vision(YOLO·뎁스 카메라·Jetson Nano·Stable Diffusion), Frontend / 3D(React·Next.js·Flutter·Three.js), Infra / Production(Vercel·RunPod Serverless·Docker)로 나뉩니다.",
    answerEn:
      "Capability groups: AI Agent / LLM (LangGraph, Qwen, tool calling); RAG / Retrieval (BM25, dense embeddings, RRF, Chroma, retrieval evaluation); Multi-Agent / AI Dev Workflow (Claude Code, Codex, task/session orchestration); Backend / Realtime (Spring Boot, Redis, WebSocket, gRPC); Computer Vision (YOLO, depth cameras, Jetson Nano, Stable Diffusion); Frontend / 3D (React, Next.js, Flutter, Three.js); Infra / Production (Vercel, RunPod Serverless, Docker).",
  },
  {
    keywords: ["수상", "award", "prize", "우승", "1위", "1등"],
    emotion: "smile",
    answer:
      "Wedding Dress AI로 생성형 AI 활용 산업융합 프로젝트 최우수상을 받았고, 행가래로 SSAFY 프로젝트 대회 1위를 수상했습니다.",
    answerEn:
      "Wedding Dress AI received the Best Project Award in the Generative AI Industrial Convergence Project. Hangarae received 1st place in the SSAFY Project Competition.",
  },
  {
    keywords: ["ssafy", "싸피", "교육", "부트캠프", "bootcamp", "전공", "배경", "background", "여정"],
    emotion: "neutral",
    answer:
      "범석 님은 국제통상을 전공했습니다. 2023년 Prompt Engineering Bootcamp에서 Python·Stable Diffusion·RAG를 익히며 Wedding Dress AI를 만들었고, 이후 SSAFY 14기에서 알고리즘·Django·Vue를 학습하며 ARMI와 행가래를 개발했습니다. 현재는 AI 제품의 구조 설계와 배포·평가에 집중하고 있습니다.",
    answerEn:
      "Beomseok majored in International Trade. He learned Python, Stable Diffusion, and RAG while building Wedding Dress AI at a Prompt Engineering Bootcamp in 2023, then studied algorithms, Django, and Vue at SSAFY's 14th cohort while developing ARMI and Hangarae. He now focuses on AI product architecture, deployment, and evaluation.",
  },
  {
    keywords: ["연락", "이메일", "컨택", "contact", "email", "채용", "hire", "협업"],
    emotion: "smile",
    answer:
      "협업이나 채용 관련 연락은 이 사이트의 Contact 섹션을 통해 남겨 주세요. 포트폴리오 하단에서 연락처와 링크를 확인할 수 있습니다.",
    answerEn:
      "For collaboration or hiring inquiries, please use the Contact section at the bottom of this site.",
  },
  {
    keywords: ["아바타", "avatar", "얼굴", "3d", "도슨트", "docent", "gnm", "이 사이트", "어떻게 만들", "digital docent", "디지털 도슨트", "ai-docent"],
    emotion: "surprised",
    answer:
      "Digital Docent는 페이지를 이동해도 대화를 유지하는 포트폴리오 AI 안내입니다. 운영 환경에 BM25·Dense Embedding·RRF 하이브리드 RAG를 배포했고, 임베딩 실패 시 BM25로 전환합니다. Supertonic TTS·LAM과 한국어 립싱크를 연결해 웹은 Vercel, 음성은 RunPod Serverless에서 운영합니다. 지금은 준비된 답변을 안내하고 있습니다.",
    answerEn:
      "Digital Docent is a portfolio AI guide that preserves conversations across pages. Production uses BM25, dense embeddings, and RRF hybrid RAG, with BM25 fallback when embeddings fail. Supertonic TTS, LAM, and Korean lip-sync connect the Vercel web app to RunPod Serverless voice workers. I'm currently providing prepared answers.",
  },
  {
    keywords: ["관심", "요즘", "최근", "interest", "focus", "공부", "learning"],
    emotion: "thinking",
    answer:
      "현재 관심 분야는 AI Agent, RAG & Retrieval, AI 코딩 오케스트레이션, Computer Vision입니다. 요청을 시스템 행동으로 연결하는 에이전트, 검색 품질 평가, 작업·세션 경계 설계, 시각 데이터의 실시간 처리에 집중하고 있습니다.",
    answerEn:
      "Current focus: AI Agent, RAG & Retrieval, AI coding orchestration, and Computer Vision. He works on agents that connect requests to system actions, retrieval evaluation, task/session boundaries, and realtime visual data processing.",
  },
  {
    keywords: ["지식", "뉴스", "knowledge", "노트", "블로그", "정리"],
    emotion: "neutral",
    answer:
      "Knowledge 섹션에서 RAG, 멀티에이전트, 음성 AI, Computer Vision, 프롬프트 엔지니어링 학습 노트를 확인할 수 있습니다. 검색·에이전트 협업·실시간 처리 구조를 주제별로 정리했습니다.",
    answerEn:
      "The Knowledge section contains learning notes on RAG, multi-agent systems, voice AI, Computer Vision, and prompt engineering, organized around retrieval, agent collaboration, and realtime processing.",
  },
];

export const docentFallbackDefault = {
  emotion: "thinking" as DocentEmotion,
  answer:
    "그 질문에 맞는 준비된 답변은 없습니다. Digital Docent, BCOS, ARMI, Crime Scene, 행가래, Claw Dev, Wedding Dress AI와 기술 역량, 수상 경력, 성장 여정에 대해 물어보실 수 있습니다.",
  answerEn:
    "I don't have a prepared answer for that. You can ask about Digital Docent, BCOS, ARMI, Crime Scene, Hangarae, Claw Dev, Wedding Dress AI, capabilities, awards, or Beomseok's background.",
};
