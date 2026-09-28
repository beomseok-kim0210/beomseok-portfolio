import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { DOCENT_RENDERED_SILHOUETTE } from "@/features/docent/avatarFraming";
import {
  HOLOGRAM_DETAIL,
  HOLOGRAM_GEOMETRY,
  HOLOGRAM_PALETTE,
  HOLOGRAM_TUNING,
  resolveHologramState,
} from "@/features/docent/hologram/hologramConfig";
import * as shaders from "@/features/docent/hologram/hologramShaders";
import {
  buildParticleGeometry,
  buildParticlePaths,
  particlePointAt,
} from "@/features/docent/hologram/particleField";

const read = (file: string) => readFileSync(file, "utf8");
/** GLB 정점에서 잰 메쉬 바닥 (노드 t.y 0.04398 + s 0.15742 × local min -0.8352). */
const MESH_BOTTOM_Y = 0.043978 + 0.157418 * -0.835215;

test("hologram state follows request and voice without inventing new states", () => {
  assert.equal(resolveHologramState("ready", "VOICE_OFF", false), "ready");
  assert.equal(resolveHologramState("searching", "VOICE_OFF", false), "searching");
  assert.equal(resolveHologramState("answering", "VOICE_OFF", false), "generating");
  assert.equal(resolveHologramState("delayed", "VOICE_OFF", false), "generating");
  assert.equal(resolveHologramState("ready", "VOICE_WARMING", false), "voice_warming");
  assert.equal(resolveHologramState("ready", "VOICE_SYNTHESIZING", false), "voice_warming");
  assert.equal(resolveHologramState("ready", "VOICE_READY", true), "speaking");
  assert.equal(resolveHologramState("failed", "VOICE_READY", true), "error");
  assert.equal(resolveHologramState("ready", "VOICE_ERROR", false), "error");
});

test("error dims and destabilises the projection but never turns it red", () => {
  const error = HOLOGRAM_TUNING.error;
  assert.ok(error.intensity < HOLOGRAM_TUNING.ready.intensity);
  assert.ok(error.noise > HOLOGRAM_TUNING.ready.noise);
  assert.equal(error.accent, 1);
  assert.equal(/red|#f00|#ef4444|#dc2626/i.test(JSON.stringify(HOLOGRAM_PALETTE)), false);
  for (const tuning of Object.values(HOLOGRAM_TUNING)) {
    // 상태 차이는 "살아 있음" 수준이어야 한다 — 게임 HUD 처럼 번쩍이지 않는다.
    assert.ok(tuning.intensity >= 0.8 && tuning.intensity <= 1.15);
    assert.ok(tuning.emitterPulse <= 0.2);
  }
});

test("neck materialises in three ordered zones, all below the chin and above the mesh end", () => {
  const { neck, floorY } = HOLOGRAM_GEOMETRY;
  assert.ok(neck.solidY < neck.chinUndersideY, "dissolve must not reach the jaw underside");
  assert.ok(neck.energyY < neck.solidY, "zone B (scan materialisation) precedes zone C");
  assert.ok(neck.goneY < neck.energyY, "zone C (energy) precedes the vanish point");
  assert.ok(neck.goneY > MESH_BOTTOM_Y, "the cut must vanish before the geometric termination");
  assert.ok(Math.abs(neck.meshBottomY - MESH_BOTTOM_Y) < 0.0005, "config mirrors the measured mesh end");
  assert.ok(floorY < DOCENT_RENDERED_SILHOUETTE.minY, "the head stands on, not inside, the emitter");
});

test("collar sits on the energy zone so light starts where the skin ends", () => {
  const { neck, collar } = HOLOGRAM_GEOMETRY;
  // 렌더 픽셀 실측: 칼라 빛의 정점이 마지막 피부 행에 겹쳐야 어두운 틈(= 잘린 인상)이 없다.
  assert.ok(collar.y < neck.energyY && collar.y > neck.meshBottomY);
  // 칼라는 실측한 목 바닥 단면(x ±0.097, z -0.093..0.032)을 감싼다.
  assert.ok(neck.section.radiusX > 0.097);
  assert.ok(neck.section.centerZ - neck.section.radiusZ < -0.093 + 0.005);
  assert.ok(neck.section.centerZ + neck.section.radiusZ > 0.032);
  const field = read("src/features/docent/hologram/NeckProjectionFade.tsx");
  // 세계 고정이면 머리가 끄덕일 때 칼라와 목 끝이 최대 14px 어긋났다 — 목을 따라가야 한다.
  assert.match(field, /group\.quaternion\.copy\(headMotion\.quaternion\)/);
});

test("mobile keeps identity and the neck connection; drops secondary detail", () => {
  const { desktop, mobile } = HOLOGRAM_DETAIL;
  assert.ok(desktop.particles >= 100 && desktop.particles <= 180);
  assert.ok(mobile.particles >= 30 && mobile.particles <= 60);
  // 목이 이어져 보이게 하는 빔은 모바일에서도 남는다. 칼라·디졸브는 detail 로 끌 수 없다.
  assert.equal(mobile.beam, true);
  assert.equal(mobile.arcs, false);
  assert.equal(mobile.fragment, false);
  assert.equal(mobile.cylinderDetail, false);
  assert.equal(mobile.topAperture, false);
  const chamber = read("src/features/docent/hologram/HologramChamber.tsx");
  assert.match(chamber, /\n\s*<NeckProjectionField uniforms=\{uniforms\} \/>/);
});

test("particles flow emitter -> neck as a funnel, never in front of the face, deterministically", () => {
  const paths = buildParticlePaths(HOLOGRAM_DETAIL.desktop.particles);
  assert.deepEqual(paths, buildParticlePaths(HOLOGRAM_DETAIL.desktop.particles));
  const geometry = buildParticleGeometry(HOLOGRAM_DETAIL.desktop.particles);
  for (const name of ["aAngle", "aStartRadius", "aEndRadius", "aEndY", "aPhase", "aDrift", "aSize"]) {
    assert.ok(geometry.getAttribute(name), name);
  }
  let funnel = 0;
  for (const [i, path] of paths.entries()) {
    let previousY = -Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const [x, y, z] = particlePointAt(path, t);
      // 방향: 언제나 아래 → 위
      assert.ok(y >= previousY, `particle ${i} moves down at t=${t}`);
      previousY = y;
      // 눈·코·이마 앞에는 없다 — 얼굴 앞에서는 턱 아래면 위로 오르지 않는다
      if (z > 0.04 && Math.abs(x) < 0.09) {
        assert.ok(y < HOLOGRAM_GEOMETRY.neck.chinUndersideY, `particle ${i} in front of the face at t=${t}`);
      }
    }
    if (path.endRadius < path.startRadius) funnel += 1;
  }
  // 대부분은 투사기에서 넓게 출발해 목으로 모인다
  assert.ok(funnel / paths.length > 0.65);
  // 흐름 시계는 적분값이다 — 상태 속도가 바뀌어도 위상이 튀지 않는다
  assert.match(shaders.particleVertex, /fract\(aPhase \+ uFlow \* aDrift\)/);
  assert.match(shaders.particleVertex, /mix\(2\.4, 0\.8, t\)/);
});

test("projection base has at most two lit rings and a recessed emitter well", () => {
  const base = read("src/features/docent/hologram/ProjectionBase.tsx");
  const emissiveRings = base.match(/emissive=\{P\.(primary|secondary)\}/g) ?? [];
  assert.equal(emissiveRings.length, 2, "aperture + secondary ring only");
  assert.ok(HOLOGRAM_GEOMETRY.well.depth > 0);
  assert.ok(HOLOGRAM_GEOMETRY.aperture.radius < HOLOGRAM_GEOMETRY.secondaryRing.inner);
  // 원근으로 받침 뒤 테두리가 목 끝 행에 걸리지 않도록: 화면 높이 ∝ (camY - floorY)/(camZ + R)
  const camY = 0.0329;
  const camZ = 0.6844;
  const neckEnd = (camY - HOLOGRAM_GEOMETRY.neck.meshBottomY) / camZ;
  const backRim = (camY - HOLOGRAM_GEOMETRY.floorY) / (camZ + HOLOGRAM_GEOMETRY.baseRadius);
  assert.ok(backRim > neckEnd + 0.01, "base back rim must project clearly below the neck end");
});

test("beam and underlight keep the face neutral", () => {
  const { beam, neck, floorY } = HOLOGRAM_GEOMETRY;
  assert.ok(beam.strongUntilY <= neck.goneY + 0.002, "strongest only up to the neck end");
  assert.ok(beam.fadeOutY < neck.chinUndersideY + 0.02, "gone by the jaw line");
  assert.match(shaders.projectionBeamFragment, /gl_FrontFacing/);
  const lighting = read("src/features/docent/hologram/SceneLighting.tsx");
  // 창을 자른 언더라이트: 입술(≈0.107 떨어짐)까지 닿지 않는다
  assert.match(lighting, /distance=\{0\.095\}/);
  assert.match(lighting, /decay=\{0\}/);
  assert.ok(floorY + 0.01 < neck.meshBottomY);
});

test("GLSL sources are ASCII-only (non-ASCII comments break some WebGL compilers)", () => {
  for (const [name, source] of Object.entries(shaders)) {
    assert.equal(/[^\x00-\x7f]/.test(source), false, name);
  }
});

test("the chamber is 3D: no DOM layers over the face, face rig untouched", () => {
  const canvas = read("src/features/docent/AvatarCanvas.tsx");
  const head = read("src/features/docent/DocentHead.tsx");
  const dissolve = read("src/features/docent/hologram/neckDissolve.ts");
  // 배경 한 장만 DOM 에 남는다.
  assert.deepEqual([...canvas.matchAll(/data-chamber-layer="([^"]+)"/g)].map((m) => m[1]), ["depth"]);
  assert.match(canvas, /<HologramChamber/);
  assert.match(canvas, /projection=\{shell\}/);
  assert.match(head, /applyNeckDissolve\(scene\)/);
  // 재질 주입은 캐시된 원본을 복제하고 되돌릴 수 있어야 하며 모프를 건드리지 않는다.
  assert.match(dissolve, /material\.clone\(\)/);
  assert.match(dissolve, /mesh\.material = material/);
  assert.equal(/morphTarget|morphTargetInfluences/.test(dissolve), false);
});

test("hologram never touches the voice warm path", () => {
  for (const file of [
    "src/features/docent/hologram/HologramChamber.tsx",
    "src/features/docent/hologram/hologramConfig.ts",
    "src/features/docent/AvatarCanvas.tsx",
  ]) {
    assert.equal(read(file).includes("/api/docent/voice"), false, file);
  }
});
