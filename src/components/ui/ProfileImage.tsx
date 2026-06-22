"use client";

import { useState } from "react";

type ProfileImageProps = {
  src: string;
  alt: string;
};

/**
 * 프로필 사진. 파일이 아직 없거나 로드 실패하면 안내 플레이스홀더로 대체해
 * 레이아웃이 깨지지 않게 한다. 부모가 aspect 비율·라운드·overflow를 정한다.
 */
export function ProfileImage({ src, alt }: ProfileImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-center">
        <span className="px-4 text-[14px] font-semibold text-slate-400">
          프로필 사진을 추가해주세요
          <br />
          <span className="text-[12px] font-normal text-slate-400">
            {src}
          </span>
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
