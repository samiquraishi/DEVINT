"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import SphereGrid, { SphereGridRef } from "@/components/ui/sphere-grid";
import FloatingCards, { FloatingCardsRef } from "@/components/ui/floating-cards";
import problemData from "../../../../../public/content/problem.json";
import { clamp } from "@/lib/utils";

export interface ProblemSectionRef {
  updateProgress: (pTotal: number) => void;
  container: HTMLDivElement | null;
}

export interface ProblemSectionProps {
  isActive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface StatementProps {
  title: string;
  subtitle: string;
  highlights: string[];
}

const StatementItem = React.forwardRef<HTMLDivElement, StatementProps>(
  ({ title, subtitle, highlights }, ref) => {
    const renderText = (
      text: string,
      fontSize: string,
      fontWeight: number,
      color: string,
      isTitle: boolean,
      isItalic: boolean = false
    ) => {
      const parts = text.split(/(\s+)/);
      const totalChars = text.replace(/\s+/g, "").length || 1;
      let charCounter = 0;

      return (
        <div
          className={`flex flex-wrap justify-center items-baseline text-center font-montserrat tracking-[0.03em] w-full ${
            isItalic ? "italic" : ""
          }`}
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

            const cleanWord = part.toLowerCase().replace(/[.,'":;!?()]/g, "");
            const isHighlighted = isTitle && highlights.some((w) => w.toLowerCase() === cleanWord);
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

    return (
      <div
        ref={ref}
        style={{ display: "none" }}
        className="absolute inset-0 flex flex-col items-center justify-center max-w-6xl w-full gap-y-6 mx-auto"
      >
        {renderText(title, "clamp(1.3rem, 2.6vw, 2.4rem)", 300, "#ffffff", true, false)}
        {renderText(subtitle, "clamp(0.85rem, 1.35vw, 1.2rem)", 300, "#ffffff", false, true)}
      </div>
    );
  }
);
StatementItem.displayName = "StatementItem";

export const ProblemSection = forwardRef<ProblemSectionRef, ProblemSectionProps>(
  ({ isActive = true, className = "", children }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sphereGridRef = useRef<SphereGridRef>(null);
    const floatingCardsRef = useRef<FloatingCardsRef>(null);
    const st1RefA = useRef<HTMLDivElement>(null);
    const st1RefB = useRef<HTMLDivElement>(null);
    const st2RefA = useRef<HTMLDivElement>(null);
    const st2RefB = useRef<HTMLDivElement>(null);
    const st3RefA = useRef<HTMLDivElement>(null);
    const st3RefB = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        sphereGridRef.current?.updateScroll(pTotal);
        floatingCardsRef.current?.updateProgress(pTotal);

        // Problem Statements sequence:
        // Band 1: 0.32 to 0.44
        // Band 2: 0.47 to 0.59
        // Band 3: 0.62 to 0.74
        const bands = [
          { refA: st1RefA, refB: st1RefB, start: 0.32, end: 0.44 },
          { refA: st2RefA, refB: st2RefB, start: 0.47, end: 0.59 },
          { refA: st3RefA, refB: st3RefB, start: 0.62, end: 0.74 },
        ];

        bands.forEach((band) => {
          const els = [band.refA.current, band.refB.current].filter(Boolean) as HTMLElement[];
          if (els.length === 0) return;

          if (pTotal >= band.start && pTotal <= band.end) {
            const b = (pTotal - band.start) / (band.end - band.start);
            let phase: "in" | "hold" | "out" = "hold";
            let phaseT = 1;

            if (b < 0.28) {
              phase = "in";
              phaseT = b / 0.28;
            } else if (b > 0.72) {
              phase = "out";
              phaseT = (b - 0.72) / 0.28;
            }

            for (const el of els) {
              el.style.display = "flex";

              const chars = el.querySelectorAll<HTMLElement>("[data-fold-char]");
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
            }
          } else {
            for (const el of els) {
              el.style.display = "none";
            }
          }
        });
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-[45] flex items-center justify-center w-full h-full overflow-hidden opacity-0 pointer-events-none [will-change:opacity,transform] ${className}`}
      >
        <div className="relative w-full h-full bg-[#f4f4f5] overflow-hidden">
          {/* 3D Sphere Grid Background */}
          <SphereGrid
            ref={sphereGridRef}
            gridCols={35}
            gridRows={23}
            maxElevation={70}
            elevationSmoothing={0.10}
            backgroundColor="#f4f4f5"
            gapRatio={0.04}
            parallaxStrength={75}
            isActive={isActive}
            className="w-full h-full"
          />

          {/* Interactive Parallax Floating Cards */}
          <FloatingCards
            ref={floatingCardsRef}
            cards={problemData.problemCards}
          />

          {/* Layer A (z-[15]): mix-blend-difference — regular text blends directly over SphereGrid and back cards (z-10) */}
          <div className="absolute inset-0 z-[15] flex items-center justify-center pointer-events-none select-none px-[6%] text-center mix-blend-difference [&_.fold-text-highlight]:invisible">
            <StatementItem
              ref={st1RefA}
              title={problemData.statement1.title}
              subtitle={problemData.statement1.subtitle}
              highlights={problemData.statement1.highlights}
            />
            <StatementItem
              ref={st2RefA}
              title={problemData.statement2.title}
              subtitle={problemData.statement2.subtitle}
              highlights={problemData.statement2.highlights}
            />
            <StatementItem
              ref={st3RefA}
              title={problemData.statement3.title}
              subtitle={problemData.statement3.subtitle}
              highlights={problemData.statement3.highlights}
            />
          </div>

          {/* Layer B (z-[16]): no blend mode — shows only rainbow gradient highlighted words */}
          <div className="absolute inset-0 z-[16] flex items-center justify-center pointer-events-none select-none px-[6%] text-center [&_.fold-text-piece:not(.fold-text-highlight)]:invisible">
            <StatementItem
              ref={st1RefB}
              title={problemData.statement1.title}
              subtitle={problemData.statement1.subtitle}
              highlights={problemData.statement1.highlights}
            />
            <StatementItem
              ref={st2RefB}
              title={problemData.statement2.title}
              subtitle={problemData.statement2.subtitle}
              highlights={problemData.statement2.highlights}
            />
            <StatementItem
              ref={st3RefB}
              title={problemData.statement3.title}
              subtitle={problemData.statement3.subtitle}
              highlights={problemData.statement3.highlights}
            />
          </div>

          {children && (
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ProblemSection.displayName = "ProblemSection";

export default ProblemSection;
