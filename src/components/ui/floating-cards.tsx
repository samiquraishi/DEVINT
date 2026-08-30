"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
  FC,
} from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  MotionValue,
  AnimatePresence,
  useMotionTemplate,
} from "framer-motion";
import Floating, { FloatingElement } from "@/components/ui/parallax-floating";
import { BorderGlow } from "@/components/ui/border-glow";
import problemData from "../../../public/content/problem.json";

export interface CardItem {
  id: string;
  url: string;
  author: string;
  title: string;
  aspectRatio: string;
  widthClass: string;
  positionClass: string;
  depth: number;
  zIndexClass: string;
  appearOrder: number;
  exitOrder: number;
  challengeTitle?: string;
  challengeBullets?: string[];
  closingLine?: string;
}

export interface FloatingCardsRef {
  updateProgress: (pTotal: number) => void;
}

export interface FloatingCardsProps {
  cards?: CardItem[];
  className?: string;
  sensitivity?: number;
}

/* ── Inject keyframes for the Devint gradient animation ── */
const CARD_STYLES = `
@keyframes rainbow-shine-x {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;

/* ── Devint gradient style for closing lines ── */
const CLOSING_LINE_GRADIENT: React.CSSProperties = {
  background:
    "linear-gradient(90deg, #ff8a8a 0%, #a29bfe 33%, #82b1ff 66%, #ff8a8a 100%)",
  backgroundSize: "300% 100%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  color: "transparent",
  animation: "rainbow-shine-x 4s linear infinite",
};

const CardFront = ({ card }: { card: CardItem }) => {
  return (
    <div className="absolute inset-0 w-full h-full rounded-none overflow-hidden shadow-xl bg-neutral-100 [backface-visibility:hidden]">
      <img
        src={card.url}
        alt={card.title}
        className="w-full h-full object-cover rounded-none block pointer-events-none"
        loading="lazy"
      />
    </div>
  );
};

const CardBack = ({ card, isExpanded = false }: { card: CardItem; isExpanded?: boolean }) => {
  let titleScale = "text-[5cqmin]";
  let bulletScale = "text-[5cqmin]";

  if (!isExpanded) {
    if (card.aspectRatio === "aspect-[9/16]") {
      titleScale = "text-[6.5cqmin]";
      bulletScale = "text-[6.5cqmin]";
    } else if (card.aspectRatio === "aspect-[3/4]") {
      titleScale = "text-[6cqmin]";
      bulletScale = "text-[6cqmin]";
    }
  } else {
    // When expanded, use a consistent responsive size for ALL cards
    titleScale = "text-sm sm:text-base md:text-lg lg:text-xl";
    bulletScale = "text-xs sm:text-sm md:text-base lg:text-lg"; // slightly smaller
  }

  // Identical text style to the sentences
  const baseTextClass = "font-sans font-light tracking-wide text-neutral-300";

  const Content = (
    <div className={`flex-1 flex flex-col justify-center overflow-hidden relative z-10 ${isExpanded ? "p-8 md:p-12 gap-6" : "p-[6cqmin] py-[2cqmin] gap-[2cqmin]"}`}>
      {card.challengeTitle && (
        <p className={`${baseTextClass} ${titleScale} leading-tight ${isExpanded ? "mb-4 md:mb-6" : ""}`}>
          {card.challengeTitle}
        </p>
      )}
      {card.challengeBullets && card.challengeBullets.length > 0 && (
        <ul className={`list-disc list-outside ml-[1.5em] flex flex-col ${baseTextClass} ${bulletScale} ${isExpanded ? "gap-3" : "gap-[2cqmin]"}`}>
          {card.challengeBullets.map((bullet, i) => (
            <li key={i} className="pl-[0.5em] leading-snug">
              {bullet}
            </li>
          ))}
        </ul>
      )}
      {card.closingLine && (
        <p
          className={`${baseTextClass} ${titleScale} text-center leading-relaxed mt-auto`}
          style={CLOSING_LINE_GRADIENT}
        >
          {card.closingLine}
        </p>
      )}
    </div>
  );

    if (isExpanded) {
      return (
        <BorderGlow
          className="absolute inset-0 w-full h-full rounded-none shadow-xl [transform:rotateY(180deg)] [backface-visibility:hidden] [container-type:size] backdrop-blur-md"
          backgroundColor="rgba(10, 10, 15, 0.40)"
        >
          {Content}
        </BorderGlow>
      );
    }

  return (
    <div className="absolute inset-0 w-full h-full rounded-none overflow-hidden shadow-xl bg-neutral-950 border border-neutral-800 [transform:rotateY(180deg)] [backface-visibility:hidden] [container-type:size]">
      {Content}
    </div>
  );
};

/* ── Smooth eased interpolation helper ── */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface FlippableCardProps {
  card: CardItem;
  scrollProgress: MotionValue<number>;
  activeOverlay: { card: CardItem; rect: DOMRect } | null;
  setActiveOverlay: (data: { card: CardItem; rect: DOMRect } | null) => void;
  animatingCardId: string | null;
  setAnimatingCardId: (id: string | null) => void;
  isReturning: boolean;
}

const FlippableCard: FC<FlippableCardProps> = ({
  card,
  scrollProgress,
  activeOverlay,
  setActiveOverlay,
  animatingCardId,
  setAnimatingCardId,
  isReturning,
}) => {
  // Timeline:
  // Statement 1: 0.32 -> 0.44 (Cards appear staggered)
  // Statement 2: 0.47 -> 0.59 (All cards floating)
  // Statement 3: 0.62 -> 0.74 (Cards exit staggered)
  const appearStart = 0.32 + card.appearOrder * 0.016;
  const appearEnd = appearStart + 0.06;
  const exitStart = 0.58 + card.exitOrder * 0.016;
  const exitEnd = exitStart + 0.08;

  // All animations via pure useTransform with smoothstep easing — no spring wrappers
  const computedStyle = useTransform(scrollProgress, (p: number) => {
    // Appear phase
    const appearT = smoothstep(appearStart, appearEnd, p);
    // Exit phase
    const exitT = smoothstep(exitStart, exitEnd, p);

    const baseScale = 0.3 + appearT * 0.7;
    
    // Stretch effect on exit
    const scaleX = baseScale * (1 - exitT * 0.35);
    const scaleY = baseScale * (1 + exitT * 0.85);

    // Fade in, but no fade out!
    const opacity = appearT;
    
    // Y position
    const y = (1 - appearT) * 60 + exitT * (-1200 - card.depth * 200);

    return { scaleX, scaleY, opacity, y };
  });

  const scaleX = useTransform(computedStyle, (v) => v.scaleX);
  const scaleY = useTransform(computedStyle, (v) => v.scaleY);
  const opacity = useTransform(computedStyle, (v) => v.opacity);
  const translateY = useTransform(computedStyle, (v) => v.y);

  // Smooth fade-in when returning from zoom (prevents the "flop")
  const isHidden = animatingCardId === card.id;
  const returnOpacity = isReturning && animatingCardId === card.id ? 0 : 1;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeOverlay || animatingCardId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveOverlay({ card, rect });
    setAnimatingCardId(card.id);
  };

  return (
    <FloatingElement
      depth={card.depth}
      className={`${card.positionClass} ${card.zIndexClass} pointer-events-auto`}
    >
        <motion.div
          style={{
            scaleX,
            scaleY,
            opacity,
            y: translateY,
            transformOrigin: "center center",
          }}
          className="will-change-transform"
        >
          <motion.div
            className={`relative ${card.widthClass} ${card.aspectRatio} cursor-pointer select-none rounded-none shadow-sm [perspective:1000px]`}
            onClick={handleClick}
            initial={false}
            animate={{
              opacity: isHidden ? 0 : returnOpacity,
            }}
            whileHover={{ scale: 1.03 }}
            transition={{
              opacity: { duration: 0.3, ease: "easeOut" },
              scale: { type: "spring", stiffness: 300, damping: 25 },
            }}
            style={{
              pointerEvents: isHidden ? "none" : "auto",
            }}
          >
            <div className="relative w-full h-full [transform-style:preserve-3d]">
              <CardFront card={card} />
              <CardBack card={card} />
            </div>
          </motion.div>
        </motion.div>
    </FloatingElement>
  );
};

const ZoomedCard = ({
  overlayData,
  onClose,
}: {
  overlayData: { card: CardItem; rect: DOMRect };
  onClose: () => void;
}) => {
  const { card, rect } = overlayData;
  const [isHovered, setIsHovered] = useState(false);
  const [windowSize, setWindowSize] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1000,
    h: typeof window !== "undefined" ? window.innerHeight : 1000,
  });

  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  const SPRING_MOUSE = { stiffness: 200, damping: 15, mass: 0.3 };

  const srx = useSpring(rx, SPRING_MOUSE);
  const sry = useSpring(ry, SPRING_MOUSE);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const max = 12;
    ry.set((0.5 - px) * max);
    rx.set((0.5 - py) * max);
    gx.set(px * 100);
    gy.set(py * 100);
  };

  const onEnter = () => setIsHovered(true);

  const onLeave = () => {
    setIsHovered(false);
    rx.set(0);
    ry.set(0);
    // Remove gx and gy reset so the glare fades out exactly where the mouse left
  };

  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.12), transparent 50%)`;

  // Compute target centered position
  let targetHeight = windowSize.h * 0.6;
  const cardAspectRatio = rect.width / rect.height;
  let targetWidth = targetHeight * cardAspectRatio;
  if (targetWidth > windowSize.w * 0.9) {
    targetWidth = windowSize.w * 0.9;
    targetHeight = targetWidth / cardAspectRatio; // Preserve aspect ratio!
  }

  if (rect.height > rect.width) {
    targetHeight = targetHeight * 1.5;
    if (targetHeight > windowSize.h * 0.92) {
      targetHeight = windowSize.h * 0.92;
    }
    // Re-calculate targetWidth so aspect ratio is perfectly maintained!
    targetWidth = targetHeight * cardAspectRatio;
  }

  // Displacement from card origin to screen center
  const endX = windowSize.w / 2 - (rect.left + targetWidth / 2);
  const endY = windowSize.h / 2 - (rect.top + targetHeight / 2);

  return (
    <>
      <motion.div
        initial={{
          opacity: 0,
          backdropFilter: "blur(0px)",
          backgroundColor: "rgba(0,0,0,0)",
        }}
        animate={{
          opacity: 1,
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(5, 5, 10, 0.4)", // Significantly reduced blur and darkness
        }}
        exit={{
          opacity: 0,
          backdropFilter: "blur(0px)",
          backgroundColor: "rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[100] pointer-events-auto"
        onClick={onClose}
      />
      <motion.div
        className="fixed z-[101] pointer-events-none [perspective:1000px]"
        style={{
          top: rect.top,
          left: rect.left,
        }}
        initial={{
          width: rect.width,
          height: rect.height,
          x: 0,
          y: 0,
          z: 0,
        }}
        animate={{
          width: targetWidth,
          height: targetHeight,
          x: endX,
          y: endY,
          z: [0, 200, 0], // Z-axis parabola
        }}
        exit={{
          width: rect.width,
          height: rect.height,
          x: 0,
          y: 0,
          z: [0, 200, 0], // Z-axis parabola
        }}
        transition={{
          duration: 0.85,
          ease: [0.22, 1, 0.36, 1],
          z: { duration: 0.85, ease: "easeInOut", times: [0, 0.5, 1] },
        }}
      >
        <motion.div
          className="relative w-full h-full pointer-events-auto cursor-pointer [transform-style:preserve-3d]"
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 180 }}
          exit={{ rotateY: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          onClick={onClose}
          onMouseEnter={onEnter}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          <motion.div
            className="absolute inset-0 w-full h-full [transform-style:preserve-3d]"
            style={{ rotateX: srx, rotateY: sry }}
          >
            <CardFront card={card} />
            <CardBack card={card} isExpanded={true} />
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none [transform:rotateY(180deg)] [backface-visibility:hidden] transition-opacity duration-500"
              style={{ background: glareBg, opacity: isHovered ? 1 : 0 }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
};

export const FloatingCards = forwardRef<FloatingCardsRef, FloatingCardsProps>(
  ({ cards = problemData.problemCards as CardItem[], className = "", sensitivity = 1 }, ref) => {
    const [activeOverlay, setActiveOverlay] = useState<{
      card: CardItem;
      rect: DOMRect;
    } | null>(null);
    const [animatingCardId, setAnimatingCardId] = useState<string | null>(null);
    const [isReturning, setIsReturning] = useState(false);

    const progressValue = useMotionValue(0);

    useImperativeHandle(ref, () => ({
      updateProgress(pTotal: number) {
        progressValue.set(pTotal);
      },
    }));

    // Handle card close — set returning state so the in-grid card fades in smoothly
    const handleClose = useCallback(() => {
      setIsReturning(true);
      setActiveOverlay(null);
    }, []);

    // When exit animation completes, fade the in-grid card back and clear state
    const handleExitComplete = useCallback(() => {
      // Small delay to let the CSS opacity transition run on the in-grid card
      requestAnimationFrame(() => {
        setAnimatingCardId(null);
        // Clear returning after the fade completes
        setTimeout(() => setIsReturning(false), 400);
      });
    }, []);

    // Prevent body scroll during card zoom
    useEffect(() => {
      if (activeOverlay || animatingCardId) {
        const preventDefault = (e: Event) => e.preventDefault();
        const preventKeyScroll = (e: KeyboardEvent) => {
          if (
            ["Space", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.code)
          ) {
            e.preventDefault();
          }
        };

        window.addEventListener("wheel", preventDefault, { passive: false });
        window.addEventListener("touchmove", preventDefault, { passive: false });
        window.addEventListener("keydown", preventKeyScroll, { passive: false });

        return () => {
          window.removeEventListener("wheel", preventDefault);
          window.removeEventListener("touchmove", preventDefault);
          window.removeEventListener("keydown", preventKeyScroll);
        };
      }
    }, [activeOverlay, animatingCardId]);

    return (
      <div className={`absolute inset-0 pointer-events-none select-none ${className}`}>
        <style dangerouslySetInnerHTML={{ __html: CARD_STYLES }} />
        <Floating 
          sensitivity={sensitivity} 
          className="overflow-hidden"
          isFrozen={!!activeOverlay || !!animatingCardId}
        >
          {cards.map((card) => (
            <FlippableCard
              key={card.id}
              card={card}
              scrollProgress={progressValue}
              activeOverlay={activeOverlay}
              setActiveOverlay={setActiveOverlay}
              animatingCardId={animatingCardId}
              setAnimatingCardId={setAnimatingCardId}
              isReturning={isReturning}
            />
          ))}
        </Floating>

        {/* Focus Mode Overlay */}
        <AnimatePresence onExitComplete={handleExitComplete}>
          {activeOverlay && (
            <ZoomedCard
              overlayData={activeOverlay}
              onClose={handleClose}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }
);

FloatingCards.displayName = "FloatingCards";

export default FloatingCards;
