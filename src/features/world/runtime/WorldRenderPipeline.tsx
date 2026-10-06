"use client";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Fog, Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { sampleArmiLookdev } from "../adapters/armiRuntime";
import type { WorldRuntime } from "../director/worldRuntime";

export function WorldRenderPipeline({ runtime, compact }: { runtime: WorldRuntime; compact: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl);
    const bloom = new UnrealBloomPass(new Vector2(1, 1), .35, .4, .85);
    composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());
    return { composer, bloom };
  }, [gl, scene, camera]);
  useEffect(() => {
    pipeline.composer.setPixelRatio(compact ? 1 : Math.min(gl.getPixelRatio(), 1.5));
    pipeline.composer.setSize(size.width, size.height);
  }, [pipeline, size.width, size.height, compact, gl]);
  useEffect(() => () => { pipeline.composer.passes.forEach(pass => pass.dispose()); pipeline.composer.dispose(); }, [pipeline]);
  // V1 fog was applied before district callbacks. Retain that ordering.
  useFrame(() => {
    const intent = sampleArmiLookdev(runtime.progress.current, compact);
    if (scene.fog instanceof Fog) { scene.fog.near = intent.fogNear; scene.fog.far = intent.fogFar; }
  }, -1);
  // Positive priority disables R3F's default render. Exactly one final path.
  useFrame(() => {
    const intent = sampleArmiLookdev(runtime.progress.current, compact);
    if (intent.direct) gl.render(scene, camera);
    else { pipeline.bloom.strength = intent.bloomStrength; pipeline.composer.render(); }
  }, 1);
  return null;
}
