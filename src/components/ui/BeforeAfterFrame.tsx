"use client";

import { useState } from "react";

type BeforeAfterFrameProps = {
  beforeSrc?: string;
  afterSrc?: string;
  compact?: boolean;
  beforePosition?: string;
  afterPosition?: string;
};

export function BeforeAfterFrame({
  beforeSrc,
  afterSrc,
  compact = false,
  beforePosition = "center",
  afterPosition = "center",
}: BeforeAfterFrameProps) {
  const [value, setValue] = useState(52);
  const beforeStyle = beforeSrc
    ? {
        backgroundImage: `url(${beforeSrc})`,
        backgroundSize: "cover",
        backgroundPosition: beforePosition,
        backgroundRepeat: "no-repeat",
      }
    : undefined;
  const afterStyle = afterSrc
    ? {
        backgroundImage: `url(${afterSrc})`,
        backgroundSize: "cover",
        backgroundPosition: afterPosition,
        backgroundRepeat: "no-repeat",
      }
    : undefined;

  return (
    <div
      className={`relative aspect-video overflow-hidden border border-[rgba(185,137,121,0.24)] bg-white ${
        compact ? "rounded-[24px]" : "rounded-[24px] md:rounded-[36px]"
      }`}
    >
      <div
        className="absolute inset-0 bg-white"
        style={beforeStyle}
      >
        {!beforeSrc ? (
          <div className="absolute inset-8 rounded-[28px] bg-[#F7ECE8]" />
        ) : null}
        <span className="absolute left-6 top-6 text-xs font-bold tracking-[0.22em] text-slate-500">
          BEFORE
        </span>
      </div>
      <div
        className="absolute inset-0 bg-[linear-gradient(135deg,#F9EAE6,#FFF9F7)]"
        style={{
          clipPath: `inset(0 ${100 - value}% 0 0)`,
          ...afterStyle,
        }}
      >
        {!afterSrc ? (
          <div className="absolute inset-8 grid grid-cols-3 gap-3">
            <div className="rounded-[24px] bg-white/70" />
            <div className="rounded-[24px] bg-white/90" />
            <div className="rounded-[24px] bg-white/70" />
          </div>
        ) : null}
        <span className="absolute right-6 top-6 text-xs font-bold tracking-[0.22em] text-[#B98979]">
          AFTER
        </span>
      </div>
      <div
        className="absolute top-0 h-full w-px bg-slate-900/30"
        style={{ left: `${value}%` }}
      >
        <div className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]" />
      </div>
      <input
        aria-label="Compare before and after"
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="absolute inset-x-8 bottom-6"
      />
    </div>
  );
}
