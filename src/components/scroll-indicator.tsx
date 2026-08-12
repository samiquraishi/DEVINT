"use client";

import { motion } from "framer-motion";

interface ScrollIndicatorProps {
  className?: string;
}

export default function ScrollIndicator({ className = "" }: ScrollIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none mix-blend-difference ${className}`}
    >
      {/* 2D Cylinder (Capsule outline) with Lighter Glassmorphism */}
      <div className="relative w-[18px] h-[32px] rounded-full border border-white/15 bg-white/[0.02] backdrop-blur-[1px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)]">
        {/* Bouncing dot wheel - Centered with increased margins to prevent border collision */}
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[7px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm"
        />
      </div>
    </motion.div>
  );
}
