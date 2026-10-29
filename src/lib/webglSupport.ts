/**
 * One WebGL2 probe per page load. Every probe is a full GL context, and browsers keep only ~16
 * alive — the page used to open one per section on load and pushed the visible canvases toward
 * forced context loss.
 */
let cached: boolean | null = null;
export function hasWebGL2(): boolean {
  if (cached !== null) return cached;
  if (typeof document === "undefined") return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    cached = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { cached = false; }
  return cached;
}
