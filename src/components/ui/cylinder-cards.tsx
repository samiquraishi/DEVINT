import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from "react";
import { Scene } from "./cylinder-gallery/Scene";
import { ExpandedOfferingCard, type CardAnimPhase } from "./expanded-offering-card";
import type { CardRect } from "./cylinder-gallery/Gallery";
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

const RING_WIPE_DURATION = 380; // ms — how long the card takes to vanish/reappear in the ring

export const CylinderCards = forwardRef<CylinderCardsRef, CylinderCardsProps>(
  ({ className = "", onPanelClick, onExpandChange, isFrozen = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const frontContainerRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [expandedCard, setExpandedCard] = useState<NumberedCardData | null>(null);
    const [animPhase, setAnimPhase] = useState<CardAnimPhase | null>(null);
    const [hiddenCardId, setHiddenCardId] = useState<number | null>(null);

    const sharedHoveredIndexRef = useRef<number>(-1);

    const cardClipRef = useRef<{ cardId: number; progress: number; phase: 'leaving' | 'returning' } | null>(null);

    const handlePanelClick = useCallback((card: NumberedCardData, rect?: CardRect) => {
      if (animPhase !== null) return;
      // Start phase 1: card leaves the ring
      setExpandedCard(card);
      setHiddenCardId(card.id);
      setAnimPhase("card-leaving");
      onPanelClick?.(card, rect);

      cardClipRef.current = { cardId: card.id, progress: 0, phase: 'leaving' };
      
      const startTime = performance.now();
      const animateRingWipeOut = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / RING_WIPE_DURATION, 1);
        const eased = Math.pow(t, 3); // Cubic ease-in
        if (cardClipRef.current) {
          cardClipRef.current.progress = eased;
        }
        
        if (t < 1) {
          requestAnimationFrame(animateRingWipeOut);
        } else {
          setAnimPhase("entering");
          // Freeze parent's SphereGrid now that animation is done.
          onExpandChange?.(true);
        }
      };
      requestAnimationFrame(animateRingWipeOut);

    }, [animPhase, onPanelClick, onExpandChange]);

    const handlePhaseComplete = useCallback((completedPhase: CardAnimPhase) => {
      if (completedPhase === "entering") {
        setAnimPhase("visible");
      } else if (completedPhase === "leaving") {
        // Expanded card has disappeared, now show card returning to ring
        setAnimPhase("card-returning");

        if (cardClipRef.current) {
          cardClipRef.current.phase = 'returning';
          cardClipRef.current.progress = 0;
        }

        // Unfreeze parent's SphereGrid so it can resume.
        onExpandChange?.(false);

        const startTime = performance.now();
        const animateRingWipeIn = (now: number) => {
          const elapsed = now - startTime;
          const t = Math.min(elapsed / RING_WIPE_DURATION, 1);
          const eased = 1 - Math.pow(1 - t, 3); // Cubic ease-out
          if (cardClipRef.current) {
            cardClipRef.current.progress = eased;
          }

          if (t < 1) {
            requestAnimationFrame(animateRingWipeIn);
          } else {
            cardClipRef.current = null;
            setHiddenCardId(null);
            setExpandedCard(null);
            setAnimPhase(null);
          }
        };
        requestAnimationFrame(animateRingWipeIn);
      }
    }, [onExpandChange]);

    const handleClose = useCallback(() => {
      if (animPhase !== "visible") return;
      // Start closing: expanded card leaves
      setAnimPhase("leaving");
    }, [animPhase]);

    // Lock scroll while modal is active (in any phase)
    React.useEffect(() => {
      if (animPhase !== null) {
        const preventDefault = (e: Event) => e.preventDefault();
        window.addEventListener("wheel", preventDefault, { passive: false });
        window.addEventListener("touchmove", preventDefault, { passive: false });
        return () => {
          window.removeEventListener("wheel", preventDefault);
          window.removeEventListener("touchmove", preventDefault);
        };
      }
    }, [animPhase]);

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

    const shouldFreezeScene =
      animPhase === "entering" || animPhase === "visible" || animPhase === "leaving";

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
            isFrozen={isFrozen || shouldFreezeScene}
            sharedHoveredIndexRef={sharedHoveredIndexRef}
            cardClipRef={cardClipRef}
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
            isFrozen={isFrozen || shouldFreezeScene}
            sharedHoveredIndexRef={sharedHoveredIndexRef}
            cardClipRef={cardClipRef}
          />
        </div>

        {/* Expanded Card Modal */}
        {expandedCard && animPhase && (
          <ExpandedOfferingCard
            card={expandedCard}
            phase={animPhase}
            onPhaseComplete={handlePhaseComplete}
            onClose={handleClose}
          />
        )}
      </>
    );
  }
);

CylinderCards.displayName = "CylinderCards";
