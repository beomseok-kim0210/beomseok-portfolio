import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { DistrictShotProfile } from "../types/contracts";

/** Editorial motion only. No coordinates, depths or load readings from a recording. */
export const HG_CLASSIFICATION = "EXPLANATORY VISUAL ALIGNMENT";
/** Hero occupies the first slice; the 7 reference scenes keep their relative timing after it. */
export const HG_HERO = .12;
const INNER = [0, .12, .24, .35, .49, .56, .72, .80, .89, 1] as const;
export const hgInner = (p: number) => Math.max(0, Math.min(1, (p - HG_HERO) / (1 - HG_HERO)));
export const hgOuter = (q: number) => HG_HERO + q * (1 - HG_HERO);
export const hgRanges = [0, ...INNER.map(hgOuter)] as readonly number[];
/** Scroll pacing only (authored timeline untouched): [timeline end, scroll weight] per segment.
 *  06 correction focus gets 2.2× room; the static 07 return hold keeps 35% so it closes the loop briefly. */
const HG_PACE = [[hgOuter(.762), 1], [hgOuter(.80), 2.2], [hgOuter(.885), 1], [1, .35]] as const;
export const HG_SCROLL_LENGTH = HG_PACE.reduce((sum, [end, w], i) => sum + (end - (i ? HG_PACE[i - 1][0] : 0)) * w, 0);
export function hgScrollToTimeline(scroll: number) {
  let left = Math.max(0, Math.min(1, scroll)) * HG_SCROLL_LENGTH, start = 0;
  for (const [end, w] of HG_PACE) { const span = (end - start) * w; if (left <= span) return start + left / w; left -= span; start = end; }
  return 1;
}
/** Scene copy follows the approved 7-scene reference; facts follow the repo audit. */
export const hgShots = [
  { id: "hero", scene: "00", title: "HANGARAE", ko: "행가래", text: "카메라가 읽은 움직임과 발판의 하중이, 다시 게임이 됩니다." },
  { id: "product", scene: "01", title: "ACTUAL GAME", ko: "실제 행가래 게임 화면", text: "상체 · 하체 두 가지 재활 게임을 먼저 보여줍니다." },
  { id: "camera", scene: "02", title: "CAMERA", ko: "카메라로 확대", text: "게임 UI가 사라지고 실시간 카메라 화면으로 접근합니다." },
  { id: "pose", scene: "03", title: "POSE", ko: "사람 → 21개 관절 스켈레톤", text: "사람 영상이 사라지고 관절 스켈레톤만 남습니다." },
  { id: "depth", scene: "04", title: "DEPTH / 3D XYZ", ko: "깊이 카메라가 관절에 Z를 더한다", text: "영상 속 관절은 평면 좌표뿐이라 카메라 쪽으로 움직이는 동작을 구분하기 어렵습니다. 그래서 관절 주변 깊이를 읽어 3차원 좌표를 만듭니다." },
  { id: "split", scene: "05", title: "BRANCH ANALYSIS", ko: "상체 / 하체 분석으로 분기", text: "두 게임이 동작을 판정하는 신호가 다릅니다. 상체는 관절 움직임을, 하체는 발판에 실린 하중을 분석합니다." },
  { id: "analysis", scene: "05", title: "BRANCH ANALYSIS", ko: "상체 / 하체 분석으로 분기", text: "두 게임이 동작을 판정하는 신호가 다릅니다. 상체는 관절 움직임을, 하체는 발판에 실린 하중을 분석합니다." },
  { id: "reaction", scene: "06", title: "GAME REACTION", ko: "성공과 교정, 각자의 게임으로", text: "분석 결과가 게임의 반응이 됩니다. 맞으면 성공을, 틀리면 교정 피드백을 돌려줍니다." },
  { id: "merge", scene: "07", title: "ACTUAL GAME (RETURN)", ko: "다시 실제 행가래 게임 화면으로", text: "처음 본 같은 게임 화면입니다. 이제 그 뒤의 인식과 분석을 알고 봅니다." },
  { id: "return", scene: "07", title: "ACTUAL GAME (RETURN)", ko: "다시 실제 행가래 게임 화면으로", text: "처음 본 같은 게임 화면입니다. 이제 그 뒤의 인식과 분석을 알고 봅니다." },
] as const;
/** Header cross-fade windows for scenes 01-07 (hero has its own title block). */
export const hgSceneRanges = ([[0, .12], [.12, .24], [.24, .35], [.35, .49], [.49, .72], [.72, .82], [.82, 1]] as const).map(([a, b]) => [hgOuter(a), hgOuter(b)] as const);
export const hangaraeRuntimeProfile: DistrictShotProfile = {
  profileId: "hangarae/shots", districtId: "hangarae", publishState: "published",
  shots: hgShots.map((s, i) => ({ shotId: s.id, localStart: hgRanges[i], localEnd: hgRanges[i + 1],
    desktopCameraProfileId: "hangarae/animatic-desktop", mobileCameraProfileId: "hangarae/animatic-mobile",
    narrativeReferenceId: `hangarae/animatic/${s.id}`, requiredAssetIds: [], reducedMotion: "still" })),
};
export function ramp(p: number, a: number, b: number) { const t = Math.max(0, Math.min(1, (p - a) / (b - a))); return t * t * (3 - 2 * t); }
export function hgShotIndex(p: number) { const i = hgRanges.slice(1).findIndex(end => p < end); return i < 0 ? hgShots.length - 1 : i; }
export type Rect = { x: number; y: number; width: number; height: number };

/* ── Product media ──────────────────────────────────────────────────────── */
/** The product GIFs are the real game UI (768×480). Animatic frames are stills cut from them. */
/** Percent-encoded: React emits image preload Link headers, which must be ASCII. */
export const hgGif = {
  upper: encodeURI("/images/상체_collect.gif"), lower: encodeURI("/images/하체_collect.gif"),
  upperFail: encodeURI("/images/상체틀림.gif"), lowerFail: encodeURI("/images/하체틀림.gif"),
} as const;
/** The same recordings re-encoded as video (GIF 44.4MB → mp4 1.1MB); the GIF paths stay for reference. */
export const hgVideo = {
  upper: "/images/hangarae/video/upper-collect", lower: "/images/hangarae/video/lower-collect",
  upperFail: "/images/hangarae/video/upper-fail", lowerFail: "/images/hangarae/video/lower-fail",
} as const;
/** GIFs exported 854-wide carry black padding right of the 768px UI; these need cropping. */
export const hgGifPadded = { upper: true, lower: true, upperFail: false, lowerFail: true } as const;
export const hgMedia = {
  upperStart: "upper-normal-47.png", upperHandoff: "upper-normal-94.png", camera: "camera-94.png",
  lowerStart: "lower-normal-17.png", upperReaction: "upper-normal-125.png", lowerReaction: "lower-normal-129.png",
  upperReturn: "upper-normal-172.png", upperSuccess: "upper-normal-156.png",
  upperFailure: "upper-failure-47.png", lowerFailure: "lower-failure-73.png",
} as const;
/** Animatic stills are served as WebP (PNG originals kept alongside): 1.9MB → ~0.2MB. */
export const hgAsset = (name: string) => `/images/hangarae/animatic/${name.replace(/\.png$/, ".webp")}`;
/** Camera panel inside the 768×480 product frame. */
export const HG_FRAME = { width: 768, height: 480 } as const;
export const HG_CAMERA_REGION = { x: 14, y: 55, width: 214, height: 407 } as const;

/* ── Layout (CSS px inside the sticky viewport) ─────────────────────────── */
const DESKTOP_CAM = { top: .255, height: .64 }, COMPACT_CAM = { top: .27, height: .56 };
export function hgLayout(width: number, height: number) {
  const compact = width <= 700;
  let product: [Rect, Rect];
  if (compact) {
    const w = width * .82, h = w * .625, x = (width - w) / 2;
    product = [{ x, y: height * .23, width: w, height: h }, { x, y: height * .23 + h + 50, width: w, height: h }];
  } else {
    const gap = width * .035, w = Math.min(width * .42, height * .5 * 1.6), h = w * .625, y = height * .35;
    product = [{ x: width / 2 - gap / 2 - w, y, width: w, height: h }, { x: width / 2 + gap / 2, y, width: w, height: h }];
  }
  const cam = compact ? COMPACT_CAM : DESKTOP_CAM;
  const ch = height * cam.height, cw = ch * HG_CAMERA_REGION.width / HG_CAMERA_REGION.height;
  const camera = { x: (width - cw) / 2, y: height * cam.top, width: cw, height: ch };
  const p0 = product[0], k = p0.width / HG_FRAME.width;
  const cameraStart = { x: p0.x + HG_CAMERA_REGION.x * k, y: p0.y + HG_CAMERA_REGION.y * k, width: HG_CAMERA_REGION.width * k, height: HG_CAMERA_REGION.height * k };
  // 06: per branch a success card and a correction card (real GIFs), columns centred in each half.
  let reaction: { upperOk: Rect; upperFail: Rect; lowerOk: Rect; lowerFail: Rect };
  if (compact) {
    const inset = (r: Rect): Rect => { const w = r.width * .44, h = w * .625; return { x: r.x + r.width - w - 8, y: r.y + r.height - h - 8, width: w, height: h }; };
    reaction = { upperOk: product[0], upperFail: inset(product[0]), lowerOk: product[1], lowerFail: inset(product[1]) };
  } else {
    const head = 34, gap = 26, top = height * .235, bottom = height * .91;
    const ch = Math.min((bottom - top - gap - head * 2) / 2, width * .36 * .625), cw = ch * 1.6;
    const col = (cx: number): [Rect, Rect] => [{ x: cx - cw / 2, y: top + head, width: cw, height: ch }, { x: cx - cw / 2, y: top + head * 2 + ch + gap, width: cw, height: ch }];
    const [uo, uf] = col(width * .25), [lo, lf] = col(width * .75);
    reaction = { upperOk: uo, upperFail: uf, lowerOk: lo, lowerFail: lf };
  }
  return { compact, product, camera, cameraStart, reaction, ret: product };
}
function rectMix(a: Rect, b: Rect, t: number): Rect { if (t <= 0) return a; if (t >= 1) return b; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, width: a.width + (b.width - a.width) * t, height: a.height + (b.height - a.height) * t }; }

/* ── Timeline ───────────────────────────────────────────────────────────── */
const DEG = Math.PI / 180;
export function sampleHangarae(p: number, width: number, height: number, reduced = false) {
  p = Math.max(0, Math.min(1, p));
  const originalP = p, shot = hgShotIndex(p);
  if (reduced) p = shot === 0 ? .02 : hgOuter([.06, .235, .33, .46, .555, .66, .775, .86, .95][shot - 1]);
  // Hero: wipe in over the ARMI brief, particles assemble the body, title reveals, then hands to 01.
  const eff = p, hero = 1 - ramp(p, .084, .1), intro = ramp(p, .09, .108);
  const wipe = reduced ? 1 : ramp(p, 0, .026), assemble = reduced ? 1 : ramp(p, .01, .055), shell = reduced ? 1 : ramp(p, .042, .07), title = reduced ? 1 : ramp(p, .004, .04);
  p = hgInner(p);
  const layout = hgLayout(width, height);
  const zoom = ramp(p, .125, .215), split = ramp(p, .495, .565), merge = ramp(p, .80, .872);
  const space = ramp(p, .36, .445), unorbit = ramp(p, .49, .535);
  return {
    p: originalP, q: p, eff, shot, layout, zoom, split, merge, space, unorbit, hero, intro, wipe, assemble, shell, title,
    /** 06: 0 = success in focus, 1 = correction in focus; success regains focus as it merges. */
    focus: ramp(p, .762, .776) * (1 - ramp(p, .796, .814)),
    handoff: ramp(p, .105, .13), lowerOut: ramp(p, .12, .17), cardChrome: 1 - ramp(p, .12, .16),
    cameraRect: reduced ? layout.camera : rectMix(layout.cameraStart, layout.camera, zoom),
    /** DOM owns the camera crop until the analytic 3D plane sits on the identical rect. */
    cameraDomOwnership: 1 - ramp(p, .228, .236),
    frame: ramp(p, .15, .21) * (1 - ramp(p, .30, .34)),
    pose: ramp(p, .245, .30), person: 1 - ramp(p, .282, .335),
    legend: ramp(p, .288, .325) * (1 - ramp(p, .343, .362)),
    grid: ramp(p, .352, .40) * (1 - ramp(p, .50, .535)),
    /** Depth camera: device, frustum, top-to-bottom scan building a point cloud, then rays to joints. */
    device: ramp(p, .345, .375) * (1 - ramp(p, .475, .505)),
    scan: ramp(p, .362, .43),
    cloud: ramp(p, .368, .395) * (1 - ramp(p, .465, .5)),
    rays: ramp(p, .405, .435) * (1 - ramp(p, .468, .49)),
    depthUI: ramp(p, .425, .455) * (1 - ramp(p, .48, .50)),
    seam: ramp(p, .50, .545) * (1 - ramp(p, .80, .84)),
    holo: ramp(p, .56, .61) * (1 - ramp(p, .705, .732)),
    analysis: ramp(p, .56, .605) * (1 - ramp(p, .698, .722)),
    charts: ramp(p, .575, .70),
    reaction: ramp(p, .728, .765) * (1 - ramp(p, .80, .872)),
    fail: ramp(p, .742, .775) * (1 - ramp(p, .80, .835)),
    returnFrame: ramp(p, .845, .885),
    returnDomOwnership: ramp(p, .80, .83),
    angle: reduced ? 0 : space * (1 - unorbit) * 32 * DEG,
    pitch: reduced ? 0 : space * (1 - unorbit) * 10 * DEG,
    distance: 8 - 1.6 * space * (1 - unorbit) + split,
  };
}
export type HangaraeSample = ReturnType<typeof sampleHangarae>;

/* ── World mapping ──────────────────────────────────────────────────────── */
export const HG_FOV = 43;
export const hgViewHeight = (distance: number) => 2 * distance * Math.tan(HG_FOV * DEG / 2);
/** World point at z=0 for a px position, camera frontal at distance 8 (exact for shots 02–03). */
export function hgWorldFromPx(x: number, y: number, width: number, height: number, distance = 8) {
  const k = hgViewHeight(distance) / height;
  return new Vector3((x - width / 2) * k, (height / 2 - y) * k, 0);
}
export function sampleHangaraeCamera(p: number, compact: boolean, reduced = false, out = { position: new Vector3(), target: new Vector3(), up: new Vector3(), fov: HG_FOV, far: 80 }) {
  const s = sampleHangarae(p, compact ? 390 : 1440, compact ? 772 : 828, reduced);
  const pivotY = poseCenterY(compact) * s.space * (1 - s.unorbit);
  out.target.set(0, pivotY, 0);
  const d = s.distance;
  out.position.set(Math.sin(s.angle) * Math.cos(s.pitch) * d, pivotY + Math.sin(s.pitch) * d, Math.cos(s.angle) * Math.cos(s.pitch) * d);
  out.up.set(0, 1, 0); out.fov = HG_FOV; out.far = 80; return out;
}

/* ── Pose schema ────────────────────────────────────────────────────────── */
/** COCO 17 + foot 4 = 21 schema slots (audited source). Positions below are a MANUAL
 * screen-side registration against the product's own skeleton drawn in the 214×407 crop
 * (GIF frame 94). Laterality/mirroring is unresolved, so slots are named by screen side.
 * z is authored explanatory displacement in crop px — never measured depth. */
export const hgJointNames = [
  "nose", "eye·a", "eye·b", "ear·a", "ear·b", "shoulder·a", "shoulder·b", "elbow·a", "elbow·b", "wrist·a", "wrist·b",
  "hip·a", "hip·b", "knee·a", "knee·b", "ankle·a", "ankle·b", "heel·a", "toe·a", "heel·b", "toe·b",
] as const;
export const hgAnchors = [
  [108.5, 94, 20], [102, 89.5, 16], [115, 90, 16], [95, 97, -2], [123, 97, -2],
  [86, 117, 0], [129.5, 118, 0], [73, 93, 18], [148, 104, 14], [75.5, 67.5, 40], [147.5, 70, 30],
  [92, 189, 0], [122.5, 189, 0], [89.5, 241, 14], [124, 239.5, 12], [95.5, 286, 2], [120, 287, 2],
  [99.5, 292, -14], [101, 301, 28], [116, 292.5, -14], [126, 302.5, 28],
] as const;
export const HG_FACE = [0, 1, 2, 3, 4] as const;
export const hgBones = [
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
  [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 6], [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [15, 17], [17, 18], [16, 19], [19, 20],
] as const;
export const hgIsLower = (i: number) => i >= 11;
export const hgBoneIsLower = ([a, b]: readonly [number, number]) => a >= 11 && b >= 11;
function camFrac(compact: boolean) { return compact ? COMPACT_CAM : DESKTOP_CAM; }
function poseCenterY(compact: boolean) { const c = camFrac(compact); return (.5 - (c.top + 185 / 407 * c.height)) * hgViewHeight(8); }
/** Base (2D) pose in world units, registered to the camera rect; independent of viewport size. */
export function hgBasePose(compact: boolean, depth = 0) {
  const c = camFrac(compact), vh = hgViewHeight(8), unit = c.height * vh / 407;
  return hgAnchors.map(([x, y, z]) => new Vector3((x - 107) * unit, (.5 - (c.top + y / 407 * c.height)) * vh, z * unit * depth));
}
export const hgFloorY = (compact: boolean) => hgBasePose(compact)[20].y - .04;

/* ── Branch rigs (body units ≈ m, floor y=0) ────────────────────────────── */
/** Upper analysis rig: one arm raised forward (shoulder flexion), other arm resting. */
export const hgUpperRig: [number, number, number][] = [
  [0, 1.60, .10], [-.032, 1.635, .085], [.032, 1.635, .085], [-.078, 1.61, -.01], [.078, 1.61, -.01],
  [-.19, 1.42, 0], [.19, 1.42, 0], [-.23, 1.15, -.03], [.22, 1.40, .29], [-.25, .91, .03], [.24, 1.36, .57],
  [-.095, .95, 0], [.095, .95, 0], [-.11, .52, .02], [.11, .52, .02], [-.11, .09, 0], [.11, .09, 0],
  [-.11, .035, -.06], [-.12, .02, .13], [.11, .035, -.06], [.12, .02, .13],
];
/** Lower analysis rig: standing on the single load-cell footplate. */
export const hgLowerRig: [number, number, number][] = [
  [0, 1.60, .10], [-.032, 1.635, .085], [.032, 1.635, .085], [-.078, 1.61, -.01], [.078, 1.61, -.01],
  [-.19, 1.42, 0], [.19, 1.42, 0], [-.28, 1.17, -.01], [.28, 1.17, -.01], [-.34, .94, .04], [.34, .94, .04],
  [-.095, .95, 0], [.095, .95, 0], [-.11, .52, .03], [.11, .52, .03], [-.105, .095, 0], [.105, .095, 0],
  [-.105, .04, -.06], [-.12, .025, .14], [.105, .04, -.06], [.12, .025, .14],
];
/** Single footplate (body units) under both feet — one load signal, per audited facts. */
export const HG_PLATE = { center: [0, -.035, .03], size: [.66, .07, .48] } as const;
export type RigPlacement = { origin: Vector3; scale: number; yaw: number; pitch: number };
export function hgRigMatrix(r: RigPlacement, out = new Matrix4()) {
  return out.compose(r.origin, new Quaternion().setFromEuler(new Euler(r.pitch, r.yaw, 0, "YXZ")), new Vector3(r.scale, r.scale, r.scale));
}
export function hgRigWorld(rig: [number, number, number][], r: RigPlacement) {
  const m = hgRigMatrix(r);
  return rig.map(([x, y, z]) => new Vector3(x, y, z).applyMatrix4(m));
}
/** Translate a placement so the bbox (screen x/y) of the given body-space points is centred on target. */
function centred(r: RigPlacement, pts: [number, number, number][], tx: number, ty: number): RigPlacement {
  const w = hgRigWorld(pts, r), xs = w.map(v => v.x), ys = w.map(v => v.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { ...r, origin: new Vector3(r.origin.x + tx - cx, r.origin.y + ty - cy, r.origin.z) };
}
const upperExtent = (): [number, number, number][] => {
  const [sx, sy, sz] = hgUpperRig[10], [ex, ey, ez] = hgUpperRig[8], d = [sx - ex, sy - ey, sz - ez], l = Math.hypot(d[0], d[1], d[2]);
  return [...hgUpperRig.slice(0, 11), [0, 1.76, 0], [-.2, .93, 0], [.2, .93, 0], [sx + d[0] / l * .17, sy + d[1] / l * .17, sz + d[2] / l * .17]];
};
const lowerExtent = (): [number, number, number][] => {
  const [cx, cy, cz] = HG_PLATE.center, [w, h, d] = HG_PLATE.size;
  return [...hgLowerRig.slice(11), [cx - w / 2, cy - h / 2, cz - d / 2], [cx + w / 2, cy - h / 2, cz + d / 2], [cx - w / 2, cy, cz + d / 2], [cx + w / 2, cy, cz - d / 2], [0, 1.0, 0]];
};
/** Branch placement: each figure centred in its own half (desktop) or band (compact). Camera frontal at d=9. */
export function hgRigPlacement(width: number, height: number) {
  const compact = width <= 700, vh = hgViewHeight(9), halfW = vh / 2 * width / height, y = (f: number) => (.5 - f) * vh;
  const base = (scale: number, yaw: number, pitch: number): RigPlacement => ({ origin: new Vector3(), scale, yaw, pitch });
  if (compact) {
    return {
      compact,
      upper: centred(base(vh * .23 / .8, 50 * DEG, 0), upperExtent(), -halfW * .22, y(.41)),
      lower: centred(base(vh * .22 / .95, -34 * DEG, 12 * DEG), lowerExtent(), -halfW * .22, y(.79)),
    };
  }
  const fit = Math.max(.62, Math.min(1, width / height / 1.74));
  return {
    compact,
    upper: centred(base(vh * .5 / .85 * fit, 50 * DEG, 0), upperExtent(), -halfW / 2, y(.625)),
    lower: centred(base(vh * .45 / 1.05 * fit ** .8, -34 * DEG, 12 * DEG), lowerExtent(), halfW / 2, y(.6)),
  };
}
/** Hero hologram: full standing body on the footplate, right of the title. Camera frontal at d=8. */
export function hgHeroPlacement(width: number, height: number): RigPlacement {
  const compact = width <= 700, vh = hgViewHeight(8), halfW = vh / 2 * width / height, y = (f: number) => (.5 - f) * vh;
  const scale = vh * (compact ? .46 : .7) / 1.85;
  return centred({ origin: new Vector3(), scale, yaw: 0, pitch: 4 * DEG }, [[0, 1.76, 0], ...lowerExtent()], compact ? 0 : halfW * .4, compact ? y(.64) : y(.57));
}
