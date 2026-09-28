"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  DoubleSide,
  type MeshStandardMaterial,
} from "three";
import { HOLOGRAM_GEOMETRY as G, HOLOGRAM_PALETTE as P } from "./hologramConfig";
import { emitterCoreFragment, softQuadVertex } from "./hologramShaders";
import type { HologramUniforms } from "./hologramUniforms";
import { SoftGlow } from "./SoftGlow";

const FLAT = -Math.PI / 2;

/**
 * 투사기 받침 — 빛나는 링 묶음이 아니라 어두운 기계 덩어리 + 조리개 하나.
 *
 *   A 하우징     거친 금속 원통(metalness 0.55, roughness 0.65). 빛을 받는 불투명 층.
 *   A 상단 립    하우징보다 한 톤 밝은 짧은 원통 + 발광 없는 모서리 — 키 라이트에 윤곽이 선다.
 *   A 윗판       무광 고리판. 우물 둘레만 덮는다.
 *   B 우물       윗판보다 0.005 파인 어두운 원통 — 코어가 그늘 속에 앉아 깊이가 생긴다.
 *   C 보조 링    흐리고 두껍다.
 *   B 주 조리개  가장 밝고 얇다.
 *   B 코어       방사형 셰이더 디스크 + 작은 국소 글로우(블룸 대체).
 *
 * 시각적으로 빛나는 링은 조리개와 보조 링 둘뿐이다 — V2 는 비슷한 밝기의 링이
 * 4–5개라 레이더/과녁으로 읽혔고, 뒤쪽 테두리가 목 끝과 같은 행에 걸렸다.
 */
export function ProjectionBase({ uniforms }: { uniforms: HologramUniforms }) {
  const aperture = useRef<MeshStandardMaterial>(null);
  const secondary = useRef<MeshStandardMaterial>(null);
  const lip = useRef<MeshStandardMaterial>(null);
  const coreGlow = useRef({ value: 0.28 });

  const top = G.floorY;
  const wellFloor = top - G.well.depth;

  const coreMaterial = useMemo(
    () => ({
      uniforms: {
        uTime: uniforms.uTime,
        uIntensity: uniforms.uIntensity,
        uCore: uniforms.uCore,
        uPulse: uniforms.uPulse,
        uColor: uniforms.uColor,
        uColor2: uniforms.uColor2,
      },
      vertexShader: softQuadVertex,
      fragmentShader: emitterCoreFragment,
    }),
    [uniforms],
  );

  useFrame(() => {
    const t = uniforms.uTime.value;
    const wave = 1 + Math.sin(t * 1.3) * uniforms.uPulse.value;
    const intensity = uniforms.uIntensity.value;
    const core = uniforms.uCore.value;
    if (aperture.current) aperture.current.emissiveIntensity = 1.25 * intensity * core * wave;
    if (secondary.current) secondary.current.emissiveIntensity = 0.28 * intensity;
    // 실패 상태의 호박색은 립에만. 평소 립은 발광이 없다.
    if (lip.current) lip.current.emissiveIntensity = 0.55 * uniforms.uAccentAmount.value;
    coreGlow.current.value = 0.28 * intensity * core * wave;
  });

  return (
    <group name="projection-base">
      {/* A 하우징 — 윗면은 판이 덮으므로 열어 둔다 */}
      <mesh position={[0, top - 0.004 - G.housingHeight / 2, 0]}>
        <cylinderGeometry args={[G.baseRadius, G.baseRadius + 0.008, G.housingHeight, 72, 1, true]} />
        <meshStandardMaterial color={P.housing} metalness={0.55} roughness={0.65} />
      </mesh>
      {/* A 상단 립 — 하우징 위 한 단, 발광 없는 모서리가 키 라이트를 받는다 */}
      <mesh position={[0, top - 0.002, 0]}>
        <cylinderGeometry args={[G.baseRadius - 0.001, G.baseRadius, 0.004, 72, 1, true]} />
        <meshStandardMaterial
          ref={lip}
          color={P.lip}
          metalness={0.6}
          roughness={0.5}
          emissive={P.amber}
          emissiveIntensity={0}
        />
      </mesh>
      {/* A 윗판 — 우물 둘레의 고리판 */}
      <mesh position={[0, top, 0]} rotation={[FLAT, 0, 0]}>
        <ringGeometry args={[G.well.radius, G.baseRadius - 0.001, 96]} />
        <meshStandardMaterial color={P.plate} metalness={0.45} roughness={0.75} side={DoubleSide} />
      </mesh>
      {/* B 우물 벽 — 안쪽 면만 */}
      <mesh position={[0, top - G.well.depth / 2, 0]}>
        <cylinderGeometry args={[G.well.radius, G.well.radius, G.well.depth, 72, 1, true]} />
        <meshStandardMaterial color={P.well} metalness={0.4} roughness={0.8} side={BackSide} />
      </mesh>
      {/* B 우물 바닥 */}
      <mesh position={[0, wellFloor, 0]} rotation={[FLAT, 0, 0]}>
        <circleGeometry args={[G.well.radius, 72]} />
        <meshStandardMaterial color={P.well} metalness={0.4} roughness={0.8} />
      </mesh>
      {/* C 보조 링 — 흐리고 두껍다 */}
      <mesh position={[0, wellFloor + 0.0004, 0]} rotation={[FLAT, 0, 0]}>
        <ringGeometry args={[G.secondaryRing.inner, G.secondaryRing.outer, 96]} />
        <meshStandardMaterial ref={secondary} color="#000000" emissive={P.primary} toneMapped={false} />
      </mesh>
      {/* B 주 조리개 — 가장 밝고 얇다 */}
      <mesh position={[0, wellFloor + 0.0008, 0]} rotation={[FLAT, 0, 0]}>
        <torusGeometry args={[G.aperture.radius, 0.0007, 8, 96]} />
        <meshStandardMaterial ref={aperture} color="#000000" emissive={P.secondary} toneMapped={false} />
      </mesh>
      {/* B 코어 — 방사형 디스크 */}
      <mesh position={[0, wellFloor + 0.001, 0]} rotation={[FLAT, 0, 0]} renderOrder={2}>
        <planeGeometry args={[G.aperture.radius * 2, G.aperture.radius * 2]} />
        <shaderMaterial args={[coreMaterial]} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      {/* 코어 위 국소 글로우 — 화면 전체 블룸 대신 */}
      <SoftGlow
        uniforms={uniforms}
        position={[0, wellFloor + 0.006, 0.004]}
        size={[0.1, 0.022]}
        color={P.secondary}
        alpha={0.28}
        inner={0.04}
        alphaUniform={coreGlow.current}
      />
    </group>
  );
}
