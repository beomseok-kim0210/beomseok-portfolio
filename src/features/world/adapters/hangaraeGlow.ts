import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry,
  LatheGeometry, ShaderMaterial, Vector2, Vector3, Vector4,
} from "three";

/* ── Screen-space glow segments ─────────────────────────────────────────────
 * Each segment is an instanced quad expanded in pixels, so neon lines keep a crisp
 * white core and a soft coloured falloff at any camera distance. */
const SEGMENT_VERT = /* glsl */`
attribute vec3 aA; attribute vec3 aB; attribute vec4 aColor; attribute float aWidth;
attribute vec2 corner;
uniform vec2 uRes;
varying vec4 vColor; varying float vSide; varying float vAlong; varying float vLen; varying float vW;
void main(){
  vec4 a = projectionMatrix * viewMatrix * vec4(aA, 1.);
  vec4 b = projectionMatrix * viewMatrix * vec4(aB, 1.);
  vec2 sa = a.xy / a.w * uRes * .5, sb = b.xy / b.w * uRes * .5;
  vec2 d = sb - sa; float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1., 0.); vec2 nrm = vec2(-dir.y, dir.x);
  float w = aWidth;
  vec4 base = mix(a, b, corner.x);
  vec2 off = nrm * corner.y * w + dir * (corner.x * 2. - 1.) * w;
  base.xy += off / (uRes * .5) * base.w;
  gl_Position = base;
  vColor = aColor; vSide = corner.y; vAlong = corner.x * (len + 2. * w) - w; vLen = len; vW = w;
}`;
const SEGMENT_FRAG = /* glsl */`
uniform float uCore; uniform float uGain;
varying vec4 vColor; varying float vSide; varying float vAlong; varying float vLen; varying float vW;
void main(){
  float dx = max(0., max(-vAlong, vAlong - vLen));
  float d = length(vec2(dx, vSide * vW)) / vW;
  if (d > 1.) discard;
  float core = 1. - smoothstep(uCore * .55, uCore, d);
  float glow = exp(-d * d * 5.5) * (1. - smoothstep(.8, 1., d));
  vec3 c = vColor.rgb * glow * .85 + mix(vColor.rgb, vec3(1.), .6) * core * 1.5;
  gl_FragColor = vec4(c * vColor.a * uGain, 1.);
}`;
export class GlowSegments {
  geometry: InstancedBufferGeometry; material: ShaderMaterial; capacity: number; count = 0;
  private a: Float32Array; private b: Float32Array; private color: Float32Array; private width: Float32Array;
  constructor(capacity: number, core = .22, gain = 1, depthTest = false) {
    this.capacity = capacity;
    const g = new InstancedBufferGeometry();
    g.setAttribute("corner", new BufferAttribute(new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]), 2));
    g.setAttribute("position", new BufferAttribute(new Float32Array(12), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.a = new Float32Array(capacity * 3); this.b = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 4); this.width = new Float32Array(capacity);
    g.setAttribute("aA", new InstancedBufferAttribute(this.a, 3));
    g.setAttribute("aB", new InstancedBufferAttribute(this.b, 3));
    g.setAttribute("aColor", new InstancedBufferAttribute(this.color, 4));
    g.setAttribute("aWidth", new InstancedBufferAttribute(this.width, 1));
    g.instanceCount = 0;
    this.geometry = g;
    this.material = new ShaderMaterial({
      vertexShader: SEGMENT_VERT, fragmentShader: SEGMENT_FRAG, transparent: true, depthWrite: false, depthTest,
      blending: AdditiveBlending, uniforms: { uRes: { value: new Vector2(1, 1) }, uCore: { value: core }, uGain: { value: gain } },
    });
  }
  begin() { this.count = 0; }
  push(a: Vector3, b: Vector3, c: Color | [number, number, number], alpha: number, width: number) {
    if (this.count >= this.capacity || alpha <= .002) return;
    const i = this.count++;
    this.a[i * 3] = a.x; this.a[i * 3 + 1] = a.y; this.a[i * 3 + 2] = a.z;
    this.b[i * 3] = b.x; this.b[i * 3 + 1] = b.y; this.b[i * 3 + 2] = b.z;
    const [r, g, bl] = Array.isArray(c) ? c : [c.r, c.g, c.b];
    this.color[i * 4] = r; this.color[i * 4 + 1] = g; this.color[i * 4 + 2] = bl; this.color[i * 4 + 3] = alpha;
    this.width[i] = width;
  }
  /** Polyline helper. */
  polyline(points: Vector3[], c: Color | [number, number, number], alpha: number, width: number) {
    for (let i = 0; i < points.length - 1; i++) this.push(points[i], points[i + 1], c, alpha, width);
  }
  dashed(a: Vector3, b: Vector3, c: Color | [number, number, number], alpha: number, width: number, dashes: number) {
    const t = new Vector3(), u = new Vector3();
    for (let i = 0; i < dashes; i++) { t.lerpVectors(a, b, i / dashes); u.lerpVectors(a, b, (i + .5) / dashes); this.push(t.clone(), u.clone(), c, alpha, width); }
  }
  end(width: number, height: number) {
    const g = this.geometry;
    (["aA", "aB", "aColor", "aWidth"] as const).forEach(n => { (g.getAttribute(n) as InstancedBufferAttribute).needsUpdate = true; });
    g.instanceCount = this.count;
    this.material.uniforms.uRes.value.set(width, height);
  }
  dispose() { this.geometry.dispose(); this.material.dispose(); }
}

/* ── Joint sprites ────────────────────────────────────────────────────────── */
const POINT_VERT = /* glsl */`
attribute vec4 aColor; attribute float aSize; uniform float uDpr;
varying vec4 vColor;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uDpr; vColor = aColor; }`;
const POINT_FRAG = /* glsl */`
varying vec4 vColor;
void main(){
  vec2 q = gl_PointCoord * 2. - 1.; float r = length(q); if (r > 1.) discard;
  float core = 1. - smoothstep(.16, .26, r);
  float ring = (1. - smoothstep(.0, .05, abs(r - .36))) * .45;
  float halo = exp(-r * r * 6.) * (1. - r);
  vec3 c = vColor.rgb * (halo * .75 + ring) + mix(vColor.rgb, vec3(1.), .6) * core * 1.25;
  gl_FragColor = vec4(c * vColor.a, 1.);
}`;
export class GlowPoints {
  geometry = new BufferGeometry(); material: ShaderMaterial; capacity: number; count = 0;
  private pos: Float32Array; private color: Float32Array; private size: Float32Array;
  constructor(capacity: number) {
    this.capacity = capacity;
    this.pos = new Float32Array(capacity * 3); this.color = new Float32Array(capacity * 4); this.size = new Float32Array(capacity);
    this.geometry.setAttribute("position", new BufferAttribute(this.pos, 3));
    this.geometry.setAttribute("aColor", new BufferAttribute(this.color, 4));
    this.geometry.setAttribute("aSize", new BufferAttribute(this.size, 1));
    this.material = new ShaderMaterial({ vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, uniforms: { uDpr: { value: 1 } } });
  }
  begin() { this.count = 0; }
  push(p: Vector3, c: Color | [number, number, number], alpha: number, size: number) {
    if (this.count >= this.capacity || alpha <= .002) return;
    const i = this.count++;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    const [r, g, b] = Array.isArray(c) ? c : [c.r, c.g, c.b];
    this.color[i * 4] = r; this.color[i * 4 + 1] = g; this.color[i * 4 + 2] = b; this.color[i * 4 + 3] = alpha;
    this.size[i] = size;
  }
  end(dpr: number) {
    (["position", "aColor", "aSize"] as const).forEach(n => { (this.geometry.getAttribute(n) as BufferAttribute).needsUpdate = true; });
    this.geometry.setDrawRange(0, this.count);
    this.material.uniforms.uDpr.value = dpr;
  }
  dispose() { this.geometry.dispose(); this.material.dispose(); }
}

/* ── Hologram body (marching-cubes surface in body space) ─────────────────── */
const HOLO_VERT = /* glsl */`
varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz; vL = position;
  vN = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
  // Same expression as the depth prepass (MeshBasicMaterial) so depths match exactly.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;
const HOLO_FRAG = /* glsl */`
uniform vec3 uColor; uniform vec3 uRim; uniform vec3 uColor2; uniform vec3 uRim2; uniform float uSplitY;
uniform float uAlpha; uniform float uTime; uniform vec4 uFadeY; uniform float uScanY; uniform float uScanA;
varying vec3 vN; varying vec3 vW; varying vec3 vL;
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW);
  if (!gl_FrontFacing) n = -n;
  float f = 1. - abs(dot(n, v));
  float rimT = pow(f, 2.3);
  float g = smoothstep(uSplitY - .05, uSplitY + .05, vL.y);
  vec3 col = mix(uColor2, uColor, g), rim = mix(uRim2, uRim, g);
  float scan = .92 + .08 * sin(vL.y * 140. - uTime * 1.8);
  float band = exp(-pow((vL.y - uScanY) * 22., 2.)) * uScanA;
  float a = uAlpha * smoothstep(uFadeY.x, uFadeY.y, vL.y) * (1. - smoothstep(uFadeY.z, uFadeY.w, vL.y));
  vec3 c = col * (.05 + .25 * f) * scan + rim * rimT * 1.1 + rim * band * .9;
  gl_FragColor = vec4(c * a, 1.);
}`;
export function createHoloMaterial(color: string, rim: string, color2 = color, rim2 = rim) {
  return new ShaderMaterial({
    vertexShader: HOLO_VERT, fragmentShader: HOLO_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: {
      uColor: { value: new Color(color) }, uRim: { value: new Color(rim) }, uColor2: { value: new Color(color2) }, uRim2: { value: new Color(rim2) },
      uSplitY: { value: -1e3 }, uAlpha: { value: 0 }, uTime: { value: 0 }, uFadeY: { value: new Vector4(-1e4, -9999, 1e4, 10001) }, uScanY: { value: -1e3 }, uScanA: { value: 0 },
    },
  });
}

/* ── Depth point cloud: points coloured by distance from the depth camera, revealed by its scan. */
export function createCloudMaterial() {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uAlpha: { value: 0 }, uScanY: { value: 1e3 }, uCam: { value: new Vector3() }, uNear: { value: 1 }, uFar: { value: 3 }, uDpr: { value: 1 }, uSize: { value: 2.4 } },
    vertexShader: `uniform vec3 uCam; uniform float uNear; uniform float uFar; uniform float uScanY; uniform float uDpr; uniform float uSize;
      varying float vT; varying float vVis; varying float vBand;
      void main(){ vT = clamp((distance(position, uCam) - uNear) / (uFar - uNear), 0., 1.);
        vVis = step(uScanY, position.y); vBand = exp(-pow((position.y - uScanY) * 9., 2.));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_PointSize = uSize * uDpr * (1. + vBand * 1.6); }`,
    fragmentShader: `uniform float uAlpha; varying float vT; varying float vVis; varying float vBand;
      vec3 ramp(float t){ vec3 a = vec3(1., .45, .18), b = vec3(1., .86, .32), c = vec3(.2, .86, 1.), d = vec3(.25, .3, 1.);
        return t < .33 ? mix(a, b, t / .33) : t < .66 ? mix(b, c, (t - .33) / .33) : mix(c, d, (t - .66) / .34); }
      void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r = dot(q, q); if (r > 1.) discard;
        float a = uAlpha * max(vVis, vBand) * (1. - r);
        gl_FragColor = vec4((ramp(vT) * (.7 + vBand * .8)) * a, 1.); }`,
  });
}

/* ── Assembly particles: each point flies from a scattered start to its place on the body. */
export function createAssemblyMaterial() {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uT: { value: 0 }, uAlpha: { value: 0 }, uDpr: { value: 1 }, uSize: { value: 2.2 }, uSplitY: { value: .97 } },
    vertexShader: `attribute vec3 aStart; attribute float aSeed; uniform float uT; uniform float uDpr; uniform float uSize; uniform float uSplitY;
      varying float vT; varying float vUp;
      void main(){ float d = clamp(position.y / 1.8, 0., 1.) * .45 + aSeed * .2; float t = clamp((uT - d) / .35, 0., 1.); t = t * t * (3. - 2. * t);
        vec3 p = mix(aStart, position, t); vT = t; vUp = smoothstep(uSplitY - .05, uSplitY + .05, position.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); gl_PointSize = uSize * uDpr * (1.6 - .6 * t); }`,
    fragmentShader: `uniform float uAlpha; varying float vT; varying float vUp;
      void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r = dot(q, q); if (r > 1.) discard;
        vec3 c = mix(vec3(.75, .4, 1.), vec3(.35, .85, 1.), vUp) * (1.1 + (1. - vT) * .6);
        gl_FragColor = vec4(c * uAlpha * (.25 + .75 * vT) * (1. - r), 1.); }`,
  });
}

/** Lathe profiles along +Y (0 → 1). uv.y follows the profile, used for branch cut fades. */
export function limbGeometry(taper: number, bulge = .1) {
  const pts: Vector2[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const y = i / n;
    const cap = y < .1 ? Math.sqrt(1 - ((.1 - y) / .1) ** 2) : y > .9 ? Math.sqrt(1 - ((y - .9) / .1) ** 2) : 1;
    const muscle = 1 + bulge * Math.sin(Math.min(1, y * 1.6) * Math.PI);
    pts.push(new Vector2(Math.max(.0001, (1 - (1 - taper) * y) * cap * muscle), y));
  }
  return new LatheGeometry(pts, 28);
}
export function torsoGeometry() {
  const prof: [number, number][] = [[0.001, -.04], [.62, -.02], [.80, .05], [.76, .18], [.70, .32], [.76, .48], [.88, .64], [.97, .78], [1, .88], [.86, .95], [.45, 1.0], [.30, 1.04], [.001, 1.05]];
  return new LatheGeometry(prof.map(([r, y]) => new Vector2(r, y)), 36);
}

/* ── Perspective floor grid ──────────────────────────────────────────────── */
export function createGridMaterial(color: string) {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uColor: { value: new Color(color) }, uAlpha: { value: 0 }, uCell: { value: .38 }, uCenter: { value: new Vector2() }, uRadius: { value: 4.5 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; uniform float uCell; uniform vec2 uCenter; uniform float uRadius; varying vec3 vW;
    void main(){ vec2 q = vW.xz / uCell; vec2 g = abs(fract(q - .5) - .5) / fwidth(q); float line = 1. - min(min(g.x, g.y), 1.);
      vec2 m = abs(fract(q / 5. - .5) - .5) / fwidth(q / 5.); float major = 1. - min(min(m.x, m.y), 1.);
      float r = length(vW.xz - uCenter); float fade = 1. - smoothstep(uRadius * .25, uRadius, r);
      float glow = exp(-r * r * .35) * .10;
      gl_FragColor = vec4(uColor * (line * .55 + major * .7 + glow) * fade * uAlpha, 1.); }`,
  });
}

/** Radial glow disc (plate pressure, depth focus). */
export function createDiscMaterial(color: string) {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uColor: { value: new Color(color) }, uAlpha: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; uniform float uTime; varying vec2 vUv;
    void main(){ float r = length(vUv - .5) * 2.; if (r > 1.) discard; float core = exp(-r * r * 6.);
      float ring = (1. - smoothstep(0., .06, abs(r - fract(uTime * .45) * .95))) * (1. - r) * .8;
      gl_FragColor = vec4(uColor * (core * 1.2 + ring) * uAlpha, 1.); }`,
  });
}
