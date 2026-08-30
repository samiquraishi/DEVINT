"use client";

import dynamic from "next/dynamic";
import ScrollExpand from "@/components/ui/scroll-expand";
import ScrollIndicator from "@/components/ui/scroll-indicator";

const StarfieldClose = dynamic(
  () => import("@/components/ui/starfield-close"),
  { ssr: false }
);

const GradientWaves = dynamic(
  () => import("@/components/ui/gradient-waves"),
  { ssr: false }
);

export default function LandingPage() {
  return (
    <main className="relative flex-grow flex flex-col w-full bg-[#08081a]">
      {/* ── Fixed background: Starfield stays active and visible ── */}
      <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
        <div className="absolute inset-0 w-full h-full">
          <StarfieldClose />
        </div>
      </div>

      {/* ── Scrollable Sections ── */}
      <div className="relative z-10 w-full bg-transparent">
        <ScrollExpand
          customMedia={null}
          bgContent={
            <GradientWaves
              horizonColor="#5227ff"
              waveColor="#ff9ffc"
              crestColor="#ffffff"
              speed={0.7}
              amplitude={3}
              waveScale={0.7}
              waveRatio={0.5}
              swell={40}
              turbulence={0}
              tilt={1.5}
              zoom={1}
              height={2}
              fogDepth={14}
              detail="high"
              brightness={1.05}
              opacity={1}
              mouseInteraction={true}
              parallaxStrength={0.3}
              grain={false}
              grainIntensity={0}
            />
          }
          mediaType="custom"
          startWidth={15}
          startHeight={50}
          startRadius={0}
          endRadius={0}
          mediaZoom={1.0}
          scrollDistance={2.0}
          holdDistance={26.0}
          smoothing={0.1}
          overlayScrim={0.0}
          useWindowScroll={true}
        />
        <ScrollIndicator />
      </div>
    </main>
  );
}