"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Group } from "three";
import { HOLOGRAM_PALETTE as P } from "./hologramConfig";
import { diagnosticFragment, softQuadVertex } from "./hologramShaders";
import type { HologramUniforms } from "./hologramUniforms";

interface ArcSpec {
  y: number;
  radius: number;
  /** 호 길이(rad). */
  arc: number;
  /** 뒤쪽 반원 기준으로 양옆으로 더 감기는 각(rad). */
  wrap: number;
  opacity: number;
  /** 고정 기울기 [x, z] — 완벽한 수평 원이면 HUD 처럼 평면에 붙어 보인다. */
  tilt: [number, number];
  /** rad/s. 부호가 반대면 서로 엇갈린다. */
  sway: number;
}

/**
 * 호는 두 개뿐 — 머리 뒤 하나, 목 전환부 하나. 둘 다 앞쪽이 열려 있어 얼굴 앞을
 * 가로지르지 않는다(V2 의 목 호는 입 높이 앞을 지나 얼굴을 갈랐다). 목 앞은 칼라가 맡는다.
 * 굵기 1–2px, 밝은 네온이 아니라 옅은 선.
 */
const ARCS: ArcSpec[] = [
  { y: 0.118, radius: 0.172, arc: Math.PI + 0.6, wrap: 0.3, opacity: 0.22, tilt: [0.05, -0.03], sway: 0.05 },
  { y: -0.06, radius: 0.15, arc: Math.PI + 0.9, wrap: 0.45, opacity: 0.26, tilt: [-0.06, 0.04], sway: -0.04 },
];

function Arc({ spec, reduced }: { spec: ArcSpec; reduced: boolean }) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current || reduced) return;
    // 계속 도는 대신 좁게 흔들린다 — 방문자가 움직임을 거의 알아채지 못할 속도.
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * spec.sway) * 0.35;
  });
  return (
    <group position={[0, spec.y, 0]} rotation={[spec.tilt[0], 0, spec.tilt[1]]}>
      <group ref={group}>
        <mesh rotation={[-Math.PI / 2, 0, -spec.wrap]}>
          <torusGeometry args={[spec.radius, 0.0004, 6, 160, spec.arc]} />
          <meshBasicMaterial
            color={P.primary}
            transparent
            opacity={spec.opacity}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export function TechnicalArcs({ reduced }: { reduced: boolean }) {
  return (
    <group name="technical-arcs">
      {ARCS.map((spec) => (
        <Arc key={`${spec.y}:${spec.radius}`} spec={spec} reduced={reduced} />
      ))}
    </group>
  );
}

/**
 * 비대칭 요소 하나 — 오른쪽 목 뒤의 세로 진단 조각. 선 하나, 눈금 하나, 텍스트 없음.
 * 완벽한 좌우 대칭을 깨고 머리 뒤 공간의 깊이를 잡아 준다. 불투명도 3–6%.
 */
export function DiagnosticFragment({ uniforms, reduced }: { uniforms: HologramUniforms; reduced: boolean }) {
  const group = useRef<Group>(null);
  const material = useMemo(
    () => ({
      uniforms: {
        uTime: uniforms.uTime,
        uIntensity: uniforms.uIntensity,
        uColor: { value: new Color(P.primary) },
      },
      vertexShader: softQuadVertex,
      fragmentShader: diagnosticFragment,
    }),
    [uniforms],
  );
  useFrame((state) => {
    if (!group.current || reduced) return;
    group.current.position.y = -0.028 + Math.sin(state.clock.elapsedTime * 0.35) * 0.0015;
  });
  return (
    <group name="diagnostic-fragment" ref={group} position={[0.132, -0.028, -0.075]} rotation={[0, -0.62, 0]}>
      <mesh renderOrder={1}>
        <planeGeometry args={[0.028, 0.078]} />
        <shaderMaterial args={[material]} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  );
}
