"use client";
import { useEffect, useState } from "react";

/**
 * Device pixels a full-screen 3D canvas may draw per frame. The districts (shadows, AO, reflections,
 * bloom, MSAA) cost per pixel: at 2560×1440 and 150% scaling the world canvas drew ~8.3M pixels (4K)
 * and the gallery fell to ~15fps on a GTX 1060. Capped near 1080p; smaller screens keep their own
 * ratio up to `max`.
 */
const PIXEL_BUDGET = 2.1e6;
export const budgetDpr = (max: number) => typeof window === "undefined" ? 1
  : Math.max(.5, Math.min(window.devicePixelRatio || 1, max, Math.sqrt(PIXEL_BUDGET / (window.innerWidth * window.innerHeight))));
export function useBudgetDpr(max: number) {
  const [dpr, setDpr] = useState(() => budgetDpr(max));
  useEffect(() => { const sync = () => setDpr(budgetDpr(max)); sync(); window.addEventListener("resize", sync); return () => window.removeEventListener("resize", sync); }, [max]);
  return dpr;
}
