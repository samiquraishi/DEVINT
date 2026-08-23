import React, { forwardRef } from "react";

interface HeroTitleProps {
  title: string;
}

const HeroTitle = forwardRef<HTMLDivElement, HeroTitleProps>(({ title }, ref) => {
  if (!title) return null;
  return (
    <div
      ref={ref}
      className="absolute inset-0 z-20 flex items-center justify-center m-0 px-[2%] text-center font-lemon font-light uppercase leading-none text-white mix-blend-difference [font-size:var(--se-title-size)] pointer-events-none select-none [will-change:opacity,transform]"
    >
      {title}
    </div>
  );
});

HeroTitle.displayName = "HeroTitle";

export default HeroTitle;
