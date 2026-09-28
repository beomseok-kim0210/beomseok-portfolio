"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending } from "three";
import { HOLOGRAM_GEOMETRY as G } from "./hologramConfig";
import { particleFragment, particleVertex } from "./hologramShaders";
import type { HologramUniforms } from "./hologramUniforms";
import { buildParticleGeometry } from "./particleField";

/**
 * THREE.Points 한 번의 드로우콜. 버퍼는 개수가 바뀔 때만 만든다 — 상태 변화는
 * 밝기(uParticles)와 흐름 속도(uFlow 적분)로만 표현하고 버퍼를 다시 만들지 않는다.
 */
export function HologramParticles({ uniforms, count }: { uniforms: HologramUniforms; count: number }) {
  const dpr = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => buildParticleGeometry(count), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(
    () => ({
      uniforms: {
        uFlow: uniforms.uFlow,
        uIntensity: uniforms.uIntensity,
        uParticles: uniforms.uParticles,
        uColor: uniforms.uColor,
        uColor2: uniforms.uColor2,
        uFloorY: { value: G.floorY },
        uNeckCenterZ: { value: G.neck.section.centerZ },
        uPixelRatio: { value: 1 },
      },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
    }),
    [uniforms],
  );
  material.uniforms.uPixelRatio.value = dpr;
  return (
    <points name="hologram-particles" geometry={geometry} renderOrder={5} frustumCulled={false}>
      <shaderMaterial args={[material]} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}
