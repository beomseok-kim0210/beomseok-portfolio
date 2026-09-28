import type { Project } from "@/types/portfolio";

export const projects: Project[] = [
  {
    key: "armi",
    name: "ARMI",
    label: "Healthcare AI",
    headline: "그래서 우리는\nARMI를 만들었습니다.",
    description:
      "환자의 음성 요청을 AI Agent가 해석하고, 로봇 미션과 간호사 호출, 의료진 알림까지 하나의 흐름으로 연결했습니다.",
    background: "#07111F",
    foreground: "text-white",
    muted: "text-slate-300",
    core: "병실에서\nAI는 어디까지\n사람을 도울 수 있을까?",
    sections: ["Voice AI", "Robot State", "Realtime UX", "Care Workflow"],
    points: ["Voice AI", "Robot State", "Realtime UX", "Care Workflow"],
    technologies: [
      "Flutter",
      "Android Native",
      "SpeechRecognizer",
      "AudioRecord",
      "Sherpa-ONNX",
      "CAMPPlus",
      "MethodChannel",
      "STOMP WebSocket",
      "Spring Boot",
      "gRPC",
      "WearOS",
      "Kotlin",
      "AI Agent",
    ],
    productCards: [
      {
        title: "Voice AI",
        description:
          "STT, 웨이크워드, 발화자 검증, TTS가 마이크와 상태 전환을 공유하는 구조에서 환자 중심 음성 인터페이스를 설계했습니다.",
        keywords: [
          "Android SpeechRecognizer",
          "AudioRecord",
          "Sherpa-ONNX",
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
      "기술은 사용자의 움직임 하나를 바꾸기 위해 존재합니다.",
    background: "#F7FFFB",
    foreground: "text-[#111827]",
    muted: "text-slate-600",
    core: "운동은 했지만,\n정말 올바르게\n움직인 걸까?",
    sections: ["Gamification", "AI × 3D", "Elderly UX", "On-device AI"],
    points: ["Frontend Lead", "AI × 3D × UX", "노년층", "재활 환자"],
    identity: "AIoT 재활 보조 시스템 — 게이미피케이션 프론트엔드",
    role: "Frontend Lead / AI × 3D × UX Integration",
    award: "SSAFY 프로젝트 대회 1위 수상",
    technologies: ["Claude", "Blender MCP", "YOLOv11-M", "MMPOSE", "Jetson Nano", "LLM Report"],
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
          "Jetson Nano 환경에서 실시간 추론이 가능하도록 정확도와 경량화 사이의 균형을 고려했습니다.",
      },
    ],
    metrics: [
      { label: "Precision", before: "0.447", after: "0.982" },
      { label: "mAP50", before: "0.872", after: "0.988" },
      { label: "mAP50-95", before: "0.747", after: "0.925" },
      { label: "Labeled Foot Data", after: "20,507", caption: "images" },
    ],
    impact:
      "정확도 개선과 동시에 실시간 추론이 가능한 수준의 성능을 확보했고, 온디바이스 환경에서도 안정적인 동작이 가능하도록 구현했습니다.",
    theme: "mint",
  },
  {
    key: "wedding",
    name: "Wedding Dress AI",
    label: "Choice Intelligence",
    headline: "AI를 현실 재현 기술이 아니라\n의사결정을 돕는 비교 도구로 설계했습니다.",
    description:
      "웨딩드레스 선택 문제는 취향 부족이 아니라 비용과 비교 기회의 구조적 제약이었습니다.",
    background: "#FFF9F8",
    foreground: "text-[#111827]",
    muted: "text-slate-600",
    core: "사람은\n자신에게 가장 어울리는 선택을\n얼마나 알고 있을까?",
    sections: ["Problem Definition", "AI Design", "Product Judgment", "Award"],
    points: ["5~8만 원", "Prompt Engineering", "Expert AI", "최우수상"],
    identity: "생성형 AI 기반 웨딩드레스 가상 피팅 서비스",
    role: "문제 정의 / AI 설계 / 기술 적용 범위 판단",
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
      "Blender + MCP",
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
          "완벽한 실착 재현보다 선택 이전 단계에서 다양한 스타일을 빠르게 비교하는 것이 더 큰 가치라고 판단했습니다.",
      },
      {
        title: "Prompt Structure",
        description:
          "사용자 얼굴 사진, 원하는 스타일, 조건, 제약, 출력 기준을 분리한 구조로 설계했습니다.",
      },
      {
        title: "Output Structure",
        description:
          "가상 피팅 이미지, 추천 근거, 비교 가능한 옵션으로 결과를 구성했습니다.",
      },
    ],
    impact:
      "기술적으로 가능해도 제품에 맞지 않으면 멈추는 판단을 통해 최우수상 수상으로 이어졌습니다.",
    theme: "warm",
  },
  {
    key: "docent",
    name: "AI Docent",
    label: "Conversational Portfolio",
    headline: "프로젝트를 찾는 시간을 줄이고,\n질문에서 바로 맥락으로 연결합니다.",
    description:
      "방문자가 여러 프로젝트와 기술을 직접 뒤지지 않아도, 현재 페이지의 맥락과 검색 근거를 바탕으로 대화하며 포트폴리오를 탐색할 수 있게 했습니다.",
    background: "#0B1120",
    foreground: "text-white",
    muted: "text-slate-300",
    core: "많은 프로젝트 속에서\n방문자는 어떻게\n자신의 질문으로 탐색할까?",
    sections: ["Page Context", "RAG", "Conversational UI", "3D UX"],
    points: ["Page Context", "RAG", "Conversational UI", "3D UX"],
    identity: "페이지 맥락과 검색 근거를 연결한 대화형 포트폴리오 가이드",
    role: "Frontend / RAG / Voice UX / 3D Avatar Integration",
    technologies: [
      "React",
      "Next.js",
      "RAG",
      "Prompt Engineering",
      "React Three Fiber",
      "3D UX",
      "Web Speech",
      "Generative AI",
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
          "프로젝트 데이터와 기록에서 질문에 맞는 근거를 찾고, 답변이 포트폴리오의 실제 내용에 머물도록 합니다.",
        keywords: ["RAG", "AI Search"],
      },
      {
        title: "Conversational UI",
        description:
          "스트리밍 텍스트, 선택형 음성, 페이지 간 대화 지속을 하나의 전역 인터페이스로 구성했습니다.",
        keywords: ["Generative AI", "Voice AI", "Realtime UX"],
      },
      {
        title: "Avatar Feedback",
        description:
          "답변 감정과 음성 타이밍을 3D 얼굴의 표정과 입모양으로 연결했습니다.",
        keywords: ["React Three Fiber", "3D UX", "Web Speech"],
      },
    ],
    impact:
      "질문 → 페이지 문맥 → 검색 → LLM → TTS → 아바타 애니메이션을 하나의 탐색 경험으로 연결했습니다.",
    theme: "dark",
  },
];
