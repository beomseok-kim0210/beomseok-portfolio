"use client";

import { motion } from "framer-motion";

const points = [
  [50, 12],
  [42, 28],
  [58, 28],
  [38, 48],
  [62, 48],
  [34, 68],
  [66, 68],
  [50, 38],
  [45, 58],
  [55, 58],
  [44, 80],
  [56, 80],
  [30, 32],
  [70, 32],
  [25, 52],
  [75, 52],
  [40, 90],
  [60, 90],
];

const lines = [
  [0, 1],
  [0, 2],
  [1, 7],
  [2, 7],
  [7, 8],
  [7, 9],
  [8, 10],
  [9, 11],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [1, 12],
  [2, 13],
  [12, 14],
  [13, 15],
  [10, 16],
  [11, 17],
];

export function HangaraeMotionScene() {
  return (
    <div className="min-h-[100vh] px-6 py-28">
      <div className="content-grid grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="cinematic-label mb-8 text-blue-600">18 Point Tracking</p>
          <h3 className="story-title max-w-[760px]">
            움직임을 데이터로 바꾸고, 데이터는 다시 피드백이 됩니다.
          </h3>
        </div>
        <div className="relative aspect-[4/3] rounded-[36px] border border-emerald-100 bg-white p-8 shadow-soft">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            {lines.map(([from, to]) => (
              <line
                key={`${from}-${to}`}
                x1={points[from][0]}
                y1={points[from][1]}
                x2={points[to][0]}
                y2={points[to][1]}
                stroke="#94A3B8"
                strokeWidth="0.45"
              />
            ))}
            {points.map(([x, y], index) => (
              <motion.circle
                key={index}
                cx={x}
                cy={y}
                r="1.6"
                fill="#2563EB"
                animate={{ scale: [1, 1.18, 1], opacity: [0.65, 1, 0.65] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.04,
                }}
              />
            ))}
          </svg>
          <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
            {["YOLO", "Redis", "Realtime Feedback"].map((item) => (
              <div key={item} className="rounded-2xl bg-[#F7FFFB] px-4 py-3">
                <p className="small-label text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
