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
    title: "마이크 하나를 여러 음성 기능이 나눠 써야 했습니다.",
    diagnosis:
      "문제는 발화자 검증 모델의 정확도가 아니라, 같은 마이크 자원을 여러 기능이 어떻게 공유하는가였습니다.",
    cause:
      "웨이크워드 감지·발화자 검증(CAMPPlus)·STT가 모두 마이크 입력을 필요로 해, 동일한 마이크 자원을 순차적으로 써야 했습니다.",
    summary: {
      problem:
        "초기엔 발화자 검증 모델 정확도 문제처럼 보였지만, 실제 원인은 웨이크워드·발화자 검증·STT가 같은 마이크를 공유해야 하는 구조였습니다.",
      solution:
        "웨이크워드 감지 후 웨이크워드 엔진이 마이크를 해제하고, AudioRecord로 음성을 한 번만 캡처한 뒤 그 음성으로 Speaker Verification(CAMPPlus) → Google Cloud STT를 순차 수행하도록 파이프라인을 재설계했습니다. 동시에 마이크를 점유하는 기능이 없도록 상태 플래그(isWakeWordHandling·isConversationMode·isNativeListening 등)로 전환을 제어했습니다.",
      result:
        "웨이크워드·발화자 검증·STT·TTS가 하나의 연속된 음성 파이프라인으로 연결돼, 마이크 충돌 없이 한 번 수집한 음성을 검증과 인식이 함께 쓰는 구조가 됐습니다.",
    },
    insight:
      "음성 AI에서 중요한 것은 좋은 모델을 쓰는 게 아니라, 마이크라는 하나의 자원을 여러 기능이 안정적으로 공유하도록 설계하는 것이다.",
    approaches: [
      "발화자 검증·STT 모델의 threshold·정확도를 조정한다",
      "마이크 소유권 기준으로 음성 파이프라인을 재설계한다 (웨이크워드 해제 → 단일 AudioRecord 캡처 → 검증·STT 순차)",
    ],
    rationale:
      "음성이 너무 짧거나 캡처 타이밍이 안 맞거나 마이크 입력이 불안정하면, 모델 성능과 무관하게 검증 정확도가 떨어졌습니다. threshold 조정보다 '안정적인 입력을 확보하는 흐름'이 더 중요하다고 보고, 한 번 캡처한 음성을 발화자 검증과 STT가 순차로 쓰도록 정리했습니다.",
    tech: [
      "AudioRecord",
      "Google Cloud STT",
      "CAMPPlus Speaker Verification",
      "Sherpa-ONNX",
      "Flutter MethodChannel",
    ],
  },
  {
    category: "02 Conversation Loop",
    title: "AI가 말하는 중에 다시 듣거나, 말한 뒤 듣지 못했습니다.",
    diagnosis:
      "TTS 완료는 '단순 재생 종료'가 아니라, 다음 음성 입력으로 넘어갈지 판단하는 기준이어야 했습니다.",
    cause:
      "TTS가 끝나기 전 STT가 켜지면 기기가 자기 응답을 다시 인식했고, 직접 입력 중 자동 listening이 끼어들거나 대화 모드 종료 후에도 음성 루프가 남는 혼선이 있었습니다.",
    summary: {
      problem:
        "말하기와 듣기의 타이밍이 어긋나 자기 음성 재인식·대화 끊김·입력 모드 혼선이 동시에 생길 수 있었습니다.",
      solution:
        "TTS 완료(UtteranceProgressListener) 콜백을 다음 상태 판단 기준으로 삼아 speaking 중에는 STT를 막고, '텍스트 입력 모드'와 '음성 대화 모드'를 분리해 같은 완료 이벤트라도 현재 모드에 따라 listening 재시작 여부를 다르게 판단하도록 흐름을 정리했습니다.",
      result:
        "TTS·STT·아바타 상태·대화 모드를 분리된 기능이 아니라 하나의 상태 머신으로 보고, 출력과 입력이 서로를 침범하지 않는 전환 기준을 세웠습니다.",
    },
    insight:
      "TTS는 단순 음성 출력이 아니라 '다음 상태 전환을 결정하는 트리거'다 — 말하기와 듣기는 동시에 켜지면 안 된다.",
    approaches: [
      "에코 캔슬·음성 필터로 자기 목소리를 걸러낸다",
      "TTS 완료 콜백을 기준으로 speaking 중 STT를 막고, 입력 모드별로 재시작을 분기한다",
    ],
    rationale:
      "필터링은 기기·환경마다 결과가 흔들려 신뢰하기 어려웠습니다. 반면 TTS 완료 콜백은 '말이 끝난 시점'이라는 결정적 기준이고, 텍스트/음성 모드에 따라 후속 동작을 다르게 줄 수 있어 더 안정적이라 판단했습니다.",
    tech: ["TextToSpeech", "UtteranceProgressListener", "Flutter MethodChannel"],
  },
  {
    category: "03 Realtime Subscription",
    title: "연결은 됐지만 이벤트를 받지 못했습니다.",
    diagnosis: "WebSocket의 '연결됨'과 '이벤트를 받을 수 있음'은 다른 상태였습니다.",
    cause:
      "연결이 성공해도 topic 구독이 끝나야 이벤트가 왔고, 재연결 후 이전 구독이 자동 유지된다고 가정할 수 없었습니다. 게다가 태블릿 단위·세션 단위 topic이 함께 있어 세션이 바뀌면 구독도 갈아끼워야 했습니다.",
    summary: {
      problem:
        "연결 성공을 'Ready'로 착각하면, 재연결·세션 변경 이후 구독이 누락돼 환자 요청·미션 이벤트가 화면에 반영되지 않을 수 있었습니다.",
      solution:
        "connectionState(connecting·connected·reconnecting·failed)와 subscriptionState(subscribing·subscribed·resubscribing)를 분리하고, 태블릿·세션 단위 topic을 구분해 재연결 시 현재 tabletId·활성 sessionId 기준으로 필요한 구독을 복원하는 기준을 정리했습니다.",
      result:
        "'연결됨'과 '받을 준비됨'을 분리해, 끊겼다 복구되거나 세션이 바뀌어도 같은 실시간 상태로 돌아오는 복구 기준을 세웠습니다.",
    },
    insight:
      "실시간 통신에서 중요한 건 연결 자체가 아니라 끊겼을 때 같은 상태로 어떻게 복구하는가다 — 재연결보다 재구독 전략이 더 중요할 수 있다.",
    approaches: [
      "재연결될 때마다 무조건 모든 topic을 재구독한다",
      "연결 상태와 구독 상태를 분리하고, 활성 식별자(tabletId·sessionId) 기준으로 필요한 구독만 복원한다",
    ],
    rationale:
      "연결 성공과 이벤트 수신 가능은 별개의 상태였습니다. 무조건 재구독은 중복 구독 위험이 있어, 두 상태를 분리하고 '지금 무엇을 구독해야 하는가'를 활성 식별자 기준으로 판단해 그 구독만 복원하는 방향을 택했습니다.",
    tech: ["STOMP WebSocket", "Topic Subscription", "Reconnect", "Spring Boot"],
  },
  {
    category: "04 Tech Decision",
    title: "더 나은 웨이크워드 기술을 검토하다, 도입을 멈췄습니다.",
    diagnosis:
      "문제는 '구현할 수 있는가'가 아니라 '지금 안정적으로 시연 가능한가'였습니다.",
    cause:
      "초기 웨이크워드는 SpeechRecognizer 결과에서 '아미야' 문자열을 찾는 방식이라 오탐·미탐·발음 변화에 취약했습니다.",
    summary: {
      problem:
        "STT 문자열 매칭 웨이크워드는 인식 오류가 나면 웨이크워드도 함께 실패하고, 실제 KWS 엔진처럼 민감도·오탐을 제어할 수 없었습니다.",
      solution:
        "Sherpa-ONNX KeywordSpotter(KWS) 전환을 검토했지만, AAR에 클래스만 있고 KWS 모델·tokens·keywords 자산이 없어 시연 동작을 보장할 수 없다고 판단해 도입을 중단하고 검증된 범위를 유지했습니다.",
      result:
        "'클래스가 있다 = 구현 가능'이 아니라는 기준을 세우고, 무리한 도입 대신 안정성을 택해 시연 신뢰성을 지켰습니다.",
    },
    insight:
      "기술적으로 가능해 보이는 것과 지금 프로젝트에 안정적으로 적용 가능한 것은 다르다 — 기술 도입뿐 아니라 '중단'도 개발자의 중요한 판단이다.",
    approaches: [
      "SpeechRecognizer 문자열 매칭 웨이크워드를 유지·보정한다",
      "Sherpa-ONNX KeywordSpotter(KWS) 엔진으로 전환한다",
    ],
    rationale:
      "KWS 전환은 민감도·오탐 제어 면에서 분명히 우수했지만, 모델·tokens·keywords 자산이 없으면 코드가 컴파일돼도 시연에서 동작하지 않을 위험이 컸습니다. 자산과 안정성이 부족한 상태의 도입은 리스크가 더 크다고 판단해 중단했습니다.",
    tech: ["Sherpa-ONNX", "Keyword Spotting", "SpeechRecognizer", "기술 검증"],
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

export const armiRecap = {
  definition:
    "ARMI는 환자의 음성 요청을 AI Agent가 판단해 답변·로봇 동작·웹 검색·기억 조회로 연결하는 병상 보조 로봇입니다. 저는 AI Agent 라우팅과 음성 입력 흐름, 역할별 화면 설계를 맡았습니다.",
  takeaways: [
    { label: "Audio Ownership", note: "마이크를 누가 언제 쓰는지부터 정리했습니다." },
    { label: "Conversation Loop", note: "말하기와 듣기 사이를 상태로 끊고 이었습니다." },
    {
      label: "Realtime Subscription",
      note: "연결이 아니라 구독 상태를 기준으로 복구를 잡았습니다.",
    },
  ],
  reflection: [
    "처음에는 좋은 모델만 붙이면 음성 서비스가 동작할 거라고 생각했습니다. 그런데 실제로 부딪힌 문제들은 모델 성능이 아니라, 마이크라는 하나의 자원을 여러 기능이 어떻게 나눠 쓰는지, 말하기와 듣기를 언제 끊고 이을지, 끊긴 연결을 어떻게 같은 상태로 되돌릴지 같은 '상태와 자원 관리'였습니다.",
    "그래서 STT·TTS·발화자 검증·WebSocket을 따로 보지 않고 하나의 상태 머신처럼 바라보게 됐습니다. AI Agent도 답변을 만드는 기능이 아니라, 사용자의 요청을 실행 가능한 작업으로 분류해 알맞은 시스템에 연결하는 판단 레이어로 설계했습니다.",
    "이 프로젝트 이후로는 기능 하나하나보다 전체 시스템 구조와 상태 흐름을 먼저 보는 습관이 생겼습니다.",
  ],
} as const;
