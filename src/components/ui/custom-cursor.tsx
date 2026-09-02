"use client";

import React, { useState, useEffect } from "react";
import { SVGFollower } from "./svg-follower";

const CLASSIC_COLORS = ["#ef4444", "#ffffff", "#000000", "#0061ff", "#ff007f"];

export default function CustomCursor() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [isPointerDown, setIsPointerDown] = useState<boolean>(false);
  const [isHoveringInteractable, setIsHoveringInteractable] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = Boolean(
          target.closest("button, a, input, select, textarea, [role='button'], [tabindex], label, .cursor-pointer")
        );
        setIsHoveringInteractable(interactive);
      }
    };

    const handleMouseDown = () => setIsPointerDown(true);
    const handleMouseUp = () => setIsPointerDown(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* SVG Follower Canvas Trail */}
      <SVGFollower
        colors={CLASSIC_COLORS}
        removeDelay={200}
        shapeFrequency={0.07}
        shapeMode="mixed"
        maxTurnAngle={90}
        trailWidth={1.0}
        className="fixed inset-0 w-full h-full pointer-events-none z-40"
      />

      {/* Red Dot Pointer & Ring Gap */}
      {isVisible && cursorPos.x >= 0 && cursorPos.y >= 0 && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
          }}
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Outer ring pulsing only when hovering over interactive elements, with mix-blend-difference */}
            {isHoveringInteractable && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white mix-blend-difference pointer-events-none transition-all duration-150 animate-pulse w-[14px] h-[14px]"
              />
            )}
            {/* Center Red Dot pointer - turns darker shade of red on click */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-150 ease-out w-[9px] h-[9px] ${
                isPointerDown ? "bg-red-800" : "bg-red-500"
              }`}
            />
          </div>
        </div>
      )}
    </>
  );
}
