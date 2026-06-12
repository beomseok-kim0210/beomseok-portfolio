"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { clawdevAgents } from "@/data/clawdevCaseStudy";

export function AgentTeamRoom() {
  const [active, setActive] = useState<string>(clawdevAgents[0].id);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {clawdevAgents.map((agent) => {
        const isActive = active === agent.id;
        return (
          <motion.button
            key={agent.id}
            type="button"
            onMouseEnter={() => setActive(agent.id)}
            onClick={() => setActive(agent.id)}
            animate={{ opacity: isActive ? 1 : 0.62 }}
            transition={{ duration: 0.3 }}
            className="rounded-[24px] border bg-[var(--clawdev-surface)] p-6 text-left"
            style={{
              borderColor: isActive ? agent.accent : "rgba(148,163,184,0.14)",
              boxShadow: isActive ? `0 24px 80px ${agent.accent}1f` : "none",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: agent.accent }}
                />
                <p className="text-lg font-bold text-white">{agent.role}</p>
              </div>
              <span className="text-[11px] font-semibold tracking-[0.06em] text-slate-500">
                {agent.tagline}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {agent.objective}
            </p>

            <AnimatePresence initial={false}>
              {isActive ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <p className="text-[11px] font-bold tracking-[0.14em] text-slate-500">
                      RESPONSIBILITIES
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {agent.responsibilities.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm text-slate-300"
                        >
                          <span style={{ color: agent.accent }}>›</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-[11px] font-bold tracking-[0.14em] text-slate-500">
                      CONSTRAINTS
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {agent.constraints.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
