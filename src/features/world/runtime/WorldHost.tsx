"use client";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Component, createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWorldRuntime } from "../director/worldRuntime";
import type { WorldRenderMode } from "../types/contracts";
const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });
export interface WorldSurface {
  element: HTMLElement; video: HTMLVideoElement | null; active: boolean; mode: WorldRenderMode; onFailure: () => void;
}
const WorldContext = createContext<{
  runtime: ReturnType<typeof createWorldRuntime>; setSurface: (surface: WorldSurface | null) => void;
} | null>(null);
class WorldBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export function WorldHost({ children }: { children: ReactNode }) {
  const runtime = useMemo(createWorldRuntime, []);
  const [surface, setSurface] = useState<WorldSurface | null>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (!surface?.element) return;
    const element = surface.element;
    const measure = () => setCompact(element.getBoundingClientRect().width <= 700);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [surface?.element]);
  const context = useMemo(() => ({ runtime, setSurface }), [runtime]);
  return <WorldContext.Provider value={context}>
    {children}
    {surface?.mode === "webgl" && createPortal(<WorldBoundary onFailure={surface.onFailure}>
      <WorldCanvas runtime={runtime} video={surface.video} active={surface.active} compact={compact} onFailure={surface.onFailure}/>
    </WorldBoundary>, surface.element)}
  </WorldContext.Provider>;
}
export function useWorldHost() {
  const context = useContext(WorldContext);
  if (!context) throw new Error("A district requires Home WorldHost");
  return context;
}
