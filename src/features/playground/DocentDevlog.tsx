"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  docentDevlog,
  docentOrigin,
  docentRoadmap,
} from "@/data/docentDevlog";

export function DocentDevlog() {
  const reduceMotion = useReducedMotion();

  const fade = (delay = 0) => ({
    initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.6, delay },
  });

  return (
    <div className="mx-auto max-w-[820px]">
      {/* ─── 시작한 계기 ─── */}
      <motion.div
        {...fade()}
        className="rounded-[28px] border border-blue-400/20 bg-blue-400/[0.06] p-7 md:p-9"
      >
        <p className="small-label text-blue-300">
          {docentOrigin.label} · {docentOrigin.date}
        </p>
        <h3 className="mt-3 font-display text-2xl font-semibold text-white md:text-3xl">
          {docentOrigin.heading}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
          {docentOrigin.body}
        </p>
      </motion.div>

      {/* ─── 날짜별 개발기 타임라인 ─── */}
      <div className="relative mt-12 pl-8 md:pl-10">
        {/* 세로 라인 */}
        <div className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-blue-400/50 via-white/15 to-transparent md:left-[9px]" />

        {docentDevlog.map((entry, index) => (
          <motion.div
            key={`${entry.date}-${index}`}
            {...fade(index * 0.05)}
            className="relative mb-10 last:mb-0"
          >
            {/* 노드 */}
            <span className="absolute -left-8 top-1.5 flex h-4 w-4 items-center justify-center md:-left-10">
              <span className="h-3 w-3 rounded-full border-2 border-blue-400 bg-[#0b1120]" />
            </span>

            <p className="small-label text-slate-400">{entry.date}</p>
            <h4 className="mt-1.5 font-display text-lg font-semibold text-white md:text-xl">
              {entry.title}
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {entry.body}
            </p>

            {entry.state ? (
              <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-slate-400">
                <span className="font-medium text-slate-300">이 시점 상태 · </span>
                {entry.state}
              </p>
            ) : null}
            {entry.caveat ? (
              <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2.5 text-xs text-amber-200/90">
                <span className="font-medium">한계 · </span>
                {entry.caveat}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 text-xs text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── 앞으로의 발전 방향 ─── */}
      <motion.div {...fade()} className="mt-14">
        <p className="small-label text-blue-300">앞으로의 발전 방향</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {docentRoadmap.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            >
              <h4 className="font-display text-base font-semibold text-white">
                {item.title}
              </h4>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
