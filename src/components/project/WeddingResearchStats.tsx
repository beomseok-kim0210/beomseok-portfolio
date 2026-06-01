"use client";

import { motion } from "framer-motion";
import { weddingResearchStats } from "@/data/weddingResearch";

export function WeddingResearchStats() {
  return (
    <section className="bg-[#FAFAFA] py-12 md:py-16">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {weddingResearchStats.map((stat, index) => (
            <motion.article
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.05 }}
              className="rounded-[32px] border border-[#E5E7EB] bg-white/80 p-7 backdrop-blur"
            >
              <p className="small-label text-[#B98979]">{stat.label}</p>
              <p className="mt-5 text-4xl font-bold leading-none tracking-[-0.04em] text-[#111827]">
                {stat.value}
              </p>
              <div className="mt-5 space-y-2">
                {stat.caption.map((line) => (
                  <p key={line} className="text-sm leading-6 text-slate-500">
                    {line}
                  </p>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
