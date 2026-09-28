"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import footerData from "../../../../../public/content/footer.json";
import { clamp, smoothstep } from "@/lib/utils";

export interface FooterSectionRef {
  updateProgress: (pTotal: number) => void;
  container: HTMLDivElement | null;
}

export interface FooterSectionProps {
  isActive?: boolean;
  className?: string;
}

// ── Scroll Ranges ──────────────────────────────────────
const SECTION_START = 3.05;

// Rectangle: rises from bottom to full coverage in ~2-3 scrolls
const RECT_START = 3.05;
const RECT_END = 3.15;

// Content unfold phases
const UNFOLD_BRAND_START = 3.15;
const UNFOLD_BRAND_END = 3.22;

const UNFOLD_SIMUL_START = 3.20;
const UNFOLD_SIMUL_END = 3.28;

const UNFOLD_REST_START = 3.26;
const UNFOLD_REST_END = 3.35;

const HOLD_START = 3.35;

// ── Char-level fold animation ─────────
const animateFoldChars = (
  container: HTMLElement,
  phase: "in" | "hold" | "out",
  phaseT: number
) => {
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

// ── Element-level fold animation ────────────────────────
const animateFoldElements = (
  container: HTMLElement,
  phase: "in" | "hold" | "out",
  phaseT: number
) => {
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
      const eased = raw * (2 - raw);
      rotateX = (1 - eased) * -90;
      opacity = eased;
    } else if (phase === "out") {
      const raw = clamp((phaseT - staggerStart) / charDuration, 0, 1);
      const eased = raw * raw;
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

// ── Render fold text (character-level folding) ──────────
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
  isItalic: boolean = false,
  charHoverGradient: boolean = false
) => {
  const parts = text.split(/(\s+)/);
  const totalChars = text.replace(/\s+/g, "").length || 1;
  let charCounter = 0;

  return (
    <div
      className={`flex flex-wrap items-baseline ${fontFamilyClass} ${trackingClass} ${
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

        return (
          <span
            key={`word-${wordIndex}`}
            className="inline-flex items-baseline"
            style={{ perspective: "800px", transformStyle: "preserve-3d" }}
          >
            {charArray.map((char, charIndex) => {
              const globalIdx = charCounter++;
              const charNorm = globalIdx / totalChars;
              return (
                <span
                  key={`c-${globalIdx}`}
                  className="inline-block"
                  style={{ perspective: "800px", transformStyle: "preserve-3d" }}
                >
                  <span
                    data-fold-char
                    data-char-norm={charNorm}
                    data-char={char}
                    className={`fold-text-piece inline-block [backface-visibility:hidden] [will-change:transform,opacity] ${isHighlighted ? "closing-line-gradient" : ""} ${charHoverGradient && !isHighlighted ? "hover-gradient-char cursor-default" : ""}`.trim()}
                    style={{
                      transformOrigin: "50% 0%",
                      transform: "rotateX(-90deg)",
                      opacity: 0,
                    }}
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

export const FooterSection = forwardRef<FooterSectionRef, FooterSectionProps>(
  ({ className = "" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rectRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Content row refs
    const brandRef = useRef<HTMLDivElement>(null);
    const taglineRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const columnsRef = useRef<HTMLDivElement>(null);
    const dividerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        const container = containerRef.current;
        const rect = rectRef.current;
        if (!container) return;

        if (pTotal < SECTION_START) {
          container.style.display = "none";
          container.style.visibility = "hidden";
          container.style.opacity = "0";
          container.style.pointerEvents = "none";
          return;
        }

        container.style.display = "flex";
        container.style.visibility = "visible";
        container.style.opacity = "1";
        container.style.pointerEvents = pTotal >= HOLD_START ? "auto" : "none";

        // ── Rectangle animation ──────────────────────────────
        if (rect) {
          const t = Math.min(smoothstep(RECT_START, RECT_END, pTotal), 1);
          const topInset = 100 * (1 - t);
          const sideInset = 5 * (1 - t);
          rect.style.clipPath = `inset(${topInset}% ${sideInset}% 0% ${sideInset}%)`;
        }

        // ── Content unfold ───────────────────────────────────
        if (contentRef.current) {
          contentRef.current.style.visibility = pTotal >= UNFOLD_BRAND_START ? "visible" : "hidden";
        }

        // Step 1: Giant "DEVINT"
        if (brandRef.current) {
          if (pTotal >= UNFOLD_BRAND_START) {
            const t = clamp(
              (pTotal - UNFOLD_BRAND_START) / (UNFOLD_BRAND_END - UNFOLD_BRAND_START),
              0, 1
            );
            animateFoldChars(brandRef.current, pTotal >= HOLD_START ? "hold" : "in", t);
          } else {
            animateFoldChars(brandRef.current, "in", 0);
          }
        }

        // Step 2: Tagline (top) + Bottom row
        if (taglineRef.current) {
          if (pTotal >= UNFOLD_SIMUL_START) {
            const t = clamp(
              (pTotal - UNFOLD_SIMUL_START) / (UNFOLD_SIMUL_END - UNFOLD_SIMUL_START),
              0, 1
            );
            animateFoldChars(taglineRef.current, pTotal >= HOLD_START ? "hold" : "in", t);
          } else {
            animateFoldChars(taglineRef.current, "in", 0);
          }
        }

        if (bottomRef.current) {
          if (pTotal >= UNFOLD_SIMUL_START) {
            const t = clamp(
              (pTotal - UNFOLD_SIMUL_START) / (UNFOLD_SIMUL_END - UNFOLD_SIMUL_START),
              0, 1
            );
            animateFoldElements(bottomRef.current, pTotal >= HOLD_START ? "hold" : "in", t);
          } else {
            animateFoldElements(bottomRef.current, "in", 0);
          }
        }

        // Step 3: Columns + CTA + divider line
        if (columnsRef.current) {
          if (pTotal >= UNFOLD_REST_START) {
            const t = clamp(
              (pTotal - UNFOLD_REST_START) / (UNFOLD_REST_END - UNFOLD_REST_START),
              0, 1
            );
            animateFoldElements(columnsRef.current, pTotal >= HOLD_START ? "hold" : "in", t);
          } else {
            animateFoldElements(columnsRef.current, "in", 0);
          }
        }

        if (dividerRef.current) {
          if (pTotal >= UNFOLD_REST_START) {
            const t = clamp(
              (pTotal - UNFOLD_REST_START) / (UNFOLD_REST_END - UNFOLD_REST_START),
              0, 1
            );
            const eased = t * (2 - t);
            dividerRef.current.style.transform = `scaleX(${eased})`;
            dividerRef.current.style.opacity = `${eased}`;
          } else {
            dividerRef.current.style.transform = "scaleX(0)";
            dividerRef.current.style.opacity = "0";
          }
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 z-[55] flex items-center justify-center w-full h-full overflow-hidden pointer-events-none [will-change:opacity] ${className}`}
        style={{
          display: "none",
          visibility: "hidden",
          opacity: 0,
        }}
      >
        <div
          ref={rectRef}
          className="absolute inset-0 w-full h-full bg-white z-0"
          style={{ clipPath: "inset(100% 5% 0% 5%)" }}
        />

        <div
          ref={contentRef}
          // Adjusted padding to distribute the available space beautifully since the top text is now 1 line
          className="absolute inset-0 z-10 flex flex-col justify-between w-full h-full px-[6%] lg:px-[8%] pt-[3%] lg:pt-[4%] pb-[2%] lg:pb-[2.5%]"
          style={{ visibility: "hidden" }}
        >
          {/* Tagline */}
          <div ref={taglineRef} className="flex flex-col items-center text-center shrink-0">
            <div className="flex flex-row flex-wrap items-baseline justify-center gap-x-2 lg:gap-x-3">
              {renderFoldText(
                footerData.tagline.line1,
                "clamp(1.5rem, 3vw, 2.8rem)",
                300,
                "#1a1a1a",
                [],
                "center",
                "font-montserrat",
                "tracking-[0.15em]",
                "",
                true
              )}
              {renderFoldText(
                footerData.tagline.line2,
                "clamp(1.5rem, 3vw, 2.8rem)",
                600, // Slightly less than bold (600 = semi-bold)
                "#1a1a1a",
                [], // No highlights
                "center",
                "font-montserrat",
                "tracking-[0.1em]"
              )}
            </div>
            <div className="mt-4 lg:mt-5">
              {renderFoldText(
                footerData.tagline.subtitle,
                "clamp(0.6rem, 0.9vw, 0.9rem)",
                400,
                "#666666",
                [],
                "center",
                "font-montserrat",
                "tracking-[0.25em]"
              )}
            </div>
          </div>

          {/* Columns + CTA */}
          <div ref={columnsRef} className="flex flex-col lg:flex-row justify-between items-start w-full mt-auto mb-auto pt-4 lg:pt-0">
            <div className="flex flex-wrap gap-x-16 gap-y-6 lg:gap-x-24" data-fold-element>
              {/* Explore */}
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-semibold tracking-[0.15em] closing-line-gradient">
                  {footerData.columns.explore.title}
                </span>
                {footerData.columns.explore.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    className="text-sm text-[#444] hover:text-[#1a1a1a] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Connect */}
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-semibold tracking-[0.15em] closing-line-gradient">
                  {footerData.columns.connect.title}
                </span>
                {footerData.columns.connect.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    target={"external" in link && link.external ? "_blank" : undefined}
                    rel={"external" in link && link.external ? "noopener noreferrer" : undefined}
                    className="text-sm text-[#444] hover:text-[#1a1a1a] transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    {"external" in link && link.external && (
                      <span className="text-[0.7em]">↗</span>
                    )}
                  </a>
                ))}
              </div>
            </div>

            {/* CTA */}
            <a
              href={footerData.cta.href}
              className="flex items-center gap-4 mt-6 lg:mt-0 shrink-0 group cursor-pointer pointer-events-auto"
              data-fold-element
            >
              <span className="w-8 h-px bg-[#1a1a1a] group-hover:bg-[#a29bfe] transition-colors" />
              <span className="text-xs font-medium tracking-[0.12em] closing-line-gradient whitespace-nowrap">
                {footerData.cta.text}
              </span>
              <div className="w-10 h-10 rounded-full border border-[#1a1a1a] flex items-center justify-center group-hover:bg-[#1a1a1a] group-hover:text-white transition-colors">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="text-[#1a1a1a] group-hover:text-white transition-colors"
                >
                  <path
                    d="M1 7h12M8 2l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </a>
          </div>

          {/* Giant DEVINT */}
          <div ref={brandRef} className="w-full flex items-center justify-center shrink-0">
            {renderFoldText(
              footerData.brand,
              "clamp(5rem, 21vw, 19rem)", // slightly increased size to use up extra space
              300,
              "#1a1a1a",
              [],
              "center",
              "font-lemon",
              "tracking-[0.15em] sm:tracking-[0.25em] leading-[0.85] uppercase",
              "",
              false,
              true // Enable charHoverGradient
            )}
          </div>

          {/* Divider */}
          <div
            ref={dividerRef}
            className="w-full h-px bg-[#d4d4d4] origin-left shrink-0 mt-2 mb-2 lg:mt-4 lg:mb-4"
            style={{ transform: "scaleX(0)", opacity: 0 }}
          />

          {/* Copyright */}
          <div
            ref={bottomRef}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full pt-0 pb-0 gap-2 shrink-0"
          >
            <span
              className="text-xs text-[#888] tracking-[0.02em]"
              data-fold-element
            >
              {footerData.bottom.copyright}
            </span>
            <div className="flex items-center gap-3" data-fold-element>
              {footerData.bottom.links.map((link, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span className="w-px h-3 bg-[#ccc]" />
                  )}
                  <a
                    href={link.href}
                    className="text-xs text-[#888] hover:text-[#1a1a1a] transition-colors tracking-[0.02em]"
                  >
                    {link.label}
                  </a>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

FooterSection.displayName = "FooterSection";

export default FooterSection;
