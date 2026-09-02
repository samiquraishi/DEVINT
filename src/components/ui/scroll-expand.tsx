"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import HeroSection from "@/app/pages/landing-page/sections/hero";
import TransitionSection from "@/app/pages/landing-page/sections/transition";
import ProblemSection, { ProblemSectionRef } from "@/app/pages/landing-page/sections/problem";
import type { GlowingOrbHandle } from "./glowing-orb";
import { clamp, smoothstep } from "@/lib/utils";

const applyCharAnimation = (container: HTMLElement, phaseT: number) => {
  const chars = container.querySelectorAll<HTMLElement>("[data-fold-char]");
  chars.forEach((span) => {
    const charNorm = parseFloat(span.getAttribute("data-char-norm") || "0");
    const staggerStart = charNorm * 0.52;
    const charDuration = 0.48;
    const raw = clamp((phaseT - staggerStart) / charDuration, 0, 1);
    const eased = raw * (2 - raw);
    span.style.transform = `rotateX(${(1 - eased) * -90}deg)`;
    span.style.opacity = `${eased}`;
  });
};

type ConfigKey =
  | "startWidth"
  | "startHeight"
  | "startRadius"
  | "endRadius"
  | "mediaZoom"
  | "scrollDistance"
  | "holdDistance"
  | "smoothing"
  | "overlayScrim"
  | "useWindowScroll"
  | "enabled";

export interface ScrollExpandProps {
  src?: string;
  mediaType?: "image" | "video" | "custom";
  customMedia?: ReactNode;
  poster?: string;
  alt?: string;
  title?: string;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  bgContent?: ReactNode;
  [key: string]: unknown;
}

const ScrollExpand: React.FC<ScrollExpandProps> = ({
  src = "",
  mediaType = "image",
  customMedia,
  poster = "",
  alt = "",
  title = "",
  scrollHint = "",
  startWidth = 15,
  startHeight = 50,
  startRadius = 0,
  endRadius = 0,
  mediaZoom = 2.0,
  scrollDistance = 1.5,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.85,
  useWindowScroll = true,
  enabled = true,
  children,
  className = "",
  style,
  bgContent,
  ...rest
}: ScrollExpandProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const text2Ref = useRef<HTMLDivElement | null>(null);
  const line1Ref = useRef<HTMLDivElement | null>(null);
  const line2Ref = useRef<HTMLDivElement | null>(null);

  const text3Ref = useRef<HTMLDivElement | null>(null);
  const line3Ref = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<GlowingOrbHandle | null>(null);
  const problemRef = useRef<ProblemSectionRef | null>(null);

  const showText2Ref = useRef(false);
  const showLine2Ref = useRef(false);
  const showText3Ref = useRef(false);
  const showProblemRef = useRef(false);

  const [renderText2, setRenderText2] = useState(false);
  const [renderLine2, setRenderLine2] = useState(false);
  const [renderText3, setRenderText3] = useState(false);
  const [problemActive, setProblemActive] = useState(false);

  const propsRef = useRef<Required<Pick<ScrollExpandProps, ConfigKey>>>(
    {} as Required<Pick<ScrollExpandProps, ConfigKey>>
  );
  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled,
  };

  const applyProgress = useCallback((progressY: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;
    const c = propsRef.current;

    const ratio = (c.scrollDistance + c.holdDistance) / c.scrollDistance;
    const p = clamp(progressY * ratio, 0, 1);
    const pTotal = progressY;

    const e = smoothstep(0, 0.4, p);

    const ix_start = (100 - c.startWidth) / 2;
    const iy_start = (100 - c.startHeight) / 2;

    const ix = Math.max(0, ix_start * Math.pow(1 - e, 1.4));
    const iy = Math.max(0, iy_start * (1 - e));

    if (backdropRef.current) {
      backdropRef.current.style.clipPath = `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
        ${ix}% ${iy}%,
        ${ix}% ${100 - iy}%,
        ${100 - ix}% ${100 - iy}%,
        ${100 - ix}% ${iy}%,
        ${ix}% ${iy}%
      )`;
    }

    if (scrimRef.current) scrimRef.current.style.opacity = `${c.overlayScrim * e}`;

    if (titleRef.current) {
      const out = smoothstep(0.0, 0.4, p);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `scale(${1 + 0.15 * out})`;
    }

    // Text 2: "The FUTURE doesn't wait. Neither should your BUSINESS."
    const active2 = pTotal >= 0.04 && pTotal < 0.16;
    if (active2 !== showText2Ref.current) {
      showText2Ref.current = active2;
      setRenderText2(active2);
    }

    const activeLine2 = pTotal >= 0.06 && pTotal < 0.16;
    if (activeLine2 !== showLine2Ref.current) {
      showLine2Ref.current = activeLine2;
      setRenderLine2(activeLine2);
    }

    if (text2Ref.current) {
      if (active2) {
        text2Ref.current.style.display = "flex";
        
        const out2 = smoothstep(0.12, 0.16, pTotal);
        text2Ref.current.style.opacity = `${1 - out2}`;
        text2Ref.current.style.transform = `scale(${1 + 0.15 * out2})`;

        // Line 1: 0.04 -> 0.08
        const phase1T = (pTotal - 0.04) / 0.04;
        // Line 2 (subtext): slightly delayed, 0.075 -> 0.115
        const phase2T = (pTotal - 0.075) / 0.04;

        const textWrapper = text2Ref.current.children[0];
        if (textWrapper && textWrapper.children.length >= 2) {
          applyCharAnimation(textWrapper.children[0] as HTMLElement, phase1T);
          applyCharAnimation(textWrapper.children[1] as HTMLElement, phase2T);
        }
      } else {
        text2Ref.current.style.opacity = "0";
        text2Ref.current.style.display = "none";
      }
    }

    // Text 3: "Welcome to the world of DEVINT." — appears while the orb is growing
    const active3 = pTotal >= 0.16 && pTotal < 0.30;
    if (active3 !== showText3Ref.current) {
      showText3Ref.current = active3;
      setRenderText3(active3);
    }

    // Drive both text3 layers (Layer A: mix-blend-difference, Layer B: DEVINT overlay)
    const text3Overlay = stageRef.current?.querySelector<HTMLElement>("[data-text3-overlay]");
    const text3Layers = [text3Ref.current, text3Overlay].filter(Boolean) as HTMLElement[];

    for (const el of text3Layers) {
      if (active3) {
        el.style.display = "flex";

        // Fade out before orb engulfs everything
        const fadeOut3 = smoothstep(0.26, 0.30, pTotal);
        el.style.opacity = `${1 - fadeOut3}`;
        el.style.transform = `scale(${1 + 0.15 * fadeOut3})`;

        const phase3T = (pTotal - 0.16) / 0.04;
        applyCharAnimation(el, phase3T);
      } else {
        el.style.opacity = "0";
        el.style.display = "none";
      }
    }

    if (orbRef.current) {
      orbRef.current.updateProgress(pTotal);
    }

    // Problem Section: SphereGrid appears as Text 3 finishes fading
    const activeProblem = pTotal >= 0.28;
    if (activeProblem !== showProblemRef.current) {
      showProblemRef.current = activeProblem;
      setProblemActive(activeProblem);
    }

    if (problemRef.current) {
      const container = problemRef.current.container;
      if (container) {
        if (pTotal >= 0.28) {
          const problemFadeIn = smoothstep(0.28, 0.32, pTotal);
          container.style.opacity = `${problemFadeIn}`;
          if (pTotal >= 0.32) {
            container.style.pointerEvents = "auto";
          } else {
            container.style.pointerEvents = "none";
          }
        } else {
          container.style.opacity = "0";
          container.style.pointerEvents = "none";
        }
      }
      if (pTotal >= 0.28) {
        problemRef.current.updateProgress(pTotal);
      }
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, p);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (overlayRef.current) {
      const inn = smoothstep(0.96, 1.0, pTotal);
      overlayRef.current.style.opacity = `${inn}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - inn)}px, 0)`;
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let current = 0;
    let target = 0;
    let stageH = 0;
    let running = false;

    const measure = () => {
      const c = propsRef.current;
      stageH = c.useWindowScroll ? window.innerHeight : root.clientHeight;
      if (stageH <= 0) return;
      stage.style.height = `${stageH}px`;
      track.style.height = `${stageH * (1 + Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance))}px`;

      const w = root.clientWidth || stageH;
      stage.style.setProperty("--se-title-size", `${clamp(w * 0.19, 52, 235)}px`);
    };

    const readProgress = () => {
      const c = propsRef.current;
      if (!c.enabled) return 1;
      const totalSpan = stageH * (Math.max(0.01, c.scrollDistance) + Math.max(0, c.holdDistance));
      if (c.useWindowScroll) {
        const top = track.getBoundingClientRect().top;
        return clamp(-top / totalSpan, 0, 1);
      }
      return clamp(root.scrollTop / totalSpan, 0, 1);
    };

    const tick = () => {
      const c = propsRef.current;
      const k = c.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * c.smoothing));
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      applyProgress(current);
      raf = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();
    target = readProgress();
    current = target;
    applyProgress(current);

    const scroller = useWindowScroll ? window : root;
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(root);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

  const renderMediaContent = () => {
    if (customMedia || mediaType === "custom") {
      return customMedia;
    }
    if (mediaType === "video") {
      return (
        <video
          className="absolute inset-0 w-full h-full object-cover origin-center select-none"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
        />
      );
    }
    return (
      <img
        className="absolute inset-0 w-full h-full object-cover origin-center select-none"
        src={src}
        alt={alt}
        draggable={false}
      />
    );
  };

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-full ${
        useWindowScroll
          ? ""
          : "overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      } ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className="relative w-full">
        <div ref={stageRef} className="sticky top-0 w-full overflow-hidden bg-transparent [--se-title-size:4rem]">
          <div
            ref={backdropRef}
            className="absolute inset-0 bg-white z-0 pointer-events-none [will-change:clip-path]"
          >
            {bgContent}
          </div>
          <div
            ref={frameRef}
            className="absolute inset-0 bg-transparent overflow-hidden z-10"
          >
            <div
              ref={mediaRef}
              className="absolute inset-0 w-full h-full pointer-events-none opacity-0"
            />
            <div
              ref={scrimRef}
              className="absolute inset-0 opacity-0 pointer-events-none bg-[linear-gradient(to_top,rgba(0,0,0,0.8),rgba(0,0,0,0.1)_45%,rgba(0,0,0,0.4))]"
            />
            {children ? (
              <div
                ref={overlayRef}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-[6%] opacity-0 [will-change:opacity,transform] z-20 pointer-events-none"
              >
                {children}
              </div>
            ) : null}
          </div>
          <HeroSection ref={titleRef} />
          <TransitionSection
            text2Ref={text2Ref}
            text3Ref={text3Ref}
            orbRef={orbRef}
          />
          <ProblemSection
            ref={problemRef}
            isActive={problemActive}
          />
          {scrollHint ? (
            <div
              ref={hintRef}
              className="absolute inset-x-0 bottom-5 text-center text-[0.8125rem] tracking-[0.02em] text-white/55 pointer-events-none [will-change:opacity,transform]"
            >
              {scrollHint}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;
