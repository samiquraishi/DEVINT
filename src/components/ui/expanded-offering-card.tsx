"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { NumberedCardData } from "./cylinder-gallery/cardTextures";

export type CardAnimPhase =
  | "card-leaving"     // card disappears from ring (top-to-bottom wipe out)
  | "entering"         // expanded card appears center (top-to-bottom wipe in)
  | "visible"          // fully visible, video playing
  | "leaving"          // expanded card disappears (top-to-bottom wipe out)
  | "card-returning"   // card reappears in ring (top-to-bottom wipe in)
  | "done";            // animation complete, clean up

interface ExpandedOfferingCardProps {
  card: NumberedCardData;
  phase: CardAnimPhase;
  onPhaseComplete: (completedPhase: CardAnimPhase) => void;
  onClose: () => void;
}

const WIPE_DURATION = 420; // ms — duration for each wipe transition

export const ExpandedOfferingCard: React.FC<ExpandedOfferingCardProps> = ({
  card,
  phase,
  onPhaseComplete,
  onClose,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [clipPercent, setClipPercent] = useState(100); // 100 = fully hidden from top, 0 = fully revealed
  const [backdropOpacity, setBackdropOpacity] = useState(0);
  const animFrameRef = useRef<number>(0);

  // Keyboard close listener (Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "visible") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, phase]);



  // Animate clip-path based on phase
  useEffect(() => {
    if (phase === "entering") {
      // Wipe in: clipPercent 100 → 0 (reveal top-to-bottom)
      setClipPercent(100);
      setBackdropOpacity(0);
      // Force a frame so initial state is painted before transition
      const raf = requestAnimationFrame(() => {
        const startTime = performance.now();
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const t = Math.min(elapsed / WIPE_DURATION, 1);
          // Ease out cubic for smooth deceleration
          const eased = 1 - Math.pow(1 - t, 3);
          setClipPercent(100 - eased * 100);
          setBackdropOpacity(eased);
          if (t < 1) {
            animFrameRef.current = requestAnimationFrame(animate);
          } else {
            setClipPercent(0);
            setBackdropOpacity(1);
            onPhaseComplete("entering");
          }
        };
        animFrameRef.current = requestAnimationFrame(animate);
      });
      return () => {
        cancelAnimationFrame(raf);
        cancelAnimationFrame(animFrameRef.current);
      };
    }

    if (phase === "leaving") {
      // Wipe out: clipPercent 0 → 100 (hide top-to-bottom)
      setClipPercent(0);
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / WIPE_DURATION, 1);
        // Ease in cubic for smooth acceleration into hide
        const eased = Math.pow(t, 3);
        setClipPercent(eased * 100);
        setBackdropOpacity(1 - t);
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setClipPercent(100);
          setBackdropOpacity(0);
          onPhaseComplete("leaving");
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animFrameRef.current);
    }
  }, [phase, onPhaseComplete]);

  // Ensure autoplay triggers when visible
  useEffect(() => {
    if (phase === "visible" && videoRef.current) {
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [phase]);

  // Compute 16:9 target size in center of viewport
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  let targetWidth = Math.min(w * 0.88, 1060);
  let targetHeight = targetWidth * (9 / 16);
  if (targetHeight > h * 0.84) {
    targetHeight = h * 0.84;
    targetWidth = targetHeight * (16 / 9);
  }

  // Don't render if fully hidden and not in an active phase
  if (phase === "done" || phase === "card-leaving" || phase === "card-returning") {
    return null;
  }

  // clipPath: inset(top right bottom left)
  // For 'entering' (top-to-bottom reveal): inset(0 0 clipPercent% 0) -> bottom edge moves down to reveal
  // For 'leaving' (top-to-bottom hide): inset(clipPercent% 0 0 0) -> top edge moves down to hide
  let clipPath = "inset(0 0 0 0)";
  if (clipPercent > 0) {
    if (phase === "entering") {
      clipPath = `inset(0 0 ${clipPercent}% 0)`;
    } else if (phase === "leaving") {
      clipPath = `inset(${clipPercent}% 0 0 0)`;
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm cursor-pointer pointer-events-auto"
        style={{ opacity: backdropOpacity }}
        onClick={phase === "visible" ? onClose : undefined}
      />

      {/* Expanded Card with clip-path reveal */}
      <div
        className="fixed z-[101] pointer-events-none"
        style={{
          top: (h - targetHeight) / 2,
          left: (w - targetWidth) / 2,
          width: targetWidth,
          height: targetHeight,
          clipPath,
          willChange: "clip-path",
        }}
      >
        <div
          className="relative w-full h-full pointer-events-auto rounded-none overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] bg-neutral-950 border border-white/20 flex flex-col justify-between select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Video Player — edge to edge */}
          {card.video ? (
            <video
              ref={videoRef}
              src={card.video}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              className="absolute inset-0 w-full h-full object-cover block rounded-none"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-neutral-900 rounded-none" />
          )}

          {/* Top Header Scrim */}
          <div className="relative z-10 flex items-start justify-between p-5 sm:p-7 pb-6 bg-gradient-to-b from-black/70 via-black/20 to-transparent">
            <div>
              {/* Title with balanced medium weight and Devint Gradient */}
              <h3 className="text-xl sm:text-2xl md:text-3xl font-medium tracking-wider font-montserrat uppercase leading-tight closing-line-gradient">
                {card.title}
              </h3>

              {/* What We Can Build items: Clean lines without bullets or numbers */}
              {card.whatWeCanBuild && card.whatWeCanBuild.length > 0 && (
                <div className="flex flex-col gap-1 sm:gap-1.5 mt-2.5 sm:mt-3">
                  {card.whatWeCanBuild.map((item, idx) => (
                    <p
                      key={idx}
                      className="text-xs sm:text-sm text-neutral-200 font-montserrat font-light tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Sound toggle button in top right — clean white, no background box */}
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="p-1 bg-transparent border-0 text-white/85 hover:text-white transition-opacity cursor-pointer flex items-center justify-center"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>

          {/* Bottom Info Scrim: Description and Applications */}
          <div className="relative z-10 p-5 sm:p-7 pt-8 bg-gradient-to-t from-black/80 via-black/30 to-transparent mt-auto">
            {card.description && (
              <p className="text-sm sm:text-base md:text-lg text-white font-montserrat font-light leading-relaxed max-w-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {card.description}
              </p>
            )}
            {card.applicationsText && (
              <p className="mt-2 text-xs sm:text-sm text-neutral-300 font-mono tracking-wider uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {card.applicationsText}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ExpandedOfferingCard;
