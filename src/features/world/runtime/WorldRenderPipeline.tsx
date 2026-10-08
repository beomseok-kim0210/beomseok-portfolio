"use client";
import { useContext, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AgXToneMapping, ACESFilmicToneMapping, Color, Fog, Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { sampleArmiLookdev } from "../adapters/armiRuntime";
import { armiLook } from "../adapters/armiV015";
import type { WorldRuntime } from "../director/worldRuntime";
import { createArmiRoutingOptions, isArmiOptionsVisible } from "../adapters/armiRoutingOptions";
import { armiStage, armiMotionWindows, local } from "../adapters/armiChoreography";
import { routingCue } from "../adapters/armiRoutingCue";
import { ArmiAuditContext,auditDomainCounters } from "../audit/ArmiAuditContext";

export function WorldRenderPipeline({ runtime, compact }: { runtime: WorldRuntime; compact: boolean }) {
  const { gl, scene, camera, size } = useThree();
  const audit=useContext(ArmiAuditContext);
  const measuredShot=useRef("");
  const options = useMemo(() => createArmiRoutingOptions(), []);
  useEffect(() => () => options.dispose(), [options]);
  const timing = useRef({ seconds: 0, frames: 0, fps: 0, samples: [] as number[] });
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.renderTarget1.samples = 4; composer.renderTarget2.samples = 4;
    const bloom = new UnrealBloomPass(new Vector2(1, 1), armiLook.bloomStrength, armiLook.bloomRadius, armiLook.bloomThreshold);
    const render = new RenderPass(scene, camera);
    const geometry = { calls: 0, triangles: 0 };
    const submit = render.render.bind(render);
    render.render = (...args: Parameters<typeof render.render>) => {
      submit(...args);
      geometry.calls = gl.info.render.calls; geometry.triangles = gl.info.render.triangles;
    };
    composer.addPass(render); composer.addPass(bloom); composer.addPass(new OutputPass());
    return { composer, bloom, geometry, fog: new Fog("#060b10", armiLook.fogNear, armiLook.fogFar), background: new Color("#060b10") };
  }, [gl, scene, camera]);
  useEffect(() => {
    pipeline.composer.setPixelRatio(compact ? 1 : Math.min(gl.getPixelRatio(), 1.5));
    pipeline.composer.setSize(size.width, size.height);
  }, [pipeline, size.width, size.height, compact, gl]);
  useEffect(() => () => { pipeline.composer.passes.forEach(pass => pass.dispose()); pipeline.composer.dispose(); }, [pipeline]);
  // Exactly one final render owner. Camera samples have already been applied at -1.
  useFrame((_, delta) => {
    const chamber = !!runtime.armiAsset.current;
    const intent = sampleArmiLookdev(runtime.progress.current, compact);
    gl.info.autoReset = false; gl.info.reset();
    if (chamber) {
      gl.toneMapping = AgXToneMapping; gl.toneMappingExposure = armiLook.exposure;
      scene.background = pipeline.background; scene.fog = pipeline.fog;
      pipeline.bloom.strength = armiLook.bloomStrength;
      pipeline.bloom.threshold = armiLook.bloomThreshold;
      pipeline.bloom.radius = armiLook.bloomRadius;
      camera.layers.set(0);
      if (!runtime.armiReview.current && isArmiOptionsVisible(runtime.progress.current)) {
        const blend = routingCue(runtime.progress.current).blend;
        if (blend < 1) pipeline.composer.render();
        options.render(gl, scene, runtime.armiAsset.current!, runtime.progress.current, size.width, size.height, blend);
        pipeline.geometry.calls = gl.info.render.calls; pipeline.geometry.triangles = gl.info.render.triangles;
      } else {
      pipeline.composer.render();
      // Product screen is unlit and rendered after bloom/output. No scene tone-map.
      const previousAutoClear = gl.autoClear;
      const previousBackground = scene.background;
      scene.background = null;
      gl.autoClear = false; gl.clearDepth(); camera.layers.set(2);
      gl.render(scene, camera);
      scene.background = previousBackground;
      camera.layers.set(0); gl.autoClear = previousAutoClear;
      }
    } else {
      gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1;
      scene.fog = new Fog("#060b10", intent.fogNear, intent.fogFar);
      if (intent.direct) gl.render(scene, camera);
      else { pipeline.bloom.strength = intent.bloomStrength; pipeline.composer.render(); }
    }
    const timer = timing.current;
    const shot=runtime.armiReview.current ?? armiStage(runtime.progress.current).id;
    if(audit&&measuredShot.current!==shot){measuredShot.current=shot;timer.seconds=0;timer.frames=0;timer.samples=[];}
    timer.seconds += delta; timer.frames++;
    if (timer.seconds >= 2) {
      timer.fps = Math.round(timer.frames / timer.seconds * 10) / 10;
      timer.samples ??= [];
      timer.samples.push(timer.fps); if (timer.samples.length > 6) timer.samples.shift();
      timer.seconds = 0; timer.frames = 0;
      gl.domElement.dataset.armiMetrics = JSON.stringify({
        loaded: !!runtime.armiAsset.current, cameraOwner: "WorldCameraController",
        shot,
        progress: runtime.progress.current,
        clipTimes: armiMotionWindows.map(w => ({ clip: w.clip, localProgress: local(runtime.progress.current, w.start, w.end) })),
        camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray() },
        geometryDrawCalls: pipeline.geometry.calls, geometryTriangles: pipeline.geometry.triangles,
        ...(audit?{drawCallsByDomain:auditDomainCounters.get(gl)}:{}),
        totalDrawCalls: gl.info.render.calls, totalTriangles: gl.info.render.triangles,
        fps: timer.fps, fpsSamples: timer.samples,
        fpsAverage: Math.round(timer.samples.reduce((sum, value) => sum + value, 0) / timer.samples.length * 10) / 10,
        viewport: [size.width, size.height], dpr: gl.getPixelRatio(),
        semanticGroups: [...(runtime.armiAsset.current?.groups.keys() ?? [])],
        availableClips: runtime.armiAsset.current?.clips.map(clip => clip.name), playingClips: 0,
      });
    }
  }, 1);
  return null;
}
