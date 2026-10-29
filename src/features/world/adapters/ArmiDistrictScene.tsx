"use client";
import { Suspense, useContext, useEffect, useMemo, useState } from "react";
import { reportWorldReady } from "../runtime/journeyGeometry";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Color, FileLoader, Mesh, PerspectiveCamera, WebGLCubeRenderTarget, type Texture } from "three";
import { compileOffThread, warmPMREM, whenCompiled } from "../runtime/shaderGate";
import { overviewParts, projectOverviewAnchors } from "./armiOverview";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import type { Group } from "three";
import { armiV015Base, armiLook, createArmiLightRig, prepareArmiV015, type ArmiManifest } from "./armiV015";
import type { WorldRuntime } from "../director/worldRuntime";
import { ArmiTabletPortal } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiTabletPortal";
import { ArmiVoiceSignal } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiVoiceSignal";
import { createArmiMotion } from "./armiChoreography";
import { createArmiSelectedRoute } from "./armiSelectedRoute";
import { createArmiRoutingDecision } from "./armiRoutingDecision";
import { createArmiRequestFlow } from "./armiRequestFlow";
import { createArmiRoutingCue } from "./armiRoutingCue";
import { ArmiAuditContext, AuditGLTFLoader, configureAuditLoader, createAuditInstances, createAuditDrawCounter } from "../audit/ArmiAuditContext";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";

function AuditLateAsset({url,onLoad}:{url:string;onLoad:(asset:GLTF)=>void}){
  const gltf=useLoader(AuditGLTFLoader,url,configureAuditLoader);
  useEffect(()=>onLoad(gltf),[gltf,onLoad]);return null;
}

export function ArmiDistrictScene({ runtime, compact, video }: { runtime: WorldRuntime; compact: boolean; video: HTMLVideoElement | null }) {
  const { gl, scene, invalidate, camera, size } = useThree();
  const audit=useContext(ArmiAuditContext);
  const auditEnabled=!!audit;
  const [alternatives,setAlternatives]=useState<GLTF|null>(null),[response,setResponse]=useState<GLTF|null>(null);
  const baseUrl=audit ? audit.variant==="baseline" ? `${armiV015Base}/ARMI_v015_Web.glb` : `/models/armi/audit/${audit.variant==="D"?"D_initial":audit.variant}.glb` : `${armiV015Base}/ARMI_v015_Web_Clean.glb`;
  const url=baseUrl+(audit?`?trial=${audit.trial}`:"");
  const gltf = useLoader(audit?AuditGLTFLoader:GLTFLoader, url, loader => {
    loader.setDRACOLoader(new DRACOLoader().setDecoderPath(`${armiV015Base}/decoder/`).setWorkerLimit(2));
  });
  const manifestText = useLoader(FileLoader, `${armiV015Base}/runtime-manifest.json`);
  const routeGltf = useLoader(GLTFLoader, "/models/armi/v016/ARMI_v016_TextRoute.glb");
  const ingressGltf = useLoader(GLTFLoader, "/models/armi/v017/ARMI_v017_BoxIngress.glb");
  const asset = useMemo(() => {
    const root=clone(gltf.scene) as Group;
    if(audit?.variant==="D")for(const [late,names]of [[alternatives,["Memory","Tavily","Robot"]],[response,["Response","Product"]]] as const){
      if(late)for(const name of names){const target=root.getObjectByName(name)!,source=late.scene.getObjectByName(name)!;target.clear();for(const child of [...source.children])target.add(clone(child));}
    }
    return prepareArmiV015(root,gltf.animations,JSON.parse(manifestText as string) as ArmiManifest);
  }, [gltf, manifestText, audit?.variant,alternatives,response]);
  const rig = useMemo(() => {
    RectAreaLightUniformsLib.init();
    const r = createArmiLightRig(asset.manifest);
    // The pipeline renders the chamber (layer 0) and then the product screen (layer 2). Lights only on
    // layer 0 made the light set differ between those passes, which bumped three's light-state version
    // twice a frame and forced a shader re-check on every lit material each frame. Same lights on both
    // layers keep it stable (the product screen is unlit, so the picture does not change).
    r.traverse(o => { if ((o as import("three").Light).isLight) o.layers.enable(2); });
    return r;
  }, [asset]);
  // Same for lights shipped inside the chamber asset itself.
  useEffect(() => { asset.root.traverse(o => { if ((o as import("three").Light).isLight) o.layers.enable(2); }); }, [asset]);
  const alternateLights = useMemo(() => ["V008-MemoryGold", "V008-SearchBlue", "V008-RobotGold", "V008-RobotFront"].map(name => {
    const light = rig.getObjectByName(`Runtime-${name}`) as import("three").RectAreaLight;
    return { light, intensity: light.intensity };
  }), [rig]);
  const decision = useMemo(() => createArmiRoutingDecision(asset), [asset]);
  const routingCue = useMemo(() => createArmiRoutingCue(asset), [asset]);
  useEffect(() => () => routingCue.dispose(), [routingCue]);
  useEffect(() => () => decision.dispose(), [decision]);
  const motion = useMemo(() => createArmiMotion(asset), [asset]);
  const selectedRoute = useMemo(() => createArmiSelectedRoute(asset, clone(routeGltf.scene) as Group), [asset, routeGltf]);
  const requestFlow = useMemo(() => createArmiRequestFlow(asset, clone(ingressGltf.scene) as Group), [asset, ingressGltf]);
  const instances=useMemo(()=>audit?.variant==="B"?createAuditInstances(asset):null,[asset,audit?.variant]);
  const counter=useMemo(()=>auditEnabled?createAuditDrawCounter([asset.root,selectedRoute.group,requestFlow.group,...(instances?.objects??[])],gl):null,[auditEnabled,asset,gl,selectedRoute,requestFlow,instances]);
  useEffect(()=>()=>counter?.dispose(),[counter]);
  useEffect(()=>()=>instances?.dispose(),[instances]);
  useEffect(() => () => requestFlow.dispose(), [requestFlow]);
  useEffect(() => () => selectedRoute.dispose(), [selectedRoute]);
  useEffect(() => () => motion.dispose(), [motion]);
  useEffect(() => {
    runtime.armiAsset.current = asset; invalidate();
    requestAnimationFrame(() => reportWorldReady()); // first frame with the chamber is about to draw
    return () => { runtime.armiAsset.current = null; };
  }, [asset, runtime, invalidate]);
  useEffect(() => {
    const room = new RoomEnvironment();
    const reflectionTint = new Color(.62, .8, 1);
    const reflectionColors = new Set<Color>();
    room.traverse(object => {
      if (object instanceof Mesh) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if ("color" in material && material.color instanceof Color && !reflectionColors.has(material.color)) {
            material.color.multiply(reflectionTint); reflectionColors.add(material.color);
          }
        }
      }
    });
    // The room's and PMREM's shaders compile off the main thread first (offscreen targets, as PMREM
    // draws them); fromScene then only renders and blurs — it was a ~0.7s freeze on Hero.
    const previous = scene.environment, previousIntensity = scene.environmentIntensity;
    let alive = true, target: { texture: Texture; dispose: () => void } | null = null;
    const probe = new WebGLCubeRenderTarget(1);
    const compiled = compileOffThread(gl, room, new PerspectiveCamera(90, 1, .1, 100), probe);
    // The shared, pre-warmed generator: its blur/GGX programs are already compiled (see warmPMREM).
    Promise.all([compiled, warmPMREM(gl, 256)]).then(async ([, pmrem]) => {
      await whenCompiled(gl);
      probe.dispose();
      if (!alive) { room.dispose(); return; }
      target = pmrem.fromScene(room, .03);
      scene.environment = target.texture; scene.environmentIntensity = armiLook.environmentIntensity;
      invalidate(); room.dispose();
    });
    return () => { alive = false; scene.environment = previous; scene.environmentIntensity = previousIntensity; target?.dispose(); };
  }, [gl, scene, invalidate]);
  useFrame(() => {
    counter?.reset();
    const chamber = true;
    // Overview hold: the introduced destination loops its authored demo inside the magnified view.
    const ov = runtime.armiOverview.current;
    const focus = ov >= 0 && !runtime.armiReview.current ? { group: overviewParts[Math.min(3, Math.floor(ov * 4))].id, t: (performance.now() / 1000 % 3.2) / 3.2 } : undefined;
    if (!runtime.armiReview.current) motion.sample(runtime.progress.current, focus);
    selectedRoute.sample(runtime.armiReview.current ? 0 : runtime.progress.current, requestFlow.textTrackProgress(camera as import("three").PerspectiveCamera,runtime.armiReview.current ? 0 : runtime.progress.current));
    requestFlow.sample(runtime.armiReview.current ? 0 : runtime.progress.current, camera as import("three").PerspectiveCamera);
    const selection = runtime.armiReview.current ? 0 : Math.max(0, Math.min(1, (runtime.progress.current - .402) / .01));
    for (const { light, intensity } of alternateLights) light.intensity = intensity * (1 - selection * .8);
    decision.sample(runtime.armiReview.current ? 0 : runtime.progress.current);
    routingCue.sample(runtime.armiReview.current ? 0 : runtime.progress.current);
    asset.root.visible = chamber; rig.visible = chamber;
    const product = runtime.armiReview.current?.startsWith("Product") ?? false;
    rig.getObjectByName("ARMI_ChamberLighting")!.visible = !product;
    rig.getObjectByName("ARMI_ProductLighting")!.visible = product;
    const legacy = scene.getObjectByName("ARMI_LegacyProductEntry");
    if (legacy) legacy.visible = !chamber;
    instances?.sample();
    // Overview hold: fit a screen-space ring to each destination's focal objects.
    if (runtime.armiOverview.current >= 0) runtime.armiAnchors.current = projectOverviewAnchors(asset, camera, size.width, size.height);
    if(audit){gl.domElement.dataset.auditInstances=JSON.stringify({batches:instances?.count??0,sources:instances?.sources??0});}
  });
  return <>
    {audit?.variant==="D"&&audit.alternatives&&<Suspense fallback={null}><AuditLateAsset url={`/models/armi/audit/D_alternatives.glb?trial=${audit.trial}`} onLoad={setAlternatives}/></Suspense>}
    {audit?.variant==="D"&&audit.response&&<Suspense fallback={null}><AuditLateAsset url={`/models/armi/audit/D_response.glb?trial=${audit.trial}`} onLoad={setResponse}/></Suspense>}
    <primitive object={asset.root} dispose={null}/>
    <primitive object={rig}/>
    <primitive object={selectedRoute.group} dispose={null}/>
    <primitive object={requestFlow.group} dispose={null}/>
    <group name="ARMI_LegacyProductEntry">
      <ArmiTabletPortal progress={runtime.progress} video={video}/>
      <ArmiVoiceSignal progress={runtime.progress} compact={compact}/>
    </group>
  </>;
}
