import { Vector3 } from "three";
import type { DistrictShotProfile } from "../types/contracts";
import { docentOverlayPx } from "@/features/docent/docentOverlay";

/**
 * 04 Personal Gallery — the last room of the building: a bright white-cube gallery where the three solo
 * projects are shown as works. Each exhibit has a 3D work on a plinth, a framed print on the back wall and a
 * wall label (the DOM panel). Facts come only from the project record (src/data/projectDetails.ts).
 * District id stays "experimental-wing" (the world itinerary's segment for this room).
 */
export const labStations = [
  { id: "docent", name: "Digital Docent", en: "DIGITAL DOCENT", line: "페이지 문맥과 근거 검색을 음성·3D 표현까지 잇는 전역 AI 도슨트", ko: "대리석 흉상 · 질문을 듣는 얼굴", year: "2026", medium: "Next.js · Hybrid RAG · Supertonic TTS · LAM · R3F", accent: "#3f6f9e", x: -6.2 },
  { id: "bcos", name: "BCOS", en: "BCOS", line: "작업 계약과 독립 검토로 AI 개발 세션을 운영하는 Project OS", ko: "아크릴 다섯 장 · 작업이 통과하는 관문", year: "2026", medium: "Claude Code · Codex CLI · Gemini CLI · Git · RFC / ADR", accent: "#b07a1e", x: 0 },
  { id: "crime", name: "Crime Scene", en: "CRIME SCENE", line: "3D 탐색과 자유형 AI 심문을 증거 기반 추리로 묶은 웹 게임", ko: "유리 진열장 · 잠긴 진실", year: "2026", medium: "Next.js · R3F · Zustand · Structured LLM Output · Zod", accent: "#a8392f", x: 6.2 },
] as const;
export type LabStationId = typeof labStations[number]["id"];

/** Where each exhibit's pieces stand (metres, floor y = 0, back wall at LAB_BACK_Z). */
export const LAB_BACK_Z = -3.4;
export const LAB_CEIL = 4.6;
export const LAB_PARTITIONS = [-3.1, 3.1] as const;
export const labWork = (cx: number) => ({ x: cx - .55, z: -.35 });
export const LAB_FRAME = { dx: 1.35, y: 1.68, w: 1.5, h: 1.06 } as const;
/** The live docent's head, reused as the marble bust (shared loader cache). */
export const LAB_HEAD_URL = "/models/docent-qka2-m213-runtime-compat.glb";

type Metric = { value: string; label: string };
/** A wall-label action: open the docent, an internal record, or an external page (new tab). */
export type LabAction = { kind: "docent" | "link" | "external"; text: string; href?: string; primary?: boolean };
export type LabScene = {
  id: string; no: string; title: string; ko: string; station: LabStationId | null; slot: boolean;
  shot?: "work" | "detail" | "wall" | "bay";
  label?: { kicker: string; title: string; body: string; metrics?: readonly Metric[]; actions?: readonly LabAction[] };
};

/** Scenes in order: the hall at a glance, then each work in turn — its short introduction, then its details.
 *  `shot`: work = the 3D piece, detail = a closer second look at it, wall = the framed print, bay = the whole bay. */
export const labScenes: readonly LabScene[] = [
  { id: "entry", no: "04", title: "PERSONAL WORKS", ko: "혼자 설계하고, 끝까지 운영한 세 작품", station: null, slot: false },
  { id: "intro-docent", no: "01", title: "DIGITAL DOCENT", ko: "간단 설명", station: "docent", slot: false },
  { id: "d1", no: "01", title: "DIGITAL DOCENT", ko: "작품 · 질문을 듣는 얼굴", station: "docent", slot: true, shot: "work", label: {
    kicker: "WORK", title: "페이지를 이해하고, 근거로 답하는 도슨트",
    body: "방문자가 여러 프로젝트를 직접 뒤지지 않아도, 지금 보고 있는 페이지의 맥락과 포트폴리오 근거를 찾아 대화로 안내합니다. 흉상은 실제 도슨트와 같은 3D 얼굴입니다.",
    metrics: [{ value: "PageContext", label: "현재 페이지를 질문의 힌트로" }, { value: "Hybrid RAG", label: "BM25 + Dense · RRF" }] } },
  { id: "d2", no: "01", title: "DIGITAL DOCENT", ko: "벽 · 질문에서 얼굴까지", station: "docent", slot: true, shot: "wall", label: {
    kicker: "TROUBLESHOOTING", title: "구어체와 짧은 후속 질문을 놓치던 검색",
    body: "BM25만으로는 'armi프로젝트가 뭔데' 같은 구어체와 '왜?' 같은 짧은 질문을 같은 프로젝트에 잇지 못했습니다. Dense 검색을 RRF로 합치고 대화 상태로 대상 프로젝트를 추적했습니다. embedding 장애에는 BM25만으로 답합니다.",
    metrics: [{ value: "0.647 / 0.912 / 0.980", label: "Hit@1 / 3 / 5 · curated eval" }, { value: "0", label: "wrong-project · unsupported 오탐" }] } },
  { id: "d3", no: "01", title: "DIGITAL DOCENT", ko: "작품 · 한국어로 말하는 입", station: "docent", slot: true, shot: "detail", label: {
    kicker: "RESULT", title: "소리와 입모양이 같은 합성에서 나옵니다",
    body: "LAM 신호만으로는 ㅣ·ㅡ의 가로 벌림과 ㅂ·ㅁ의 닫힘이 나오지 않았습니다. Supertonic 합성 한 번에서 자모 시각을 읽어 모음 모양과 양순음 닫힘을 얹었습니다. 음운 변동과 치아 표현은 남은 한계입니다.",
    metrics: [{ value: "106 / 106", label: "양순음 닫힘 · 운영 경로 22문장" }, { value: "1회", label: "세그먼트당 합성 · 오디오 해시 일치" }],
    actions: [{ kind: "docent", text: "이 작품에게 직접 물어보기", primary: true }] } },
  { id: "intro-bcos", no: "02", title: "BCOS", ko: "간단 설명", station: "bcos", slot: false },
  { id: "b1", no: "02", title: "BCOS", ko: "작품 · 다섯 개의 관문", station: "bcos", slot: true, shot: "work", label: {
    kicker: "WORK", title: "작업 계약이 세션을 열고, 독립 검토가 닫습니다",
    body: "역할을 에이전트 이름이 아니라 Task Contract에 붙였습니다. 하나의 작업은 계약 → 구현 → 호스트 검증 → 독립 리뷰 → 기록의 다섯 장을 차례로 통과해야 완료됩니다.",
    metrics: [{ value: "Task Contract", label: "목표 · 범위 · AC · 금지 경계" }, { value: "Append-only", label: "상태 변경은 event로" }] } },
  { id: "b2", no: "02", title: "BCOS", ko: "작품 · 스스로 승인하지 않게", station: "bcos", slot: true, shot: "detail", label: {
    kicker: "TROUBLESHOOTING", title: "구현 세션이 자기 결과를 승인하던 문제",
    body: "구현한 Worker가 같은 세션에서 리뷰까지 맡으면 자신의 가정을 다시 의심하기 어렵습니다. Codex 구현 세션과 Claude 리뷰 세션을 분리하고, 최종 위험과 release는 Human이 승인하도록 경계를 고정했습니다.",
    metrics: [{ value: "APPROVED", label: "T-015 · Multi-model Worker Switching" }, { value: "No self-approval", label: "구현 ≠ 리뷰 세션" }] } },
  { id: "b3", no: "02", title: "BCOS", ko: "벽 · v1 완료", station: "bcos", slot: true, shot: "wall", label: {
    kicker: "RESULT", title: "세션이 바뀌어도 결정과 검증이 저장소에 남습니다",
    body: "동결된 Task는 덮어쓰지 않고 Human이 승인한 Amendment로만 고칩니다. 채팅 원문이 아니라 결정 · 규칙 · 실패 기록을 Git이 소유해, 작은 컨텍스트로 이어서 일할 수 있게 했습니다.",
    metrics: [{ value: "50 / 50", label: "Acceptance Criteria" }, { value: "272 / 272", label: "Tests · 최종 제품 범위" }],
    actions: [{ kind: "link", text: "프로젝트 기록 보기", href: "/projects/bcos", primary: true }] } },
  { id: "intro-crime", no: "03", title: "CRIME SCENE", ko: "간단 설명", station: "crime", slot: false },
  { id: "c1", no: "03", title: "CRIME SCENE", ko: "작품 · 잠긴 진실", station: "crime", slot: true, shot: "work", label: {
    kicker: "WORK", title: "진실은 서버의 금고에, 플레이어에겐 증거만",
    body: "3D 공간에서 단서를 모으고, 용의자에게 자유롭게 질문하고, 증거를 제시해 범인을 지목하는 웹 게임입니다. 진실 · 비밀 · 알리바이는 서버 데이터가 소유하고, 브라우저와 모델에는 단계마다 필요한 만큼만 전달합니다.",
    metrics: [{ value: "Deterministic", label: "truth · secret · alibi" }, { value: "Evidence-driven", label: "LLM은 진행 gate가 아님" }] } },
  { id: "c2", no: "03", title: "CRIME SCENE", ko: "벽 · 심문의 경계", station: "crime", slot: true, shot: "wall", label: {
    kicker: "DECISION", title: "모델이 비밀을 덜 알게 했습니다",
    body: "금지 문구를 늘리는 대신 범인과 결정적 알리바이를 모델에 입력하지 않았습니다. 모델이 돌려준 { answer, concededTopicIds } 중 서버 whitelist와 겹치는 주제만 상태 전이에 반영합니다.",
    metrics: [{ value: "335", label: "브라우저 bundle 비밀 문자열 감사" }, { value: "85 (+26)", label: "심문 테스트" }] } },
  { id: "c3", no: "03", title: "CRIME SCENE", ko: "전시 · 끝까지 수사할 수 있게", station: "crime", slot: true, shot: "bay", label: {
    kicker: "RESULT", title: "자유 질문이 흔들려도 수사는 멈추지 않습니다",
    body: "자연어 답변의 품질과 게임 진행 판정은 다른 문제였습니다. 증거 제시처럼 결과가 항상 같은 행동을 핵심 경로로 두고, 사건 일지가 사실 → 충돌 → 남은 의문 → 다음 조사로 이어지게 했습니다.",
    metrics: [{ value: "2 / 2", label: "서로 다른 순서의 전체 플레이" }, { value: "194 → 240", label: "사건 일지 회귀 테스트" }],
    actions: [{ kind: "external", text: "체험하기", href: "https://crime-scene-kohl.vercel.app", primary: true }, { kind: "link", text: "프로젝트 기록 보기", href: "/projects/crime-scene" }] } },
];
export type LabSceneId = typeof labScenes[number]["id"];

/**
 * A chapter break, not a scroll-through (same grammar as the wedding entry):
 *  HOLD  [0, LAB_HOLD)          — the wedding brief stays pinned and readable; only a "next" cue shows.
 *  ENTRY [LAB_HOLD, LAB_ENTRY)  — the brief dims, the gallery's double doors appear and swing open.
 * Then equal spans per scene.
 */
export const LAB_HOLD = .03;
export const LAB_ENTRY = .09;
export const labInner = (p: number) => Math.max(0, Math.min(1, (p - LAB_ENTRY) / (1 - LAB_ENTRY)));
export const labOuter = (q: number) => LAB_ENTRY + q * (1 - LAB_ENTRY);
const N = labScenes.length;
/** Inner progress where scene i holds (its camera has arrived). */
export const labStopInner = (i: number) => (i + .6) / N;
export const labSceneIndex = (q: number) => Math.max(0, Math.min(N - 1, Math.floor(q * N)));
/** Shot seams: the door, then one equal span per scene. */
export const labRanges = [0, LAB_ENTRY, ...labScenes.map((_, i) => labOuter((i + 1) / N))] as readonly number[];
export const labRuntimeProfile: DistrictShotProfile = {
  profileId: "experimental-wing/shots", districtId: "experimental-wing", publishState: "published",
  shots: ["door", ...labScenes.map(s => s.id)].map((shotId, i) => ({ shotId, localStart: labRanges[i], localEnd: labRanges[i + 1],
    desktopCameraProfileId: "lab/desktop", mobileCameraProfileId: "lab/mobile", narrativeReferenceId: `lab/${shotId}`, requiredAssetIds: [], reducedMotion: "still" as const })),
};
const ramp = (p: number, a: number, b: number) => { const t = Math.max(0, Math.min(1, (p - a) / (b - a))); return t * t * (3 - 2 * t); };
const idx = (id: string) => labScenes.findIndex(s => s.id === id);
/** Progress through scene `id` (0 before it, 1 after it). */
const through = (q: number, id: string) => Math.max(0, Math.min(1, q * N - idx(id)));

export function sampleLab(p: number) {
  p = Math.max(0, Math.min(1, p));
  const q = labInner(p), i = labSceneIndex(q), scene = labScenes[i];
  const local = q * N - i;
  return {
    p, q, index: i, scene,
    /** "Next" cue during the hold; gone once the dim begins. */
    cue: ramp(p, .002, .012) * (1 - ramp(p, LAB_HOLD, LAB_HOLD + .01)),
    /** The museum doors: dim the brief → doors appear → swing open → walk through. */
    entry: ramp(p, LAB_HOLD, LAB_ENTRY * .97),
    /** Intro card on the work being introduced. */
    intro: scene.id.startsWith("intro") ? ramp(local, .05, .4) * (1 - ramp(local, .85, 1)) : 0,
    /** Wall label visibility for project scenes. */
    slot: scene.slot ? ramp(local, .1, .45) * (1 - ramp(local, .88, 1)) : 0,
    /** Visit progress along the hall (HUD). */
    rail: q,
    /** DD: the bust turns to face the visitor in 01; the marble mouth speaks in 03. */
    bustTurn: ramp(through(q, "d1"), .1, .7),
    speak: scene.id === "d3" ? ramp(local, .2, .4) * (1 - ramp(local, .9, 1)) : 0,
    /** BCOS: the light crosses the five panels in 01; panel 4 (independent review) steps out of the worker's line in 02. */
    beam: ramp(through(q, "b1"), .12, .82),
    reviewOut: ramp(through(q, "b2"), .15, .55),
    /** Crime Scene: the truth vault's lock light wakes in 01, then the evidence tags that pass the whitelist light up. */
    whitelist: ramp(through(q, "c1"), .45, .85),
    vaultGlow: ramp(through(q, "c1"), .1, .5),
  };
}
export type LabSample = ReturnType<typeof sampleLab>;

/* ── Camera ── */
export const LAB_FOV = 36;
type Key = { pos: [number, number, number]; target: [number, number, number] };
function keyFor(sc: LabScene, compact: boolean): Key {
  const k = compact ? 1.5 : 1;
  if (!sc.station) return { pos: [0, 2.15, 14.5 * k], target: [0, 1.75, -1.2] };
  const cx = labStations.find(s => s.id === sc.station)!.x, w = labWork(cx);
  if (sc.id.startsWith("intro")) return { pos: [cx + 1.7, 1.95, 6.4 * k], target: [cx + .05, 1.32, -1.2] };
  if (sc.shot === "work") {
    // The work on the left third, the wall label on the right.
    if (sc.station === "docent") return { pos: [w.x + 1.15, 1.62, w.z + 2.55 * k], target: [w.x + .72, 1.36, w.z] };
    if (sc.station === "bcos") return { pos: [w.x + 2.1, 2.05, w.z + 4.5 * k], target: [w.x + 1.12, .95, w.z] };
    return { pos: [w.x + 1.3, 1.95, w.z + 2.85 * k], target: [w.x + .72, 1.04, w.z] };
  }
  if (sc.shot === "detail") {
    // DD: a portrait of the speaking head; BCOS: from the right, so the review sheet stepping forward reads.
    if (sc.station === "docent") return { pos: [w.x + .78, 1.6, w.z + 1.55 * k], target: [w.x + .44, 1.53, w.z] };
    if (sc.station === "bcos") return { pos: [w.x + 3.2, 1.95, w.z + 2.9 * k], target: [w.x + 1.45, .98, w.z + .1] };
    return { pos: [w.x + 1.0, 1.75, w.z + 2.0 * k], target: [w.x + .55, 1.05, w.z] };
  }
  if (sc.shot === "wall") return { pos: [cx + LAB_FRAME.dx + .66, LAB_FRAME.y + .06, LAB_BACK_Z + 4.15 * k], target: [cx + LAB_FRAME.dx + .7, LAB_FRAME.y + .02, LAB_BACK_Z] };
  return { pos: [cx + 1.35, 1.9, 5.0 * k], target: [cx + 1.0, 1.32, -1.4] };
}
const ease = (t: number) => t * t * (3 - 2 * t);
export function sampleLabCamera(p: number, compact: boolean, out = { position: new Vector3(), target: new Vector3(), up: new Vector3(0, 1, 0), fov: LAB_FOV, far: 80 }) {
  const q = labInner(Math.max(0, Math.min(1, p)));
  // Hold on each scene's key; travel in the gap between holds.
  const f = q * N - .5, i = Math.max(0, Math.min(N - 1, Math.floor(f))), j = Math.min(N - 1, i + 1);
  const t = f < 0 ? 0 : ease(Math.max(0, Math.min(1, (f - i - .35) / .65)));
  const a = keyFor(labScenes[i], compact), b = keyFor(labScenes[j], compact);
  out.position.set(a.pos[0] + (b.pos[0] - a.pos[0]) * t, a.pos[1] + (b.pos[1] - a.pos[1]) * t, a.pos[2] + (b.pos[2] - a.pos[2]) * t);
  out.target.set(a.target[0] + (b.target[0] - a.target[0]) * t, a.target[1] + (b.target[1] - a.target[1]) * t, a.target[2] + (b.target[2] - a.target[2]) * t);
  const sc = labScenes[labSceneIndex(q)];
  // Walking in through the doors: the hall view starts a few steps back and settles as they open.
  const walk = ramp(Math.max(0, Math.min(1, p)), LAB_HOLD, LAB_ENTRY);
  if (walk < 1) { const w = 1 - walk * walk * (3 - 2 * walk); out.position.z += 6 * w; out.position.y += .25 * w; }
  if (compact && sc.station && !sc.id.startsWith("intro")) {
    // Phones: the label sits below; centre the subject instead of offsetting it.
    const cx = labStations.find(s => s.id === sc.station)!.x, subject = sc.shot === "wall" ? cx + LAB_FRAME.dx : sc.shot === "bay" ? cx : labWork(cx).x + (sc.station === "bcos" ? .25 : 0);
    const dx = subject - out.target.x; out.position.x += dx; out.target.x += dx; out.target.y -= .2;
  }
  // Docent docked: the stage is narrower, so step back a little.
  if (!compact && docentOverlayPx() > 0 && sc.slot) out.position.z += .6;
  out.up.set(0, 1, 0); out.fov = LAB_FOV; out.far = 80;
  return out;
}
