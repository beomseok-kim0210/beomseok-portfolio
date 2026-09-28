"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Color, type Group, MathUtils, PerspectiveCamera, Vector3 } from "three";
import {
  HOLOGRAM_DETAIL,
  HOLOGRAM_GEOMETRY,
  HOLOGRAM_PALETTE,
  HOLOGRAM_TUNING,
  type HologramState,
} from "./hologramConfig";
import { createHologramUniforms } from "./hologramUniforms";
import { HologramParticles } from "./HologramParticles";
import { neckDissolveUniforms } from "./neckDissolve";
import { NeckProjectionField } from "./NeckProjectionFade";
import { ProjectionBase } from "./ProjectionBase";
import { ProjectionBeam, ProjectionCylinder, RearHalo, TopAperture } from "./ProjectionVolume";
import { DiagnosticFragment, TechnicalArcs } from "./TechnicalArcs";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", listener);
    return () => list.removeEventListener("change", listener);
  }, [query]);
  return matches;
}

/** 정지 상태에서도 스캔 밴드가 화면 밖에 걸리지 않는 시각. */
const REDUCED_MOTION_TIME = 2.4;

interface HologramChamberProps {
  state: HologramState;
  /** 0–1. 실제 입 벌림에서 온 발화 세기 — 받침 맥동에 아주 조금만 섞는다. */
  speechLevel: number;
}

/**
 * 투사 챔버. 깊이 순서 (뒤 → 앞):
 *   후광 · 빔(뒷면) · 원통 뒤쪽 면 · 뒤쪽 입자 · 머리 높이 호  →  아바타
 *   →  조각 · 목 경계 호(앞을 지남) · 목 안개  →  받침
 * 전부 가산 혼합이라 순서 자체는 정렬에 기대지 않고, 깊이 판정이 머리 뒤 층을 가린다.
 */
export function HologramChamber({ state, speechLevel }: HologramChamberProps) {
  const uniforms = useMemo(createHologramUniforms, []);
  const { gl, scene, camera, size } = useThree();
  const chamber = useRef<Group>(null);

  // 개발 전용 계측. 브라우저 렌더 픽셀로 목 전환을 검수하려면 층을 따로 켜고 끄며
  // 머리 공간 높이를 캔버스 픽셀 행으로 옮겨 봐야 한다. 프로덕션 번들에서는 빠진다.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __ddHologram?: unknown };
    const head = () => scene.getObjectByName("DocentHead");
    w.__ddHologram = {
      info: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        programs: gl.info.programs?.length ?? null,
        geometries: gl.info.memory.geometries,
      }),
      /** head | hologram | dissolve(=false 면 목을 메쉬 끝까지 그대로 그린다) */
      setLayer: (name: string, visible: boolean) => {
        if (name === "hologram" && chamber.current) chamber.current.visible = visible;
        const h = head();
        if (name === "head" && h) h.visible = visible;
        if (name !== "hologram" && name !== "head" && name !== "dissolve") {
          const target = chamber.current?.getObjectByName(name);
          if (target) target.visible = visible;
        }
        if (name === "dissolve") {
          neckDissolveUniforms.uHoloSolidY.value = visible ? HOLOGRAM_GEOMETRY.neck.solidY : -1;
          neckDissolveUniforms.uHoloEnergyY.value = visible ? HOLOGRAM_GEOMETRY.neck.energyY : -1.1;
          neckDissolveUniforms.uHoloGoneY.value = visible ? HOLOGRAM_GEOMETRY.neck.goneY : -1.2;
        }
      },
      render: () => gl.render(scene, camera),
      /** 챔버 안 이름 붙은 객체 — 원인 가설을 코드 수정 없이 실험할 때만. */
      object: (name: string) => chamber.current?.getObjectByName(name) ?? null,
      /** 머리 공간 (y, z) 를 캔버스 CSS 픽셀 행으로. 머리의 현재 흔들림을 반영한다. */
      projectY: (y: number, z = 0) => {
        const h = head();
        const p = new Vector3(0, y, z);
        if (h?.parent) h.parent.localToWorld(p);
        p.project(camera);
        return ((1 - p.y) / 2) * size.height;
      },
      size: () => ({ width: size.width, height: size.height, dpr: gl.getPixelRatio() }),
    };
    return () => {
      delete w.__ddHologram;
    };
  }, [camera, gl, scene, size.height, size.width]);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 768px)");
  const detail = mobile ? HOLOGRAM_DETAIL.mobile : HOLOGRAM_DETAIL.desktop;
  const clock = useRef(0);
  const accent = useRef(0);
  const palette = useMemo(
    () => ({ primary: new Color(HOLOGRAM_PALETTE.primary), amber: new Color(HOLOGRAM_PALETTE.amber) }),
    [],
  );

  useFrame((_, rawDelta) => {
    // 탭 복귀 직후의 큰 델타가 상태 보간을 한 번에 건너뛰지 않게.
    const delta = Math.min(rawDelta, 0.1);
    const tuning = HOLOGRAM_TUNING[state];
    const speech = MathUtils.clamp(speechLevel, 0, 1);
    const u = uniforms;
    if (reduced) {
      clock.current = REDUCED_MOTION_TIME;
    } else {
      clock.current += delta;
      u.uFlow.value += delta * tuning.drift;
    }
    u.uTime.value = clock.current;
    neckDissolveUniforms.uHoloTime.value = clock.current;
    // 스캔 행을 렌더 픽셀 기준으로 — 사이드 패널·전체 화면·모바일에서 같은 굵기.
    if (camera instanceof PerspectiveCamera) {
      const visibleHeight = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
      neckDissolveUniforms.uHoloUnitsPerPx.value = visibleHeight / (size.height * gl.getPixelRatio());
    }

    const rate = reduced ? 30 : 2.5;
    u.uIntensity.value = MathUtils.damp(u.uIntensity.value, tuning.intensity + speech * 0.05, rate, delta);
    u.uBeam.value = MathUtils.damp(u.uBeam.value, tuning.beam, rate, delta);
    u.uParticles.value = MathUtils.damp(u.uParticles.value, tuning.particles, rate, delta);
    u.uScanSpeed.value = MathUtils.damp(u.uScanSpeed.value, tuning.scanSpeed, rate, delta);
    u.uNoiseStrength.value = MathUtils.damp(u.uNoiseStrength.value, tuning.noise, rate, delta);
    // 발화는 이미 있는 jawOpen 을 아주 조금만 — 최대 +4%.
    u.uPulse.value = reduced
      ? 0
      : MathUtils.damp(u.uPulse.value, tuning.emitterPulse + speech * 0.04, rate, delta);
    // 음성 준비 중 코어는 "천천히 차오른다" — 다른 값보다 느리게 따라간다.
    u.uCore.value = MathUtils.damp(u.uCore.value, tuning.core, reduced ? 30 : 0.8, delta);
    accent.current = MathUtils.damp(accent.current, tuning.accent, rate, delta);
    u.uAccent.value.copy(palette.primary).lerp(palette.amber, accent.current);
    u.uAccentAmount.value = accent.current;
  });

  return (
    <group name="hologram-chamber" ref={chamber}>
      <RearHalo uniforms={uniforms} />
      <ProjectionCylinder uniforms={uniforms} detail={detail.cylinderDetail} />
      {detail.topAperture ? <TopAperture /> : null}
      {detail.beam ? <ProjectionBeam uniforms={uniforms} /> : null}
      {detail.arcs ? <TechnicalArcs reduced={reduced} /> : null}
      <HologramParticles uniforms={uniforms} count={detail.particles} />
      {detail.fragment ? <DiagnosticFragment uniforms={uniforms} reduced={reduced} /> : null}
      {/* 목 전환은 모바일에서도 끄지 않는다. */}
      <NeckProjectionField uniforms={uniforms} />
      <ProjectionBase uniforms={uniforms} />
    </group>
  );
}
