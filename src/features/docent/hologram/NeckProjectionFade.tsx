"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CatmullRomCurve3, DoubleSide, type Group, TubeGeometry, Vector3 } from "three";
import { HOLOGRAM_GEOMETRY as G } from "./hologramConfig";
import {
  collarRingFragment,
  collarSheathFragment,
  collarVertex,
  occlusionBandFragment,
  softQuadVertex,
} from "./hologramShaders";
import type { HologramUniforms } from "./hologramUniforms";

const { section } = G.neck;

/**
 * 목 종단의 앞·옆 층. 재질 디졸브(neckDissolve)가 목을 고체 → 스캔 → 에너지로 바꾸고,
 * 이 칼라가 그 에너지를 받아 받침 쪽으로 이어 준다.
 *
 *   sheath  목 끝을 감싸는 짧은 타원 외피 — 목 끝 높이에 모이고 위로 빛을 올린다
 *   ring    외피 가운데의 가는 타원 링 — 앞쪽 호가 목 앞을 지나간다
 *   band    목 끝 바로 앞의 가우시안 띠 — 형상이 끝나는 마지막 픽셀을 덮는다
 *
 * 해부학적 어깨가 아니라 기술적인 장치로 읽혀야 한다.
 */
export function NeckProjectionField({ uniforms }: { uniforms: HologramUniforms }) {
  const follow = useRef<Group>(null);
  const scene = useThree((state) => state.scene);

  // 목 전환 층은 목에 붙어 다녀야 한다. 머리는 아이들 흔들림(±0.008)과 시선 추적으로
  // 끄덕이는데, 세계 고정이면 렌더 픽셀 실측에서 칼라와 목 끝이 최대 14px 어긋나
  // 마지막 피부 행이 드러났다. 받침(투사기)만 세계에 고정된다.
  useFrame(() => {
    const group = follow.current;
    // GLB 노드 → GLB 씬 → DocentHead 의 흔들림 그룹
    const headMotion = scene.getObjectByName("DocentHead")?.parent?.parent;
    if (!group || !headMotion) return;
    group.position.copy(headMotion.position);
    group.quaternion.copy(headMotion.quaternion);
  });

  const sheathHeight = G.collar.bandHeight;
  // 외피 아래쪽 30% 지점이 목 끝 — 위로 올라가는 빛 꼬리를 위해 위쪽을 더 남긴다.
  // 위쪽은 깊이 판정으로 목 뒤에 숨고, 목 앞 윤곽이 외피보다 뒤로 물러나는 가장 낮은
  // 몇 행에서만 앞에 선다 — 빛이 목을 덮는 경계가 목의 실제 모양을 따른다.
  const sheathCenterV = 0.36;
  const sheathY = G.collar.y + (0.5 - sheathCenterV) * sheathHeight;

  const sheathMaterial = useMemo(
    () => ({
      uniforms: {
        uTime: uniforms.uTime,
        uIntensity: uniforms.uIntensity,
        uCenter: { value: sheathCenterV },
        uColor: uniforms.uColor,
        uColor2: uniforms.uColor2,
      },
      vertexShader: collarVertex,
      fragmentShader: collarSheathFragment,
    }),
    [uniforms],
  );

  const ringGeometry = useMemo(() => {
    const points: Vector3[] = [];
    for (let i = 0; i < 96; i += 1) {
      const a = (i / 96) * Math.PI * 2;
      points.push(new Vector3(Math.cos(a) * section.radiusX, 0, section.centerZ + Math.sin(a) * section.radiusZ));
    }
    return new TubeGeometry(new CatmullRomCurve3(points, true), 192, 0.0007, 6, true);
  }, []);
  useEffect(() => () => ringGeometry.dispose(), [ringGeometry]);

  const ringMaterial = useMemo(
    () => ({
      uniforms: {
        uTime: uniforms.uTime,
        uIntensity: uniforms.uIntensity,
        uCenterZ: { value: section.centerZ },
        uRadiusZ: { value: section.radiusZ },
        uColor2: uniforms.uColor2,
      },
      vertexShader: collarVertex,
      fragmentShader: collarRingFragment,
    }),
    [uniforms],
  );

  const bandMaterial = useMemo(
    () => ({
      uniforms: {
        uTime: uniforms.uTime,
        uIntensity: uniforms.uIntensity,
        uColor: uniforms.uColor,
        uColor2: uniforms.uColor2,
      },
      vertexShader: softQuadVertex,
      fragmentShader: occlusionBandFragment,
    }),
    [uniforms],
  );

  return (
    <group name="neck-projection-field" ref={follow}>
      <mesh
        name="collar-sheath"
        position={[0, sheathY, section.centerZ]}
        scale={[section.radiusX, sheathHeight, section.radiusZ]}
        renderOrder={6}
      >
        <cylinderGeometry args={[1, 1, 1, 96, 1, true]} />
        <shaderMaterial
          args={[sheathMaterial]}
          transparent
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh name="collar-ring" geometry={ringGeometry} position={[0, G.collar.y, 0]} renderOrder={7}>
        <shaderMaterial args={[ringMaterial]} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      {/* 목 앞 윤곽(z ≈ 0.033–0.05) 바로 앞. */}
      <mesh name="occlusion-band" position={[0, G.collar.y, section.centerZ + section.radiusZ + 0.006]} renderOrder={8}>
        <planeGeometry args={[section.radiusX * 2.1, 0.03]} />
        <shaderMaterial args={[bandMaterial]} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  );
}
