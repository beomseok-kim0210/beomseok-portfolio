"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { pageContextFromPathname } from "@/lib/docent/rag/pageContext";
import type { DocentPageContext } from "@/types/docent";

/**
 * 도슨트가 보내는 페이지 문맥. 라우터 pathname 과, 화면에 가장 많이 보이는
 * `[data-docent-section]` 요소의 섹션 ID 만 — DOM 텍스트는 절대 보내지 않는다.
 *
 * 섹션 추적은 있으면 좋은 힌트라 관측 대상이 없는 페이지에서는 그냥 비어 있다.
 */
export function usePageContext(override?: Partial<DocentPageContext>): DocentPageContext {
  const pathname = usePathname() ?? "/";
  const [sectionId, setSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-docent-section]"));
    if (nodes.length === 0) {
      setSectionId(null);
      return;
    }
    const visible = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target, e.isIntersecting ? e.intersectionRatio : 0);
        let best: Element | null = null;
        let bestRatio = 0;
        for (const [el, ratio] of visible) {
          if (ratio > bestRatio) {
            best = el;
            bestRatio = ratio;
          }
        }
        setSectionId(best ? (best as HTMLElement).dataset.docentSection ?? null : null);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pathname]);

  return useMemo(() => {
    const base = pageContextFromPathname(pathname, sectionId);
    const ctx: DocentPageContext = {
      pathname: base.pathname,
      pageType: base.pageType,
      ...(base.projectSlug ? { projectSlug: base.projectSlug } : {}),
      ...(base.sectionId ? { sectionId: base.sectionId } : {}),
    };
    return { ...ctx, ...override };
  }, [pathname, sectionId, override]);
}
