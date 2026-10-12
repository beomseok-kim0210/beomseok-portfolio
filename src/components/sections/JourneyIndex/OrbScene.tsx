"use client";
/**
 * Real-time glass world for one project (one small canvas per sphere so the DOM dive/hover
 * transforms keep working). Glass = transmission + fresnel rim; contents are luminous
 * project material; orbits, surface sparkles and a metal pedestal; bloom on top.
 * The canvas clears to black and is composited with mix-blend-mode: screen.
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Line, MeshTransmissionMaterial, useTexture } from "@react-three/drei";
import {
  AdditiveBlending, Color, DoubleSide, InstancedMesh, Matrix4, Object3D, SRGBColorSpace, ShaderMaterial, Vector2, type Group,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { hgAnchors, hgBones } from "@/features/world/adapters/hangaraeAnimatic";
import { renderTier } from "@/features/world/runtime/renderTier";

export type OrbId = "armi" | "hangarae" | "wedding";
/** Canvas box relative to the sphere box (CSS sets the same insets): wider for orbits, taller for the pedestal. */
export const ORB_CANVAS = { left: .42, right: .42, top: .32, bottom: .62 };
// sphere radius 1 ⇒ diameter 2 units ≙ the CSS sphere box; the canvas adds the insets around it
const W_UNITS = 2 * (1 + ORB_CANVAS.left + ORB_CANVAS.right);
const H_UNITS = 2 * (1 + ORB_CANVAS.top + ORB_CANVAS.bottom);

export default function OrbScene({ id, accent, active, reduced }: { id: OrbId; accent: string; active: boolean; reduced: boolean }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 1, near: .1, far: 40 }}
      dpr={[1, 1.25]}
      frameloop={active ? (reduced ? "demand" : "always") : "never"}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#000000", 1)}
    >
      <Fit />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[3, 4, 4]} scale={[4, 2, 1]} />
        <Lightformer form="ring" intensity={4} color={accent} position={[-4, 0, 2]} scale={3} />
        <Lightformer form="rect" intensity={1.5} color="#6f8fd0" position={[0, -4, 3]} scale={[8, 1, 1]} />
      </Environment>
      <ambientLight intensity={.35} color="#8fa6d6" />
      <directionalLight position={[2, 5, 4]} intensity={2.2} color="#dfe8ff" />
      <Suspense fallback={null}><World id={id} accent={accent} /></Suspense>
      {renderTier() === "high" && <Bloom />}
    </Canvas>
  );
}

/** Orthographic fit: sphere diameter (2 units) maps exactly onto the CSS sphere box; centre offset matches the insets. */
function Fit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const zoom = size.width / W_UNITS;
    camera.zoom = zoom;
    // canvas centre vs sphere centre (units): sphere sits ORB_CANVAS.top below the top edge, +1 radius
    const cy = H_UNITS / 2 - (ORB_CANVAS.top * 2 + 1);
    camera.position.set(0, -cy, 10); camera.lookAt(0, -cy, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Bloom() {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(new Vector2(256, 256), .28, .16, .5));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);
  useEffect(() => { composer.setPixelRatio(gl.getPixelRatio()); composer.setSize(size.width, size.height); }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => composer.render(), 1);
  return null;
}

/* ── Materials ───────────────────────────────────────────── */
function useFresnel(color: string, power: number, intensity: number) {
  return useMemo(() => new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uPower: { value: power }, uIntensity: { value: intensity } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uPower; uniform float uIntensity; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1. - abs(dot(vN, vV)), uPower); gl_FragColor = vec4(uColor * f * uIntensity, f); }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
  }), [color, power, intensity]);
}

/* ── The world ───────────────────────────────────────────── */
function World({ id, accent }: { id: OrbId; accent: string }) {
  const root = useRef<Group>(null), content = useRef<Group>(null), orbits = useRef<Group>(null);
  const rim = useFresnel(accent, 3.2, .65), inner = useFresnel("#ffffff", 6, .12);
  useFrame(({ clock, pointer }, dt) => {
    const t = clock.elapsedTime;
    if (root.current) { // gentle float + tilt toward the cursor while hovered
      root.current.position.y = Math.sin(t * .9) * .035;
      root.current.rotation.x += (.26 - pointer.y * .12 - root.current.rotation.x) * Math.min(1, dt * 3);
      root.current.rotation.y += (pointer.x * .32 - root.current.rotation.y) * Math.min(1, dt * 3);
    }
    if (content.current) content.current.rotation.y = Math.sin(t * .35) * .35;
    if (orbits.current) orbits.current.rotation.y = t * .25;
  });
  return (
    <group ref={root} rotation={[.26, 0, 0]}>
      <Pedestal accent={accent} />
      <group ref={content}><Contents id={id} accent={accent} /></group>
      {/* glass */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[1, 64, 48]} />
        {renderTier() === "low"
          ? <meshPhysicalMaterial transparent opacity={.18} roughness={.05} metalness={0} color={accent} />
          : <MeshTransmissionMaterial transmission={1} thickness={.35} roughness={.04} ior={1.18} chromaticAberration={.04} anisotropy={.1}
          distortion={.08} distortionScale={.4} temporalDistortion={.06} samples={2} resolution={128} backside={false}
          color={new Color(accent).lerp(new Color("#ffffff"), .88)} attenuationColor={accent} attenuationDistance={4} />}
      </mesh>
      <mesh scale={1.003} material={rim} renderOrder={3}><sphereGeometry args={[1, 64, 64]} /></mesh>
      <mesh scale={.985} material={inner} renderOrder={1}><sphereGeometry args={[1, 48, 48]} /></mesh>
      <Wireframe accent={accent} />
      <Sparkles />
      <group ref={orbits}><Orbits accent={accent} /></group>
    </group>
  );
}

function Wireframe({ accent }: { accent: string }) {
  const lines = useMemo(() => {
    const out: [number, number, number][][] = [];
    for (let m = 0; m < 12; m++) { const a = (m / 12) * Math.PI; out.push(Array.from({ length: 65 }, (_, i) => { const t = (i / 64) * Math.PI * 2; return [Math.cos(t) * Math.cos(a), Math.sin(t), Math.cos(t) * Math.sin(a)]; })); }
    for (const y of [-.75, -.5, -.25, 0, .25, .5, .75]) { const r = Math.sqrt(1 - y * y); out.push(Array.from({ length: 65 }, (_, i) => { const t = (i / 64) * Math.PI * 2; return [Math.cos(t) * r, y, Math.sin(t) * r]; })); }
    return out;
  }, []);
  return <group scale={1.002}>{lines.map((pts, i) => <Line key={i} points={pts} color={accent} lineWidth={.6} transparent opacity={.14} />)}</group>;
}

function Sparkles() {
  const positions = useMemo(() => {
    const n = 140, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u) * 1.004; a.set([Math.cos(th) * r, u * 1.004, Math.sin(th) * r], i * 3); }
    return a;
  }, []);
  const seeds = useMemo(() => Float32Array.from({ length: 140 }, () => Math.random() * 10), []);
  const mat = useMemo(() => new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aSeed; uniform float uTime; varying float vA;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vA = .35 + .65*pow(.5+.5*sin(uTime*2.+aSeed*7.),3.); gl_PointSize = (1.6 + vA*2.6); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); gl_FragColor = vec4(vec3(1.), smoothstep(.5,0.,d)*vA); }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false,
  }), []);
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime; });
  return <points material={mat}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /><bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} /></bufferGeometry>
  </points>;
}

function Orbits({ accent }: { accent: string }) {
  const node = useRef<Group>(null), node2 = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    node.current?.position.set(Math.cos(t * .8) * 1.42, 0, Math.sin(t * .8) * 1.42);
    node2.current?.position.set(Math.cos(-t * .6 + 2) * 1.26, 0, Math.sin(-t * .6 + 2) * 1.26);
  });
  return <>
    <group rotation={[1.36, 0, -.16]}>
      <mesh><torusGeometry args={[1.42, .006, 8, 160]} /><meshBasicMaterial color={accent} transparent opacity={.55} toneMapped={false} /></mesh>
      <group ref={node}><mesh><sphereGeometry args={[.035, 16, 16]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh></group>
    </group>
    <group rotation={[1.2, 0, .22]}>
      <mesh><torusGeometry args={[1.26, .004, 8, 160]} /><meshBasicMaterial color={accent} transparent opacity={.3} toneMapped={false} /></mesh>
      <group ref={node2}><mesh><sphereGeometry args={[.025, 16, 16]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh></group>
    </group>
  </>;
}

function Pedestal({ accent }: { accent: string }) {
  const pool = useMemo(() => new ShaderMaterial({
    uniforms: { uColor: { value: new Color(accent) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv; void main(){ float d = length(vUv-.5)*2.; gl_FragColor = vec4(uColor, smoothstep(1.,0.,d)*.28); }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false,
  }), [accent]);
  return (
    <group position={[0, -1.32, 0]}>
      <mesh position={[0, -.1, 0]}><cylinderGeometry args={[1.12, 1.2, .14, 96]} /><meshStandardMaterial color="#0d1422" metalness={.9} roughness={.28} /></mesh>
      <mesh position={[0, .02, 0]}><cylinderGeometry args={[.92, 1.0, .12, 96]} /><meshStandardMaterial color="#151f31" metalness={.85} roughness={.3} /></mesh>
      <mesh position={[0, .085, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.72, .02, 12, 128]} /><meshBasicMaterial color={accent} transparent opacity={.6} toneMapped={false} /></mesh>
      <mesh position={[0, .03, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[1.0, .006, 8, 128]} /><meshBasicMaterial color="#cfe0ff" transparent opacity={.5} toneMapped={false} /></mesh>
      <mesh position={[0, .09, 0]} rotation={[-Math.PI / 2, 0, 0]} material={pool}><planeGeometry args={[1.8, 1.8]} /></mesh>
    </group>
  );
}

/* ── Contents (real project material) ────────────────────── */
function Contents({ id, accent }: { id: OrbId; accent: string }) {
  if (id === "armi") return <Armi accent={accent} />;
  if (id === "hangarae") return <Skeleton />;
  return <Wedding />;
}

function GlassCard({ src, w, h, position, rotation, tint, opacity = .9 }: { src: string; w: number; h: number; position: [number, number, number]; rotation?: [number, number, number]; tint: string; opacity?: number }) {
  const tex = useTexture(src); tex.colorSpace = SRGBColorSpace;
  return (
    <group position={position} rotation={rotation}>
      <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} color="#9aa6b8" transparent opacity={opacity * .85} side={DoubleSide} /></mesh>
      <Line points={[[-w / 2, -h / 2, .001], [w / 2, -h / 2, .001], [w / 2, h / 2, .001], [-w / 2, h / 2, .001], [-w / 2, -h / 2, .001]]} color={tint} lineWidth={1.2} />
    </group>
  );
}

function Armi({ accent }: { accent: string }) {
  const bars = useRef<InstancedMesh>(null);
  const N = 30, tmp = useMemo(() => new Object3D(), []), m = useMemo(() => new Matrix4(), []);
  useFrame(({ clock }) => {
    const b = bars.current; if (!b) return;
    for (let i = 0; i < N; i++) {
      const h = .04 + Math.abs(Math.sin(i * .9 + clock.elapsedTime * 3) * .18 + Math.sin(i * .37 + clock.elapsedTime * 1.7) * .1);
      tmp.position.set(-.58 + i * .04, -.52, .25); tmp.scale.set(1, h / .1, 1); tmp.updateMatrix(); m.copy(tmp.matrix); b.setMatrixAt(i, m);
    }
    b.instanceMatrix.needsUpdate = true;
  });
  return <>
    <GlassCard src="/images/armi/patient-tablet-original.webp" w={1.25} h={.78} position={[-.04, .12, .05]} rotation={[0, .32, 0]} tint={accent} />
    <GlassCard src="/images/armi/patient-tablet-conversation-original.webp" w={.62} h={.39} position={[.42, -.12, .35]} rotation={[0, .32, 0]} tint={accent} opacity={.55} />
    <instancedMesh ref={bars} args={[undefined, undefined, N]}><boxGeometry args={[.018, .1, .018]} /><meshBasicMaterial color={accent} transparent opacity={.6} toneMapped={false} /></instancedMesh>
  </>;
}

function Skeleton() {
  const k = 1.62 / 235, cx = 110.5, cy = 186;
  const P = hgAnchors.map(([x, y, z]) => [(x - cx) * k, -(y - cy) * k, z * k * .8] as [number, number, number]);
  const bones = hgBones.filter(([a, b]) => a > 4 && b > 4);
  const head: [number, number, number] = [P[0][0], P[0][1] + .05, P[0][2]];
  return <group position={[0, -.04, 0]}>
    {bones.map(([a, b]) => <Line key={`${a}-${b}`} points={[P[a], P[b]]} color={a >= 11 && b >= 11 ? "#f2b766" : "#9ef2ff"} lineWidth={3.2} toneMapped={false} />)}
    <Line points={[head, [0, (P[5][1] + P[6][1]) / 2, 0], [0, (P[11][1] + P[12][1]) / 2, 0]]} color="#9ef2ff" lineWidth={2.2} toneMapped={false} />
    <mesh position={head}><sphereGeometry args={[.085, 24, 24]} /><meshBasicMaterial color="#63cbdb" transparent opacity={.35} toneMapped={false} /></mesh>
    {P.slice(5).map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[.022, 12, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>)}
  </group>;
}

function Wedding() {
  return <>
    <GlassCard src="/images/before_wedding.webp" w={.5} h={.72} position={[-.42, .02, -.05]} rotation={[0, .5, .1]} tint="#cbb8ff" opacity={.7} />
    <GlassCard src="/images/after_wedding.webp" w={.5} h={.72} position={[.42, .02, -.05]} rotation={[0, -.5, -.1]} tint="#cbb8ff" opacity={.7} />
    <GlassCard src="/images/after_wedding.webp" w={.62} h={.88} position={[0, .04, .2]} tint="#e6dcff" />
  </>;
}
