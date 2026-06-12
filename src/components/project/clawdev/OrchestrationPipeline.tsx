"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { clawdevPhases } from "@/data/clawdevCaseStudy";

const specBranches = ["backend", "frontend", "ai", "infra", "test"];

export function OrchestrationPipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25, once: true });
  const [selected, setSelected] = useState(0);
  const [interacted, setInteracted] = useState(false);

  // 사용자가 클릭하기 전까지만 천천히 자동 순회
  useEffect(() => {
    if (!inView || interacted) return;
    const timer = window.setInterval(() => {
      setSelected((prev) => {
        if (prev >= clawdevPhases.length - 1) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [inView, interacted]);

  const select = (index: number) => {
    setInteracted(true);
    setSelected(index);
  };

  const activePhase = clawdevPhases[selected];

  return (
    <div ref={ref}>
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--clawdev-accent)]" />
        단계를 클릭해 세부 동작을 확인하세요
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* 좌: 페이즈 레일 (클릭 가능) */}
        <div className="rounded-[28px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-5 md:p-6">
          <div className="space-y-2">
            {clawdevPhases.map((phase, index) => {
              const state =
                index < selected
                  ? "completed"
                  : index === selected
                    ? "active"
                    : "pending";
              return (
                <button
                  key={phase.key}
                  type="button"
                  onClick={() => select(index)}
                  className="w-full text-left transition-transform hover:translate-x-0.5"
                >
                  <div
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
                          ? "rgba(96,165,250,0.1)"
                          : "transparent",
                      opacity: state === "pending" ? 0.55 : 1,
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
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 우: 선택 페이즈 디테일 */}
        <div className="flex flex-col gap-4">
          <motion.div
            key={activePhase.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 rounded-[28px] border border-[var(--clawdev-line)] bg-[#070C18] p-6 md:p-8"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-[0.16em] text-[var(--clawdev-accent)]">
                PHASE {selected + 1} / {clawdevPhases.length}
              </p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                {activePhase.actor}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-white md:text-[28px]">
              {activePhase.label}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              {activePhase.summary}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-slate-300 md:text-base">
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

            {/* emits */}
            <div className="mt-6 rounded-[14px] border border-white/[0.06] bg-black/30 px-4 py-3 font-mono text-[12px] text-[var(--clawdev-accent-2)]">
              {activePhase.emits}
            </div>

            {/* 이전/다음 */}
            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => select(Math.max(selected - 1, 0))}
                disabled={selected === 0}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-white/40 disabled:opacity-30"
              >
                ← 이전
              </button>
              <button
                type="button"
                onClick={() =>
                  select(Math.min(selected + 1, clawdevPhases.length - 1))
                }
                disabled={selected === clawdevPhases.length - 1}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-white/40 disabled:opacity-30"
              >
                다음 →
              </button>
            </div>
          </motion.div>

          {/* 이벤트 로그 */}
          <div className="rounded-[22px] border border-[var(--clawdev-line)] bg-[#070C18] p-5 font-mono text-[12px] leading-7 text-blue-100">
            {clawdevPhases.slice(0, selected + 1).map((phase) => (
              <p key={phase.key} className="truncate">
                <span className="text-[var(--clawdev-accent-2)]">
                  {phase.emits}
                </span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
