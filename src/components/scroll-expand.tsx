"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import FoldText from "./fold-text";

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
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

  const showText2Ref = useRef(false);
  const showLine2Ref = useRef(false);

  const [renderText2, setRenderText2] = useState(false);
  const [renderLine2, setRenderLine2] = useState(false);

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

  const applyProgress = useCallback((p: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;
    const c = propsRef.current;

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

    const active2 = p >= 0.45 && p < 0.97;
    if (active2 !== showText2Ref.current) {
      showText2Ref.current = active2;
      setRenderText2(active2);
    }

    const activeLine2 = p >= 0.70 && p < 0.97;
    if (activeLine2 !== showLine2Ref.current) {
      showLine2Ref.current = activeLine2;
      setRenderLine2(activeLine2);
    }

    if (text2Ref.current) {
      if (active2) {
        text2Ref.current.style.display = "flex";
        
        const out2 = smoothstep(0.91, 0.97, p);
        text2Ref.current.style.opacity = `${1 - out2}`;
        text2Ref.current.style.transform = `scale(${1 + 0.15 * out2})`;
      } else {
        text2Ref.current.style.opacity = "0";
        text2Ref.current.style.display = "none";
      }
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, p);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (overlayRef.current) {
      const inn = smoothstep(0.97, 1.0, p);
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
      stage.style.setProperty("--se-title-size", `${clamp(w * 0.18, 48, 220)}px`);
    };

    const readProgress = () => {
      const c = propsRef.current;
      if (!c.enabled) return 1;
      const span = stageH * Math.max(0.01, c.scrollDistance);
      if (c.useWindowScroll) {
        const top = track.getBoundingClientRect().top;
        return clamp(-top / span, 0, 1);
      }
      return clamp(root.scrollTop / span, 0, 1);
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
          {title ? (
            <div
              ref={titleRef}
              className="absolute inset-0 z-20 flex items-center justify-center m-0 px-[2%] text-center font-lemon font-light uppercase leading-none text-white mix-blend-difference [font-size:var(--se-title-size)] pointer-events-none select-none [will-change:opacity,transform]"
            >
              {title}
            </div>
          ) : null}

          {/* Text 2: Scroll-revealed sentences */}
          <div
            ref={text2Ref}
            className="absolute inset-0 z-20 flex items-center justify-center m-0 px-[6%] text-center mix-blend-difference pointer-events-none select-none [will-change:opacity,transform] opacity-0"
            style={{ display: "none" }}
          >
            <div className="flex flex-col items-start justify-center max-w-4xl w-full gap-y-8">
              <div ref={line1Ref} className="min-h-[1.2em] [will-change:opacity]">
                {renderText2 && (
                  <FoldText
                    text="The FUTURE doesn't wait."
                    trigger="mount"
                    splitBy="word"
                    duration={1.5}
                    stagger={0.1}
                    fontSize="clamp(1.5rem, 3.2vw, 2.7rem)"
                    fontWeight={300}
                    color="#ffffff"
                    highlightWords={["FUTURE"]}
                    className="select-none font-montserrat font-light"
                  />
                )}
              </div>
              <div ref={line2Ref} className="min-h-[1.2em] [will-change:opacity]">
                {renderLine2 && (
                  <FoldText
                    text="Neither should your BUSINESS."
                    trigger="mount"
                    splitBy="word"
                    duration={1.5}
                    stagger={0.1}
                    fontSize="clamp(0.8rem, 1.3vw, 1.1rem)"
                    fontWeight={300}
                    color="#ffffff"
                    highlightWords={["BUSINESS"]}
                    className="select-none font-montserrat font-light"
                  />
                )}
              </div>
            </div>
          </div>
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
