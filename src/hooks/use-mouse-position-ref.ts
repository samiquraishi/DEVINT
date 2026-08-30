import { RefObject, useEffect, useRef } from "react";

export const useMousePositionRef = (
  containerRef?: RefObject<HTMLElement | SVGElement | null>
) => {
  const positionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (x: number, y: number) => {
      if (containerRef && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const halfW = rect.width / 2 || 1;
        const halfH = rect.height / 2 || 1;
        const centerX = rect.left + halfW;
        const centerY = rect.top + halfH;

        // Normalized relative position from center [-1, 1]
        positionRef.current = {
          x: (x - centerX) / halfW,
          y: (y - centerY) / halfH,
        };
      } else {
        const halfW = (typeof window !== "undefined" ? window.innerWidth : 1000) / 2;
        const halfH = (typeof window !== "undefined" ? window.innerHeight : 1000) / 2;
        positionRef.current = {
          x: (x - halfW) / halfW,
          y: (y - halfH) / halfH,
        };
      }
    };

    const handleMouseMove = (ev: MouseEvent) => {
      updatePosition(ev.clientX, ev.clientY);
    };

    const handleTouchMove = (ev: TouchEvent) => {
      const touch = ev.touches[0];
      if (touch) {
        updatePosition(touch.clientX, touch.clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
};
