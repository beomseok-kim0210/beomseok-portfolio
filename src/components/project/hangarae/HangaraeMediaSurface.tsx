"use client";

import { useState } from "react";

type HangaraeMediaSurfaceProps = {
  src?: string;
  alt: string;
  type?: "image" | "video";
  className?: string;
  fit?: "cover" | "contain";
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  preload?: "none" | "metadata" | "auto";
  caption?: string;
};

export function HangaraeMediaSurface({
  src,
  alt,
  type = "video",
  className = "",
  fit = "cover",
  autoPlay = true,
  loop = true,
  muted = true,
  controls = false,
  preload = "metadata",
  caption,
}: HangaraeMediaSurfaceProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-[32px] border border-[rgba(36,194,122,0.14)] bg-[linear-gradient(135deg,#0B1728,#13253A)] p-8 text-center text-white ${className}`}
      >
        <div>
          <p className="small-label text-emerald-200">Placeholder</p>
          <p className="mt-4 text-xl font-semibold">Add visual asset here</p>
          {caption ? <p className="mt-3 text-sm text-white/70">{caption}</p> : null}
        </div>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="space-y-3">
        <video
          src={src}
          aria-label={alt}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          preload={preload}
          playsInline
          onError={() => setFailed(true)}
          className={`rounded-[32px] border border-[rgba(36,194,122,0.14)] ${
            fit === "contain" ? "object-contain" : "object-cover"
          } ${className}`}
        />
        {caption ? <p className="text-sm text-slate-500">{caption}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className={`rounded-[32px] border border-[rgba(36,194,122,0.14)] ${
          fit === "contain" ? "object-contain" : "object-cover"
        } ${className}`}
      />
      {caption ? <p className="text-sm text-slate-500">{caption}</p> : null}
    </div>
  );
}
