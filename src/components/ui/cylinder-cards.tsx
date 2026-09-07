import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Scene } from "./cylinder-gallery/Scene";
import { ExpandedOfferingCard, type CardRect } from "./expanded-offering-card";
import { clamp } from "@/lib/utils";

import type { NumberedCardData } from "./cylinder-gallery/cardTextures";

export interface CylinderCardsRef {
  updateProgress: (pTotal: number) => void;
  container: HTMLDivElement | null;
}

export interface CylinderCardsProps {
  className?: string;
  onPanelClick?: (card: NumberedCardData, rect?: CardRect) => void;
  onExpandChange?: (isExpanded: boolean) => void;
  isFrozen?: boolean;
}

export const CylinderCards = forwardRef<CylinderCardsRef, CylinderCardsProps>(
  ({ className = "", onPanelClick, onExpandChange, isFrozen = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const frontContainerRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [expandedData, setExpandedData] = useState<{
      card: NumberedCardData;
      rect: CardRect;
    } | null>(null);

    const sharedHoveredIndexRef = useRef<number>(-1);

    const handlePanelClick = useCallback((card: NumberedCardData, rect?: CardRect) => {
      const fallbackRect: CardRect = rect || {
        left: typeof window !== "undefined" ? window.innerWidth / 2 - 160 : 200,
        top: typeof window !== "undefined" ? window.innerHeight / 2 - 90 : 200,
        width: 320,
        height: 180,
      };
      setExpandedData({ card, rect: fallbackRect });
      onExpandChange?.(true);
      onPanelClick?.(card, fallbackRect);
    }, [onPanelClick, onExpandChange]);

    const handleClose = useCallback(() => {
      setExpandedData(null);
      onExpandChange?.(false);
    }, [onExpandChange]);

    useImperativeHandle(ref, () => ({
      get container() {
        return containerRef.current;
      },
      updateProgress(pTotal: number) {
        if (!containerRef.current) return;

        const el = containerRef.current;

        const startRise = 0.735;
        const endFall = 0.955;
        
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
            onPanelClick={handlePanelClick}
            isFrozen={isFrozen || !!expandedData}
            sharedHoveredIndexRef={sharedHoveredIndexRef}
          />
        </div>

        {/* Front of the cylinder (rendered in front of the text) */}
        <div
          ref={frontContainerRef}
          className={`absolute inset-0 pointer-events-auto [will-change:opacity] ${className}`}
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
            onPanelClick={handlePanelClick}
            isFrozen={isFrozen || !!expandedData}
            sharedHoveredIndexRef={sharedHoveredIndexRef}
          />
        </div>

        {/* Expanded Card Modal */}
        <AnimatePresence>
          {expandedData && (
            <ExpandedOfferingCard
              card={expandedData.card}
              rect={expandedData.rect}
              onClose={handleClose}
            />
          )}
        </AnimatePresence>
      </>
    );
  }
);

CylinderCards.displayName = "CylinderCards";
