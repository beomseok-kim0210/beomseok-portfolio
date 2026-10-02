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
    "동작 → 3D 반응 → 점수·보상 흐름을 구현했고, 팀 프로젝트는 SSAFY 프로젝트 대회에서 1위를 수상했습니다.",
  tech: ["Frontend", "Blender", "3D UX", "Gamification", "MCP", "Pose Recognition"],
};

const weddingComparisonChallenge = {
  title: "AI를 실착 재현이 아니라 비교 도구로 재정의한 문제",
  summary:
    "3D 복원 실패를 분석한 뒤, 선택 전 스타일 비교를 돕는 생성 방식으로 전환했습니다.",
  problem:
    "신부들은 드레스 투어에서 시착 1벌당 5~8만 원을 지불해야 하고, 충분한 비교 없이 제한된 선택지 안에서 결정해야 했습니다.",
  investigation:
    "SMPL·PIFuHD·ICON·ECON·PaMIR을 비교하며 인체 복원 가정이 큰 드레스 부피와 레이어를 표현하기에 맞지 않음을 확인했습니다. 비용과 비교 기회의 제약을 푸는 방향으로 문제를 재정의했습니다.",
  solution:
    "Stable Diffusion으로 사용자 얼굴 사진과 스타일 텍스트를 결합하고, Body·Color·Design·Accessory·Style 전문가 역할별 프롬프트 조건을 구조화했습니다. 여러 생성 옵션과 설명 근거를 비교하도록 구성했습니다.",
  result:
    "AI를 할 수 있는 기술이 아니라 사용자 의사결정을 돕는 도구로 다루는 기준을 갖게 되었고, 프로젝트는 최우수상을 수상했습니다.",
  tech: ["Prompt Engineering", "Generative AI", "Image Generation", "Product Design", "Comparison UX"],
};

const projectDetailEntries: ProjectDetail[] = [
  {
    slug: "armi",
    title: "ARMI",
    subtitle: "병상 보조 Voice AI Care Robot",
    label: "Healthcare AI",
    theme: "armi",
    problemQuestion: ["병실에서", "AI는 어디까지", "사람을 도울 수 있을까?"],
    description:
      "환자의 음성·텍스트 요청을 Qwen 30B 기반 LangGraph Agent가 구조화하고, 답변·검색·기억 조회·로봇 행동과 의료진 알림으로 연결한 팀 병상 보조 서비스입니다.",
    role: [
      "Qwen 30B Agent 라우팅·구조화 출력·Tavily 검색 분기 설계",
      "Redis 원문·상태와 Chroma 장기 기억 검색 흐름 설계",
      "환자 앱·의료진 웹·Watch UI와 음성 흐름 설계",
      "STT / TTS / 발화자 검증 상태 전환 설계",
      "WebSocket 기반 실시간 이벤트 흐름 분석",
      "Galaxy Watch 긴급 호출 알림 UX 검토",
    ],
    techStack: [
      "Flutter",
      "Android SpeechRecognizer",
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
    brief: {
      scope: "team",
      status: "팀 프로젝트 구현·시연",
      problem: "병상 환자의 자연어 요청을 대화 답변에서 끝내지 않고, 기억 조회와 로봇·호출 행동까지 연결해야 했습니다.",
      role: {
        personal: [
          "Qwen 30B Agent 라우팅·구조화 출력·Tavily 검색 분기 설계",
          "Redis/Chroma 기억 흐름과 환자 앱·의료진 웹·Watch UI 설계",
          "STT·TTS·발화자 검증의 마이크 소유권과 음성 상태 전환 설계",
        ],
        team: [
          "Spring Boot 서버와 제어 PC·로봇·태블릿·Watch를 연결한 병상 보조 서비스 구현",
          "gRPC 로봇 상태 연결, STOMP WebSocket 실시간 이벤트와 의료진 호출 연동",
        ],
      },
      decisions: [
        {
          title: "Redis 대화 문맥과 Chroma 장기 기억 분리",
          reason: "실시간 상태와 정확한 대화 원문은 Redis에서 빠르게 조회하고, 중요한 내용의 의미 검색은 Chroma에 맡겼습니다. 기억 질문은 Chroma chunk 검색 뒤 Redis 원문을 재조회해 답변 근거를 복원합니다.",
        },
        {
          title: "구조화 출력 → Tool Calling 분기",
          reason: "자유 응답만으로는 실행할 작업을 구분하기 어려웠습니다. LangGraph StateGraph에서 요청을 구조화하고 Text Answer / Robot Action / Tavily Search / Memory Retrieval로 분기해 AI 판단을 실제 행동에 연결했습니다.",
        },
        {
          title: "TTS 중 STT 차단·입력 모드 분리",
          reason: "기기가 자기 응답을 다시 인식하지 않도록 speaking 중 STT를 막았습니다. TTS 완료 콜백 뒤 음성 대화 모드일 때만 다음 listening을 판단해 텍스트 입력과의 충돌을 줄였습니다.",
        },
      ],
      validation: [
        { label: "정성 검증 · 한글 인코딩", value: "표시·파일 구분", note: "Windows 콘솔 표시, UTF-8 파일, IDE와 실제 앱 화면을 나눠 확인했습니다." },
        { label: "정성 검토 · Watch 중복 알림 정책", value: "신규 PENDING", note: "최초 로드와 신규 호출을 구분하고 requestId 중복 제거·urgency별 강조 기준을 검토했습니다." },
        { label: "정성 검증 · KWS 실행 자산", value: "도입 중단", note: "클래스는 있었지만 model·tokens·keywords가 없어 시연 가능성을 보장하지 못했습니다." },
      ],
      result: "Agent 판단을 답변·검색·기억 조회와 로봇 미션에 연결하고, 환자·의료진 UI에서 음성·실시간 상태를 다루는 기준을 정리했습니다.",
    },
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
        "음성/텍스트 → Spring Boot → Qwen 30B LangGraph StateGraph Agent → Tool Calling 분기 → 로봇·태블릿·Watch로 이어지는 팀 시스템입니다.",
      items: [
        {
          title: "Agent Decision & Memory",
          description:
            "구조화된 요청을 Text Answer / Robot Action / Tavily Search / Memory Retrieval로 분기했습니다. Redis는 원문·실시간 대화 상태, Chroma는 중요 내용을 chunking·embedding한 장기 기억 의미 검색을 맡아 속도와 검색 역할을 분리했습니다.",
          tech: ["Qwen 30B", "LangGraph StateGraph", "Tool Calling", "Tavily", "Redis", "Chroma"],
        },
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
      "발 데이터 20,507장 선별·수동 라벨링·YOLOv11-M fine-tuning",
      "온디바이스 모델 선택·성능 분석",
      "React·Three.js 실시간 피드백 UI 구현",
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
      "React",
      "Three.js",
      "YOLO Pose",
      "Depth Camera",
      "Redis",
    ],
    brief: {
      scope: "team",
      status: "팀 프로젝트 완료 · SSAFY 프로젝트 대회 1위",
      problem: "재활 운동의 발끝·뒤꿈치 인식 부족과 센서 좌표 흔들림, 오래된 프레임 누적이 현재 자세 피드백을 방해했습니다.",
      role: {
        personal: [
          "발 데이터 20,507장 선별·수동 라벨링과 YOLOv11-M fine-tuning 참여",
          "Jetson Nano 온디바이스 모델 선택·성능 분석 참여",
          "React·Three.js 피드백 UI·게이미피케이션·좌표→피드백 연결과 3D 자산 파이프라인 구현",
        ],
        team: [
          "YOLO Pose + Depth로 18 keypoints·프레임당 54개 x/y/z 좌표를 처리하는 AIoT 자세 분석 시스템 구현",
          "Jetson Nano 추론·depth jitter 완충·Redis 좌표 전송을 웹 게임 피드백에 연결",
        ],
      },
      decisions: [
        {
          title: "threshold 조정보다 발 데이터 재구축",
          reason: "기존 모델이 발끝·뒤꿈치를 충분히 잡지 못해 임계값 조정만으로 해결되지 않았습니다. 문제에 맞는 발 데이터를 선별·수동 라벨링하고 YOLOv11-M을 재학습했습니다.",
        },
        {
          title: "과거 프레임 큐 대신 최신 좌표 우선",
          reason: "모든 프레임을 순서대로 처리하면 Jetson 추론·Depth·Redis·웹 단계의 지연이 누적됐습니다. timestamp로 오래된 좌표를 버리고 수신과 렌더를 분리해 현재 자세를 우선했습니다.",
        },
        {
          title: "depth jitter 완충과 유지된 자세 판정",
          reason: "단일 프레임의 흔들림이 반복 피드백으로 드러나지 않도록 이상치 처리·최근 프레임 평균·이전 정상값 유지와 상대 좌표·관절 각도를 적용했습니다. 오류가 일정 프레임 유지될 때만 메시지를 냈습니다.",
        },
      ],
      validation: [
        { label: "모델 평가 지표 · Precision", value: "0.447 → 0.982", note: "발 포인트 인식 개선 실험의 YOLOv11-M 재학습 전후 평가 지표입니다." },
        { label: "모델 평가 지표 · mAP50 / mAP50-95", value: "0.988 / 0.925", note: "재학습 전 각각 0.872 / 0.747에서 개선됐습니다." },
        { label: "실시간 파이프라인", value: "약 30 FPS", note: "Jetson Nano 추론·Depth·Redis·웹 피드백 파이프라인입니다." },
      ],
      result: "발 포인트 모델 평가 지표를 개선하고 최신 자세를 3D 게임 피드백에 연결했습니다. 팀 프로젝트는 SSAFY 프로젝트 대회 1위를 수상했습니다.",
    },
    media: {
      videoSrc: fullVideoSources.hangarae,
      caption:
        "Hangarae demo — pose recognition, 3D feedback, rehabilitation game, AI report",
    },
    highlights: [
      { label: "Award", value: "1위 수상", description: "SSAFY 프로젝트 대회" },
      { label: "Data", value: "20,507장", description: "발 데이터 선별 및 수동 라벨링" },
      { label: "Precision", value: "0.447 → 0.982", description: "모델 평가 지표 · 발 포인트 인식 정확도" },
      { label: "mAP50", value: "0.872 → 0.988", description: "모델 평가 지표 · 재학습 전후" },
    ],
    architecture: {
      title: "움직임을 데이터로 바꾸고, 데이터는 다시 피드백이 됩니다.",
      description:
        "YOLO Pose + Depth → Jetson Nano → Redis → React·Three.js 피드백으로 연결했습니다. 18 keypoints의 x/y/z, 프레임당 54개 좌표를 처리하며 depth jitter를 완충하고 최신 상태만 화면에 반영했습니다.",
      items: [
        {
          title: "Gamification Frontend",
          description: "재활 동작을 미션처럼 표현하고 성공 시 시각적 보상을 제공했습니다.",
          tech: ["React", "Three.js", "Gamification"],
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
            "Jetson Nano에서 모델 선택·성능을 분석했습니다. 과거 프레임 큐 누적을 제거하고 timestamp 기준 최신 좌표를 Redis로 전송해 현재 자세를 우선했습니다.",
          tech: ["Jetson Nano", "YOLOv11-M", "Depth Camera", "Redis", "Latest-state"],
        },
      ],
    },
    troubleshooting: [challenges[4], gamificationChallenge],
    result: [
      "발 포인트 인식 정확도를 모델 평가 지표로 확인했습니다: Precision 0.447 → 0.982, mAP50 0.872 → 0.988, mAP50-95 0.747 → 0.925로 개선했습니다.",
      "20,507장의 발 데이터를 직접 선별하고 수동 라벨링했습니다.",
      "SSAFY 프로젝트 대회에서 1위를 수상했습니다.",
    ],
  },
  {
    slug: "wedding",
    title: "Wedding Dress AI",
    subtitle: "3D 복원 실패 분석에서 생성형 AI 비교 경험으로",
    label: "Choice Intelligence",
    theme: "wedding",
    problemQuestion: ["사람은", "자신에게 가장 어울리는 선택을", "얼마나 알고 있을까?"],
    description:
      "SMPL·PIFuHD·ICON·ECON·PaMIR의 인체 복원 가정과 드레스 부피 표현 한계를 분석한 뒤, Stable Diffusion 생성·전문가 역할 프롬프트·옵션 비교로 전환한 팀 프로젝트입니다.",
    role: ["3D 복원 후보 검토·환경 검증", "실패 원인 분석·문제 재정의", "Stable Diffusion 전환", "전문가 역할별 프롬프트 구조 설계"],
    techStack: [
      "Generative AI",
      "Prompt Engineering",
      "Image Generation",
      "Comparison UX",
      "SMPL",
      "PIFuHD",
      "ICON",
      "ECON",
      "PaMIR (비교 검토)",
      "Stable Diffusion",
      "Role-based Prompting",
      "Blender (종료 후 개인 재검증)",
      "MCP (종료 후 개인 재검증)",
    ],
    brief: {
      scope: "team",
      status: "팀 프로젝트 완료 · 최우수상",
      problem: "인체 복원 모델은 큰 스커트 부피와 레이어를 충분히 표현하지 못했습니다. 반복 시착 비용 때문에 부족한 드레스 비교 기회를 다른 방식으로 제공해야 했습니다.",
      role: {
        personal: [
          "SMPL·PIFuHD·ICON·ECON 후보·환경 검증과 PaMIR 비교 검토",
          "복원 실패 원인 분석·문제 재정의·Stable Diffusion 전환 판단",
          "Body·Color·Design·Accessory·Style 전문가 역할별 프롬프트 구조 설계",
        ],
        team: [
          "사용자 얼굴 사진과 스타일 텍스트를 결합한 웨딩드레스 이미지 생성 경험 구현",
          "여러 생성 옵션과 추천 설명·근거를 함께 보여주는 비교 결과 구성",
        ],
      },
      decisions: [
        {
          title: "인체 복원과 의상 복원 문제 구분",
          reason: "SMPL·PIFuHD·ICON·ECON·PaMIR을 비교했지만 몸 중심의 복원 가정은 넓게 퍼지는 드레스의 빈 공간·볼륨·레이어에 맞지 않았습니다. 논문 성능보다 의상 표현과 환경 재현 가능성을 함께 봤습니다.",
        },
        {
          title: "3D 복원 중단 → Stable Diffusion 전환",
          reason: "ECON의 머메이드 라인 부분 성공도 볼가운 부피 유지로 이어지지 않았습니다. 다양한 드레스의 품질·비용·안정성을 고려해 이미지 생성과 선택 전 비교로 방향을 바꿨습니다.",
        },
        {
          title: "전문가 역할 조건과 비교 출력 구조화",
          reason: "한 장의 생성 결과만으로 선택을 돕기 어려워 체형·색상·디자인·액세서리·스타일 조건을 나눴습니다. 여러 옵션과 설명 근거를 함께 제공하도록 프롬프트와 출력을 구성했습니다.",
        },
      ],
      validation: [
        { label: "정성 검증 · 복원 샘플", value: "ECON 부분 성공", note: "몸에 붙는 머메이드 라인은 비교적 복원됐지만 큰 볼가운의 내부 공간·스커트 부피는 유지하지 못했습니다." },
        { label: "정성 검증 · 환경 재현", value: "ICON 환경 실패", note: "공개 코드의 PyTorch·CUDA·PyTorch3D·Conda 버전 충돌로 안정적인 재현이 어려웠습니다." },
        { label: "후보 모델 비교", value: "후보 비교", note: "SMPL·PIFuHD·ICON·ECON·PaMIR의 의상 표현과 환경 재현 가능성을 비교했습니다." },
      ],
      result: "3D 복원 실패를 근거로 문제를 재정의하고 Stable Diffusion 생성·전문가 역할 프롬프트·옵션 비교로 전환했습니다. 생성형 AI 활용 산업융합 프로젝트 최우수상을 수상했습니다.",
    },
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
        "3D 복원 후보의 부피·레이어·환경 한계를 분석한 뒤, Stable Diffusion으로 여러 스타일을 생성해 선택 전에 비교하는 방향으로 전환했습니다.",
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
            "SMPL·PIFuHD·ICON·ECON·PaMIR을 비교 검토했습니다. ICON은 환경 재현이 어려웠고 ECON은 큰 드레스 부피를 유지하지 못해 3D 제품 방향을 중단했습니다.",
        },
        {
          title: "Prompt Structure",
          description:
            "사용자 얼굴 사진과 스타일 텍스트를 Stable Diffusion 생성에 연결하고, Body·Color·Design·Accessory·Style 전문가 역할로 조건·제약·출력 기준을 분리했습니다.",
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
    subtitle: "Role-based Multi-Agent Dev Automation",
    label: "Multi-Agent Automation",
    theme: "lab",
    problemQuestion: ["AI Agent는", "혼자 답하는 도구가 아니라", "함께 일하는 팀이 될 수 있을까?"],
    description:
      "단일 LLM의 요구사항 누락과 실행 오류를 줄이기 위해 6개 역할이 토론·구현·검증·수리를 나눠 맡는 개인 개발 자동화 프로젝트입니다.",
    role: [
      "PM·Backend·Frontend·AI·Infra·Test 역할 경계 설계",
      "동적 토론과 support·refine·challenge 반응 계약 구현",
      "Zod 출력 검증과 실제 도구 기반 품질 게이트 구현",
      "최대 3회 자율 수리·모델 폴백·프로젝트 메모리 설계",
    ],
    techStack: [
      "TypeScript",
      "Node.js",
      "Zod",
      "Role-based Multi-Agent",
      "Dynamic Discussion",
      "node --check",
      "tsc --noEmit",
      "node --test",
      "Autonomous Repair Loop",
      "Gemini",
      "Ollama",
      "Project Memory",
    ],
    media: {
      caption: "Claw Dev — 역할별 토론, 구조 검증, 코드 생성, 실제 실행 검증과 자율 수리 루프",
    },
    highlights: [
      { label: "Roles", value: "6", description: "PM·Backend·Frontend·AI·Infra·Test" },
      { label: "Discussion", value: "Dynamic", description: "support·refine·challenge로 발언에 반응" },
      { label: "Verification", value: "Real tools", description: "node --check·tsc --noEmit·node --test" },
      { label: "Repair", value: "Max 3", description: "오류 로그로 담당을 찾아 재검증" },
    ],
    architecture: {
      title: "역할별 논의를 실행 가능한 코드와 검증 결과까지 연결합니다.",
      description:
        "PM의 범위 설정부터 전문 역할의 토론, 병렬 스펙, 구현 계획, 코드 생성·리뷰·검증·수리까지 8단계 흐름으로 구성했습니다.",
      items: [
        {
          title: "Six Role Boundaries",
          description: "PM은 범위와 조정, Backend·Frontend·AI는 구현 영역, Infra·Test는 운영 위험과 검증을 책임집니다.",
          tech: ["PM", "Backend", "Frontend", "AI", "Infra", "Test"],
        },
        {
          title: "Dynamic Discussion",
          description: "요청에 따라 발언 순서를 바꾸고, 두 번째 반응 라운드에서 이전 메시지를 support·refine·challenge하도록 했습니다.",
          tech: ["targetMessageId", "Reaction contract"],
        },
        {
          title: "Schema-first Output",
          description: "역할별 출력을 Zod 계약으로 검사하고 형식이 깨지면 검증 오류를 돌려줘 실행 전에 다시 생성합니다.",
          tech: ["Zod", "Structured output"],
        },
        {
          title: "Verify → Repair",
          description: "생성 코드를 node --check, tsc --noEmit, node --test로 실행하고 실패 로그에서 담당 역할을 추론해 최대 3회 수리합니다.",
          tech: ["node --check", "tsc --noEmit", "node --test"],
        },
        {
          title: "Fallback & Memory",
          description: "Gemini 쿼터나 연속 실패에는 Ollama로 전환하고, 다음 실행에 필요한 결정과 미해결 항목은 프로젝트 폴더의 메모리에 남깁니다.",
          tech: ["Gemini", "Ollama", "project-memory.json"],
        },
      ],
    },
    troubleshooting: [
      {
        title: "고정 순서 토론이 발표문이 된 문제",
        summary: "역할을 나누는 것만으로는 협업이 생기지 않아 발언 간 반응 계약을 추가했습니다.",
        problem: "초기에는 Backend→Frontend→AI처럼 정해진 순서로 한 번씩 말해, 서로의 판단을 검토하지 않는 발표문이 이어졌습니다.",
        investigation: "역할 수보다 중요한 것은 앞선 발언의 근거를 지지·보완·반박하고 그 결과가 다음 결정에 반영되는 구조였습니다.",
        solution: "요청 기반 동적 순서를 만들고 두 번째 라운드에서 targetMessageId와 support·refine·challenge 중 하나를 반드시 남기게 했습니다.",
        result: "각 발언이 다른 역할의 메시지와 근거를 참조하고, PM이 충돌과 조정 내용을 최종 범위에 반영하게 됐습니다.",
        tech: ["Dynamic Discussion", "support", "refine", "challenge"],
      },
      {
        title: "생성 성공이 실행 성공을 보장하지 않던 문제",
        summary: "스키마 통과와 실제 코드 실행을 서로 다른 품질 게이트로 분리했습니다.",
        problem: "단일 LLM이 만든 결과에는 요구사항 누락뿐 아니라 파일 경로 불일치, 타입 오류, 테스트 실패가 반복됐습니다.",
        investigation: "형식이 맞는 출력도 실제 프로젝트에서 실행되지 않을 수 있으므로 텍스트 리뷰만으로 완료를 판정할 수 없었습니다.",
        solution: "Zod로 출력 계약을 먼저 확인하고, 코드 생성 뒤 세 도구를 실행한 다음 실패 로그로 담당 역할을 찾아 최대 3회 다시 검증했습니다.",
        result: "첫 리뷰에서 구문과 타입은 통과했지만 smoke test가 실패한 사례도 수리 라운드로 넘겨 실제 통과까지 확인했습니다.",
        tech: ["Zod", "node --check", "tsc --noEmit", "node --test"],
      },
    ],
    result: [
      "6개 역할의 토론을 구조화 출력, 코드 생성, 실제 도구 검증, 최대 3회 자율 수리까지 잇는 워크플로를 구현했습니다.",
      "Gemini 장애 시 Ollama 폴백과 파일 기반 프로젝트 메모리로 실행 연속성을 확보했습니다.",
    ],
    brief: {
      problem:
        "단일 LLM에 설계와 구현을 한 번에 맡기면 요구사항 누락, 경로·타입 오류, 테스트 실패가 반복되고 결과를 실행 가능한 코드로 신뢰하기 어려웠습니다.",
      role: {
        personal: [
          "6개 역할의 책임과 8단계 오케스트레이션 설계",
          "동적 토론·Zod 계약·실제 실행 검증 구현",
          "자율 수리, Gemini→Ollama 폴백, 프로젝트 메모리 구현",
        ],
      },
      decisions: [
        {
          title: "역할을 6개로 분리했습니다.",
          reason: "기능 생성만이 아니라 범위·운영 위험·차단 이슈까지 서로 다른 책임으로 먼저 검토하기 위해서입니다.",
        },
        {
          title: "고정 발언을 반응형 토론으로 바꿨습니다.",
          reason: "순서대로 한 번씩 말하는 초기 방식은 협업이 아니었고, 다른 발언을 지지·보완·반박해야 판단이 연결됐기 때문입니다.",
        },
        {
          title: "실행 검증 뒤에만 수리하게 했습니다.",
          reason: "LLM의 자기평가 대신 실제 syntax·type·test 오류를 수리 입력으로 써야 완료 판정의 근거가 남기 때문입니다.",
        },
      ],
      validation: [
        { label: "Role boundaries", value: "6", note: "PM·Backend·Frontend·AI·Infra·Test" },
        { label: "Real verification", value: "3 tools", note: "node --check · tsc --noEmit · node --test" },
        { label: "Autonomous repair", value: "≤ 3", note: "실패 로그 기반 재작성·재검증 상한" },
      ],
      result:
        "역할 협업을 코드 생성에서 끝내지 않고 구조 검증·실행 검증·복구 경로까지 연결했습니다. 다만 역할 중심 구조의 한계는 다음 시스템을 설계하는 출발점이 됐습니다.",
      status: "Lab",
      scope: "solo",
    },
  },
  {
    slug: "ai-docent",
    title: "Digital Docent",
    subtitle: "Global AI Portfolio Docent",
    label: "Conversational AI",
    theme: "lab",
    problemQuestion: ["프로젝트가 많아질수록", "방문자는 왜 더 오래", "정보를 찾아야 할까?"],
    description:
      "방문자가 여러 프로젝트와 기술을 직접 뒤지지 않아도, 지금 보고 있는 페이지를 이해하고 포트폴리오의 근거를 찾아 대화로 안내하는 AI 도슨트입니다.",
    role: [
      "전역 대화 런타임과 라우트 간 상태 지속 설계",
      "PageContext와 대화 상태를 결합한 Hybrid RAG 설계",
      "BM25·Dense 검색, RRF 융합, 실패 폴백 구현",
      "LLM 스트리밍과 Supertonic·LAM 4D 음성 표현 통합",
    ],
    techStack: [
      "Next.js",
      "TypeScript",
      "BM25",
      "OpenAI text-embedding-3-small",
      "RRF Hybrid Retrieval",
      "LLM streaming",
      "Supertonic TTS",
      "LAM Audio-to-Expression",
      "React Three Fiber",
      "Vercel",
      "RunPod Serverless",
    ],
    media: {
      caption: "AI Docent — 페이지 맥락, 근거 검색, 대화, 음성, 3D 표정이 이어지는 전역 인터페이스",
    },
    highlights: [
      { label: "Context", value: "PageContext", description: "pathname과 현재 섹션을 질문 문맥으로 전달" },
      { label: "Retrieval", value: "Hybrid RAG", description: "BM25와 Dense 결과를 RRF로 융합" },
      { label: "Evaluation", value: "Hit@5 0.980", description: "production hybrid · curated eval set" },
      { label: "Voice", value: "Supertonic + LAM", description: "같은 합성 음원 기반 4D lip-sync" },
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
            "PageContext를 위치 힌트로만 사용하고, BM25 검색과 runtime query embedding을 병렬로 수행한 뒤 RRF로 순위를 융합합니다. 문서 embedding은 build time에 미리 계산하며, query embedding timeout이나 API 실패 시 BM25만으로 답합니다.",
          tech: ["BM25", "text-embedding-3-small", "RRF", "BM25 fallback"],
        },
        {
          title: "3. Retrieval → LLM",
          description:
            "대화 상태에서 primary·comparison 프로젝트를 추적해 짧은 후속 질문도 같은 근거에 연결합니다. 검색 evidence에 privacy·status guard를 적용해 비공개 정보와 근거 없는 질문을 막은 뒤 답변을 스트리밍합니다.",
          tech: ["Conversation-aware grounding", "Privacy/status guard", "LLM streaming"],
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
        title: "구어체와 짧은 후속 질문을 놓치던 lexical routing",
        summary:
          "정확한 기술명에 강한 BM25를 유지하면서 의미가 비슷한 표현을 찾는 Dense 검색을 결합했습니다.",
        problem:
          "BM25와 regex 중심 검색은 정확한 용어에는 강했지만 'armi프로젝트가 뭔데'를 unsupported로 처리하거나 '왜?'를 과도한 장문 의도로 분류했습니다.",
        investigation:
          "초기 baseline의 lexical 검색만으로는 표현이 달라진 구어체와 이전 대상을 생략한 짧은 질문을 안정적으로 같은 프로젝트에 연결하기 어려웠습니다.",
        solution:
          "BM25와 text-embedding-3-small 기반 Dense 결과를 RRF로 합치고, 대화 상태에서 primary·comparison 프로젝트를 추적했습니다. embedding 장애에는 BM25-only 경로를 남겼습니다.",
        result:
          "2026-10-01 Hybrid RAG를 production에 배포했고, curated 평가에서 wrong-project와 unsupported false positive가 각각 0으로 확인됐습니다.",
        tech: ["BM25", "Dense Embedding", "RRF", "Conversation state"],
      },
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
      "BM25 + Dense 검색과 RRF 융합을 production에 배포하고 embedding 장애에는 BM25 fallback을 유지합니다.",
      "PageContext는 힌트로만 쓰고 검색 evidence와 대화 상태를 결합해 프로젝트 간 후속 질문을 grounding합니다.",
      "텍스트 응답과 음성 준비를 분리해 음성을 켜지 않은 방문에는 워커 비용이 발생하지 않습니다.",
      "재생되는 소리와 입모양이 같은 합성 파일에서 나오도록 세그먼트마다 합성을 한 번으로 고정했습니다.",
    ],
    brief: {
      problem:
        "프로젝트가 늘수록 방문자가 역할·기술·문제 해결 근거를 직접 찾아야 했고, 짧은 후속 질문까지 현재 페이지와 대화 맥락에 맞게 해석하는 탐색 인터페이스가 필요했습니다.",
      role: {
        personal: [
          "전역 대화·PageContext·멀티턴 프로젝트 상태 설계",
          "BM25 + Dense Hybrid RAG와 RRF·fallback 구현",
          "LLM streaming, Supertonic TTS, LAM 4D lip-sync 운영 통합",
        ],
      },
      decisions: [
        {
          title: "PageContext는 힌트로만 사용했습니다.",
          reason: "화면 위치가 사실의 권위가 되면 잘못된 페이지 상태가 답을 오염하므로, 최종 답변은 검색 evidence로만 grounding하기 위해서입니다.",
        },
        {
          title: "BM25와 Dense를 함께 유지했습니다.",
          reason: "기술명 exact match는 BM25가 강하고 구어체·의미 질문은 Dense가 보완하므로 한쪽을 버리지 않고 RRF로 합쳤습니다.",
        },
        {
          title: "문서 embedding을 미리 계산했습니다.",
          reason: "runtime에는 query만 embedding해 검색 지연을 줄이고, timeout이나 API 실패에도 BM25로 답을 이어가기 위해서입니다.",
        },
      ],
      validation: [
        { label: "Hit@1 / Hit@3 / Hit@5", value: "0.647 / 0.912 / 0.980", note: "curated eval set · production hybrid" },
        { label: "MRR", value: "0.786", note: "curated eval set · production hybrid" },
        { label: "CONVO Hit@1", value: "0.70", note: "multi-turn curated evaluation" },
        { label: "Wrong-project", value: "0", note: "curated eval set" },
        { label: "Unsupported FP", value: "0", note: "curated eval set" },
      ],
      result:
        "Hybrid RAG와 BM25 장애 폴백을 production에 배포했고, 전역 대화의 근거 답변을 선택형 음성·한국어 4D lip-sync까지 연결했습니다.",
      status: "Production",
      scope: "solo",
    },
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
      "Structured LLM Output",
      "Zod",
      "Web Audio",
      "Server-only Story Data",
    ],
    media: {
      caption: "Crime Scene — 3D 탐색, 단서 수집, AI 심문, 증거 제시, 최종 추리",
    },
    highlights: [
      { label: "Truth", value: "Deterministic", description: "진실·비밀·알리바이는 서버 데이터가 소유" },
      { label: "Progression", value: "Evidence-driven", description: "LLM 판정은 핵심 진행 gate가 아님" },
      { label: "Interrogation", value: "Whitelist", description: "concededTopicIds와 허용 주제의 교집합만 반영" },
      { label: "Validation", value: "2 / 2", description: "다른 순서의 전체 플레이가 최종 추리에 도달" },
    ],
    architecture: {
      title: "탐색에서 심문과 추리까지, 플레이어의 증거가 다음 행동을 엽니다.",
      description:
        "사건의 진실과 진행 상태는 결정론 데이터가 소유하고, LLM은 최소 인물 설정으로 말투와 인정 주제만 다룹니다. 수집한 증거가 심문·사건 일지·최종 지목으로 이어집니다.",
      items: [
        {
          title: "Deterministic Truth Boundary",
          description: "truth·secret·alibi와 단서 상태는 서버 데이터에 고정하고, 브라우저와 모델에는 각 단계에 필요한 최소 정보만 전달합니다.",
          tech: ["Server-only data", "Bundle audit"],
        },
        {
          title: "3D Exploration → Evidence",
          description: "React Three Fiber 공간에서 오브젝트를 조사해 단서를 모으고, 증거 제시처럼 결과가 항상 같은 행동을 핵심 진행 경로로 둡니다.",
          tech: ["React Three Fiber", "Evidence state"],
        },
        {
          title: "Guarded AI Interrogation",
          description: "prompt injection과 메타 질문을 호출 전에 차단합니다. 모델의 { answer, concededTopicIds } 중 서버 whitelist와 겹치는 주제만 상태 전이에 반영합니다.",
          tech: ["Structured output", "concededTopicIds", "Whitelist"],
        },
        {
          title: "Case Log → Accusation",
          description: "확인된 사실·충돌·남은 의문을 사건 일지로 연결하고, 여러 조사 순서가 같은 핵심 사실과 최종 지목으로 수렴하게 합니다.",
          tech: ["Case log", "Multi-route design", "Accusation"],
        },
      ],
    },
    // Playground와 공유하는 개발 과정과 플레이 경험.
    troubleshooting: crimeSceneTroubles,
    result: [
      "2026-09-30 기준 3D 탐색·단서 수집·AI 자유심문·증거 제시·최종 추리의 V1 핵심 루프를 완성했습니다.",
      "모델이 전체 비밀을 알지 못하는 경계와 concededTopicIds whitelist로 자유 질문을 기존 단서 규칙에 연결했습니다.",
      "LLM 인정이 흔들려도 증거 기반 진행으로 수사가 막히지 않게 했습니다.",
      "Next (V2, planned): asset 품질, clue graph, NPC reaction, replayability, telemetry를 고도화할 계획입니다.",
    ],
    brief: {
      problem:
        "자유형 AI 심문을 열면서도 모델의 임의 답변이나 비밀 누출이 사건의 진실과 핵심 진행 조건을 바꾸지 않게 해야 했습니다.",
      role: {
        personal: [
          "R3F 3D 탐색과 증거 기반 수사 루프 구현",
          "결정론 truth·secret·alibi 및 단서 상태 설계",
          "구조화 심문·whitelist·prompt injection 방어 구현",
        ],
      },
      decisions: [
        {
          title: "LLM을 진행 gate에서 제외했습니다.",
          reason: "자연스러운 답변과 인정 판정은 별개였고, 비결정적 판정 하나가 핵심 경로를 막으면 플레이어가 이유 없이 멈추기 때문입니다.",
        },
        {
          title: "모델이 비밀을 덜 알게 했습니다.",
          reason: "금지 문구를 늘리는 것보다 범인·핵심 비밀·결정적 알리바이를 입력하지 않는 편이 prompt injection의 누출 면적을 줄이기 때문입니다.",
        },
        {
          title: "사건 일지를 추리의 중심에 뒀습니다.",
          reason: "단서 수가 아니라 사실→충돌→남은 의문→다음 조사로 이어지는 다리가 없어 플레이어가 방향을 잃었기 때문입니다.",
        },
      ],
      validation: [
        { label: "Full playthrough", value: "2 / 2", note: "서로 다른 조사 순서 · 모두 최종 추리 도달" },
        { label: "Interrogation tests", value: "85 (+26)", note: "구조화 자유심문 추가 후 · production build와 bundle verification 통과" },
        { label: "Secret string audit", value: "335", note: "브라우저 bundle 누출 검사" },
        { label: "Case-log regression", value: "194 → 240", note: "전체 수사 경로 확장 과정의 자동 테스트" },
      ],
      result:
        "비밀을 덜 아는 모델과 증거 기반 진행을 결합해 자유 질문이 흔들려도 끝까지 수사 가능한 V1 기준선을 완성했습니다.",
      status: "V1 · V2 planned",
      scope: "solo",
    },
  },
  {
    slug: "bcos",
    title: "BCOS",
    subtitle: "Task-centric AI Coding Orchestration",
    label: "Project Operating System",
    theme: "lab",
    problemQuestion: ["세션이 끝나도", "프로젝트의 결정과 검증은", "어떻게 이어질 수 있을까?"],
    description:
      "서로 다른 AI 개발 에이전트를 Task Contract와 프로젝트 소유 기록으로 연결하고, 구현·검증·리뷰의 경계를 명시적으로 운영하는 Project Operating System입니다.",
    role: [
      "Task Contract와 lifecycle 설계",
      "Manager·Worker·Reviewer 책임 경계 분리",
      "RFC / ADR와 append-only event audit 설계",
      "멀티모델 Worker 전환과 독립 검토 흐름 구현",
    ],
    techStack: ["Claude Code", "Codex CLI", "Gemini CLI", "Git", "RFC / ADR"],
    media: {
      caption: "BCOS — Task Contract에서 독립 리뷰와 프로젝트 메모리까지 이어지는 작업 생명주기",
    },
    highlights: [
      { label: "T-015", value: "APPROVED", description: "Multi-model Worker Switching 독립 리뷰" },
      { label: "Acceptance Criteria", value: "50/50", description: "v1 완료 판정 기준 통과" },
      { label: "Tests", value: "272/272", description: "최종 제품 범위 검증 통과" },
    ],
    architecture: {
      title: "작업 계약이 구현 세션을 열고, 독립 검토와 프로젝트 기록으로 닫힙니다.",
      description:
        "역할을 에이전트 이름이 아니라 Task Contract에 붙이고, 각 단계의 입력·책임·판정을 분리해 세션이 바뀌어도 작업 근거가 저장소에 남도록 설계했습니다.",
      items: [
        {
          title: "Task Contract",
          description: "목표·범위·Acceptance Criteria·읽기/쓰기·금지 경계를 명시해 Worker가 작은 컨텍스트로 작업하게 합니다.",
          tech: ["Task Role", "Context Package"],
        },
        {
          title: "Worker session",
          description: "구현 세션을 교체 가능한 Worker로 다루고, 현재 Task에 필요한 컨텍스트와 소유 범위만 전달합니다.",
          tech: ["Codex CLI", "Claude Code", "Gemini CLI"],
        },
        {
          title: "Host verification",
          description: "Worker의 자기 보고가 아니라 호스트가 Acceptance Criteria와 테스트 결과를 확인해 구현 증거를 남깁니다.",
          tech: ["Acceptance Criteria", "Tests"],
        },
        {
          title: "Independent review",
          description: "구현 세션과 리뷰 세션을 분리하고, 같은 Worker가 자신의 구현을 승인하지 못하게 합니다.",
          tech: ["Claude Reviewer", "No self-approval"],
        },
        {
          title: "Event audit & project memory",
          description: "상태 변경을 append-only event로 남기고 Architecture Rule·ADR·Known Pitfall 같은 재사용 지식을 Git에서 추적합니다.",
          tech: ["Git", "RFC / ADR", "Event audit"],
        },
      ],
    },
    troubleshooting: [
      {
        title: "구현 세션이 자신의 결과를 승인하던 문제",
        summary: "구현과 판정을 같은 컨텍스트에 두면 자기 승인과 판단 오염을 피하기 어려웠습니다.",
        problem: "구현을 수행한 Worker가 같은 세션에서 리뷰까지 맡으면 자신의 가정을 다시 의심하기 어렵고 승인 근거도 약해집니다.",
        investigation: "역할 이름을 나누는 것만으로는 충분하지 않았고, 실제 세션과 산출물 책임까지 분리해야 했습니다.",
        solution: "Codex 구현 세션과 Claude 독립 리뷰 세션을 분리하고, 최종 위험과 release는 Human이 승인하도록 경계를 고정했습니다.",
        result: "T-015가 independent review에서 APPROVED 판정을 받았고 AC 50/50을 통과했습니다.",
        tech: ["Session separation", "Independent Review", "Task Contract"],
      },
      {
        title: "동결된 Task 명세를 사후 수정할 수 없던 문제",
        summary: "dogfooding 중 발견한 명세 결함을 원본 훼손 없이 보완할 감사 가능한 절차가 필요했습니다.",
        problem: "완료 이력을 보존하려면 frozen Task를 조용히 수정할 수 없지만, 결함을 그대로 두면 다음 상태 전이가 막힙니다.",
        investigation: "원본 명세와 리뷰 근거를 유지하면서도 변경 사유와 승인자를 별도로 기록할 수 있어야 했습니다.",
        solution: "Human-approved Amendment를 추가하고 SUPERSEDED·last-verdict·BLOCKED semantics를 프로토콜에 반영했습니다.",
        result: "과거 계약을 덮어쓰지 않고 변경 이유와 상태 복구 과정을 event audit에 남길 수 있게 했습니다.",
        tech: ["Amendment", "Event Audit", "Lifecycle"],
      },
    ],
    result: [
      "2026-09-30 기준 v1 제품 범위를 Done으로 닫았습니다.",
      "T-015 독립 리뷰 APPROVED, Acceptance Criteria 50/50, tests 272/272를 기록했습니다.",
      "단일 에이전트 대비 비교 벤치마크는 완료 이후 계획 단계로 분리했습니다.",
    ],
    brief: {
      problem:
        "AI 개발 세션에 프로젝트 기억과 승인 근거를 맡기면 세션 교체 때 맥락이 끊기고, 구현자가 자신의 결과를 승인하는 문제가 생깁니다.",
      role: {
        personal: [
          "Task Contract와 명시적 lifecycle 설계",
          "구현·호스트 검증·독립 리뷰 경계 구현",
          "RFC / ADR, event audit, 프로젝트 메모리 구조화",
        ],
      },
      decisions: [
        {
          title: "역할을 Task에 붙였습니다.",
          reason: "에이전트 인스턴스가 아니라 목표·범위·합격 기준이 역할을 정의해야 Worker를 교체해도 계약이 유지되기 때문입니다.",
        },
        {
          title: "구현과 리뷰 세션을 분리했습니다.",
          reason: "같은 컨텍스트의 자기 승인과 구현 판단 오염을 막고 독립적인 품질 판정을 남기기 위해서입니다.",
        },
        {
          title: "기억을 저장소가 소유하게 했습니다.",
          reason: "채팅 원문이 아니라 재사용 가능한 결정·규칙·실패 기록을 Git에서 추적해 작은 컨텍스트로 이어서 일하기 위해서입니다.",
        },
      ],
      validation: [
        { label: "Independent review", value: "APPROVED", note: "T-015 Multi-model Worker Switching" },
        { label: "Acceptance Criteria", value: "50/50", note: "v1 완료 판정" },
        { label: "Tests", value: "272/272", note: "최종 제품 범위" },
      ],
      result:
        "2026-09-30 기준 v1 제품 범위를 Done으로 닫았습니다. 오케스트레이션과 단일 에이전트의 비교 벤치마크는 완료 이후 연구 계획으로 남겨 두었습니다.",
      status: "v1 Done",
      scope: "solo",
    },
  },
];

const projectOrder: ProjectDetail["slug"][] = [
  "ai-docent",
  "bcos",
  "armi",
  "crime-scene",
  "hangarae",
  "claw-dev",
  "wedding",
];

export const projectDetails: ProjectDetail[] = projectOrder.map((slug) => {
  const project = projectDetailEntries.find((item) => item.slug === slug);
  if (!project) throw new Error(`Missing project detail: ${slug}`);
  return project;
});

export function getProjectDetail(slug: string) {
  return projectDetails.find((project) => project.slug === slug);
}
