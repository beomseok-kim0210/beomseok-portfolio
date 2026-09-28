"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, DoubleSide, LatheGeometry, Vector2 } from "three";
import { HOLOGRAM_GEOMETRY as G, HOLOGRAM_PALETTE as P } from "./hologramConfig";
import {
  projectionBeamFragment,
  projectionBeamVertex,
  projectionCylinderFragment,
  projectionCylinderVertex,
} from "./hologramShaders";
import type { HologramUniforms } from "./hologramUniforms";
import { SoftGlow } from "./SoftGlow";

/**
 * 투사 원통. 열린 CylinderGeometry + 프레넬 셰이더 — 가운데는 비고 윤곽만 선다.
 * 받침 윗면에서 시작해 프레임 위로 빠져나가며 사라진다.
 */
export function ProjectionCylinder({ uniforms, detail }: { uniforms: HologramUniforms; detail: boolean }) {
  const height = G.cylinderTop - G.floorY;
  const material = useMemo(
    () => ({
      uniforms: {
        uTime: uniforms.uTime,
        uIntensity: uniforms.uIntensity,
        uScanSpeed: uniforms.uScanSpeed,
        uNoiseStrength: uniforms.uNoiseStrength,
        uDetail: { value: detail ? 1 : 0 },
        uColor: uniforms.uColor,
        uColor2: uniforms.uColor2,
      },
      vertexShader: projectionCylinderVertex,
      fragmentShader: projectionCylinderFragment,
    }),
    [detail, uniforms],
  );
  return (
    <mesh name="projection-cylinder" position={[0, G.floorY + height / 2, 0]} renderOrder={2}>
      <cylinderGeometry args={[G.cylinderRadius, G.cylinderRadius, height, 96, 1, true]} />
      <shaderMaterial
        args={[material]}
        transparent
        depthWrite={false}
        side={DoubleSide}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

/**
 * 투사 빔 — 조리개에서 목으로 벌어지는 깔때기(LatheGeometry). 투사기 → 빛 → 아바타의
 * 인과를 보여 주는 매질이다. 레이마칭 없이 면 하나로 부피감을 흉내 낸다.
 *
 * 양면을 그리되, 셰이더가 앞면은 목 끝 아래의 틈에서만 쓴다 — 앞면이 얼굴 앞을 지나면
 * 아래 얼굴에 청록을 칠하기 때문이다. 뒷면은 머리 뒤에 서므로 머리가 가리고 턱·목
 * 양옆으로만 새어 나온다.
 */
export function ProjectionBeam({ uniforms }: { uniforms: HologramUniforms }) {
  const geometry = useMemo(
    () => new LatheGeometry(G.beam.profile.map(([r, h]) => new Vector2(r, h)), 72),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(
    () => ({
      uniforms: {
        uTime: uniforms.uTime,
        uIntensity: uniforms.uIntensity,
        uBeam: uniforms.uBeam,
        uNoiseStrength: uniforms.uNoiseStrength,
        uPulse: uniforms.uPulse,
        uFloorY: { value: G.floorY },
        uStrongY: { value: G.beam.strongUntilY },
        uFadeY: { value: G.beam.fadeOutY },
        uColor: uniforms.uColor,
        uColor2: uniforms.uColor2,
      },
      vertexShader: projectionBeamVertex,
      fragmentShader: projectionBeamFragment,
    }),
    [uniforms],
  );
  return (
    <mesh name="projection-beam" geometry={geometry} position={[0, G.floorY, 0]} renderOrder={3}>
      <shaderMaterial
        args={[material]}
        transparent
        depthWrite={false}
        side={DoubleSide}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

/**
 * 머리 뒤 소프트 후광 — 세로로 긴 타원. 어두운 머리칼을 어두운 배경에서 떼어낸다.
 * 원 가장자리가 보이면 실패다(방사형 감쇠가 0 까지 부드럽게 내려간다).
 */
export function RearHalo({ uniforms }: { uniforms: HologramUniforms }) {
  return (
    <group name="rear-halo">
      <SoftGlow
        uniforms={uniforms}
        position={[0, G.halo.y, G.halo.z]}
        size={[G.halo.width, G.halo.height]}
        color={P.primary}
        alpha={0.22}
        breath={0.04}
        inner={0.04}
        renderOrder={1}
      />
    </group>
  );
}

/**
 * 윗 조리개 — 머리 위 빈 공간을 장식으로 채우지 않고, 챔버의 천장을 아주 희미하게
 * 암시한다. 얇은 껍질 두 겹으로 번짐을 흉내 낸다(불투명도 3–5%).
 */
export function TopAperture() {
  return (
    <group name="top-aperture" position={[0, G.topAperture.y, 0]}>
      {[0, 0.0022].map((dy, i) => (
        <mesh key={dy} position={[0, dy, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <torusGeometry args={[G.topAperture.radius + i * 0.002, 0.0006 + i * 0.0012, 6, 160]} />
          <meshBasicMaterial
            color={P.primary}
            transparent
            opacity={i === 0 ? 0.05 : 0.03}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
