"use client";

import { motion } from "framer-motion";
import { Terminal, Cpu, ArrowRight } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { y: 25, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 90, damping: 14 },
  },
};

export default function HeroText() {

  return (
    <div className="absolute inset-0 flex flex-col justify-between items-center z-10 px-6 py-12 pointer-events-none select-none">
      {/* Top Telemetry Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 0.7 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-6xl flex justify-between items-center text-xxs font-mono tracking-widest text-[#00f0ff] uppercase"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 animate-pulse" />
          <span>system: active</span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5" />
          <span>node: core-01</span>
        </div>
      </motion.div>

      {/* Main Centered Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center text-center max-w-4xl my-auto pointer-events-auto"
      >
        {/* Glowing Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f0ff]/[0.05] border border-[#00f0ff]/[0.15] text-[#00f0ff] text-xxs font-mono tracking-widest uppercase mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
          agentic network active
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-white mb-6 select-text leading-[0.9]"
        >
          DEV
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-[#00f0ff] to-[#bf5af2] drop-shadow-[0_0_35px_rgba(0,240,255,0.2)]">
            INT
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.h2
          variants={itemVariants}
          className="text-base sm:text-lg md:text-xl font-semibold tracking-wider text-gray-400 font-mono uppercase mb-8 max-w-2xl"
        >
          Cognitive Integration Node
        </motion.h2>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-sm sm:text-base text-gray-500 max-w-lg leading-relaxed mb-10 select-text"
        >
          Deploy self-assembling data pipelines, custom AI agents, and secure protocol sync layers globally at sub-millisecond speeds.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="flex gap-4">
          <button className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#bf5af2] text-black font-bold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(191,90,242,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer">
            Initialize Core
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </motion.div>
      </motion.div>

      {/* Bottom Status Ticker */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 0.4 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full max-w-6xl flex justify-between items-center text-[10px] font-mono text-gray-600 uppercase"
      >
        <span>lat: 0.08ms</span>
        <span>protocol: hyper-sync v4.2</span>
        <span>shards: stable</span>
      </motion.div>
    </div>
  );
}
