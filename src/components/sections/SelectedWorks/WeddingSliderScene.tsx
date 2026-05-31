"use client";

import { useState } from "react";

export function WeddingSliderScene() {
  const [value, setValue] = useState(52);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      <div className="w-[85vw] max-w-[1500px]">
        <div className="relative aspect-video overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-[0_40px_120px_rgba(17,24,39,0.12)]">
          <div className="absolute inset-0 bg-[#F2E8E6] p-10">
            <p className="cinematic-label text-rose-500">Before</p>
            <div className="mt-16 h-2/3 rounded-[30px] bg-white/60" />
          </div>
          <div
            className="absolute inset-0 overflow-hidden bg-[#FFF9F8] p-10"
            style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
          >
            <p className="cinematic-label text-blue-600">After AI Recommendation</p>
            <div className="mt-16 grid h-2/3 grid-cols-3 gap-5">
              <div className="rounded-[30px] bg-white shadow-soft" />
              <div className="rounded-[30px] bg-white shadow-soft" />
              <div className="rounded-[30px] bg-white shadow-soft" />
            </div>
          </div>
          <div
            className="absolute top-0 h-full w-px bg-slate-900/50"
            style={{ left: `${value}%` }}
          >
            <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white shadow-soft" />
          </div>
          <input
            aria-label="Compare before and after AI recommendation"
            type="range"
            min="18"
            max="82"
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
            className="absolute inset-x-10 bottom-8"
          />
        </div>
      </div>
    </div>
  );
}
