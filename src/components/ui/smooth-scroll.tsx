"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateTicker);

    // Allow GSAP to recover gracefully from frame drops (e.g. Vercel CDN first-load jank).
    // lagSmoothing(0) disabled recovery and caused stutters on production.
    gsap.ticker.lagSmoothing(500, 33);

    // Refresh scroll bounds after all fonts and images have loaded,
    // so ScrollTrigger positions match the final document height.
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(updateTicker);
      ScrollTrigger.killAll();
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return <>{children}</>;
}
