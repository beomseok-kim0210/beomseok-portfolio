export const docentStarterQuestions = [
  "어떤 프로젝트를 만들었나요?",
  "ARMI가 뭔가요?",
  "어떤 기술을 다루나요?",
  "Tell me about yourself",
] as const;

export const docentCopy = {
  label: "AI Docent",
  heading: "포트폴리오에게\n직접 물어보세요",
  subheading:
    "Google GNM 파라메트릭 헤드 모델과 GPT API로 만든 3D 도슨트입니다. 지금 보고 있는 페이지를 알고, 포트폴리오에서 근거를 찾아 답합니다. 김범석의 프로젝트, 기술, 여정에 대해 무엇이든 물어보세요.",
  inputPlaceholder: "궁금한 것을 물어보세요…",
  listeningPlaceholder: "듣고 있어요… 말씀해 주세요",
  demoBadge: "데모 모드",
  demoNotice: "지금은 사전 준비된 답변으로 동작하는 데모 모드입니다.",
  evidenceBadge: "근거 발췌",
  evidenceNotice: "포트폴리오에서 검색한 근거를 그대로 읽어 드리는 모드입니다. LLM 답변은 아직 연결되지 않았습니다.",
} as const;

export const docentConfig = {
  maxInputLength: 500,
  maxHistoryMessages: 8,
  maxTokens: 2048,
  rateLimit: { windowMs: 60_000, maxRequests: 10 },
  /**
   * 음성 세그먼트 합성, IP 당 분당 20 회.
   *
   * 한 답변은 140 자 세그먼트로 나뉜다 — 300~500 자 답변이면 3~4 개. 합성은 한 번에
   * 하나, 재생 중에 다음 하나만 미리 하므로 한 턴의 요청은 곧 세그먼트 수다. 평범한
   * 대화 세 턴(300~600 자)이 1 분 안에 몰려도 12 회 안쪽이다. 20 은 그만큼의 여유를
   * 두면서, 한 클라이언트가 분당 GPU 작업을 20 개 넘게 밀어 넣지는 못하게 한다.
   * 세그먼트 하나가 약 20 초 분량이라 정상 재생은 분당 3 개 남짓밖에 소비하지 못한다.
   */
  voiceRateLimit: { windowMs: 60_000, maxRequests: 20 },
  /**
   * 워커 예열, IP 당 분당 10 회. 클라이언트가 진행 중인 예열과 10 초 안의 성공 결과를
   * 재사용하므로 한 턴에 많아야 한 번 나간다. 예전과 같은 수치를, 채팅과 떼어 따로 센다.
   */
  warmRateLimit: { windowMs: 60_000, maxRequests: 10 },
} as const;
