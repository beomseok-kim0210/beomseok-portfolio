"use client";

import { motion } from "framer-motion";

const nodes = [
  { label: "Multi-Agent Workflow", x: 50, y: 14 },
  { label: "AI Search", x: 22, y: 30 },
  { label: "RAG", x: 76, y: 32 },
  { label: "Prompt Engineering", x: 34, y: 58 },
  { label: "Agent Architecture", x: 64, y: 58 },
  { label: "Code Generation", x: 18, y: 78 },
  { label: "Verification Loop", x: 78, y: 80 },
  { label: "Workflow Design", x: 50, y: 86 },
  { label: "Project Memory", x: 14, y: 50 },
  { label: "Dynamic Debate", x: 86, y: 50 },
];

const edges = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [3, 4],
  [0, 4],
  [6, 7],
  [8, 3],
  [9, 4],
];

export function KnowledgeGraph() {
  return (
    <div className="relative mx-auto mt-20 aspect-[16/9] w-full max-w-[980px] rounded-[40px] border border-slate-200 bg-white shadow-soft">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {edges.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={nodes[from].x}
            y1={nodes[from].y}
            x2={nodes[to].x}
            y2={nodes[to].y}
            stroke="#CBD5E1"
            strokeWidth="0.35"
          />
        ))}
      </svg>
      {nodes.map((node, index) => (
        <motion.div
          key={node.label}
          animate={{ y: [0, index % 2 === 0 ? -5 : 4, 0] }}
          transition={{
            duration: 8 + index * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-[#F8FAFC] px-5 py-3 text-center shadow-soft"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <p className="small-label whitespace-nowrap text-slate-700">
            {node.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
