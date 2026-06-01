export const armiScreens = [
  {
    title: "Patient Tablet App",
    description:
      "환자가 음성 요청, 미션 진행, 간호사 호출 상태를 확인하는 메인 인터페이스입니다.",
    src: "/images/armi/tablet-app-placeholder.png",
    alt: "Patient tablet app screen",
    height: "h-[640px]",
  },
  {
    title: "Watch Alert",
    description:
      "의료진이 Galaxy Watch에서 긴급 호출을 확인하고 상태를 처리하는 화면입니다.",
    src: "/images/armi/watch-alert-placeholder.png",
    alt: "Galaxy Watch alert screen",
    height: "h-[308px]",
  },
  {
    title: "Responsive Avatar UI",
    description:
      "HTML 기반 Avatar 상태 화면을 반응형으로 구성하여 듣는 중, 말하는 중, 움직이는 중 등의 상태를 시각화했습니다.",
    src: "/images/armi/avatar-ui-placeholder.png",
    alt: "Responsive avatar UI screen",
    height: "h-[308px]",
  },
] as const;

export const armiStateNodes = [
  { title: "Idle", description: "기본 대기 상태" },
  { title: "Wake Word", description: "“아미야” 감지" },
  { title: "Speaker Verification", description: "등록 사용자 여부 검증" },
  { title: "Listening", description: "사용자 요청 STT 처리" },
  { title: "Thinking", description: "AI Agent 응답 생성" },
  { title: "Speaking", description: "TTS 출력, STT 차단" },
  { title: "Mission Running", description: "로봇 미션 또는 간호사 호출 진행" },
  { title: "Completed", description: "미션 종료 후 다음 입력 대기" },
] as const;

export const armiRealtimeNodes = [
  { title: "Patient App", detail: "Tablet UI" },
  { title: "Backend", detail: "Session + Event Router" },
  { title: "Control PC", detail: "Robot Command Bridge" },
  { title: "Backend", detail: "Robot State Relay" },
  { title: "Tablet App", detail: "STOMP Subscriber" },
  { title: "Galaxy Watch", detail: "Emergency Alert" },
] as const;

export const armiRealtimeLinks = [
  "REST request",
  "gRPC SubmitTask",
  "Robot State",
  "STOMP WebSocket",
  "Emergency Alert",
] as const;

export const armiInteractionDecisions = [
  {
    title: "TTS 중 STT 차단",
    before:
      "AI가 말하는 도중 앱이 자기 목소리를 다시 인식했습니다.",
    decision:
      "speaking 상태에서는 STT loop를 멈추고, TTS 완료 콜백 이후에만 listening으로 복귀했습니다.",
    impact:
      "오디오 출력과 입력을 동시에 열지 않도록 해서 self-trigger를 막고 상태 전환 기준을 명확히 했습니다.",
  },
  {
    title: "직접 입력과 음성 입력 분리",
    before:
      "키보드 입력 중에도 음성 루프가 살아있어 상태가 꼬일 수 있었습니다.",
    decision:
      "direct input mode와 voice conversation mode를 분리했습니다.",
    impact:
      "텍스트 입력 중에는 마이크 상태를 아예 비활성화해 서로 다른 입력 경로가 UI를 동시에 건드리지 않게 했습니다.",
  },
  {
    title: "미션 진행 중 중복 요청 방지",
    before:
      "로봇 미션 중 다시 요청하면 충돌 상태가 발생할 수 있었습니다.",
    decision:
      "mission running 상태에서는 새 요청보다 현재 미션 상태 표시를 우선했습니다.",
    impact:
      "버튼, 음성 요청, 상태 배지를 같은 정책으로 잠가서 사용자가 지금 가능한 행동을 명확히 이해할 수 있게 했습니다.",
  },
  {
    title: "긴급 호출 알림 중복 방지",
    before:
      "Watch 최초 로드 시 기존 호출 전체가 진동 알림으로 처리될 수 있었습니다.",
    decision:
      "initial load와 new pending request를 분리했습니다.",
    impact:
      "서버 데이터 동기화와 실제 신규 이벤트를 구분해 알림 정책을 UI와 디바이스 진동까지 일관되게 맞췄습니다.",
  },
] as const;

export const armiTroubleshooting = [
  {
    number: "01",
    title: "마이크를 동시에 쓰는 기능들이 충돌하던 문제",
    summary: "마이크 충돌 문제가 아니라 Audio Ownership 문제였습니다.",
    problem:
      "Wake Word, STT, 발화자 검증, TTS 전환이 서로 다른 타이밍에 마이크를 잡으면서 실패가 재현됐습니다. SpeechRecognizer, AudioRecord, Speaker Verification이 동시에 자원을 요구하는 구조였습니다.",
    reframing:
      "여러 기능이 겹친 것이 아니라, 한 시점에 누가 오디오 소유권을 갖는지 정의되지 않은 상태였습니다.",
    solution:
      "마이크 접근 순서를 Wake Word → Verification Capture → STT Listen → TTS Speaking → STT Restart로 고정했습니다. 상태 전환 외의 직접 호출은 막았습니다.",
    result:
      "음성 기능을 개별 API 호출이 아니라 단일 오디오 소유 흐름으로 다루면서 재현이 쉬워지고 충돌 빈도를 크게 줄였습니다.",
    tech: ["SpeechRecognizer", "AudioRecord", "Speaker Verification", "Audio Ownership"],
  },
  {
    number: "02",
    title: "AI가 말하는 중에 다시 듣거나, 말한 뒤 듣지 못하던 문제",
    summary: "TTS 완료 이벤트를 다음 상태 전환 기준으로 삼았습니다.",
    problem:
      "TTS 시작만 보고 listening을 재개하면 자기 목소리를 다시 인식했고, 반대로 너무 늦게 켜면 사용자의 다음 요청을 놓쳤습니다.",
    reframing:
      "언제 STT를 다시 시작할지에 대한 감각적 판단이 아니라, 명확한 완료 이벤트가 필요한 상태 전환 문제였습니다.",
    solution:
      "TTS Start에서 speaking=true로 전환하고 STT를 비활성화했습니다. UtteranceProgressListener.onDone 이후에만 STT를 재시작했습니다.",
    result:
      "self voice detection을 막으면서도 다음 입력 대기 타이밍을 안정적으로 맞출 수 있었습니다.",
    tech: ["TextToSpeech", "UtteranceProgressListener", "State Transition"],
  },
  {
    number: "03",
    title: "연결은 됐지만 이벤트를 받지 못하던 문제",
    summary: "연결 상태와 구독 상태를 분리했습니다.",
    problem:
      "WebSocket이 connected여도 실제 UI는 session 이벤트를 받지 못하는 경우가 있었습니다. 특히 재연결 직후 topic 재구독 누락이 원인이었습니다.",
    reframing:
      "연결 성공을 실시간 준비 완료로 착각한 것이 문제였습니다. Realtime Ready는 연결과 구독이 모두 살아있을 때만 성립합니다.",
    solution:
      "connection state와 subscription state를 별도로 기록했습니다. `/topic/tablets/{tabletId}`와 `/topic/tablets/{tabletId}/sessions/{sessionId}` 구독 여부를 각각 추적했습니다.",
    result:
      "이벤트 누락이 네트워크 문제인지, topic 누락 문제인지 바로 구분할 수 있게 됐고 재구독 정책도 분명해졌습니다.",
    tech: ["STOMP WebSocket", "Topic Subscription", "Reconnect", "Session Topic"],
  },
  {
    number: "04",
    title: "긴급 호출이 알림 폭탄이 되지 않게 해야 했던 문제",
    summary:
      "의료 알림은 많이 보내는 것이 아니라 필요한 순간에 필요한 강도로 전달되어야 했습니다.",
    problem:
      "Watch 최초 로드 시 과거 pending call까지 모두 새 알림처럼 처리하면 의료진은 중요한 신규 호출을 구분하기 어려웠습니다.",
    reframing:
      "알림이 도착했느냐가 아니라, 지금 울려야 하는 이벤트인지 분류하는 정책 문제였습니다.",
    solution:
      "initial load는 진동 없이 상태 동기화만 수행했습니다. new pending request만 강한 진동, 일반 요청은 약한 진동으로 분리했습니다.",
    result:
      "기존 데이터 동기화와 실제 긴급 알림을 분리해 Watch 경험이 훨씬 덜 피로하고 더 신뢰 가능해졌습니다.",
    tech: ["WearOS", "Notification Policy", "Initial Load", "Pending Request"],
  },
] as const;

export const armiResults = [
  {
    label: "Voice State Machine",
    title: "음성 기능을 독립 기능이 아니라 상태 머신으로 재정의",
    description:
      "Wake Word, STT, Speaker Verification, TTS를 하나의 오디오 소유 흐름으로 묶어 전환 기준을 분명히 했습니다.",
  },
  {
    label: "Realtime Subscription Model",
    title: "connection state와 subscription state 분리",
    description:
      "연결 성공만으로 준비 완료를 판단하지 않고 topic 구독 상태까지 별도로 추적했습니다.",
  },
  {
    label: "Watch Alert Policy",
    title: "initial load와 new request 분리",
    description:
      "과거 호출 동기화와 실제 신규 긴급 알림을 구분해 진동 정책을 다르게 적용했습니다.",
  },
  {
    label: "Frontend UX Ownership",
    title: "환자 앱, Watch, Avatar UI를 상태 흐름으로 연결",
    description:
      "서로 다른 화면이 같은 이벤트 모델을 공유하도록 설계해 UI 분기와 실시간 상태를 한 흐름으로 맞췄습니다.",
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
