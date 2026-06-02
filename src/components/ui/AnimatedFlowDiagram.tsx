"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type FlowNode = {
  id: string;
  label: string;
  description: string;
  tech: string[];
};

type AnimatedFlowDiagramProps = {
  nodes: FlowNode[];
};

const eventLogs = [
  "[voice.detected] patient request captured",
  "[speaker.verified] CAMPPlus similarity passed",
  "[agent.routed] intent mapped to care workflow",
  "[mission.created] robot task submitted",
  "[tablet.updated] realtime state delivered",
  "[watch.alert] nurse call delivered",
  "[care.closed] response loop completed",
];

export function AnimatedFlowDiagram({ nodes }: AnimatedFlowDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    nodes.forEach((_, index) => {
      window.setTimeout(() => setActiveIndex(index), index * 250);
    });
  }, [inView, nodes]);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[36px] border border-[rgba(96,165,250,0.24)] bg-[#0F1B2E] p-6 md:p-12"
    >
      <div className="hidden min-h-[360px] items-center justify-between gap-4 lg:flex">
        {nodes.map((node, index) => {
          const active = index <= activeIndex;
          return (
            <div key={node.id} className="relative flex flex-1 items-center">
              <motion.div
                initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                animate={
                  active
                    ? { opacity: 1, y: 0, filter: "blur(0px)" }
                    : { opacity: 0.5, y: 0, filter: "blur(0px)" }
                }
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className={`h-[140px] w-[140px] rounded-[28px] border p-5 ${
                  active
                    ? "border-[#60A5FA] bg-white/[0.08] shadow-[0_0_0_1px_rgba(96,165,250,0.35),0_24px_80px_rgba(37,99,235,0.25)]"
                    : "border-[rgba(148,163,184,0.24)] bg-white/[0.06]"
                }`}
              >
                <p className="step-label text-blue-300">
                  {node.id}
                </p>
                <p className="mt-4 text-[28px] font-bold leading-[1.3] text-white">{node.label}</p>
              </motion.div>
              {index < nodes.length - 1 ? (
                <div className="mx-3 h-px flex-1 bg-[rgba(96,165,250,0.2)]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: index < activeIndex ? 1 : 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full origin-left bg-[#60A5FA]"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:hidden">
        {nodes.map((node, index) => {
          const active = index <= activeIndex;
          return (
            <motion.div
              key={node.id}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 8 }}
              className={`w-full rounded-[24px] border p-5 ${
                active
                  ? "border-[#60A5FA] bg-white/[0.08]"
                  : "border-[rgba(148,163,184,0.24)] bg-white/[0.05]"
              }`}
            >
              <p className="step-label text-blue-300">
                {node.id}
              </p>
              <p className="mt-3 text-[28px] font-bold leading-[1.3] text-white">{node.label}</p>
              <p className="mt-2 text-[20px] leading-[1.6] text-slate-300">
                {node.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 min-h-24 rounded-[22px] bg-[rgba(2,6,23,0.4)] p-5 font-mono text-[13px] leading-7 text-blue-100">
        {eventLogs.slice(0, Math.max(activeIndex + 1, 1)).map((log) => (
          <p key={log}>{log}</p>
        ))}
      </div>
    </div>
  );
}
