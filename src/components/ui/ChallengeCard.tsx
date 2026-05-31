"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Challenge } from "@/types/portfolio";

type ChallengeCardProps = {
  challenge: Challenge;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
};

export function ChallengeCard({
  challenge,
  index,
  isOpen,
  onToggle,
}: ChallengeCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className={`min-h-[180px] w-full rounded-[28px] border p-6 text-left transition-colors ${
        isOpen
          ? "border-slate-300 bg-white shadow-soft"
          : "border-slate-200 bg-[#FAFAFA] hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="small-label mb-5 text-blue-600">
            {String(index + 1).padStart(2, "0")} · {challenge.shortLabel}
          </p>
          <h3 className="text-[22px] font-semibold leading-tight md:text-2xl">
            {challenge.title}
          </h3>
        </div>
        <span className="mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full border border-slate-200 bg-white">
          <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </span>
      </div>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0, filter: "blur(8px)" }}
            animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
            exit={{ height: 0, opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
              <div className="col-span-full mb-2 grid grid-cols-4 gap-2">
                {["Problem", "Investigation", "Solution", "Result"].map(
                  (step, stepIndex) => (
                    <div key={step}>
                      <div className="mb-2 h-1 overflow-hidden rounded-full bg-slate-200">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            duration: 0.8,
                            delay: stepIndex * 0.08,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="h-full origin-left rounded-full bg-blue-600"
                        />
                      </div>
                      <p className="text-[11px] font-medium text-slate-500">
                        {step}
                      </p>
                    </div>
                  ),
                )}
              </div>
              {[
                ["Problem", challenge.problem],
                ["Investigation", challenge.investigation],
                ["Solution", challenge.solution],
                ["Result", challenge.result],
              ].map(([label, text]) => (
                <div key={label} className="rounded-[24px] bg-[#FAFAFA] p-5">
                  <p className="small-label text-blue-600">{label}</p>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    {text}
                  </p>
                </div>
              ))}
              <div className="col-span-full flex flex-wrap gap-2 pt-2">
                {challenge.tech.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </button>
  );
}
