import { Vector3 } from "three";
import type { DistrictShotProfile } from "../types/contracts";

/**
 * 04 Personal Lab — one dark lab room, three stations on a circuit rail.
 * Scene CONTENT is intentionally empty for now: each project scene has a reserved media slot that the
 * owner fills later. This module owns the room's timeline (stops) and the camera.
 */
export const labStations = [
  { id: "docent", name: "Digital Docent", en: "DIGITAL DOCENT", ko: "페이지 문맥 · 하이브리드 검색 · 음성 · 3D", accent: "#7cc4ff", x: -4.6 },
  { id: "bcos", name: "BCOS", en: "BCOS", ko: "작업 계약 · 검증 · 독립 검토", accent: "#f0be64", x: 0 },
  { id: "crime", name: "Crime Scene", en: "CRIME SCENE", ko: "진실 금고 · 심문 게이트 · 사건 일지", accent: "#f0786e", x: 4.6 },
] as const;
export type LabStationId = typeof labStations[number]["id"];

/** Scenes in order. `station` = the device the camera frames; `slot` = an empty content slot to be filled. */
export const labScenes = [
  { id: "entry", no: "00", title: "PERSONAL LAB", ko: "혼자 설계하고, 끝까지 운영하는 시스템들", station: null, slot: false },
  { id: "intro-docent", no: "00", title: "PERSONAL LAB", ko: "01 · Digital Docent", station: "docent", slot: false },
  { id: "intro-bcos", no: "00", title: "PERSONAL LAB", ko: "02 · BCOS", station: "bcos", slot: false },
  { id: "intro-crime", no: "00", title: "PERSONAL LAB", ko: "03 · Crime Scene", station: "crime", slot: false },
  { id: "d1", no: "01", title: "DIGITAL DOCENT", ko: "장면 1 · 준비 중", station: "docent", slot: true },
  { id: "d2", no: "01", title: "DIGITAL DOCENT", ko: "장면 2 · 준비 중", station: "docent", slot: true },
  { id: "d3", no: "01", title: "DIGITAL DOCENT", ko: "장면 3 · 준비 중", station: "docent", slot: true },
  { id: "b1", no: "02", title: "BCOS", ko: "장면 1 · 준비 중", station: "bcos", slot: true },
  { id: "b2", no: "02", title: "BCOS", ko: "장면 2 · 준비 중", station: "bcos", slot: true },
  { id: "b3", no: "02", title: "BCOS", ko: "장면 3 · 준비 중", station: "bcos", slot: true },
  { id: "c1", no: "03", title: "CRIME SCENE", ko: "장면 1 · 준비 중", station: "crime", slot: true },
  { id: "c2", no: "03", title: "CRIME SCENE", ko: "장면 2 · 준비 중", station: "crime", slot: true },
  { id: "c3", no: "03", title: "CRIME SCENE", ko: "장면 3 · 준비 중", station: "crime", slot: true },
] as const;
export type LabSceneId = typeof labScenes[number]["id"];

/** Equal spans per scene after a short entry (the door from the wedding brief). */
export const LAB_ENTRY = .06;
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

export function sampleLab(p: number) {
  p = Math.max(0, Math.min(1, p));
  const q = labInner(p), i = labSceneIndex(q), scene = labScenes[i];
  const local = q * N - i;
  return {
    p, q, index: i, scene,
    /** Door from the dimmed wedding brief. */
    entry: ramp(p, 0, LAB_ENTRY * .95),
    /** Intro (00) ring on the station being introduced. */
    intro: scene.id.startsWith("intro") ? ramp(local, .05, .4) * (1 - ramp(local, .85, 1)) : 0,
    /** Empty content slot visibility for project scenes. */
    slot: scene.slot ? ramp(local, .1, .45) * (1 - ramp(local, .88, 1)) : 0,
    /** Pulse along the circuit rail: 0 (left) → 1 (right) as the visit moves station to station. */
    rail: q,
  };
}
export type LabSample = ReturnType<typeof sampleLab>;

/* ── Camera ── */
export const LAB_FOV = 38;
type Key = { pos: [number, number, number]; target: [number, number, number] };
function keyFor(id: string, station: string | null, compact: boolean): Key {
  const k = compact ? 1.5 : 1;
  if (!station) return { pos: [0, 3.4, 13.5 * k], target: [0, 1.2, 0] };
  const x = labStations.find(s => s.id === station)!.x;
  if (id.startsWith("intro")) return { pos: [x * .55, 2.6, 9.5 * k], target: [x * .8, 1.3, 0] };
  // Project scenes: the station sits on the left third; the right two thirds are the content slot.
  const n = Number(id.slice(1)) - 1, swing = [-.35, 0, .35][n] ?? 0;
  return { pos: [x + 2.2 + swing, 2.5, 6.6 * k], target: [x + 1.7, 1.85, 0] };
}
const ease = (t: number) => t * t * (3 - 2 * t);
export function sampleLabCamera(p: number, compact: boolean, out = { position: new Vector3(), target: new Vector3(), up: new Vector3(0, 1, 0), fov: LAB_FOV, far: 80 }) {
  const q = labInner(Math.max(0, Math.min(1, p)));
  // Hold on each scene's key; travel in the gap between holds.
  const f = q * N - .5, i = Math.max(0, Math.min(N - 1, Math.floor(f))), j = Math.min(N - 1, i + 1);
  const t = f < 0 ? 0 : ease(Math.max(0, Math.min(1, (f - i - .35) / .65)));
  const a = keyFor(labScenes[i].id, labScenes[i].station, compact), b = keyFor(labScenes[j].id, labScenes[j].station, compact);
  out.position.set(a.pos[0] + (b.pos[0] - a.pos[0]) * t, a.pos[1] + (b.pos[1] - a.pos[1]) * t, a.pos[2] + (b.pos[2] - a.pos[2]) * t);
  out.target.set(a.target[0] + (b.target[0] - a.target[0]) * t, a.target[1] + (b.target[1] - a.target[1]) * t, a.target[2] + (b.target[2] - a.target[2]) * t);
  out.up.set(0, 1, 0); out.fov = LAB_FOV; out.far = 80;
  return out;
}
