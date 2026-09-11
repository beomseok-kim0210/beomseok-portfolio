"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, MathUtils, Mesh } from "three";
import type { VisemeKey } from "@/lib/docent/visemes";
import {
  DEPRECATED_LEGACY_MOUTH_MORPHS,
  SEMANTIC_MOUTH_MORPHS,
  semanticMouthPose,
  type SemanticMouthMorph,
} from "@/lib/docent/legacyVisemeToSemanticMouth";
import type { DocentEmotion } from "@/types/docent";

/**
 * 임시 head-only 런타임. 입은 M2.13 semantic 액추에이터가 구동하고, 눈깜빡임과
 * 감정 표정은 레거시에서 옮겨 온 비구강 모프가 구동한다. viseme 라벨은
 * legacyVisemeToSemanticMouth 어댑터를 통해서만 들어온다 — 여기서 모프 이름을
 * 라벨로 직접 찾는 곳은 없다.
 */
const MODEL_URL = "/models/docent-qka2-m213-runtime-compat.glb";

// 감정 → 모프타겟 가중치. GLB 계약: smile/thinking/surprised/sad/blink
const EMOTION_MORPHS = ["smile", "thinking", "surprised", "sad"] as const;
type EmotionMorph = (typeof EMOTION_MORPHS)[number];

const EMOTION_WEIGHTS: Record<DocentEmotion, Partial<Record<EmotionMorph, number>>> = {
  neutral: {},
  smile: { smile: 0.8 },
  thinking: { thinking: 0.9 },
  surprised: { surprised: 1 },
  sad: { sad: 0.9 },
};

// 진단 훅은 개발 런타임에만 존재한다. 계약 위반 시의 console.error 와 throw 는
// 빌드와 무관하게 항상 살아 있다 — 그쪽이 이 컴포넌트의 안전장치다.
const DEV = process.env.NODE_ENV !== "production";

const BLINK_MORPH = "blink";
const REQUIRED_MORPHS: readonly string[] = [
  ...SEMANTIC_MOUTH_MORPHS,
  ...EMOTION_MORPHS,
  BLINK_MORPH,
];

/**
 * 이름 해석은 로드 직후 한 번만 한다. 프레임 루프에서 사전 조회를 하지 않으므로
 * 정의되지 않은 조회가 프레임마다 조용히 반복될 여지가 없다.
 */
interface MorphRig {
  mesh: Mesh;
  index: Record<string, number>;
}

interface RigAudit {
  model: string;
  meshes: number;
  /** 모프를 아예 갖지 않아 구동 대상에서 빠진 메쉬. 이 에셋에서는 0이어야 한다. */
  morphlessMeshes: string[];
  present: string[];
  missing: string[];
  /** 에셋 전체에는 있으나 이 서브메쉬 사전에 없는 이름의 수 */
  undefinedLookups: number;
  /** 사전이 가리키는 인덱스가 influences 배열 밖인 경우 */
  outOfRangeIndices: string[];
  deprecatedPresent: string[];
  /** 자산에는 있으나 런타임이 구동하지 않는 이름. 값이 고정된 채 남는다. */
  undriven: string[];
}

/**
 * 모프를 가진 메쉬만 모으면, 모프가 통째로 없는 서브메쉬는 감사에 잡히지 않고
 * 조용히 정지한 채 남는다. 그래서 메쉬는 전부 넘겨받아 여기서 분류한다.
 */
function buildRig(allMeshes: Mesh[], model: string): { rigs: MorphRig[]; audit: RigAudit } {
  const morphed = allMeshes.filter(
    (m) => m.morphTargetInfluences !== undefined && m.morphTargetDictionary !== undefined
  );
  const union = new Set<string>();
  for (const mesh of morphed) {
    for (const name of Object.keys(mesh.morphTargetDictionary ?? {})) union.add(name);
  }

  const rigs: MorphRig[] = [];
  let undefinedLookups = 0;
  const outOfRangeIndices: string[] = [];
  for (const mesh of morphed) {
    const dictionary = mesh.morphTargetDictionary ?? {};
    const influences = mesh.morphTargetInfluences ?? [];
    const index: Record<string, number> = {};
    for (const name of REQUIRED_MORPHS) {
      const slot = dictionary[name];
      // 에셋 전체에는 있는데 이 서브메쉬에만 없는 경우는 정상이 아니다
      if (slot === undefined) {
        if (union.has(name)) undefinedLookups += 1;
        continue;
      }
      // 사전과 influences 가 어긋나면 쓰기가 배열 밖으로 나가 아무 일도 일어나지 않는다
      if (!Number.isInteger(slot) || slot < 0 || slot >= influences.length) {
        outOfRangeIndices.push(`${mesh.name || "mesh"}.${name}=${slot}/${influences.length}`);
        continue;
      }
      index[name] = slot;
    }
    rigs.push({ mesh, index });
  }

  // 런타임이 건드리지 않는 모프는 GLB 의 초기 weights 값에 그대로 머문다.
  // 폐기된 viseme 가 0이 아닌 채로 들어오면 입이 굳은 모양으로 눌려 보인다.
  // 인덱스가 범위 밖이면 0으로 누르지도 못하므로, 조용히 넘기지 않고 계약 위반으로
  // 올려보낸다 — 누르지 못한 모프가 바로 굳은 얼굴의 원인이 된다.
  const undriven = [...union].filter((n) => !REQUIRED_MORPHS.includes(n)).sort();
  for (const mesh of morphed) {
    const dictionary = mesh.morphTargetDictionary ?? {};
    const influences = mesh.morphTargetInfluences ?? [];
    for (const name of undriven) {
      const slot = dictionary[name];
      if (slot === undefined) continue;
      if (!Number.isInteger(slot) || slot < 0 || slot >= influences.length) {
        outOfRangeIndices.push(
          `${mesh.name || "mesh"}.${name}=${slot}/${influences.length} (undriven, not zeroed)`
        );
        continue;
      }
      influences[slot] = 0;
    }
  }

  const audit: RigAudit = {
    model,
    meshes: morphed.length,
    morphlessMeshes: allMeshes.filter((m) => !morphed.includes(m)).map((m) => m.name || "mesh"),
    present: REQUIRED_MORPHS.filter((n) => union.has(n)),
    missing: REQUIRED_MORPHS.filter((n) => !union.has(n)),
    undefinedLookups,
    outOfRangeIndices,
    deprecatedPresent: DEPRECATED_LEGACY_MOUTH_MORPHS.filter((n) => union.has(n)),
    undriven,
  };
  return { rigs, audit };
}

interface DocentHeadProps {
  emotion: DocentEmotion;
  /** 현재 발음 중인 입모양. null이면 입을 다문다. */
  viseme: VisemeKey | null;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

export function DocentHead({ emotion, viseme }: DocentHeadProps) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_URL);
  const reduced = usePrefersReducedMotion();
  const blink = useRef({ nextAt: 2.5, closing: false });
  // 액추에이터는 라벨이 아니라 연속값이므로 목표가 아니라 현재 상태를 들고 간다
  const mouth = useRef<Record<SemanticMouthMorph, number>>({
    jawOpen: 0,
    mouthRound: 0,
    mouthStretch: 0,
    jawOpenCorrective: 0,
    mouthShrugUpper: 0,
  });

  // GLB가 부위별 재질(피부·구강내벽·치아)로 나뉘어 있어 메쉬가 여러 개다.
  // 모프타겟을 가진 서브메쉬를 모두 모아 같은 가중치로 함께 구동한다.
  const { rigs, audit } = useMemo(() => {
    const found: Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof Mesh) found.push(object);
    });
    return buildRig(found, MODEL_URL);
  }, [scene]);

  // 계약 위반은 조용히 굳은 얼굴로 흘려보내지 않는다. 여기서 던지면
  // AvatarErrorBoundary가 2D 폴백으로 내려보내므로 실패가 눈에 보인다.
  if (DEV && typeof window !== "undefined") {
    // audit 는 문자열·숫자뿐이라 붙잡고 있어도 새는 것이 없고, 아래 throw 보다
    // 먼저 놓여야 계약 위반의 내용을 밖에서 읽을 수 있다.
    (window as unknown as { __ddHeadAudit?: RigAudit }).__ddHeadAudit = audit;
  }
  const violations: string[] = [];
  if (audit.missing.length > 0) violations.push(`missing [${audit.missing.join(", ")}]`);
  if (audit.undefinedLookups > 0) violations.push(`undefined sub-mesh lookups ${audit.undefinedLookups}`);
  if (audit.morphlessMeshes.length > 0)
    violations.push(`meshes with no morph targets [${audit.morphlessMeshes.join(", ")}]`);
  if (audit.outOfRangeIndices.length > 0)
    violations.push(`out-of-range morph indices [${audit.outOfRangeIndices.join(", ")}]`);
  if (violations.length > 0) {
    const detail = `${MODEL_URL} — ${violations.join("; ")}`;
    console.error("[DocentHead] morph contract violated:", detail);
    throw new Error(`DocentHead morph contract violated: ${detail}`);
  }
  if (audit.deprecatedPresent.length > 0) {
    // 치명적이지는 않다 — buildRig 가 이미 0으로 눌러 두었다. 다만 이 자산이
    // 폐기된 입 기저를 다시 들고 온다는 뜻이므로 조용히 넘기지 않는다.
    console.error(
      "[DocentHead] deprecated legacy mouth visemes present in the asset (forced to zero):",
      audit.deprecatedPresent.join(", ")
    );
  }

  // 읽기 전용 진단. react-three-fiber 는 스토어를 DOM 에 노출하지 않아서, 이 훅이
  // 없으면 실제 프로덕션 헤드의 모프 상태를 밖에서 확인할 방법이 없다.
  //
  // 렌더 중에 전역에 걸면 두 가지가 샌다: 언마운트 뒤에도 클로저가 three.js 메쉬를
  // 붙잡고, concurrent 렌더에서 버려진 렌더의 상태가 그대로 남는다. 그래서 effect
  // 에서 걸고 cleanup 에서 지운다. 값은 ref 로 읽으므로 재설치도 필요 없다.
  const latest = useRef({ viseme, emotion });
  latest.current = { viseme, emotion };
  useEffect(() => {
    if (!DEV || typeof window === "undefined") return;
    const w = window as unknown as { __ddHeadProbe?: () => unknown };
    w.__ddHeadProbe = () => ({
      model: MODEL_URL,
      ...latest.current,
      mouth: { ...mouth.current },
      influences: rigs.map((rig) => ({
        mesh: rig.mesh.material && "name" in rig.mesh.material
          ? (rig.mesh.material as { name: string }).name
          : rig.mesh.name,
        values: Object.fromEntries(
          Object.entries(rig.index).map(([name, slot]) => [
            name,
            rig.mesh.morphTargetInfluences?.[slot] ?? null,
          ])
        ),
      })),
    });
    return () => {
      delete w.__ddHeadProbe;
    };
  }, [rigs]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // 눈 깜빡임 타이밍은 메쉬마다 따로 굴리면 어긋나므로 프레임당 한 번만 계산
    let blinkTarget: number | null = null;
    if (!reduced && rigs.length > 0) {
      const b = blink.current;
      const first = rigs[0];
      const slot = first.index[BLINK_MORPH];
      if (slot !== undefined) {
        const currentBlink = first.mesh.morphTargetInfluences?.[slot] ?? 0;
        if (!b.closing && t >= b.nextAt) b.closing = true;
        if (b.closing && currentBlink > 0.85) {
          b.closing = false;
          b.nextAt = t + 2.5 + Math.random() * 3.5;
        }
        blinkTarget = b.closing ? 1 : 0;
      }
    }

    // 1) 입 — 라벨을 액추에이터 목표로 바꾼 뒤 그 목표로 감쇠시킨다
    const pose = semanticMouthPose(viseme);
    const m = mouth.current;
    for (const name of SEMANTIC_MOUTH_MORPHS) {
      m[name] = MathUtils.damp(m[name], pose[name], 18, delta);
    }

    const targets = EMOTION_WEIGHTS[emotion] ?? {};
    // 말하는 중에는 감정 모프와 입 액추에이터가 같은 입술 정점을 두고 겹쳐 이를
    // 드러낸 기괴한 표정이 되므로, 발화 중에는 감정 강도를 낮춘다.
    const emotionScale = viseme ? 0.45 : 1;
    const damp = reduced ? 40 : 6;

    for (const rig of rigs) {
      const influences = rig.mesh.morphTargetInfluences;
      if (!influences) continue;

      for (const name of SEMANTIC_MOUTH_MORPHS) {
        const slot = rig.index[name];
        if (slot !== undefined) influences[slot] = m[name];
      }

      // 2) 감정 표정
      for (const name of EMOTION_MORPHS) {
        const slot = rig.index[name];
        if (slot === undefined) continue;
        const target = (targets[name] ?? 0) * emotionScale;
        influences[slot] = MathUtils.damp(influences[slot], target, damp, delta);
      }

      // 3) 눈 깜빡임
      const blinkSlot = rig.index[BLINK_MORPH];
      if (blinkSlot !== undefined && blinkTarget !== null) {
        influences[blinkSlot] = MathUtils.damp(
          influences[blinkSlot],
          blinkTarget,
          blinkTarget > 0 ? 30 : 18,
          delta
        );
      }
    }

    // 4) 아이들 모션: 미세 스웨이 + 포인터 시선 추적
    if (group.current && !reduced) {
      const gazeX = MathUtils.clamp(state.pointer.x, -1, 1) * 0.22;
      const gazeY = MathUtils.clamp(state.pointer.y, -1, 1) * 0.12;
      group.current.rotation.y = MathUtils.damp(
        group.current.rotation.y,
        gazeX + Math.sin(t * 0.4) * 0.04,
        4,
        delta
      );
      group.current.rotation.x = MathUtils.damp(
        group.current.rotation.x,
        -gazeY + Math.sin(t * 0.7) * 0.02,
        4,
        delta
      );
      group.current.position.y = Math.sin(t * 0.8) * 0.008;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
