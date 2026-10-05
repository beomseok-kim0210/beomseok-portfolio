/** Repo evidence, not a reconstruction of the original frontend source. */
export const productEvidence = {
  video: "/videos/Patient%20Tablet%20App.mp4",
  poster: "/images/armi/patient-tablet-original.png",
  returnPoster: "/images/armi/patient-tablet-conversation-original.png",
  aspect: 1728 / 1080,
  source: "src/components/project/armi/ArmiProductScreens.tsx",
} as const;

// Future passes must use these documented routes, not infer branches from artwork.
export const documentedRoutes = ["Text Answer", "Tavily Search", "Memory Retrieval", "Robot Action"] as const;
export const entryPhases = [
  { id: "entry", label: "01 / PRODUCT", title: "Voice becomes action.", text: "당신의 말이 들어가는 곳." },
  { id: "voice", label: "02 / BECOME THE REQUEST", title: "당신의 말이, 하나의 요청으로.", text: "스크롤을 따라 음성과 함께 이동합니다." },
  { id: "approach", label: "03 / APPROACH", title: "요청과 함께 제품에 접근합니다.", text: "실제 ARMI 환자 앱이 시스템의 입구가 됩니다." },
  { id: "enter", label: "04 / ENTER PRODUCT", title: "인터페이스 너머로.", text: "같은 요청을 따라 제품 뒤의 공간으로 진입합니다." },
] as const;
export function entryPhase(progress: number) {
  return progress < .18 ? 0 : progress < .4 ? 1 : progress < .7 ? 2 : 3;
}
export function interval(value: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}
export function ease(value: number) { return value * value * (3 - 2 * value); }

// PASS 1 occupies the first .32 of the extended clock; its local timing is unchanged.
export const entryEnd = .32;
export const entryLocal = (progress: number) => interval(progress, 0, entryEnd);
export const journeyPhases = [
  ...entryPhases,
  { id: "stt", label: "03 / UNDERSTAND · GOOGLE CLOUD STT", title: "VOICE → REQUEST", text: "음성이 시스템이 해석할 수 있는 요청으로 정돈됩니다." },
  { id: "routing", label: "04 / ROUTING · LANGGRAPH", title: "하나의 요청. 네 가지 방향.", text: "답변·검색·기억 조회·로봇 행동 중 실행 경로를 판단합니다." },
  { id: "decision", label: "05 / DECISION · TEXT ANSWER", title: "ROUTE SELECTED", text: "이번 설명용 여정은 답변 경로를 따릅니다." },
  { id: "travel", label: "06 / TRAVEL · TEXT ANSWER", title: "선택한 경로를 따라.", text: "요청이 앞서가고, 우리는 그 경로 안으로 이동합니다." },
  { id: "result", label: "07 / RESULT · STRUCTURED RESPONSE", title: "요청에서 응답으로.", text: "같은 신호가 펼쳐지고, 제품에 전달할 형태로 모입니다." },
  { id: "return", label: "08 / RETURN · PATIENT TABLET APP", title: "응답이 사용자의 화면으로.", text: "들어왔던 같은 제품 표면으로 돌아갑니다." },
  { id: "product", label: "08 / RETURN · ACTUAL PRODUCT RECORDING", title: "이 화면 뒤의 여정을 지나왔습니다.", text: "원본 시연의 대화 모드입니다. 내부 여정은 설명용 시각화입니다." },
] as const;
export function journeyPhase(progress: number) {
  if (progress < entryEnd) return entryPhase(entryLocal(progress));
  return progress < .43 ? 4 : progress < .60 ? 5 : progress < .70 ? 6 : progress < .84 ? 7 : progress < .92 ? 8 : progress < .985 ? 9 : 10;
}
// A recording state, not proof that this particular recording request took Text Answer.
export const returnRecordingTime = 18;
