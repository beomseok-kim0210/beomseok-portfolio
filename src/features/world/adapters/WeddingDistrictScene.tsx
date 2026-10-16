"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, CircleGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide, ExtrudeGeometry,
  Group, Mesh, MeshBasicMaterial, Object3D, MeshPhysicalMaterial, MeshStandardMaterial, PCFSoftShadowMap, PlaneGeometry, Points, PointsMaterial, Shape, ShapeGeometry,
  RepeatWrapping, SRGBColorSpace, TorusGeometry, TubeGeometry, Vector3, type Camera,
} from "three";
import type { WorldRuntime } from "../director/worldRuntime";
import { WD_BACK_Z, WD_MERMAID_X, WD_MIRROR, ramp, sampleWedding, wdExpertPos, wdExperts, wdGalleryX, wdModels } from "./weddingAtelier";
import { createBodyGeometry, createDressGeometry, createMermaidGeometry, createFabricMaterial, createFormGeometry, createStandGeometry, setClay } from "./weddingDress";

const P = {
  wall: "#e3ddd3", moulding: "#ece7df", floor: "#c9bdac", linen: "#e6ded0", brass: "#b8913c", plinth: "#f1ede6",
  rose: "#b8565f", clay: "#a7a49f", ivory: "#efe9df",
};
function project(v: Vector3, camera: Camera, w: number, h: number) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * w, (1 - p.y) / 2 * h, p.z] as const; }

/** Arch outline (opening) as a 2D shape centred on x=0, base at y=0. */
function archShape(w: number, h: number) {
  const s = new Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(-r, h - r); s.absarc(0, h - r, r, Math.PI, 0, true); s.lineTo(r, 0); s.lineTo(-r, 0);
  return s;
}
function archFrame(w: number, h: number, t: number, depth: number) {
  const outer = archShape(w + t * 2, h + t), inner = archShape(w, h);
  outer.holes.push(inner);
  const g = new ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 2, curveSegments: 48 });
  g.translate(0, -t / 2, 0);
  return g;
}
function rectFrame(w: number, h: number, t: number, depth: number) {
  const outer = new Shape(); outer.moveTo(-w / 2 - t, 0); outer.lineTo(w / 2 + t, 0); outer.lineTo(w / 2 + t, h + 2 * t); outer.lineTo(-w / 2 - t, h + 2 * t); outer.lineTo(-w / 2 - t, 0);
  const inner = new Shape(); inner.moveTo(-w / 2, t); inner.lineTo(w / 2, t); inner.lineTo(w / 2, h + t); inner.lineTo(-w / 2, h + t); inner.lineTo(-w / 2, t);
  outer.holes.push(inner);
  const g = new ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 1 });
  g.translate(0, -h / 2 - t, 0); return g;
}
function radialTexture(inner: string, outer: string) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
/** Lace applique: floral motifs scattered over the skirt, denser toward the hem (alpha map). */
function laceTexture() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 1024;
  const x = c.getContext("2d")!; x.clearRect(0, 0, 1024, 1024); x.strokeStyle = x.fillStyle = "#fff";
  let r = 11; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < 900; i++) {
    const vy = Math.pow(rnd(), .55), y = 1024 * vy, px = rnd() * 1024;
    if (vy < .42 && rnd() > .25) continue; // bodice keeps sparse lace; the skirt carries it toward the hem
    const s = 5 + rnd() * 9, n = 5 + Math.floor(rnd() * 3), rot = rnd() * 6.28;
    x.save(); x.translate(px, y); x.rotate(rot); x.globalAlpha = .65 + rnd() * .35;
    for (let k = 0; k < n; k++) { x.rotate(6.283 / n); x.beginPath(); x.ellipse(s * .9, 0, s * .75, s * .38, 0, 0, 6.283); x.fill(); }
    x.beginPath(); x.arc(0, 0, s * .32, 0, 6.283); x.fill();
    x.lineWidth = 1.4; x.beginPath(); x.moveTo(s * 1.6, 0); x.bezierCurveTo(s * 3, s * 1.5, s * 3.8, -s, s * 5, s * .6); x.stroke();
    x.restore();
  }
  const t = new CanvasTexture(c); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(3, 1); t.anisotropy = 4; return t;
}
function curtainGeometry(w: number, h: number) {
  const g = new PlaneGeometry(w, h, 64, 24), p = g.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), k = (h / 2 - y) / h; p.setZ(i, .07 * Math.sin(x * 15) + .03 * Math.sin(x * 37 + 1) * (.4 + k)); }
  g.computeVertexNormals(); return g;
}

type Form = { group: Group; dress: Mesh; fabric: ReturnType<typeof createFabricMaterial>; form: Mesh; plinth: Mesh; ghost?: Mesh; body?: Mesh };

export function WeddingDistrictScene({ runtime }: { runtime: WorldRuntime }) {
  const { gl, size } = useThree();
  const key = useRef<DirectionalLight>(null);
  // Shadows only while the atelier is mounted (other districts do not pay for them).
  useEffect(() => {
    const prev = { enabled: gl.shadowMap.enabled, type: gl.shadowMap.type };
    gl.shadowMap.enabled = true; gl.shadowMap.type = PCFSoftShadowMap; gl.shadowMap.needsUpdate = true;
    return () => { gl.shadowMap.enabled = prev.enabled; gl.shadowMap.type = prev.type; };
  }, [gl]);

  const kit = useMemo(() => {
    const geo = {
      form: createFormGeometry(), stand: createStandGeometry(), body: createBodyGeometry(),
      plinth: new CylinderGeometry(.56, .6, .07, 64), floor: new PlaneGeometry(40, 24), wall: new PlaneGeometry(40, 6.4),
      mirror: new ShapeGeometry(archShape(WD_MIRROR.w, WD_MIRROR.h), 48), mirrorFrame: archFrame(WD_MIRROR.w, WD_MIRROR.h, .07, .06),
      panel: rectFrame(.98, .58, .02, .01), curtain: curtainGeometry(1.5, 4.6), shaft: new PlaneGeometry(2.6, 6),
      pin: new CylinderGeometry(.0035, .0035, .14, 8), pinHead: new CircleGeometry(.022, 24),
      ring: new TorusGeometry(1.0, .008, 8, 160), station: new CylinderGeometry(.16, .2, 1.02, 6), stationTop: new CylinderGeometry(.21, .21, .02, 6),
      paper: new PlaneGeometry(.075, .1),
    };
    const mat = {
      wall: new MeshStandardMaterial({ color: P.wall, roughness: .95 }),
      moulding: new MeshStandardMaterial({ color: P.moulding, roughness: .7 }),
      floor: new MeshStandardMaterial({ color: P.floor, roughness: .42, metalness: 0 }),
      linen: new MeshStandardMaterial({ color: P.linen, roughness: .92 }),
      clayLinen: new MeshStandardMaterial({ color: P.clay, roughness: .85, transparent: true }),
      brass: new MeshStandardMaterial({ color: P.brass, roughness: .32, metalness: .9 }),
      plinth: new MeshStandardMaterial({ color: P.plinth, roughness: .6, transparent: true }),
      curtain: new MeshPhysicalMaterial({ color: "#faf6ef", roughness: .9, sheen: 1, sheenColor: new Color("#fff7ea"), transparent: true, opacity: .62, side: DoubleSide, depthWrite: false }),
      shaft: new MeshBasicMaterial({ map: radialTexture("rgba(255,244,222,.55)", "rgba(255,244,222,0)"), transparent: true, depthWrite: false, blending: AdditiveBlending }),
      shadow: new MeshBasicMaterial({ map: radialTexture("rgba(70,52,32,.30)", "rgba(70,52,32,0)"), transparent: true, depthWrite: false }),
      ghost: new MeshBasicMaterial({ color: P.rose, wireframe: true, transparent: true, opacity: .5 }),
      pin: new MeshStandardMaterial({ color: "#9aa0a6", metalness: .9, roughness: .3, transparent: true }),
      pinHead: new MeshStandardMaterial({ color: P.rose, roughness: .35, transparent: true, side: DoubleSide }),
      ring: new MeshStandardMaterial({ color: P.brass, roughness: .3, metalness: .9, emissive: new Color("#c99a3c"), emissiveIntensity: 0, transparent: true }),
      station: new MeshPhysicalMaterial({ color: "#f7f3ec", roughness: .18, metalness: 0, transmission: 0, transparent: true, opacity: .0, clearcoat: 1, clearcoatRoughness: .2 }),
      stationTop: new MeshStandardMaterial({ color: P.brass, roughness: .3, metalness: .9, emissive: new Color("#d9a845"), emissiveIntensity: 0, transparent: true }),
      thread: new MeshStandardMaterial({ color: "#c99a3c", emissive: new Color("#e2b04f"), emissiveIntensity: .5, roughness: .4, metalness: .5, transparent: true }),
      paper: new MeshStandardMaterial({ color: "#fbf8f2", roughness: .8, side: DoubleSide, transparent: true }),
      lace: new MeshPhysicalMaterial({ color: "#ffffff", alphaMap: laceTexture(), transparent: true, alphaTest: .32, roughness: .5, sheen: 1, sheenColor: new Color("#ffffff"), side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }),
      halo: new MeshBasicMaterial({ map: radialTexture("rgba(255,214,140,.55)", "rgba(255,214,140,0)"), transparent: true, depthWrite: false, blending: AdditiveBlending }),
    };
    /* Hero: the real dress on its form. */
    const makeForm = (model: Parameters<typeof createDressGeometry>[0], x: number): Form => {
      const group = new Group(); group.position.set(x, 0, 0);
      const fabric = createFabricMaterial();
      const dress = new Mesh(createDressGeometry(model), fabric); dress.castShadow = true; dress.receiveShadow = true;
      const form = new Mesh(geo.form, model === "input" ? mat.linen : mat.clayLinen.clone()); form.castShadow = true;
      const stand = new Mesh(geo.stand, mat.brass); stand.castShadow = true;
      const plinth = new Mesh(geo.plinth, mat.plinth.clone()); plinth.position.y = .035; plinth.receiveShadow = true;
      group.add(plinth, stand, form, dress); stand.position.y = .07; form.position.y = .07; dress.position.y = .07;
      return { group, dress, fabric, form, plinth };
    };
    const hero = makeForm("input", 0);
    const lace = new Mesh(hero.dress.geometry, mat.lace); lace.position.y = .07; lace.scale.set(1.004, 1.0, 1.004); lace.renderOrder = 2; hero.group.add(lace);
    const gallery = wdModels.map((m, i) => {
      const f = makeForm(m.id, wdGalleryX(i));
      if (m.id === "smpl") { const body = new Mesh(geo.body, mat.clayLinen.clone()); body.position.y = .07; body.castShadow = true; f.group.add(body); f.body = body; }
      if (m.id === "icon") { const ghost = new Mesh(f.dress.geometry, mat.ghost); ghost.position.y = .07; ghost.scale.setScalar(1.002); f.group.add(ghost); f.ghost = ghost; }
      return f;
    });
    /* Council: five expert stations, paper (RAG) streams, gold threads to the dress. */
    const ex = new Vector3();
    const stations = wdExperts.map((_, i) => {
      wdExpertPos(i, ex);
      const g = new Group(); g.position.copy(ex); g.lookAt(0, 0, 0);
      const body = new Mesh(geo.station, mat.station.clone()); body.position.y = .51 + .07; body.castShadow = true;
      const top = new Mesh(geo.stationTop, mat.stationTop.clone()); top.position.y = 1.03 + .07;
      g.add(body, top);
      const from = new Vector3(ex.x, 1.12, ex.z), mid = new Vector3(ex.x * .45, 1.42, ex.z * .45), to = new Vector3(0, 1.16, .02);
      const tube = new Mesh(new TubeGeometry(new CatmullRomCurve3([from, mid, to]), 64, .0045, 6), mat.thread.clone());
      return { group: g, body, top, tube, anchor: new Vector3(ex.x, 1.32, ex.z) };
    });
    const tableRing = new Mesh(geo.ring, mat.ring); tableRing.rotation.x = -Math.PI / 2; tableRing.position.y = .075; tableRing.scale.setScalar(1.75);
    const papers = new Group();
    const paperSeeds = Array.from({ length: 40 }, (_, k) => ({ station: k % 5, phase: (k * .6180339) % 1, spin: k * 1.7 }));
    paperSeeds.forEach(() => { const m = new Mesh(geo.paper, mat.paper.clone()); papers.add(m); });
    const halo = new Mesh(new PlaneGeometry(2.2, 2.2), mat.halo); halo.rotation.x = -Math.PI / 2; halo.position.y = .09;
    /* ECON failure pins (03). */
    // Pins sit on the cut edge of the ECON skirt (form space), so they turn with it.
    const pins = [new Vector3(.46, .62, .02), new Vector3(-.58, .06, .0)].map(v => {
      const g = new Group(), stick = new Mesh(geo.pin, mat.pin), head = new Mesh(geo.pinHead, mat.pinHead);
      stick.position.y = .07; head.position.y = .14; head.rotation.x = -Math.PI / 2;
      g.add(stick, head); g.position.copy(v).add(new Vector3(0, .07, 0)); g.rotation.z = -.5; g.rotation.x = .5;
      return g;
    });
    /* Room. */
    const room = new Group();
    const floor = new Mesh(geo.floor, mat.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(4, 0, 4); floor.receiveShadow = true;
    const wall = new Mesh(geo.wall, mat.wall); wall.position.set(4, 3.2, WD_BACK_Z); wall.receiveShadow = true;
    room.add(floor, wall);
    // Wainscot: dado rail + baseboard give the wall scale without competing with the mirror.
    for (const [y, h, d] of [[.96, .035, .03], [.06, .12, .025]] as const) { const m = new Mesh(new BoxGeometry(40, h, d), mat.moulding); m.position.set(4, y, WD_BACK_Z + d / 2); m.receiveShadow = true; room.add(m); }
    for (let x = -5.6; x < 14; x += 1.25) { const panel = new Mesh(geo.panel, mat.moulding); panel.position.set(x, .52, WD_BACK_Z + .004); panel.receiveShadow = true; room.add(panel); }
    const mirrorFrame = new Mesh(geo.mirrorFrame, mat.brass); mirrorFrame.position.set(WD_MIRROR.x, WD_MIRROR.y - WD_MIRROR.h / 2, WD_MIRROR.z - .03);
    room.add(mirrorFrame);
    const curtainL = new Mesh(geo.curtain, mat.curtain); curtainL.position.set(-3.7, 2.3, WD_BACK_Z + .35); curtainL.rotation.y = .25;
    room.add(curtainL);
    // Dust in the window light.
    const N = 260, dp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { dp[i * 3] = -3.6 + Math.random() * 3.4; dp[i * 3 + 1] = .3 + Math.random() * 3.6; dp[i * 3 + 2] = -1.8 + Math.random() * 3; }
    const dustGeo = new BufferGeometry(); dustGeo.setAttribute("position", new BufferAttribute(dp, 3));
    const dust = new Points(dustGeo, new PointsMaterial({ color: "#fff3dc", size: .012, transparent: true, opacity: .7, depthWrite: false }));
    room.add(dust);
    const shadowBlob = (x: number) => { const s = new Mesh(new PlaneGeometry(1.9, 1.9), mat.shadow); s.rotation.x = -Math.PI / 2; s.position.set(x, .002, 0); return s; };
    room.add(shadowBlob(0), ...wdModels.map((_, i) => shadowBlob(wdGalleryX(i))));
    const keyTarget = new Object3D(); keyTarget.position.set(3, 0, 0);
    const spotTarget = new Object3D(); spotTarget.position.set(0, .4, 0);
    pins.forEach(p => gallery[4].group.add(p));
    /* 03: ECON's success case beside the failure — a clay mermaid that came back whole. */
    const mermaid = new Group(); mermaid.position.set(WD_MERMAID_X, 0, .1);
    const mmMat = new MeshStandardMaterial({ color: "#b4b1ab", roughness: .8, transparent: true });
    const mmDress = new Mesh(createMermaidGeometry(), mmMat); mmDress.position.y = .07; mmDress.castShadow = true;
    const mmForm = new Mesh(geo.form, mmMat); mmForm.position.y = .07; mmForm.castShadow = true;
    const mmPlinth = new Mesh(geo.plinth, mat.plinth.clone()); mmPlinth.position.y = .035; mmPlinth.receiveShadow = true;
    mermaid.add(mmPlinth, mmDress, mmForm); mermaid.visible = false;
    return { mermaid, mmMat, keyTarget, spotTarget, geo, mat, hero, lace, gallery, stations, tableRing, papers, paperSeeds, halo, pins, room, dust };
  }, []);
  useEffect(() => () => {
    (kit.mermaid.children[1] as Mesh).geometry.dispose(); kit.mmMat.dispose();
    Object.values(kit.geo).forEach(g => g.dispose()); Object.values(kit.mat).forEach(m => { (m as MeshBasicMaterial).map?.dispose(); m.dispose(); });
    [kit.hero, ...kit.gallery].forEach(f => { f.dress.geometry.dispose(); f.fabric.dispose(); });
    kit.stations.forEach(s => { s.tube.geometry.dispose(); (s.tube.material as MeshStandardMaterial).dispose(); });
  }, [kit]);

  const v = useMemo(() => new Vector3(), []);
  useFrame(({ camera, clock }) => {
    const s = sampleWedding(runtime.weddingProgress.current), t = clock.elapsedTime, W = size.width, H = size.height;
    /* Hero dress: steps aside for the mirror in 06; the council halo in 05. */
    const away = s.dressAway;
    kit.hero.group.position.set(-1.45 * away, 0, .25 * away);
    kit.hero.group.rotation.y = .18 * Math.sin(t * .15) * (1 - s.table) - .35 * away;
    kit.hero.fabric.userData.uTear.value = 0;

    /* 02–04 gallery. Each candidate receives the same dress, then fails its own documented way. */
    kit.gallery.forEach((f, i) => {
      const id = wdModels[i].id, a = Math.max(0, Math.min(1, s.reveal - i)), present = a * (1 - .82 * s.recede) * (1 - s.galleryOut) * (id === "econ" ? 1 : 1 - s.solo);
      f.group.visible = present > .003;
      if (!f.group.visible) return;
      let d = ramp(a, .4, 1);
      if (id === "econ") d = .5 * d + .5 * s.collapse;
      const fade = (m: { opacity: number; transparent: boolean }) => { m.opacity = present; m.transparent = present < .999; };
      f.group.position.y = (1 - ramp(a, 0, .5)) * -.12;
      fade(f.fabric); fade(f.form.material as MeshStandardMaterial); fade(f.plinth.material as MeshStandardMaterial);
      setClay(f.fabric, ramp(d, 0, .55));
      if (f.dress.morphTargetInfluences) f.dress.morphTargetInfluences[0] = d;
      if (id === "pifuhd") f.fabric.userData.uTear.value = d * .78;
      if (id === "econ") f.fabric.userData.uTear.value = d * .5;
      if (id === "smpl") { f.fabric.userData.uTear.value = d * 1.15; if (f.body) { f.body.visible = true; fade(f.body.material as MeshStandardMaterial); } }
      if (id === "icon") {
        f.dress.visible = d < .98; f.fabric.opacity = present * (1 - d); f.fabric.transparent = true;
        if (f.ghost) { const flicker = .55 + .45 * Math.sin(t * 23) * Math.sin(t * 7.1); (f.ghost.material as MeshBasicMaterial).opacity = present * d * flicker * .7; f.ghost.visible = d > .02; }
      }
      f.group.rotation.y = id === "econ" ? .12 * Math.sin(t * .12 + i) * (1 - s.econTurn) - 2.35 * s.econTurn : .12 * Math.sin(t * .12 + i);
    });
    /* 03 success case. */
    const mmA = s.success * (1 - ramp(s.recede, 0, .6)) * (1 - s.galleryOut);
    kit.mermaid.visible = mmA > .003;
    if (kit.mermaid.visible) {
      kit.mmMat.opacity = mmA; kit.mmMat.transparent = mmA < .999;
      (kit.mermaid.children[0] as Mesh as unknown as { material: MeshStandardMaterial }).material.opacity = mmA;
      kit.mermaid.position.y = (1 - s.success) * -.1; kit.mermaid.rotation.y = -.35 + .25 * Math.sin(t * .2);
    }
    kit.pins.forEach((p, i) => { const k = ramp(s.pins, i * .25, .6 + i * .25); p.visible = k > .01; p.scale.setScalar(.6 + .4 * k); ((p.children[1] as Mesh).material as MeshStandardMaterial).opacity = k; });

    /* 05 council. */
    kit.tableRing.visible = s.table > .01; (kit.tableRing.material as MeshStandardMaterial).opacity = s.table;
    (kit.tableRing.material as MeshStandardMaterial).emissiveIntensity = .25 + .9 * s.consensus;
    kit.stations.forEach((st, i) => {
      const a = Math.max(0, Math.min(1, s.seated - i)) * s.table, vis = a > .01;
      st.group.visible = vis; st.tube.visible = vis && s.threads > .01;
      if (!vis) return;
      st.group.position.y = (1 - ramp(a, 0, 1)) * -.25;
      const bm = st.body.material as MeshPhysicalMaterial; bm.opacity = .72 * a;
      const tm = st.top.material as MeshStandardMaterial; tm.opacity = a; tm.emissiveIntensity = .2 + .8 * s.rag * (.6 + .4 * Math.sin(t * 2 + i));
      const total = st.tube.geometry.index ? st.tube.geometry.index.count : 0;
      st.tube.geometry.setDrawRange(0, Math.floor(total * Math.max(0, Math.min(1, s.threads * 1.25 - i * .06))));
      const th = st.tube.material as MeshStandardMaterial; th.opacity = s.table; th.emissiveIntensity = .5 + 1.4 * s.consensus;
    });
    kit.papers.visible = s.rag > .01 && s.table > .2;
    if (kit.papers.visible) kit.papers.children.forEach((m, k) => {
      const seed = kit.paperSeeds[k], st = kit.stations[seed.station].anchor, ph = (t * .16 + seed.phase) % 1;
      v.set(st.x * (1.9 - ph * .9), 2.6 - ph * 1.45, st.z * (1.9 - ph * .9));
      m.position.copy(v); m.rotation.set(seed.spin + t * .6, seed.spin * .5 + t * .4, 0);
      const mm = (m as Mesh).material as MeshStandardMaterial; mm.opacity = s.rag * Math.sin(ph * Math.PI) * s.table;
    });
    kit.halo.visible = s.consensus > .01; (kit.halo.material as MeshBasicMaterial).opacity = s.consensus * .9;
    kit.halo.position.x = kit.hero.group.position.x;
    kit.spotTarget.position.set(kit.hero.group.position.x, .4, kit.hero.group.position.z);

    /* Dust drift. */
    kit.dust.rotation.y = Math.sin(t * .05) * .05; kit.dust.position.y = Math.sin(t * .2) * .03;

    /* DOM anchors follow the same projection. */
    const root = runtime.weddingViewport.current;
    if (root) {
      const set = (name: string, p: Vector3) => { const [x, y, z] = project(p, camera, W, H); root.style.setProperty(`--a-${name}-x`, `${x.toFixed(1)}px`); root.style.setProperty(`--a-${name}-y`, `${y.toFixed(1)}px`); root.style.setProperty(`--a-${name}-z`, z > 1 ? "0" : "1"); };
      wdModels.forEach((_, i) => set(`g${i}`, v.set(wdGalleryX(i) + .2, 1.36, .1)));
      kit.pins.forEach((p, i) => set(`pin${i}`, p.getWorldPosition(v).add(new Vector3(0, .08, 0))));
      kit.stations.forEach((st, i) => set(`ex${i}`, v.copy(st.anchor).setY(1.2)));
      set("dress", v.set(kit.hero.group.position.x, 1.62, 0));
      set("mm", v.set(WD_MERMAID_X, 1.56, .1));
      set("bg", v.set(wdGalleryX(4), 1.56, 0));
      const m = WD_MIRROR, tl = project(v.set(m.x - m.w / 2, m.y + m.h / 2, m.z), camera, W, H), br = project(v.set(m.x + m.w / 2, m.y - m.h / 2, m.z), camera, W, H);
      root.style.setProperty("--mirror-x", `${tl[0].toFixed(1)}px`); root.style.setProperty("--mirror-y", `${tl[1].toFixed(1)}px`);
      root.style.setProperty("--mirror-w", `${(br[0] - tl[0]).toFixed(1)}px`); root.style.setProperty("--mirror-h", `${(br[1] - tl[1]).toFixed(1)}px`);
    }
  });

  return <>
    <hemisphereLight args={["#ffffff", "#cbbfae", .5]}/>
    <directionalLight ref={key} position={[-2.5, 7.5, 6]} intensity={2.3} color="#fff6ec" castShadow target={kit.keyTarget}
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-.0004} shadow-normalBias={.02}
      shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={.5} shadow-camera-far={30}/>
    <primitive object={kit.keyTarget}/>
    {/* A pool of light on the real dress: the subject of the room. */}
    <spotLight position={[.4, 5.2, 2.2]} angle={.42} penumbra={1} intensity={28} distance={12} decay={1.6} color="#fff3e2" target={kit.spotTarget}/>
    <primitive object={kit.spotTarget}/>
    <directionalLight position={[6, 3, 6]} intensity={.4} color="#eef1ff"/>
    {/* Rim from behind: separates the ivory dress from the wall. */}
    <directionalLight position={[2.5, 3.2, -4]} intensity={1.6} color="#ffffff"/>
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.4} color="#fff6e8" position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[14, 6, 1]}/>
      <Lightformer form="rect" intensity={3.2} color="#fff2dc" position={[-7, 2.5, 2]} rotation-y={Math.PI / 2} scale={[4, 5, 1]}/>
      <Lightformer form="rect" intensity={1.1} color="#f1ecff" position={[7, 2, 3]} rotation-y={-Math.PI / 2} scale={[5, 4, 1]}/>
      <Lightformer form="ring" intensity={1.4} color="#ffe9c9" position={[0, 2, 8]} scale={3}/>
    </Environment>
    <primitive object={kit.room}/>
    {/* The fitting mirror reflects the room and the dress (planar reflection). */}
    <mesh geometry={kit.geo.mirror} position={[WD_MIRROR.x, WD_MIRROR.y - WD_MIRROR.h / 2, WD_MIRROR.z]}>
      <MeshReflectorMaterial mirror={.92} resolution={size.width <= 700 ? 512 : 1024} blur={[0, 0]} mixBlur={0} mixStrength={1.15} color="#d9d6d0" metalness={0} roughness={.08} depthScale={0}/>
    </mesh>
    <primitive object={kit.hero.group}/>
    {kit.gallery.map((f, i) => <primitive key={i} object={f.group}/>)}
    <primitive object={kit.tableRing}/>
    {kit.stations.map((st, i) => <group key={`s${i}`}><primitive object={st.group}/><primitive object={st.tube}/></group>)}
    <primitive object={kit.papers}/>
    <primitive object={kit.halo}/>
    <primitive object={kit.mermaid}/>
  </>;
}
