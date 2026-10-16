"use client";
import { useContext, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AgXToneMapping, ACESFilmicToneMapping, NeutralToneMapping, NoToneMapping, Color, Fog, PerspectiveCamera, Vector2, Vector4 } from "three";
import { overviewInset, placeArmiDestinationCamera } from "../adapters/armiOverview";
import { docentOverlayPx } from "@/features/docent/docentOverlay";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
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
    // 2× MSAA on the HDR targets: edges stay clean at a third of the 4× fill cost.
    composer.renderTarget1.samples = 2; composer.renderTarget2.samples = 2;
    const bloom = new UnrealBloomPass(new Vector2(1, 1), armiLook.bloomStrength, armiLook.bloomRadius, armiLook.bloomThreshold);
    const render = new RenderPass(scene, camera);
    const geometry = { calls: 0, triangles: 0 };
    const submit = render.render.bind(render);
    render.render = (...args: Parameters<typeof render.render>) => {
      submit(...args);
      geometry.calls = gl.info.render.calls; geometry.triangles = gl.info.render.triangles;
    };
    // Ambient occlusion grounds the bright atelier (contact shading); enabled only there.
    const gtao = new GTAOPass(scene, camera, 512, 512);
    gtao.enabled = false; gtao.blendIntensity = .85;
    gtao.updateGtaoMaterial({ radius: .32, distanceExponent: 1.6, thickness: 1.2, scale: 1.1, samples: 12 });
    composer.addPass(render); composer.addPass(gtao); composer.addPass(bloom); composer.addPass(new OutputPass());
    return { composer, bloom, gtao, geometry, insetCamera: new PerspectiveCamera(60, 1, .08, 1000), fog: new Fog("#060b10", armiLook.fogNear, armiLook.fogFar), weddingFog: new Fog("#e6e0d6", 12, 28), background: new Color("#060b10") };
  }, [gl, scene, camera]);
  useEffect(() => {
    pipeline.composer.setPixelRatio(compact ? 1 : Math.min(gl.getPixelRatio(), 1.5));
    pipeline.composer.setSize(size.width, size.height);
  }, [pipeline, size.width, size.height, compact, gl]);
  useEffect(() => () => { pipeline.composer.passes.forEach(pass => pass.dispose()); pipeline.composer.dispose(); }, [pipeline]);
  // Exactly one final render owner. Camera samples have already been applied at -1.
  useFrame((_, delta) => {
    if(runtime.state.current.districtId === "wedding") {
      // Bright atelier: Khronos neutral tone mapping keeps ivory ivory; a whisper of bloom for satin highlights.
      gl.info.autoReset=false;gl.info.reset();gl.toneMapping=NeutralToneMapping;gl.toneMappingExposure=.96;
      if(scene.background instanceof Color)scene.background.set("#e6e0d6"); else scene.background=new Color("#e6e0d6");
      scene.fog=pipeline.weddingFog;camera.layers.set(0);
      const {strength,threshold,radius}=pipeline.bloom;
      pipeline.bloom.enabled=!compact;pipeline.bloom.strength=.08;pipeline.bloom.threshold=.92;pipeline.bloom.radius=.5;
      pipeline.gtao.enabled=!compact;
      pipeline.composer.render();
      pipeline.gtao.enabled=false;
      pipeline.bloom.strength=strength;pipeline.bloom.threshold=threshold;pipeline.bloom.radius=radius;
      gl.domElement.dataset.weddingMetrics=JSON.stringify({progress:runtime.weddingProgress.current,calls:gl.info.render.calls,triangles:gl.info.render.triangles,frameMs:delta*1000});
      return;
    }
    if(runtime.state.current.districtId === "hangarae") {
      gl.info.autoReset=false;gl.info.reset();gl.toneMapping=NoToneMapping;gl.toneMappingExposure=1;
      if(scene.background instanceof Color)scene.background.set("#040a16");
      else scene.background=new Color("#040a16");
      scene.fog=null;camera.layers.set(0);
      // Neon glow: HDR bloom over values >1 only, so the camera photo stays clean.
      const {strength,threshold,radius}=pipeline.bloom;
      pipeline.bloom.enabled=true; pipeline.bloom.strength=compact?.2:.24;pipeline.bloom.threshold=1;pipeline.bloom.radius=.38;
      pipeline.composer.render();
      pipeline.bloom.strength=strength;pipeline.bloom.threshold=threshold;pipeline.bloom.radius=radius;
      gl.domElement.dataset.hangaraeMetrics=JSON.stringify({progress:runtime.hangaraeProgress.current,cameraOwner:"WorldCameraController",renderOwner:"WorldRenderPipeline",calls:gl.info.render.calls,triangles:gl.info.render.triangles,frameMs:delta*1000,viewport:[size.width,size.height],dpr:gl.getPixelRatio(),camera:camera.position.toArray()});
      return;
    }
    const chamber = !!runtime.armiAsset.current;
    const intent = sampleArmiLookdev(runtime.progress.current, compact);
    gl.info.autoReset = false; gl.info.reset();
    if (chamber) {
      gl.toneMapping = AgXToneMapping; gl.toneMappingExposure = armiLook.exposure;
      scene.background = pipeline.background; scene.fog = pipeline.fog;
      pipeline.bloom.strength = armiLook.bloomStrength;
      // ARMI's authored bloom (.025) is below visibility; skip the full-res blur chain instead of paying for it.
      pipeline.bloom.enabled = armiLook.bloomStrength >= .05;
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
      // Overview hold: the introduced destination, magnified live into the inset rect the DOM frames.
      const ov = runtime.armiOverview.current, asset = runtime.armiAsset.current;
      if (ov >= 0 && asset && !runtime.armiReview.current) {
        const inset = overviewInset(ov, runtime.armiAnchors.current, size.width, size.height, size.width - docentOverlayPx());
        if (inset && inset.grow > .03 && inset.w > 8 && inset.h > 8) {
          const pad = 3, x = inset.x + pad, w = inset.w - pad * 2, h = inset.h - pad * 2, y = size.height - inset.y - inset.h + pad;
          placeArmiDestinationCamera(asset, inset.part.cam, pipeline.insetCamera, w / h);
          const vp = gl.getViewport(new Vector4()), sc = gl.getScissor(new Vector4()), scTest = gl.getScissorTest(), ac = gl.autoClear;
          gl.setScissorTest(true); gl.setViewport(x, y, w, h); gl.setScissor(x, y, w, h);
          gl.autoClear = false; gl.setClearColor(0x060e16, 1); gl.clear(true, true, false);
          gl.render(scene, pipeline.insetCamera);
          gl.setViewport(vp); gl.setScissor(sc); gl.setScissorTest(scTest); gl.autoClear = ac;
        }
      }
    } else {
      gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1;
      scene.fog = new Fog("#060b10", intent.fogNear, intent.fogFar);
      if (intent.direct) gl.render(scene, camera);
      else { pipeline.bloom.enabled = true; pipeline.bloom.strength = intent.bloomStrength; pipeline.composer.render(); }
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
