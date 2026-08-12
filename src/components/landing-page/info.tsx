"use client";

import { motion } from "framer-motion";
import { Bot, Cpu, Network, ShieldCheck, Zap, Workflow } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  glowColor: string;
}

function FeatureCard({ icon, title, description, glowColor }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12] transition-all duration-300 overflow-hidden shadow-2xl h-full"
    >
      {/* Decorative gradient background hover glow */}
      <div 
        className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 pointer-events-none rounded-2xl blur-lg"
        style={{
          background: `radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), ${glowColor}15, transparent 60%)`
        }}
      />

      {/* Subtle corner light path */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-transparent to-transparent group-hover:from-${glowColor}/[0.1] rounded-tr-2xl transition-all duration-500`} />

      <div>
        {/* Icon Ring */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white group-hover:text-white group-hover:border-white/[0.2] transition-colors duration-300 mb-6">
          {icon}
        </div>

        {/* Text */}
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-white transition-colors duration-200">
          {title}
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 group-hover:text-white transition-colors duration-300 mt-auto">
        <span>Active Node</span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
      </div>
    </motion.div>
  );
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 80, damping: 15 },
  },
};

export default function InfoSection() {
  const features = [
    {
      icon: <Bot className="w-6 h-6 text-[#00f0ff]" />,
      title: "Agentic Orchestration",
      description: "Deploy distributed AI agents capable of auto-discovering API specifications, mapping payloads, and self-healing when schemas shift.",
      glowColor: "#00f0ff",
    },
    {
      icon: <Network className="w-6 h-6 text-[#bf5af2]" />,
      title: "Unified Pipelines",
      description: "Connect standard databases, Cloud stores, and modern Webhook endpoints into a single visual DAG mapping ecosystem with sub-50ms latency.",
      glowColor: "#bf5af2",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#30d158]" />,
      title: "Autonomous Compliance",
      description: "Enforce strict enterprise sandboxing. Built-in compliance logic dynamically filters sensitive inputs and encrypts PII at rest and in transit.",
      glowColor: "#30d158",
    },
    {
      icon: <Cpu className="w-6 h-6 text-[#ff9f0a]" />,
      title: "Edge Engine Velocity",
      description: "Run scripts directly at the data source edge. Next-generation compiler optimizes query logic prior to engine execution, reducing cloud compute overhead.",
      glowColor: "#ff9f0a",
    },
    {
      icon: <Zap className="w-6 h-6 text-[#0a84ff]" />,
      title: "Instant Live Sync",
      description: "Bidirectional sync pipelines execute instantly. Push changes globally and stream integration logs back to your control dashboard in real time.",
      glowColor: "#0a84ff",
    },
    {
      icon: <Workflow className="w-6 h-6 text-[#ff375f]" />,
      title: "Declarative Workflows",
      description: "Define integrations inside standard YAML configs. Treat pipelines as source code, versioned via Git and deployed automatically through CI/CD hooks.",
      glowColor: "#ff375f",
    },
  ];

  return (
    <section id="services-section" className="relative z-10 w-full bg-[#030303] px-6 md:px-12 py-24 border-t border-white/[0.03]">
      {/* Decorative vector background */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-[#bf5af2]/[0.02] to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-[#00f0ff]/[0.02] to-transparent blur-[150px] pointer-events-none -z-10" />

      <div className="w-full max-w-7xl mx-auto">
        {/* Header Block */}
        <div className="max-w-2xl mb-20">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#00f0ff] mb-4">
            Unified Core Functionality
          </h2>
          <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Everything you need for infinite connectivity.
          </h3>
          <p className="text-base text-gray-400 leading-relaxed">
            Stop building complex, fragile webhooks and pipelines manually. DEVINT integrates systems automatically with self-healing, agentic workflows.
          </p>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
