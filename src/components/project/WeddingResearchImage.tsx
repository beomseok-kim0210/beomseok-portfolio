"use client";

import { useState } from "react";

type WeddingResearchImageProps = {
  src: string;
  alt: string;
};

export function WeddingResearchImage({
  src,
  alt,
}: WeddingResearchImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-[28px] border border-[#E5E7EB] bg-white/80 p-8 text-center shadow-[0_32px_80px_rgba(15,23,42,0.08)]">
        <div>
          <p className="small-label text-[#B98979]">Image Placeholder</p>
          <p className="mt-5 text-xl font-semibold text-[#111827]">
            ECON success / failure comparison
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-500">{src}</p>
        </div>
      </div>
    );
  }

  return (
    // A plain img avoids Next image optimizer errors when the source is missing.
    // We can then switch to a local placeholder gracefully on the client.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-auto w-full rounded-[28px] border border-[#E5E7EB] bg-white object-cover shadow-[0_32px_80px_rgba(15,23,42,0.08)]"
    />
  );
}
