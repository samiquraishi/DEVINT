"use client";

import { useEffect } from "react";

/**
 * Global scroll speed limiter with smooth interpolation.
 * Intercepts wheel events, caps the delta, and smoothly eases
 * toward the target scroll position using requestAnimationFrame.
 */
export default function ScrollSpeedLimiter({
  maxDeltaPerEvent = 60,
  smoothing = 0.12,
}: {
  maxDeltaPerEvent?: number;
  smoothing?: number;
}) {
  useEffect(() => {
    let targetScroll = window.scrollY;
    let currentScroll = window.scrollY;
    let raf = 0;

    const getMaxScroll = () =>
      document.documentElement.scrollHeight - window.innerHeight;

    const clamp = (v: number, min: number, max: number) =>
      v < min ? min : v > max ? max : v;

    const tick = () => {
      const delta = (targetScroll - currentScroll) * smoothing;
      currentScroll += delta;

      if (Math.abs(targetScroll - currentScroll) < 0.5) {
        currentScroll = targetScroll;
      }

      window.scrollTo(0, currentScroll);

      if (Math.abs(currentScroll - targetScroll) > 0.5) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Cap the delta
      const rawDelta = e.deltaY;
      const cappedDelta =
        Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), maxDeltaPerEvent);

      // Accumulate into target (clamped to page bounds)
      targetScroll = clamp(
        targetScroll + cappedDelta,
        0,
        getMaxScroll()
      );

      // Start smooth animation if not already running
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // Sync on native scroll (e.g. keyboard, scrollbar drag)
    const onScroll = () => {
      if (!raf) {
        // Only sync if we're not actively animating
        targetScroll = window.scrollY;
        currentScroll = window.scrollY;
      }
    };

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("scroll", onScroll);
    };
  }, [maxDeltaPerEvent, smoothing]);

  return null;
}
