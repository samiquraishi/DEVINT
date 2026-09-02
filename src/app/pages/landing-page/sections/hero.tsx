"use client";

import React, { forwardRef } from "react";
import HeroTitle from "@/components/text/hero-title";
import heroData from "../../../../../public/content/hero.json";

const HeroSection = forwardRef<HTMLDivElement>((_, ref) => {
  return <HeroTitle ref={ref} title={heroData.title} />;
});

HeroSection.displayName = "HeroSection";

export default HeroSection;
