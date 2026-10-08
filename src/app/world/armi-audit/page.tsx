"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createWorldRuntime,worldPositionForDomProgress } from "@/features/world/director/worldRuntime";
import { ArmiAuditContext,auditLoads,type AuditVariant } from "@/features/world/audit/ArmiAuditContext";
import { ArmiRoutingOptions } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiRoutingOptions";
import { ArmiProductTransition } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiProductTransition";
const WorldCanvas=dynamic(()=>import("@/features/world/runtime/WorldCanvas"),{ssr:false});

/** Isolated experiment. Homepage continues to load the original production GLB. */
export default function ArmiAudit(){
  const [variant,setVariant]=useState<AuditVariant>("baseline"),[run,setRun]=useState(0);
  const [journey,setJourney]=useState(false);
  // Fresh runtime deliberately resets camera and metric history for each independent trial.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runtime=useMemo(()=>{const r=createWorldRuntime();r.armiReview.current="RoutingHero";return r;},[variant,run]);
  const [alternatives,setAlternatives]=useState(false),[response,setResponse]=useState(false),[stats,setStats]=useState({loads:[] as typeof auditLoads,renderer:"",instances:{}});
  useEffect(()=>{
    const off=runtime.subscribeFrame(()=>{if(runtime.progress.current>=.10)setAlternatives(true);if(runtime.progress.current>=.50)setResponse(true);});
    const timer=setInterval(()=>{const c=document.querySelector<HTMLCanvasElement>("[data-world-canvas]");const gl=c?.getContext("webgl2"),ext=gl?.getExtension("WEBGL_debug_renderer_info");setStats({loads:[...auditLoads],renderer:ext?String(gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL)):"unavailable",instances:JSON.parse(c?.dataset.auditInstances??"{}")});},1000);
    return()=>{off();clearInterval(timer);};
  },[runtime]);
  const config=useMemo(()=>({variant,alternatives,response,trial:run}),[variant,alternatives,response,run]);
  const resetTrial=()=>{auditLoads.length=0;setAlternatives(false);setResponse(false);setJourney(false);setStats({loads:[],renderer:"",instances:{}});};
  async function capture(){
    const canvas=document.querySelector<HTMLCanvasElement>("[data-world-canvas]");if(!canvas)return;
    const p=runtime.progress.current;
    const shot=runtime.armiReview.current?"hero":p<.345?"core":p<.442?"split":p<.59?"text":"response";
    await fetch("/api/world/armi-audit-capture",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:`${variant}-${shot}`,png:canvas.toDataURL("image/png"),stats,metrics:JSON.parse(canvas.dataset.armiMetrics??"{}")})});
  }
  const seek=(p:number)=>{setJourney(true);runtime.armiReview.current=null;runtime.publish(worldPositionForDomProgress("armi",p),"webgl");};
  return <main style={{height:"100svh",background:"#060b10",position:"relative",overflow:"hidden"}}>
    <ArmiAuditContext.Provider value={config}><WorldCanvas key={`${variant}-${run}`} runtime={runtime} compact={false} active video={null} onFailure={()=>{}}/></ArmiAuditContext.Provider>
    {journey&&<><ArmiProductTransition runtime={runtime}/><ArmiRoutingOptions runtime={runtime}/></>}
    <aside style={{position:"absolute",top:8,left:8,zIndex:50,color:"#fff",fontSize:12,background:"#071018db",padding:8}}>
      <label>Audit variant <select aria-label="Audit variant" value={variant} onChange={e=>{resetTrial();setVariant(e.target.value as AuditVariant);}}>{["baseline","A","B","C","D"].map(v=><option key={v}>{v}</option>)}</select></label>
      <button onClick={()=>{resetTrial();setRun(r=>r+1);}}>Remount</button>
      <button onClick={()=>{setJourney(false);runtime.armiReview.current="RoutingHero";}}>Hero</button>
      <label>Progress<input aria-label="Audit progress" type="number" min="0" max="1" step=".001" defaultValue="0" onChange={e=>seek(Number(e.target.value))}/></label>
      <button onClick={()=>{setAlternatives(true);setResponse(true);}}>Load all districts</button>
      <button onClick={capture}>Capture audit</button>
      <pre data-audit-stats style={{fontSize:10,maxWidth:520,whiteSpace:"pre-wrap"}}>{JSON.stringify(stats,null,2)}</pre>
    </aside>
  </main>;
}
