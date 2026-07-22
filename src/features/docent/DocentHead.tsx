"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, MathUtils, Mesh } from "three";
import type { VisemeKey } from "@/lib/docent/visemes";
import type { DocentEmotion } from "@/types/docent";

const MODEL_URL = "/models/docent.glb";

// 감정 → 모프타겟 가중치. GLB 계약: smile/thinking/surprised/sad/blink
const EMOTION_WEIGHTS: Record<DocentEmotion, Record<string, number>> = {
  neutral: {},
  smile: { smile: 0.8 },
  thinking: { thinking: 0.9 },
  surprised: { surprised: 1 },
  sad: { sad: 0.9 },
};

const VISEME_MORPH: Record<VisemeKey, string> = {
  a: "viseme_a",
  i: "viseme_i",
  u: "viseme_u",
  e: "viseme_e",
  o: "viseme_o",
  m: "viseme_m",
};
const VISEME_MORPH_NAMES = Object.values(VISEME_MORPH);

// 입모양별 강도. 'ㅁ/ㅂ/ㅍ'(m)은 원본 변위가 커서 낮게 잡는다.
const VISEME_INTENSITY: Record<VisemeKey, number> = {
  a: 0.85,
  i: 0.7,
  u: 0.8,
  e: 0.7,
  o: 0.8,
  m: 0.45,
};

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

  const head = useMemo(() => {
    const found = scene.getObjectByName("Head");
    return found instanceof Mesh ? found : null;
  }, [scene]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const influences = head?.morphTargetInfluences;
    const dictionary = head?.morphTargetDictionary;

    if (influences && dictionary) {
      // 1) 감정 표정: 이름별 목표 가중치로 수렴 (없는 모프는 조용히 무시)
      //    말하는 중에는 감정 모프와 비짐이 같은 입술 정점을 두고 겹쳐 이를
      //    드러낸 기괴한 표정이 되므로, 발화 중에는 감정 강도를 낮춘다.
      const targets = EMOTION_WEIGHTS[emotion] ?? {};
      const emotionScale = viseme ? 0.45 : 1;
      const damp = reduced ? 40 : 6;
      for (const [name, index] of Object.entries(dictionary)) {
        if (name === "blink" || VISEME_MORPH_NAMES.includes(name)) continue;
        const target = (targets[name] ?? 0) * emotionScale;
        influences[index] = MathUtils.damp(influences[index], target, damp, delta);
      }

      // 2) 립싱크: 활성 비짐만 올리고 나머지는 내린다.
      //    전환이 뚝뚝 끊기지 않도록 damp로 부드럽게 섞는다.
      const activeMorph = viseme ? VISEME_MORPH[viseme] : null;
      const activeTarget = viseme ? VISEME_INTENSITY[viseme] : 0;
      for (const name of VISEME_MORPH_NAMES) {
        const index = dictionary[name];
        if (index === undefined) continue;
        const target = name === activeMorph ? activeTarget : 0;
        influences[index] = MathUtils.damp(influences[index], target, 18, delta);
      }

      // 3) 눈 깜빡임: 2.5~6초 랜덤 간격, ~120ms
      const blinkIndex = dictionary["blink"] ?? -1;
      if (blinkIndex >= 0 && !reduced) {
        const b = blink.current;
        if (!b.closing && t >= b.nextAt) b.closing = true;
        if (b.closing) {
          influences[blinkIndex] = MathUtils.damp(influences[blinkIndex], 1, 30, delta);
          if (influences[blinkIndex] > 0.85) {
            b.closing = false;
            b.nextAt = t + 2.5 + Math.random() * 3.5;
          }
        } else {
          influences[blinkIndex] = MathUtils.damp(influences[blinkIndex], 0, 18, delta);
        }
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
