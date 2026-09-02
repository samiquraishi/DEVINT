"use client";

import React, { FC, ReactNode } from "react";

export interface GlassSurfaceProps {
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Lightweight, GPU-accelerated liquid black glass surface.
 * Delivers 60 FPS performance without heavy SVG filter re-rasterization.
 */
export const GlassSurface: FC<GlassSurfaceProps> = ({
  children,
  className = "",
  style = {},
}) => {
  return (
    <div
      className={`relative rounded-none border border-white/15 bg-[#08080e]/70 backdrop-blur-xl [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.35),inset_0_-1px_0_0_rgba(255,255,255,0.08),inset_1px_0_0_0_rgba(255,255,255,0.12),inset_-1px_0_0_0_rgba(255,255,255,0.12),0_24px_48px_rgba(0,0,0,0.5)] ${className}`}
      style={{
        WebkitBackdropFilter: "blur(20px) saturate(170%) brightness(1.1)",
        backdropFilter: "blur(20px) saturate(170%) brightness(1.1)",
        ...style,
      }}
    >
      {/* Specular liquid sheen gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-none bg-gradient-to-br from-white/[0.12] via-transparent to-black/30"
      />
      <div className="relative z-10 w-full h-full flex flex-col justify-center">
        {children}
      </div>
    </div>
  );
};

export default GlassSurface;
