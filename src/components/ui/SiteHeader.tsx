"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActiveSection } from "@/hooks/useActiveSection";
import type { NavItem } from "@/types/portfolio";

type SiteHeaderProps = {
  items: NavItem[];
};

export function SiteHeader({ items }: SiteHeaderProps) {
  const sectionIds = useMemo(
    () =>
      items
        .map((item) => item.href.split("#")[1])
        .filter((id): id is string => Boolean(id)),
    [items],
  );
  const activeSection = useActiveSection(sectionIds);
  // Dark glass over dark worlds: read the section under the header band (data-header-tone).
  const [tone, setTone] = useState<"light" | "dark">("light");
  useEffect(() => {
    let timer = 0;
    const read = () => {
      timer = 0;
      const under = document.elementsFromPoint(window.innerWidth / 2, 40).find(el => !el.closest("header, [data-loader]")); // the loading overlay is not a section
      setTone(under?.closest<HTMLElement>("[data-header-tone]")?.dataset.headerTone === "dark" ? "dark" : "light");
    };
    // A hit test of the whole page stack is costly: sample ~8×/s while scrolling, not every frame (it was ~1.9s of a 14s scroll).
    const queue = () => { if (!timer) timer = window.setTimeout(read, 120); };
    read(); window.addEventListener("scroll", queue, { passive: true }); window.addEventListener("resize", queue);
    return () => { window.clearTimeout(timer); window.removeEventListener("scroll", queue); window.removeEventListener("resize", queue); };
  }, []);

  return (
    <header className="glass-nav fixed left-0 right-0 top-0 z-50" data-tone={tone}>
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-6 md:px-10">
        <Link href="/#hero" className="nav-label text-[#111827]">
          Kim Beom Seok
        </Link>
        <nav className="hidden items-center gap-4 md:flex lg:gap-10" aria-label="Primary">
          {items.map((item) => {
            const id = item.href.split("#")[1] ?? "";
            const isActive = activeSection === id;

            return (
              <Link
                key={item.href}
                href={item.href}
                // Home is one heavy page; prefetching /knowledge (~430KB of notes) on load only competes with it.
                prefetch={false}
                className={`nav-label transition-colors ${
                  isActive
                    ? "text-[#111827]"
                    : "text-slate-600 hover:text-[#111827]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
