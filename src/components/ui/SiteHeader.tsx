"use client";

import Link from "next/link";
import { useMemo } from "react";
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

  return (
    <header className="glass-nav fixed left-0 right-0 top-0 z-50">
      <div className="mx-auto flex h-24 max-w-[1440px] items-center justify-between px-6 md:px-10">
        <Link href="/#hero" className="nav-label text-[#111827]">
          Kim Beom Seok
        </Link>
        <nav className="hidden items-center gap-10 md:flex" aria-label="Primary">
          {items.map((item) => {
            const id = item.href.split("#")[1] ?? "";
            const isActive = activeSection === id;

            return (
              <Link
                key={item.href}
                href={item.href}
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
