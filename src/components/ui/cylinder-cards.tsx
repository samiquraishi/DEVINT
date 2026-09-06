import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Scene } from "./cylinder-gallery/Scene";
import { clamp } from "@/lib/utils";

export interface CylinderCardsRef {
  updateProgress: (pTotal: number) => void;
  container: HTMLDivElement | null;
}

export interface CylinderCardsProps {
  className?: string;
}

export const CylinderCards = forwardRef<CylinderCardsRef, CylinderCardsProps>(
  ({ className = "" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const frontContainerRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        if (!containerRef.current) return;

        const el = containerRef.current;

        const startRise = 0.740;
        const endFall = 0.940;
        
        // Update 3D scene scroll progress state
        const rawProgress = clamp((pTotal - startRise) / (endFall - startRise), 0, 1);
        setScrollProgress(rawProgress);

        if (pTotal >= startRise && pTotal <= endFall) {
          el.style.display = "block";
          if (frontContainerRef.current) frontContainerRef.current.style.display = "block";
          
          el.style.opacity = "1";
          if (frontContainerRef.current) frontContainerRef.current.style.opacity = "1";
        } else {
          el.style.display = "none";
          if (frontContainerRef.current) frontContainerRef.current.style.display = "none";
        }
      },
    }));

    return (
      <>
        {/* Back of the cylinder (rendered behind the text) */}
        <div
          ref={containerRef}
          className={`absolute inset-0 pointer-events-auto [will-change:opacity] ${className}`}
          style={{ display: "none", opacity: 1, zIndex: 10 }} // z-10 is behind text
        >
          <Scene
            autoScroll={false}
            scrollProgress={scrollProgress}
            speed={0.1}
            damping={0.98}
            cycles={5}
            cardDepth={100}
            renderHalf="back"
          />
        </div>

        {/* Front of the cylinder (rendered in front of the text) */}
        <div
          ref={frontContainerRef}
          className={`absolute inset-0 pointer-events-none [will-change:opacity] ${className}`}
          style={{ display: "none", opacity: 1, zIndex: 20 }} // z-20 is in front of text
        >
          <Scene
            autoScroll={false}
            scrollProgress={scrollProgress}
            speed={0.1}
            damping={0.98}
            cycles={5}
            cardDepth={100}
            renderHalf="front"
          />
        </div>
      </>
    );
  }
);

CylinderCards.displayName = "CylinderCards";
