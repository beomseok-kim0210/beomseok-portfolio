"use client";

import { motion } from "framer-motion";

const nodes = [
  {
    title: "ARMI",
    label: "Voice AI",
    description: "Robot Care",
    className: "left-[70px] top-[72px] h-[92px] w-[180px]",
    duration: 9,
  },
  {
    title: "행가래",
    label: "Rehabilitation",
    description: "Sensor AI",
    className: "right-[24px] top-[104px] h-[92px] w-[170px]",
    duration: 11,
  },
  {
    title: "Wedding AI",
    label: "Generative AI",
    description: "Decision Support",
    className: "bottom-[120px] left-[26px] h-[92px] w-[190px]",
    duration: 13,
  },
  {
    title: "Claw Dev",
    label: "Multi-Agent",
    description: "AI Lab",
    className: "bottom-[78px] right-[54px] h-[92px] w-[170px]",
    duration: 15,
  },
];

export function HeroEcosystem() {
  return (
    <div className="relative mx-auto h-[320px] w-[320px] scale-90 sm:scale-100 md:h-[440px] md:w-[440px] lg:h-[520px] lg:w-[520px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 520">
        {[120, 175, 225].map((r) => (
          <circle
            key={r}
            cx="260"
            cy="260"
            r={r}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1"
            opacity="0.45"
          />
        ))}
        {[
          [160, 118],
          [410, 150],
          [120, 350],
          [380, 392],
        ].map(([x, y]) => (
          <line
            key={`${x}-${y}`}
            x1="260"
            y1="260"
            x2={x}
            y2={y}
            stroke="#CBD5E1"
            strokeWidth="1"
            opacity="0.45"
          />
        ))}
      </svg>
      <motion.div
        animate={{ y: [0, -4, 0], scale: [1, 1.01, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-1/2 flex h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#E2E8F0] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.1)]"
      >
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-400">Center</p>
          <p className="mt-2 text-2xl font-bold">Human</p>
        </div>
      </motion.div>
      {nodes.map((node, index) => (
        <motion.div
          key={node.title}
          animate={{ y: [0, -6, 0] }}
          whileHover={{
            scale: 1.04,
            boxShadow: "0 34px 90px rgba(15,23,42,0.14)",
          }}
          transition={{
            duration: node.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.2,
          }}
          className={`group absolute hidden rounded-[28px] border border-[rgba(226,232,240,0.95)] bg-white/80 p-5 shadow-[0_28px_70px_rgba(15,23,42,0.1)] backdrop-blur-xl md:block ${node.className}`}
        >
          <p className="text-xs font-semibold text-slate-400">{node.label}</p>
          <p className="mt-2 text-[22px] font-bold leading-none">{node.title}</p>
          <p className="mt-2 text-xs text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
            {node.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
