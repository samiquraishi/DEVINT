import React from "react";

interface ScrollFoldTextProps {
  text: string;
  fontSize: string;
  fontWeight?: number;
  color?: string;
  highlightWords?: string[];
  align?: "left" | "center" | "right";
  className?: string;
}

export default function ScrollFoldText({
  text,
  fontSize,
  fontWeight = 300,
  color = "#ffffff",
  highlightWords = [],
  align = "center",
  className = "",
}: ScrollFoldTextProps) {
  const parts = text.split(/(\s+)/);
  const totalChars = text.replace(/\s+/g, "").length || 1;
  let charCounter = 0;

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
      className={`flex flex-wrap items-baseline font-montserrat tracking-[0.03em] w-full ${justifyClass} ${textClass} ${className}`}
      style={{ fontSize, fontWeight, color }}
    >
      {parts.map((part, wordIndex) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) {
          return (
            <span key={`ws-${wordIndex}`} className="inline-block">
              &nbsp;
            </span>
          );
        }

        const cleanWord = part.toLowerCase().replace(/[.,'":;!?()]/g, "");
        const isHighlighted = highlightWords.some((w) => w.toLowerCase() === cleanWord);
        const charArray = Array.from(part);
        const wordLen = charArray.length;

        return (
          <span
            key={`word-${wordIndex}`}
            className="inline-flex items-baseline"
            style={{ perspective: "800px", transformStyle: "preserve-3d" }}
          >
            {charArray.map((char, charIndex) => {
              const globalIdx = charCounter++;
              const charNorm = globalIdx / totalChars;
              const bgX = wordLen > 1 ? (charIndex / (wordLen - 1)) * 100 : 0;

              return (
                <span
                  key={`c-${globalIdx}`}
                  className="inline-block"
                  style={{ perspective: "800px", transformStyle: "preserve-3d" }}
                >
                  <span
                    data-fold-char
                    data-char-norm={charNorm}
                    className={`fold-text-piece inline-block [backface-visibility:hidden] [will-change:transform,opacity] ${
                      isHighlighted ? "fold-text-highlight" : ""
                    }`.trim()}
                    style={
                      {
                        transformOrigin: "50% 0%",
                        transform: "rotateX(-90deg)",
                        opacity: 0,
                        ...(isHighlighted
                          ? {
                              "--bg-size": `${wordLen * 100}%`,
                              "--bg-x": `${bgX}%`,
                            }
                          : {}),
                      } as React.CSSProperties
                    }
                  >
                    {char}
                  </span>
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}
