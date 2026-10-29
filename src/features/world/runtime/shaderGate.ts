import { BufferGeometry, Mesh, OrthographicCamera, PlaneGeometry, PMREMGenerator, Scene, type Camera, type Material, type Object3D, type WebGLRenderer, type WebGLRenderTarget } from "three";

/*
 * Shader compiles without frozen frames.
 * compileAsync lets the driver build programs off the main thread (KHR_parallel_shader_compile).
 * But in Chrome any synchronous GL query (three's first-use program checks) waits for the GPU
 * process to drain its queue, so a query issued while other programs are still compiling stalls
 * the page for as long as those take (~0.5s for a PMREM blur on D3D). Hence: every compile goes
 * through compileOffThread, and first use of new programs waits for whenCompiled().
 */
type Mats = Material | Material[] | undefined;
const each = (m: Mats, visit: (x: Material) => void) => { if (Array.isArray(m)) m.forEach(visit); else if (m) visit(m); };

/** Opt-in diagnostics: set window.__gateDebug = [] to collect compile rounds and ceiling hits. */
type GateLog = { __gateDebug?: unknown[] };
const inFlight = new WeakMap<WebGLRenderer, Set<Promise<unknown>>>();
type Program = { isReady(): boolean; getUniforms(): unknown; getAttributes(): unknown };
type ProgramProps = { properties: { get(m: Material): { currentProgram?: Program } } };
/** Programs compiling on the driver at once. Chrome's GPU process compiles WebGL and its own page
 *  painting (Skia) shaders on one worker pool: 33 atelier programs at once (0.2–0.5s each on D3D)
 *  left the page's paint shaders waiting 1.3s — the whole page froze, not just the 3D view. */
const IN_FLIGHT_PROGRAMS = 6;
const queues = new WeakMap<WebGLRenderer, Promise<void>>();
type Renderable = Object3D & { isMesh?: boolean; isPoints?: boolean; isLine?: boolean; isSprite?: boolean; isLight?: boolean };
const topScene = (o: Object3D): Object3D => { let n = o; while (n.parent) n = n.parent; return n; };
/**
 * Like three's compileAsync, for an offscreen (`target`) or screen (null) draw — the program key
 * differs (tone mapping) — but:
 *  - never hangs: compileAsync throws inside its poll (and never resolves) when a material is
 *    disposed mid-compile, which a district hand-off does. A material without a program counts as
 *    done, and a 4s ceiling per batch covers anything else;
 *  - feeds the driver at most IN_FLIGHT_PROGRAMS new programs at a time, one compile queue per renderer;
 *  - does each program's first use once ready (three's uniform/attribute lookup, a synchronous
 *    query): done later on a busy GPU it waited ~0.3s per program — e.g. objects first drawn by
 *    the wedding mirror's reflection pass, outside the main camera.
 */
export function compileOffThread(gl: WebGLRenderer, root: Object3D, camera: Camera, target: WebGLRenderTarget | null, targetScene?: Scene): Promise<void> {
  let set = inFlight.get(gl); if (!set) inFlight.set(gl, set = new Set());
  const props = (gl as unknown as ProgramProps).properties;
  const ready = (m: Material) => { try { return props.get(m).currentProgram?.isReady() ?? true; } catch { return true; /* disposed: done */ } };
  const run = async () => {
    const owner = (targetScene ?? topScene(root)) as Scene;
    // Lights, fog and environment come from the owning scene; one stand-in holds them so compiling
    // object by object does not re-walk the whole district for its lights each time.
    const lights = new Scene(), objects: Renderable[] = [];
    lights.fog = owner.fog ?? null; lights.environment = owner.environment ?? null; lights.environmentIntensity = owner.environmentIntensity ?? 1;
    owner.traverseVisible?.(o => { if ((o as Renderable).isLight) lights.children.push(o); });
    root.traverse(o => { const r = o as Renderable; if ((r.isMesh || r.isPoints || r.isLine || r.isSprite) && (o as Mesh).material) objects.push(r); });
    const all: Material[] = [];
    const program = (m: Material) => { try { return props.get(m).currentProgram; } catch { return undefined; } };
    for (let i = 0; i < objects.length;) {
      // Counted per program, not per material: many materials share one program.
      const waiting = new Set<Program>(), previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      while (i < objects.length && waiting.size < IN_FLIGHT_PROGRAMS) {
        let mats: Set<Material>;
        try { mats = gl.compile(objects[i++], camera, lights) as Set<Material>; } catch { mats = new Set(); }
        for (const m of mats) { all.push(m); const p = program(m); if (p && !ready(m)) waiting.add(p); }
      }
      gl.setRenderTarget(previous);
      const started = performance.now();
      while (waiting.size && performance.now() - started < 4000) {
        await new Promise(r => window.setTimeout(r, 10));
        for (const p of waiting) { let done = true; try { done = p.isReady(); } catch { /* destroyed */ } if (done) waiting.delete(p); }
      }
      if (waiting.size) (window as GateLog).__gateDebug?.push({ ceiling: waiting.size });
    }
    lights.children.length = 0; // borrowed, never reparented
    for (const m of all) { try { const p = props.get(m).currentProgram; if (p?.isReady()) { p.getUniforms(); p.getAttributes(); } } catch { /* disposed */ } }
  };
  const done = (queues.get(gl) ?? Promise.resolve()).then(run, run);
  queues.set(gl, done.catch(() => undefined));
  set.add(done); void done.then(() => set.delete(done));
  return done;
}
/** Resolves once no compile issued through compileOffThread is pending on this renderer. */
export async function whenCompiled(gl: WebGLRenderer): Promise<void> {
  const set = inFlight.get(gl);
  while (set && set.size) await Promise.all([...set]);
}

/**
 * Draw a scene only once every visible material has a compiled program; the canvas keeps its last
 * frame meanwhile, so a district or a GLB entering view no longer freezes scrolling. A material is
 * "known" per fog/environment/version and the visible light set (three builds one program per
 * light count: ARMI's 14 rect-area lights make a shader the D3D compiler needs ~2.4s for, and a
 * light toggled during the hand-off to Hangarae re-keyed every lit material unseen).
 */
export function createShaderGate() {
  const known = new WeakMap<Material, string>(), churn = new WeakMap<Material, number>();
  let pending = false;
  let lights = "";
  const sig = (scene: Scene, m: Material) => `${scene.fog ? 1 : 0}:${scene.environment?.uuid ?? ""}:${lights}:${m.version}`;
  return {
    /** True when the frame may be drawn; otherwise starts (or awaits) a compile and calls onReady when done. */
    ready(gl: WebGLRenderer, scene: Scene, camera: Camera, onReady: () => void, target: WebGLRenderTarget | null = null): boolean {
      if (pending) return false;
      const fresh: [Material, string][] = [], count: Record<string, number> = {};
      scene.traverseVisible(o => { if ((o as { isLight?: boolean }).isLight) { const k = o.type + (o.castShadow ? "s" : ""); count[k] = (count[k] ?? 0) + 1; } });
      lights = Object.entries(count).sort().map(([k, n]) => k + n).join(",");
      scene.traverseVisible(o => each((o as Mesh).material, m => { const s = sig(scene, m); if (known.get(m) !== s) fresh.push([m, s]); }));
      if (!fresh.length) return true;
      // Districts settle over a few frames (new kit, the environment bake re-keying every lit
      // material, swapped-in extras), so new or re-keyed materials always compile first. Only a
      // material that has re-keyed three times already is drawn as it is: one that changes every
      // frame must never stall the view.
      if (fresh.every(([m]) => (churn.get(m) ?? 0) >= 3)) { for (const [m, s] of fresh) known.set(m, s); return true; }
      pending = true;
      for (const [m] of fresh) if (known.has(m)) churn.set(m, (churn.get(m) ?? 0) + 1);
      const started = performance.now(), was0 = known.get(fresh[0][0]) ?? "";
      // Known per the state they were compiled for, not the state when the compile finishes.
      void compileOffThread(gl, scene, camera, target).then(() => whenCompiled(gl)).then(() => {
        for (const [m, s] of fresh) known.set(m, s); pending = false; onReady();
        (window as GateLog).__gateDebug?.push({ fresh: fresh.length, ms: Math.round(performance.now() - started), y: Math.round(scrollY), was: was0, now: fresh[0][1] });
      });
      return false;
    },
  };
}

/** Compile fullscreen-pass materials (bloom, AO, output) ahead of their first composer.render(). */
export function precompilePasses(gl: WebGLRenderer, camera: Camera, passes: object[], target: WebGLRenderTarget | null) {
  const scene = new Scene(), quad = new PlaneGeometry(2, 2), seen = new Set<Material>();
  const add = (m: unknown) => { if (m && (m as Material).isMaterial && !seen.has(m as Material)) { seen.add(m as Material); scene.add(new Mesh(quad, m as Material)); } };
  for (const pass of passes) for (const value of Object.values(pass)) { if (Array.isArray(value)) value.forEach(add); else add(value); }
  return compileOffThread(gl, scene, camera, target).then(() => quad.dispose());
}

/**
 * PMREM (environment lighting) builds its blur/GGX programs synchronously — for RoomEnvironment
 * and for every <Environment> cube map — at ~0.5s each on D3D. Compile them off-thread once per
 * renderer and size; the generator is kept so its programs stay cached (three's own cube-map
 * conversion then reuses them). Use it for fromScene once whenCompiled(), never dispose it.
 */
type PmremInternals = { _setSize(size: number): void; _allocateTargets(): WebGLRenderTarget; compileCubemapShader(): void; _blurMaterial: Material; _ggxMaterial?: Material & { uniforms: { envMap: { value: unknown } } }; _cubemapMaterial: Material | null; _lodMeshes: Mesh[] };
const pmremCache = new WeakMap<WebGLRenderer, Map<number, Promise<PMREMGenerator>>>();
export function warmPMREM(gl: WebGLRenderer, size = 256): Promise<PMREMGenerator> {
  let bySize = pmremCache.get(gl); if (!bySize) pmremCache.set(gl, bySize = new Map());
  const cached = bySize.get(size); if (cached) return cached;
  const pmrem = new PMREMGenerator(gl), internal = pmrem as unknown as PmremInternals;
  internal._setSize(size);
  const target = internal._allocateTargets(); // same HalfFloat targets PMREM renders into
  internal.compileCubemapShader();
  // Same geometry and bound textures as PMREM's own draws, so the program keys match.
  if (internal._ggxMaterial) internal._ggxMaterial.uniforms.envMap.value = target.texture;
  const scene = new Scene(), geometry = internal._lodMeshes[0]?.geometry ?? new BufferGeometry();
  for (const m of [internal._blurMaterial, internal._ggxMaterial, internal._cubemapMaterial]) if (m) scene.add(new Mesh(geometry, m));
  const done = compileOffThread(gl, scene, new OrthographicCamera(), target).then(() => { target.dispose(); return pmrem; });
  bySize.set(size, done);
  return done;
}

/**
 * Production renderers skip three's per-program error checks: each is a synchronous GL query
 * that waits for the GPU process (lazy D3D compiles on first draw), a 0.2–0.5s hitch per program
 * while scrolling. Development keeps them for shader error logs.
 */
export function tuneRenderer(gl: WebGLRenderer) {
  gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
}
