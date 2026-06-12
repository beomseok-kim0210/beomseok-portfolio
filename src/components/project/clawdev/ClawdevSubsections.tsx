"use client";

import { motion } from "framer-motion";
import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  clawdevInterfaces,
  clawdevLimitations,
  clawdevMemory,
  clawdevResilience,
  clawdevResults,
  clawdevTechGroups,
} from "@/data/clawdevCaseStudy";

// ─── Resilience: Gemini → Ollama 폴백 ─────────────────────────
export function ResilienceFallback() {
  return (
    <div className="rounded-[28px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-6 md:p-8">
      <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--clawdev-accent)]">
            PRIMARY
          </p>
          <p className="mt-3 text-xl font-bold text-white">
            {clawdevResilience.primary.name}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {clawdevResilience.primary.sub}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-1.5">
            {clawdevResilience.triggers.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#F87171]/30 bg-[#F87171]/10 px-2.5 py-1 text-[10px] font-semibold text-[#F87171]"
              >
                {t}
              </span>
            ))}
          </div>
          <motion.span
            animate={{ x: [-4, 4, -4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="text-2xl text-[var(--clawdev-warn)]"
          >
            →
          </motion.span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            on detect
          </span>
        </div>

        <div className="rounded-[20px] border border-[var(--clawdev-accent-2)]/30 bg-[var(--clawdev-accent-2)]/[0.06] p-5">
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--clawdev-accent-2)]">
            FALLBACK
          </p>
          <p className="mt-3 text-xl font-bold text-white">
            {clawdevResilience.fallback.name}
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            {clawdevResilience.fallback.sub}
          </p>
        </div>
      </div>
      <p className="mt-6 text-sm leading-relaxed text-slate-400">
        {clawdevResilience.behavior}
      </p>
    </div>
  );
}

// ─── Project Memory ───────────────────────────────────────────
export function ProjectMemory() {
  return (
    <div className="rounded-[28px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[13px] text-[var(--clawdev-accent)]">
          {clawdevMemory.path}
        </p>
        <span className="rounded-full border border-[var(--clawdev-accent-2)]/30 bg-[var(--clawdev-accent-2)]/10 px-3 py-1.5 text-[11px] font-bold text-[var(--clawdev-accent-2)]">
          continue mode
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {clawdevMemory.fields.map((field) => (
          <div
            key={field.label}
            className="rounded-[16px] border border-white/[0.08] bg-white/[0.03] p-4"
          >
            <p className="text-sm font-bold text-white">{field.label}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              {field.detail}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-slate-400">
        {clawdevMemory.continueMode}
      </p>
    </div>
  );
}

// ─── Dual Interface ───────────────────────────────────────────
export function DualInterface() {
  return (
    <div className="rounded-[28px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-6 md:p-8">
      <div className="grid gap-5 lg:grid-cols-2">
        {clawdevInterfaces.nodes.map((node) => (
          <div
            key={node.name}
            className="rounded-[20px] border border-white/10 bg-white/[0.03] p-6"
          >
            <p className="text-lg font-bold text-white">{node.name}</p>
            <p className="mt-1.5 font-mono text-[11px] text-[var(--clawdev-accent)]">
              {node.stack}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {node.detail}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-[18px] border border-dashed border-[var(--clawdev-line)] bg-[#070C18] p-5 text-center">
        <p className="text-sm font-semibold text-slate-300">
          두 인터페이스가 하나의{" "}
          <span className="font-mono text-[var(--clawdev-accent)]">
            {clawdevInterfaces.shared}
          </span>
          를 hooks로 공유
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {clawdevInterfaces.hooks.map((hook) => (
            <span
              key={hook}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] text-slate-400"
            >
              {hook}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Results & Limitations ────────────────────────────────────
export function ResultsAndLimitations() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {clawdevResults.map((result, i) => (
          <MotionBlock key={result.label} delay={i * 0.06}>
            <div className="h-full rounded-[24px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-6">
              <p className="text-[28px] font-bold leading-none tracking-[-0.03em] text-white">
                {result.value}
              </p>
              <p className="mt-3 text-sm font-bold text-[var(--clawdev-accent)]">
                {result.label}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
                {result.detail}
              </p>
            </div>
          </MotionBlock>
        ))}
      </div>
      <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6 md:p-8">
        <p className="text-sm font-bold tracking-[0.12em] text-slate-500">
          HONEST LIMITATIONS
        </p>
        <ul className="mt-4 space-y-2.5">
          {clawdevLimitations.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-slate-400">
              <span className="text-[var(--clawdev-warn)]">—</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Tech Stack ───────────────────────────────────────────────
export function ClawdevTechStack() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {clawdevTechGroups.map((group, i) => (
        <MotionBlock key={group.label} delay={i * 0.05}>
          <div className="h-full rounded-[24px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-6">
            <p className="text-[11px] font-bold tracking-[0.14em] text-[var(--clawdev-accent)]">
              {group.label.toUpperCase()}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </MotionBlock>
      ))}
    </div>
  );
}
