/** Repo evidence, not a reconstruction of the original frontend source. */
export const productEvidence = {
  video: "/videos/Patient%20Tablet%20App.mp4",
  poster: "/images/armi/patient-tablet-original.png",
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

