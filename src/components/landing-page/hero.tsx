"use client";

import dynamic from "next/dynamic";
import ScrollExpand from "../scroll-expand";
import ScrollIndicator from "../scroll-indicator";

// Dynamically import GradientWaves to bypass SSR
const GradientWaves = dynamic(
  () => import("../gradient-waves"),
  { ssr: false }
);

export default function HeroSection() {
  return (
    <div className="relative w-full bg-transparent">
      {/* ScrollExpand Hero Section with GradientWaves as bgContent */}
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
        title="DEVINT"
        startWidth={15} // vertical rectangle width
        startHeight={50} // vertical rectangle height
        startRadius={0}
        endRadius={0}
        mediaZoom={1.0} // keep canvas rendering crisp
        scrollDistance={2.0} // scroll depth
        holdDistance={0.5} // hold at full screen
        smoothing={0.1}
        overlayScrim={0.0} // no scrim
        useWindowScroll={true}
      />

      {/* Floating scroll indicator */}
      <ScrollIndicator />
    </div>
  );
}
