"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type TrackingSkeletonProps = {
  animated?: boolean;
  compact?: boolean;
};

const points = {
  head: [180, 38],
  neck: [180, 82],
  leftShoulder: [124, 105],
  rightShoulder: [236, 105],
  leftElbow: [92, 166],
  rightElbow: [268, 166],
  leftWrist: [72, 226],
  rightWrist: [288, 226],
  spine: [180, 168],
  hip: [180, 238],
  leftKnee: [136, 304],
  rightKnee: [224, 304],
  leftAnkle: [122, 366],
  rightAnkle: [238, 366],
  leftToe: [92, 392],
  rightToe: [268, 392],
  leftHeel: [140, 392],
  rightHeel: [220, 392],
} satisfies Record<string, [number, number]>;

const pointEntries = Object.entries(points);
const lines: [keyof typeof points, keyof typeof points][] = [
  ["head", "neck"],
  ["neck", "leftShoulder"],
  ["neck", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["rightShoulder", "rightElbow"],
  ["leftElbow", "leftWrist"],
  ["rightElbow", "rightWrist"],
  ["neck", "spine"],
  ["spine", "hip"],
  ["hip", "leftKnee"],
  ["hip", "rightKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightKnee", "rightAnkle"],
  ["leftAnkle", "leftToe"],
  ["rightAnkle", "rightToe"],
  ["leftAnkle", "leftHeel"],
  ["rightAnkle", "rightHeel"],
];

export function TrackingSkeleton({
  animated = true,
  compact = false,
}: TrackingSkeletonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });
  const [activeCount, setActiveCount] = useState(animated ? 0 : pointEntries.length);

  useEffect(() => {
    if (!animated || !inView) return;
    pointEntries.forEach((_, index) => {
      window.setTimeout(() => setActiveCount(index + 1), index * 80);
    });
  }, [animated, inView]);

  const radius = compact ? 4 : 6;

  return (
    <div ref={ref} className="mx-auto max-w-[360px]">
      <svg viewBox="0 0 360 420" className="h-auto w-full">
        {lines.map(([from, to]) => {
          const fromPoint = points[from];
          const toPoint = points[to];
          return (
            <line
              key={`${from}-${to}`}
              x1={fromPoint[0]}
              y1={fromPoint[1]}
              x2={toPoint[0]}
              y2={toPoint[1]}
              stroke="rgba(148,163,184,0.35)"
              strokeWidth="2"
            />
          );
        })}
        {pointEntries.map(([key, [x, y]], index) => {
          const active = index < activeCount;
          return (
            <motion.circle
              key={key}
              cx={x}
              cy={y}
              r={radius}
              fill={active ? "#24C27A" : "#CBD5E1"}
              animate={active ? { scale: [0.8, 1.15, 1] } : undefined}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      </svg>
      {!compact ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["YOLOv11-M", "Redis", "Game Feedback", "AI Report"].map((chip, index) => (
            <motion.span
              key={chip}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={
                activeCount >= pointEntries.length
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : undefined
              }
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-600"
            >
              {chip}
            </motion.span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
