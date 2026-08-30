"use client";

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useAnimationFrame } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMousePositionRef } from "@/hooks/use-mouse-position-ref";

interface FloatingContextType {
  registerElement: (id: string, element: HTMLDivElement, depth: number) => void;
  unregisterElement: (id: string) => void;
}

const FloatingContext = createContext<FloatingContextType | null>(null);

interface FloatingProps {
  children: ReactNode;
  className?: string;
  sensitivity?: number;
  easingFactor?: number;
  isFrozen?: boolean;
}

export const Floating = ({
  children,
  className,
  sensitivity = 1,
  easingFactor = 0.05,
  isFrozen = false,
  ...props
}: FloatingProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsMap = useRef(
    new Map<
      string,
      {
        element: HTMLDivElement;
        depth: number;
        currentPosition: { x: number; y: number };
      }
    >()
  );
  const mousePositionRef = useMousePositionRef(containerRef);
  const frozenMouseRef = useRef({ x: 0, y: 0 });

  const registerElement = useCallback(
    (id: string, element: HTMLDivElement, depth: number) => {
      elementsMap.current.set(id, {
        element,
        depth,
        currentPosition: { x: 0, y: 0 },
      });
    },
    []
  );

  const unregisterElement = useCallback((id: string) => {
    elementsMap.current.delete(id);
  }, []);

  useAnimationFrame(() => {
    if (!containerRef.current) return;

    let targetMouseX = mousePositionRef.current.x;
    let targetMouseY = mousePositionRef.current.y;

    if (isFrozen) {
      targetMouseX = frozenMouseRef.current.x;
      targetMouseY = frozenMouseRef.current.y;
    } else {
      frozenMouseRef.current.x = targetMouseX;
      frozenMouseRef.current.y = targetMouseY;
    }

    elementsMap.current.forEach((data) => {
      const baseScale = 75 * sensitivity;
      const strength = Math.sqrt(data.depth) * baseScale;

      const newTargetX = -targetMouseX * strength;
      const newTargetY = -targetMouseY * strength;

      // Smooth easing toward target
      const dx = newTargetX - data.currentPosition.x;
      const dy = newTargetY - data.currentPosition.y;

      data.currentPosition.x += dx * easingFactor;
      data.currentPosition.y += dy * easingFactor;

      data.element.style.transform = `translate3d(${data.currentPosition.x}px, ${data.currentPosition.y}px, 0)`;
    });
  });

  return (
    <FloatingContext.Provider value={{ registerElement, unregisterElement }}>
      <div
        ref={containerRef}
        className={cn("absolute top-0 left-0 w-full h-full", className)}
        {...props}
      >
        {children}
      </div>
    </FloatingContext.Provider>
  );
};

export default Floating;

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  depth?: number;
}

export const FloatingElement = ({
  children,
  className,
  depth = 1,
}: FloatingElementProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(Math.random().toString(36).substring(7));
  const context = useContext(FloatingContext);

  useEffect(() => {
    if (!elementRef.current || !context) return;

    const nonNullDepth = depth ?? 0.01;

    context.registerElement(idRef.current, elementRef.current, nonNullDepth);
    return () => context.unregisterElement(idRef.current);
  }, [depth, context]);

  return (
    <div
      ref={elementRef}
      className={cn("absolute will-change-transform", className)}
    >
      {children}
    </div>
  );
};
