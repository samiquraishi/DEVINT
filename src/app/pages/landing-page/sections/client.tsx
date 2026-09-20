"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import dynamic from "next/dynamic";
import clientData from "../../../../../public/content/client.json";
import { clamp, smoothstep } from "@/lib/utils";
import type { GlobeWorldRef } from "@/components/ui/globe";

const GlobeWorld = dynamic(
  () => import("@/components/ui/globe").then((m) => ({ default: m.GlobeWorld })),
  { ssr: false }
);

export interface ClientSectionRef {
  updateProgress: (pTotal: number) => void;
  container: HTMLDivElement | null;
}

export interface ClientSectionProps {
  isActive?: boolean;
  className?: string;
}

// ── Arc data for the globe (same as globe-demo.tsx) ───────────────────
const colors = ["#06b6d4", "#3b82f6"];

const sampleArcs = [
  { order: 1, startLat: -19.885592, startLng: -43.951191, endLat: -22.9068, endLng: -43.1729, arcAlt: 0.1 },
  { order: 1, startLat: 28.6139, startLng: 77.209, endLat: 3.139, endLng: 101.6869, arcAlt: 0.2 },
  { order: 1, startLat: -19.885592, startLng: -43.951191, endLat: -1.303396, endLng: 36.852443, arcAlt: 0.5 },
  { order: 2, startLat: 1.3521, startLng: 103.8198, endLat: 35.6762, endLng: 139.6503, arcAlt: 0.2 },
  { order: 2, startLat: 51.5072, startLng: -0.1276, endLat: 3.139, endLng: 101.6869, arcAlt: 0.3 },
  { order: 2, startLat: -15.785493, startLng: -47.909029, endLat: 36.162809, endLng: -115.119411, arcAlt: 0.3 },
  { order: 3, startLat: -33.8688, startLng: 151.2093, endLat: 22.3193, endLng: 114.1694, arcAlt: 0.3 },
  { order: 3, startLat: 21.3099, startLng: -157.8581, endLat: 40.7128, endLng: -74.006, arcAlt: 0.3 },
  { order: 3, startLat: -6.2088, startLng: 106.8456, endLat: 51.5072, endLng: -0.1276, arcAlt: 0.3 },
  { order: 4, startLat: 11.986597, startLng: 8.571831, endLat: -15.595412, endLng: -56.05918, arcAlt: 0.5 },
  { order: 4, startLat: -34.6037, startLng: -58.3816, endLat: 22.3193, endLng: 114.1694, arcAlt: 0.7 },
  { order: 4, startLat: 51.5072, startLng: -0.1276, endLat: 48.8566, endLng: -2.3522, arcAlt: 0.1 },
  { order: 5, startLat: 14.5995, startLng: 120.9842, endLat: 51.5072, endLng: -0.1276, arcAlt: 0.3 },
  { order: 5, startLat: 1.3521, startLng: 103.8198, endLat: -33.8688, endLng: 151.2093, arcAlt: 0.2 },
  { order: 5, startLat: 34.0522, startLng: -118.2437, endLat: 48.8566, endLng: -2.3522, arcAlt: 0.2 },
  { order: 6, startLat: -15.432563, startLng: 28.315853, endLat: 1.094136, endLng: -63.34546, arcAlt: 0.7 },
  { order: 6, startLat: 37.5665, startLng: 126.978, endLat: 35.6762, endLng: 139.6503, arcAlt: 0.1 },
  { order: 6, startLat: 22.3193, startLng: 114.1694, endLat: 51.5072, endLng: -0.1276, arcAlt: 0.3 },
  { order: 7, startLat: -19.885592, startLng: -43.951191, endLat: -15.595412, endLng: -56.05918, arcAlt: 0.1 },
  { order: 7, startLat: 48.8566, startLng: -2.3522, endLat: 52.52, endLng: 13.405, arcAlt: 0.1 },
  { order: 7, startLat: 52.52, startLng: 13.405, endLat: 34.0522, endLng: -118.2437, arcAlt: 0.2 },
  { order: 8, startLat: -8.833221, startLng: 13.264837, endLat: -33.936138, endLng: 18.436529, arcAlt: 0.2 },
  { order: 8, startLat: 49.2827, startLng: -123.1207, endLat: 52.3676, endLng: 4.9041, arcAlt: 0.2 },
  { order: 8, startLat: 1.3521, startLng: 103.8198, endLat: 40.7128, endLng: -74.006, arcAlt: 0.5 },
  { order: 9, startLat: 51.5072, startLng: -0.1276, endLat: 34.0522, endLng: -118.2437, arcAlt: 0.2 },
  { order: 9, startLat: 22.3193, startLng: 114.1694, endLat: -22.9068, endLng: -43.1729, arcAlt: 0.7 },
  { order: 9, startLat: 1.3521, startLng: 103.8198, endLat: -34.6037, endLng: -58.3816, arcAlt: 0.5 },
  { order: 10, startLat: -22.9068, startLng: -43.1729, endLat: 28.6139, endLng: 77.209, arcAlt: 0.7 },
  { order: 10, startLat: 34.0522, startLng: -118.2437, endLat: 31.2304, endLng: 121.4737, arcAlt: 0.3 },
  { order: 10, startLat: -6.2088, startLng: 106.8456, endLat: 52.3676, endLng: 4.9041, arcAlt: 0.3 },
  { order: 11, startLat: 41.9028, startLng: 12.4964, endLat: 34.0522, endLng: -118.2437, arcAlt: 0.2 },
  { order: 11, startLat: -6.2088, startLng: 106.8456, endLat: 31.2304, endLng: 121.4737, arcAlt: 0.2 },
  { order: 11, startLat: 22.3193, startLng: 114.1694, endLat: 1.3521, endLng: 103.8198, arcAlt: 0.2 },
  { order: 12, startLat: 34.0522, startLng: -118.2437, endLat: 37.7749, endLng: -122.4194, arcAlt: 0.1 },
  { order: 12, startLat: 35.6762, startLng: 139.6503, endLat: 22.3193, endLng: 114.1694, arcAlt: 0.2 },
  { order: 12, startLat: 22.3193, startLng: 114.1694, endLat: 34.0522, endLng: -118.2437, arcAlt: 0.3 },
  { order: 13, startLat: 52.52, startLng: 13.405, endLat: 22.3193, endLng: 114.1694, arcAlt: 0.3 },
  { order: 13, startLat: 11.986597, startLng: 8.571831, endLat: 35.6762, endLng: 139.6503, arcAlt: 0.3 },
  { order: 13, startLat: -22.9068, startLng: -43.1729, endLat: -34.6037, endLng: -58.3816, arcAlt: 0.1 },
  { order: 14, startLat: -33.936138, startLng: 18.436529, endLat: 21.395643, endLng: 39.883798, arcAlt: 0.3 },
];

// Build deterministic arc network with colors
const locations: { lat: number; lng: number }[] = [];
sampleArcs.forEach((arc) => {
  locations.push({ lat: arc.startLat, lng: arc.startLng });
  locations.push({ lat: arc.endLat, lng: arc.endLng });
});
const uniqueLocations = locations.filter(
  (v, i, a) => a.findIndex((v2) => v2.lat === v.lat && v2.lng === v.lng) === i
);
const locationColors = uniqueLocations.map((loc, i) => ({
  ...loc,
  color: colors[i % colors.length],
}));
const connectedArcs: any[] = [];
uniqueLocations.forEach((loc, i) => {
  const sourceColor = locationColors[i].color;
  for (let j = 0; j < 2; j++) {
    let targetIndex = (i + j * 7 + 3) % uniqueLocations.length;
    if (targetIndex === i) targetIndex = (targetIndex + 1) % uniqueLocations.length;
    const target = uniqueLocations[targetIndex];
    connectedArcs.push({
      order: i + j,
      startLat: loc.lat,
      startLng: loc.lng,
      endLat: target.lat,
      endLng: target.lng,
      arcAlt: 0.2 + ((i + j) % 5) * 0.1,
      color: sourceColor,
    });
  }
});

const globeConfig = {
  pointSize: 1.4,
  globeColor: "#062056",
  globeOpacity: 0.3,
  showAtmosphere: false,
  atmosphereColor: "#FFFFFF",
  atmosphereAltitude: 0.1,
  emissive: "#062056",
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: "#ffffff",
  polygonMargin: 0.8,
  ambientLight: "#ffffff",
  arcTime: 1500,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  autoRotate: false,
  autoRotateSpeed: 0,
};

const renderFoldText = (
  text: string,
  fontSize: string,
  fontWeight: number,
  color: string,
  highlights: string[] = [],
  align: "left" | "center" = "left",
  isItalic: boolean = false,
  fontFamilyClass: string = "font-montserrat",
  trackingClass: string = "tracking-[0.03em]",
  extraClass: string = ""
) => {
  const parts = text.split(/(\s+)/);
  const totalChars = text.replace(/\s+/g, "").length || 1;
  let charCounter = 0;

  return (
    <div
      className={`flex flex-wrap items-baseline ${fontFamilyClass} ${trackingClass} w-full ${
        align === "center" ? "justify-center text-center" : "justify-start text-left"
      } ${isItalic ? "italic" : ""} ${extraClass}`}
      style={{
        fontSize,
        fontWeight,
        color: color || undefined,
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

// ── Section ranges (snappier timeline) ─────────────────────────────────
const SECTION_START = 1.82;
const SECTION_END = 2.50;

// Globe: expands in center 1.82 -> 1.88, glides to right 1.88 -> 1.96
const GLOBE_INTRO_START = 1.82;
const GLOBE_EXPAND_END = 1.88;
const GLOBE_MOVE_END = 1.96;

// Text unfolds as globe glides to right
const EYEBROW_START = 1.90;
const EYEBROW_END = 1.95;

const HEADING_START = 1.94;
const HEADING_END = 2.02;

const PARAGRAPH_START = 2.00;
const PARAGRAPH_END = 2.07;

const POINTERS_START = 2.06;
const POINTERS_END = 2.16;

const HOLD_END = 2.42;
const FADE_OUT_END = 2.50;

export const ClientSection = forwardRef<ClientSectionRef, ClientSectionProps>(
  ({ isActive = true, className = "" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const globeRef = useRef<GlobeWorldRef>(null);
    const globeWrapperRef = useRef<HTMLDivElement>(null);

    // Text refs — Layer A (mix-blend-difference)
    const eyebrowRefA = useRef<HTMLDivElement>(null);
    const headingRefA = useRef<HTMLDivElement>(null);
    const paragraphRefA = useRef<HTMLDivElement>(null);
    const pointer1RefA = useRef<HTMLDivElement>(null);
    const pointer2RefA = useRef<HTMLDivElement>(null);
    const pointer3RefA = useRef<HTMLDivElement>(null);

    // Text refs — Layer B (highlights)
    const eyebrowRefB = useRef<HTMLDivElement>(null);
    const headingRefB = useRef<HTMLDivElement>(null);

    const section = clientData.section;

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        // If before section: cleanly reset all state
        if (pTotal < SECTION_START) {
          if (globeWrapperRef.current) {
            globeWrapperRef.current.style.visibility = "hidden";
            globeWrapperRef.current.style.opacity = "0";
            globeWrapperRef.current.style.left = "50%";
            globeWrapperRef.current.style.top = "50%";
            globeWrapperRef.current.style.transform = "translate(-50%, -50%)";
          }
          globeRef.current?.setScale(0.02);
          globeRef.current?.setScrollRotation(0);

          const allTextEls = [
            eyebrowRefA.current,
            eyebrowRefB.current,
            headingRefA.current,
            headingRefB.current,
            paragraphRefA.current,
            pointer1RefA.current,
            pointer2RefA.current,
            pointer3RefA.current,
          ];
          for (const el of allTextEls) {
            if (el) {
              el.style.visibility = "hidden";
              animateChars(el, "in", 0);
            }
          }
          return;
        }

        // If past section: cleanly hide everything off-screen to the right
        if (pTotal > SECTION_END) {
          if (globeWrapperRef.current) {
            globeWrapperRef.current.style.visibility = "hidden";
            globeWrapperRef.current.style.opacity = "0";
            globeWrapperRef.current.style.left = "150%";
            globeWrapperRef.current.style.top = "50%";
            globeWrapperRef.current.style.transform = "translate(-50%, -50%)";
          }
          const allTextEls = [
            eyebrowRefA.current,
            eyebrowRefB.current,
            headingRefA.current,
            headingRefB.current,
            paragraphRefA.current,
            pointer1RefA.current,
            pointer2RefA.current,
            pointer3RefA.current,
          ];
          for (const el of allTextEls) {
            if (el) {
              el.style.visibility = "hidden";
              animateChars(el, "out", 1);
            }
          }
          return;
        }

        // ── Globe scroll rotation (fluid lerp inside GlobeWorld tracks this) ──
        const globeProgress = clamp((pTotal - SECTION_START) / (SECTION_END - SECTION_START), 0, 1);
        const targetRotation = globeProgress * Math.PI * 4;
        globeRef.current?.setScrollRotation(targetRotation);

        // ── Globe positioning & scale ──
        if (globeWrapperRef.current) {
          globeWrapperRef.current.style.visibility = "visible";
          globeWrapperRef.current.style.top = "50%";
          globeWrapperRef.current.style.transform = "translate(-50%, -50%)";

          if (pTotal < GLOBE_EXPAND_END) {
            // 1. Appear from center (50%) and expand in 3D
            const introP = smoothstep(GLOBE_INTRO_START, GLOBE_EXPAND_END, pTotal);
            const scale = 0.05 + introP * 0.95; // 0.05 → 1.0
            globeWrapperRef.current.style.left = "50%";
            globeWrapperRef.current.style.opacity = `${introP}`;
            globeRef.current?.setScale(scale);
          } else if (pTotal < GLOBE_MOVE_END) {
            // 2. Glide from center (50%) to right (75%)
            const moveP = smoothstep(GLOBE_EXPAND_END, GLOBE_MOVE_END, pTotal);
            const leftPos = 50 + moveP * 25; // 50% → 75%
            globeWrapperRef.current.style.left = `${leftPos}%`;
            globeWrapperRef.current.style.opacity = "1";
            globeRef.current?.setScale(1);
          } else if (pTotal <= HOLD_END) {
            // 3. Settled at right (75%), fully interactive
            globeWrapperRef.current.style.left = "75%";
            globeWrapperRef.current.style.opacity = "1";
            globeRef.current?.setScale(1);
          } else {
            // 4. Exit off-screen to the right (75% → 150%)
            const moveOutP = smoothstep(HOLD_END, FADE_OUT_END, pTotal);
            const leftPos = 75 + moveOutP * 75; // 75% → 150%
            globeWrapperRef.current.style.left = `${leftPos}%`;
            globeWrapperRef.current.style.opacity = "1";
            globeRef.current?.setScale(1);
          }
        }

        // ── Text animations ──
        // Eyebrow: "GLOBAL REACH" (both Layer A & Layer B)
        const eyebrowEls = [eyebrowRefA.current, eyebrowRefB.current].filter(Boolean) as HTMLElement[];
        for (const eyebrowEl of eyebrowEls) {
          if (pTotal >= EYEBROW_START && pTotal <= FADE_OUT_END) {
            eyebrowEl.style.visibility = "visible";
            if (pTotal < EYEBROW_END) {
              const t = clamp((pTotal - EYEBROW_START) / (EYEBROW_END - EYEBROW_START), 0, 1);
              animateChars(eyebrowEl, "in", t);
            } else if (pTotal > 2.42) {
              const t = clamp((pTotal - 2.42) / 0.03, 0, 1);
              animateChars(eyebrowEl, "out", t);
            } else {
              animateChars(eyebrowEl, "hold", 1);
            }
          } else {
            eyebrowEl.style.visibility = "hidden";
            animateChars(eyebrowEl, "out", 1);
          }
        }

        // Heading (Layer A + B): "ONE TEAM. NO BORDERS."
        const headingEls = [headingRefA.current, headingRefB.current].filter(Boolean) as HTMLElement[];
        for (const el of headingEls) {
          if (pTotal >= HEADING_START && pTotal <= FADE_OUT_END) {
            el.style.visibility = "visible";

            if (pTotal < HEADING_END) {
              const t = clamp((pTotal - HEADING_START) / (HEADING_END - HEADING_START), 0, 1);
              animateChars(el, "in", t);
            } else if (pTotal > 2.43) {
              const t = clamp((pTotal - 2.43) / 0.03, 0, 1);
              animateChars(el, "out", t);
            } else {
              animateChars(el, "hold", 1);
            }
          } else {
            el.style.visibility = "hidden";
            animateChars(el, "out", 1); // ensures chars are hidden
          }
        }

        // Paragraph
        const paragraphEl = paragraphRefA.current;
        if (paragraphEl) {
          if (pTotal >= PARAGRAPH_START && pTotal <= FADE_OUT_END) {
            paragraphEl.style.visibility = "visible";
            if (pTotal < PARAGRAPH_END) {
              const t = clamp((pTotal - PARAGRAPH_START) / (PARAGRAPH_END - PARAGRAPH_START), 0, 1);
              animateChars(paragraphEl, "in", t);
            } else if (pTotal > 2.44) {
              const t = clamp((pTotal - 2.44) / 0.03, 0, 1);
              animateChars(paragraphEl, "out", t);
            } else {
              animateChars(paragraphEl, "hold", 1);
            }
          } else {
            paragraphEl.style.visibility = "hidden";
            animateChars(paragraphEl, "out", 1);
          }
        }

        // Pointers (staggered)
        const pointerRefs = [pointer1RefA, pointer2RefA, pointer3RefA];
        const pointerDuration = (POINTERS_END - POINTERS_START) / 3;
        pointerRefs.forEach((pRef, idx) => {
          const el = pRef.current;
          if (!el) return;

          const pStart = POINTERS_START + idx * pointerDuration;
          const pEnd = pStart + pointerDuration;

          if (pTotal >= pStart && pTotal <= FADE_OUT_END) {
            el.style.visibility = "visible";
            if (pTotal < pEnd) {
              const t = clamp((pTotal - pStart) / (pEnd - pStart), 0, 1);
              animateChars(el, "in", t);
            } else if (pTotal > 2.45) {
              const t = clamp((pTotal - 2.45) / 0.03, 0, 1);
              animateChars(el, "out", t);
            } else {
              animateChars(el, "hold", 1);
            }
          } else {
            el.style.visibility = "hidden";
            animateChars(el, "out", 1);
          }
        });
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-[43] flex items-center justify-center w-full h-full overflow-hidden pointer-events-none [will-change:opacity] ${className}`}
        style={{
          background: "radial-gradient(circle at 50% 50%, rgb(8, 8, 26) 0%, rgb(4, 4, 13) 75%)",
        }}
      >
        {/* ── GLOBE (absolute positioned, overflows right) ──────────────── */}
        <div
          ref={globeWrapperRef}
          className="absolute w-[105vh] h-[105vh] overflow-visible pointer-events-auto cursor-grab active:cursor-grabbing z-20"
          style={{
            visibility: "hidden",
            opacity: 0,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            willChange: "transform, opacity, left",
          }}
        >
          <GlobeWorld
            ref={globeRef}
            data={connectedArcs}
            globeConfig={globeConfig}
          />
        </div>

        {/* ── TEXT CONTENT — LEFT SIDE ──────────────────────────────────── */}
        {/* Layer A (mix-blend-difference) */}
        <div className="absolute inset-0 z-30 pointer-events-none select-none flex items-center px-[4%] lg:px-[6%] mix-blend-difference [&_.fold-text-highlight]:invisible">
          <div className="w-full lg:w-[45%] flex flex-col gap-y-5 pr-4">
            {/* Eyebrow */}
            <div
              ref={eyebrowRefA}
              style={{ visibility: "hidden" }}
              className="w-full"
            >
              {renderFoldText(
                section.eyebrow,
                "clamp(0.75rem, 1vw, 0.875rem)",
                300,
                "#ffffff",
                ["GLOBAL", "REACH"],
                "left",
                false,
                "font-lemon",
                "tracking-[0.24em]",
                "uppercase"
              )}
            </div>

            {/* Heading */}
            <div
              ref={headingRefA}
              style={{ visibility: "hidden" }}
              className="w-full"
            >
              {renderFoldText(
                section.heading,
                "clamp(1.5rem, 3vw, 3rem)",
                300,
                "#ffffff",
                section.heading_highlights,
                "left"
              )}
            </div>

            {/* Paragraph */}
            <div
              ref={paragraphRefA}
              style={{ visibility: "hidden" }}
              className="w-full max-w-lg"
            >
              {renderFoldText(
                section.paragraph,
                "clamp(0.875rem, 1vw, 1rem)",
                400,
                "rgba(255,255,255,0.8)",
                [],
                "left",
                false,
                "font-montserrat",
                "tracking-[0.03em]",
                "leading-relaxed"
              )}
            </div>

            {/* Pointers */}
            <div className="flex flex-col gap-y-4 mt-2 w-full">
              {section.pointers.map((pointer, idx) => (
                <div
                  key={`ptr-${idx}`}
                  ref={[pointer1RefA, pointer2RefA, pointer3RefA][idx]}
                  style={{ visibility: "hidden" }}
                  className="flex flex-col gap-y-1 w-full"
                >
                  {renderFoldText(pointer.label, "0.75rem", 300, "rgba(255,255,255,0.9)", [], "left", false, "font-lemon", "tracking-[0.18em]", "uppercase")}
                  {renderFoldText(pointer.description, "0.875rem", 400, "rgba(255,255,255,0.6)", [], "left", false, "font-montserrat", "tracking-normal")}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Layer B (highlights overlay — heading only) */}
        <div className="absolute inset-0 z-[31] pointer-events-none select-none flex items-center px-[4%] lg:px-[6%] [&_.fold-text-piece:not(.fold-text-highlight)]:invisible">
          <div className="w-full lg:w-[45%] flex flex-col gap-y-5 pr-4">
            {/* Eyebrow (rainbow gradient highlight) */}
            <div
              ref={eyebrowRefB}
              style={{ visibility: "hidden" }}
              className="w-full"
            >
              {renderFoldText(
                section.eyebrow,
                "clamp(0.75rem, 1vw, 0.875rem)",
                300,
                "#ffffff",
                ["GLOBAL", "REACH"],
                "left",
                false,
                "font-lemon",
                "tracking-[0.24em]",
                "uppercase"
              )}
            </div>

            {/* Heading (highlights only) */}
            <div
              ref={headingRefB}
              style={{ visibility: "hidden" }}
              className="w-full"
            >
              {renderFoldText(
                section.heading,
                "clamp(1.5rem, 3vw, 3rem)",
                300,
                "#ffffff",
                section.heading_highlights,
                "left"
              )}
            </div>

            {/* Spacer for paragraph */}
            <div
              style={{ visibility: "hidden" }}
              className="w-full max-w-lg invisible"
            >
              {renderFoldText(
                section.paragraph,
                "clamp(0.875rem, 1vw, 1rem)",
                400,
                "rgba(255,255,255,0.8)",
                [],
                "left",
                false,
                "font-montserrat",
                "tracking-[0.03em]",
                "leading-relaxed"
              )}
            </div>

            {/* Spacers for pointers */}
            <div className="flex flex-col gap-y-4 mt-2 w-full">
              {section.pointers.map((pointer, idx) => (
                <div
                  key={`ptr-b-${idx}`}
                  style={{ visibility: "hidden" }}
                  className="flex flex-col gap-y-1 w-full invisible"
                >
                  {renderFoldText(pointer.label, "0.75rem", 300, "rgba(255,255,255,0.9)", [], "left", false, "font-lemon", "tracking-[0.18em]", "uppercase")}
                  {renderFoldText(pointer.description, "0.875rem", 400, "rgba(255,255,255,0.6)", [], "left", false, "font-montserrat", "tracking-normal")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ClientSection.displayName = "ClientSection";
export default ClientSection;
