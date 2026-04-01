"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/cn";

type AnimatedCardProps = {
  children: React.ReactNode;
  className?: string;
  index?: number;
};

export function AnimatedCard({ children, className, index = 0 }: AnimatedCardProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  const delay = Math.min(index * 0.05, 0.35);

  return (
    <motion.div
      className={cn("h-full", className)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px", amount: 0.15 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
