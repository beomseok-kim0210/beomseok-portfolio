"use client";

import { motion } from "framer-motion";
import {
  clawdevModelMeta,
  clawdevModelProfiles,
} from "@/data/clawdevCaseStudy";

const MAX_TEMP = 0.2;
const MAX_PREDICT = 3200;

export function ModelProfileMatrix() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)]">
        {/* 헤더 */}
        <div className="hidden grid-cols-[140px_1fr_1fr_minmax(0,1.2fr)] gap-4 border-b border-white/10 px-6 py-4 md:grid">
          <span className="text-[11px] font-bold tracking-[0.12em] text-slate-500">
            STAGE
          </span>
          <span className="text-[11px] font-bold tracking-[0.12em] text-slate-500">
            TEMPERATURE
          </span>
          <span className="text-[11px] font-bold tracking-[0.12em] text-slate-500">
            NUM_PREDICT
          </span>
          <span className="text-[11px] font-bold tracking-[0.12em] text-slate-500">
            NOTE
          </span>
        </div>

        {clawdevModelProfiles.map((row, index) => (
          <motion.div
            key={row.stage}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: index * 0.06 }}
            className="grid grid-cols-1 gap-3 border-b border-white/[0.06] px-6 py-5 last:border-b-0 md:grid-cols-[140px_1fr_1fr_minmax(0,1.2fr)] md:items-center md:gap-4"
            style={{
              background: row.highlight ? "rgba(96,165,250,0.06)" : "transparent",
            }}
          >
            <span className="font-mono text-sm font-bold text-white">
              {row.stage}
              {row.highlight ? (
                <span className="ml-2 rounded-full bg-[var(--clawdev-accent)] px-2 py-0.5 text-[9px] font-bold text-[#0B1120]">
                  KEY
                </span>
              ) : null}
            </span>

            {/* temperature bar */}
            <div className="flex items-center gap-3">
              <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(row.temperature / MAX_TEMP) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.06 }}
                  className="h-full rounded-full"
                  style={{ background: row.highlight ? "#60A5FA" : "#34D399" }}
                />
              </div>
              <span className="w-10 shrink-0 font-mono text-xs text-slate-300">
                {row.temperature.toFixed(2)}
              </span>
            </div>

            {/* numPredict bar */}
            <div className="flex items-center gap-3">
              <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(row.numPredict / MAX_PREDICT) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.06 }}
                  className="h-full rounded-full"
                  style={{ background: row.highlight ? "#60A5FA" : "#A78BFA" }}
                />
              </div>
              <span className="w-12 shrink-0 font-mono text-xs text-slate-300">
                {row.numPredict}
              </span>
            </div>

            <span className="text-xs leading-relaxed text-slate-500">
              {row.note}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="rounded-[20px] border border-[var(--clawdev-line)] bg-[var(--clawdev-surface)] p-5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[var(--clawdev-accent)]">
          MODEL FAMILIES
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {clawdevModelMeta.families.map((fam) => (
            <span
              key={fam}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-slate-300"
            >
              {fam}
            </span>
          ))}
        </div>
        <p className="mt-4 font-mono text-[11px] leading-5 text-slate-500">
          {clawdevModelMeta.resolver}
        </p>
      </div>
    </div>
  );
}
