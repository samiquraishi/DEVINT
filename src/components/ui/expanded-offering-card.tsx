"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import type { NumberedCardData } from "./cylinder-gallery/cardTextures";

export interface CardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ExpandedOfferingCardProps {
  card: NumberedCardData;
  rect: CardRect;
  onClose: () => void;
}

export const ExpandedOfferingCard: React.FC<ExpandedOfferingCardProps> = ({
  card,
  rect,
  onClose,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [windowSize, setWindowSize] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 1200,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard close listener (Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock scroll while modal is open
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", preventDefault, { passive: false });
    window.addEventListener("touchmove", preventDefault, { passive: false });
    return () => {
      window.removeEventListener("wheel", preventDefault);
      window.removeEventListener("touchmove", preventDefault);
    };
  }, []);

  // Ensure autoplay triggers on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, []);

  // Compute 16:9 target size in center of viewport
  let targetWidth = Math.min(windowSize.w * 0.88, 1060);
  let targetHeight = targetWidth * (9 / 16);
  if (targetHeight > windowSize.h * 0.84) {
    targetHeight = windowSize.h * 0.84;
    targetWidth = targetHeight * (16 / 9);
  }

  const targetLeft = (windowSize.w - targetWidth) / 2;
  const targetTop = (windowSize.h - targetHeight) / 2;

  const deltaX = targetLeft - rect.left;
  const deltaY = targetTop - rect.top;

  return (
    <>
      {/* Light Dim Backdrop: Click outside to close */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm cursor-pointer pointer-events-auto"
        onClick={onClose}
      />

      {/* Expanded Card: Sharp edges, moving from 3D position to Center */}
      <motion.div
        className="fixed z-[101] pointer-events-none will-change-[transform,width,height]"
        style={{
          top: rect.top,
          left: rect.left,
        }}
        initial={{
          width: rect.width,
          height: rect.height,
          x: 0,
          y: 0,
          opacity: 0.95,
          borderRadius: 0,
        }}
        animate={{
          width: targetWidth,
          height: targetHeight,
          x: deltaX,
          y: deltaY,
          opacity: 1,
          borderRadius: 0,
        }}
        exit={{
          width: rect.width,
          height: rect.height,
          x: 0,
          y: 0,
          opacity: 0,
          borderRadius: 0,
        }}
        transition={{
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
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
      </motion.div>
    </>
  );
};

export default ExpandedOfferingCard;
