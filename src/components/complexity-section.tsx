"use client";

import React, { useEffect, useRef, useState } from "react";
import FoldText from "./fold-text";

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

/*
 * HeroSection ScrollExpand has:
 *   scrollDistance = 2.0, holdDistance = 0.5 → track = stageH * 3.5
 *   The sentence fades at p ≈ 0.97 of the scrollDistance span (2.0 * stageH),
 *   i.e. at scroll offset ~1.94 * stageH from the top of the track.
 *   After that there's holdDistance (0.5 * stageH) of dead space.
 *   We overlap by ~156vh so this section pins exactly when the sentence vanishes.
 */
const OVERLAP_VH = 156;

export default function ComplexitySection() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [renderComplexity, setRenderComplexity] = useState(false);
  const [renderSlowsGrowth, setRenderSlowsGrowth] = useState(false);

  const showComplexityRef = useRef(false);
  const showSlowsGrowthRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    let raf = 0;
    let current = 0;
    let target = 0;
    let stageH = 0;

    // Timeline (50 scrolls × 120px = 6000px total track):
    //
    //   p 0.00–0.08   → COMPLEXITY holds at 1/4 from top       (~4 scrolls)
    //   p 0.08–0.64   → COMPLEXITY descends to center           (~28 scrolls)
    //   p 0.64–0.68   → "slow's growth" unfolds                 (~2 scrolls)
    //   p 0.68–0.94   → full sentence holds on screen           (~13 scrolls)
    //   p 0.94–0.99   → fade out
    //
    const TOTAL_SCROLLS = 50;
    const PX_PER_SCROLL = 120;

    const measure = () => {
      stageH = window.innerHeight;
      stage.style.height = `${stageH}px`;
      track.style.height = `${stageH + TOTAL_SCROLLS * PX_PER_SCROLL}px`;
    };

    const readProgress = () => {
      const span = TOTAL_SCROLLS * PX_PER_SCROLL;
      const top = track.getBoundingClientRect().top;
      const isPinned = top <= 0;
      const p = isPinned ? clamp(-top / span, 0, 1) : -1;
      return { p, isPinned };
    };

    const applyProgress = ({ p, isPinned }: { p: number; isPinned: boolean }) => {
      // 1. Mount states
      const activeComp = isPinned && p >= 0.00 && p < 0.97;
      if (activeComp !== showComplexityRef.current) {
        showComplexityRef.current = activeComp;
        setRenderComplexity(activeComp);
      }

      const activeSlow = isPinned && p >= 0.64 && p < 0.97;
      if (activeSlow !== showSlowsGrowthRef.current) {
        showSlowsGrowthRef.current = activeSlow;
        setRenderSlowsGrowth(activeSlow);
      }

      // 2. Animate Complexity positioning
      if (containerRef.current) {
        // Hold at 1/4 from top from p=0 to p=0.08, then descend to center from p=0.08 to p=0.64
        const startY = -stageH * 0.25;
        const progressY = smoothstep(0.08, 0.64, p);
        const translateY = startY * (1 - progressY);

        // Shift X left from p=0.64 to p=0.75 (simultaneous with slow's growth)
        const progressX = smoothstep(0.64, 0.75, p);
        const shiftXVW = progressX * -11.2;

        // Fade out from p=0.94 to p=0.99
        const outProgress = smoothstep(0.94, 0.99, p);
        const blockOpacity = 1 - outProgress;
        const blockScale = 1 + 0.12 * outProgress;

        containerRef.current.style.opacity = `${blockOpacity}`;
        containerRef.current.style.transform = `scale(${blockScale})`;

        // Apply both X (shifting left to center the full sentence) and Y (descending) movement
        const compEl = containerRef.current.querySelector(".complexity-wrap") as HTMLElement;
        if (compEl) {
          compEl.style.transform = `translate3d(${shiftXVW}vw, ${translateY}px, 0)`;
        }
      }
    };

    const tick = () => {
      current += (target - current) * 0.15;
      if (Math.abs(target - current) < 0.001) {
        current = target;
      }
      const { isPinned } = readProgress();
      applyProgress({ p: current, isPinned });
      if (current !== target) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const { p } = readProgress();
      target = p;
      kick();
    };

    const onResize = () => {
      measure();
      const res = readProgress();
      target = res.p;
      current = target;
      applyProgress(res);
    };

    measure();
    const initRes = readProgress();
    target = initRes.p;
    current = target;
    applyProgress(initRes);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative w-full" style={{ marginTop: `-${OVERLAP_VH}vh` }}>
      <div ref={trackRef} className="relative w-full">
        <div ref={stageRef} className="sticky top-0 w-full overflow-hidden bg-transparent pointer-events-none flex items-center justify-center">
          <div
            ref={containerRef}
            className="pointer-events-none select-none [will-change:transform,opacity]"
          >
            {/* Complexity wrap — contains both words inline, naturally centered by parent flex */}
            <div className="complexity-wrap [will-change:transform] inline-flex items-baseline whitespace-nowrap">
              {renderComplexity && (
                <FoldText
                  text="COMPLEXITY"
                  trigger="mount"
                  splitBy="word"
                  duration={0.3}
                  stagger={0.0}
                  fontSize="clamp(1.5rem, 3.2vw, 2.7rem)"
                  fontWeight={300}
                  color="#ffffff"
                  highlightWords={["COMPLEXITY"]}
                  className="select-none"
                />
              )}
              
              {/* slow's growth — absolute positioned to avoid flex layout snap, translates along with the wrapper */}
              <div className="absolute left-full pl-[0.6em] top-0 bottom-0 flex items-center justify-start whitespace-nowrap">
                {renderSlowsGrowth && (
                  <FoldText
                    text="slow's growth."
                    trigger="mount"
                    splitBy="char"
                    duration={2.0}
                    stagger={0.06}
                    fontSize="clamp(1.5rem, 3.2vw, 2.7rem)"
                    fontWeight={300}
                    color="#ffffff"
                    style={{ whiteSpace: "nowrap" }}
                    className="select-none font-montserrat font-light"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
