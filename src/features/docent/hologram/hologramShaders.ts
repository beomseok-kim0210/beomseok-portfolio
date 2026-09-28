/**
 * 홀로그램 GLSL 을 한 곳에 모은다. JSX 안에 문자열을 흩어 두면 같은 노이즈·스캔
 * 계산이 파일마다 조금씩 달라진다.
 *
 * 모든 투사 재질은 가산 혼합 + depthWrite false 다. 가산은 순서와 무관하므로
 * 투명 정렬 실패가 생기지 않고, depthTest 는 켜 두어 머리가 뒤쪽 층을 가린다.
 * 출력은 tonemapping/colorspace 청크를 거쳐 표준 재질과 같은 색 공간에 선다.
 */

const NOISE = /* glsl */ `
float holoHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float holoNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = holoHash(i);
  float b = holoHash(i + vec2(1.0, 0.0));
  float c = holoHash(i + vec2(0.0, 1.0));
  float d = holoHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

/** 세로로 한 번에 하나만 지나가는 넓은 스캔 밴드. 보는 순간 "스캔라인"이라고 읽히면 실패다. */
const SCAN = /* glsl */ `
float holoScanBand(float worldY, float time, float speed) {
  float s = sin(worldY * 17.0 - time * speed * 6.2831);
  return smoothstep(0.94, 1.0, s);
}
`;

const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const SURFACE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vWorldY;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldY = world.y;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const projectionCylinderVertex = SURFACE_VERTEX;

/**
 * 투사 원통 — 벽이 아니라 빛을 가둔 광학장. 윤곽(프레넬) 위주로만 읽히고,
 * 기본 알파는 거의 0이다. V2 는 윤곽 알파가 0.34 라 양옆이 아크릴 커튼처럼 섰다.
 * 아주 약한 간섭 무늬(<2%)가 완벽한 좌우 대칭을 깬다 — 줄무늬로 보이면 과하다.
 * uDetail = 0 (모바일) 이면 프레넬 윤곽만 남는다.
 */
export const projectionCylinderFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uScanSpeed;
uniform float uNoiseStrength;
uniform float uDetail;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vWorldY;
${NOISE}
${SCAN}
void main() {
  float facing = abs(dot(normalize(vNormalW), normalize(vViewDir)));
  float fresnel = pow(1.0 - facing, 3.2);
  float verticalFade = smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.55, 0.98, vUv.y));
  float fine = 0.5 + 0.5 * sin(vWorldY * 1400.0);
  float band = holoScanBand(vWorldY, uTime, uScanSpeed);
  float interference = sin(vUv.y * 80.0 + holoNoise(vUv * 6.0 + uTime * 0.03) * 3.0);
  float n = holoNoise(vec2(vUv.x * 18.0, vWorldY * 24.0 + uTime * 0.12));
  float alpha = 0.004
    + fresnel * 0.1
    // interference only rides the fresnel edge: on the near-transparent center it read as
    // horizontal banding across the whole chamber (measured in the browser, pass 4)
    + uDetail * (fresnel * fine * 0.018 + band * (0.004 + fresnel * 0.05) + interference * fresnel * 0.015);
  alpha *= verticalFade * (1.0 + (n - 0.5) * uNoiseStrength * 0.6) * uIntensity;
  vec3 color = mix(uColor, uColor2, fresnel * 0.4);
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  ${OUTPUT}
}
`;

export const projectionBeamVertex = SURFACE_VERTEX;

/**
 * 투사 빔 — 조리개에서 목으로 벌어지는 깔때기 모양의 빛. 투사기와 아바타를 잇는 매질이다.
 *   조리개 → 목 끝   가장 강하다
 *   목 끝 → 턱선     약해진다
 *   턱선 위          거의 없다 (얼굴은 씻기지 않는다)
 * 뒷면은 머리 뒤에서 기둥을 그리고, 앞면은 목 끝 아래(얼굴과 겹치지 않는 틈)에서만 그린다.
 * 반경 감쇠는 시선과 면의 각(가운데가 두껍게 보이는 부피 착시), 노이즈는 10% 미만.
 */
export const projectionBeamFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uBeam;
uniform float uNoiseStrength;
uniform float uPulse;
uniform float uFloorY;
uniform float uStrongY;
uniform float uFadeY;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vWorldY;
${NOISE}
void main() {
  float y = vWorldY;
  float facing = abs(dot(normalize(vNormalW), normalize(vViewDir)));
  float radial = smoothstep(0.05, 0.9, facing);
  float rise = smoothstep(uFloorY, uFloorY + 0.003, y);
  float vertical = rise * (1.0 - smoothstep(uStrongY, uFadeY, y));
  // front faces cross in front of the head: only the gap below the neck end may use them
  float frontMask = gl_FrontFacing ? (1.0 - smoothstep(uStrongY - 0.004, uStrongY + 0.002, y)) : 1.0;
  float n = holoNoise(vec2(vUv.x * 9.0, y * 60.0 - uTime * 0.15));
  float noise = 1.0 + (n - 0.5) * 0.16 * uNoiseStrength;
  // hotter near the aperture: the light visibly leaves the projector
  float heat = 1.0 - smoothstep(uFloorY, uStrongY, y);
  // measured: at 0.22 the gap only rose ~0.1 luma over the chamber floor - no visible column
  float alpha = radial * vertical * frontMask * noise * (0.42 + 0.3 * heat) * (1.0 + uPulse);
  vec3 color = mix(uColor, uColor2, heat * 0.4);
  gl_FragColor = vec4(color, clamp(alpha * uBeam * uIntensity, 0.0, 1.0));
  ${OUTPUT}
}
`;

export const softQuadVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * 이미터 코어 — 평평한 원판이 아니라 방사형 셰이더 디스크.
 * 가운데 흰-청, 중간 시안, 가장자리 투명. 맥동은 2–4%.
 */
export const emitterCoreFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uCore;
uniform float uPulse;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.0, 1.0, d);
  vec3 color = mix(uColor, uColor2, 1.0 - smoothstep(0.0, 0.55, d));
  float pulse = 1.0 + uPulse * sin(uTime * 1.3);
  float alpha = core * core * 0.95 * uCore * pulse;
  gl_FragColor = vec4(color, clamp(alpha * uIntensity, 0.0, 1.0));
  ${OUTPUT}
}
`;

/** 원형 소프트 디스크 — 후광과 국소 글로우(블룸 대체)가 같이 쓴다. */
export const softGlowFragment = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uBreath;
uniform float uInner;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float d = distance(vUv, vec2(0.5));
  float glow = 1.0 - smoothstep(uInner, 0.5, d);
  glow *= glow;
  float breath = 1.0 + uBreath * sin(uTime * 0.6);
  gl_FragColor = vec4(uColor, clamp(glow * uAlpha * breath, 0.0, 1.0));
  ${OUTPUT}
}
`;

/**
 * 진단 조각 — 세로 선 하나(왼쪽 가장자리)와 작은 눈금 하나. 텍스트·데이터 없음.
 * 전체 불투명도 3–6% 범위.
 */
export const diagnosticFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float spine = smoothstep(0.06, 0.0, abs(vUv.x - 0.08));
  float tick = smoothstep(0.012, 0.0, abs(vUv.y - 0.62)) * step(0.08, vUv.x) * step(vUv.x, 0.42);
  float fill = 0.012;
  float fade = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
  float alpha = (fill + spine * 0.045 + tick * 0.06) * fade;
  gl_FragColor = vec4(uColor, clamp(alpha * uIntensity, 0.0, 1.0));
  ${OUTPUT}
}
`;

/**
 * 입자 — 받침에서 목으로 흐르는 깔때기. 위치는 CPU 가 아니라 셰이더가 적분 시계로
 * 계산한다(버퍼를 매 프레임 올리지 않는다). 경로 식은 particleField.particlePointAt 와 같다.
 * 아래에서 크고 밝게(에너지), 위에서 작고 가늘게(데이터) — 목에 닿으면 사라진다(고체).
 */
export const particleVertex = /* glsl */ `
attribute float aAngle;
attribute float aStartRadius;
attribute float aEndRadius;
attribute float aEndY;
attribute float aPhase;
attribute float aDrift;
attribute float aSize;
uniform float uFlow; // integrated drift clock: phase stays continuous when speed changes
uniform float uPixelRatio;
uniform float uFloorY;
uniform float uNeckCenterZ;
varying float vAlpha;
varying float vT;
void main() {
  float t = fract(aPhase + uFlow * aDrift);
  float ease = t * t * (3.0 - 2.0 * t);
  float y = mix(uFloorY + 0.002, aEndY, t);
  float r = mix(aStartRadius, aEndRadius, ease);
  float a = aAngle + t * 0.35;
  vec3 p = vec3(cos(a) * r, y, -sin(a) * r * mix(1.0, 0.7, ease) + uNeckCenterZ * ease);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = mix(2.4, 0.8, t) * aSize * uPixelRatio * (0.7 / -mv.z);
  vAlpha = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.72, 1.0, t));
  vT = t;
  gl_Position = projectionMatrix * mv;
}
`;

export const particleFragment = /* glsl */ `
uniform float uIntensity;
uniform float uParticles;
uniform vec3 uColor;
uniform vec3 uColor2;
varying float vAlpha;
varying float vT;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  // cold white energy near the emitter -> projection cyan as it becomes the avatar
  vec3 color = mix(uColor2, uColor, smoothstep(0.1, 0.8, vT));
  float bright = mix(1.0, 0.7, vT);
  gl_FragColor = vec4(color, a * a * vAlpha * bright * uParticles * uIntensity);
  ${OUTPUT}
}
`;

/**
 * 아바타 재질 주입 — 목의 3단 물질화.
 *   A 고체 (y > solidY)          한 픽셀도 바뀌지 않는다
 *   B 물질화 (solidY → energyY)  얇은 스캔 행 분리 + 드문 픽셀 분해, 색이 투사광 쪽으로
 *   C 에너지 (energyY → goneY)   행 간격이 벌어지고 분해가 지배, goneY 아래는 전부 버린다
 * 행 높이는 렌더 픽셀 기준(uHoloUnitsPerPx)이라 사이드 패널·전체 화면·모바일에서
 * 같은 굵기로 보인다. discard 만 쓰므로 재질은 불투명 그대로 — 투명 정렬 문제가 없다.
 */
export const neckDissolveVertexDecl = /* glsl */ `
uniform vec4 uHoloYRow; // y row of mesh -> head-space matrix
varying float vHoloHeadY;
`;

// head space, not world: the idle bob/pitch must not move the dissolve boundary
export const neckDissolveVertexBody = /* glsl */ `
vHoloHeadY = dot(uHoloYRow, vec4(transformed, 1.0));
`;

export const neckDissolveFragmentDecl = /* glsl */ `
uniform float uHoloTime;
uniform float uHoloSolidY;
uniform float uHoloEnergyY;
uniform float uHoloGoneY;
uniform float uHoloUnitsPerPx; // head units per device pixel, vertical
uniform vec3 uHoloColor;
uniform vec3 uHoloColor2;
varying float vHoloHeadY;
float holoHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

/** 조명 계산 전에 버린다. */
export const neckDissolveFragmentDiscard = /* glsl */ `
float holoY = vHoloHeadY;
float holoB = clamp((uHoloSolidY - holoY) / (uHoloSolidY - uHoloEnergyY), 0.0, 1.0);
float holoC = clamp((uHoloEnergyY - holoY) / (uHoloEnergyY - uHoloGoneY), 0.0, 1.0);
float holoT = 0.5 * holoB + 0.5 * holoC;
// scan rows ~3.5 device px tall, drifting slowly upward (toward the face)
float holoRowCoord = holoY / (uHoloUnitsPerPx * 3.5) - uHoloTime * 0.35;
float holoRow = fract(holoRowCoord);
float holoRowAA = fwidth(holoRowCoord);
// gap share of each row: thin separations in B, most of the row in C
float holoGap = holoB * 0.22 + holoC * 0.68;
// a gap thinner than one pixel only shimmers: open it once it spans >= 1 px
holoGap *= step(holoRowAA, holoGap);
// sparse high-frequency breakup: rare in B, dominant at the end of C
float holoP = holoB * holoB * 0.06 + holoC * holoC * 0.94;
float holoN = holoHash12(floor(gl_FragCoord.xy));
if (holoY < uHoloSolidY && (holoRow < holoGap || holoN < holoP || holoY < uHoloGoneY)) discard;
`;

/** 최종 색 — 사라질수록 피부가 투사광으로 바뀌고, 행 틈 바로 위가 빛난다. */
export const neckDissolveFragmentEdge = /* glsl */ `
if (holoY < uHoloSolidY) {
  float holoTint = smoothstep(0.0, 1.0, holoT);
  float holoEdge = (1.0 - smoothstep(holoGap, holoGap + 2.0 * holoRowAA, holoRow)) * step(0.0001, holoGap);
  vec3 holoBase = gl_FragColor.rgb;
  // toward LIGHT, not toward dim cyan: a darker energy zone reads as a gap = a cut
  vec3 holoLight = holoBase * 0.35 + mix(uHoloColor, uHoloColor2, 0.35) * 0.75;
  gl_FragColor.rgb = mix(holoBase, holoLight, holoTint * 0.9);
  gl_FragColor.rgb += uHoloColor2 * holoEdge * (0.12 + 0.38 * holoC);
}
`;

const LOCAL_VERTEX = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
  vUv = uv;
  vLocal = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const collarVertex = LOCAL_VERTEX;

/**
 * 칼라 외피 — 목 끝을 감싸는 짧은 타원 원통(단위 높이, 스케일로 크기를 준다).
 * 목 끝 높이에 가우시안으로 모이고 위로만 꼬리가 올라간다(빛이 위로 뿜어진다).
 * 각도 맥동은 7% — 도는 게 보이면 로딩 아이콘이 된다.
 */
export const collarSheathFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uCenter; // 0..1 along the sheath height
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec3 vLocal;
varying vec3 vNormalW;
varying vec3 vViewDir;
${NOISE}
void main() {
  float v = vLocal.y + 0.5;
  float d = v - uCenter;
  // a volume of light, not an outline: no fresnel rim (a rim reads as a ring over the cut)
  float core = exp(-pow(d / 0.2, 2.0));
  float plume = d > 0.0 ? exp(-d * 3.2) * 0.55 : 0.0;
  // lower lobe reaches past the mesh end by a few px so AA can never expose the last row
  float below = d < 0.0 ? exp(-pow(d / 0.22, 2.0)) : 1.0;
  float profile = max(core, plume) * below;
  // fade the sides so the sheath never shows a hard vertical edge
  float side = 1.0 - smoothstep(0.55, 1.0, abs(vLocal.x));
  float angle = atan(vLocal.z, vLocal.x);
  float pulse = 1.0 + 0.07 * sin(angle * 3.0 - uTime * 0.4);
  float n = holoNoise(vec2(angle * 4.0, v * 6.0 - uTime * 0.2));
  // with the beam carrying the light below, the collar only needs to meet it: brighter
  // than this and it becomes a glowing saucer that "covers" the cut instead of dissolving it
  float alpha = profile * side * pulse * (0.9 + 0.2 * n) * 0.3;
  vec3 color = mix(uColor, uColor2, core * 0.3);
  gl_FragColor = vec4(color, clamp(alpha * uIntensity, 0.0, 1.0));
  ${OUTPUT}
}
`;

/** 칼라 링 — 앞쪽 호가 뒤쪽보다 밝아 머리가 링 "안"에 선다. */
export const collarRingFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uCenterZ;
uniform float uRadiusZ;
uniform vec3 uColor2;
varying vec3 vLocal;
void main() {
  float front = clamp((vLocal.z - uCenterZ) / uRadiusZ * 0.5 + 0.5, 0.0, 1.0);
  float angle = atan(vLocal.z - uCenterZ, vLocal.x);
  float pulse = 1.0 + 0.06 * sin(angle * 3.0 - uTime * 0.4);
  // structure, not a highlight: a bright ring here reads as "the neck sits behind a ring"
  float alpha = (0.06 + 0.16 * front) * pulse;
  gl_FragColor = vec4(uColor2, clamp(alpha * uIntensity, 0.0, 1.0));
  ${OUTPUT}
}
`;

/**
 * 앞쪽 가림 띠 — 목 끝 바로 앞에 선 얇은 빛 띠. 세로 가우시안, 가로는 목 폭에서 빠진다.
 * 장식이 아니라 형상이 끝나는 마지막 몇 픽셀을 물리적으로 덮는 용도다.
 */
export const occlusionBandFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
uniform vec3 uColor2;
varying vec2 vUv;
${NOISE}
void main() {
  float x = abs(vUv.x - 0.5) * 2.0;
  float horizontal = 1.0 - smoothstep(0.45, 1.0, x);
  float vertical = exp(-pow((vUv.y - 0.5) / 0.2, 2.0));
  float n = holoNoise(vec2(vUv.x * 14.0 + uTime * 0.04, vUv.y * 3.0 - uTime * 0.1));
  float alpha = horizontal * vertical * (0.3 + 0.08 * n);
  vec3 color = mix(uColor, uColor2, vertical * 0.3);
  gl_FragColor = vec4(color, clamp(alpha * uIntensity, 0.0, 1.0));
  ${OUTPUT}
}
`;
