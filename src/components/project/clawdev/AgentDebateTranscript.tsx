"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { clawdevDebateScript } from "@/data/clawdevCaseStudy";

const reactionStyle = {
  support: { label: "support", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  refine: { label: "refine", color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  challenge: { label: "challenge", color: "#F87171", bg: "rgba(248,113,113,0.12)" },
} as const;

export function AgentDebateTranscript() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2, once: true });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    clawdevDebateScript.forEach((_, i) => {
      window.setTimeout(() => setShown(i + 1), 350 + i * 650);
    });
  }, [inView]);

  return (
    <div
      ref={ref}
      className="rounded-[28px] border border-[var(--clawdev-line)] bg-[#070C18] p-5 md:p-8"
    >
      <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
        <p className="text-sm font-bold text-white"># shared-room</p>
        <p className="text-[11px] text-slate-500">
          발언 순서 = hash(request) % 5 · 상호 참조 = msg-###
        </p>
      </div>

      <div className="space-y-3">
        {clawdevDebateScript.slice(0, shown).map((msg) => {
          const reaction = msg.reaction ? reactionStyle[msg.reaction] : null;
          return (
            <motion.div
              key={msg.msgId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold"
                  style={{ background: `${msg.accent}22`, color: msg.accent }}
                >
                  {msg.speaker}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {msg.msgId}
                </span>
                {msg.refs?.map((ref) => (
                  <span
                    key={ref}
                    className="flex items-center gap-1 font-mono text-[11px] text-[var(--clawdev-accent)]"
                  >
                    ↳ {ref}
                  </span>
                ))}
                {reaction ? (
                  <span
                    className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
                    style={{ background: reaction.bg, color: reaction.color }}
                  >
                    {reaction.label}
                  </span>
                ) : null}
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-200">
                {msg.content}
              </p>
            </motion.div>
          );
        })}

        {shown < clawdevDebateScript.length ? (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="px-4 py-2 text-xs text-slate-500"
          >
            agent is typing…
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
