"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { clawdevAgents, clawdevHero } from "@/data/clawdevCaseStudy";

const bootLines = [
  "$ claw-dev --start",
  "› spinning up orchestrator…",
  "› registering 6 role agents…",
  "› shared chat room ready ✓",
];

export function ClawDevHero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: true });
  const [bootCount, setBootCount] = useState(0);
  const [agentsLit, setAgentsLit] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    bootLines.forEach((_, i) => {
      window.setTimeout(() => setBootCount(i + 1), i * 360);
    });
    clawdevAgents.forEach((_, i) => {
      window.setTimeout(() => setAgentsLit(i), bootLines.length * 360 + i * 140);
    });
  }, [inView]);

  return (
    <section ref={ref} className="pt-10 pb-24 md:pt-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="project-section-label text-[var(--clawdev-accent)]">
          {clawdevHero.eyebrow}
        </p>
        <h1 className="mt-7 max-w-[1040px] text-[34px] font-bold leading-[1.05] tracking-[-0.04em] text-white md:text-[60px]">
          {clawdevHero.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="project-body mt-8 max-w-[820px] text-slate-300">
          {clawdevHero.premise}
        </p>
        <p className="project-caption mt-4 max-w-[760px] text-slate-500">
          {clawdevHero.subPremise}
        </p>
      </motion.div>

      <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* 부팅 터미널 */}
        <div className="overflow-hidden rounded-[24px] border border-[var(--clawdev-line)] bg-[#070C18] p-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#F87171]" />
            <span className="h-3 w-3 rounded-full bg-[#FBBF24]" />
            <span className="h-3 w-3 rounded-full bg-[#34D399]" />
            <span className="ml-3 text-xs font-medium text-slate-500">claw-dev — boot</span>
          </div>
          <div className="mt-5 min-h-[132px] space-y-1.5 font-mono text-[13px] leading-6">
            {bootLines.slice(0, bootCount).map((line) => (
              <motion.p
                key={line}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className={
                  line.includes("✓")
                    ? "text-[var(--clawdev-accent-2)]"
                    : line.startsWith("$")
                      ? "text-white"
                      : "text-slate-400"
                }
              >
                {line}
              </motion.p>
            ))}
            {bootCount >= bootLines.length ? (
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
                className="inline-block text-[var(--clawdev-accent)]"
              >
                ▌
              </motion.span>
            ) : null}
          </div>
        </div>

        {/* 6 에이전트 점등 그리드 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {clawdevAgents.map((agent, i) => {
            const lit = i <= agentsLit;
            return (
              <motion.div
                key={agent.id}
                animate={{
                  opacity: lit ? 1 : 0.35,
                  scale: lit ? 1 : 0.97,
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[18px] border bg-[var(--clawdev-surface)] p-4"
                style={{
                  borderColor: lit ? agent.accent : "rgba(148,163,184,0.16)",
                  boxShadow: lit ? `0 0 0 1px ${agent.accent}30` : "none",
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: agent.accent }}
                />
                <p className="mt-3 text-base font-bold text-white">{agent.role}</p>
                <p className="mt-1 text-[11px] font-medium tracking-[0.04em] text-slate-500">
                  {agent.tagline}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 스탯 */}
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {clawdevHero.stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.08 }}
            className="rounded-[18px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-5"
          >
            <p className="text-[32px] font-bold leading-none tracking-[-0.04em] text-white">
              {stat.value}
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--clawdev-accent)]">
              {stat.label}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {stat.detail}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
