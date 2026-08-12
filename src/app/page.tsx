"use client";

import dynamic from "next/dynamic";
import HeroSection from "@/components/landing-page/hero";

const StarfieldClose = dynamic(
  () => import("@/components/starfield-close"),
  { ssr: false }
);

const ComplexitySection = dynamic(
  () => import("@/components/complexity-section"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="relative flex-grow flex flex-col w-full bg-black">
      {/* Global fixed Starfield background */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <StarfieldClose />
      </div>
      
      {/* Foreground Sections */}
      <div className="relative z-10 w-full bg-transparent">
        <HeroSection />
        <ComplexitySection />
      </div>
    </main>
  );
}
