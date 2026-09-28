"use client";

import { HOLOGRAM_GEOMETRY, HOLOGRAM_PALETTE as P } from "./hologramConfig";

/** 조리개와 목 끝 사이 — 빔 안에서 빛이 나오는 자리. */
const UNDERLIGHT_Y = HOLOGRAM_GEOMETRY.floorY + 0.01;

/**
 * 얼굴 조명. 키·필은 승인된 얼굴 그대로 두고, 차가운 림 두 개로 머리칼·턱선만
 * 배경에서 떼어낸다. 피부는 중립에 머물러야 한다 — 얼굴 전체를 파랗게 물들이면 실패.
 */
export function SceneLighting({ hologram }: { hologram: boolean }) {
  return (
    <>
      <ambientLight intensity={0.42} color="#dbeafe" />
      {/* key — 따뜻한 정면 위 */}
      <directionalLight position={[1.5, 2.2, 4]} intensity={1.5} color="#fff2e6" />
      {/* fill — 약한 차가운 정면 옆 */}
      <directionalLight position={[-3, 0.7, 2]} intensity={0.62} color="#93c5fd" />
      {/* rim — 뒤 위 시안 */}
      <directionalLight position={[0.8, 1.8, -3]} intensity={hologram ? 1.05 : 0.9} color="#67e8f9" />
      {hologram ? (
        // 반대쪽 림 — 왼쪽 머리칼 윤곽. 오른쪽(차가운 시안 1.05)과 일부러 다르게:
        // 중립에 가까운 푸른빛, 더 약하게. 같은 세기·색이면 평면적인 대칭이 된다.
        <directionalLight position={[-1.6, 1.1, -2.4]} intensity={0.55} color="#a9c7ee" />
      ) : null}
      {hologram ? (
        /* 투사 언더라이트 — 조리개 바로 위에서 턱 밑·목 끝만 비춘다. 감쇠 없는 빛을
           0.095 반경으로 잘라, 입술(≈0.107 떨어짐)부터 위로는 닿지 않는다.
           세기 0.2 ≈ 키(1.5)의 13%. 피부를 파랗게 물들이지 않는다. */
        <pointLight
          position={[0, UNDERLIGHT_Y, 0]}
          intensity={0.2}
          color={P.primary}
          distance={0.095}
          decay={0}
        />
      ) : (
        /* 턱 아래 투사광 */
        <pointLight position={[0, -0.18, 0.35]} intensity={0.34} color="#38bdf8" distance={1.25} />
      )}
    </>
  );
}
