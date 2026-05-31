"use client";

import { motion, useReducedMotion } from "framer-motion";

type MotionBlockProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

export function MotionBlock({
  children,
  delay = 0,
  className = "",
}: MotionBlockProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion ? false : { opacity: 0, y: 34, filter: "blur(10px)" }
      }
      whileInView={
        reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
