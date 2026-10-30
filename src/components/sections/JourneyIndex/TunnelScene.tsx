"use client";
/**
 * Entry tunnel in real 3D: the camera flies down a tube of light — streaks stream past on the
 * walls, broken ring segments recede, glass panels with the project's own screens fly by, and a
 * bright core waits at the vanishing point. `level` (0..1) drives opacity-independent speed and
 * brightness; the DOM wrapper fades the canvas. Black clear, composited with screen.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { AdditiveBlending, Color, DoubleSide, Group, InstancedMesh, Object3D, SRGBColorSpace, ShaderMaterial, Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { renderTier } from "@/features/world/runtime/renderTier";
import { tuneRenderer } from "@/features/world/runtime/shaderGate";
import { WarmCanvas } from "@/features/world/runtime/WarmCanvas";
import { useBudgetDpr } from "@/features/world/runtime/pixelBudget";

const DEPTH = 70; // tube length in front of the camera
const rand = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Mounted ahead of the dive (hidden, `active` false) so the dive itself only draws. */
export default function TunnelScene({ accent, level, screens, active = true }: { accent: string; level: MutableRefObject<number>; screens: string[]; active?: boolean }) {
  const [warm, setWarm] = useState(false), onWarm = useCallback(() => setWarm(true), []), dpr = useBudgetDpr(1.25);
  return (
    <Canvas camera={{ position: [0, 0, 0], fov: 72, near: .1, far: 120 }} dpr={dpr} frameloop={active && warm ? "always" : "never"}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onCreated={({ gl }) => { tuneRenderer(gl); gl.setClearColor("#000000", 1); }}>
      <fog attach="fog" args={["#000000", 18, DEPTH]} />
      <Flight accent={accent} level={level} screens={screens} onWarm={onWarm} />
      {renderTier() === "high" && <Bloom />}
    </Canvas>
  );
}

function Bloom() {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    const bloom = new UnrealBloomPass(new Vector2(256, 256), .35, .3, .35), output = new OutputPass();
    c.addPass(new RenderPass(scene, camera));
    c.addPass(bloom);
    c.addPass(output);
    scene.userData.warmPasses = [[bloom], [output]]; // WarmCanvas precompiles them
    return c;
  }, [gl, scene, camera]);
  useEffect(() => { composer.setPixelRatio(gl.getPixelRatio()); composer.setSize(size.width, size.height); }, [composer, gl, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => composer.render(), 1);
  return null;
}

function Flight({ accent, level, screens, onWarm }: { accent: string; level: MutableRefObject<number>; screens: string[]; onWarm: () => void }) {
  const travel = useRef(0);
  const cam = useThree(s => s.camera);
  useFrame((_, dt) => {
    const k = level.current;
    travel.current += dt * (6 + k * 34); // speed rises with the dive
    // slight banking drift, like the reference's off-centre vanishing point
    cam.position.x = Math.sin(travel.current * .02) * .25 + .35; cam.position.y = Math.cos(travel.current * .017) * .15;
    cam.lookAt(.9, .1, -DEPTH);
  });
  return <>
    <Streaks accent={accent} travel={travel} level={level} />
    <Rings accent={accent} travel={travel} />
    <Suspense fallback={null}><Panels accent={accent} travel={travel} screens={screens} /><WarmCanvas onWarm={onWarm} /></Suspense>
    <Core accent={accent} level={level} />
  </>;
}

/** Light streaks on the tube walls: instanced thin boxes, stretched by speed. */
function Streaks({ accent, travel, level }: { accent: string; travel: MutableRefObject<number>; level: MutableRefObject<number> }) {
  const N = renderTier() === "high" ? 220 : 120, ref = useRef<InstancedMesh>(null), tmp = useMemo(() => new Object3D(), []);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: rand(i) * Math.PI * 2, r: 2.2 + rand(i + 900) * 3.4, z: rand(i + 1800) * DEPTH, l: .6 + rand(i + 2700) * 2.2, w: rand(i + 3600) })), [N]);
  useEffect(() => { // colour: mostly accent, some white-hot
    const m = ref.current; if (!m) return;
    const a = new Color(accent), w = new Color("#ffffff");
    seeds.forEach((s, i) => m.setColorAt(i, s.w > .9 ? w : a.clone().multiplyScalar(.35 + s.w * .5)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [accent, seeds]);
  useFrame(() => {
    const m = ref.current; if (!m) return;
    const stretch = 1 + level.current * 3.5;
    seeds.forEach((s, i) => {
      const z = -((s.z - travel.current) % DEPTH + DEPTH) % DEPTH;
      tmp.position.set(Math.cos(s.a) * s.r, Math.sin(s.a) * s.r * .8, z);
      tmp.rotation.set(0, 0, s.a);
      tmp.scale.set(1, 1, s.l * stretch);
      tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, N]}>
    <boxGeometry args={[.012, .012, 1]} />
    <meshBasicMaterial toneMapped={false} transparent opacity={.55} blending={AdditiveBlending} depthWrite={false} />
  </instancedMesh>;
}

/** Broken ring segments receding down the tube. */
function Rings({ accent, travel }: { accent: string; travel: MutableRefObject<number> }) {
  const count = 9, refs = useRef<(Group | null)[]>([]);
  const specs = useMemo(() => Array.from({ length: count }, (_, i) => ({ z: (i / count) * DEPTH, arc: 1.2 + rand(i + 40) * 3.2, rot: rand(i + 80) * Math.PI * 2, r: 3.6 + rand(i + 120) * 1.2 })), []);
  useFrame(() => specs.forEach((s, i) => { const g = refs.current[i]; if (g) g.position.z = -((s.z - travel.current * .6) % DEPTH + DEPTH) % DEPTH; }));
  return <>{specs.map((s, i) => (
    <group key={i} ref={el => { refs.current[i] = el; }} rotation={[0, 0, s.rot]}>
      <mesh><torusGeometry args={[s.r, .03, 8, 96, s.arc]} /><meshBasicMaterial color={accent} toneMapped={false} transparent opacity={.45} /></mesh>
      <mesh rotation={[0, 0, s.arc + .4]}><torusGeometry args={[s.r, .012, 6, 64, s.arc * .4]} /><meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={.5} /></mesh>
    </group>
  ))}</>;
}

/** Glass panels with the project's real screens, flying past on both sides. */
function Panels({ accent, travel, screens }: { accent: string; travel: MutableRefObject<number>; screens: string[] }) {
  const tex = useTexture(screens);
  tex.forEach(t => { t.colorSpace = SRGBColorSpace; });
  const refs = useRef<(Group | null)[]>([]);
  const specs = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    return { side, z: (i / 8) * DEPTH, y: (rand(i + 7) - .5) * 2.4, x: side * (2.4 + rand(i + 9) * 1.2), t: i % tex.length, s: .9 + rand(i + 11) * .7 };
  }), [tex.length]);
  useFrame(() => specs.forEach((s, i) => { const g = refs.current[i]; if (g) g.position.z = -((s.z - travel.current * .8) % DEPTH + DEPTH) % DEPTH; }));
  const frame = useMemo(() => new ShaderMaterial({
    uniforms: { uColor: { value: new Color(accent) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv; void main(){ vec2 d=min(vUv,1.-vUv); float e=1.-smoothstep(0.,.025,min(d.x,d.y)); gl_FragColor=vec4(uColor, e*.7 + .04); }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
  }), [accent]);
  return <>{specs.map((s, i) => (
    <group key={i} ref={el => { refs.current[i] = el; }} position={[s.x, s.y, 0]} rotation={[0, -s.side * 1.05, 0]} scale={s.s}>
      <mesh><planeGeometry args={[1.6, 1]} /><meshBasicMaterial map={tex[s.t]} color="#7f93a8" transparent opacity={.55} side={DoubleSide} depthWrite={false} /></mesh>
      <mesh material={frame}><planeGeometry args={[1.62, 1.02]} /></mesh>
    </group>
  ))}</>;
}

/** Bright core at the vanishing point. */
function Core({ accent, level }: { accent: string; level: MutableRefObject<number> }) {
  const mat = useMemo(() => new ShaderMaterial({
    uniforms: { uColor: { value: new Color(accent) }, uK: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uK; varying vec2 vUv; void main(){ float d=length(vUv-.5)*2.;
      vec3 c = mix(vec3(1.), uColor, smoothstep(.0,.5,d)); gl_FragColor=vec4(c*(.35+uK*.35), pow(smoothstep(1.,0.,d),2.)*(.5+uK*.3)); }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false,
  }), [accent]);
  useFrame(() => { mat.uniforms.uK.value = level.current; });
  return <mesh position={[1.4, .2, -DEPTH + 6]} material={mat}><planeGeometry args={[18, 18]} /></mesh>;
}
