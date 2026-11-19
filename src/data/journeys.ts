/** The three project journeys. Each one is its own page (/journeys/<id>); Home only indexes them. */
export type JourneyId = "armi" | "hangarae" | "wedding";
export interface Journey { id: JourneyId; no: string; name: string; flow: string; accent: string; line: string; lede: string; title: string }
export const journeys: readonly Journey[] = [
  { id: "armi", no: "01", name: "ARMI", flow: "VOICE → ACTION", accent: "#d2f059", line: "VOICE BECOMES ACTION", title: "ARMI — 음성이 행동이 되는 병상 보조 로봇", lede: "환자의 음성 요청이 해석·라우팅을 거쳐 로봇 행동과 답변으로 돌아오기까지." },
  { id: "hangarae", no: "02", name: "행가래", flow: "MOTION → FEEDBACK", accent: "#63cbdb", line: "MOVEMENT BECOMES FEEDBACK", title: "행가래 — 움직임이 피드백이 되는 재활 게임", lede: "카메라 한 대의 영상이 관절 좌표가 되고, 다시 운동 피드백이 되기까지." },
  { id: "wedding", no: "03", name: "Wedding AI", flow: "IMAGE → CREATION", accent: "#a98bff", line: "IMAGE BECOMES CHOICE", title: "웨딩드레스 AI — 이미지가 선택이 되는 경험", lede: "3D 복원의 한계를 확인하고, 전문가 토의 기반 비교 경험으로 방향을 바꾸기까지." },
];
export const isJourneyId = (id: string): id is JourneyId => journeys.some(j => j.id === id);
export const journeyOf = (id: JourneyId) => journeys.find(j => j.id === id)!;
export const journeyHref = (id: JourneyId) => `/journeys/${id}`;
/** The next journey in order; the last one leads on to the personal gallery on Home. */
export const nextJourney = (id: JourneyId): Journey | null => journeys[journeys.findIndex(j => j.id === id) + 1] ?? null;
