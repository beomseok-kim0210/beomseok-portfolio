"use client";

import { motion, useReducedMotion } from "framer-motion";

const armiNodes = [
  { id: "voice", label: "VOICE", x: 9, y: 50, z: 0 },
  { id: "stt", label: "STT", x: 28, y: 34, z: 1 },
  { id: "agent", label: "LANGGRAPH", x: 50, y: 50, z: 2 },
  { id: "memory", label: "MEMORY", x: 50, y: 78, z: 0 },
  { id: "tool", label: "TOOL", x: 72, y: 32, z: 1 },
  { id: "action", label: "ACTION", x: 91, y: 50, z: 0 },
];

const armiEdges = [
  ["voice", "stt"],
  ["stt", "agent"],
  ["agent", "memory"],
  ["memory", "agent"],
  ["agent", "tool"],
  ["tool", "action"],
];

function node(id: string) {
  return armiNodes.find((item) => item.id === id)!;
}

export function ArmiSystemVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#02060d] shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(168,217,52,0.08),transparent_28%),radial-gradient(circle_at_74%_22%,rgba(59,130,246,0.10),transparent_24%)]" />
      <div
        className="absolute inset-x-[-10%] bottom-[-32%] h-[72%] opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,217,52,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(168,217,52,.13) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          transform: "perspective(520px) rotateX(64deg)",
          transformOrigin: "center top",
          maskImage: "linear-gradient(to bottom, black, transparent 82%)",
        }}
      />

      <div className="relative flex min-h-[500px] flex-col px-5 py-5 sm:px-8 sm:py-7 md:min-h-[570px]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-[#a8d934] sm:text-[11px]">
              ARMI / LIVE SYSTEM
            </p>
            <p className="mt-2 max-w-[520px] text-[13px] leading-relaxed text-white/45 sm:text-[14px]">
              Natural language becomes a stateful agent decision, then a real device action.
            </p>
          </div>
          <div className="hidden items-center gap-2 font-mono text-[10px] text-white/35 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a8d934] shadow-[0_0_12px_#a8d934]" />
            SIGNAL ACTIVE
          </div>
        </div>

        <div className="relative mt-8 flex-1 [perspective:1000px]">
          <motion.div
            className="absolute inset-0"
            animate={reduceMotion ? undefined : { rotateX: [1, -1, 1], rotateY: [-1.2, 1.2, -1.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <filter id="armi-glow">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {armiEdges.map(([from, to], index) => {
                const a = node(from);
                const b = node(to);
                return (
                  <g key={`${from}-${to}`}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="rgba(255,255,255,.13)"
                      strokeWidth="0.22"
                      vectorEffect="non-scaling-stroke"
                    />
                    <motion.line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#a8d934"
                      strokeWidth="0.42"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      filter="url(#armi-glow)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={
                        reduceMotion
                          ? { pathLength: 1, opacity: 0.8 }
                          : { pathLength: [0, 0.24, 0.24, 0], pathOffset: [0, 0.2, 0.76, 1], opacity: [0, 1, 1, 0] }
                      }
                      transition={{ duration: 3.8, delay: index * 0.42, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </g>
                );
              })}
            </svg>

            {armiNodes.map((item, index) => (
              <motion.div
                key={item.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: `translate(-50%, -50%) translateZ(${item.z * 22}px)`,
                }}
                animate={reduceMotion ? undefined : { y: [0, index % 2 ? -5 : 5, 0] }}
                transition={{ duration: 4.5 + index * 0.25, repeat: Infinity, ease: "easeInOut" }}
              >
                <div
                  className={
                    item.id === "agent"
                      ? "relative min-w-[112px] rounded-2xl border border-[#a8d934]/70 bg-[#0d160b]/90 px-4 py-4 text-center shadow-[0_0_50px_rgba(168,217,52,.18)] sm:min-w-[148px]"
                      : "relative min-w-[76px] rounded-xl border border-white/15 bg-[#08101b]/90 px-3 py-3 text-center shadow-[0_18px_45px_rgba(0,0,0,.35)] sm:min-w-[96px]"
                  }
                >
                  <span
                    className={
                      item.id === "agent"
                        ? "font-mono text-[10px] font-semibold tracking-[0.12em] text-[#d7ff70] sm:text-[11px]"
                        : "font-mono text-[9px] tracking-[0.12em] text-white/70 sm:text-[10px]"
                    }
                  >
                    {item.label}
                  </span>
                  <span
                    className={
                      item.id === "agent"
                        ? "absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#a8d934] shadow-[0_0_18px_#a8d934]"
                        : "absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-blue-400/80 shadow-[0_0_12px_#60a5fa]"
                    }
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="mt-4 grid grid-cols-3 border-t border-white/10 pt-4 font-mono text-[9px] tracking-[0.08em] text-white/30 sm:text-[10px]">
          <span>INPUT / VOICE</span>
          <span className="text-center">STATE / REDIS · CHROMA</span>
          <span className="text-right">OUTPUT / ROBOT</span>
        </div>
      </div>
    </div>
  );
}

const joints = [
  [50, 15],
  [50, 27],
  [38, 34],
  [31, 49],
  [26, 65],
  [62, 34],
  [69, 49],
  [74, 65],
  [43, 55],
  [41, 73],
  [39, 91],
  [57, 55],
  [59, 73],
  [61, 91],
] as const;

const bones = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 5],
  [5, 6],
  [6, 7],
  [1, 8],
  [8, 9],
  [9, 10],
  [1, 11],
  [11, 12],
  [12, 13],
  [8, 11],
] as const;

export function HangaraeSpatialVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#dfe3ea] bg-[#f8f9fb] shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "linear-gradient(rgba(79,70,229,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,.055) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "radial-gradient(circle at 58% 48%, black 28%, transparent 76%)",
        }}
      />
      <div className="relative grid min-h-[540px] gap-0 md:grid-cols-[0.86fr_1.14fr]">
        <div className="flex flex-col justify-between border-b border-[#e3e6ec] p-6 md:border-b-0 md:border-r md:p-8">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-indigo-600 sm:text-[11px]">
              HANGARAE / SPATIAL VISION
            </p>
            <h3 className="mt-5 max-w-[390px] text-[clamp(28px,3vw,42px)] font-semibold leading-[1.02] tracking-[-0.045em] text-[#15171b]">
              Pixels become
              <br />
              measurable movement.
            </h3>
            <p className="mt-5 max-w-[380px] text-[14px] leading-7 text-slate-500">
              Pose keypoints and depth are fused into 3D coordinates so feedback can follow the body, not just the screen.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#e1e4ea] bg-[#e1e4ea]">
            <div className="bg-white p-4">
              <p className="font-mono text-[9px] tracking-[0.14em] text-slate-400">MODEL EVAL</p>
              <p className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[#15171b]">0.872 → 0.988</p>
              <p className="mt-1 text-[11px] text-slate-400">mAP50</p>
            </div>
            <div className="bg-white p-4">
              <p className="font-mono text-[9px] tracking-[0.14em] text-slate-400">EDGE TARGET</p>
              <p className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[#15171b]">Jetson</p>
              <p className="mt-1 text-[11px] text-slate-400">Nano</p>
            </div>
          </div>
        </div>

        <div className="relative min-h-[390px] overflow-hidden p-5 sm:p-8">
          <div className="absolute left-6 top-6 flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] text-indigo-500/70">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            DEPTH + POSE / TRACKING
          </div>

          <svg viewBox="0 0 100 110" className="absolute inset-x-[10%] bottom-[3%] top-[12%] h-[82%] w-[80%] overflow-visible">
            <defs>
              <filter id="hangarae-glow">
                <feGaussianBlur stdDeviation="0.65" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <ellipse cx="50" cy="100" rx="31" ry="5" fill="rgba(79,70,229,.06)" />
            <path d="M12 97 L50 104 L88 97" fill="none" stroke="rgba(79,70,229,.13)" strokeWidth="0.5" />
            <path d="M19 86 L50 92 L81 86" fill="none" stroke="rgba(79,70,229,.09)" strokeWidth="0.4" />

            {bones.map(([a, b], index) => (
              <motion.line
                key={index}
                x1={joints[a][0]}
                y1={joints[a][1]}
                x2={joints[b][0]}
                y2={joints[b][1]}
                stroke="#4f46e5"
                strokeWidth="1.15"
                strokeLinecap="round"
                filter="url(#hangarae-glow)"
                initial={{ opacity: 0.18 }}
                animate={reduceMotion ? { opacity: 0.82 } : { opacity: [0.35, 0.95, 0.35] }}
                transition={{ duration: 2.6, delay: index * 0.08, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}

            {joints.map(([x, y], index) => (
              <motion.g
                key={index}
                animate={reduceMotion ? undefined : { y: [0, index % 2 ? -0.8 : 0.8, 0] }}
                transition={{ duration: 2.8 + index * 0.08, repeat: Infinity, ease: "easeInOut" }}
              >
                <circle cx={x} cy={y} r="2.2" fill="#ffffff" stroke="#4f46e5" strokeWidth="0.75" />
                <circle cx={x} cy={y} r="0.75" fill="#4f46e5" />
              </motion.g>
            ))}

            {[22, 29, 35, 65, 72, 78].map((x, index) => (
              <motion.circle
                key={x}
                cx={x}
                cy={28 + (index % 3) * 18}
                r="0.65"
                fill="#818cf8"
                animate={reduceMotion ? undefined : { opacity: [0.18, 0.75, 0.18], r: [0.5, 0.9, 0.5] }}
                transition={{ duration: 2.2, delay: index * 0.24, repeat: Infinity }}
              />
            ))}
          </svg>

          <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-2 font-mono text-[8px] tracking-[0.08em] text-slate-400 sm:text-[9px]">
            <span>X / 0.382</span>
            <span className="text-center">Y / 0.714</span>
            <span className="text-right">Z / 1.26m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
