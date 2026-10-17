/**
 * Coarse device tier for decorative 3D (project spheres, entry tunnel). Low tier keeps the same
 * composition but drops the expensive passes: transmission refraction, bloom, streak count.
 * Signals: phone-sized touch screens, CPU cores, device memory (Chromium), save-data. Evaluated once per page load.
 */
export type RenderTier = "high" | "low";
let cached: RenderTier | null = null;
export function renderTier(): RenderTier {
  if (cached) return cached;
  if (typeof navigator === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const phone = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) <= 900;
  const low = phone || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || !!nav.connection?.saveData;
  cached = low ? "low" : "high";
  return cached;
}
