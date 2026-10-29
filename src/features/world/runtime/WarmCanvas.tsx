"use client";
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { WebGLRenderTarget, type Object3D } from "three";
import type { RefObject } from "react";
import { compileOffThread, precompilePasses, warmPMREM, whenCompiled } from "./shaderGate";

/**
 * Readies a small decorative canvas (index orbs, entry tunnel) while it is still off screen:
 * shaders compile off the main thread, then one real frame is drawn in an idle slot, so the
 * environment bake and the driver's first-draw work never land on a scroll. Mount it inside the
 * same Suspense as the content; keep the canvas on frameloop "never" until onWarm.
 * `scene.userData.warmPasses = [offscreenPasses, screenPasses]` adds a composer's passes;
 * `envSize` warms the PMREM of an <Environment resolution={envSize}> (it bakes on first frame).
 */
export function WarmCanvas({ onWarm, envSize }: { onWarm: () => void; envSize?: number }) {
  const { gl, scene, camera } = useThree(), advance = useThree(s => s.advance);
  useEffect(() => {
    let alive = true;
    const target = new WebGLRenderTarget(1, 1), passes = scene.userData.warmPasses as object[][] | undefined;
    void (async () => {
      // PMREM first: compiling the scene converts the environment cube map, which must find its programs ready.
      if (envSize) { await warmPMREM(gl, envSize); await whenCompiled(gl); }
      if (!alive) return;
      await Promise.all([compileOffThread(gl, scene, camera, passes ? target : null), ...(passes ? [precompilePasses(gl, camera, passes[0], target), precompilePasses(gl, camera, passes[1], null)] : [])]);
      await whenCompiled(gl);
      target.dispose(); if (!alive) return;
      await new Promise<void>(done => (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 50)))(() => done()));
      if (!alive) return;
      advance(performance.now());
      onWarm();
    })();
    return () => { alive = false; };
  }, [gl, scene, camera, advance, envSize, onWarm]);
  return null;
}

/**
 * True once everything already in the scene has compiled off the main thread (offscreen variant,
 * as the composer draws it). Gate render-to-texture extras on it: drei's MeshReflectorMaterial
 * re-renders the whole scene in its own frame callback, ahead of the shader gate, and so compiled
 * a fresh district synchronously (2–3s frozen on entering the atelier and the gallery).
 */
export function useSceneCompiled(active = true) {
  const { gl, scene, camera } = useThree();
  const [compiled, setCompiled] = useState(false);
  // Re-run whenever `active` turns on: the scene's state then (e.g. a fabric gone transparent, which
  // three draws in two single-sided passes) is what the extra pass will draw first.
  useEffect(() => {
    setCompiled(false);
    if (!active) return;
    let alive = true, raf = 0;
    // Two frames: the district's kit is attached and <Environment> has baked by then.
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => {
      const target = new WebGLRenderTarget(1, 1);
      void compileOffThread(gl, scene, camera, target).then(() => whenCompiled(gl)).then(() => { target.dispose(); if (alive) setCompiled(true); });
    }); });
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [gl, scene, camera, active]);
  return compiled && active;
}

/**
 * Readies a district mounted hidden ahead of time (`root` is its invisible wrapper): compile its
 * materials off the main thread, then draw it once into a tiny offscreen target. Compiling alone
 * is not enough on D3D — the driver builds the real GPU shader on first draw, which froze the page
 * for ~2.5s when the district took over. Same renderer and same instance, so nothing repeats then.
 */
export function PredrawStandby({ root }: { root: RefObject<Object3D | null> }) {
  const { gl, camera } = useThree();
  useEffect(() => {
    let alive = true, raf = 0;
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => {
      const node = root.current; if (!node) return;
      const target = new WebGLRenderTarget(8, 8);
      void compileOffThread(gl, node, camera, target).then(() => whenCompiled(gl)).then(() => {
        const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 50));
        idle(() => {
          if (alive && root.current) {
            const previous = gl.getRenderTarget(), wasVisible = node.visible;
            node.visible = true; gl.setRenderTarget(target); gl.render(node, camera);
            gl.setRenderTarget(previous); node.visible = wasVisible;
          }
          target.dispose();
        });
      });
    }); });
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [gl, camera, root]);
  return null;
}
