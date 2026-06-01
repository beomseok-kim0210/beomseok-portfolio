export const armiScreens = [
  {
    title: "Patient Tablet App",
    description:
      "환자 앱의 음성 요청, 미션 상태, 간호사 호출 흐름을 담는 화면입니다.",
    src: "/images/armi/tablet-app-placeholder.png",
    alt: "Patient tablet app screen",
    height: "h-[640px]",
  },
  {
    title: "Watch Alert",
    description:
      "의료진이 긴급 호출을 빠르게 인지하고 상태를 처리하는 WearOS 화면입니다.",
    src: "/images/armi/watch-alert-placeholder.png",
    alt: "Galaxy Watch alert screen",
    height: "h-[308px]",
  },
  {
    title: "Responsive Avatar UI",
    description:
      "듣는 중, 말하는 중, 이동 중 상태를 시각화한 반응형 Avatar UI입니다.",
    src: "/images/armi/avatar-ui-placeholder.png",
    alt: "Responsive avatar UI screen",
    height: "h-[308px]",
  },
] as const;

export const armiStateGroups = [
  {
    step: "STEP 01",
    title: "LISTEN",
    nodes: ["Idle", "Wake Word", "Speaker Verification", "STT Listening"],
    rule: "듣는 상태에서는 말하지 않는다.",
  },
  {
    step: "STEP 02",
    title: "RESPOND",
    nodes: ["AI Thinking", "TTS Speaking", "STT Disabled"],
    rule: "말하는 상태에서는 듣지 않는다.",
  },
  {
    step: "STEP 03",
    title: "ACT",
    nodes: ["Mission Running", "Robot / Nurse Call", "Completed"],
    rule: "미션 중에는 새 요청보다 현재 상태를 우선한다.",
  },
] as const;

export const armiRealtimeSteps = [
  "REST 요청 생성",
  "WebSocket 연결 확인",
  "Tablet Topic 구독",
  "Session Topic 구독",
  "Mission / AI / NurseCall 이벤트 수신",
] as const;

export const armiInteractionDecisions = [
  {
    title: "TTS 중 STT 차단",
    problem: "AI가 자기 목소리를 다시 인식했습니다.",
    decision: "speaking 상태에서는 STT loop를 중지했습니다.",
    result: "응답 중 self-trigger를 막았습니다.",
  },
  {
    title: "직접 입력과 음성 입력 분리",
    problem: "텍스트 입력 중에도 음성 loop가 상태를 바꿨습니다.",
    decision: "direct input mode와 voice conversation mode를 분리했습니다.",
    result: "입력 경로가 서로의 UI 상태를 흔들지 않게 했습니다.",
  },
  {
    title: "미션 중 중복 요청 방지",
    problem: "로봇 미션 중 새 요청이 들어오면 상태가 충돌했습니다.",
    decision: "mission running에서는 현재 미션 상태를 우선했습니다.",
    result: "사용자가 지금 가능한 행동을 명확히 볼 수 있었습니다.",
  },
  {
    title: "긴급 호출 알림 정책",
    problem: "초기 호출 목록까지 새 알림처럼 진동할 수 있었습니다.",
    decision: "initial load와 new pending request를 분리했습니다.",
    result: "필요한 순간에만 알림 강도를 적용했습니다.",
  },
] as const;

export const armiTroubleshooting = [
  {
    category: "01 Audio Ownership",
    title: "마이크를 동시에 쓰는 기능들이 충돌했습니다.",
    diagnosis: "문제는 STT 정확도가 아니라 마이크 소유권 충돌이었습니다.",
    before: "Wake Word / STT / Speaker Verification / TTS가 동시에 마이크 접근",
    cause: "SpeechRecognizer와 AudioRecord가 같은 입력 자원을 요구",
    after:
      "Wake Word → Verification Capture → STT Listen → TTS Speaking → STT Restart",
    summary: {
      problem: "동시에 마이크를 요구하는 기능이 3개였습니다.",
      reframe: "정확도 문제가 아니라 Audio Ownership 문제였습니다.",
      solution: "마이크 사용 순서를 상태 머신으로 제한했습니다.",
      result: "음성 흐름을 하나의 제어 가능한 loop로 정리했습니다.",
    },
    tech: ["SpeechRecognizer", "AudioRecord", "Speaker Verification", "Audio Ownership"],
  },
  {
    category: "02 Conversation Loop",
    title: "AI가 말하는 중에 다시 듣거나, 말한 뒤 듣지 못했습니다.",
    diagnosis: "TTS 완료 이벤트가 다음 listening 상태의 기준이 되어야 했습니다.",
    before: "TTS Speaking → STT Listening → Self Voice Detected",
    cause: "AI 음성과 사용자 음성을 구분하기 전에 listening이 먼저 켜짐",
    after: "TTS Start → speaking=true → STT Disabled → onDone → STT Restart",
    summary: {
      problem: "앱이 자기 목소리를 사용자 입력으로 인식했습니다.",
      reframe: "STT 문제가 아니라 대화 상태 전환 문제였습니다.",
      solution: "UtteranceProgressListener.onDone 이후에만 STT를 재시작했습니다.",
      result: "AI 응답과 사용자 입력의 경계를 분리했습니다.",
    },
    tech: ["TextToSpeech", "UtteranceProgressListener", "STT Loop"],
  },
  {
    category: "03 Realtime Subscription",
    title: "연결은 됐지만 이벤트를 받지 못했습니다.",
    diagnosis: "Connected 상태와 Subscribed 상태를 분리해야 했습니다.",
    before: "WebSocket Connected = Ready",
    cause: "Reconnect 이후 Topic 재구독이 보장되지 않음",
    after: "Connected + Tablet Topic + Session Topic = Realtime Ready",
    summary: {
      problem: "연결 성공 후에도 이벤트가 누락됐습니다.",
      reframe: "네트워크 문제가 아니라 구독 상태 문제였습니다.",
      solution: "connection state와 subscription state를 분리했습니다.",
      result: "reconnect 이후 이벤트 복구 기준이 명확해졌습니다.",
    },
    tech: ["STOMP WebSocket", "Topic Subscription", "Reconnect"],
  },
  {
    category: "04 Alert Policy",
    title: "긴급 호출이 알림 폭탄이 될 수 있었습니다.",
    diagnosis: "최초 로드와 신규 호출을 구분해야 했습니다.",
    before: "Existing Pending Calls → Vibration",
    cause: "처음 불러온 데이터와 새 이벤트를 같은 알림으로 처리",
    after:
      "Initial Load = No Vibration\nNew Emergency = Strong Vibration\nNew Normal = Light Vibration",
    summary: {
      problem: "기존 호출 목록 전체가 진동 알림이 될 수 있었습니다.",
      reframe: "알림 도착 여부가 아니라 신규 이벤트 여부가 중요했습니다.",
      solution: "initial load와 new pending request를 분리했습니다.",
      result: "필요한 순간에만 알림이 울리도록 정책을 정리했습니다.",
    },
    tech: ["WearOS", "Notification Policy", "Initial Load"],
  },
] as const;

export const armiResults = [
  {
    title: "State First",
    description: "기능보다 상태 전환을 먼저 설계했습니다.",
  },
  {
    title: "Ownership First",
    description:
      "마이크, 연결, 알림처럼 공유 자원을 누가 점유하는지 먼저 정의했습니다.",
  },
  {
    title: "Recovery First",
    description: "연결 성공보다 끊긴 뒤 복구 기준을 설계했습니다.",
  },
  {
    title: "User Safety First",
    description:
      "의료 알림은 많이 보내는 것보다 정확한 강도로 보내는 것이 중요했습니다.",
  },
] as const;

export const armiTechGroups = [
  {
    title: "Voice",
    items: [
      "Android SpeechRecognizer",
      "AudioRecord",
      "TextToSpeech",
      "CAMPPlus",
      "Sherpa-ONNX",
    ],
  },
  {
    title: "Frontend",
    items: [
      "Flutter",
      "MethodChannel",
      "State Machine",
      "Responsive HTML",
      "Avatar UI",
    ],
  },
  {
    title: "Realtime",
    items: [
      "STOMP WebSocket",
      "Reconnect",
      "Topic Subscription",
      "REST API",
    ],
  },
  {
    title: "Robot",
    items: ["gRPC", "Spring Boot", "Robot State Event"],
  },
  {
    title: "Watch",
    items: ["WearOS", "Kotlin", "Notification", "FCM"],
  },
] as const;
