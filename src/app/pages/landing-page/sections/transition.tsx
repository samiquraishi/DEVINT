"use client";

import React from "react";
import ScrollFoldText from "@/components/text/scroll-fold-text";
import { GlowingOrb, GlowingOrbHandle } from "@/components/ui/glowing-orb";
import transitionData from "../../../../../public/content/transition.json";

interface TransitionSectionProps {
  text2Ref: React.RefObject<HTMLDivElement | null>;
  text3Ref: React.RefObject<HTMLDivElement | null>;
  orbRef: React.RefObject<GlowingOrbHandle | null>;
}

export default function TransitionSection({
  text2Ref,
  text3Ref,
  orbRef,
}: TransitionSectionProps) {
  return (
    <>
      {/* Container for "The future doesn't wait..." (z-20) */}
      <div
        ref={text2Ref}
        className="absolute inset-0 z-20 flex items-center justify-center m-0 px-[6%] text-center mix-blend-difference pointer-events-none select-none [will-change:opacity,transform] opacity-0"
        style={{ display: "none" }}
      >
        <div className="flex flex-col items-start justify-center max-w-4xl w-full gap-y-5">
          <ScrollFoldText
            text={transitionData.phase1.text}
            fontSize="clamp(1.2rem, 2.5vw, 2.1rem)"
            highlightWords={transitionData.phase1.highlights}
            align="left"
          />
          <ScrollFoldText
            text={transitionData.phase1.subText}
            fontSize="clamp(0.8rem, 1.3vw, 1.1rem)"
            highlightWords={transitionData.phase1.highlights}
            align="left"
          />
        </div>
      </div>

      {/* The Glowing Orb */}
      <GlowingOrb ref={orbRef} />

      {/*
        Text 3 — "Welcome to the world of DEVINT"
        Two overlapping layers so "Welcome to the world of" gets
        mix-blend-difference while "DEVINT" renders normally.
        Both render the FULL sentence to keep character positions
        identical; CSS hides the irrelevant parts in each layer.
      */}

      {/* Layer A: mix-blend-difference — hides DEVINT characters */}
      <div
        ref={text3Ref}
        className="absolute inset-0 z-40 flex items-center justify-center m-0 px-[6%] text-center mix-blend-difference pointer-events-none select-none [will-change:opacity,transform] opacity-0 [&_.fold-text-highlight]:invisible"
        style={{ display: "none" }}
      >
        <div className="flex flex-col items-center justify-center max-w-5xl w-full text-center">
          <ScrollFoldText
            text={transitionData.phase2.text}
            fontSize="clamp(1.2rem, 2.5vw, 2.1rem)"
            highlightWords={transitionData.phase2.highlights}
          />
        </div>
      </div>

      {/* Layer B: no blend — shows only DEVINT, hides regular text */}
      <div
        className="absolute inset-0 z-[41] flex items-center justify-center m-0 px-[6%] text-center pointer-events-none select-none [will-change:opacity,transform] opacity-0 [&_.fold-text-piece:not(.fold-text-highlight)]:invisible"
        style={{ display: "none" }}
        data-text3-overlay
      >
        <div className="flex flex-col items-center justify-center max-w-5xl w-full text-center">
          <ScrollFoldText
            text={transitionData.phase2.text}
            fontSize="clamp(1.2rem, 2.5vw, 2.1rem)"
            highlightWords={transitionData.phase2.highlights}
          />
        </div>
      </div>
    </>
  );
}
