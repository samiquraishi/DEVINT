"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import ParticleMorph, { ParticleMorphRef } from "@/components/ui/particle-morph";
import buildData from "../../../../../public/content/build-process.json";
import { clamp, smoothstep } from "@/lib/utils";

export interface BuildProcessSectionRef {
  updateProgress: (pTotal: number) => void;
  container: HTMLDivElement | null;
}

export interface BuildProcessSectionProps {
  isActive?: boolean;
  className?: string;
}

const renderFoldText = (
  text: string,
  fontSize: string,
  fontWeight: number,
  color: string,
  highlights: string[] = [],
  align: "left" | "center" = "left",
  isItalic: boolean = false
) => {
  const parts = text.split(/(\s+)/);
  const totalChars = text.replace(/\s+/g, "").length || 1;
  let charCounter = 0;

  return (
    <div
      className={`flex flex-wrap items-baseline font-montserrat tracking-[0.03em] w-full ${
        align === "center" ? "justify-center text-center" : "justify-start text-left"
      } ${isItalic ? "italic" : ""}`}
      style={{
        fontSize,
        fontWeight,
        color,
        fontStyle: isItalic ? "italic" : "normal",
      }}
    >
      {parts.map((part, wordIndex) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) {
          return (
            <span key={`ws-${wordIndex}`} className="inline-block">
              &nbsp;
            </span>
          );
        }

        const cleanWord = part.toLowerCase().replace(/[.,'":;!?()→]/g, "");
        const isHighlighted = highlights.some(
          (w) => w.toLowerCase() === cleanWord || cleanWord.startsWith(w.toLowerCase())
        );
        const charArray = Array.from(part);
        const wordLen = charArray.length;

        return (
          <span
            key={`word-${wordIndex}`}
            className="inline-flex items-baseline"
            style={{ perspective: "800px", transformStyle: "preserve-3d" }}
          >
            {charArray.map((char, charIndex) => {
              const globalIdx = charCounter++;
              const charNorm = globalIdx / totalChars;
              const bgX = wordLen > 1 ? (charIndex / (wordLen - 1)) * 100 : 0;

              return (
                <span
                  key={`c-${globalIdx}`}
                  className="inline-block"
                  style={{ perspective: "800px", transformStyle: "preserve-3d" }}
                >
                  <span
                    data-fold-char
                    data-char-norm={charNorm}
                    className={`fold-text-piece inline-block [backface-visibility:hidden] [will-change:transform,opacity] ${
                      isHighlighted ? "fold-text-highlight" : ""
                    }`.trim()}
                    style={
                      {
                        transformOrigin: "50% 0%",
                        transform: "rotateX(-90deg)",
                        opacity: 0,
                        ...(isHighlighted
                          ? {
                              "--bg-size": `${wordLen * 100}%`,
                              "--bg-x": `${bgX}%`,
                            }
                          : {}),
                      } as React.CSSProperties
                    }
                  >
                    {char}
                  </span>
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};

const animateChars = (container: HTMLElement, phase: "in" | "hold" | "out", phaseT: number) => {
  const chars = container.querySelectorAll<HTMLElement>("[data-fold-char]");
  chars.forEach((span) => {
    const charNorm = parseFloat(span.getAttribute("data-char-norm") || "0");
    let rotateX = 0;
    let opacity = 1;

    if (phase === "in") {
      const staggerStart = charNorm * 0.52;
      const charDuration = 0.48;
      const raw = clamp((phaseT - staggerStart) / charDuration, 0, 1);
      const eased = raw * (2 - raw);
      rotateX = (1 - eased) * -90;
      opacity = eased;
    } else if (phase === "out") {
      const staggerStart = charNorm * 0.52;
      const charDuration = 0.48;
      const raw = clamp((phaseT - staggerStart) / charDuration, 0, 1);
      const eased = raw * raw;
      rotateX = eased * 90;
      opacity = 1 - eased;
    }

    span.style.transform = `rotateX(${rotateX}deg)`;
    span.style.opacity = `${opacity}`;
  });
};

export const BuildProcessSection = forwardRef<BuildProcessSectionRef, BuildProcessSectionProps>(
  ({ isActive = true, className = "" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const particleMorphRef = useRef<ParticleMorphRef>(null);

    // Intro Refs: Layer A (mix-blend-difference) and Layer B (Devint gradient highlight)
    const introRefA = useRef<HTMLDivElement>(null);
    const introRefB = useRef<HTMLDivElement>(null);

    // 4 Stages: Stage 01, 02, 03, 04
    // Each stage has Layer A (mix-blend-difference) and Layer B (highlight words if any)
    const stage1RefA = useRef<HTMLDivElement>(null);
    const stage1RefB = useRef<HTMLDivElement>(null);
    const stage2RefA = useRef<HTMLDivElement>(null);
    const stage2RefB = useRef<HTMLDivElement>(null);
    const stage3RefA = useRef<HTMLDivElement>(null);
    const stage3RefB = useRef<HTMLDivElement>(null);
    const stage4RefA = useRef<HTMLDivElement>(null);
    const stage4RefB = useRef<HTMLDivElement>(null);

    // Step Lines (centered at bottom): Stage 01, 02, 03, 04
    const stepLine1Ref = useRef<HTMLDivElement>(null);
    const stepLine2Ref = useRef<HTMLDivElement>(null);
    const stepLine3Ref = useRef<HTMLDivElement>(null);
    const stepLine4Ref = useRef<HTMLDivElement>(null);

    const stages = buildData.section.stages;
    // Tracks whether the opening sphere-scatter animation has fired yet
    const hasScatteredRef = useRef<boolean>(false);

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        // ── 0. Opening scatter: sphere → cosmic field (fires once on section entry) ──
        if (pTotal >= 0.960 && !hasScatteredRef.current) {
          hasScatteredRef.current = true;
          particleMorphRef.current?.disperse();
        }
        // Reset so the animation replays if the user scrolls fully back past the section
        if (pTotal < 0.920) {
          hasScatteredRef.current = false;
        }

        // ── 1. Intro Animation ("THE WAY WE BUILD" + subtext) ────────────────────────
        // Active from pTotal = 1.000 to 1.120 (starts right when Offering Section dissolves at 1.000)
        // In: 1.000 -> 1.045 (Heading in: 1.000 -> 1.035, Subtitle in: 1.015 -> 1.045)
        // Hold: 1.045 -> 1.080
        // Out: 1.080 -> 1.120 (scale 1.15 + fade out, matching "The FUTURE doesn't wait")
        const introActive = pTotal >= 1.000 && pTotal < 1.120;
        const introLayers = [introRefA.current, introRefB.current].filter(Boolean) as HTMLElement[];

        for (const el of introLayers) {
          if (introActive) {
            el.style.display = "flex";

            const out = smoothstep(1.080, 1.120, pTotal);
            el.style.opacity = `${1 - out}`;
            el.style.transform = `scale(${1 + 0.15 * out})`;

            const phaseTitleT = clamp((pTotal - 1.000) / 0.035, 0, 1);
            const phaseSubT = clamp((pTotal - 1.015) / 0.030, 0, 1);

            if (el.children.length >= 2) {
              animateChars(el.children[0] as HTMLElement, "in", phaseTitleT);
              animateChars(el.children[1] as HTMLElement, "in", phaseSubT);
            }
          } else {
            el.style.opacity = "0";
            el.style.display = "none";
          }
        }

        // ── 2. The 4 Stages Timeline ────────────────────────────────────────────────
        // Stage 1: 0.05 -> 0.22 (Shape 0: Lightbulb)
        // Stage 2: 0.28 -> 0.45 (Shape 1: Compass)
        // Stage 3: 0.51 -> 0.68 (Shape 2: Gear)
        // Stage 4: 0.74 -> 0.90 (Shape 3: Bar Graph)
        const stageBands = [
          {
            index: 0,
            shapeIndex: 0,
            start: 1.13,
            end: 1.30,
            refA: stage1RefA,
            refB: stage1RefB,
            stepLineRef: stepLine1Ref,
          },
          {
            index: 1,
            shapeIndex: 1,
            start: 1.30,
            end: 1.47,
            refA: stage2RefA,
            refB: stage2RefB,
            stepLineRef: stepLine2Ref,
          },
          {
            index: 2,
            shapeIndex: 2,
            start: 1.47,
            end: 1.64,
            refA: stage3RefA,
            refB: stage3RefB,
            stepLineRef: stepLine3Ref,
          },
          {
            index: 3,
            shapeIndex: 3,
            start: 1.64,
            end: 1.81,
            refA: stage4RefA,
            refB: stage4RefB,
            stepLineRef: stepLine4Ref,
          },
        ];

        let currentActiveShape = -1;

        stageBands.forEach((band) => {
          const els = [band.refA.current, band.refB.current].filter(Boolean) as HTMLElement[];
          const stepLineEl = band.stepLineRef.current;

          if (pTotal >= band.start && pTotal <= band.end) {
            currentActiveShape = band.shapeIndex;

            const bandProgress = (pTotal - band.start) / (band.end - band.start);
            let phase: "in" | "hold" | "out" = "hold";
            let phaseT = 1;

            if (bandProgress < 0.35) {
              phase = "in";
              phaseT = bandProgress / 0.35;
            } else if (bandProgress > 0.65) {
              phase = "out";
              phaseT = (bandProgress - 0.65) / 0.35;
            }

            for (const el of els) {
              el.style.display = "flex";
              animateChars(el, phase, phaseT);
            }

            if (stepLineEl) {
              stepLineEl.style.display = "block";
              let rotateX = 0;
              let opacity = 1;

              if (phase === "in") {
                const raw = clamp(phaseT, 0, 1);
                const eased = raw * (2 - raw);
                rotateX = (1 - eased) * -90;
                opacity = eased;
              } else if (phase === "out") {
                const raw = clamp(phaseT, 0, 1);
                const eased = raw * raw;
                rotateX = eased * 90;
                opacity = 1 - eased;
              }

              stepLineEl.style.transform = `perspective(800px) rotateX(${rotateX}deg)`;
              stepLineEl.style.transformOrigin = `50% 100%`;
              stepLineEl.style.opacity = `${opacity}`;
            }
          } else {
            for (const el of els) {
              el.style.display = "none";
            }
            if (stepLineEl) {
              stepLineEl.style.display = "none";
            }
          }
        });

        // Drive particle morph directly from scroll position — no fire-and-forget
        if (currentActiveShape !== -1) {
          const activeBand = stageBands.find((b) => b.shapeIndex === currentActiveShape);
          if (activeBand) {
            const bp = clamp((pTotal - activeBand.start) / (activeBand.end - activeBand.start), 0, 1);
            let morphProgress: number;

            if (bp < 0.35) {
              morphProgress = smoothstep(0, 0.35, bp);
            } else if (bp <= 0.65) {
              morphProgress = 1;
            } else {
              morphProgress = 1 - smoothstep(0.65, 1.0, bp);
            }
            particleMorphRef.current?.setScrollMorph(currentActiveShape, morphProgress);
          }
        } else {
          if (pTotal > 1.81) {
            // Stray further away and fade out
            const exitProgress = clamp((pTotal - 1.81) / 0.15, 0, 1);
            particleMorphRef.current?.setScrollMorph(-2, exitProgress);
          } else {
            // No shape active — default to global scattered state
            particleMorphRef.current?.setScrollMorph(-1, 0);
          }
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-[42] flex items-center justify-center w-full h-full overflow-hidden pointer-events-none [will-change:opacity] ${className}`}
        style={{
          background: "radial-gradient(circle at 50% 50%, rgb(8, 8, 26) 0%, rgb(4, 4, 13) 75%)",
        }}
      >
        {/* ── SECTION INTRO LAYER A (mix-blend-difference, hides highlights) ─────── */}
        <div
          ref={introRefA}
          className="absolute inset-0 z-[48] flex flex-col items-center justify-center m-0 px-[4%] text-center max-w-7xl w-full mx-auto gap-y-6 mix-blend-difference pointer-events-none select-none [will-change:opacity,transform] opacity-0 [&_.fold-text-highlight]:invisible"
          style={{ display: "none" }}
        >
          <div className="relative w-full flex items-center justify-center min-h-[3.5rem] overflow-visible">
            {renderFoldText(
              buildData.section.intro_heading,
              "clamp(1.1rem, 2.2vw, 2.2rem)",
              300,
              "#ffffff",
              ["BUILD"],
              "center",
              false
            )}
          </div>
          <div className="w-full flex justify-center">
            {renderFoldText(
              buildData.section.intro_subtitle,
              "clamp(0.85rem, 1.35vw, 1.2rem)",
              300,
              "#ffffff",
              [],
              "center",
              true
            )}
          </div>
        </div>

        {/* ── SECTION INTRO LAYER B (no blend, shows only BUILD in Devint gradient) ── */}
        <div
          ref={introRefB}
          className="absolute inset-0 z-[49] flex flex-col items-center justify-center m-0 px-[4%] text-center max-w-7xl w-full mx-auto gap-y-6 pointer-events-none select-none [will-change:opacity,transform] opacity-0 [&_.fold-text-piece:not(.fold-text-highlight)]:invisible"
          style={{ display: "none" }}
        >
          <div className="relative w-full flex items-center justify-center min-h-[3.5rem] overflow-visible">
            {renderFoldText(
              buildData.section.intro_heading,
              "clamp(1.1rem, 2.2vw, 2.2rem)",
              300,
              "#ffffff",
              ["BUILD"],
              "center",
              false
            )}
          </div>
          <div className="w-full flex justify-center">
            {renderFoldText(
              buildData.section.intro_subtitle,
              "clamp(0.85rem, 1.35vw, 1.2rem)",
              300,
              "#ffffff",
              [],
              "center",
              true
            )}
          </div>
        </div>

        {/* ── FULL-SCREEN 3D PARTICLE MORPH COMPONENT ─────────────────────────── */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center z-10 pointer-events-auto">
          <ParticleMorph ref={particleMorphRef} isActive={isActive} className="w-full h-full" />
        </div>

        {/* ── 4 STAGES — LAYER A (mix-blend-difference) ──── */}
        <div className="absolute inset-0 z-30 pointer-events-none select-none flex flex-col justify-center px-[4%] lg:px-[6%] mix-blend-difference [&_.fold-text-highlight]:invisible">
          <div className="relative w-full h-full flex items-center">
            <div className="ml-auto w-full lg:w-[48%] flex flex-col justify-center min-h-[22rem] pr-2 lg:pr-8">
              {/* Stage 1 */}
              <div ref={stage1RefA} style={{ display: "none" }} className="w-full flex-col gap-y-4">
                <div className="fixed top-[15vh] left-0 right-0 w-full flex justify-center text-center">
                  {renderFoldText(stages[0].heading, "clamp(1.3rem, 2.3vw, 2.3rem)", 300, "#ffffff", ["VISION"], "center")}
                </div>
                <div className="w-full mt-2">
                  {renderFoldText(
                    stages[0].subtitle,
                    "clamp(1.0rem, 1.5vw, 1.25rem)",
                    300,
                    "rgba(255,255,255,0.85)",
                    [],
                    "left"
                  )}
                </div>
                <div className="flex flex-col gap-y-2.5 mt-5">
                  {stages[0].pointers.map((pointer, pIdx) => (
                    <div key={`s1-p-${pIdx}`} className="flex items-center gap-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                      {renderFoldText(pointer, "clamp(0.9rem, 1.3vw, 1.15rem)", 300, "#ffffff", [], "left")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 2 */}
              <div ref={stage2RefA} style={{ display: "none" }} className="w-full flex-col gap-y-4">
                <div className="fixed top-[15vh] left-0 right-0 w-full flex justify-center text-center">
                  {renderFoldText(stages[1].heading, "clamp(1.3rem, 2.3vw, 2.3rem)", 300, "#ffffff", ["FORWARD"], "center")}
                </div>
                <div className="w-full mt-2">
                  {renderFoldText(
                    stages[1].subtitle,
                    "clamp(1.0rem, 1.5vw, 1.25rem)",
                    300,
                    "rgba(255,255,255,0.85)",
                    [],
                    "left"
                  )}
                </div>
                <div className="flex flex-col gap-y-2.5 mt-5">
                  {stages[1].pointers.map((pointer, pIdx) => (
                    <div key={`s2-p-${pIdx}`} className="flex items-center gap-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                      {renderFoldText(pointer, "clamp(0.9rem, 1.3vw, 1.15rem)", 300, "#ffffff", [], "left")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 3 */}
              <div ref={stage3RefA} style={{ display: "none" }} className="w-full flex-col gap-y-4">
                <div className="fixed top-[15vh] left-0 right-0 w-full flex justify-center text-center">
                  {renderFoldText(stages[2].heading, "clamp(1.3rem, 2.3vw, 2.3rem)", 300, "#ffffff", ["TECHNOLOGY"], "center")}
                </div>
                <div className="w-full mt-2">
                  {renderFoldText(
                    stages[2].subtitle,
                    "clamp(1.0rem, 1.5vw, 1.25rem)",
                    300,
                    "rgba(255,255,255,0.85)",
                    [],
                    "left"
                  )}
                </div>
                <div className="flex flex-col gap-y-2.5 mt-5">
                  {stages[2].pointers.map((pointer, pIdx) => (
                    <div key={`s3-p-${pIdx}`} className="flex items-center gap-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                      {renderFoldText(pointer, "clamp(0.9rem, 1.3vw, 1.15rem)", 300, "#ffffff", [], "left")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 4 */}
              <div ref={stage4RefA} style={{ display: "none" }} className="w-full flex-col gap-y-4">
                <div className="fixed top-[15vh] left-0 right-0 w-full flex justify-center text-center">
                  {renderFoldText(stages[3].heading, "clamp(1.3rem, 2.3vw, 2.3rem)", 300, "#ffffff", ["EVOLVE"], "center")}
                </div>
                <div className="w-full mt-2">
                  {renderFoldText(
                    stages[3].subtitle,
                    "clamp(1.0rem, 1.5vw, 1.25rem)",
                    300,
                    "rgba(255,255,255,0.85)",
                    [],
                    "left"
                  )}
                </div>
                <div className="flex flex-col gap-y-2.5 mt-5">
                  {stages[3].pointers.map((pointer, pIdx) => (
                    <div key={`s4-p-${pIdx}`} className="flex items-center gap-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                      {renderFoldText(pointer, "clamp(0.9rem, 1.3vw, 1.15rem)", 300, "#ffffff", [], "left")}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 STAGES — LAYER B (highlights overlay) ────── */}
        <div className="absolute inset-0 z-[31] pointer-events-none select-none flex flex-col justify-center px-[4%] lg:px-[6%] [&_.fold-text-piece:not(.fold-text-highlight)]:invisible">
          <div className="relative w-full h-full flex items-center">
            <div className="ml-auto w-full lg:w-[48%] flex flex-col justify-center min-h-[22rem] pr-2 lg:pr-8">
              {/* Stage 1 */}
              <div ref={stage1RefB} style={{ display: "none" }} className="w-full flex-col gap-y-4">
                <div className="fixed top-[15vh] left-0 right-0 w-full flex justify-center text-center">
                  {renderFoldText(stages[0].heading, "clamp(1.3rem, 2.3vw, 2.3rem)", 300, "#ffffff", ["VISION"], "center")}
                </div>
                <div className="w-full mt-2">
                  {renderFoldText(
                    stages[0].subtitle,
                    "clamp(1.0rem, 1.5vw, 1.25rem)",
                    300,
                    "rgba(255,255,255,0.85)",
                    [],
                    "left"
                  )}
                </div>
                <div className="flex flex-col gap-y-2.5 mt-5">
                  {stages[0].pointers.map((pointer, pIdx) => (
                    <div key={`s1-p-b-${pIdx}`} className="flex items-center gap-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                      {renderFoldText(pointer, "clamp(0.9rem, 1.3vw, 1.15rem)", 300, "#ffffff", [], "left")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 2 */}
              <div ref={stage2RefB} style={{ display: "none" }} className="w-full flex-col gap-y-4">
                <div className="fixed top-[15vh] left-0 right-0 w-full flex justify-center text-center">
                  {renderFoldText(stages[1].heading, "clamp(1.3rem, 2.3vw, 2.3rem)", 300, "#ffffff", ["FORWARD"], "center")}
                </div>
                <div className="w-full mt-2">
                  {renderFoldText(
                    stages[1].subtitle,
                    "clamp(1.0rem, 1.5vw, 1.25rem)",
                    300,
                    "rgba(255,255,255,0.85)",
                    [],
                    "left"
                  )}
                </div>
                <div className="flex flex-col gap-y-2.5 mt-5">
                  {stages[1].pointers.map((pointer, pIdx) => (
                    <div key={`s2-p-b-${pIdx}`} className="flex items-center gap-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                      {renderFoldText(pointer, "clamp(0.9rem, 1.3vw, 1.15rem)", 300, "#ffffff", [], "left")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 3 */}
              <div ref={stage3RefB} style={{ display: "none" }} className="w-full flex-col gap-y-4">
                <div className="fixed top-[15vh] left-0 right-0 w-full flex justify-center text-center">
                  {renderFoldText(stages[2].heading, "clamp(1.3rem, 2.3vw, 2.3rem)", 300, "#ffffff", ["TECHNOLOGY"], "center")}
                </div>
                <div className="w-full mt-2">
                  {renderFoldText(
                    stages[2].subtitle,
                    "clamp(1.0rem, 1.5vw, 1.25rem)",
                    300,
                    "rgba(255,255,255,0.85)",
                    [],
                    "left"
                  )}
                </div>
                <div className="flex flex-col gap-y-2.5 mt-5">
                  {stages[2].pointers.map((pointer, pIdx) => (
                    <div key={`s3-p-b-${pIdx}`} className="flex items-center gap-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                      {renderFoldText(pointer, "clamp(0.9rem, 1.3vw, 1.15rem)", 300, "#ffffff", [], "left")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage 4 */}
              <div ref={stage4RefB} style={{ display: "none" }} className="w-full flex-col gap-y-4">
                <div className="fixed top-[15vh] left-0 right-0 w-full flex justify-center text-center">
                  {renderFoldText(stages[3].heading, "clamp(1.3rem, 2.3vw, 2.3rem)", 300, "#ffffff", ["EVOLVE"], "center")}
                </div>
                <div className="w-full mt-2">
                  {renderFoldText(
                    stages[3].subtitle,
                    "clamp(1.0rem, 1.5vw, 1.25rem)",
                    300,
                    "rgba(255,255,255,0.85)",
                    [],
                    "left"
                  )}
                </div>
                <div className="flex flex-col gap-y-2.5 mt-5">
                  {stages[3].pointers.map((pointer, pIdx) => (
                    <div key={`s4-p-b-${pIdx}`} className="flex items-center gap-x-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                      {renderFoldText(pointer, "clamp(0.9rem, 1.3vw, 1.15rem)", 300, "#ffffff", [], "left")}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP LINE (CENTERED AT BOTTOM IN DEVINT GRADIENT) ────────────────── */}
        <div className="absolute bottom-24 sm:bottom-28 md:bottom-32 inset-x-0 mx-auto text-center pointer-events-none z-30 px-4">
          <div
            ref={stepLine1Ref}
            style={{ display: "none", fontWeight: 300 }}
            className="closing-line-gradient font-lemon font-light text-base sm:text-lg md:text-xl tracking-[0.24em] uppercase"
          >
            {stages[0].step_line.toUpperCase()}
          </div>
          <div
            ref={stepLine2Ref}
            style={{ display: "none", fontWeight: 300 }}
            className="closing-line-gradient font-lemon font-light text-base sm:text-lg md:text-xl tracking-[0.24em] uppercase"
          >
            {stages[1].step_line.toUpperCase()}
          </div>
          <div
            ref={stepLine3Ref}
            style={{ display: "none", fontWeight: 300 }}
            className="closing-line-gradient font-lemon font-light text-base sm:text-lg md:text-xl tracking-[0.24em] uppercase"
          >
            {stages[2].step_line.toUpperCase()}
          </div>
          <div
            ref={stepLine4Ref}
            style={{ display: "none", fontWeight: 300 }}
            className="closing-line-gradient font-lemon font-light text-base sm:text-lg md:text-xl tracking-[0.24em] uppercase"
          >
            {stages[3].step_line.toUpperCase()}
          </div>
        </div>
      </div>
    );
  }
);

BuildProcessSection.displayName = "BuildProcessSection";
export default BuildProcessSection;
