"use client";

import React, { forwardRef } from "react";
import FoldText from "@/components/ui/fold-text";

interface AnimatedFoldTextProps {
  text: string;
  fontSize: string | number;
  highlightWords?: string[];
  active?: boolean;
  align?: "left" | "center" | "right";
}

const AnimatedFoldText = forwardRef<HTMLDivElement, AnimatedFoldTextProps>(
  ({ text, fontSize, highlightWords, active, align = "center" }, ref) => {
    
    // Determine justification based on align prop
    let justifyClass = "justify-center";
    let textClass = "text-center";
    if (align === "left") {
      justifyClass = "justify-start";
      textClass = "text-left";
    } else if (align === "right") {
      justifyClass = "justify-end";
      textClass = "text-right";
    }

    return (
      <div ref={ref} className={`min-h-[1.2em] flex w-full ${textClass} ${justifyClass}`}>
        {active && (
          <FoldText
            text={text}
            trigger="mount"
            splitBy="char"
            duration={1.5}
            stagger={0.03}
            fontSize={fontSize}
            fontWeight={300}
            color="#ffffff"
            highlightWords={highlightWords}
            className={`select-none font-montserrat font-light tracking-[0.04em] [word-spacing:0.1em] ${textClass}`}
          />
        )}
      </div>
    );
  }
);

AnimatedFoldText.displayName = "AnimatedFoldText";

export default AnimatedFoldText;
