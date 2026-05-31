"use client";

import { motion } from "framer-motion";

type ShowcaseMotionProps = {
  children: React.ReactNode;
  className?: string;
};

export function ShowcaseMotion({
  children,
  className = "",
}: ShowcaseMotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
