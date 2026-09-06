"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
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
                    className={`inline-block [backface-visibility:hidden] [will-change:transform,opacity] ${
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
    const sc1Ref = useRef<HTMLDivElement>(null);
    const sc2Ref = useRef<HTMLDivElement>(null);
    const sc3Ref = useRef<HTMLDivElement>(null);
    const sc4Ref = useRef<HTMLDivElement>(null);
    const subtextRef = useRef<HTMLDivElement>(null);
    const bgWrapperRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        sphereGridRef.current?.updateScroll(pTotal);
        cylinderCardsRef.current?.updateProgress(pTotal);

        // Bands for the 4 scenes (compressed to end at 0.940, freeing 0.940–1.000 for dissolve):
        // Original span 0.260 scaled by 200/260 ≈ 0.769
        const sceneBands = [
          { ref: sc1Ref, start: 0.740, end: 0.782 },
          { ref: sc2Ref, start: 0.796, end: 0.838 },
          { ref: sc3Ref, start: 0.852, end: 0.895 },
          { ref: sc4Ref, start: 0.909, end: 0.940 },
        ];

        // Animate titles
        sceneBands.forEach((band) => {
          const el = band.ref.current;
          if (!el) return;

          if (pTotal >= band.start && pTotal <= band.end) {
            el.style.display = "flex";

            const b = (pTotal - band.start) / (band.end - band.start);
            let phase: "in" | "hold" | "out" = "hold";
            let phaseT = 1;

            // 18% fold-in, 64% hold (increased display time), 18% fold-out
            if (b < 0.18) {
              phase = "in";
              phaseT = b / 0.18;
            } else if (b > 0.82) {
              phase = "out";
              phaseT = (b - 0.82) / 0.18;
            }

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
          } else {
            el.style.display = "none";
          }
        });

        // Subtext animation:
        // Appears alongside Scene 1 title fold-in
        // Remains visible continuously through Scenes 1, 2, 3, and 4 title hold
        // Disappears alongside Scene 4 title fold-out
        const subtextEl = subtextRef.current;
        if (subtextEl) {
          const subtextStartIn = 0.740;
          const subtextEndIn = 0.740 + 0.042 * 0.18;
          const subtextStartOut = 0.909 + 0.031 * 0.82;
          const subtextEndOut = 0.940;

          if (pTotal >= subtextStartIn && pTotal <= subtextEndOut) {
            subtextEl.style.display = "flex";

            let phase: "in" | "hold" | "out" = "hold";
            let phaseT = 1;

            if (pTotal < subtextEndIn) {
              phase = "in";
              phaseT = (pTotal - subtextStartIn) / (subtextEndIn - subtextStartIn);
            } else if (pTotal > subtextStartOut) {
              phase = "out";
              phaseT = (pTotal - subtextStartOut) / (subtextEndOut - subtextStartOut);
            }

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
          } else {
            subtextEl.style.display = "none";
          }
        }

        // Dissolve phase: cubes vanish as soon as last sentence disappears (0.938 → 1.000)
        const dissolveStart = 0.938;
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
            className="w-full h-full"
          />

          {/* Centered Offerings Statements Overlay */}
          <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center pointer-events-none select-none px-[4%] text-center max-w-7xl w-full mx-auto gap-y-6">
            <div className="relative w-full flex items-center justify-center min-h-[3.5rem] overflow-visible pointer-events-auto">
              <div ref={sc1Ref} style={{ display: "none" }} className="w-full flex justify-center">
                {renderFoldText(
                  offeringData.scene1.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  400,
                  "#111118",
                  true,
                  offeringData.scene1.highlights
                )}
              </div>
              <div ref={sc2Ref} style={{ display: "none" }} className="w-full flex justify-center">
                {renderFoldText(
                  offeringData.scene2.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  400,
                  "#111118",
                  true,
                  offeringData.scene2.highlights
                )}
              </div>
              <div ref={sc3Ref} style={{ display: "none" }} className="w-full flex justify-center">
                {renderFoldText(
                  offeringData.scene3.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  400,
                  "#111118",
                  true,
                  offeringData.scene3.highlights
                )}
              </div>
              <div ref={sc4Ref} style={{ display: "none" }} className="w-full flex justify-center">
                {renderFoldText(
                  offeringData.scene4.title,
                  "clamp(1.1rem, 2.2vw, 2.2rem)",
                  400,
                  "#111118",
                  true,
                  offeringData.scene4.highlights
                )}
              </div>
            </div>

            {/* Persistent Subtext Element (Italic) */}
            <div ref={subtextRef} style={{ display: "none" }} className="w-full flex justify-center pointer-events-auto">
              {renderFoldText(
                offeringData.scene1.subtitle,
                "clamp(0.85rem, 1.35vw, 1.2rem)",
                300,
                "#4a4a58",
                false,
                [],
                true // isItalic
              )}
            </div>
          </div>

          <CylinderCards ref={cylinderCardsRef} />

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
