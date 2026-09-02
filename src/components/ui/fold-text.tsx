"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode, useState } from "react";
import { gsap } from "gsap";
import { clamp } from "@/lib/utils";

type SplitBy = "char" | "word" | "line";
type Hinge = "top" | "bottom" | "left" | "right";
type Trigger = "mount" | "hover" | "scroll" | "loop";

export interface FoldTextProps {
  key?: string | number;
  text?: string;
  splitBy?: SplitBy;
  hinge?: Hinge;
  duration?: number;
  stagger?: number;
  ease?: string;
  perspective?: number;
  creaseShading?: number;
  trigger?: Trigger;
  fontSize?: string | number;
  fontWeight?: string | number;
  color?: string;
  className?: string;
  style?: CSSProperties;
  highlightWords?: string[];
  highlightAll?: boolean;
  mode?: "in" | "out";
  onComplete?: () => void;
}

type HingeConfig = {
  origin: string;
  rotateX: number;
  rotateY: number;
};

const HINGE_CONFIG: Record<Hinge, HingeConfig> = {
  top: { origin: "50% 0%", rotateX: -92, rotateY: 0 },
  bottom: { origin: "50% 100%", rotateX: 92, rotateY: 0 },
  left: { origin: "0% 50%", rotateX: 0, rotateY: 92 },
  right: { origin: "100% 50%", rotateX: 0, rotateY: -92 },
};

const renderWhitespace = (value: string, key: string): ReactNode[] =>
  value.split(/(\n)/).map((part, index) => {
    if (part === "\n") return <br key={`${key}-br-${index}`} />;
    if (!part) return null;

    return (
      <span className="fold-text-whitespace" key={`${key}-space-${index}`}>
        {part.replace(/ /g, "\u00A0")}
      </span>
    );
  });

export default function FoldText({
  text = "Design unfolds",
  splitBy = "char",
  hinge = "top",
  duration = 0.65,
  stagger = 0.045,
  ease = "power3.out",
  perspective = 700,
  creaseShading = 0.55,
  trigger = "mount",
  fontSize = 80,
  fontWeight = 800,
  color = "#f7f2e8",
  className = "",
  style = {},
  highlightWords = [],
  highlightAll = false,
  mode = "in",
  onComplete,
}: FoldTextProps) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const hingeConfig = HINGE_CONFIG[hinge] || HINGE_CONFIG.top;
  const safeCrease = clamp(creaseShading, 0, 1);
  const safePerspective = Math.max(120, perspective);

  useEffect(() => {
    setMounted(true);
  }, []);

  const segments = useMemo(() => {
    let segmentIndex = 0;

    const renderSegment = (content: string, key: string, split: SplitBy = splitBy): ReactNode => {
      segmentIndex += 1;
      const cleanWord = content.toLowerCase().replace(/[.,'":;!?()]/g, "");
      const isHighlighted = highlightAll || highlightWords.some(w => w.toLowerCase() === cleanWord);
      return (
        <span
          className="fold-text-segment"
          data-fold-split={split}
          key={key}
          style={{ "--fold-perspective": `${safePerspective}px` } as CSSProperties}
        >
          <span
            className={`fold-text-piece ${isHighlighted ? "fold-text-highlight" : ""}`.trim()}
            data-fold-hinge={hinge}
            style={{ transformOrigin: hingeConfig.origin, "--fold-crease": 0 } as CSSProperties}
          >
            {content || "\u00A0"}
          </span>
        </span>
      );
    };

    if (splitBy === "line") {
      return text.split("\n").map((line, index) => (
        <span className="fold-text-line" key={`line-${index}`}>
          {renderSegment(line || "\u00A0", `segment-line-${index}`, "line")}
        </span>
      ));
    }

    if (splitBy === "word") {
      return text.split(/(\s+)/).flatMap((part, index) => {
        if (!part) return [];
        if (/^\s+$/.test(part)) return renderWhitespace(part, `ws-${index}`);
        return renderSegment(part, `segment-word-${segmentIndex}`);
      });
    }

    if (splitBy === "char") {
      const result = text.split(/(\s+)/).flatMap((part, wordIndex): any => {
        if (!part) return [];
        if (/^\s+$/.test(part)) return renderWhitespace(part, `ws-${wordIndex}`);

        const cleanWord = part.toLowerCase().replace(/[.,'":;!?()]/g, "");
        const isHighlighted = highlightAll || highlightWords.some(w => w.toLowerCase() === cleanWord);

        const charArray = Array.from(part);
        const wordLength = charArray.length;

        const charElements = charArray.map((char, charIndex) => {
          segmentIndex += 1;
          const bgX = wordLength > 1 ? (charIndex / (wordLength - 1)) * 100 : 0;
          
          return (
            <span
              className="fold-text-segment"
              data-fold-split="char"
              key={`segment-char-${segmentIndex}`}
              style={{ "--fold-perspective": `${safePerspective}px` } as CSSProperties}
            >
              <span
                className={`fold-text-piece ${isHighlighted ? "fold-text-highlight" : ""}`.trim()}
                data-fold-hinge={hinge}
                style={{ 
                  transformOrigin: hingeConfig.origin, 
                  "--bg-size": `${wordLength * 100}%`,
                  "--bg-x": `${bgX}%`
                } as CSSProperties}
              >
                {char || "\u00A0"}
              </span>
            </span>
          );
        });

        return charElements;
      });
      return result as ReactNode[];
    }

    return null as ReactNode;
  }, [text, splitBy, hinge, hingeConfig.origin, safePerspective, highlightWords]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return undefined;

    const root = rootRef.current;
    if (!root) return undefined;

    const pieces = Array.from(root.querySelectorAll<HTMLElement>(".fold-text-piece"));
    if (!pieces.length) return undefined;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const activeDuration = reduceMotion ? Math.min(duration, 0.22) : duration;
    const activeStagger = reduceMotion ? Math.min(stagger, 0.02) : stagger;

    const killTimeline = () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      gsap.killTweensOf(pieces);
    };

    if (mode === "out") {
      killTimeline();
      gsap.set(pieces, { opacity: 1, rotateX: 0, rotateY: 0 });
      const outTl = gsap.timeline({
        onComplete: () => {
          if (onComplete) onComplete();
        },
      });
      outTl.to(pieces, {
        opacity: 0,
        rotateX: reduceMotion ? 0 : hingeConfig.rotateX,
        rotateY: reduceMotion ? 0 : hingeConfig.rotateY,
        duration: activeDuration,
        ease: reduceMotion ? "power1.in" : "power2.inOut",
        stagger: activeStagger,
      });
      timelineRef.current = outTl;
      return () => {
        killTimeline();
      };
    }

    const fromVars = {
      opacity: 0,
      rotateX: reduceMotion ? 0 : hingeConfig.rotateX,
      rotateY: reduceMotion ? 0 : hingeConfig.rotateY,
      "--fold-crease": reduceMotion ? 0 : safeCrease,
      transformOrigin: hingeConfig.origin,
      force3D: true,
    };
    const toVars = {
      opacity: 1,
      rotateX: 0,
      rotateY: 0,
      "--fold-crease": 0,
      duration: activeDuration,
      ease: reduceMotion ? "power1.out" : ease,
      stagger: activeStagger,
      clearProps: "willChange",
      onComplete: () => {
        if (onComplete) onComplete();
      },
    };

    const play = (repeat: boolean): gsap.core.Timeline => {
      killTimeline();
      timelineRef.current = gsap.timeline({ repeat: repeat ? -1 : 0, repeatDelay: repeat ? 0.75 : 0 });
      timelineRef.current.fromTo(pieces, fromVars, toVars);
      return timelineRef.current;
    };

    let hoverHandler: (() => void) | undefined;

    if (trigger === "hover") {
      gsap.set(pieces, { opacity: 1, rotateX: 0, rotateY: 0, "--fold-crease": 0, transformOrigin: hingeConfig.origin });
      hoverHandler = () => play(false);
      root.addEventListener("mouseenter", hoverHandler);
    } else if (trigger === "scroll") {
      gsap.set(pieces, fromVars);
      killTimeline();
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 88%",
          end: "top 38%",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      tl.fromTo(pieces, fromVars, toVars);
      timelineRef.current = tl;
    } else if (trigger === "loop") {
      play(true);
    } else {
      play(false);
    }

    return () => {
      if (hoverHandler) root.removeEventListener("mouseenter", hoverHandler);
      killTimeline();
    };
  }, [
    mounted,
    text,
    splitBy,
    hinge,
    duration,
    stagger,
    ease,
    perspective,
    safeCrease,
    trigger,
    mode,
    hingeConfig.origin,
    hingeConfig.rotateX,
    hingeConfig.rotateY,
  ]);

  const rootStyle: CSSProperties = {
    "--fold-text-font-size": typeof fontSize === "number" ? `${fontSize}px` : fontSize,
    "--fold-text-font-weight": fontWeight,
    "--fold-text-color": color,
    ...style,
  } as CSSProperties;

  if (!mounted) return null;

  return (
    <>
      <span ref={rootRef} className={`fold-text ${className}`.trim()} style={rootStyle}>
        <span className="fold-text-sr-only">{text}</span>
        <span className="fold-text-visual" aria-hidden="true">
          {segments}
        </span>
      </span>
    </>
  );
}
