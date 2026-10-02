import type { Project } from "@/types/portfolio";

export const projects: Project[] = [
  {
    key: "armi",
    name: "ARMI",
    label: "Healthcare AI",
    headline: "그래서 우리는\nARMI를 만들었습니다.",
    description:
      "팀은 음성·텍스트 요청을 Spring Boot와 Qwen 30B LangGraph Agent를 거쳐 로봇·태블릿·Watch에 연결했습니다. 저는 Agent 라우팅·구조화 출력·기억 흐름과 환자 앱·의료진 웹·Watch UI, 음성 상태 흐름을 맡았습니다.",
    background: "#07111F",
    foreground: "text-white",
    muted: "text-slate-300",
    core: "병실에서\nAI는 어디까지\n사람을 도울 수 있을까?",
    sections: ["Voice AI", "Robot State", "Realtime UX", "Care Workflow"],
    points: ["Voice AI", "Robot State", "Realtime UX", "Care Workflow"],
    role: "개인: Qwen 30B Agent 라우팅·Tool Calling·Tavily·Redis/Chroma 기억 흐름·클라이언트 UI·음성 상태 / 팀: 서버·로봇·태블릿·Watch 연동",
    technologies: [
      "Flutter",
      "Android Native",
      "SpeechRecognizer",
      "AudioRecord",
      "Sherpa-ONNX (KWS 전환 검토·중단)",
      "CAMPPlus",
      "MethodChannel",
      "STOMP WebSocket",
      "Spring Boot",
      "gRPC",
      "WearOS",
      "Kotlin",
      "AI Agent",
      "LangGraph",
      "Tool Calling",
      "Qwen 30B",
      "Redis",
      "Chroma",
      "Tavily",
    ],
    productCards: [
      {
        title: "Voice AI",
        description:
          "STT, 웨이크워드, 발화자 검증, TTS가 마이크와 상태 전환을 공유하는 구조에서 환자 중심 음성 인터페이스를 설계했습니다.",
        keywords: [
          "Android SpeechRecognizer",
          "AudioRecord",
          "Sherpa-ONNX (KWS 전환 검토·중단)",
          "CAMPPlus",
          "MethodChannel",
        ],
      },
      {
        title: "Robot State",
        description:
          "제어 PC의 로봇 상태를 백엔드와 태블릿으로 전달하기 위해 gRPC, WebSocket, 상태 이벤트 흐름을 연결했습니다.",
        keywords: ["gRPC", "STOMP WebSocket", "Spring Boot", "Flutter", "Realtime State"],
      },
      {
        title: "Realtime UX",
        description:
          "환자 요청, AI 응답, 미션 상태, 간호사 호출 이벤트가 끊기지 않도록 connection state와 subscription state를 분리했습니다.",
        keywords: ["Reconnect", "Resubscribe", "Topic Subscription", "Session Topic", "Event Recovery"],
      },
      {
        title: "Care Workflow",
        description:
          "환자 태블릿, 의료진 웹, Galaxy Watch를 연결해 긴급 호출이 필요한 강도로 필요한 사람에게 전달되도록 설계했습니다.",
        keywords: ["WearOS", "Kotlin", "Notification", "Polling", "FCM Review", "Urgency UX"],
      },
      {
        title: "Agent Decision & Memory",
        description:
          "Qwen 30B LangGraph StateGraph의 구조화 출력을 Text Answer / Robot Action / Tavily Search / Memory Retrieval로 분기했습니다. Redis는 빠른 원문·실시간 상태 조회, Chroma는 중요 내용의 장기 기억 의미 검색을 맡습니다. 기억 질문은 Chroma 검색 뒤 Redis 원문을 재조회해 답변합니다.",
        keywords: ["Qwen 30B", "LangGraph", "Tool Calling", "Tavily", "Redis", "Chroma"],
      },
    ],
    impact:
      "명령 인식, 상태 전달, 알림 우선순위를 하나의 돌봄 경험으로 연결했습니다.",
    theme: "dark",
  },
  {
    key: "hangarae",
    name: "행가래",
    label: "Rehabilitation AI",
    headline: "재활 동작을 게임처럼 바꾸고,\n움직임이 즉시 피드백으로 돌아오게 했습니다.",
    description:
      "팀은 YOLO Pose + Depth·Jetson Nano·Redis로 자세 좌표를 게임 피드백에 연결했습니다. 저는 발 데이터 선별·라벨링과 모델 fine-tuning·성능 분석에 참여하고 React·Three.js UI·게이미피케이션을 구현했습니다.",
    background: "#F7FFFB",
    foreground: "text-[#111827]",
    muted: "text-slate-600",
    core: "운동은 했지만,\n정말 올바르게\n움직인 걸까?",
    sections: ["Gamification", "AI × 3D", "Elderly UX", "On-device AI"],
    points: ["데이터 선별·수동 라벨링", "YOLOv11-M Fine-tuning", "React·Three.js 피드백", "온디바이스 성능 분석"],
    identity: "AIoT 재활 보조 시스템 — 발 포인트 모델·실시간 3D 피드백",
    role: "개인: 20,507장 데이터 선별·수동 라벨링·YOLOv11-M fine-tuning·온디바이스 모델 선택·성능 분석·React/Three.js UI·게임화 / 팀: YOLO Pose + Depth·Jetson·Redis 자세 분석 연동",
    award: "SSAFY 프로젝트 대회 1위 수상",
    technologies: ["Claude", "Blender MCP", "YOLOv11-M", "MMPOSE", "Jetson Nano", "LLM Report", "React", "Three.js", "YOLO Pose", "Depth Camera", "Redis", "Manual Labeling", "Fine-tuning"],
    productCards: [
      {
        title: "Gamification Frontend",
        description:
          "재활 동작을 미션처럼 표현하고, 성공 시 시각적 보상을 제공해 운동보다 게임처럼 느끼도록 설계했습니다.",
      },
      {
        title: "AI × 3D Feedback",
        description:
          "Claude와 Blender를 MCP로 연동하고, 포즈 인식 결과가 3D 환경의 반응으로 이어지는 흐름을 구성했습니다.",
      },
      {
        title: "Elderly-Friendly UX",
        description:
          "노년층과 재활 환자가 직관적으로 이해할 수 있도록 동작, 반응, 피드백 흐름을 단순하게 설계했습니다.",
      },
      {
        title: "On-device AI",
        description:
          "20,507장 발 데이터를 선별·수동 라벨링하고 YOLOv11-M을 fine-tuning했습니다. Jetson Nano 온디바이스 모델 선택·성능 분석에도 참여했습니다.",
      },
      {
        title: "Latest-state Coordinates",
        description:
          "YOLO Pose + Depth의 18 keypoints·프레임당 54개 x/y/z 좌표를 처리했습니다. depth jitter를 완충하고 Redis 전송·웹 렌더에서 과거 프레임 큐 누적을 제거해 timestamp 기준 최신 좌표를 우선했습니다.",
      },
    ],
    metrics: [
      { label: "모델 평가 지표 · Precision", before: "0.447", after: "0.982", caption: "발 포인트 인식 정확도 · 재학습 전후" },
      { label: "모델 평가 지표 · mAP50", before: "0.872", after: "0.988", caption: "YOLOv11-M 재학습 전후" },
      { label: "모델 평가 지표 · mAP50-95", before: "0.747", after: "0.925", caption: "YOLOv11-M 재학습 전후" },
      { label: "Labeled Foot Data", after: "20,507", caption: "직접 선별·수동 라벨링한 이미지" },
      { label: "Realtime Pipeline", after: "약 30 FPS", caption: "Jetson Nano 추론·Depth·Redis·웹 피드백 파이프라인" },
    ],
    impact:
      "발 포인트 인식 정확도(모델 평가 지표)를 개선하고 최신 자세를 게임 피드백에 연결했습니다. 팀 프로젝트는 SSAFY 프로젝트 대회 1위를 수상했습니다.",
    theme: "mint",
  },
  {
    key: "wedding",
    name: "Wedding Dress AI",
    label: "Choice Intelligence",
    headline: "AI를 현실 재현 기술이 아니라\n의사결정을 돕는 비교 도구로 설계했습니다.",
    description:
      "SMPL·PIFuHD·ICON·ECON·PaMIR의 인체 복원 가정과 큰 드레스 부피 표현 한계를 분석하고, Stable Diffusion 생성·전문가 역할 프롬프트·옵션 비교로 전환한 팀 프로젝트입니다.",
    background: "#FFF9F8",
    foreground: "text-[#111827]",
    muted: "text-slate-600",
    core: "사람은\n자신에게 가장 어울리는 선택을\n얼마나 알고 있을까?",
    sections: ["Problem Definition", "AI Design", "Product Judgment", "Award"],
    points: ["5~8만 원", "Prompt Engineering", "Expert AI", "최우수상"],
    identity: "생성형 AI 기반 웨딩드레스 가상 피팅 서비스",
    role: "개인: 3D 후보 검토·환경 검증·실패 원인 분석·문제 재정의·SD 전환·프롬프트 구조 설계 / 팀: 얼굴 사진·스타일 텍스트 기반 이미지 생성·비교 결과 구현",
    award: "생성형 AI 활용 산업융합 프로젝트 최우수상",
    technologies: [
      "Prompt Engineering",
      "Few-shot",
      "Role-based prompting",
      "Image generation",
      "Natural language input",
      "Comparison UI",
      "SMPL",
      "PIFuHD",
      "ICON",
      "ECON",
      "PaMIR (비교 검토)",
      "Stable Diffusion",
      "Blender + MCP (종료 후 개인 재검증)",
    ],
    productCards: [
      {
        title: "Core Problem",
        description:
          "드레스 투어의 반복 시착 비용 때문에 충분한 비교 없이 제한된 선택지 안에서 결정해야 했습니다.",
      },
      {
        title: "Product Hypothesis",
        description:
          "인체 복원은 큰 드레스 부피·레이어를 충분히 표현하지 못했습니다. ICON 환경 재현 실패와 ECON 머메이드 라인 부분 성공·볼가운 부피 붕괴를 근거로 3D 복원을 중단했습니다.",
      },
      {
        title: "Prompt Structure",
        description:
          "사용자 얼굴 사진과 원하는 스타일을 Stable Diffusion 생성에 연결하고, Body·Color·Design·Accessory·Style 전문가 역할로 프롬프트 조건·제약·출력 기준을 분리했습니다.",
      },
      {
        title: "Output Structure",
        description:
          "가상 피팅 이미지, 추천 근거, 비교 가능한 옵션으로 결과를 구성했습니다.",
      },
    ],
    impact:
      "복원 실패를 분석해 생성과 비교 경험으로 방향을 전환했습니다. 팀 프로젝트는 생성형 AI 활용 산업융합 프로젝트 최우수상을 수상했습니다.",
    theme: "warm",
  },
  {
    key: "docent",
    name: "Digital Docent",
    label: "Conversational Portfolio",
    headline: "프로젝트를 찾는 시간을 줄이고,\n질문에서 바로 맥락으로 연결합니다.",
    description:
      "방문자가 여러 프로젝트와 기술을 직접 뒤지지 않아도, 현재 페이지의 맥락과 검색 근거를 바탕으로 대화하며 포트폴리오를 탐색할 수 있게 했습니다.",
    background: "#0B1120",
    foreground: "text-white",
    muted: "text-slate-300",
    core: "많은 프로젝트 속에서\n방문자는 어떻게\n자신의 질문으로 탐색할까?",
    sections: ["Page Context", "Hybrid Retrieval", "Conversational UI", "4D Voice UX"],
    points: ["Page Context", "BM25 + Dense", "RRF", "Supertonic + LAM"],
    identity: "페이지 맥락과 Hybrid RAG 근거를 연결한 전역 AI 포트폴리오 도슨트",
    role: "Frontend / Hybrid RAG / Voice UX / 3D Avatar Integration",
    technologies: [
      "Next.js",
      "TypeScript",
      "BM25 + Dense Hybrid RAG",
      "OpenAI text-embedding-3-small",
      "RRF",
      "LLM Streaming",
      "Supertonic TTS",
      "LAM Audio-to-Expression",
      "React Three Fiber",
      "Vercel",
      "RunPod Serverless",
    ],
    productCards: [
      {
        title: "Page Context",
        description:
          "현재 pathname과 화면에서 가장 많이 보이는 섹션을 구조화된 문맥으로 전달해 질문의 의도를 좁힙니다.",
        keywords: ["Next.js", "Frontend", "Context"],
      },
      {
        title: "Retrieval",
        description:
          "BM25의 정확한 용어 검색과 Dense 의미 검색을 RRF로 합치고, query embedding 실패 시 lexical 결과로 답을 이어갑니다.",
        keywords: ["BM25", "Dense Embedding", "RRF", "Fallback"],
      },
      {
        title: "Conversational UI",
        description:
          "스트리밍 텍스트, 선택형 음성, 페이지 간 대화 지속을 하나의 전역 인터페이스로 구성했습니다.",
        keywords: ["LLM Streaming", "Voice AI", "Global Runtime"],
      },
      {
        title: "Avatar Feedback",
        description:
          "Supertonic 음성과 LAM 분석, 같은 합성의 자모 정렬을 3D 얼굴의 표정과 한국어 입모양으로 연결했습니다.",
        keywords: ["React Three Fiber", "Supertonic", "LAM", "4D Lip-sync"],
      },
    ],
    impact:
      "질문 → 페이지 문맥 → 검색 → LLM → TTS → 아바타 애니메이션을 하나의 탐색 경험으로 연결했습니다.",
    theme: "dark",
  },
];
