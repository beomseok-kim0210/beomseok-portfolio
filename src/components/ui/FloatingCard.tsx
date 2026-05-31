"use client";

import { motion } from "framer-motion";
import type { FloatingProjectCard } from "@/types/portfolio";

type FloatingCardProps = FloatingProjectCard & {
  index: number;
};

export function FloatingCard({
  name,
  meta,
  icon: Icon,
  className,
  index,
}: FloatingCardProps) {
  const movement = index % 2 === 0 ? -3 : 3;

  return (
    <motion.div
      animate={{ y: [0, movement, 0] }}
      transition={{
        duration: 6 + index,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.4,
      }}
      className={`product-surface absolute w-[220px] rounded-[28px] p-5 ${className}`}
    >
      <Icon className="mb-7 h-7 w-7 text-blue-500" aria-hidden="true" />
      <p className="text-2xl font-semibold leading-none">{name}</p>
      <p className="small-label mt-3 opacity-60">{meta}</p>
    </motion.div>
  );
}
