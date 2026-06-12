"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type Node = {
  id: string;
  title: string;
  sub?: string;
  x: number;
  y: number;
  kind: "spine" | "side" | "loop" | "output";
  accent?: string;
};

// 좌표는 0~100 공간 (SVG viewBox + div left/top % 가 동일 좌표계를 공유)
const nodes: Node[] = [
  { id: "prompt", title: "User Prompt", sub: "한 줄 요청", x: 50, y: 6, kind: "spine", accent: "#60A5FA" },
  { id: "orch", title: "Orchestrator", sub: "MultiAgentOrchestrator", x: 50, y: 22, kind: "spine" },
  { id: "memory", title: "Project Memory", sub: ".multi-agent/*.json", x: 84, y: 22, kind: "side" },
  { id: "chat", title: "Shared Chat Room", sub: "6 role agents · 토론·반응", x: 50, y: 40, kind: "spine" },
  { id: "spec", title: "Spec ×5 · Plan ×6", sub: "병렬 스펙 → 구현 계획", x: 50, y: 56, kind: "spine" },
  { id: "llm", title: "LLM Layer", sub: "Gemini→Ollama · Zod", x: 16, y: 72, kind: "side" },
  { id: "codegen", title: "Codegen", sub: "2-stage · context 누적", x: 50, y: 72, kind: "spine" },
  { id: "verify", title: "Workspace Verify", sub: "node · tsc · test", x: 50, y: 88, kind: "spine", accent: "#34D399" },
  { id: "repair", title: "Repair Loop", sub: "담당 추론 · 재생성", x: 84, y: 80, kind: "loop", accent: "#FBBF24" },
  { id: "output", title: "Verified Bundle", sub: "검증 통과 산출물", x: 50, y: 99, kind: "output", accent: "#34D399" },
];

const byId = (id: string) => nodes.find((n) => n.id === id)!;

// 패킷이 지나는 메인 데이터 경로 (spine)
const packetPath = ["prompt", "orch", "chat", "spec", "codegen", "verify", "output"].map(byId);

// 실선 연결 (방향성 흐름)
const links: Array<[string, string]> = [
  ["prompt", "orch"],
  ["orch", "chat"],
  ["chat", "spec"],
  ["spec", "codegen"],
  ["codegen", "verify"],
  ["verify", "output"],
  ["orch", "memory"],
  ["memory", "orch"],
  ["llm", "codegen"],
  ["llm", "chat"],
];

export function PromptFlowArchitecture() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: false });

  const accentFor = (n: Node) =>
    n.accent ??
    (n.kind === "side"
      ? "#A78BFA"
      : n.kind === "loop"
        ? "#FBBF24"
        : "#60A5FA");

  return (
    <div className="rounded-[28px] border border-[var(--clawdev-line)] bg-[#070C18] p-5 md:p-8">
      {/* ── 데스크탑: 2D 아키텍처 맵 ── */}
      <div
        ref={ref}
        className="relative mx-auto hidden aspect-[4/5] w-full max-w-[760px] lg:block"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          {links.map(([from, to]) => {
            const a = byId(from);
            const b = byId(to);
            const isFeedback =
              (from === "memory" && to === "orch") ||
              from === "llm";
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isFeedback ? "rgba(167,139,250,0.35)" : "rgba(96,165,250,0.3)"}
                strokeWidth="0.4"
                strokeDasharray={isFeedback ? "1.4 1.4" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {/* 수리 피드백 루프: verify → repair → codegen (점선 곡선) */}
          <path
            d={`M ${byId("verify").x} ${byId("verify").y} C 92 88, 92 78, ${byId("repair").x} ${byId("repair").y} S 70 70, ${byId("codegen").x + 6} ${byId("codegen").y}`}
            fill="none"
            stroke="rgba(251,191,36,0.4)"
            strokeWidth="0.4"
            strokeDasharray="1.4 1.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* 흐르는 프롬프트 패킷 */}
        {inView ? (
          <>
            <motion.div
              className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#60A5FA] shadow-[0_0_16px_4px_rgba(96,165,250,0.7)]"
              animate={{
                left: packetPath.map((n) => `${n.x}%`),
                top: packetPath.map((n) => `${n.y}%`),
              }}
              transition={{
                duration: 5.2,
                times: packetPath.map((_, i) => i / (packetPath.length - 1)),
                repeat: Infinity,
                repeatDelay: 0.5,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="pointer-events-none absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#60A5FA]/30 blur-[2px]"
              animate={{
                left: packetPath.map((n) => `${n.x}%`),
                top: packetPath.map((n) => `${n.y}%`),
              }}
              transition={{
                duration: 5.2,
                times: packetPath.map((_, i) => i / (packetPath.length - 1)),
                repeat: Infinity,
                repeatDelay: 0.5,
                ease: "easeInOut",
              }}
            />
          </>
        ) : null}

        {/* 노드들 */}
        {nodes.map((node) => {
          const accent = accentFor(node);
          return (
            <div
              key={node.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div
                className="w-[150px] rounded-[14px] border bg-[var(--clawdev-surface)] px-3.5 py-2.5 text-center"
                style={{
                  borderColor: `${accent}66`,
                  boxShadow: `0 0 0 1px ${accent}1f, 0 14px 40px rgba(0,0,0,0.4)`,
                }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: accent }}
                  />
                  <p className="text-[12px] font-bold text-white">{node.title}</p>
                </div>
                {node.sub ? (
                  <p className="mt-1 text-[10px] leading-tight text-slate-500">
                    {node.sub}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* 범례 */}
        <div className="absolute -bottom-2 left-0 flex gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-4 rounded-full bg-[#60A5FA]/60" /> data flow
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0 w-4 border-t border-dashed border-[#FBBF24]/70" /> feedback loop
          </span>
        </div>
      </div>

      {/* ── 모바일: 세로 스택 ── */}
      <div className="space-y-2.5 lg:hidden">
        {packetPath.map((node, i) => (
          <div key={node.id}>
            <div
              className="rounded-[14px] border bg-[var(--clawdev-surface)] px-4 py-3"
              style={{ borderColor: `${accentFor(node)}55` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: accentFor(node) }}
                />
                <p className="text-sm font-bold text-white">{node.title}</p>
              </div>
              {node.sub ? (
                <p className="mt-1 text-[11px] text-slate-500">{node.sub}</p>
              ) : null}
            </div>
            {i < packetPath.length - 1 ? (
              <div className="flex justify-center py-1 text-[var(--clawdev-accent)]">
                ↓
              </div>
            ) : null}
          </div>
        ))}
        <div className="rounded-[14px] border border-dashed border-[#FBBF24]/40 bg-white/[0.02] px-4 py-3">
          <p className="text-[11px] text-slate-400">
            <span className="font-semibold text-[#FBBF24]">+ 사이드 시스템</span> ·
            Project Memory ↔ Orchestrator · LLM Layer(Gemini→Ollama·Zod) → Codegen ·
            Verify 실패 시 Repair Loop → Codegen
          </p>
        </div>
      </div>
    </div>
  );
}
