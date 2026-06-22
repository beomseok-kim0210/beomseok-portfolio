"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * 전역 스무스 스크롤(Lenis). 관성 있는 스크롤로 시네마틱한 체감을 준다.
 * - prefers-reduced-motion 사용자에겐 비활성(접근성, 네이티브 스크롤 폴백).
 * - 같은 페이지 해시 링크(#projects 등)는 헤더 높이 보정하며 부드럽게 이동.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.(
        'a[href*="#"]',
      );
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      const hashIndex = href.indexOf("#");
      if (hashIndex === -1) return;

      const hash = href.slice(hashIndex);
      if (hash.length < 2 || !/^#[\w-]+$/.test(hash)) return;

      const target = document.querySelector(hash);
      if (!target) return; // 다른 페이지로의 이동이면 기본 동작에 맡긴다

      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -72 });
      window.history.pushState(null, "", hash);
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);

  return null;
}
