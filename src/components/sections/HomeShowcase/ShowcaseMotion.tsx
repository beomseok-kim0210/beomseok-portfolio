"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

type Preset = "title" | "media" | "cta";

type ShowcaseMotionProps = {
  children: React.ReactNode;
  className?: string;
  /** 하위호환용 — 스크롤 연동 모드에선 사용하지 않음 */
  delay?: number;
  preset?: Preset;
};

/**
 * 스크롤 연동 시네마틱 레이어.
 * - media: 스크롤에 따라 줌인되며 자리잡고 가벼운 패럴럭스 (프로젝트의 "등장")
 * - title: 텍스트가 다른 속도로 패럴럭스되며 등장/리시드 (깊이감)
 * - cta: 은은한 상승
 * prefers-reduced-motion 사용자에겐 정적 렌더로 폴백.
 */
export function ShowcaseMotion({
  children,
  className = "",
  preset = "title",
}: ShowcaseMotionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // 요소가 뷰포트를 통과하는 진행도(0=하단 진입, 1=상단 이탈)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(
    scrollYProgress,
    [0, 0.45, 1],
    preset === "media" ? [0.85, 1, 1] : [1, 1, 1],
  );
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    preset === "media" ? [60, -60] : preset === "cta" ? [30, -20] : [40, -70],
  );
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.85, 1],
    [0, 1, 1, preset === "title" ? 0.6 : 1],
  );

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={preset === "media" ? { scale, y, opacity } : { y, opacity }}
    >
      {children}
    </motion.div>
  );
}
