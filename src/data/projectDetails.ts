import type { ProjectDetail } from "@/types/portfolio";
import { challenges } from "@/data/challenges";

const gamificationChallenge = {
  title: "재활을 운동이 아니라 게임처럼 느끼게 해야 했던 문제",
  summary:
    "재활 환자가 반복 동작을 지속하도록 동작 → 반응 → 보상 흐름을 프론트엔드에서 설계했습니다.",
  problem:
    "재활은 반복이 중요하지만, 노년층과 재활 환자에게는 부담스럽고 지루하게 느껴질 수 있습니다. 단순히 포즈를 인식하는 것만으로는 행동 변화를 만들기 어려웠습니다.",
  investigation:
    "사용자가 운동한다는 부담보다 게임한다는 감각을 느껴야 지속성이 생긴다고 판단했습니다. 따라서 포즈 인식 결과가 즉시 시각적 반응으로 이어지는 구조가 필요했습니다.",
  solution:
    "Blender로 3D 에셋을 제작하고, 재활 동작을 게임의 미션처럼 표현했습니다. 성공 시 시각적 보상, 점수, 레벨 등 게임 요소를 도입했습니다.",
  result:
    "기술 자체보다 사용자의 행동을 바꿀 수 있는가에 초점을 맞춘 점이 평가받았고, SSAFY 프로젝트 대회에서 1위를 수상했습니다.",
  tech: ["Frontend", "Blender", "3D UX", "Gamification", "MCP", "Pose Recognition"],
};

const weddingComparisonChallenge = {
  title: "AI를 실착 재현이 아니라 비교 도구로 재정의한 문제",
  summary:
    "완벽한 재현보다 선택 전 비교 효율을 높이는 것이 사용자에게 더 큰 가치라고 판단했습니다.",
  problem:
    "신부들은 드레스 투어에서 시착 1벌당 5~8만 원을 지불해야 하고, 충분한 비교 없이 제한된 선택지 안에서 결정해야 했습니다.",
  investigation:
    "문제를 취향 부족이 아니라 비용과 비교 기회의 구조적 제약으로 정의했습니다. AI가 완벽한 실착을 재현하는 것보다 선택 이전 단계에서 비교 가능한 옵션을 제공하는 것이 더 중요하다고 판단했습니다.",
  solution:
    "사용자 얼굴 사진과 원하는 스타일 텍스트를 결합하고, 조건·제약·출력 기준을 분리한 프롬프트 구조를 설계했습니다. 생성 결과는 비교 가능한 옵션과 설명 근거를 함께 제공하도록 구성했습니다.",
  result:
    "AI를 할 수 있는 기술이 아니라 사용자 의사결정을 돕는 도구로 다루는 기준을 갖게 되었고, 프로젝트는 최우수상을 수상했습니다.",
  tech: ["Prompt Engineering", "Generative AI", "Image Generation", "Product Design", "Comparison UX"],
};

export const projectDetails: ProjectDetail[] = [
  {
    slug: "armi",
    title: "ARMI",
    subtitle: "병상 보조 Voice AI Care Robot",
    label: "Healthcare AI",
    theme: "armi",
    problemQuestion: ["병실에서", "AI는 어디까지", "사람을 도울 수 있을까?"],
    description:
      "환자의 음성 요청을 AI Agent가 해석하고, 로봇 미션과 간호사 호출, 의료진 알림까지 하나의 흐름으로 연결한 병상 보조 서비스입니다.",
    role: [
      "환자 앱 음성 흐름 분석",
      "STT / TTS / 발화자 검증 상태 전환 설계",
      "WebSocket 기반 실시간 이벤트 흐름 분석",
      "Galaxy Watch 긴급 호출 알림 UX 검토",
    ],
    techStack: [
      "Flutter",
      "Android SpeechRecognizer",
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
    media: {
      videoSrc: "/videos/ARMI_video_portfolio.mp4",
      caption:
        "ARMI demo — voice request, AI response, robot mission, watch alert, realtime state",
    },
    highlights: [
      { label: "Voice", value: "STT / TTS", description: "음성 요청과 응답 흐름" },
      { label: "Robot", value: "gRPC", description: "제어 PC 상태 연결" },
      { label: "Realtime", value: "WebSocket", description: "태블릿 상태 이벤트" },
      { label: "Alert", value: "WearOS", description: "의료진 긴급 호출" },
    ],
    architecture: {
      title: "Voice, Robot, Watch가 하나의 상태 흐름으로 연결됩니다.",
      description:
        "환자 요청부터 로봇 미션, 태블릿 상태, Watch 알림까지 각 시스템을 하나의 care workflow로 바라봤습니다.",
      items: [
        {
          title: "Voice AI",
          description:
            "STT, 웨이크워드, 발화자 검증, TTS가 모두 마이크와 상태 전환을 공유하는 구조에서 음성 흐름을 설계했습니다.",
          tech: ["SpeechRecognizer", "AudioRecord", "CAMPPlus"],
        },
        {
          title: "Robot State",
          description:
            "제어 PC의 로봇 상태를 백엔드와 태블릿으로 전달하기 위해 gRPC, WebSocket, 상태 이벤트 흐름을 연결했습니다.",
          tech: ["gRPC", "Spring Boot", "STOMP"],
        },
        {
          title: "Realtime UX",
          description:
            "환자 요청, AI 응답, 미션 상태, 간호사 호출 이벤트가 끊기지 않도록 connection state와 subscription state를 분리해 분석했습니다.",
          tech: ["Reconnect", "Topic Subscription"],
        },
        {
          title: "Watch Alert",
          description:
            "긴급 호출이 의료진의 Galaxy Watch에 필요한 강도로 전달되도록 알림 정책을 검토했습니다.",
          tech: ["WearOS", "Kotlin", "Notification"],
        },
      ],
    },
    troubleshooting: challenges.slice(0, 4),
    result: [
      "음성 AI를 기능 묶음이 아니라 상태 머신으로 바라보는 기준을 얻었습니다.",
      "실시간 UX에서 연결 상태와 구독 상태를 분리해 보는 관점을 익혔습니다.",
      "의료 알림은 더 많이 보내는 것이 아니라 필요한 강도로 정확히 전달해야 한다는 점을 배웠습니다.",
    ],
  },
  {
    slug: "hangarae",
    title: "행가래",
    subtitle: "AIoT 재활 보조 시스템",
    label: "Rehabilitation AI",
    theme: "hangarae",
    problemQuestion: ["운동은 했지만", "정말 올바르게", "움직인 걸까?"],
    description:
      "재활 동작을 게임처럼 바꾸고, 사용자의 움직임이 즉시 피드백으로 돌아오는 AIoT 재활 보조 시스템입니다.",
    role: [
      "프론트엔드 전담",
      "AI × 3D × UX 통합",
      "게이미피케이션 경험 구현",
      "포즈 인식 결과를 사용자 피드백으로 연결",
    ],
    techStack: [
      "YOLOv11-M",
      "MMPOSE",
      "Jetson Nano",
      "Manual Labeling",
      "Fine-tuning",
      "Blender",
      "MCP",
      "Gamification",
      "3D UX",
    ],
    media: {
      videoSrc: "/videos/행가래_video_fortpolio.mp4",
      caption:
        "Hangarae demo — pose recognition, 3D feedback, rehabilitation game, AI report",
    },
    highlights: [
      { label: "Award", value: "1위 수상", description: "SSAFY 프로젝트 대회" },
      { label: "Data", value: "20,507장", description: "발 데이터 선별 및 수동 라벨링" },
      { label: "Precision", value: "0.447 → 0.982", description: "발 포인트 인식 개선" },
      { label: "mAP50", value: "0.872 → 0.988", description: "모델 성능 개선" },
    ],
    architecture: {
      title: "움직임을 데이터로 바꾸고, 데이터는 다시 피드백이 됩니다.",
      description:
        "포즈 인식 결과가 게임 화면, 3D 반응, 리포트로 이어지도록 AI와 프론트엔드 경험을 연결했습니다.",
      items: [
        {
          title: "Gamification Frontend",
          description: "재활 동작을 미션처럼 표현하고 성공 시 시각적 보상을 제공했습니다.",
          tech: ["Frontend", "Gamification"],
        },
        {
          title: "AI × 3D Feedback",
          description:
            "Claude와 Blender를 MCP로 연동하고, 포즈 인식 결과가 3D 환경의 반응으로 이어지는 흐름을 구성했습니다.",
          tech: ["Claude", "Blender", "MCP"],
        },
        {
          title: "Elderly-Friendly UX",
          description:
            "노년층과 재활 환자가 직관적으로 이해할 수 있도록 동작 → 반응 → 피드백의 흐름을 단순하게 설계했습니다.",
          tech: ["UX", "Accessibility"],
        },
        {
          title: "On-device AI",
          description:
            "Jetson Nano 환경에서 실시간 추론이 가능하도록 정확도와 경량화 사이의 균형을 고려했습니다.",
          tech: ["Jetson Nano", "YOLOv11-M"],
        },
      ],
    },
    troubleshooting: [challenges[4], gamificationChallenge],
    result: [
      "Precision 0.447 → 0.982, mAP50 0.872 → 0.988로 개선했습니다.",
      "20,507장의 발 데이터를 직접 선별하고 수동 라벨링했습니다.",
      "SSAFY 프로젝트 대회에서 1위를 수상했습니다.",
    ],
  },
  {
    slug: "wedding",
    title: "Wedding AI",
    subtitle: "생성형 AI 기반 웨딩드레스 가상 피팅 서비스",
    label: "Choice Intelligence",
    theme: "wedding",
    problemQuestion: ["사람은", "자신에게 가장 어울리는 선택을", "얼마나 알고 있을까?"],
    description:
      "웨딩드레스 선택 과정의 비용과 비교 기회 제약을 생성형 AI로 줄인 가상 피팅 서비스입니다.",
    role: ["문제 정의", "AI 설계", "기술 적용 범위 판단", "프롬프트 구조화"],
    techStack: [
      "Generative AI",
      "Prompt Engineering",
      "Image Generation",
      "Comparison UX",
      "SMPL",
      "PIFuHD",
      "ICON",
      "ECON",
      "Blender",
      "MCP",
    ],
    media: {
      caption: "Wedding AI demo — recommendation, virtual fitting, before/after result",
    },
    highlights: [
      { label: "Award", value: "최우수상", description: "생성형 AI 활용 산업융합 프로젝트" },
      { label: "Cost", value: "5~8만 원", description: "시착 1벌당 반복 비용" },
      { label: "Decision", value: "3D 적용 중단", description: "제품 품질 기준에 따른 기술 판단" },
    ],
    architecture: {
      title: "AI를 현실 재현 기술이 아니라 의사결정 도구로 설계했습니다.",
      description:
        "완벽한 실착 재현보다 선택 이전 단계에서 다양한 스타일을 빠르게 비교하는 것이 더 큰 가치라고 판단했습니다.",
      items: [
        {
          title: "Problem Definition",
          description:
            "드레스 선택 문제를 취향 부족이 아니라 비용과 비교 기회의 구조적 제약으로 정의했습니다.",
        },
        {
          title: "Comparison Tool",
          description:
            "완벽한 실착 재현보다 선택 이전 단계에서 다양한 스타일을 빠르게 비교하는 것이 더 큰 가치라고 판단했습니다.",
        },
        {
          title: "Technology Decision",
          description:
            "SMPL, PIFuHD, ICON, ECON 등 3D 변환을 검토했지만 실서비스 품질 기준에 맞지 않아 중단했습니다.",
        },
        {
          title: "Prompt Structure",
          description:
            "사용자 얼굴 사진과 드레스 스타일 텍스트를 조건, 제약, 출력 기준으로 분리해 설계했습니다.",
        },
      ],
    },
    troubleshooting: [challenges[5], weddingComparisonChallenge],
    result: [
      "기술적 가능성과 제품 적용 가능성은 다르다는 기준을 세웠습니다.",
      "AI를 선택 이전 단계의 비교 도구로 재정의했습니다.",
      "생성형 AI 활용 산업융합 프로젝트 최우수상을 수상했습니다.",
    ],
  },
  {
    slug: "claw-dev",
    title: "Claw Dev",
    subtitle: "Personal AI Lab",
    label: "Personal AI Lab",
    theme: "lab",
    problemQuestion: ["AI Agent는", "혼자 답하는 도구가 아니라", "함께 일하는 구조가 될 수 있을까?"],
    description:
      "멀티에이전트 협업, AI 검색, RAG, 프롬프트 오케스트레이션, 코드 생성 검증 루프를 실험하는 개인 AI Lab입니다.",
    role: ["Multi-Agent Workflow", "AI Search", "RAG", "Prompt Engineering", "Agent Architecture"],
    techStack: [
      "Multi-Agent Workflow",
      "AI Search",
      "RAG",
      "Prompt Engineering",
      "Agent Architecture",
      "Code Generation",
      "Verification Loop",
      "Project Memory",
      "Dynamic Debate",
    ],
    media: {
      caption: "Claw Dev lab — multi-agent workflow, retrieval, verification loop",
    },
    highlights: [
      { label: "Research", value: "Agent", description: "역할 기반 작업 흐름 실험" },
      { label: "Search", value: "RAG", description: "검색과 근거 연결 실험" },
      { label: "Loop", value: "Verify", description: "코드 생성 검증 루프" },
    ],
    architecture: {
      title: "AI Agent를 하나의 답변자가 아니라 협업 구조로 실험합니다.",
      description:
        "검색, 계획, 실행, 검증을 분리해 AI가 제품 개발 흐름 안에서 어떻게 작동할 수 있는지 실험합니다.",
      items: [
        { title: "Multi-Agent Workflow", description: "역할을 나눠 계획, 실행, 검증 흐름을 구성합니다." },
        { title: "AI Search", description: "외부 검색 결과를 판단 가능한 근거로 정리합니다." },
        { title: "RAG", description: "문서와 프로젝트 기억을 작업 맥락으로 연결합니다." },
        { title: "Verification Loop", description: "생성된 코드와 결정을 다시 검증하는 루프를 실험합니다." },
      ],
    },
    troubleshooting: [],
    result: [
      "프로젝트 이후에도 AI Agent 구조와 검색, 추론 흐름을 계속 실험하고 있습니다.",
      "대표 프로젝트가 아니라 개인 연구 공간으로 유지합니다.",
    ],
  },
];

export function getProjectDetail(slug: string) {
  return projectDetails.find((project) => project.slug === slug);
}
