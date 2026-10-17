"use client";
/**
 * Low-tier path for the project orbs: ONE WebGL context draws all three glass worlds, each into the
 * screen rect of its own DOM box (drei View, scissored). Three canvases meant three contexts, three
 * environment maps and three render loops; phones felt that most. The look matches the per-orb
 * canvas minus bloom (which the low tier never had).
 */
import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrthographicCamera, View } from "@react-three/drei";
import { ORB_CANVAS, World, type OrbId } from "./OrbScene";

const W_UNITS = 2 * (1 + ORB_CANVAS.left + ORB_CANVAS.right);
const H_UNITS = 2 * (1 + ORB_CANVAS.top + ORB_CANVAS.bottom);

/** One orb's region: a DOM box the shared canvas draws into. */
export function OrbView({ id, accent, className }: { id: OrbId; accent: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  return <View ref={box as unknown as RefObject<HTMLElement>} className={className}>
    <DepthReset />
    <ViewCamera box={box} />
    <ambientLight intensity={.35} color="#8fa6d6" />
    <directionalLight position={[2, 5, 4]} intensity={2.2} color="#dfe8ff" />
    <Suspense fallback={null}><World id={id} accent={accent} /></Suspense>
  </View>;
}

/** Orthographic fit to the view's own box (the portal's `size` is the shared canvas, not the view). */
function ViewCamera({ box }: { box: RefObject<HTMLDivElement | null> }) {
  const cam = useRef<import("three").OrthographicCamera>(null);
  const cy = H_UNITS / 2 - (ORB_CANVAS.top * 2 + 1);
  useFrame(() => {
    const c = cam.current, el = box.current; if (!c || !el) return;
    const zoom = el.clientWidth / W_UNITS;
    if (Math.abs(c.zoom - zoom) > 1e-3) { c.zoom = zoom; c.updateProjectionMatrix(); }
  });
  return <OrthographicCamera ref={cam} makeDefault position={[0, -cy, 10]} near={.1} far={40} />;
}

/** Boxes overlap at their orbit edges: keep colour (no per-view clear, which cut the neighbour's rings)
 *  but start each view with a fresh depth buffer so one orb never occludes another. */
function DepthReset() {
  const { scene } = useThree();
  useEffect(() => { scene.onBeforeRender = renderer => renderer.clearDepth(); return () => { scene.onBeforeRender = () => {}; }; }, [scene]);
  // One environment texture for all views: per-view maps made three.js re-derive every material's
  // shader each time the renderer switched scenes (the main CPU cost on phones).
  useFrame(() => { if (sharedEnv.current && scene.environment !== sharedEnv.current) scene.environment = sharedEnv.current; }, 0.6);
  return null;
}
const sharedEnv: { current: import("three").Texture | null } = { current: null };
/** Captures the root scene's environment (built once by <Environment> below) for the views. */
function CaptureEnv() {
  const { scene } = useThree();
  useFrame(() => { if (scene.environment && sharedEnv.current !== scene.environment) sharedEnv.current = scene.environment; }, 0.4);
  return null;
}

/** Clears the whole shared canvas each frame before the views draw (moving orbs leave no trails). */
function ClearAll() {
  const { gl } = useThree();
  useFrame(() => { gl.setScissorTest(false); gl.setClearColor("#000000", 1); gl.clear(true, true); }, 0.5);
  return null;
}

/** The shared canvas: covers the index stage, composited with screen like the per-orb canvases. */
export default function OrbStage({ live }: { live: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false), [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = host.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting)); io.observe(el);
    return () => io.disconnect();
  }, []);
  const active = live && seen;
  return <div ref={host} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", zIndex: 2 }}>
    <Canvas dpr={[1, 1.25]} frameloop={active ? (reduced ? "demand" : "always") : "never"}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      eventSource={host as unknown as RefObject<HTMLElement>} style={{ position: "absolute", inset: 0 }}>
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[3, 4, 4]} scale={[4, 2, 1]} />
        <Lightformer form="ring" intensity={4} color="#c9d8ff" position={[-4, 0, 2]} scale={3} />
        <Lightformer form="rect" intensity={1.5} color="#6f8fd0" position={[0, -4, 3]} scale={[8, 1, 1]} />
      </Environment>
      <CaptureEnv />
      <ClearAll />
      <View.Port />
    </Canvas>
  </div>;
}
