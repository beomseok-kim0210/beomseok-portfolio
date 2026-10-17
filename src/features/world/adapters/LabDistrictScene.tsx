"use client";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, EdgesGeometry, Group, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, Points, PointsMaterial, SRGBColorSpace,
  TorusGeometry, Vector3, type Camera,
} from "three";
import type { WorldRuntime } from "../director/worldRuntime";
import { labStations, sampleLab } from "./labRoom";

/*
 * 04 Personal Lab: a dark instrument room. Three stations stand on a circuit rail that runs across the
 * floor; a light pulse travels the rail as the visit moves from station to station. Each station carries
 * an EMPTY screen (its content is supplied later); the DOM frames the same rect as the content slot.
 */
const ROOM = { floor: "#0a0f16", wall: "#121a25", panel: "#18222f", metal: "#8b97a6" };
function project(v: Vector3, camera: Camera, w: number, h: number) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * w, (1 - p.y) / 2 * h, p.z] as const; }
function glowTexture(color: string) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
function gridTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const x = c.getContext("2d")!; x.fillStyle = "#0a0f16"; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = "rgba(120,150,190,.22)"; x.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
  const t = new CanvasTexture(c); t.wrapS = t.wrapT = 1000; t.repeat.set(10, 6); t.anisotropy = 4; t.colorSpace = SRGBColorSpace; return t;
}

/** A station: plinth + a device that reads as its project + an empty screen the content will occupy. */
function makeStation(id: string, accent: string) {
  const g = new Group(), col = new Color(accent);
  const plinth = new Mesh(new CylinderGeometry(1.05, 1.15, .32, 48), new MeshStandardMaterial({ color: "#151e2a", roughness: .55, metalness: .6 }));
  plinth.position.y = .16; plinth.receiveShadow = true; g.add(plinth);
  const rimMat = new MeshBasicMaterial({ color: col.clone().multiplyScalar(1.4), toneMapped: false });
  const rim = new Mesh(new TorusGeometry(1.08, .012, 8, 96), rimMat); rim.rotation.x = Math.PI / 2; rim.position.y = .33; g.add(rim);
  const device = new Group(); device.position.y = .32; g.add(device);
  const glass = new MeshPhysicalMaterial({ color: "#9fb4cc", roughness: .12, metalness: 0, transmission: 0, transparent: true, opacity: .16, clearcoat: 1 });
  const edge = (geo: BufferGeometry, op = .85) => new LineSegments(new EdgesGeometry(geo), new LineBasicMaterial({ color: col, transparent: true, opacity: op }));
  if (id === "docent") {
    // Projection chamber: a glass cylinder over a ring base (the docent's hologram language).
    const cyl = new CylinderGeometry(.55, .55, 1.6, 48, 1, true);
    const shell = new Mesh(cyl, glass); shell.position.y = .9; device.add(shell);
    for (const y of [.12, .9, 1.68]) { const r = new Mesh(new TorusGeometry(.55, .008, 6, 72), rimMat); r.rotation.x = Math.PI / 2; r.position.y = y; device.add(r); }
  } else if (id === "bcos") {
    // Gates in series: contract → verify → review (stacked frames along the rail direction).
    [-.5, 0, .5].forEach((z, i) => { const fr = edge(new BoxGeometry(1.0, 1.1 + i * .15, .06)); fr.position.set(0, .7 + i * .07, z); device.add(fr); });
    const core = new Mesh(new BoxGeometry(.32, .32, .32), new MeshStandardMaterial({ color: "#1b2533", emissive: col, emissiveIntensity: .6 })); core.position.y = .55; device.add(core);
  } else {
    // Sealed vault (the server-owned truth) with a case file resting on it.
    const box = new BoxGeometry(1.0, .8, .8);
    const vault = new Mesh(box, new MeshStandardMaterial({ color: "#161f2b", roughness: .4, metalness: .7 })); vault.position.y = .42; vault.castShadow = true; device.add(vault);
    const e = edge(box); e.position.y = .42; device.add(e);
    const file = new Mesh(new BoxGeometry(.55, .03, .4), new MeshStandardMaterial({ color: "#c8b48c", roughness: .9 })); file.position.set(.08, .84, 0); file.rotation.y = .3; device.add(file);
  }
  // The empty screen above / beside the device: dark glass with a hairline frame (content comes later).
  const screen = new Group(); screen.position.set(0, 2.35, -.25);
  const pane = new Mesh(new PlaneGeometry(1.9, 1.15), new MeshBasicMaterial({ color: "#0d1520", transparent: true, opacity: .82 }));
  const frame = edge(new BoxGeometry(1.9, 1.15, .001), .55);
  screen.add(pane, frame); g.add(screen);
  const halo = new Mesh(new PlaneGeometry(3.2, 3.2), new MeshBasicMaterial({ map: glowTexture(accent), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: .35 }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = .015; g.add(halo);
  return { group: g, rimMat, halo, screen, device };
}

export function LabDistrictScene({ runtime }: { runtime: WorldRuntime }) {
  const { size } = useThree();
  const kit = useMemo(() => {
    const room = new Group();
    const floor = new Mesh(new PlaneGeometry(40, 24), new MeshStandardMaterial({ map: gridTexture(), roughness: .35, metalness: .4 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 3); floor.receiveShadow = true; room.add(floor);
    const wall = new Mesh(new PlaneGeometry(40, 9), new MeshStandardMaterial({ color: ROOM.wall, roughness: .8, metalness: .2 }));
    wall.position.set(0, 4.5, -3.2); room.add(wall);
    // Back wall instrument bays: vertical light slots between dark panels.
    const slotMat = new MeshBasicMaterial({ color: new Color("#6f8fb8").multiplyScalar(.9), toneMapped: false });
    for (let x = -12; x <= 12; x += 2.4) {
      const panel = new Mesh(new BoxGeometry(2.2, 5.2, .08), new MeshStandardMaterial({ color: ROOM.panel, roughness: .6, metalness: .5 })); panel.position.set(x, 2.8, -3.12); room.add(panel);
      const slot = new Mesh(new PlaneGeometry(.035, 4.4), slotMat); slot.position.set(x + 1.2, 2.9, -3.07); room.add(slot);
    }
    // Circuit rail across the floor connecting the stations.
    const railMat = new MeshBasicMaterial({ color: "#2a3a52" });
    const rail = new Mesh(new BoxGeometry(13, .02, .06), railMat); rail.position.set(0, .012, 1.35); room.add(rail);
    const pulse = new Mesh(new PlaneGeometry(1.6, .5), new MeshBasicMaterial({ map: glowTexture("rgba(170,215,255,.95)"), transparent: true, depthWrite: false, blending: AdditiveBlending }));
    pulse.rotation.x = -Math.PI / 2; pulse.position.set(-6.5, .03, 1.35); room.add(pulse);
    // Dust in the air.
    const N = 220, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = -9 + Math.random() * 18; pos[i * 3 + 1] = .2 + Math.random() * 5; pos[i * 3 + 2] = -2.5 + Math.random() * 6; }
    const dg = new BufferGeometry(); dg.setAttribute("position", new BufferAttribute(pos, 3));
    const dust = new Points(dg, new PointsMaterial({ color: "#9fc2ee", size: .018, transparent: true, opacity: .5, depthWrite: false })); room.add(dust);
    const stations = labStations.map(s => { const st = makeStation(s.id, s.accent); st.group.position.set(s.x, 0, 0); room.add(st.group); return { ...st, def: s }; });
    return { room, pulse, dust, stations };
  }, []);
  useEffect(() => () => { kit.room.traverse(o => { const m = o as Mesh; m.geometry?.dispose(); const mat = m.material as MeshBasicMaterial | undefined; mat?.map?.dispose(); mat?.dispose?.(); }); }, [kit]);

  const v = useMemo(() => new Vector3(), []);
  useFrame(({ camera, clock }) => {
    const s = sampleLab(runtime.labProgress.current), t = clock.elapsedTime;
    kit.pulse.position.x = -6.5 + 13 * s.rail;
    kit.dust.rotation.y = Math.sin(t * .05) * .04;
    const focus = s.scene.station;
    kit.stations.forEach(st => {
      const on = !focus || st.def.id === focus;
      (st.halo.material as MeshBasicMaterial).opacity = on ? .38 + .08 * Math.sin(t * 2) : .1;
      st.rimMat.color.set(st.def.accent).multiplyScalar(on ? 1.5 : .45);
      st.device.rotation.y = st.def.id === "docent" ? t * .2 : 0;
    });
    // DOM anchors: each station's screen rect (the content slot sits exactly on it) and its centre.
    const root = runtime.labViewport.current;
    if (root) {
      const W = size.width, H = size.height;
      kit.stations.forEach(st => {
        st.screen.getWorldPosition(v); const tl = project(v.clone().add(new Vector3(-.95, .575, 0)), camera, W, H), br = project(v.clone().add(new Vector3(.95, -.575, 0)), camera, W, H);
        root.style.setProperty(`--s-${st.def.id}-x`, `${tl[0].toFixed(1)}px`); root.style.setProperty(`--s-${st.def.id}-y`, `${tl[1].toFixed(1)}px`);
        root.style.setProperty(`--s-${st.def.id}-w`, `${(br[0] - tl[0]).toFixed(1)}px`); root.style.setProperty(`--s-${st.def.id}-h`, `${(br[1] - tl[1]).toFixed(1)}px`);
        const d = project(v.set(st.def.x, 1.1, 0), camera, W, H);
        root.style.setProperty(`--d-${st.def.id}-x`, `${d[0].toFixed(1)}px`); root.style.setProperty(`--d-${st.def.id}-y`, `${d[1].toFixed(1)}px`);
      });
    }
  });

  return <>
    <hemisphereLight args={["#9fb8d8", "#05080d", .8]}/>
    <directionalLight position={[-3, 7, 6]} intensity={1.4} color="#d6e4ff"/>
    <pointLight position={[0, 3.5, 2]} intensity={18} distance={14} color="#8fb4e8"/>
    <Environment resolution={64} frames={1}>
      <Lightformer form="rect" intensity={1.6} color="#a9c4ec" position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[14, 4, 1]}/>
      <Lightformer form="rect" intensity={.8} color="#6f8fb8" position={[-8, 2, 4]} rotation-y={Math.PI / 2} scale={[4, 4, 1]}/>
    </Environment>
    <primitive object={kit.room}/>
  </>;
}
