/** Scene HUD shared with Hangarae: 00 = hero (product title), 01-06 group the authored 3D stages. */
export const armiScenes = [
  { no: "01", title: "VOICE → REQUEST", ko: "음성이 하나의 요청으로", text: "환자의 음성이 시스템이 해석할 수 있는 요청으로 정돈됩니다." },
  { no: "02", title: "INTO THE SYSTEM", ko: "요청을 따라 시스템 안으로", text: "제품 화면 뒤의 라우팅 공간으로 요청과 함께 이동합니다." },
  { no: "03", title: "ROUTING CORE", ko: "Agent가 실행 경로를 판단", text: "답변·기억 조회·검색·로봇 행동 중 이번 요청이 갈 경로를 고릅니다." },
  { no: "04", title: "TEXT ANSWER", ko: "선택된 경로: 대화형 답변", text: "이번 설명용 여정은 답변 경로를 따라 요청을 처리합니다." },
  { no: "05", title: "STRUCTURED RESPONSE", ko: "결과를 제품에 전달할 응답으로", text: "실행 결과가 화면에 보여줄 구조화된 응답으로 정돈됩니다." },
  { no: "06", title: "BACK TO PRODUCT", ko: "다시 실제 ARMI 화면으로", text: "처음의 실제 ARMI 제품 UI로 돌아옵니다. 내부 여정은 설명용 시각화입니다." },
] as const;
const sceneOfStage: Record<string, number> = { product: -1, voice: 0, enter: 1, routing: 1, core: 2, options: 2, decision: 2, route: 3, text: 3, response: 4, structured: 4, return: 5, returned: 5 };
/** -1 = hero (no number lit). */
export const armiSceneIndex = (stageId: string) => sceneOfStage[stageId] ?? -1;
