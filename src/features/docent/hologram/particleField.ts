import { BufferAttribute, BufferGeometry } from "three";
import { HOLOGRAM_GEOMETRY as G } from "./hologramConfig";

/** 결정적 난수 — 새로고침마다 분포가 달라지면 스크린샷 비교가 안 된다. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 입자 한 알의 경로. 셰이더가 t ∈ [0,1) 로 이 경로를 따라간다. */
export interface ParticlePath {
  angle: number;
  startRadius: number;
  endRadius: number;
  endY: number;
  phase: number;
  /** 1/주기(s) — 적분 시계 uFlow 에 곱한다. */
  drift: number;
  size: number;
}

/** 목 끝에서 물질화가 시작되는 높이 범위 — 입자가 여기로 "들어가" 목이 된다. */
const FUNNEL_END_Y: [number, number] = [G.collar.y - 0.006, G.neck.energyY + 0.002];

/**
 * 입자는 방향이 있는 흐름이다 — 무작위 잔여물이 아니다.
 *
 *   깔때기 (75%)   받침 조리개 둘레(넓다) → 목의 물질화 구간(좁다). 투사기가 인물을
 *                  만들어 내는 장면. 끝점은 목 안이라, 높이가 물질화 구간에 닿으면 피부가
 *                  입자를 가린다 — 입자가 목으로 "들어간다".
 *   실루엣 (25%)   턱 옆·뒤를 따라 천천히 오른다. 얼굴 앞에는 두지 않는다.
 */
export function buildParticlePaths(count: number): ParticlePath[] {
  const rand = mulberry32(0x5eed);
  const range = (min: number, max: number) => min + (max - min) * rand();
  const paths: ParticlePath[] = [];
  for (let i = 0; i < count; i += 1) {
    if (rand() < 0.75) {
      paths.push({
        angle: rand() * Math.PI * 2,
        startRadius: range(0.05, 0.09),
        endRadius: range(0.012, 0.06),
        endY: range(FUNNEL_END_Y[0], FUNNEL_END_Y[1]),
        phase: rand(),
        drift: 1 / range(5, 9),
        size: range(0.8, 1.2),
      });
    } else {
      // 뒤·옆 반원만 (z = -sin(angle)·r ≤ 작은 앞쪽 여유)
      paths.push({
        angle: range(-0.3, Math.PI + 0.3),
        startRadius: range(0.09, 0.105),
        endRadius: range(0.112, 0.13),
        endY: range(-0.03, 0.035),
        phase: rand(),
        drift: 1 / range(11, 17),
        size: range(0.6, 0.9),
      });
    }
  }
  return paths;
}

/** 경로를 버퍼로. 위치는 매 프레임 CPU 가 아니라 셰이더가 계산한다. */
export function buildParticleGeometry(count: number): BufferGeometry {
  const paths = buildParticlePaths(count);
  const position = new Float32Array(count * 3);
  const angle = new Float32Array(count);
  const startRadius = new Float32Array(count);
  const endRadius = new Float32Array(count);
  const endY = new Float32Array(count);
  const phase = new Float32Array(count);
  const drift = new Float32Array(count);
  const size = new Float32Array(count);
  paths.forEach((p, i) => {
    // position 은 바운딩용 — 실제 위치는 셰이더가 만든다(frustumCulled=false).
    position.set([0, G.floorY, 0], i * 3);
    angle[i] = p.angle;
    startRadius[i] = p.startRadius;
    endRadius[i] = p.endRadius;
    endY[i] = p.endY;
    phase[i] = p.phase;
    drift[i] = p.drift;
    size[i] = p.size;
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("aAngle", new BufferAttribute(angle, 1));
  geometry.setAttribute("aStartRadius", new BufferAttribute(startRadius, 1));
  geometry.setAttribute("aEndRadius", new BufferAttribute(endRadius, 1));
  geometry.setAttribute("aEndY", new BufferAttribute(endY, 1));
  geometry.setAttribute("aPhase", new BufferAttribute(phase, 1));
  geometry.setAttribute("aDrift", new BufferAttribute(drift, 1));
  geometry.setAttribute("aSize", new BufferAttribute(size, 1));
  return geometry;
}

/**
 * 셰이더와 같은 식으로 경로 위의 점을 CPU 에서 계산한다 — 테스트가 "얼굴 앞에
 * 입자가 없다"를 실제 궤적으로 검증할 수 있게.
 */
export function particlePointAt(p: ParticlePath, t: number): [number, number, number] {
  const ease = t * t * (3 - 2 * t);
  const y = G.floorY + 0.002 + (p.endY - G.floorY - 0.002) * t;
  const r = p.startRadius + (p.endRadius - p.startRadius) * ease;
  const a = p.angle + t * 0.35;
  const squash = 1 + (0.7 - 1) * ease;
  const x = Math.cos(a) * r;
  const z = -Math.sin(a) * r * squash + G.neck.section.centerZ * ease;
  return [x, y, z];
}
