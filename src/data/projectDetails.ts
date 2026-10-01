import type { ProjectDetail } from "@/types/portfolio";
import { challenges } from "@/data/challenges";
import { crimeSceneTroubles } from "@/data/crimeScenePlayground";
import { fullVideoSources } from "@/data/videoSources";

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
      videoSrc: fullVideoSources.armi,
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
      videoSrc: fullVideoSources.hangarae,
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
    problemQuestion: ["AI Agent는", "혼자 답하는 도구가 아니라", "함께 일하는 팀이 될 수 있을까?"],
    description:
      "6개 역할 에이전트가 토론·합의·코드 생성·상호 리뷰·실제 검증·자가 수리 루프를 도는 멀티에이전트 오케스트레이션 워크스페이스입니다.",
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
  {
    slug: "ai-docent",
    title: "AI Docent",
    subtitle: "Context-aware Conversational Portfolio",
    label: "Conversational AI",
    theme: "lab",
    problemQuestion: ["프로젝트가 많아질수록", "방문자는 왜 더 오래", "정보를 찾아야 할까?"],
    description:
      "방문자가 여러 프로젝트와 기술을 직접 뒤지지 않아도, 지금 보고 있는 페이지를 이해하고 포트폴리오의 근거를 찾아 대화로 안내하는 AI 도슨트입니다.",
    role: [
      "전역 대화 런타임과 라우트 간 상태 지속 설계",
      "PageContext 기반 검색 문맥 연결",
      "RAG 근거 검색과 스트리밍 대화 UI 구현",
      "TTS와 3D 얼굴 애니메이션 통합",
    ],
    techStack: [
      "Next.js",
      "React",
      "TypeScript",
      "RAG",
      "LLM Provider",
      "React Three Fiber",
      "Web Speech API",
      "Supertonic TTS",
      "LAM Audio-to-Expression",
      "RunPod Serverless",
    ],
    media: {
      caption: "AI Docent — 페이지 맥락, 근거 검색, 대화, 음성, 3D 표정이 이어지는 전역 인터페이스",
    },
    highlights: [
      { label: "Context", value: "PageContext", description: "pathname과 현재 섹션을 질문 문맥으로 전달" },
      { label: "Grounding", value: "RAG", description: "프로젝트 원문 근거를 검색해 답변에 연결" },
      { label: "Runtime", value: "Global", description: "페이지가 바뀌어도 대화와 아바타 상태를 유지" },
    ],
    architecture: {
      title: "질문이 현재 페이지의 맥락을 만나고, 근거 있는 답변이 얼굴의 움직임으로 돌아옵니다.",
      description:
        "클라이언트의 `PageContext`는 위치 힌트만 전달하고, 서버의 retrieval이 포트폴리오 근거를 선택합니다. LLM 응답은 텍스트로 먼저 스트리밍되며, 사용자가 음성을 켠 경우에만 TTS와 avatar animation이 뒤따릅니다.",
      items: [
        {
          title: "1. Question → PageContext",
          description:
            "질문과 함께 현재 pathname, projectSlug, 화면의 data-docent-section을 구조화해 전달합니다.",
          tech: ["usePageContext", "IntersectionObserver"],
        },
        {
          title: "2. PageContext → Retrieval",
          description:
            "검증된 페이지 문맥을 검색 힌트로 사용해 프로젝트 데이터와 기록에서 관련 근거를 찾습니다.",
          tech: ["RAG", "PageContext validation"],
        },
        {
          title: "3. Retrieval → LLM",
          description:
            "검색 근거와 대화 기록을 LLM provider에 전달하고 답변을 스트리밍합니다. 공급자가 없을 때도 근거/폴백 경로를 유지합니다.",
          tech: ["LLM Provider", "Streaming"],
        },
        {
          title: "4. LLM → TTS → Avatar Animation",
          description:
            "음성을 명시적으로 켠 경우에만 RunPod의 Supertonic TTS가 답변을 한 번 합성하고, 같은 WAV로 LAM 입모양과 자모 정렬(양순음·모음)을 만들어 3D 얼굴에 반영합니다.",
          tech: ["Supertonic", "LAM", "RunPod Serverless", "React Three Fiber"],
        },
      ],
    },
    troubleshooting: [
      {
        title: "한국어 모음이 입모양으로 갈리지 않던 문제",
        summary:
          "같은 합성의 자모 정렬로 모음 모양과 양순음 닫힘을 LAM 입모양 위에 얹었습니다.",
        problem:
          "LAM만으로는 ㅣ·ㅡ에서 입이 옆으로 벌어지지 않고, ㅏ가 덜 벌어지며, ㅂ·ㅁ에서 입술이 제대로 닫히지 않았습니다.",
        investigation:
          "블라인드 검토에서 사람이 보는 기준은 모음 벌림·가로 벌림·자음 여닫힘이었고, LAM 신호 자체가 한국어 모음을 거의 가르지 못한다는 것을 실측으로 확인했습니다.",
        solution:
          "Supertonic 합성 과정의 attention에서 자모 시각을 읽어(두 번 합성하지 않음) 양순음 게이트와 모음 채널(가로·오므림·평순·턱 열림)로 줄이고, 이중모음 전환과 사람이 고른 80ms 입 선행을 더했습니다.",
        result:
          "운영 경로 22문장 1배속 검증에서 양순음 닫힘 106/106, 합성 1회·오디오 해시 일치를 확인했습니다. 음운 변동과 치아 표현은 남은 한계입니다.",
        tech: ["Supertonic TTS", "LAM", "Same-synthesis alignment", "RunPod Serverless"],
      },
    ],
    result: [
      "도슨트를 루트 레이아웃의 단일 런타임으로 옮겨 모든 페이지에서 같은 대화를 이어갑니다.",
      "페이지 문맥과 검색 근거를 분리해 화면 텍스트를 보내지 않고도 관련 답변을 제공합니다.",
      "텍스트 응답과 음성 준비를 분리해 음성을 켜지 않은 방문에는 워커 비용이 발생하지 않습니다.",
      "재생되는 소리와 입모양이 같은 합성 파일에서 나오도록 세그먼트마다 합성을 한 번으로 고정했습니다.",
    ],
  },
  {
    slug: "crime-scene",
    title: "Crime Scene",
    subtitle: "3D AI Murder Mystery",
    label: "Interactive AI Game",
    theme: "lab",
    problemQuestion: ["단서를 보는 게임에서", "질문하고 의심하고 증명하는", "수사 경험으로"],
    description:
      "3D 공간을 직접 탐색해 단서를 수집하고, 용의자에게 자유롭게 질문하고, 증거를 제시한 뒤 마지막 추리로 범인을 지목하는 웹 기반 크라임씬입니다.",
    role: [
      "3D 1인칭 탐사와 조사 상호작용 설계",
      "단서 공개·권한·라운드 상태 모델링",
      "자유형 AI 심문과 대화 기억 흐름 구현",
      "증거 제시와 최종 추리 경험 연결",
    ],
    techStack: [
      "Next.js",
      "React",
      "TypeScript",
      "React Three Fiber",
      "Zustand",
      "Generative AI",
      "Web Audio",
      "Supabase Realtime",
    ],
    media: {
      caption: "Crime Scene — 3D 탐색, 단서 수집, AI 심문, 증거 제시, 최종 추리",
    },
    highlights: [
      { label: "Explore", value: "3D", description: "10개 공간을 걷고 사물을 직접 조사" },
      { label: "Evidence", value: "Clues", description: "발견한 단서와 개인 정보를 권한에 맞게 공개" },
      { label: "Interrogate", value: "AI", description: "정해진 선택지 밖의 질문까지 이어지는 심문" },
    ],
    architecture: {
      title: "탐색에서 심문과 추리까지, 플레이어의 증거가 다음 행동을 엽니다.",
      description:
        "클라이언트의 3D 탐사와 서버의 비밀 정보 경계를 나누고, 수집한 단서·라운드 상태·심문 기억이 증거 제시와 최종 판정으로 이어지도록 구성했습니다.",
      items: [
        {
          title: "3D Exploration",
          description: "React Three Fiber 공간에서 이동하고, 조준한 사물과 상호작용해 단서를 수집합니다.",
          tech: ["React Three Fiber", "Pointer Lock"],
        },
        {
          title: "Clue Visibility",
          description: "라운드와 역할별로 볼 수 있는 정보만 서버가 투영해 추리의 정보 비대칭을 지킵니다.",
          tech: ["Server API", "Visibility rules"],
        },
        {
          title: "AI Interrogation",
          description: "용의자에게 자유형 질문을 보내고, 해금된 정보와 대화 기억 범위 안에서 답을 이어갑니다.",
          tech: ["LLM", "Interview memory"],
        },
        {
          title: "Evidence → Deduction",
          description: "증거를 제시해 주장과 연결하고, 마지막 추리와 투표 결과로 사건을 마무리합니다.",
          tech: ["Reasoning", "Vote resolution"],
        },
      ],
    },
    // Playground 와 같은 기록(Notion 출처, 스포일러 없음).
    troubleshooting: crimeSceneTroubles,
    result: [
      "탐색·단서·대화·추리를 하나의 브라우저 게임 흐름으로 연결했습니다.",
      "정답과 비밀 단서를 서버 경계 안에 두고 플레이어별 공개 범위를 분리했습니다.",
      "혼자서도 NPC와 플레이할 수 있고, 선택적으로 실시간 멀티플레이를 연결할 수 있습니다.",
    ],
  },
];

export function getProjectDetail(slug: string) {
  return projectDetails.find((project) => project.slug === slug);
}
