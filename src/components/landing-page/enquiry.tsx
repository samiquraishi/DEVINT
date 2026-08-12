"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Terminal, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function EnquirySection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    integrationType: "agentic-orchestration",
    details: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "animating-logs" | "success">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);

  const mockLogs = [
    "[INFO] Initializing secure handshake with DEVINT Node-01...",
    "[INFO] Resolving endpoint protocols & authentication mapping...",
    "[SUCCESS] Secure SSL/TLS tunnel established.",
    "[INFO] Scanning schema structures and compiling payload definitions...",
    "[SUCCESS] Schema mapping verified. Database translation: OK.",
    "[INFO] Registering query routing to Lead Orchestration Core...",
    "[SUCCESS] Handshake complete. Lead registered successfully."
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.details) {
      alert("Please fill in all fields.");
      return;
    }
    
    setStatus("loading");
    
    // Step 1: Simulate network trip
    setTimeout(() => {
      setStatus("animating-logs");
      setLogs([]);
      setCurrentLogIndex(0);
    }, 1200);
  };

  // Log compiler simulation effect
  useEffect(() => {
    if (status === "animating-logs" && currentLogIndex < mockLogs.length) {
      const timeout = setTimeout(() => {
        setLogs((prev) => [...prev, mockLogs[currentLogIndex]]);
        setCurrentLogIndex((prev) => prev + 1);
      }, 500 + Math.random() * 400); // randomize typing speed
      return () => clearTimeout(timeout);
    } else if (status === "animating-logs" && currentLogIndex === mockLogs.length) {
      const timeout = setTimeout(() => {
        setStatus("success");
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [status, currentLogIndex]);

  return (
    <section id="enquiry-section" className="relative z-10 w-full bg-[#030303] px-6 md:px-12 py-24 border-t border-white/[0.03]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(191,90,242,0.03)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Info Copy Column */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#bf5af2] mb-4">
              Initialize Node Sync
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Connect with our Integration Core.
            </h3>
            <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-8">
              Submit your project scope and integration requirements. Our agentic pipeline will compile a custom architecture proposal and sync with you within 2 hours.
            </p>
            
            <div className="flex flex-col gap-4 text-xs font-mono text-gray-500">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#bf5af2]" />
                <span>endpoint: api.devint.io/v1/sync</span>
              </div>
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#00f0ff]" />
                <span>status: operational (200 OK)</span>
              </div>
            </div>
          </div>

          {/* Form Card Column */}
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden w-full backdrop-blur-md bg-white/[0.02] border border-white/[0.07] p-8 md:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              
              <AnimatePresence mode="wait">
                {status === "idle" && (
                  <motion.form
                    key="enquiry-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-6"
                  >
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-xs font-bold tracking-wider text-gray-400 uppercase mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Operator Name"
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#00f0ff]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors duration-200"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-xs font-bold tracking-wider text-gray-400 uppercase mb-2">
                        Company Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="operator@company.io"
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#00f0ff]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors duration-200"
                      />
                    </div>

                    {/* Integration Type */}
                    <div>
                      <label htmlFor="integrationType" className="block text-xs font-bold tracking-wider text-gray-400 uppercase mb-2">
                        Integration Protocol
                      </label>
                      <div className="relative">
                        <select
                          name="integrationType"
                          id="integrationType"
                          value={formData.integrationType}
                          onChange={handleInputChange}
                          className="w-full bg-[#0d0d0f] border border-white/[0.08] focus:border-[#00f0ff]/50 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none transition-colors duration-200"
                        >
                          <option value="agentic-orchestration">Agentic Multi-Agent Orchestration</option>
                          <option value="data-pipeline">Edge Data Pipeline Sync</option>
                          <option value="api-automation">API Integration & Automation</option>
                          <option value="custom">Custom Hybrid Deployment</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 text-xs">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* Scope details */}
                    <div>
                      <label htmlFor="details" className="block text-xs font-bold tracking-wider text-gray-400 uppercase mb-2">
                        Scope Details
                      </label>
                      <textarea
                        name="details"
                        id="details"
                        rows={4}
                        required
                        value={formData.details}
                        onChange={handleInputChange}
                        placeholder="Describe the databases, APIs, or AI models you need to sync..."
                        className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#00f0ff]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none resize-none transition-colors duration-200"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-[#bf5af2] to-[#0a84ff] text-white font-bold text-sm tracking-wider uppercase shadow-[0_0_20px_0_rgba(191,90,242,0.2)] hover:shadow-[0_0_30px_0_rgba(191,90,242,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      Connect Core Node
                    </button>
                  </motion.form>
                )}

                {/* Loading / Network trip */}
                {status === "loading" && (
                  <motion.div
                    key="loading-screen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <div className="relative w-16 h-16 mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-white/[0.05] border-t-[#bf5af2] animate-spin" />
                      <div className="absolute inset-2 rounded-full border-4 border-white/[0.05] border-b-[#00f0ff] animate-spin [animation-duration:1.5s]" />
                    </div>
                    <span className="text-xs font-mono tracking-widest text-gray-500 uppercase animate-pulse">
                      Establishing handshake...
                    </span>
                  </motion.div>
                )}

                {/* Log Terminal Animation */}
                {status === "animating-logs" && (
                  <motion.div
                    key="terminal-screen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col h-[350px] font-mono text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4 text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/[0.8]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/[0.8]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/[0.8]" />
                      </div>
                      <span className="text-xxs tracking-wider uppercase">Lead Sync Compiler</span>
                    </div>
                    <div className="flex-grow overflow-y-auto flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-white/[0.05]">
                      {logs.map((log, index) => {
                        const isSuccess = log.includes("[SUCCESS]");
                        const isInfo = log.includes("[INFO]");
                        return (
                          <motion.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            key={index}
                            className={
                              isSuccess
                                ? "text-[#30d158]"
                                : isInfo
                                ? "text-gray-400"
                                : "text-white"
                            }
                          >
                            {log}
                          </motion.div>
                        );
                      })}
                      {currentLogIndex < mockLogs.length && (
                        <div className="w-1.5 h-4 bg-white animate-pulse" />
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Submission Success */}
                {status === "success" && (
                  <motion.div
                    key="success-screen"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center py-16"
                  >
                    <div className="w-16 h-16 bg-[#30d158]/[0.08] border border-[#30d158]/[0.3] rounded-full flex items-center justify-center text-[#30d158] mb-6">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                      Connection Synchronized
                    </h3>
                    <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-8">
                      Your integration payload has been registered. Our agentic pipeline is compiling your setup. Expect a ping in your inbox shortly!
                    </p>
                    <button
                      onClick={() => setStatus("idle")}
                      className="px-6 py-2.5 rounded-xl border border-white/[0.08] text-xs font-semibold text-gray-400 uppercase tracking-widest hover:bg-white/[0.04] hover:text-white transition-all duration-200"
                    >
                      Reset Handshake
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
