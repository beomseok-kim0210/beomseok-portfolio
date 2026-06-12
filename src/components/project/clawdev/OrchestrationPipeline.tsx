"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { clawdevPhases } from "@/data/clawdevCaseStudy";

const specBranches = ["backend", "frontend", "ai", "infra", "test"];

export function OrchestrationPipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25, once: true });
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    clawdevPhases.forEach((_, index) => {
      window.setTimeout(() => setActiveIndex(index), 400 + index * 620);
    });
  }, [inView]);

  const activePhase = clawdevPhases[Math.max(activeIndex, 0)];

  return (
    <div ref={ref} className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      {/* 좌: 페이즈 레일 */}
      <div className="rounded-[28px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-5 md:p-6">
        <div className="space-y-2">
          {clawdevPhases.map((phase, index) => {
            const state =
              index < activeIndex
                ? "completed"
                : index === activeIndex
                  ? "active"
                  : "pending";
            return (
              <div key={phase.key} className="relative">
                <motion.div
                  animate={{
                    opacity: state === "pending" ? 0.4 : 1,
                  }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 rounded-[16px] border px-4 py-3"
                  style={{
                    borderColor:
                      state === "active"
                        ? "var(--clawdev-accent)"
                        : state === "completed"
                          ? "rgba(52,211,153,0.4)"
                          : "rgba(148,163,184,0.14)",
                    background:
                      state === "active"
                        ? "rgba(96,165,250,0.08)"
                        : "transparent",
                  }}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{
                      background:
                        state === "completed"
                          ? "var(--clawdev-accent-2)"
                          : state === "active"
                            ? "var(--clawdev-accent)"
                            : "rgba(148,163,184,0.18)",
                      color: state === "pending" ? "#94A3B8" : "#0B1120",
                    }}
                  >
                    {state === "completed" ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{phase.label}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {phase.summary}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    {phase.actor}
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 우: 활성 페이즈 디테일 + 이벤트 로그 */}
      <div className="flex flex-col gap-4">
        <motion.div
          key={activePhase.key}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[28px] border border-[var(--clawdev-line)] bg-[#070C18] p-6 md:p-8"
        >
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--clawdev-accent)]">
            PHASE {Math.max(activeIndex, 0) + 1} / {clawdevPhases.length}
          </p>
          <p className="mt-3 text-2xl font-bold text-white md:text-[28px]">
            {activePhase.label}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
            {activePhase.detail}
          </p>

          {/* spec 단계: 5개 병렬 분기 */}
          {activePhase.key === "spec" ? (
            <div className="mt-6 grid grid-cols-5 gap-2">
              {specBranches.map((branch, i) => (
                <motion.div
                  key={branch}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-[12px] border border-[var(--clawdev-line)] bg-white/[0.04] px-2 py-3 text-center"
                >
                  <span className="text-[11px] font-semibold text-slate-300">
                    {branch}
                  </span>
                  <p className="mt-1 text-[9px] text-[var(--clawdev-accent-2)]">
                    Promise.all
                  </p>
                </motion.div>
              ))}
            </div>
          ) : null}
        </motion.div>

        {/* 이벤트 로그 */}
        <div className="rounded-[22px] border border-[var(--clawdev-line)] bg-[#070C18] p-5 font-mono text-[12px] leading-7 text-blue-100">
          {clawdevPhases.slice(0, Math.max(activeIndex + 1, 1)).map((phase) => (
            <motion.p
              key={phase.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="truncate"
            >
              <span className="text-[var(--clawdev-accent-2)]">{phase.emits}</span>
            </motion.p>
          ))}
        </div>
      </div>
    </div>
  );
}
