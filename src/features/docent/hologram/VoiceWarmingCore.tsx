"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Group, MathUtils, type MeshBasicMaterial } from "three";
import { HOLOGRAM_GEOMETRY as G, HOLOGRAM_PALETTE as P } from "./hologramConfig";
import type { HologramUniforms } from "./hologramUniforms";
import { SoftGlow } from "./SoftGlow";

/**
 * 음성 엔진(RunPod 워커)이 깨어나는 동안만 받침 위에 떠오르는 작은 에너지 코어.
 *
 * 얼굴이 멈춘 채 기다리면 고장처럼 보인다. 새 3D 자산 없이 기본 도형 몇 개로 "준비 중" 을
 * 보여 준다: 코어 글로우 · 서로 다른 축으로 도는 링 둘 · 받침에서 목 쪽으로 오르는 스캔 링.
 * 얼굴을 가리지 않게 받침 윗면과 목 끝 사이(빔이 보이는 틈)에만 둔다.
 *
 * 준비가 끝나면 천천히 사라지고, 다 사라지면 그리지 않는다. 얼굴 GLB 는 건드리지 않는다
 * (마운트·재로드 없음). 아바타 자체의 준비(WebGL·GLB)와는 다른 신호다.
 */
export const VOICE_CORE_Y = G.floorY + 0.013;

export function VoiceWarmingCore({
  uniforms,
  active,
  reduced,
}: {
  uniforms: HologramUniforms;
  active: boolean;
  reduced: boolean;
}) {
  const group = useRef<Group>(null);
  const ringA = useRef<Group>(null);
  const ringB = useRef<Group>(null);
  const scan = useRef<Group>(null);
  const ringMatA = useRef<MeshBasicMaterial>(null);
  const ringMatB = useRef<MeshBasicMaterial>(null);
  const scanMat = useRef<MeshBasicMaterial>(null);
  const glowAlpha = useRef({ value: 0 });
  const presence = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    // 나타날 때는 빠르게, 사라질 때는 천천히 — 준비 완료가 "툭" 끊기지 않게.
    presence.current = MathUtils.damp(presence.current, active ? 1 : 0, active ? 3 : 1.6, delta);
    const p = presence.current;
    if (group.current) group.current.visible = p > 0.01;
    if (p <= 0.01) return;

    const t = uniforms.uTime.value;
    if (!reduced) {
      if (ringA.current) ringA.current.rotation.set(1.15, t * 1.4, 0.2);
      if (ringB.current) ringB.current.rotation.set(-0.95, -t * 1.1, -0.35);
    }
    const breath = reduced ? 1 : 0.85 + Math.sin(t * 2.2) * 0.15;
    if (ringMatA.current) ringMatA.current.opacity = 0.55 * p * breath;
    if (ringMatB.current) ringMatB.current.opacity = 0.4 * p * breath;
    glowAlpha.current.value = 0.5 * p * breath;
    // 스캔 링: 받침에서 목 끝 쪽으로 1.6 초마다 오르며 흐려진다
    const phase = reduced ? 0.4 : (t / 1.6) % 1;
    if (scan.current) {
      scan.current.position.y = VOICE_CORE_Y - 0.008 + phase * 0.03;
      const s = 0.6 + phase * 0.8;
      scan.current.scale.set(s, s, s);
    }
    if (scanMat.current) scanMat.current.opacity = 0.35 * p * (1 - phase);
  });

  return (
    <group ref={group} name="voice-warming-core" visible={false}>
      <SoftGlow uniforms={uniforms} position={[0, VOICE_CORE_Y, 0.02]} size={[0.07, 0.07]} color={P.primary} alpha={0} alphaUniform={glowAlpha.current} inner={0.08} renderOrder={6} />
      <group ref={ringA} position={[0, VOICE_CORE_Y, 0]}>
        <mesh renderOrder={6}>
          <torusGeometry args={[0.022, 0.0012, 8, 48]} />
          <meshBasicMaterial ref={ringMatA} color={P.primary} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      <group ref={ringB} position={[0, VOICE_CORE_Y, 0]}>
        <mesh renderOrder={6}>
          <torusGeometry args={[0.03, 0.0009, 8, 48]} />
          <meshBasicMaterial ref={ringMatB} color={P.secondary} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      <group ref={scan} position={[0, VOICE_CORE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh renderOrder={6}>
          <ringGeometry args={[0.034, 0.037, 48]} />
          <meshBasicMaterial ref={scanMat} color={P.primary} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} side={2} />
        </mesh>
      </group>
    </group>
  );
}
