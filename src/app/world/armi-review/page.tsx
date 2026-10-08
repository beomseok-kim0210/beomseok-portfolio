"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { createWorldRuntime } from "@/features/world/director/worldRuntime";
import { worldPositionForDomProgress } from "@/features/world/director/worldRuntime";
import { armiStages } from "@/features/world/adapters/armiChoreography";
import { ArmiRoutingOptions } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiRoutingOptions";
import { ArmiProductTransition } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiProductTransition";
const WorldCanvas = dynamic(() => import("@/features/world/runtime/WorldCanvas"), { ssr: false });

/** Static lookdev surface using the real district/controller/pipeline, no previs player. */
export default function ArmiReview() {
  const runtime = useMemo(() => {
    const state = createWorldRuntime(); state.progress.current = .5; state.armiReview.current = "RoutingHero"; return state;
  }, []);
  const [message, setMessage] = useState("Static v015 hero · no timeline playback");
  const [portrait, setPortrait] = useState(false);
  const [journey, setJourney] = useState(false);
  async function capture() {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-world-canvas]");
    if (!canvas) return;
    const response = await fetch("/api/world/armi-capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ png: canvas.toDataURL("image/png"), metrics: JSON.parse(canvas.dataset.armiMetrics ?? "{}"), portrait }) });
    setMessage(response.ok ? "Saved browser render + measured metrics" : "Capture failed");
  }
  return <main style={{ height: "100svh", overflow: "hidden", background: "#060b10", display: "flex", justifyContent: "center", alignItems: "center" }}>
    <div style={{ position: "relative", width: portrait ? "min(100vw, 88.3474576svh)" : "100%", height: portrait ? "min(100svh, 113.18945vw)" : "100%" }}>
      <WorldCanvas runtime={runtime} compact={false} active={true} video={null} onFailure={() => setMessage("WebGL/asset loading failed")}/>
      {journey && <><ArmiProductTransition runtime={runtime}/><ArmiRoutingOptions runtime={runtime}/></>}
    </div>
    <aside style={{ position: "fixed", top: 12, left: 12, color: "#bcd1dd", fontSize: 12, zIndex: 50 }}>
      <p>ARMI v015 / Runtime lookdev</p><p>{message}</p>
      <button onClick={() => setPortrait(!portrait)}>{portrait ? "Desktop framing" : "Reference framing"}</button>{" "}
      <button onClick={capture}>Save QA render</button>{" "}
      <button onClick={() => { runtime.armiReview.current = runtime.armiReview.current === "ProductOpening" ? "RoutingHero" : "ProductOpening"; }}>Hero / Product UI</button>
      <button onClick={() => { setJourney(!journey); runtime.armiReview.current = journey ? "RoutingHero" : null; runtime.publish(worldPositionForDomProgress("armi", 0), "webgl"); }}>Journey inspection</button>
      {journey && <div style={{ maxWidth: 600 }}>{armiStages.map(stage => <button key={stage.id} onClick={() => {
        const p = (stage.start + stage.end) / 2;
        runtime.publish(worldPositionForDomProgress("armi", p), "webgl"); setMessage(`${stage.title} / ${p.toFixed(3)}`);
      }}>{stage.title}</button>)}<label>ARMI local progress<input aria-label="ARMI local progress" type="number" min="0" max="1" step=".001" defaultValue="0" onChange={event => {
        const p = Number(event.target.value); runtime.publish(worldPositionForDomProgress("armi", p), "webgl"); setMessage(`ARMI progress ${p.toFixed(3)}`);
      }}/></label></div>}
    </aside>
  </main>;
}
