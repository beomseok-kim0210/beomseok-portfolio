"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  clawdevLoopMeta,
  clawdevRepairInference,
  clawdevReviewRounds,
} from "@/data/clawdevCaseStudy";

const reactionStyle = {
  support: { color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  refine: { color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  challenge: { color: "#F87171", bg: "rgba(248,113,113,0.12)" },
} as const;

const statusStyle = {
  passed: { mark: "✓", color: "#34D399" },
  failed: { mark: "✗", color: "#F87171" },
  skipped: { mark: "–", color: "#94A3B8" },
} as const;

export function VerificationLoop() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25, once: true });
  const [step, setStep] = useState(0);

  // step: 0 idle, 1.. reveals each round's checks sequentially
  const totalSteps = clawdevReviewRounds.length;

  useEffect(() => {
    if (!inView) return;
    for (let i = 1; i <= totalSteps; i += 1) {
      window.setTimeout(() => setStep(i), 500 + (i - 1) * 1400);
    }
  }, [inView, totalSteps]);

  return (
    <div ref={ref} className="space-y-4">
      {/* 루프 흐름 라벨 */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
        {["draft", "peer review", "verify", "PM intervene", "revise", "repair"].map(
          (s, i, arr) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                {s}
              </span>
              {i < arr.length - 1 ? (
                <span className="text-[var(--clawdev-accent)]">→</span>
              ) : null}
            </span>
          ),
        )}
      </div>

      {/* 라운드 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {clawdevReviewRounds.map((round, index) => {
          const revealed = step >= index + 1;
          const reaction = reactionStyle[round.reaction];
          return (
            <motion.div
              key={round.round}
              animate={{ opacity: revealed ? 1 : 0.4 }}
              transition={{ duration: 0.5 }}
              className="rounded-[26px] border bg-[var(--clawdev-surface)] p-6"
              style={{
                borderColor: revealed
                  ? "var(--clawdev-line)"
                  : "rgba(148,163,184,0.12)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-[var(--clawdev-accent)]">
                    {round.round}
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">{round.title}</p>
                </div>
                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{ background: reaction.bg, color: reaction.color }}
                >
                  {round.reaction}
                </span>
              </div>

              {/* 리뷰어 노트 */}
              <div className="mt-4 rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold text-slate-500">
                  {round.reviewer} review
                </p>
                <p className="mt-1.5 font-mono text-[12px] leading-5 text-slate-300">
                  {round.note}
                </p>
              </div>

              {/* 검증 콘솔 */}
              <div className="mt-4 space-y-2 rounded-[16px] bg-[#070C18] p-4 font-mono text-[12px]">
                {round.checks.map((check, ci) => {
                  const st = statusStyle[check.status];
                  return (
                    <motion.div
                      key={check.name}
                      initial={{ opacity: 0 }}
                      animate={revealed ? { opacity: 1 } : { opacity: 0.3 }}
                      transition={{ delay: revealed ? ci * 0.22 : 0 }}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-slate-400">
                        <span className="text-slate-600">$ </span>
                        {check.command}
                      </span>
                      <span
                        className="flex shrink-0 items-center gap-1.5 font-bold"
                        style={{ color: st.color }}
                      >
                        {st.mark} {check.status}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <p className="mt-4 text-[13px] leading-relaxed text-slate-400">
                {round.outcome}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* 자율 수리 담당 추론 */}
      <div className="rounded-[26px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-white">
            Autonomous Repair — 실패 경로로 담당 추론
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
            <span className="rounded-full border border-white/10 px-2.5 py-1">
              {clawdevLoopMeta.reviewRounds}
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1">
              {clawdevLoopMeta.repairCycles}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {clawdevRepairInference.map((rule) => (
            <div
              key={rule.pattern}
              className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-4"
            >
              <p className="font-mono text-[12px] text-[var(--clawdev-accent)]">
                {rule.pattern}
              </p>
              <p className="mt-2 text-sm font-bold text-white">→ {rule.owner}</p>
              <p className="mt-1 text-[11px] text-slate-500">{rule.reason}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-slate-500">{clawdevLoopMeta.stall}</p>
      </div>
    </div>
  );
}
