"use client";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Component, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { createWorldRuntime } from "../director/worldRuntime";
import type { WorldRenderMode } from "../types/contracts";
const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });
export interface WorldSurface {
  element: HTMLElement; video: HTMLVideoElement | null; active: boolean; mode: WorldRenderMode; onFailure: () => void;
}
const WorldContext = createContext<{
  runtime: ReturnType<typeof createWorldRuntime>; setSurface: (surface: WorldSurface | null, districtId?: string) => void;
} | null>(null);
class WorldBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export function WorldHost({ children }: { children: ReactNode }) {
  const runtime = useMemo(createWorldRuntime, []);
  const [surfaces, updateSurfaces] = useState<Record<string,WorldSurface>>({});
  const [districtId, setDistrictId] = useState("armi");
  const [container,setContainer] = useState<HTMLDivElement|null>(null);
  const setSurface=useCallback((surface:WorldSurface|null,id="armi")=>updateSurfaces(previous=>{const next={...previous};if(surface)next[id]=surface;else delete next[id];return next;}),[]);
  const surface=surfaces[districtId];
  useEffect(()=>{const element=document.createElement("div");element.style.cssText="position:absolute;inset:0";setContainer(element);return()=>element.remove();},[]);
  useEffect(()=>{const sync=()=>setDistrictId(runtime.state.current.districtId??"armi");sync();return runtime.subscribeSemantic(sync);},[runtime]);
  // Move the portal container, retaining one Canvas/renderer across district handoff.
  useLayoutEffect(()=>{if(container&&surface?.element)surface.element.appendChild(container);},[container,surface?.element]);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!surface?.element) return;
    const element = surface.element;
    const measure = () => setCompact(element.getBoundingClientRect().width <= 700);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [surface?.element]);
  const context = useMemo(() => ({ runtime, setSurface }), [runtime,setSurface]);
  return <WorldContext.Provider value={context}>
    {children}
    {container && surface?.mode === "webgl" && createPortal(<WorldBoundary onFailure={surface.onFailure}>
      <WorldCanvas runtime={runtime} districtId={districtId} video={surface.video} active={surface.active} compact={compact} onFailure={surface.onFailure}/>
    </WorldBoundary>, container)}
  </WorldContext.Provider>;
}
export function useWorldHost() {
  const context = useContext(WorldContext);
  if (!context) throw new Error("A district requires Home WorldHost");
  return context;
}
