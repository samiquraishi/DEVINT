"use client";

import React, { forwardRef } from "react";
import FoldText from "@/components/ui/fold-text";

export interface AnimatedFoldTextProps {
  text: string;
  fontSize: string | number;
  fontWeight?: string | number;
  highlightWords?: string[];
  active?: boolean;
  mode?: "in" | "out";
  align?: "left" | "center" | "right";
  color?: string;
  duration?: number;
  stagger?: number;
  onComplete?: () => void;
  className?: string;
}

const AnimatedFoldText = forwardRef<HTMLDivElement, AnimatedFoldTextProps>(
  (
    {
      text,
      fontSize,
      fontWeight = 300,
      highlightWords,
      active = true,
      mode = "in",
      align = "center",
      color = "#ffffff",
      duration = 1.2,
      stagger = 0.025,
      onComplete,
      className = "",
    },
    ref
  ) => {
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
      <div
        ref={ref}
        className={`min-h-[1.2em] flex w-full ${textClass} ${justifyClass} ${className}`.trim()}
      >
        {active && (
          <FoldText
            text={text}
            trigger="mount"
            splitBy="char"
            duration={duration}
            stagger={stagger}
            fontSize={fontSize}
            fontWeight={fontWeight}
            color={color}
            mode={mode}
            onComplete={onComplete}
            highlightWords={highlightWords}
            className={`select-none font-montserrat tracking-[0.03em] [word-spacing:0.1em] ${textClass}`}
          />
        )}
      </div>
    );
  }
);

AnimatedFoldText.displayName = "AnimatedFoldText";

export default AnimatedFoldText;
