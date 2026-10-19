"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, useGLTF } from "@react-three/drei";
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PCFSoftShadowMap, PlaneGeometry, SRGBColorSpace, SpotLight, Vector3, type Camera,
} from "three";
import type { WorldRuntime } from "../director/worldRuntime";
import { renderTier } from "../runtime/renderTier";
import { LAB_BACK_Z, LAB_CEIL, LAB_FRAME, LAB_HEAD_URL, LAB_PARTITIONS, labStations, labWork, sampleLab } from "./labRoom";
import {
  G, FONT, MONO, acrylicWork, bcosPrint, brassPlateTexture, concreteTexture, crimePrint, disposeTree, docentPrint, etchTexture, fileTexture, framedPrint,
  marbleMaterial, photoTexture, plaqueTexture, plinth, socleGeometry, tagTexture, vinylTexture, vitrineWork,
} from "./labGallery";

/*
 * 04 Personal Gallery: a white-cube hall with three bays. Each bay shows one solo project as a work on a
 * plinth (marble docent bust · five acrylic gates · a vitrine with a locked truth safe), a framed print on
 * the back wall and a plaque. Track spots light the works and wash the prints; the floor is polished concrete.
 */
function project(v: Vector3, camera: Camera, w: number, h: number) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * w, (1 - p.y) / 2 * h, p.z] as const; }
function glow(color: string) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
/** Dark track-light can, hung from the rail and pointed at its target. */
function trackCan(from: Vector3, to: Vector3, mat: MeshStandardMaterial) {
  const g = new Group(); g.position.copy(from);
  const stem = new Mesh(new CylinderGeometry(.008, .008, .12, 8), mat); stem.position.y = .06; g.add(stem);
  const head = new Group(); g.add(head); head.lookAt(to);
  const can = new Mesh(new CylinderGeometry(.045, .055, .17, 20), mat); can.rotation.x = Math.PI / 2; head.add(can);
  const lens = new Mesh(new CylinderGeometry(.04, .04, .004, 20), new MeshBasicMaterial({ color: new Color("#fff6e6").multiplyScalar(1.6), toneMapped: false }));
  lens.rotation.x = Math.PI / 2; lens.position.z = .086; head.add(lens);
  return g;
}

export function LabDistrictScene({ runtime }: { runtime: WorldRuntime }) {
  const { gl, size } = useThree();
  const low = useMemo(() => renderTier() === "low" || size.width <= 700, [size.width]);
  // Same head as the live docent (shared drei cache): the bust is the docent, carved.
  const head = useGLTF(LAB_HEAD_URL);
  useEffect(() => {
    const prev = { enabled: gl.shadowMap.enabled, type: gl.shadowMap.type };
    gl.shadowMap.enabled = true; gl.shadowMap.type = PCFSoftShadowMap; gl.shadowMap.needsUpdate = true;
    return () => { gl.shadowMap.enabled = prev.enabled; gl.shadowMap.type = prev.type; };
  }, [gl]);

  const kit = useMemo(() => {
    const room = new Group(), shared = new Set<BufferGeometry>();
    const wallMat = new MeshStandardMaterial({ color: G.wall, roughness: .94 });
    const ceilMat = new MeshStandardMaterial({ color: G.ceiling, roughness: .96, emissive: new Color("#e9e7e2"), emissiveIntensity: .35 });
    const plinthMat = new MeshStandardMaterial({ color: G.plinth, roughness: .72 });
    const blackMat = new MeshStandardMaterial({ color: "#16171a", roughness: .45, metalness: .5 });
    /* Shell: back wall, end walls, ceiling with a laylight and two track rails. */
    const back = new Mesh(new PlaneGeometry(24, LAB_CEIL), wallMat); back.position.set(0, LAB_CEIL / 2, LAB_BACK_Z); back.receiveShadow = true; room.add(back);
    for (const sx of [-1, 1]) { const end = new Mesh(new PlaneGeometry(14, LAB_CEIL), wallMat); end.position.set(sx * 11, LAB_CEIL / 2, 3.6); end.rotation.y = -sx * Math.PI / 2; end.receiveShadow = true; room.add(end); }
    const ceil = new Mesh(new PlaneGeometry(24, 14), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, LAB_CEIL, 3.6); room.add(ceil);
    // Laylights: one diffused ceiling panel over each bay (seen only in the wide hall shots).
    const layMat = new MeshBasicMaterial({ color: new Color("#fbfaf6") });
    for (const st of labStations) { const lay = new Mesh(new PlaneGeometry(4.2, 1.1), layMat); lay.rotation.x = Math.PI / 2; lay.position.set(st.x, LAB_CEIL - .005, -.6); room.add(lay); }
    // Shadow gap at the base of the wall (a recessed black reveal instead of a skirting board).
    const reveal = new Mesh(new BoxGeometry(24, .03, .02), new MeshStandardMaterial({ color: "#2a2b2e", roughness: .9 })); reveal.position.set(0, .015, LAB_BACK_Z + .01); room.add(reveal);
    for (const z of [.7, -1.75]) { const rail = new Mesh(new BoxGeometry(21, .035, .045), blackMat); rail.position.set(0, LAB_CEIL - .06, z); room.add(rail); }
    /* Partitions between the bays. */
    for (const px of LAB_PARTITIONS) {
      const wall = new Mesh(new BoxGeometry(.24, LAB_CEIL - .5, 2.5), wallMat); wall.position.set(px, (LAB_CEIL - .5) / 2, LAB_BACK_Z + 1.25); wall.castShadow = true; wall.receiveShadow = true; room.add(wall);
    }
    /* Hall vinyl on the back wall above the bays. */
    const titleTex = vinylTexture([
      { text: "PERSONAL WORKS", font: `300 120px ${FONT}`, y: 140, spacing: 34 },
      { text: "김범석 개인 작업 · Digital Docent · BCOS · Crime Scene", font: `500 40px ${FONT}`, y: 236, color: "#55545a" },
    ], 2400, 280);
    const title = new Mesh(new PlaneGeometry(4.8, .56), new MeshStandardMaterial({ map: titleTex, transparent: true, roughness: .6 })); title.position.set(0, 3.72, LAB_BACK_Z + .005); room.add(title);
    /* Bench in the hall for scale. */
    const bench = new Group(); bench.position.set(-3.1, 0, 4.6);
    const seat = new Mesh(new BoxGeometry(1.7, .06, .44), new MeshStandardMaterial({ color: G.oak, roughness: .5 })); seat.position.y = .44; seat.castShadow = true; seat.receiveShadow = true; bench.add(seat);
    for (const sx of [-.72, .72]) { const leg = new Mesh(new BoxGeometry(.04, .41, .4), blackMat); leg.position.set(sx, .205, 0); leg.castShadow = true; bench.add(leg); }
    room.add(bench);

    /* Bays. */
    const prints = { docent: docentPrint(), bcos: bcosPrint(), crime: crimePrint() };
    const bays = labStations.map((st, i) => {
      const cx = st.x, w = labWork(cx), bay = new Group();
      const frame = framedPrint(prints[st.id], LAB_FRAME.w, LAB_FRAME.h); frame.position.set(cx + LAB_FRAME.dx, LAB_FRAME.y, LAB_BACK_Z + .002); bay.add(frame);
      const plaque = new Mesh(new BoxGeometry(.24, .16, .006), [0, 0, 0, 0, 1, 0].map(k => k ? new MeshStandardMaterial({ map: plaqueTexture(`0${i + 1} / 03`, st.name, st.year, st.medium), roughness: .7 }) : new MeshStandardMaterial({ color: "#fdfcf9" })));
      plaque.position.set(cx + LAB_FRAME.dx + LAB_FRAME.w / 2 + .32, 1.42, LAB_BACK_Z + .003); bay.add(plaque);
      const no = new Mesh(new PlaneGeometry(1.5, .14), new MeshStandardMaterial({ map: vinylTexture([{ text: `0${i + 1}   ${st.en}`, font: `600 64px ${MONO}`, y: 80, spacing: 10 }], 1500, 140), transparent: true })); no.position.set(cx + LAB_FRAME.dx, LAB_FRAME.y + LAB_FRAME.h / 2 + .32, LAB_BACK_Z + .004); bay.add(no);
      // The spot that lights the work (casts the shadow) and the washer that lights the print.
      const workTarget = new Object3D(); workTarget.position.set(w.x, st.id === "docent" ? 1.3 : .8, w.z);
      const workFrom = new Vector3(w.x + .9, LAB_CEIL - .12, .7);
      const printTarget = new Object3D(); printTarget.position.set(cx + LAB_FRAME.dx, LAB_FRAME.y - .1, LAB_BACK_Z);
      const printFrom = new Vector3(cx + LAB_FRAME.dx, LAB_CEIL - .12, -1.75);
      bay.add(workTarget, printTarget, trackCan(workFrom, workTarget.position, blackMat), trackCan(printFrom, printTarget.position, blackMat));
      const wash = new SpotLight("#fff6ea", 7, 9, .42, .85, 1.6); wash.position.copy(printFrom); wash.target = printTarget; bay.add(wash);
      const key = new SpotLight("#fff8ef", 15, 10, .36, .7, 1.6); key.position.copy(workFrom); key.target = workTarget;
      key.castShadow = true; key.shadow.mapSize.set(low ? 512 : 1024, low ? 512 : 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4;
      bay.add(key);
      room.add(bay);
      return { def: st, cx, w, key, wash, base: { key: 15, wash: 7 } };
    });

    /* 01 · Digital Docent — marble bust on a tall plinth. */
    const dd = bays[0];
    const ddGroup = new Group(); ddGroup.position.set(dd.w.x, 0, dd.w.z); room.add(ddGroup);
    ddGroup.add(plinth(.46, 1.12, .46, plinthMat));
    const HS = .22; // head mesh is ±.835 local units tall → ~.37 m
    const socle = new Mesh(socleGeometry(.075, .2), marbleMaterial(5)); socle.position.y = 1.12; socle.castShadow = true; socle.receiveShadow = true; ddGroup.add(socle);
    const bust = new Group(); bust.position.set(0, 1.12 + .2 + .835 * HS - .03, 0); ddGroup.add(bust);
    const marble = marbleMaterial(3.4), mouthMat = new MeshStandardMaterial({ color: "#5d5955", roughness: .9 });
    let jaw: { mesh: Mesh; i: number } | null = null;
    head.scene.traverse(o => {
      const m = o as Mesh; if (!m.isMesh) return;
      // The mouth cavity stays in shadow when the marble speaks; head and teeth share the stone.
      const cavity = (m.material as MeshStandardMaterial).name === "mouth_wall";
      const piece = new Mesh(m.geometry, cavity ? mouthMat : marble); shared.add(m.geometry);
      piece.scale.setScalar(HS); piece.position.set(-.11 * HS, 0, .15 * HS); piece.castShadow = true; piece.receiveShadow = true;
      const ji = m.morphTargetDictionary?.jawOpen; if (ji !== undefined && !jaw) jaw = { mesh: piece, i: ji };
      bust.add(piece);
    });

    // Sculpture lighting: a high key from front-left models the face; a cool rim from behind-right separates it from the wall.
    const faceTarget = new Object3D(); faceTarget.position.set(dd.w.x, 1.5, dd.w.z);
    const faceKey = new SpotLight("#fff4e6", 5, 6, .22, .8, 1.6); faceKey.position.set(dd.w.x - 1.4, 2.9, dd.w.z + 1.9); faceKey.target = faceTarget;
    const faceRim = new SpotLight("#eef2ff", 6, 5, .25, .8, 1.6); faceRim.position.set(dd.w.x + 1.1, 2.4, dd.w.z - 1.6); faceRim.target = faceTarget;
    room.add(faceKey, faceRim, faceTarget);

    /* 02 · BCOS — five acrylic gates on an oak base, a beam threading them. */
    const bc = bays[1];
    const bcGroup = new Group(); bcGroup.position.set(bc.w.x + .25, 0, bc.w.z); bcGroup.rotation.y = -.4; room.add(bcGroup);
    bcGroup.add(plinth(2.7, .3, .78, plinthMat));
    const acrylic = acrylicWork(["CONTRACT", "WORKER", "VERIFY", "REVIEW", "AUDIT"].map((wd, i) => etchTexture(`0${i + 1}`, wd)), !low);
    acrylic.group.position.y = .3; bcGroup.add(acrylic.group);
    const beamGlow = new Mesh(new PlaneGeometry(.5, .5), new MeshBasicMaterial({ map: glow("rgba(255,214,140,.9)"), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false })); acrylic.group.add(beamGlow);

    /* 03 · Crime Scene — vitrine on a plinth. */
    const cr = bays[2];
    const crGroup = new Group(); crGroup.position.set(cr.w.x, 0, cr.w.z); crGroup.rotation.y = .12; room.add(crGroup);
    const vitrine = vitrineWork({ file: fileTexture(), photos: [0, 1, 2].map(photoTexture), tags: ["T-01", "T-02", "T-03"].map(tagTexture), plate: brassPlateTexture("TRUTH") }, !low);
    crGroup.add(plinth(1.1, vitrine.H, .74, plinthMat), vitrine.group);
    const ledGlow = new Mesh(new PlaneGeometry(.12, .12), new MeshBasicMaterial({ map: glow("rgba(255,70,50,.9)"), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
    room.add(ledGlow);
    return { room, shared, bays, bust, jaw: jaw as { mesh: Mesh; i: number } | null, acrylic, beamGlow, vitrine, ledGlow };
  }, [head, low]);
  useEffect(() => () => disposeTree(kit.room, kit.shared), [kit]);

  const floorTex = useMemo(() => concreteTexture(), []);
  useEffect(() => () => floorTex.dispose(), [floorTex]);

  const v = useMemo(() => new Vector3(), []), warm = useMemo(() => new Color("#f0be64"), []), cool = useMemo(() => new Color("#9cc3ff"), []);
  const turn = useRef(-.15);
  useFrame(({ camera, clock }, delta) => {
    const s = sampleLab(runtime.labProgress.current), t = clock.elapsedTime, k = Math.min(1, delta * 4);
    const focus = s.scene.station;
    /* Lighting: the bay being visited is brightest; the others settle, as in a real hang. */
    kit.bays.forEach(b => {
      const on = !focus || b.def.id === focus ? 1 : .55;
      // Only the visited bay re-renders its shadow map (its work moves); the others keep their last one.
      // (castShadow stays on everywhere so the light/shader setup never changes and nothing recompiles.)
      b.key.shadow.autoUpdate = !focus || b.def.id === focus;
      b.key.intensity += (b.base.key * on - b.key.intensity) * k;
      b.wash.intensity += (b.base.wash * (on * .5 + .5) - b.wash.intensity) * k;
    });
    /* DD: the bust turns from three-quarter to face the visitor; in 03 the marble speaks. */
    turn.current += ((-.15 + .58 * s.bustTurn) - turn.current) * Math.min(1, delta * 3);
    kit.bust.rotation.y = turn.current + .03 * Math.sin(t * .4);
    if (kit.jaw?.mesh.morphTargetInfluences) kit.jaw.mesh.morphTargetInfluences[kit.jaw.i] = s.speak * (.22 + .2 * Math.max(0, Math.sin(t * 9.5) * Math.sin(t * 3.1 + 1)));
    /* BCOS: the beam crosses the gates; each sheet's edges catch the light as it passes. */
    const A = kit.acrylic, x0 = -A.L / 2 - .2, x1 = x0 + (A.L + .4) * Math.max(.0001, s.beam), y = .92;
    A.beam.scale.y = x1 - x0; A.beam.position.set((x0 + x1) / 2, y, 0); A.beam.visible = s.beam > .002;
    A.head.position.set(x1, y, 0); A.head.visible = A.beam.visible && s.beam < .999;
    kit.beamGlow.position.set(x1, y, .01); kit.beamGlow.visible = A.head.visible; kit.beamGlow.quaternion.copy(camera.quaternion);
    A.beamMat.opacity = .85 + .15 * Math.sin(t * 6);
    A.panels.forEach((p, i) => {
      const lit = x1 > p.rest.x ? Math.min(1, (x1 - p.rest.x) * 4) : 0;
      p.edge.emissiveIntensity = lit * (.55 + .15 * Math.sin(t * 2 + i));
      const out = i === 3 ? s.reviewOut : 0;
      // The independent reviewer is a different session: its edges turn cool as it leaves the worker's line.
      if (i === 3) p.edge.emissive.copy(warm).lerp(cool, out);
      p.group.position.set(p.rest.x, p.rest.y + .04 * out, p.rest.z + .42 * out);
    });
    /* Crime Scene: the locked light breathes; whitelisted tags light up, the refused one stays dark. */
    const V = kit.vitrine;
    V.ledMat.color.set("#ff3b2f").multiplyScalar(.6 + 1.6 * s.vaultGlow * (.75 + .25 * Math.sin(t * 2.4)));
    V.tags.forEach((tg, i) => { tg.mat.emissiveIntensity = tg.pass ? .9 * Math.min(1, Math.max(0, s.whitelist * 3 - i)) : 0; });
    V.led.getWorldPosition(v); kit.ledGlow.position.copy(v); kit.ledGlow.quaternion.copy(camera.quaternion);
    (kit.ledGlow.material as MeshBasicMaterial).opacity = .35 + .65 * s.vaultGlow;

    /* DOM anchors: the centre of each work (intro cards). */
    const root = runtime.labViewport.current;
    if (root) {
      const W = size.width, H = size.height;
      kit.bays.forEach(b => {
        const h = b.def.id === "docent" ? 1.45 : b.def.id === "bcos" ? .9 : 1.15;
        const d = project(v.set(b.w.x + (b.def.id === "bcos" ? .25 : 0), h, b.w.z), camera, W, H);
        root.style.setProperty(`--d-${b.def.id}-x`, `${d[0].toFixed(1)}px`); root.style.setProperty(`--d-${b.def.id}-y`, `${d[1].toFixed(1)}px`);
      });
    }
  });

  return <>
    <hemisphereLight args={["#ffffff", "#ddd8cf", .5]}/>
    <directionalLight position={[2, 9, 8]} intensity={.9} color="#f6f7ff"/>
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[18, 2, 1]}/>
      <Lightformer form="rect" intensity={1.2} color="#fff7ee" position={[0, 2.5, 10]} scale={[16, 4, 1]}/>
      <Lightformer form="rect" intensity={.9} color="#eef3ff" position={[-10, 2.5, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]}/>
      <Lightformer form="rect" intensity={.9} color="#fff2e2" position={[10, 2.5, 2]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]}/>
    </Environment>
    <primitive object={kit.room}/>
    {/* Polished concrete: a soft, blurred reflection of the hang. */}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 3.6]} receiveShadow>
      <planeGeometry args={[24, 14]}/>
      {low
        ? <meshStandardMaterial color="#ffffff" map={floorTex} roughness={.55}/>
        : <MeshReflectorMaterial map={floorTex} color="#ffffff" roughness={.78} roughnessMap={floorTex} metalness={0} blur={[600, 200]} resolution={512} mixBlur={1.4} mixStrength={.9} mixContrast={1} depthScale={1.1} minDepthThreshold={.3} maxDepthThreshold={1.2} mirror={0}/>}
    </mesh>
  </>;
}
