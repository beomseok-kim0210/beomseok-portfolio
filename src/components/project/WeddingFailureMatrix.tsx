"use client";

import { motion } from "framer-motion";
import { weddingFailureRows } from "@/data/weddingResearch";

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-[6px] w-24 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className="h-full rounded-full bg-[#B98979]"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-600">{value}/5</span>
    </div>
  );
}

export function WeddingFailureMatrix() {
  return (
    <div className="space-y-5">
      {weddingFailureRows.map((row, index) => (
        <motion.article
          key={row.model}
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          whileHover={{ y: -4 }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            delay: index * 0.06,
          }}
          className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur"
        >
          <div className="grid gap-6 xl:grid-cols-[180px_repeat(5,minmax(0,1fr))_1.5fr] xl:items-start">
            <div>
              <p className="small-label text-[#B98979]">Model</p>
              <h3 className="mt-4 text-2xl font-semibold text-[#111827]">
                {row.model}
              </h3>
            </div>
            <div>
              <p className="small-label text-slate-500">Body Prior</p>
              <div className="mt-4">
                <ScoreBar value={row.bodyPrior} />
              </div>
            </div>
            <div>
              <p className="small-label text-slate-500">Topology Flexibility</p>
              <div className="mt-4">
                <ScoreBar value={row.topologyFlexibility} />
              </div>
            </div>
            <div>
              <p className="small-label text-slate-500">Occlusion Robustness</p>
              <div className="mt-4">
                <ScoreBar value={row.occlusionRobustness} />
              </div>
            </div>
            <div>
              <p className="small-label text-slate-500">Volumetric Garment</p>
              <div className="mt-4">
                <ScoreBar value={row.volumetricGarment} />
              </div>
            </div>
            <div>
              <p className="small-label text-slate-500">
                Environment Reproducibility
              </p>
              <div className="mt-4">
                <ScoreBar value={row.environmentReproducibility} />
              </div>
            </div>
            <div>
              <p className="small-label text-slate-500">Failure Summary</p>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">
                {row.failureSummary}
              </p>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
