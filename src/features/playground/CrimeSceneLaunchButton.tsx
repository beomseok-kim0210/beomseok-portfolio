"use client";

import { ArrowUpRight, Fingerprint } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const CRIME_SCENE_URL = "https://crime-scene.vercel.app";
const LAUNCH_DELAY_MS = 520;

export function CrimeSceneLaunchButton({
  className = "",
}: {
  className?: string;
}) {
  const [launching, setLaunching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const launch = () => {
    if (launching) return;
    setLaunching(true);
    timeoutRef.current = setTimeout(() => {
      window.location.assign(CRIME_SCENE_URL);
    }, LAUNCH_DELAY_MS);
  };

  return (
    <>
      <button
        type="button"
        onClick={launch}
        disabled={launching}
        className={`inline-flex h-12 items-center gap-2 rounded-full bg-blue-500 px-6 text-sm font-semibold text-white outline-none transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-blue-400 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] disabled:cursor-wait motion-reduce:transform-none motion-reduce:transition-none ${className}`}
      >
        체험하기 <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
      </button>

      <div
        aria-hidden={!launching}
        aria-live="polite"
        className={`pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-[#050914]/95 text-white transition-opacity duration-500 motion-reduce:transition-none ${
          launching ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className={`text-center transition-[opacity,transform] delay-100 duration-500 motion-reduce:transition-none ${
          launching ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}>
          <Fingerprint aria-hidden="true" className="mx-auto h-10 w-10 text-blue-300" />
          <p className="cinematic-label mt-6 text-blue-300">Crime Scene</p>
          <p className="mt-3 text-xl font-semibold">수사를 시작합니다</p>
        </div>
      </div>
    </>
  );
}
