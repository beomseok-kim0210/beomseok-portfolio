"use client";

import { useMemo } from "react";
import { AdditiveBlending, Color } from "three";
import { softGlowFragment, softQuadVertex } from "./hologramShaders";
import type { HologramUniforms } from "./hologramUniforms";

interface SoftGlowProps {
  uniforms: HologramUniforms;
  position: [number, number, number];
  /** 월드 단위 [가로, 세로]. */
  size: [number, number];
  color: string;
  alpha: number;
  /** 0 이면 호흡하지 않는다. */
  breath?: number;
  /** 원판 중심의 꽉 찬 반경(0–0.5). */
  inner?: number;
  renderOrder?: number;
  /** 매 프레임 알파를 바꾸려는 부모가 쥐는 uniform. */
  alphaUniform?: { value: number };
}

/**
 * 국소 글로우. 화면 전체 블룸 패스 대신 빛나야 할 물체 바로 뒤/앞에만 소프트
 * 디스크를 둔다 — 얼굴과 텍스트는 절대 번지지 않는다.
 */
export function SoftGlow({
  uniforms,
  position,
  size,
  color,
  alpha,
  breath = 0,
  inner = 0.05,
  renderOrder = 0,
  alphaUniform,
}: SoftGlowProps) {
  const material = useMemo(
    () => ({
      uniforms: {
        uTime: uniforms.uTime,
        uAlpha: alphaUniform ?? { value: alpha },
        uBreath: { value: breath },
        uInner: { value: inner },
        uColor: { value: new Color(color) },
      },
      vertexShader: softQuadVertex,
      fragmentShader: softGlowFragment,
    }),
    [alpha, alphaUniform, breath, color, inner, uniforms.uTime],
  );
  return (
    <mesh position={position} renderOrder={renderOrder}>
      <planeGeometry args={[size[0], size[1]]} />
      <shaderMaterial
        args={[material]}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
