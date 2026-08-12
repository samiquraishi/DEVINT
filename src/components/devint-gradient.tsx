"use client";

import React, { ReactNode } from "react";

interface DevintGradientProps {
  children: ReactNode;
  className?: string;
}

export default function DevintGradient({ children, className = "" }: DevintGradientProps) {
  return (
    <span className={`devint-gradient ${className}`.trim()}>
      {children}
    </span>
  );
}
