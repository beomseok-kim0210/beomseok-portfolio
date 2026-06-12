"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { clawdevRetryMeta, clawdevSchemaRetry } from "@/data/clawdevCaseStudy";

const toneColor = {
  error: "#F87171",
  system: "#FBBF24",
  success: "#34D399",
} as const;

export function SchemaRetryTerminal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35, once: true });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    clawdevSchemaRetry.forEach((_, i) => {
      window.setTimeout(() => setShown(i + 1), 450 + i * 900);
    });
  }, [inView]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
      <div
        ref={ref}
        className="overflow-hidden rounded-[24px] border border-[var(--clawdev-line)] bg-[#070C18]"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <span className="h-3 w-3 rounded-full bg-[#F87171]" />
          <span className="h-3 w-3 rounded-full bg-[#FBBF24]" />
          <span className="h-3 w-3 rounded-full bg-[#34D399]" />
          <span className="ml-3 text-xs font-medium text-slate-500">
            structured-generation · retry loop
          </span>
        </div>
        <div className="space-y-4 p-5">
          {clawdevSchemaRetry.slice(0, shown).map((frame) => (
            <motion.div
              key={frame.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <p
                className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{ color: toneColor[frame.tone] }}
              >
                {frame.label}
              </p>
              <pre className="overflow-x-auto rounded-[14px] border border-white/[0.06] bg-black/40 p-4 font-mono text-[12px] leading-6 text-slate-300">
                {frame.lines.map((line) => (
                  <div
                    key={line}
                    className={
                      line.includes("✗") || line.startsWith("ZodError")
                        ? "text-[#F87171]"
                        : line.includes("✓")
                          ? "text-[#34D399]"
                          : line.startsWith(">")
                            ? "text-[#FBBF24]"
                            : ""
                    }
                  >
                    {line}
                  </div>
                ))}
              </pre>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {[
          { k: "Client", v: clawdevRetryMeta.client },
          { k: "Extract", v: clawdevRetryMeta.extract },
          { k: "Retries", v: clawdevRetryMeta.retries },
        ].map((row) => (
          <div
            key={row.k}
            className="rounded-[18px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-5"
          >
            <p className="text-[11px] font-bold tracking-[0.14em] text-[var(--clawdev-accent)]">
              {row.k.toUpperCase()}
            </p>
            <p className="mt-2 font-mono text-[12px] leading-5 text-slate-300">
              {row.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
