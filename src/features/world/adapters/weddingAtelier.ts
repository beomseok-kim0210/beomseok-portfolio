import { Vector3 } from "three";
import type { DistrictShotProfile } from "../types/contracts";

/**
 * Wedding Dress AI — "The Fitting Room". A bright atelier inside the same building.
 * Facts come from the project record (weddingResearch.ts / HomeProjectBrief). The 3D dress
 * forms are EXPLANATORY: they illustrate each model's documented failure mode, they are not
 * the reconstruction outputs (the real ECON input/output images are shown as evidence in 03).
 */
export const WD_CLASSIFICATION = "EXPLANATORY RECONSTRUCTION ILLUSTRATION";

export const wdScenes = [
  { id: "question", no: "01", title: "QUESTION", ko: "선택 전의 질문", text: "드레스 투어는 한 벌을 입어 볼 때마다 비용이 들고, 충분히 비교할 수 없습니다." },
  { id: "research", no: "02", title: "RESEARCH", ko: "2D 사진 → 3D 복원 후보 검토", text: "체형이 반영된 3D 결과로 드레스 비교를 돕고자, 인체 복원 모델 5개를 3주간 검토했습니다." },
  { id: "failure", no: "03", title: "SUCCESS & FAILURE", ko: "머메이드는 됐고, 볼가운은 반쪽만 남았다", text: "ECON은 몸에 붙는 머메이드 라인은 잘 복원했습니다. 하지만 웨딩드레스의 핵심인 볼가운은 부피 있는 부분이 반쪽만 복원됐고, 이 한계 때문에 3D 방식을 포기했습니다." },
  { id: "decision", no: "04", title: "DECISION", ko: "기한 안에 완성할 수 있는 길을 택했다", text: "볼가운의 볼륨 문제를 프로젝트 기한 안에 풀기는 어렵다고 냉정하게 판단했습니다. 3D를 내려놓고 Stable Diffusion API로 2D 이미지를 생성하며, 프롬프트 엔지니어링으로 실감과 어울림을 끌어올렸습니다." },
  { id: "council", no: "05", title: "COUNCIL", ko: "프롬프트 엔지니어링으로 만든 전문가 5명", text: "전문가마다 역할과 SKILL을 지침으로 주고, 전문가별 논문 근거(RAG)를 입혀 다섯 관점이 함께 최선의 드레스를 추천합니다." },
  { id: "compare", no: "06", title: "COMPARE", ko: "생성 결과 + AI가 요약한 추천 이유", text: "추천 결과를 거울에 비추듯 비교하고, 왜 이 드레스를 골랐는지 AI가 요약해 함께 보여줍니다." },
  { id: "result", no: "07", title: "RESULT", ko: "복원의 한계에서 비교 경험으로", text: "생성형 AI 활용 산업융합 프로젝트 최우수상 (팀)." },
] as const;
export type WdSceneId = typeof wdScenes[number]["id"];

/**
 * A chapter break, not a scroll-through:
 *  HOLD  [0, WD_HOLD)        — the Hangarae brief stays pinned and readable; only a "next project" cue shows.
 *  ENTRY [WD_HOLD, WD_ENTRY) — the brief dims to black, a hairline of light appears and opens into the arch.
 */
export const WD_HOLD = .055;
export const WD_ENTRY = .13;
const INNER = [0, .12, .31, .47, .57, .78, .93, 1] as const;
export const wdInner = (p: number) => Math.max(0, Math.min(1, (p - WD_ENTRY) / (1 - WD_ENTRY)));
export const wdOuter = (q: number) => WD_ENTRY + q * (1 - WD_ENTRY);
/** District-local shot seams: entry + 7 scenes. */
export const wdRanges = [0, ...INNER.map(wdOuter)] as readonly number[];
export const wdShots = [{ id: "entry" }, ...wdScenes.map(s => ({ id: s.id }))] as const;
export const weddingRuntimeProfile: DistrictShotProfile = {
  profileId: "wedding/shots", districtId: "wedding", publishState: "published",
  shots: wdShots.map((s, i) => ({ shotId: s.id, localStart: wdRanges[i], localEnd: wdRanges[i + 1],
    desktopCameraProfileId: "wedding/atelier-desktop", mobileCameraProfileId: "wedding/atelier-mobile",
    narrativeReferenceId: `wedding/atelier/${s.id}`, requiredAssetIds: [], reducedMotion: "still" })),
};
export function wdShotIndex(p: number) { const i = wdRanges.slice(1).findIndex(end => p < end); return i < 0 ? wdShots.length - 1 : i; }
export function ramp(p: number, a: number, b: number) { const t = Math.max(0, Math.min(1, (p - a) / (b - a))); return t * t * (3 - 2 * t); }
/** Scene-local progress for scene index i (0-based over wdScenes) at inner progress q. */
export const wdLocal = (q: number, i: number) => Math.max(0, Math.min(1, (q - INNER[i]) / (INNER[i + 1] - INNER[i])));
export const wdSceneRanges = wdScenes.map((_, i) => [INNER[i], INNER[i + 1]] as const);

/* ── Atelier layout (metres, floor y = 0) ─────────────────────────────── */
/** The documented reconstruction candidates, in the order they were reviewed (year order). */
export const wdModels = [
  { id: "smpl", name: "SMPL", year: "2015", kind: "PARAMETRIC BODY", status: "REJECTED", fit: 1, note: "의상의 부피·레이어를 표현할 수 없음" },
  { id: "pifuhd", name: "PIFuHD", year: "2020", kind: "IMPLICIT · RGB", status: "REJECTED", fit: 2, note: "드레스 가장자리 메쉬가 찢어지거나 누락" },
  { id: "pamir", name: "PaMIR", year: "2020", kind: "RGB + SMPL", status: "REJECTED", fit: 2, note: "SMPL 의존으로 드레스 볼륨 과소 표현" },
  { id: "icon", name: "ICON", year: "2022", kind: "NORMAL GUIDED", status: "ENV FAILED", fit: 2, note: "CUDA·PyTorch3D 버전 충돌로 재현 실패" },
  { id: "econ", name: "ECON", year: "2023", kind: "EXPLICIT", status: "PARTIAL", fit: 3, note: "머메이드 라인은 복원, 볼가운은 부피가 반쪽만 남음" },
] as const;
export type WdModelId = typeof wdModels[number]["id"];
/** Gallery: the five attempts stand on a line to the right of the real dress. */
export const WD_GALLERY_X0 = 2.1, WD_GALLERY_STEP = 1.55;
export const wdGalleryX = (i: number) => WD_GALLERY_X0 + i * WD_GALLERY_STEP;
export const WD_MIRROR = { x: 0, y: 1.32, z: -2.35, w: 1.34, h: 2.28 } as const;
export const WD_BACK_Z = -2.6;
/** 03: the ECON success case (mermaid line) stands beside the ball-gown failure. */
export const WD_MERMAID_X = WD_GALLERY_X0 + 4 * WD_GALLERY_STEP - 1.35;
/** Council: five expert stations around the real dress. */
export const wdExperts = [
  { id: "body", name: "체형 전문가", en: "BODY", focus: "체형과 실루엣 적합성" },
  { id: "color", name: "색상 전문가", en: "COLOR", focus: "피부톤과 드레스 색상" },
  { id: "design", name: "디자인 전문가", en: "DESIGN", focus: "라인 · 소재 · 패턴" },
  { id: "accessory", name: "액세서리 전문가", en: "ACCESSORY", focus: "부케 · 베일 · 장신구" },
  { id: "style", name: "스타일 전문가", en: "STYLE", focus: "전체 스타일링 일관성" },
] as const;
export const WD_COUNCIL_R = 1.75;
/** Experts sit on the far half of the table so the camera (front) sees every face. */
export const wdExpertAngle = (i: number) => Math.PI + (i - 2) * .66;
export const wdExpertPos = (i: number, out = new Vector3()) => out.set(Math.sin(wdExpertAngle(i)) * WD_COUNCIL_R, 0, Math.cos(wdExpertAngle(i)) * WD_COUNCIL_R);

/* ── Timeline ─────────────────────────────────────────────────────────── */
export function sampleWedding(p: number, reduced = false) {
  p = Math.max(0, Math.min(1, p));
  const shot = wdShotIndex(p);
  if (reduced) p = shot === 0 ? WD_ENTRY : wdOuter(([.06, .22, .40, .52, .70, .86, .97] as const)[shot - 1]);
  const q = wdInner(p);
  const L = (i: number) => wdLocal(q, i);
  return {
    p, q, shot,
    entry: reduced ? 1 : ramp(p, WD_HOLD, WD_ENTRY - .006),
    /** "Next project" cue during the hold; gone once the dim begins. */
    cue: reduced ? 0 : ramp(p, .004, .018) * (1 - ramp(p, WD_HOLD, WD_HOLD + .012)),
    /** 02: candidates appear one by one along the gallery; 0..5 */
    reveal: 5 * ramp(L(1), .05, .82),
    /** 03: the ECON form collapses from the input silhouette to its documented failure. */
    /** 03: first the case that worked (mermaid), then the one that did not (ball gown), then the verdict. */
    success: ramp(L(2), .02, .2),
    collapse: ramp(L(2), .3, .7),
    verdict: ramp(L(2), .72, .9),
    /** 03: the ECON form turns side-on — the flattened skirt only reads in profile. */
    econTurn: ramp(L(2), .3, .78),
    /** 03: the other candidates step back so the failure stands alone. */
    solo: ramp(L(2), 0, .2) * (1 - ramp(L(3), .0, .3)),
    evidence: ramp(L(2), .04, .22) * (1 - ramp(L(3), .0, .25)),
    pins: ramp(L(2), .6, .78) * (1 - ramp(L(3), 0, .2)),
    /** 04: reconstruction forms recede; the decision line bends. */
    recede: ramp(L(3), .05, .6),
    /** The attempts leave the room once the problem is redefined. */
    galleryOut: ramp(L(3), .78, 1),
    bend: ramp(L(3), .08, .62),
    /** 05: table, experts seat one by one, threads to the dress, consensus. */
    table: ramp(L(4), 0, .25) * (1 - ramp(L(5), .1, .4)),
    seated: 5 * ramp(L(4), .1, .55),
    threads: ramp(L(4), .45, .78),
    rag: ramp(L(4), .15, .6),
    consensus: ramp(L(4), .78, .95) * (1 - ramp(L(5), .1, .35)),
    /** 06: mirror becomes the before / generated comparison. */
    mirror: ramp(L(5), .15, .5),
    dressAway: ramp(L(5), .05, .4),
    result: ramp(L(6), .0, .3) * (1 - ramp(L(6), .45, .6)),
    /** Exit: the camera steps into the mirror, then the room floods to the brief's paper. */
    exitPush: ramp(L(6), .35, .85),
    flood: ramp(L(6), .74, 1),
  };
}
export type WeddingSample = ReturnType<typeof sampleWedding>;

/* ── Camera ───────────────────────────────────────────────────────────── */
export const WD_FOV = 36;
type Key = { at: number; pos: [number, number, number]; target: [number, number, number] };
/** Inner-progress keys. Hold within a scene, travel across seams; 02 is a dolly along the gallery. */
function keys(compact: boolean): Key[] {
  const g0 = wdGalleryX(0), g4 = wdGalleryX(4), k = compact ? 1.45 : 1;
  return [
    { at: 0, pos: [-1.05, 1.32, 4.6 * k], target: [-.62, 1.0, 0] },
    { at: .1, pos: [-.95, 1.26, 4.25 * k], target: [-.58, .98, 0] },
    { at: .145, pos: [g0 + .9, 1.5, 7.4 * k], target: [g0 + 1.25, .9, 0] },
    { at: .29, pos: [g4 - 1.6, 1.5, 7.4 * k], target: [g4 - 1.25, .9, 0] },
    { at: .335, pos: [g4 - 1.95, 1.25, 4.75 * k], target: [g4 - 1.5, .88, 0] },
    { at: .45, pos: [g4 - 2.0, 1.22, 4.6 * k], target: [g4 - 1.52, .88, 0] },
    { at: .5, pos: [3.6, 3.4, 10.5 * k], target: [3.6, .7, 0] },
    { at: .56, pos: [3.6, 3.5, 10.8 * k], target: [3.6, .7, 0] },
    { at: .6, pos: [0, 2.35, 5.4 * k], target: [0, .86, -.5] },
    { at: .77, pos: [.5, 2.2, 5.1 * k], target: [0, .9, -.5] },
    { at: .81, pos: [0, 1.36, 4.5 * k], target: [0, 1.3, WD_MIRROR.z] },
    { at: .955, pos: [0, 1.36, 4.4 * k], target: [0, 1.3, WD_MIRROR.z] },
    { at: .99, pos: [0, 1.32, WD_MIRROR.z + 1.05], target: [0, 1.32, WD_MIRROR.z] },
    { at: 1, pos: [0, 1.32, WD_MIRROR.z + 1.05], target: [0, 1.32, WD_MIRROR.z] },
  ];
}
const ease = (t: number) => t * t * (3 - 2 * t);
export function sampleWeddingCamera(p: number, compact: boolean, out = { position: new Vector3(), target: new Vector3(), up: new Vector3(0, 1, 0), fov: WD_FOV, far: 60 }) {
  const q = wdInner(Math.max(0, Math.min(1, p))), K = keys(compact);
  let i = K.findIndex(k => k.at > q); if (i < 0) i = K.length;
  const a = K[Math.max(0, i - 1)], b = K[Math.min(K.length - 1, i)];
  const t = b.at > a.at ? ease((q - a.at) / (b.at - a.at)) : 0;
  out.position.set(a.pos[0] + (b.pos[0] - a.pos[0]) * t, a.pos[1] + (b.pos[1] - a.pos[1]) * t, a.pos[2] + (b.pos[2] - a.pos[2]) * t);
  out.target.set(a.target[0] + (b.target[0] - a.target[0]) * t, a.target[1] + (b.target[1] - a.target[1]) * t, a.target[2] + (b.target[2] - a.target[2]) * t);
  // Phones: the copy sits above the subject, so centre the subject instead of offsetting it.
  if (compact) { const subject = q < .145 ? 0 : q < .5 ? out.target.x + (q < .335 ? 0 : .76) : q < .6 ? out.target.x : 0; const dx = subject - out.target.x; out.position.x += dx; out.target.x += dx; out.target.y -= .15; }
  out.up.set(0, 1, 0); out.fov = WD_FOV; out.far = 60;
  return out;
}

/** Timeline windows that play as one authored move (auto-glide) instead of being scrubbed. */
export const WD_EXIT_FROM = wdOuter(.93 + .07 * .3);

/* ── Scroll pacing ────────────────────────────────────────────────────── */
/** The council (05) is the project's own system: it gets 1.6× room; 07 carries the mirror exit. */
const WD_PACE = [[wdOuter(.57), 1], [wdOuter(.78), 1.6], [wdOuter(.93), 1], [1, 1.3]] as const;
export const WD_SCROLL_LENGTH = WD_PACE.reduce((sum, [end, w], i) => sum + (end - (i ? WD_PACE[i - 1][0] : 0)) * w, 0);
export function wdScrollToTimeline(scroll: number) {
  let left = Math.max(0, Math.min(1, scroll)) * WD_SCROLL_LENGTH, start = 0;
  for (const [end, w] of WD_PACE) { const span = (end - start) * w; if (left <= span) return start + left / w; left -= span; start = end; }
  return 1;
}
export function wdTimelineToScroll(t: number) {
  let acc = 0, start = 0;
  for (const [end, w] of WD_PACE) { if (t <= end) return (acc + (t - start) * w) / WD_SCROLL_LENGTH; acc += (end - start) * w; start = end; }
  return 1;
}
