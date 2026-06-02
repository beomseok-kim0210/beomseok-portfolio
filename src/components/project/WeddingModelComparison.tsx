"use client";

import { motion } from "framer-motion";
import {
  weddingComparisonNote,
  weddingComparisonRows,
} from "@/data/weddingResearch";

export function WeddingModelComparison() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white/75 backdrop-blur">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-[14px] text-[#111827]">
          <thead className="bg-[#111827] text-white">
            <tr>
              {[
                "Model",
                "Year",
                "Representation",
                "Body Prior",
                "Published Metric",
                "Volumetric Dress Fit",
                "Portfolio Decision",
              ].map((label) => (
                <th key={label} className="px-5 py-[18px] font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody
            viewport={{ once: true, margin: "-80px" }}
          >
            {weddingComparisonRows.map((row, index) => (
              <motion.tr
                key={row.model}
                initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.06 }}
                className="align-top"
              >
                <td className="border-b border-[#E5E7EB] px-5 py-5 font-semibold">
                  {row.model}
                </td>
                <td className="border-b border-[#E5E7EB] px-5 py-5 text-slate-600">
                  {row.year}
                </td>
                <td className="border-b border-[#E5E7EB] px-5 py-5 text-slate-600">
                  {row.representation}
                </td>
                <td className="border-b border-[#E5E7EB] px-5 py-5 text-slate-600">
                  {row.bodyPrior}
                </td>
                <td className="border-b border-[#E5E7EB] px-5 py-5 text-slate-600">
                  {row.publishedMetric}
                </td>
                <td className="border-b border-[#E5E7EB] px-5 py-5 text-slate-600">
                  {row.volumetricDressFit}
                </td>
                <td className="border-b border-[#E5E7EB] px-5 py-5 text-slate-600">
                  {row.portfolioDecision}
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
      <div className="border-t border-[#E5E7EB] px-6 py-5">
        <p className="small-label text-[#B98979]">Note</p>
        <p className="project-caption mt-3">
          {weddingComparisonNote}
        </p>
      </div>
    </div>
  );
}
