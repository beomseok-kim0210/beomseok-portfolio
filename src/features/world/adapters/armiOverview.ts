import { Box3, PerspectiveCamera, Vector3, type Camera } from "three";
import type { ArmiProductionAsset } from "./armiV015";

/**
 * Overview hold (scene 02): the establishing shot of the chamber introduces the four destinations
 * one per stop. Each part gets a ring on the object itself and a magnified live view that grows
 * out of the ring onto the opposite half of the stage (left part → right inset, right part → left).
 */
export const overviewParts = [
  { id: "Text", name: "TEXT ANSWER", ko: "일반 질문 → 대화형 답변", focal: ["GEO-V008-TextMonitorMachining", "GEO-V014-TextAnswerNameplate"], cam: 0 },
  { id: "Robot", name: "ROBOT ACTION", ko: "행동 명령 → 로봇 동작", focal: ["GEO-V013-Robot-Base", "GEO-V013-Robot-Shoulder"], cam: 3 },
  { id: "Tavily", name: "TAVILY SEARCH", ko: "외부 정보 검색 → 웹 자료", focal: ["GEO-V013-SearchState-0", "GEO-V013-SearchState-2", "GEO-V008-SearchConsoleDeck"], cam: 2 },
  { id: "Memory", name: "MEMORY RETRIEVAL", ko: "기억 조회 → 관련 저장 기억", focal: ["GEO-V008-MemoryMachinedContacts"], cam: 1 },
] as const;
export type OverviewAnchor = { x: number; y: number; r: number };

const boxes = new WeakMap<ArmiProductionAsset, Box3[]>();
const corner = new Vector3();
/** Screen-space ring (canvas px) fitted to each part's focal objects. */
export function projectOverviewAnchors(asset: ArmiProductionAsset, camera: Camera, width: number, height: number) {
  let list = boxes.get(asset);
  if (!list) {
    list = overviewParts.map(part => {
      const box = new Box3();
      for (const name of part.focal) { const o = asset.root.getObjectByName(name); if (o) box.union(new Box3().setFromObject(o)); }
      return box;
    });
    boxes.set(asset, list);
  }
  const out: Record<string, OverviewAnchor> = {};
  list.forEach((box, i) => {
    if (box.isEmpty()) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      corner.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).project(camera);
      const x = (corner.x + 1) / 2 * width, y = (1 - corner.y) / 2 * height;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    out[overviewParts[i].id] = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: Math.max(56, Math.min(170, Math.max(x1 - x0, y1 - y0) * .62)) };
  });
  return out;
}

const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
/** Focused part and its magnified inset at overview progress f (canvas px, top-left origin). */
export function overviewInset(f: number, anchors: Record<string, OverviewAnchor>, width: number, height: number, stageWidth: number) {
  const i = Math.min(3, Math.floor(f * 4)), t = f * 4 - i, part = overviewParts[i], a = anchors[part.id];
  if (!a) return null;
  // Grows out of the ring early in the quarter, holds at the stop (t = .5), folds back before the next part.
  const grow = smooth((t - .06) / .34) * (1 - smooth((t - .7) / .24));
  const w = Math.min(stageWidth * .4, 600), h = Math.min(w * .66, height * .62);
  const right = a.x < stageWidth / 2;
  const tx = right ? stageWidth - w - stageWidth * .045 : stageWidth * .045, ty = height * .5 - h / 2 + height * .04;
  const sx = a.x - a.r, sy = a.y - a.r, s = a.r * 2;
  return {
    index: i, part, anchor: a, grow, side: right ? "right" as const : "left" as const,
    x: sx + (tx - sx) * grow, y: sy + (ty - sy) * grow, w: s + (w - s) * grow, h: s + (h - s) * grow,
  };
}

/** The destination cameras used by the four-way split, reused for the magnified inset. */
const look = new Vector3();
export function placeArmiDestinationCamera(asset: ArmiProductionAsset, cam: number, camera: PerspectiveCamera, aspect: number) {
  const name = ["TextAnswer", "MemoryRetrieval", "TavilySearch", "RobotAction"][cam];
  const ref = asset.root.getObjectByName(`CAM-WEB-Reference-${name}`) as PerspectiveCamera | undefined;
  if (cam === 1) { camera.position.set(37.8, 98, -22); camera.up.set(0, 1, 0); camera.lookAt(look.set(36, 99, -74)); camera.fov = 65; }
  else if (cam === 2) { camera.position.set(31, 40, -18); camera.up.set(0, 1, 0); camera.lookAt(look.set(31, 36, -49)); camera.fov = 68; }
  else if (ref) { ref.updateWorldMatrix(true, false); ref.getWorldPosition(camera.position); ref.getWorldQuaternion(camera.quaternion); camera.fov = ref.fov; }
  camera.aspect = aspect;
  if (aspect < 1) camera.fov = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) / aspect) * 180 / Math.PI;
  camera.near = .08; camera.far = 1000; camera.updateProjectionMatrix(); camera.layers.set(0);
}
