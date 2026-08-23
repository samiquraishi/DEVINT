"use client";

import React, { forwardRef } from "react";
import HeroTitle from "@/components/text/hero-title";
import heroData from "../../../../../public/content/hero.json";

interface HeroSectionProps {
  // Empty for now, but allows future extensibility
}

const HeroSection = forwardRef<HTMLDivElement, HeroSectionProps>((props, ref) => {
  return (
    <HeroTitle ref={ref} title={heroData.title} />
  );
});

HeroSection.displayName = "HeroSection";

export default HeroSection;
