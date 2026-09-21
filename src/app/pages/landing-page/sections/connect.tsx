"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { clamp, smoothstep } from "@/lib/utils";
import type { AuroraFluxHandle } from "@/components/ui/aurora-flux";
import connectData from "../../../../../public/content/connect.json";

const AuroraFlux = dynamic(
  () => import("@/components/ui/aurora-flux").then((m) => m.AuroraFlux),
  { ssr: false }
);

export interface ConnectSectionRef {
  updateProgress: (pTotal: number) => void;
  container: HTMLDivElement | null;
}

export interface ConnectSectionProps {
  isActive?: boolean;
  className?: string;
}

// ── Scroll Ranges ──────────────────────────────────────
const SECTION_START = 2.35; 

const INTRO_L1_START = 2.39;
const INTRO_L1_END = 2.45;
const INTRO_L2_START = 2.42;
const INTRO_L2_END = 2.48;
const INTRO_OUT_START = 2.63;
const INTRO_OUT_END = 2.68;

const APPEAR_START = 2.49;  
const APPEAR_END = 2.72;    
const HOLD_END = 2.93;
const DISAPPEAR_START = 2.93;
const DISAPPEAR_END = 3.05;
const SECTION_END = 3.35; // Allow scrolling slightly after text and aurora disappear

const FORM_START = 2.69;
const FORM_END = 2.79;

const BASE_SCALE = 1.2;
const ZOOM_AMOUNT = 4.0;
const PARALLAX_STRENGTH = 75; // Same parallax intensity as SphereGrid in Problem and Offering

const renderFoldText = (
  text: string,
  fontSize: string,
  fontWeight: number,
  color: string,
  highlights: string[] = [],
  align: "left" | "center" = "left",
  fontFamilyClass: string = "font-montserrat",
  trackingClass: string = "tracking-[0.03em]",
  extraClass: string = "",
  isItalic: boolean = false
) => {
  const parts = text.split(/(\s+)/);
  const totalChars = text.replace(/\s+/g, "").length || 1;
  let charCounter = 0;

  return (
    <div
      className={`flex flex-wrap items-baseline ${fontFamilyClass} ${trackingClass} w-full ${
        align === "center" ? "justify-center text-center" : "justify-start text-left"
      } ${isItalic ? "italic" : ""} ${extraClass}`}
      style={{ fontSize, fontWeight, color, fontStyle: isItalic ? "italic" : "normal" }}
    >
      {parts.map((part, wordIndex) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return <span key={`ws-${wordIndex}`}>&nbsp;</span>;

        const cleanWord = part.toLowerCase().replace(/[.,'":;!?()→]/g, "");
        const isHighlighted = highlights.some(
          (w) => w.toLowerCase() === cleanWord || cleanWord.startsWith(w.toLowerCase())
        );
        const charArray = Array.from(part);
        const wordLen = charArray.length;

        return (
          <span key={`word-${wordIndex}`} className="inline-flex items-baseline" style={{ perspective: "800px", transformStyle: "preserve-3d" }}>
            {charArray.map((char, charIndex) => {
              const globalIdx = charCounter++;
              const charNorm = globalIdx / totalChars;
              const bgX = wordLen > 1 ? (charIndex / (wordLen - 1)) * 100 : 0;
              return (
                <span key={`c-${globalIdx}`} className="inline-block" style={{ perspective: "800px", transformStyle: "preserve-3d" }}>
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

const animateElements = (container: HTMLElement, phase: "in" | "hold" | "out", phaseT: number) => {
  const elements = container.querySelectorAll<HTMLElement>("[data-fold-element]");
  elements.forEach((el, i) => {
    if (phase === "hold") {
      el.style.transform = "none";
      el.style.opacity = "1";
      el.style.willChange = "auto";
      el.style.backfaceVisibility = "visible";
      return;
    }

    const total = elements.length;
    const norm = i / (total || 1);
    const staggerStart = norm * 0.45;
    const charDuration = 0.55;
    
    let rotateX = 0;
    let opacity = 1;

    if (phase === "in") {
      const raw = clamp((phaseT - staggerStart) / charDuration, 0, 1);
      if (raw >= 1) {
        el.style.transform = "none";
        el.style.opacity = "1";
        el.style.willChange = "auto";
        el.style.backfaceVisibility = "visible";
        return;
      }
      const eased = raw * (2 - raw); // ease out
      rotateX = (1 - eased) * -90;
      opacity = eased;
    } else if (phase === "out") {
      const raw = clamp((phaseT - staggerStart) / charDuration, 0, 1);
      const eased = raw * raw; // ease in
      rotateX = eased * 90;
      opacity = 1 - eased;
    }
    
    el.style.transformOrigin = "50% 0%";
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg)`;
    el.style.opacity = `${opacity}`;
    el.style.willChange = "transform, opacity";
    el.style.backfaceVisibility = "hidden";
  });
};

export const ConnectSection = forwardRef<ConnectSectionRef, ConnectSectionProps>(
  ({ isActive = true, className = "" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const auroraWrapperRef = useRef<HTMLDivElement>(null);
    const auroraRef = useRef<AuroraFluxHandle>(null);

    const introLine1Ref = useRef<HTMLDivElement>(null);
    const introLine2Ref = useRef<HTMLDivElement>(null);
    const formContainerRef = useRef<HTMLDivElement>(null);
    const leftTextLayerARef = useRef<HTMLDivElement>(null);
    const leftTextLayerBRef = useRef<HTMLDivElement>(null);
    const rightFormRef = useRef<HTMLDivElement>(null);

    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

    const parallaxRef = useRef({ cx: 0, cy: 0, tx: 0, ty: 0 });
    const currentScaleRef = useRef(BASE_SCALE);
    const isVisibleRef = useRef(false);

    useEffect(() => {
      const handlePointerMove = (e: PointerEvent) => {
        if (!isVisibleRef.current) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (w <= 0 || h <= 0) return;
        parallaxRef.current.tx = (e.clientX - w / 2) / (w / 2);
        parallaxRef.current.ty = (e.clientY - h / 2) / (h / 2);
      };

      const handlePointerLeave = () => {
        parallaxRef.current.tx = 0;
        parallaxRef.current.ty = 0;
      };

      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      document.addEventListener("mouseleave", handlePointerLeave);

      let animId: number | null = null;
      let lastT = 0;

      const renderLoop = (now: DOMHighResTimeStamp) => {
        const dt = lastT === 0 ? 16.666 : now - lastT;
        lastT = now;
        const timeScale = dt / 16.666;

        if (isVisibleRef.current) {
          const pK = 1 - Math.pow(1 - 0.06, timeScale);
          parallaxRef.current.cx += (parallaxRef.current.tx - parallaxRef.current.cx) * pK;
          parallaxRef.current.cy += (parallaxRef.current.ty - parallaxRef.current.cy) * pK;

          const pOffsetX = parallaxRef.current.cx * (PARALLAX_STRENGTH * 0.5);
          const pOffsetY = parallaxRef.current.cy * (PARALLAX_STRENGTH * 0.5);

          if (auroraWrapperRef.current) {
            auroraWrapperRef.current.style.transform = `translate3d(${pOffsetX.toFixed(2)}px, ${pOffsetY.toFixed(2)}px, 0) scale(${currentScaleRef.current.toFixed(4)})`;
          }
        }

        animId = requestAnimationFrame(renderLoop);
      };

      animId = requestAnimationFrame(renderLoop);

      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("mouseleave", handlePointerLeave);
        if (animId !== null) cancelAnimationFrame(animId);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        const container = containerRef.current;
        if (!container) return;

        if (pTotal < SECTION_START || pTotal > SECTION_END) {
          isVisibleRef.current = false;
          container.style.display = "none";
          container.style.visibility = "hidden";
          container.style.opacity = "0";
          container.style.pointerEvents = "none";
          auroraRef.current?.setProgress(0);
          currentScaleRef.current = BASE_SCALE;
          if (auroraWrapperRef.current) {
            auroraWrapperRef.current.style.opacity = "0";
            auroraWrapperRef.current.style.transform = `translate3d(0px, 0px, 0) scale(${BASE_SCALE})`;
          }
          return;
        }

        isVisibleRef.current = true;
        container.style.display = "flex";
        container.style.visibility = "visible";
        container.style.pointerEvents = pTotal >= FORM_START && pTotal < DISAPPEAR_START ? "auto" : "none";

        let formationProgress = 0;
        if (pTotal < APPEAR_START) formationProgress = 0;
        else if (pTotal < APPEAR_END) formationProgress = clamp((pTotal - APPEAR_START) / (APPEAR_END - APPEAR_START), 0, 1);
        else formationProgress = 1.0;
        auroraRef.current?.setProgress(formationProgress);

        if (pTotal <= HOLD_END) {
          const fadeIn = smoothstep(SECTION_START, SECTION_START + 0.04, pTotal);
          container.style.opacity = `${fadeIn}`;
          if (auroraWrapperRef.current) {
            const auroraFade = smoothstep(APPEAR_START - 0.04, APPEAR_START, pTotal) * 0.70;
            auroraWrapperRef.current.style.opacity = `${auroraFade}`;
          }
          currentScaleRef.current = BASE_SCALE;
        } else {
          // Container remains fully visible (opacity 1) with dark radial gradient — NEVER transitions to white!
          container.style.opacity = "1";
          if (auroraWrapperRef.current) {
            // Aurora background fades out and zooms away smoothly during [DISAPPEAR_START, DISAPPEAR_END]
            const auroraFadeOut = 1 - smoothstep(DISAPPEAR_START, DISAPPEAR_END, pTotal);
            auroraWrapperRef.current.style.opacity = `${0.70 * auroraFadeOut}`;
            const zoomP = smoothstep(DISAPPEAR_START, DISAPPEAR_END, pTotal);
            currentScaleRef.current = BASE_SCALE + zoomP * ZOOM_AMOUNT;
          }
        }

        // Intro line 1
        if (introLine1Ref.current) {
          if (pTotal >= INTRO_L1_START && pTotal <= INTRO_OUT_END) {
            introLine1Ref.current.style.visibility = "visible";
            if (pTotal < INTRO_L1_END) {
              animateChars(introLine1Ref.current, "in", clamp((pTotal - INTRO_L1_START) / (INTRO_L1_END - INTRO_L1_START), 0, 1));
            } else if (pTotal > INTRO_OUT_START) {
              animateChars(introLine1Ref.current, "out", clamp((pTotal - INTRO_OUT_START) / (INTRO_OUT_END - INTRO_OUT_START), 0, 1));
            } else {
              animateChars(introLine1Ref.current, "hold", 1);
            }
          } else {
            introLine1Ref.current.style.visibility = "hidden";
            animateChars(introLine1Ref.current, "out", 1);
          }
        }

        // Intro line 2
        if (introLine2Ref.current) {
          if (pTotal >= INTRO_L2_START && pTotal <= INTRO_OUT_END) {
            introLine2Ref.current.style.visibility = "visible";
            if (pTotal < INTRO_L2_END) {
              animateChars(introLine2Ref.current, "in", clamp((pTotal - INTRO_L2_START) / (INTRO_L2_END - INTRO_L2_START), 0, 1));
            } else if (pTotal > INTRO_OUT_START) {
              animateChars(introLine2Ref.current, "out", clamp((pTotal - INTRO_OUT_START) / (INTRO_OUT_END - INTRO_OUT_START), 0, 1));
            } else {
              animateChars(introLine2Ref.current, "hold", 1);
            }
          } else {
            introLine2Ref.current.style.visibility = "hidden";
            animateChars(introLine2Ref.current, "out", 1);
          }
        }

        // Form structure unfold animation
        if (formContainerRef.current) {
          if (pTotal >= FORM_START && pTotal <= DISAPPEAR_END) {
            formContainerRef.current.style.visibility = "visible";
            
            let phase: "in" | "hold" | "out" = "hold";
            let localT = 1;
            
            if (pTotal <= FORM_END) {
               phase = "in";
               localT = clamp((pTotal - FORM_START) / (FORM_END - FORM_START), 0, 1);
            } else if (pTotal >= DISAPPEAR_START) {
               phase = "out";
               localT = clamp((pTotal - DISAPPEAR_START) / (DISAPPEAR_END - DISAPPEAR_START), 0, 1);
            }

            if (leftTextLayerARef.current) animateChars(leftTextLayerARef.current, phase, localT);
            if (leftTextLayerBRef.current) animateChars(leftTextLayerBRef.current, phase, localT);
            if (rightFormRef.current) animateElements(rightFormRef.current, phase, localT);
            
          } else {
            formContainerRef.current.style.visibility = "hidden";
            if (leftTextLayerARef.current) animateChars(leftTextLayerARef.current, "out", 1);
            if (leftTextLayerBRef.current) animateChars(leftTextLayerBRef.current, "out", 1);
            if (rightFormRef.current) animateElements(rightFormRef.current, "out", 1);
          }
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-[50] flex items-center justify-center w-full h-full overflow-hidden pointer-events-none [will-change:opacity] ${className}`}
        style={{
          display: "none",
          visibility: "hidden",
          opacity: 0,
          background: "radial-gradient(circle at 50% 50%, rgb(8, 8, 26) 0%, rgb(4, 4, 13) 75%)",
        }}
      >
        <div
          ref={auroraWrapperRef}
          className="absolute inset-0 w-full h-full z-0 pointer-events-none [will-change:transform]"
          style={{ transform: `scale(${BASE_SCALE})` }}
        >
          <AuroraFlux ref={auroraRef} fullScreen={false} scrollBased={false} className="w-full h-full" />
        </div>

        {/* INTRO TEXT LAYER */}
        <div className="absolute inset-0 z-[48] flex flex-col items-center justify-center pointer-events-none px-6">
          <div ref={introLine1Ref} style={{ visibility: "hidden" }} className="grid w-full mb-3">
            {/* Layer A (mix-blend-difference) */}
            <div className="col-start-1 row-start-1 mix-blend-difference [&_.fold-text-highlight]:invisible">
              {renderFoldText(
                connectData.intro.line1, 
                "clamp(1.3rem, 2.6vw, 2.4rem)", 
                300, 
                "#ffffff", 
                connectData.intro.line1_highlights || [], 
                "center", 
                "font-montserrat", 
                "tracking-[0.03em]", 
                "uppercase"
              )}
            </div>
            {/* Layer B (normal blend, highlights only) */}
            <div className="col-start-1 row-start-1 [&_.fold-text-piece:not(.fold-text-highlight)]:invisible">
              {renderFoldText(
                connectData.intro.line1, 
                "clamp(1.3rem, 2.6vw, 2.4rem)", 
                300, 
                "#ffffff", 
                connectData.intro.line1_highlights || [], 
                "center", 
                "font-montserrat", 
                "tracking-[0.03em]", 
                "uppercase"
              )}
            </div>
          </div>
          <div ref={introLine2Ref} style={{ visibility: "hidden" }} className="w-full mix-blend-difference">
            {renderFoldText(
              connectData.intro.line2, 
              "clamp(0.85rem, 1.35vw, 1.2rem)", 
              300, 
              "#ffffff", 
              [], 
              "center",
              "font-montserrat",
              "tracking-[0.03em]",
              "",
              true
            )}
          </div>
        </div>

        {/* FORM LAYER */}
        <div
          ref={formContainerRef}
          className="absolute inset-0 z-[50] flex flex-col items-center justify-center w-full h-full px-[4%] lg:px-[6%] max-w-7xl mx-auto pointer-events-none"
          style={{ visibility: "hidden" }}
        >
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-stretch pointer-events-none">
            
            {/* Left Column Text Layer */}
            <div className="relative w-full h-full flex flex-col justify-end pb-4 lg:pb-12 min-h-[300px] pointer-events-none select-none">
              
              {/* Layer A (mix-blend-difference, hides highlights) */}
              <div 
                ref={leftTextLayerARef}
                className="absolute bottom-0 w-full flex flex-col text-left space-y-5 mix-blend-difference pointer-events-none select-none [&_.fold-text-highlight]:invisible"
              >
                {renderFoldText(
                  connectData.leftSide.heading,
                  "clamp(1.5rem, 3vw, 3rem)",
                  300,
                  "#ffffff",
                  connectData.leftSide.heading_highlights,
                  "left",
                  "font-montserrat",
                  "tracking-[0.03em]"
                )}
                <div className="max-w-md">
                  {renderFoldText(
                    connectData.leftSide.paragraph,
                    "clamp(1rem, 1.25vw, 1.125rem)",
                    400,
                    "#ffffff",
                    connectData.leftSide.paragraph_highlights,
                    "left",
                    "font-montserrat",
                    "tracking-[0.03em] leading-relaxed"
                  )}
                </div>
              </div>

              {/* Layer B (normal blend, hides non-highlights) */}
              <div 
                ref={leftTextLayerBRef}
                className="absolute bottom-0 w-full flex flex-col text-left space-y-5 pointer-events-none select-none [&_.fold-text-piece:not(.fold-text-highlight)]:invisible"
              >
                {renderFoldText(
                  connectData.leftSide.heading,
                  "clamp(1.5rem, 3vw, 3rem)",
                  300,
                  "#ffffff",
                  connectData.leftSide.heading_highlights,
                  "left",
                  "font-montserrat",
                  "tracking-[0.03em]"
                )}
                <div className="max-w-md">
                  {renderFoldText(
                    connectData.leftSide.paragraph,
                    "clamp(1rem, 1.25vw, 1.125rem)",
                    400,
                    "#ffffff",
                    connectData.leftSide.paragraph_highlights,
                    "left",
                    "font-montserrat",
                    "tracking-[0.03em] leading-relaxed"
                  )}
                </div>
              </div>

            </div>

            {/* Right Column - Form */}
            <div ref={rightFormRef} className="flex flex-col space-y-4 w-full relative pointer-events-auto">
              <div className="flex flex-col space-y-5 max-w-[420px] w-full mx-auto lg:ml-6 lg:mr-auto">
                
                {/* Field 1 (Name) */}
                <div className="flex flex-col space-y-2 pointer-events-auto" data-fold-element>
                  <label htmlFor="connect-name" className="text-xs font-medium text-white mix-blend-difference tracking-widest pl-1 cursor-pointer select-none">
                    {connectData.form.field1.label}
                  </label>
                  <input 
                    id="connect-name"
                    type="text" 
                    placeholder={connectData.form.field1.placeholder}
                    className="w-full bg-white/[0.12] backdrop-blur-xl border border-white/[0.15] text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:border-white/40 focus:bg-white/[0.18] transition-all pointer-events-auto text-base relative z-10"
                  />
                </div>

                {/* Field 2 (Email) */}
                <div className="flex flex-col space-y-2 pointer-events-auto" data-fold-element>
                  <label htmlFor="connect-email" className="text-xs font-medium text-white mix-blend-difference tracking-widest pl-1 cursor-pointer select-none">
                    {connectData.form.field2.label}
                  </label>
                  <input 
                    id="connect-email"
                    type="email" 
                    placeholder={connectData.form.field2.placeholder}
                    className="w-full bg-white/[0.12] backdrop-blur-xl border border-white/[0.15] text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:border-white/40 focus:bg-white/[0.18] transition-all pointer-events-auto text-base relative z-10"
                  />
                </div>

                {/* Field 3 */}
                <div className="flex flex-col space-y-2 pointer-events-auto" data-fold-element>
                  <label htmlFor="connect-message" className="text-xs font-medium text-white mix-blend-difference tracking-widest pl-1 cursor-pointer select-none">
                    {connectData.form.field3.label}
                  </label>
                  <textarea 
                    id="connect-message"
                    rows={3}
                    placeholder={connectData.form.field3.placeholder}
                    className="w-full bg-white/[0.12] backdrop-blur-xl border border-white/[0.15] text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:border-white/40 focus:bg-white/[0.18] transition-all resize-none pointer-events-auto text-base relative z-10"
                  ></textarea>
                </div>

                {/* Field 4 */}
                <div className="flex flex-col space-y-3 pointer-events-auto" data-fold-element>
                  <label className="text-xs font-medium text-white mix-blend-difference tracking-widest pl-1 select-none">
                    {connectData.form.field4.label}
                  </label>
                  <div className="flex flex-wrap gap-2 pointer-events-auto">
                    {connectData.form.field4.options.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedOptions(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt])}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 border backdrop-blur-xl cursor-pointer relative z-10 select-none ${
                          selectedOptions.includes(opt) 
                          ? 'bg-white/90 text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                          : 'bg-white/10 text-white/70 border-white/[0.15] hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div data-fold-element className="pt-2 pointer-events-auto">
                  <button 
                    type="button"
                    className="w-full text-white font-light py-3.5 text-sm md:text-sm rounded-xl transition-all pointer-events-auto tracking-[0.1em] shadow-[0_0_20px_rgba(162,155,254,0.15)] hover:shadow-[0_0_30px_rgba(162,155,254,0.3)] hover:scale-[1.01] cursor-pointer relative z-10 select-none"
                    style={{
                      background: 'linear-gradient(90deg, #ff8a8a 0%, #a29bfe 33%, #82b1ff 66%, #ff8a8a 100%)',
                      backgroundSize: '300% 100%',
                      animation: 'rainbow-shine-x 4s linear infinite'
                    }}
                  >
                    {connectData.form.submit}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ConnectSection.displayName = "ConnectSection";

export default ConnectSection;
