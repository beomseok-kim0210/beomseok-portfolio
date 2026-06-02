"use client";

import { useState } from "react";

type ArmiMediaPlaceholderProps = {
  src?: string;
  alt: string;
  className?: string;
  mediaType?: "image" | "video";
  mediaFit?: "cover" | "contain";
};

export function ArmiMediaPlaceholder({
  src,
  alt,
  className = "",
  mediaType = "image",
  mediaFit = "cover",
}: ArmiMediaPlaceholderProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-[32px] border border-[#E2E8F0] bg-[linear-gradient(135deg,#F8FAFC,#E2E8F0)] p-8 text-center ${className}`}
      >
        <div>
          <p className="small-label text-slate-500">Placeholder</p>
          <p className="mt-4 text-xl font-semibold text-[#111827]">
            Upload screen capture here
          </p>
        </div>
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <video
        src={src}
        aria-label={alt}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className={`rounded-[32px] border border-[#E2E8F0] bg-[linear-gradient(135deg,#F8FAFC,#E2E8F0)] ${
          mediaFit === "contain" ? "object-contain" : "object-cover"
        } ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`rounded-[32px] border border-[#E2E8F0] bg-[linear-gradient(135deg,#F8FAFC,#E2E8F0)] ${
        mediaFit === "contain" ? "object-contain" : "object-cover"
      } ${className}`}
    />
  );
}
