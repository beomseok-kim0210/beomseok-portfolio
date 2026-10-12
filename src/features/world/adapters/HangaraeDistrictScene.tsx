"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { docentOverlayPx } from "@/features/docent/docentOverlay";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Camera, Color, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Points,
  SRGBColorSpace, ShaderMaterial, TextureLoader, Vector3,
} from "three";
import type { WorldRuntime } from "../director/worldRuntime";
import {
  HG_PLATE, hgAsset, hgBasePose, hgBones, hgFloorY, hgAnchors, hgHeroPlacement, hgLowerRig, hgMedia, hgRigMatrix, hgRigPlacement, hgRigWorld,
  hgUpperRig, hgViewHeight, hgWorldFromPx, ramp, sampleHangarae, type RigPlacement,
} from "./hangaraeAnimatic";
import { GlowPoints, GlowSegments, createAssemblyMaterial, createCloudMaterial, createDiscMaterial, createGridMaterial, createHoloMaterial } from "./hangaraeGlow";
import { hangaraeBodySpecs, loadBody } from "./hangaraeBodyLoader";

/* Palette (linear, HDR so the bloom pass picks the neon up). Kept restrained: glow, not glare. */
const C = {
  up: new Color(0.35, 0.78, 0.85).multiplyScalar(1.05),
  upSoft: new Color(0.44, 0.64, 0.86),
  face: new Color(0.53, 0.84, 0.89),
  low: new Color(0.86, 0.66, 0.39),
  lowSoft: new Color(0.9, 0.69, 0.42),
  active: new Color(0.9, 0.67, 0.36).multiplyScalar(1.25),
  orange: new Color(0.92, 0.52, 0.28).multiplyScalar(1.2),
  plate: new Color(0.39, 0.8, 0.86).multiplyScalar(1.25),
  device: new Color(0.64, 0.88, 0.91).multiplyScalar(1.1),
  red: new Color(0.93, 0.32, 0.36).multiplyScalar(1.3),
};
const depthStops = [new Color(0.38, 0.59, 0.84), new Color(0.34, 0.78, 0.84), new Color(0.93, 0.82, 0.39), new Color(0.92, 0.45, 0.26)];
function depthColor(z: number, out: Color) {
  const t = Math.max(0, Math.min(1, (z + 14) / 54)) * 3, i = Math.min(2, Math.floor(t));
  return out.copy(depthStops[i]).lerp(depthStops[i + 1], t - i).multiplyScalar(1.2);
}
/* Draw-on order: torso first, then limbs outward, face and feet last. */
const boneOrder = hgBones.map(([a, b]) => {
  const k = `${a}-${b}`;
  if (["5-6", "5-11", "6-12", "11-12"].includes(k)) return 0;
  if (["5-7", "6-8", "11-13", "12-14", "3-5", "4-6"].includes(k)) return .35;
  if (["7-9", "8-10", "13-15", "14-16"].includes(k)) return .6;
  return .82;
});
const jointOrder = hgAnchors.map((_, i) => i <= 4 ? .82 : [5, 6, 11, 12].includes(i) ? 0 : [7, 8, 13, 14].includes(i) ? .35 : [9, 10, 15, 16].includes(i) ? .6 : .82);
const UP = new Vector3(0, 1, 0);
const v3 = (a: readonly number[]) => new Vector3(a[0], a[1], a[2]);
function ellipse(center: Vector3, ax: Vector3, az: Vector3, rx: number, rz: number, from = 0, to = Math.PI * 2, n = 40) {
  return Array.from({ length: n + 1 }, (_, i) => { const t = from + (to - from) * i / n; return center.clone().addScaledVector(ax, Math.cos(t) * rx).addScaledVector(az, Math.sin(t) * rz); });
}
function project(v: Vector3, camera: Camera, w: number, h: number) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * w, (1 - p.y) / 2 * h] as const; }

/** A hologram body: depth prepass + additive fresnel shell sharing one marching-cubes geometry. */
type Holo = { group: Group; depth: Mesh; shell: Mesh; mat: ShaderMaterial; ready: boolean };
function makeHolo(prepass: MeshBasicMaterial, mat: ShaderMaterial): Holo {
  const group = new Group(); group.matrixAutoUpdate = false;
  const empty = new BufferGeometry();
  const depth = new Mesh(empty, prepass), shell = new Mesh(empty, mat);
  depth.renderOrder = 4; shell.renderOrder = 5; depth.frustumCulled = shell.frustumCulled = false;
  group.add(depth, shell); group.visible = false;
  return { group, depth, shell, mat, ready: false };
}
/** Single load-cell footplate: dark glass slab + pressure discs; edges are glow segments. */
function makePlate(geo: { box: BoxGeometry; disc: PlaneGeometry }) {
  const group = new Group(); group.matrixAutoUpdate = false; group.visible = false;
  const slab = new MeshBasicMaterial({ color: "#121f2e", transparent: true, depthWrite: false });
  const discs = [createDiscMaterial("#63cbdb"), createDiscMaterial("#63cbdb"), createDiscMaterial("#e7b16a"), createDiscMaterial("#7ba9de")];
  const [, , cz] = HG_PLATE.center, topY = HG_PLATE.center[1] + HG_PLATE.size[1] / 2 + .004, botY = HG_PLATE.center[1] - HG_PLATE.size[1] / 2 - .01;
  const box = new Mesh(geo.box, slab); box.position.set(HG_PLATE.center[0], HG_PLATE.center[1], HG_PLATE.center[2]); box.renderOrder = 3;
  group.add(box);
  const add = (m: ShaderMaterial, x: number, y: number, z: number, sx: number, sz: number) => { const d = new Mesh(geo.disc, m); d.position.set(x, y, z); d.rotation.x = -Math.PI / 2; d.scale.set(sx, sz, 1); d.renderOrder = 6; group.add(d); };
  add(discs[0], -.125, topY, cz + .02, .34, .42); add(discs[1], .125, topY, cz + .02, .34, .42);
  add(discs[2], 0, topY - .001, cz, .95, .7); add(discs[3], 0, botY, cz, 1.9, 1.5);
  return { group, slab, discs };
}
type Plate = ReturnType<typeof makePlate>;

export function HangaraeDistrictScene({ runtime }: { runtime: WorldRuntime }) {
  const { size, gl } = useThree();
  const compact = size.width <= 700;
  const cameraTexture = useLoader(TextureLoader, hgAsset(hgMedia.camera));
  cameraTexture.colorSpace = SRGBColorSpace;
  const cameraPlane = useRef<Mesh>(null), grid = useRef<Mesh>(null), cloud = useRef<Points>(null);
  const [cloudGeo, setCloudGeo] = useState<BufferGeometry | null>(null);
  const kit = useMemo(() => {
    const bones = new GlowSegments(220, .26, .75), deco = new GlowSegments(1400, .3, .72), joints = new GlowPoints(110);
    // Depth prepass pushed back slightly so the shell's own front surface always wins (no speckle).
    const prepass = new MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
    const holo = {
      u: makeHolo(prepass, createHoloMaterial("#5590d4", "#77d1df")),
      l: makeHolo(prepass, createHoloMaterial("#e3a452", "#e7b16a")),
      hero: makeHolo(prepass, createHoloMaterial("#5590d4", "#77d1df", "#e3a452", "#e7b16a")),
    };
    holo.u.mat.uniforms.uFadeY.value.set(.93, 1.09, 1e4, 1e4 + 1);
    holo.l.mat.uniforms.uFadeY.value.set(-1e4, -9999, .95, 1.07);
    holo.hero.mat.uniforms.uSplitY.value = .97;
    const geo = { box: new BoxGeometry(...HG_PLATE.size), disc: new PlaneGeometry(1, 1) };
    // Hero assembly particles live in the hero group (body space), filled once the hero body is built.
    const assemblyMat = createAssemblyMaterial(), assembly = new Points(new BufferGeometry(), assemblyMat);
    assembly.frustumCulled = false; assembly.renderOrder = 7; holo.hero.group.add(assembly);
    return { bones, deco, joints, prepass, holo, geo, plate: makePlate(geo), heroPlate: makePlate(geo), gridMat: createGridMaterial("#5691d5"), cloudMat: createCloudMaterial(), assembly, assemblyMat };
  }, []);
  useEffect(() => () => {
    kit.bones.dispose(); kit.deco.dispose(); kit.joints.dispose(); kit.prepass.dispose(); kit.gridMat.dispose(); kit.cloudMat.dispose(); kit.assemblyMat.dispose(); kit.assembly.geometry.dispose();
    Object.values(kit.holo).forEach(h => h.mat.dispose()); kit.geo.box.dispose(); kit.geo.disc.dispose();
    [kit.plate, kit.heroPlate].forEach(p => { p.slab.dispose(); p.discs.forEach(d => d.dispose()); });
  }, [kit]);
  // Bodies are polygonised off the main thread; until they arrive only the skeletons show.
  useEffect(() => {
    let live = true;
    const assign = (h: Holo) => ({ geometry }: { geometry: BufferGeometry }) => { if (!live) return; h.depth.geometry = h.shell.geometry = geometry; h.ready = true; };
    const specs = hangaraeBodySpecs(compact);
    loadBody(specs.hero.key, specs.hero.spec).then(asset => {
      assign(kit.holo.hero)(asset); if (!live) return;
      // Scatter: each surface point starts off to the left (where the ARMI brief was) and around the body.
      const n = asset.points.length / 3, start = new Float32Array(n * 3), seed = new Float32Array(n);
      let r = 7;
      const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, b = rnd() * 2 - 1, k = .5 + rnd() * 1.4, q = Math.sqrt(1 - b * b);
        start[i * 3] = asset.points[i * 3] + Math.cos(a) * q * k - .9 * rnd(); start[i * 3 + 1] = asset.points[i * 3 + 1] + b * k * .8; start[i * 3 + 2] = asset.points[i * 3 + 2] + Math.sin(a) * q * k;
        seed[i] = rnd();
      }
      const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(asset.points.slice(), 3)); g.setAttribute("aStart", new BufferAttribute(start, 3)); g.setAttribute("aSeed", new BufferAttribute(seed, 1));
      kit.assembly.geometry.dispose(); kit.assembly.geometry = g;
    });
    loadBody(specs.upper.key, specs.upper.spec).then(assign(kit.holo.u));
    loadBody(specs.lower.key, specs.lower.spec).then(assign(kit.holo.l));
    loadBody(specs.base.key, specs.base.spec).then(({ points }) => {
      if (!live) return; const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(points.slice(), 3)); setCloudGeo(g);
    });
    return () => { live = false; };
  }, [kit, compact]);
  useEffect(() => () => cloudGeo?.dispose(), [cloudGeo]);

  const work = useMemo(() => ({ u: hgAnchors.map(() => new Vector3()), l: hgAnchors.map(() => new Vector3()), d: hgAnchors.map(() => new Vector3()), col: new Color(), m: new Matrix4(), hm: new Matrix4() }), []);
  const basePose = useMemo(() => ({ desktop: hgBasePose(false, 1), compact: hgBasePose(true, 1), flatD: hgBasePose(false), flatC: hgBasePose(true) }), []);

  useFrame(({ camera, clock }) => {
    const W = size.width, H = size.height, p = runtime.hangaraeProgress.current;
    const SW = W - docentOverlayPx(); // stage width: same rect the DOM layer composes in
    const s = sampleHangarae(p, SW, H), q = s.q, cmp = s.layout.compact, t = clock.elapsedTime, dpr = gl.getPixelRatio();
    const deep = cmp ? basePose.compact : basePose.desktop, flat = cmp ? basePose.flatC : basePose.flatD;
    const place = hgRigPlacement(SW, H), U = hgRigWorld(hgUpperRig, place.upper), L = hgRigWorld(hgLowerRig, place.lower);
    const e = s.split, out = 1 - ramp(q, .705, .735), alive = out * (1 - s.merge) * (1 - s.hero);
    const B = kit.bones, J = kit.joints, D = kit.deco; B.begin(); J.begin(); D.begin();
    const sz = cmp ? .78 : 1;

    const plateFrame = (pl: Plate, m: Matrix4, a: number, time: number, load: number) => {
      pl.slab.opacity = .8 * a;
      const pulse = .65 + .35 * Math.sin(time * 2.4);
      pl.discs[0].uniforms.uAlpha.value = a * (.5 + .4 * pulse) * load; pl.discs[1].uniforms.uAlpha.value = a * (.5 + .4 * (1 - pulse)) * load;
      pl.discs[2].uniforms.uAlpha.value = a * .55; pl.discs[3].uniforms.uAlpha.value = a * .3;
      pl.discs.forEach(d => { d.uniforms.uTime.value = time; });
      const [cx, cy, cz] = HG_PLATE.center, [sx, sy, sz2] = HG_PLATE.size;
      const corner = (x: number, y: number, z: number) => new Vector3(cx + x * sx / 2, cy + y * sy / 2, cz + z * sz2 / 2).applyMatrix4(m);
      const top = [corner(-1, 1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(-1, 1, 1)], bot = [corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1), corner(-1, -1, 1)];
      for (let i = 0; i < 4; i++) { D.push(top[i], top[(i + 1) % 4], C.plate, a * .9, 3); D.push(bot[i], bot[(i + 1) % 4], C.plate, a * .4, 2.2); D.push(top[i], bot[i], C.plate, a * .5, 2.2); }
      const inset = (x: number, z: number) => new Vector3(cx + x * (sx / 2 - .045), cy + sy / 2 + .002, cz + z * (sz2 / 2 - .045)).applyMatrix4(m);
      const ins = [inset(-1, -1), inset(1, -1), inset(1, 1), inset(-1, 1)];
      for (let i = 0; i < 4; i++) D.push(ins[i], ins[(i + 1) % 4], C.lowSoft, a * .5, 2.2);
    };

    /* 00 Hero: one standing hologram (upper cyan / lower violet) turning on the footplate. */
    const heroA = s.hero;
    const hp: RigPlacement = { ...hgHeroPlacement(SW, H), yaw: .45 + t * .28 };
    const hm = hgRigMatrix(hp, work.hm);
    kit.holo.hero.group.visible = heroA > .002 && kit.holo.hero.ready;
    kit.heroPlate.group.visible = heroA > .002;
    const shellA = heroA * s.shell, built = ramp(s.assemble, .35, 1);
    kit.holo.hero.shell.visible = kit.holo.hero.depth.visible = shellA > .002;
    kit.assemblyMat.uniforms.uT.value = s.assemble * 1.0; kit.assemblyMat.uniforms.uAlpha.value = heroA * (s.assemble > 0 ? 1 : 0) * (1 - .7 * s.shell);
    kit.assemblyMat.uniforms.uDpr.value = dpr; kit.assemblyMat.uniforms.uSize.value = cmp ? 1.8 : 2.3;
    if (heroA > .002) {
      kit.holo.hero.group.matrix.copy(hm); kit.holo.hero.group.matrixWorldNeedsUpdate = true;
      kit.heroPlate.group.matrix.copy(hm); kit.heroPlate.group.matrixWorldNeedsUpdate = true;
      const scanY = .04 + 1.72 * ((t * .16) % 1), u = kit.holo.hero.mat.uniforms;
      u.uAlpha.value = shellA; u.uTime.value = t; u.uScanY.value = scanY; u.uScanA.value = 1;
      const HJ = hgLowerRig.map(v => v3(v).applyMatrix4(hm));
      hgBones.forEach(([a, b]) => { if (a <= 4) return; const lower = a >= 11 && b >= 11; B.push(HJ[a], HJ[b], lower ? C.low : C.up, shellA * .5, 2.4 * sz); });
      HJ.forEach((j, i) => { if (i > 4) J.push(j, i >= 11 ? C.low : C.up, shellA * .55, 11 * sz); });
      const ring = ellipse(new Vector3(0, scanY, .01), new Vector3(1, 0, 0), new Vector3(0, 0, 1), .34, .26, 0, Math.PI * 2, 48).map(v => v.applyMatrix4(hm));
      D.polyline(ring, scanY > .97 ? C.up : C.lowSoft, shellA * .6, 2.8);
      plateFrame(kit.heroPlate, hm, heroA * built, t, 1);
    }

    /* 02-03: the camera crop as an analytic plane on z=0, exactly under the DOM rect. */
    if (cameraPlane.current) {
      const r = s.layout.camera, c = hgWorldFromPx(r.x + r.width / 2, r.y + r.height / 2, SW, H), k = hgViewHeight(8) / H;
      cameraPlane.current.position.copy(c); cameraPlane.current.scale.set(r.width * k, r.height * k, 1);
      const m = cameraPlane.current.material as MeshBasicMaterial;
      m.opacity = (q >= .226 ? 1 : 0) * s.person; cameraPlane.current.visible = m.opacity > .002;
    }
    /* Pose instances: one skeleton that splits into an upper (motion) and lower (sensor) branch. */
    for (let i = 0; i < hgAnchors.length; i++) {
      work.d[i].lerpVectors(flat[i], deep[i], s.space);
      work.u[i].lerpVectors(work.d[i], U[i], e);
      work.l[i].lerpVectors(work.d[i], L[i], e);
    }
    const floorY = hgFloorY(cmp);

    /* Skeleton bones. */
    const swap = ramp(e, 0, .35);
    hgBones.forEach(([a, b], k) => {
      const o = boneOrder[k] * .6, grow = Math.max(0, Math.min(1, (s.pose - o) / .4));
      if (grow <= 0 || alive <= .002) return;
      const lower = a >= 11 && b >= 11, face = a <= 4 && b <= 4, neckLink = (a === 3 && b === 5) || (a === 4 && b === 6);
      const width = (face ? 2.6 : 4) * sz * (e > .5 ? .85 : 1);
      const ua = alive * (lower ? 1 - swap : 1) * (face || neckLink ? 1 - ramp(e, .2, .7) : 1) * (1 - .4 * s.holo);
      B.push(work.u[a].clone(), work.u[a].clone().lerp(work.u[b], grow), face ? C.face : lower ? C.low : C.up, ua, width);
      if (lower && swap > 0) B.push(work.l[a].clone(), work.l[a].clone().lerp(work.l[b], grow), C.low, alive * swap * (1 - .4 * s.holo), width);
    });

    /* Joints — restrained size so they read as points, not flares. */
    for (let i = 0; i < hgAnchors.length && alive > .002; i++) {
      const o = jointOrder[i] * .6, a = ramp(s.pose, o + .15, o + .45);
      if (a <= 0) continue;
      const lower = i >= 11, face = i <= 4, base = face ? C.face : lower ? C.low : C.up;
      depthColor(hgAnchors[i][2], work.col); work.col.lerp(base, 1 - s.space * (1 - e));
      const size0 = (face ? 10 : i >= 17 ? 13 : 22 + 3 * s.space) * sz;
      if (!lower) {
        const hot = e > 0 && [6, 8, 10].includes(i);
        J.push(work.u[i], hot ? work.col.clone().lerp(C.active, e) : work.col, alive * a * (face ? 1 - ramp(e, .2, .7) : 1), hot ? size0 + 8 * e * sz : size0);
      } else {
        J.push(work.u[i], work.col, alive * a * (1 - swap), size0);
        if (swap > 0) {
          const hot = [13, 14, 15, 16].includes(i);
          J.push(work.l[i], work.col.clone().lerp(hot ? C.orange : C.low, e), alive * a * swap, size0 + (hot ? 7 : 0) * e * sz);
        }
      }
    }

    /* 04: depth camera in front of the body — device, frustum, top-to-bottom scan, rays to joints. */
    const devA = s.device * alive;
    const bodyTop = deep[0].y + (deep[0].y - deep[5].y) * 1.6, center = new Vector3(0, (bodyTop + floorY) / 2, 0);
    const devPos = new Vector3(cmp ? -.25 : -.85, center.y + .35, 3.0);
    const fwd = center.clone().sub(devPos).normalize(), right = new Vector3().crossVectors(fwd, UP).normalize(), upv = new Vector3().crossVectors(right, fwd);
    const lens = devPos.clone().addScaledVector(fwd, .07);
    const fh = (bodyTop - floorY) / 2 + .15, fw = fh * .62;
    const fc = [center.clone().addScaledVector(right, -fw).addScaledVector(upv, fh), center.clone().addScaledVector(right, fw).addScaledVector(upv, fh), center.clone().addScaledVector(right, fw).addScaledVector(upv, -fh), center.clone().addScaledVector(right, -fw).addScaledVector(upv, -fh)];
    const scanY = bodyTop + .1 - (bodyTop + .1 - floorY) * s.scan;
    if (devA > .002) {
      const box = (x: number, y: number, z: number) => devPos.clone().addScaledVector(right, x).addScaledVector(upv, y).addScaledVector(fwd, z);
      const hw = .27, hh = .07, hd = .07;
      const cs = [box(-hw, -hh, -hd), box(hw, -hh, -hd), box(hw, hh, -hd), box(-hw, hh, -hd), box(-hw, -hh, hd), box(hw, -hh, hd), box(hw, hh, hd), box(-hw, hh, hd)];
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => D.push(cs[a], cs[b], C.device, devA * .85, 2.6));
      for (const [x, col, r] of [[-.16, C.device, .038], [.16, C.device, .038], [.02, C.red, .022]] as const) {
        const c = box(x, 0, hd + .002); D.polyline(ellipse(c, right, upv, r, r, 0, Math.PI * 2, 20), col, devA, 2.4); J.push(c, col, devA * .8, 9 * sz);
      }
      const foot = new Vector3(devPos.x, floorY, devPos.z), hub = foot.clone().add(new Vector3(0, .25, 0));
      D.push(box(0, -hh, 0), hub, C.upSoft, devA * .6, 2.2);
      for (let k = 0; k < 3; k++) { const ang = k * Math.PI * 2 / 3; D.push(hub, foot.clone().add(new Vector3(Math.cos(ang) * .28, 0, Math.sin(ang) * .28)), C.upSoft, devA * .5, 2); }
      // Frustum to a frame around the body.
      fc.forEach((c, i) => { D.push(lens, c, C.upSoft, devA * .3, 2); D.push(c, fc[(i + 1) % 4], C.upSoft, devA * .38, 2); });
      // Scan line sweeping down the frame; the fan from the lens shows what is being read.
      if (s.scan > 0 && s.scan < 1) {
        const lft = fc[0].clone().lerp(fc[3], (fc[0].y - scanY) / (fc[0].y - fc[3].y)), rgt = fc[1].clone().lerp(fc[2], (fc[1].y - scanY) / (fc[1].y - fc[2].y));
        D.push(lft, rgt, [.55, .8, 1.05], devA * .7, 2.6); D.push(lens, lft, C.up, devA * .35, 1.8); D.push(lens, rgt, C.up, devA * .35, 1.8);
      }
    }
    const rayA = s.rays * alive;
    if (rayA > .002) {
      for (let i = 0; i < hgAnchors.length; i++) {
        if (i >= 1 && i <= 4) continue;
        depthColor(hgAnchors[i][2], work.col);
        D.push(lens, work.d[i], work.col, rayA * .26, 1.8);
        const ph = (t * .9 + i * .137) % 1; J.push(lens.clone().lerp(work.d[i], ph), work.col, rayA * .65, 7 * sz);
      }
    }
    if (cloud.current) {
      const ca = s.cloud * alive, u = kit.cloudMat.uniforms, dist = devPos.distanceTo(center);
      cloud.current.visible = ca > .002;
      u.uAlpha.value = ca * .8; u.uScanY.value = s.scan >= 1 ? -1e3 : scanY;
      u.uCam.value.copy(devPos); u.uNear.value = dist - .55; u.uFar.value = dist + .55; u.uDpr.value = dpr; u.uSize.value = cmp ? 1.8 : 2.3;
    }
    const depthA = s.space * (1 - ramp(e, 0, .3)) * alive;
    if (depthA > .002) {
      for (let i = 5; i < hgAnchors.length; i++) { const j = work.d[i]; D.dashed(j, new Vector3(j.x, floorY, j.z), [.25, .55, 1.0], .24 * depthA, 2.4, 9); }
      for (const i of [15, 16, 17, 18, 19, 20]) { const j = work.d[i]; D.polyline(ellipse(new Vector3(j.x, floorY + .005, j.z), new Vector3(1, 0, 0), new Vector3(0, 0, 1), .1, .1, 0, Math.PI * 2, 28), C.orange, .24 * depthA, 2.6); }
    }
    if (s.depthUI > .002) {
      const wr = work.d[10], cr = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0), cu = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      D.polyline(ellipse(wr, cr, cu, .26, .26, 0, Math.PI * 2 * s.depthUI, 48), [.75, .9, 1.1], s.depthUI * .9, 3);
      for (let k = 0; k < 4; k++) { const ang = k * Math.PI / 2, d1 = cr.clone().multiplyScalar(Math.cos(ang)).addScaledVector(cu, Math.sin(ang)); D.push(wr.clone().addScaledVector(d1, .31), wr.clone().addScaledVector(d1, .38), [.75, .9, 1.1], s.depthUI * .9, 2.5); }
    }

    /* 05: hologram bodies (stylised anatomy) placed on the branch rigs. */
    const holoA = s.holo * alive;
    for (const [h, r] of [[kit.holo.u, place.upper], [kit.holo.l, place.lower]] as const) {
      h.group.visible = holoA > .002 && h.ready;
      if (!h.group.visible) continue;
      hgRigMatrix(r, h.group.matrix); h.group.matrixWorldNeedsUpdate = true;
      h.mat.uniforms.uAlpha.value = holoA; h.mat.uniforms.uTime.value = t;
    }
    if (holoA > .002) {
      // Ribcage + spine inside the upper hologram (x-ray read, not anatomy data).
      const pelvis = work.u[11].clone().add(work.u[12]).multiplyScalar(.5), neck = work.u[5].clone().add(work.u[6]).multiplyScalar(.5);
      const ax = work.u[6].clone().sub(work.u[5]), half = ax.length() / 2; ax.normalize();
      const ay = neck.clone().sub(pelvis).normalize(), az = new Vector3().crossVectors(ax, ay).normalize();
      for (let r = 0; r < 6; r++) {
        const f = .5 + r * .075, c = pelvis.clone().lerp(neck, f).addScaledVector(az, -.01 * place.upper.scale);
        const wid = half * (.6 + .2 * Math.sin((r + 1) / 7 * Math.PI)), dep = .08 * place.upper.scale;
        const rib = ellipse(c, ax, az, wid, dep, -.15, Math.PI + .15, 26).map((pt, n) => pt.addScaledVector(ay, -Math.sin(-.15 + (Math.PI + .3) * n / 26) * .05 * place.upper.scale));
        D.polyline(rib, C.upSoft, .34 * holoA, 2.2);
      }
      D.dashed(pelvis.clone().addScaledVector(az, -.07 * place.upper.scale), neck.clone().addScaledVector(az, -.07 * place.upper.scale), C.upSoft, .45 * holoA, 2.6, 12);
      const lp = work.l[11].clone().add(work.l[12]).multiplyScalar(.5), lax = work.l[12].clone().sub(work.l[11]).normalize(), laz = new Vector3().crossVectors(lax, UP).normalize();
      D.polyline(ellipse(lp, lax, laz, (work.l[12].distanceTo(work.l[11]) / 2) * 1.35, .09 * place.lower.scale, 0, Math.PI * 2, 32), C.lowSoft, .38 * holoA, 2.2);
    }
    const measureA = s.analysis * alive;
    if (measureA > .002) {
      // Shoulder flexion arc drawn in the camera plane (annotation), so the angle reads even when the arm points at the viewer.
      const rm = hgRigMatrix(place.upper, work.m), wr = v3(hgUpperRig[10]);
      const camR = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0), camU = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const shW = work.u[6], arm3 = work.u[8].clone().sub(shW), downW = camU.clone().negate();
      const armW = camR.clone().multiplyScalar(arm3.dot(camR)).addScaledVector(camU, arm3.dot(camU)).normalize();
      const theta = Math.acos(Math.max(-1, Math.min(1, armW.dot(downW)))), ortho = armW.clone().addScaledVector(downW, -armW.dot(downW)).normalize();
      const reveal = .2 + .8 * Math.min(1, s.charts * 1.8), R = .23 * place.upper.scale;
      const dirAt = (ph: number) => downW.clone().multiplyScalar(Math.cos(ph)).addScaledVector(ortho, Math.sin(ph));
      D.polyline(Array.from({ length: 41 }, (_, i) => shW.clone().addScaledVector(dirAt(theta * reveal * i / 40), R)), C.up, measureA, 3.4);
      for (let deg = 0; deg <= theta * reveal * 180 / Math.PI + .01; deg += 15) {
        const v = dirAt(deg * Math.PI / 180);
        D.push(shW.clone().addScaledVector(v, R), shW.clone().addScaledVector(v, R + (deg % 45 === 0 ? .12 : .07) * place.upper.scale / 2), C.up, measureA * .8, 2.2);
      }
      D.dashed(shW, shW.clone().addScaledVector(downW, R * 1.15), C.upSoft, measureA * .6, 2.2, 6);
      // Wrist relative height: dashed baseline and double arrow.
      const base = new Vector3(wr.x + .02, 1.05, wr.z), top = new Vector3(wr.x + .02, wr.y - .03, wr.z);
      D.dashed(new Vector3(wr.x - .22, 1.05, wr.z - .05).applyMatrix4(rm), new Vector3(wr.x + .2, 1.05, wr.z + .05).applyMatrix4(rm), C.up, measureA * .7, 2.2, 10);
      const b0 = base.clone().applyMatrix4(rm), t0 = top.clone().applyMatrix4(rm), o0 = new Vector3().applyMatrix4(rm);
      D.push(b0, b0.clone().lerp(t0, s.charts), C.up, measureA, 3);
      for (const [tip, sgn] of [[t0, -1], [b0, 1]] as const) for (const sx of [.025, -.025]) D.push(tip, tip.clone().add(new Vector3(sx, sgn * .045, 0).applyMatrix4(rm).sub(o0)), C.up, measureA, 2.6);
    }
    /* Single load-cell footplate under the lower branch. */
    const plateA = ramp(q, .54, .585) * alive;
    kit.plate.group.visible = plateA > .002;
    if (plateA > .002) { const pm = hgRigMatrix(place.lower, new Matrix4()); kit.plate.group.matrix.copy(pm); kit.plate.group.matrixWorldNeedsUpdate = true; plateFrame(kit.plate, pm, plateA, t, .4 + .6 * s.charts); }

    B.end(W, H); J.end(dpr); D.end(W, H);

    /* Floor grid for the depth shot. */
    if (grid.current) {
      grid.current.visible = s.grid > .002;
      grid.current.position.set(0, floorY, 0);
      kit.gridMat.uniforms.uAlpha.value = s.grid * alive * .85;
    }

    /* DOM anchors follow the same projection rather than a second camera. */
    const root = runtime.hangaraeViewport.current;
    if (root) {
      const set = (name: string, v: Vector3) => { const [x, y] = project(v, camera, W, H); root.style.setProperty(`--a-${name}-x`, `${x.toFixed(1)}px`); root.style.setProperty(`--a-${name}-y`, `${y.toFixed(1)}px`); return [x, y] as const; };
      const wrist = set("wrist", work.d[10]);
      set("shoulder", work.u[6]); set("uwrist", work.u[10]); set("device", devPos.clone().addScaledVector(upv, .16));
      const pm = hgRigMatrix(place.lower, work.m);
      set("plate", new Vector3(HG_PLATE.center[0], HG_PLATE.center[1] - HG_PLATE.size[1] / 2, HG_PLATE.center[2] + HG_PLATE.size[2] / 2).applyMatrix4(pm));
      const line = root.querySelector<SVGLineElement>("[data-hg-line=depth]"), panel = root.querySelector<HTMLElement>("[data-hg-depth-panel]");
      if (line && panel && s.depthUI > .002) {
        const rr = root.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        line.setAttribute("x1", String(wrist[0] + 20)); line.setAttribute("y1", String(wrist[1] - 4));
        line.setAttribute("x2", String(pr.left - rr.left)); line.setAttribute("y2", String(pr.top - rr.top + pr.height * .42));
      }
    }
  });
  return <>
    <mesh ref={cameraPlane} renderOrder={1}><planeGeometry/><meshBasicMaterial map={cameraTexture} color="#e8eaee" transparent toneMapped={false} depthWrite={false}/></mesh>
    <mesh ref={grid} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2} frustumCulled={false}><planeGeometry args={[14, 14]}/><primitive object={kit.gridMat} attach="material"/></mesh>
    {cloudGeo && <points ref={cloud} geometry={cloudGeo} material={kit.cloudMat} frustumCulled={false} renderOrder={7}/>}
    <primitive object={kit.plate.group}/>
    <primitive object={kit.heroPlate.group}/>
    <primitive object={kit.holo.u.group}/>
    <primitive object={kit.holo.l.group}/>
    <primitive object={kit.holo.hero.group}/>
    <mesh geometry={kit.deco.geometry} material={kit.deco.material} frustumCulled={false} renderOrder={8}/>
    <mesh geometry={kit.bones.geometry} material={kit.bones.material} frustumCulled={false} renderOrder={9}/>
    <points geometry={kit.joints.geometry} material={kit.joints.material} frustumCulled={false} renderOrder={10}/>
  </>;
}
