"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import SphereGrid, { SphereGridRef } from "@/components/ui/sphere-grid";
import offeringData from "../../../../../public/content/offering.json";
import { clamp } from "@/lib/utils";

export interface OfferingSectionRef {
  updateProgress: (pTotal: number) => void;
  container: HTMLDivElement | null;
}

export interface OfferingSectionProps {
  isActive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const renderFoldText = (
  text: string,
  fontSize: string,
  fontWeight: number,
  color: string,
  isTitle: boolean,
  highlights: string[] = [],
  isItalic: boolean = false
) => {
  const parts = text.split(/(\s+)/);
  const totalChars = text.replace(/\s+/g, "").length || 1;
  let charCounter = 0;

  return (
    <div
      className={`flex flex-wrap justify-center items-baseline text-center font-montserrat tracking-[0.03em] w-full ${
        isTitle ? "whitespace-nowrap" : ""
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

        const cleanWord = part.toLowerCase().replace(/[.,'":;!?()]/g, "");
        const isHighlighted =
          isTitle &&
          highlights.some(
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

import { CylinderCards, CylinderCardsRef } from "@/components/ui/cylinder-cards";

export const OfferingSection = forwardRef<OfferingSectionRef, OfferingSectionProps>(
  ({ isActive = true, className = "", children }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sphereGridRef = useRef<SphereGridRef>(null);
    const cylinderCardsRef = useRef<CylinderCardsRef>(null);
    const [isCardExpanded, setIsCardExpanded] = useState(false);
    const sc1RefA = useRef<HTMLDivElement>(null);
    const sc1RefB = useRef<HTMLDivElement>(null);
    const sc2RefA = useRef<HTMLDivElement>(null);
    const sc2RefB = useRef<HTMLDivElement>(null);
    const sc3RefA = useRef<HTMLDivElement>(null);
    const sc3RefB = useRef<HTMLDivElement>(null);
    const sc4RefA = useRef<HTMLDivElement>(null);
    const sc4RefB = useRef<HTMLDivElement>(null);
    const subtextRefA = useRef<HTMLDivElement>(null);
    const subtextRefB = useRef<HTMLDivElement>(null);
    const bgWrapperRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        sphereGridRef.current?.updateScroll(pTotal);
        cylinderCardsRef.current?.updateProgress(pTotal);

        // Bands for the 4 scenes: strictly non-overlapping with clean gaps in between
        // Fold-in (38%), hold (24%), fold-out (38%)
        const sceneBands = [
          { refA: sc1RefA, refB: sc1RefB, start: 0.735, end: 0.784 },
          { refA: sc2RefA, refB: sc2RefB, start: 0.792, end: 0.841 },
          { refA: sc3RefA, refB: sc3RefB, start: 0.849, end: 0.898 },
          { refA: sc4RefA, refB: sc4RefB, start: 0.906, end: 0.955 },
        ];

        // Animate titles
        sceneBands.forEach((band) => {
          const els = [band.refA.current, band.refB.current].filter(Boolean) as HTMLElement[];
          if (els.length === 0) return;

          if (pTotal >= band.start && pTotal <= band.end) {
            const b = (pTotal - band.start) / (band.end - band.start);
            let phase: "in" | "hold" | "out" = "hold";
            let phaseT = 1;

            if (b < 0.38) {
              phase = "in";
              phaseT = b / 0.38;
            } else if (b > 0.62) {
              phase = "out";
              phaseT = (b - 0.62) / 0.38;
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

        // Subtext animation:
        // Appears alongside Scene 1 title fold-in
        // Remains visible continuously through Scenes 1, 2, 3, and 4 title hold
        // Disappears alongside Scene 4 title fold-out
        const subtextEls = [subtextRefA.current, subtextRefB.current].filter(Boolean) as HTMLElement[];
        if (subtextEls.length > 0) {
          const subtextStartIn = 0.735;
          const subtextEndIn = 0.735 + 0.049 * 0.38;
          const subtextStartOut = 0.955 - 0.049 * 0.38;
          const subtextEndOut = 0.955;

          if (pTotal >= subtextStartIn && pTotal <= subtextEndOut) {
            let phase: "in" | "hold" | "out" = "hold";
            let phaseT = 1;

            if (pTotal < subtextEndIn) {
              phase = "in";
              phaseT = (pTotal - subtextStartIn) / (subtextEndIn - subtextStartIn);
            } else if (pTotal > subtextStartOut) {
              phase = "out";
              phaseT = (pTotal - subtextStartOut) / (subtextEndOut - subtextStartOut);
            }

            for (const subtextEl of subtextEls) {
              subtextEl.style.display = "flex";

              const chars = subtextEl.querySelectorAll<HTMLElement>("[data-fold-char]");
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
            for (const subtextEl of subtextEls) {
              subtextEl.style.display = "none";
            }
          }
        }

        // Dissolve phase: cubes vanish as soon as last sentence disappears (0.955 → 1.000)
        const dissolveStart = 0.955;
        const dissolveEnd = 1.000;
        if (pTotal >= dissolveStart) {
          const dissolveProgress = clamp((pTotal - dissolveStart) / (dissolveEnd - dissolveStart), 0, 1);
          sphereGridRef.current?.updateDissolve(dissolveProgress);
        } else {
          sphereGridRef.current?.updateDissolve(0);
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-[45] flex items-center justify-center w-full h-full overflow-hidden opacity-0 pointer-events-none [will-change:opacity,transform] ${className}`}
      >
        <div ref={bgWrapperRef} className="relative w-full h-full bg-[#f4f4f5] overflow-hidden">
          {/* 3D Sphere Grid Background */}
          <SphereGrid
            ref={sphereGridRef}
            gridCols={35}
            gridRows={23}
            maxElevation={70}
            elevationSmoothing={0.1}
            backgroundColor="#f4f4f5"
            gapRatio={0.04}
            parallaxStrength={75}
            isActive={isActive}
            isFrozen={isCardExpanded}
            className="w-full h-full"
          />

          {/* 3D Cylinder Gallery Cards */}
          <CylinderCards
            ref={cylinderCardsRef}
            isFrozen={isCardExpanded}
            onExpandChange={setIsCardExpanded}
          />

          {/* Layer A (z-[15]): mix-blend-difference — regular text blends directly over SphereGrid and back of cylinder (z-10), inside cylinder */}
          <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center pointer-events-none select-none px-[4%] text-center max-w-7xl w-full mx-auto gap-y-6 mix-blend-difference [&_.fold-text-highlight]:invisible">
            <div className="relative w-full flex items-center justify-center min-h-[3.5rem] overflow-visible">
              <div ref={sc1RefA} style={{ display: "none" }} className="absolute inset-0 w-full flex items-center justify-center">
                {renderFoldText(
                  offeringData.scene1.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  300,
                  "#ffffff",
                  true,
                  offeringData.scene1.highlights
                )}
              </div>
              <div ref={sc2RefA} style={{ display: "none" }} className="absolute inset-0 w-full flex items-center justify-center">
                {renderFoldText(
                  offeringData.scene2.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  300,
                  "#ffffff",
                  true,
                  offeringData.scene2.highlights
                )}
              </div>
              <div ref={sc3RefA} style={{ display: "none" }} className="absolute inset-0 w-full flex items-center justify-center">
                {renderFoldText(
                  offeringData.scene3.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  300,
                  "#ffffff",
                  true,
                  offeringData.scene3.highlights
                )}
              </div>
              <div ref={sc4RefA} style={{ display: "none" }} className="absolute inset-0 w-full flex items-center justify-center">
                {renderFoldText(
                  offeringData.scene4.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  300,
                  "#ffffff",
                  true,
                  offeringData.scene4.highlights
                )}
              </div>
            </div>

            {/* Persistent Subtext Element (Italic) */}
            <div ref={subtextRefA} style={{ display: "none" }} className="w-full flex justify-center">
              {renderFoldText(
                offeringData.scene1.subtitle,
                "clamp(0.85rem, 1.35vw, 1.2rem)",
                300,
                "#ffffff",
                false,
                [],
                true // isItalic
              )}
            </div>
          </div>

          {/* Layer B (z-[16]): no blend mode — shows only rainbow gradient highlighted words */}
          <div className="absolute inset-0 z-[16] flex flex-col items-center justify-center pointer-events-none select-none px-[4%] text-center max-w-7xl w-full mx-auto gap-y-6 [&_.fold-text-piece:not(.fold-text-highlight)]:invisible">
            <div className="relative w-full flex items-center justify-center min-h-[3.5rem] overflow-visible">
              <div ref={sc1RefB} style={{ display: "none" }} className="absolute inset-0 w-full flex items-center justify-center">
                {renderFoldText(
                  offeringData.scene1.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  300,
                  "#ffffff",
                  true,
                  offeringData.scene1.highlights
                )}
              </div>
              <div ref={sc2RefB} style={{ display: "none" }} className="absolute inset-0 w-full flex items-center justify-center">
                {renderFoldText(
                  offeringData.scene2.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  300,
                  "#ffffff",
                  true,
                  offeringData.scene2.highlights
                )}
              </div>
              <div ref={sc3RefB} style={{ display: "none" }} className="absolute inset-0 w-full flex items-center justify-center">
                {renderFoldText(
                  offeringData.scene3.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  300,
                  "#ffffff",
                  true,
                  offeringData.scene3.highlights
                )}
              </div>
              <div ref={sc4RefB} style={{ display: "none" }} className="absolute inset-0 w-full flex items-center justify-center">
                {renderFoldText(
                  offeringData.scene4.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  300,
                  "#ffffff",
                  true,
                  offeringData.scene4.highlights
                )}
              </div>
            </div>

            {/* Persistent Subtext Element (Italic) */}
            <div ref={subtextRefB} style={{ display: "none" }} className="w-full flex justify-center">
              {renderFoldText(
                offeringData.scene1.subtitle,
                "clamp(0.85rem, 1.35vw, 1.2rem)",
                300,
                "#ffffff",
                false,
                [],
                true // isItalic
              )}
            </div>
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

OfferingSection.displayName = "OfferingSection";

export default OfferingSection;
