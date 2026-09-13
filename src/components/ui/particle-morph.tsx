"use client";

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { createNoise3D, createNoise4D } from "simplex-noise";

export interface ParticleMorphRef {
  setScrollMorph: (shapeIndex: number, morphProgress: number) => void;
  disperse: () => void;
  getCurrentShape: () => number;
}

export interface ParticleMorphProps {
  currentStage?: number; // -1: Dispersed/Cosmic, 0: Lightbulb, 1: Compass, 2: Gear, 3: BarGraph
  className?: string;
  isActive?: boolean;
}

const CONFIG = {
  particleCount: 18500,
  shapeSize: 20, // Increased size
  swarmDistanceFactor: 2.2,
  swirlFactor: 4.8,
  noiseFrequency: 0.08,
  noiseTimeScale: 0.03,
  noiseMaxStrength: 3.5,
  pointerRepel: 3.0,
  repelRadius: 4.5,
  colorScheme: "devint",
  morphDuration: 1700,
  particleSizeRange: [0.04, 0.11] as [number, number],
  idleFlowStrength: 0.6,
  idleFlowSpeed: 0.08,
  idleRotationSpeed: 0.015,
  morphSizeFactor: 0.4,
  morphBrightnessFactor: 0.1, // Reduced so shapes don't turn bright white
};

const COLOR_SCHEMES: Record<string, { startHue: number; endHue: number; saturation: number; lightness: number }> = {
  // White, light blue, very light purple, colder tint
  devint: { startHue: 200, endHue: 270, saturation: 0.45, lightness: 0.88 },
  nebula: { startHue: 240, endHue: 290, saturation: 0.9, lightness: 0.75 },
  cosmic: { startHue: 270, endHue: 320, saturation: 1.0, lightness: 0.8 },
  ocean: { startHue: 200, endHue: 250, saturation: 0.8, lightness: 0.7 },
  aurora: { startHue: 220, endHue: 280, saturation: 0.85, lightness: 0.75 },
};

export const ParticleMorph = forwardRef<ParticleMorphRef, ParticleMorphProps>(
  ({ currentStage = -1, className = "", isActive = true }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const setScrollMorphRef = useRef<((shapeIndex: number, morphProgress: number) => void) | null>(null);
    const disperseRef = useRef<(() => void) | null>(null);
    const currentShapeIndexRef = useRef<number>(-1);
    const isActiveRef = useRef(isActive);

    useEffect(() => {
      isActiveRef.current = isActive;
    }, [isActive]);

    useImperativeHandle(ref, () => ({
      setScrollMorph(shapeIndex: number, morphProgress: number) {
        setScrollMorphRef.current?.(shapeIndex, morphProgress);
      },
      disperse() {
        disperseRef.current?.();
      },
      getCurrentShape() {
        return currentShapeIndexRef.current;
      },
    }));

    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      let scene: THREE.Scene;
      let camera: THREE.PerspectiveCamera;
      let renderer: THREE.WebGLRenderer;
      let clock: THREE.Clock;
      let particlesGeometry: THREE.BufferGeometry;
      let particlesMaterial: THREE.ShaderMaterial;
      let particleSystem: THREE.Points;
      let currentPositions: Float32Array;
      let sourcePositions: Float32Array;
      let targetPositions: Float32Array[];
      let swarmPositions: Float32Array;
      let particleSizes: Float32Array;
      let particleOpacities: Float32Array;
      let particleEffectStrengths: Float32Array;
      let raycaster: THREE.Raycaster;
      let mouse: THREE.Vector2;
      let pointer3D: THREE.Vector3;
      let pointerPlane: THREE.Plane;
      let isPointerActive = false;
      let noise3D: (x: number, y: number, z: number) => number;
      let noise4D: (x: number, y: number, z: number, w: number) => number;
      let morphTween: gsap.core.Tween | null = null;
      let isDragging = false;
      let previousMouse = { x: 0, y: 0 };
      let userRotation = { x: 0, y: 0 };
      let targetUserRotation = { x: 0, y: 0 };
      let isMorphing = false;

      const mouseParallax = { cx: 0, cy: 0, tx: 0, ty: 0 };
      const morphState = { progress: 0.0, parallaxStrength: 1.0 };
      let animationFrameId: number;

      // Scroll-driven morph state (replaces GSAP for the stage shapes)
      let isScrollDriven = false;
      let scrollMorphProgress = 0;
      let scrollTargetShapeIndex = -1;
      let lastScrollShapeIndex = -1;
      
      const isDesktop = window.innerWidth >= 1024;
      const shapeOffsetX = isDesktop ? -26.0 : 0.0;
      const shapeOffsetY = isDesktop ? -10.0 : -5.0; // Shift down slightly so it doesn't overlap the top heading

      // 4 procedural shapes matching the stages:
      // 0: Lightbulb (Vision)
      // 1: Compass (Design)
      // 2: Gear (Build Technology)
      // 3: Bar Graph (Evolve)
      const SHAPES = [
        { name: "Lightbulb", generator: generateLightbulb },
        { name: "Compass", generator: generateCompass },
        { name: "Gear", generator: generateGear },
        { name: "Bar Graph", generator: generateBarGraph },
      ];

      const tempVec = new THREE.Vector3();
      const sourceVec = new THREE.Vector3();
      const targetVec = new THREE.Vector3();
      const swarmVec = new THREE.Vector3();
      const noiseOffset = new THREE.Vector3();
      const flowVec = new THREE.Vector3();
      const bezPos = new THREE.Vector3();
      const swirlAxis = new THREE.Vector3();
      const currentVec = new THREE.Vector3();

      function generateCosmicField(count: number) {
        const points = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = Math.cbrt(Math.random());
          // Ellipsoid to ensure no sharp cuboid edges. Increased size for 4K / Ultrawide coverage
          points[i * 3] = r * 155 * Math.sin(phi) * Math.cos(theta);
          points[i * 3 + 1] = r * 100 * Math.sin(phi) * Math.sin(theta);
          points[i * 3 + 2] = r * 68 * Math.cos(phi);
        }
        return points;
      }

      // Large sphere that fills the whole viewport — this is the initial state before scatter
      // radius=42 covers the frustum diagonal at z=55, FOV=70° (half-width 38.5, half-height 22)
      function generateLargeSphere(count: number, radius: number) {
        const points = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          // Uniform distribution on sphere surface using Gaussian method
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          // Slightly vary the radius so it's a shell with some depth
          const r = radius * (0.85 + Math.random() * 0.3);
          points[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          points[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          points[i * 3 + 2] = r * Math.cos(phi);
        }
        return points;
      }

      function generateLightbulb(count: number, size: number) {
        const points = new Float32Array(count * 3);
        const scale = size * 0.28;

        for (let i = 0; i < count; i++) {
          const r = Math.random();
          let x = 0;
          let y = 0;
          const z = (Math.random() - 0.5) * size * 0.12;
          const mirrorX = Math.random() < 0.5 ? 1 : -1;

          if (r < 0.4) {
            // Main Bulb Arc (40%)
            const t = Math.PI / 2 - Math.random() * (Math.PI / 2 + Math.PI / 5);
            x = 1.6 * Math.cos(t);
            y = 1.6 * Math.sin(t) + 1.2;
          } else if (r < 0.52) {
            // Neck (12%)
            const t = Math.random();
            const p0x = 1.6 * Math.cos(-Math.PI / 5);
            const p0y = 1.6 * Math.sin(-Math.PI / 5) + 1.2;
            const p3x = 0.75;
            const p3y = -1.0;
            const p1x = p0x;
            const p1y = 0.0;
            const p2x = p3x;
            const p2y = 0.0;
            const mt = 1 - t;
            x = mt * mt * mt * p0x + 3 * mt * mt * t * p1x + 3 * mt * t * t * p2x + t * t * t * p3x;
            y = mt * mt * mt * p0y + 3 * mt * mt * t * p1y + 3 * mt * t * t * p2y + t * t * t * p3y;
          } else if (r < 0.66) {
            // Base Ridges (14%) - 3 pill-shaped ridges
            const t = Math.random();
            const ridge = Math.floor(Math.random() * 3);
            const ridgeY = -1.0 - ridge * 0.35;

            if (t < 0.75) {
              x = Math.random() * 0.65;
              y = ridgeY;
            } else {
              const angle = -Math.PI / 2 + Math.random() * Math.PI;
              x = 0.65 + 0.1 * Math.cos(angle);
              y = ridgeY + 0.1 * Math.sin(angle);
            }
          } else if (r < 0.72) {
            // Base Bottom (6%)
            const t = Math.PI * 1.5 + Math.random() * (Math.PI / 2);
            x = 0.55 * Math.cos(t);
            y = 0.3 * Math.sin(t) - 1.8;
          } else if (r < 0.86) {
            // Filament (14%)
            const t = Math.random();
            if (t < 0.4) {
              x = 0.25;
              y = -1.0 + Math.random() * 1.5;
            } else if (t < 0.7) {
              const a = Math.random() * Math.PI * 2;
              x = 0.4 + 0.15 * Math.cos(a);
              y = 0.5 + 0.15 * Math.sin(a);
            } else {
              x = Math.random() * 0.3;
              y = 0.65 - x * 0.5;
            }
          } else {
            // Rays (14%)
            const rayIndex = Math.floor(Math.random() * 3);
            const angles = [Math.PI / 2, Math.PI / 4, 0];
            const angle = angles[rayIndex];
            const dist = 2.1 + Math.random() * 0.8;
            x = dist * Math.cos(angle);
            y = dist * Math.sin(angle) + 1.2;
          }

          x *= mirrorX;
          x += (Math.random() - 0.5) * 0.15;
          y += (Math.random() - 0.5) * 0.15;

          points[i * 3] = x * scale;
          points[i * 3 + 1] = y * scale;
          points[i * 3 + 2] = z;
        }
        return points;
      }

      function generateCompass(count: number, size: number) {
        const points = new Float32Array(count * 3);
        const scale = size * 0.28;

        for (let i = 0; i < count; i++) {
          const r = Math.random();
          let x = 0;
          let y = 0;
          const z = (Math.random() - 0.5) * size * 0.12;

          if (r < 0.15) {
            // Top Handle (15%)
            const t = Math.random();
            if (t < 0.33) {
              x = -0.3;
              y = 2.0 + Math.random() * 0.8;
            } else if (t < 0.66) {
              x = 0.3;
              y = 2.0 + Math.random() * 0.8;
            } else {
              x = -0.3 + Math.random() * 0.6;
              y = 2.8;
            }
          } else if (r < 0.35) {
            // Inner & Outer Hinge Circles (20%)
            const t = Math.random() * Math.PI * 2;
            const isOuter = Math.random() > 0.4;
            const rBase = isOuter ? 0.7 : 0.3;
            x = rBase * Math.cos(t);
            y = rBase * Math.sin(t) + 1.3;
          } else if (r < 0.55) {
            // Left Leg (20%)
            const t = Math.random();
            const xStart = -0.5,
              yStart = 0.8;
            const xEnd = -1.5,
              yEnd = -2.0;
            x = xStart + (xEnd - xStart) * t;
            y = yStart + (yEnd - yStart) * t;
            const legWidth = 0.3;
            x += (Math.random() - 0.5) * legWidth;
          } else if (r < 0.75) {
            // Right Leg (20%)
            const t = Math.random();
            const xStart = 0.5,
              yStart = 0.8;
            const xEnd = 1.5,
              yEnd = -2.0;
            x = xStart + (xEnd - xStart) * t;
            y = yStart + (yEnd - yStart) * t;
            const legWidth = 0.3;
            x += (Math.random() - 0.5) * legWidth;
          } else if (r < 0.85) {
            // Horizontal Crossbar (10%)
            x = -1.05 + Math.random() * 2.1;
            y = -0.5;
            y += (Math.random() - 0.5) * 0.03;
          } else if (r < 0.925) {
            // Left Tip (Sharp Needle) (7.5%)
            const t = Math.random();
            if (t < 0.3) {
              const localT = t / 0.3;
              const xStart = -1.5,
                yStart = -2.0;
              const xEnd = -1.56,
                yEnd = -2.3;
              x = xStart + (xEnd - xStart) * localT;
              y = yStart + (yEnd - yStart) * localT;
              const width = 0.25;
              x += (Math.random() - 0.5) * width;
            } else {
              const localT = (t - 0.3) / 0.7;
              const xStart = -1.56,
                yStart = -2.3;
              const xEnd = -1.7,
                yEnd = -3.1;
              x = xStart + (xEnd - xStart) * localT;
              y = yStart + (yEnd - yStart) * localT;
              const maxWidth = 0.06;
              const currentWidth = maxWidth * (1.0 - localT);
              x += (Math.random() - 0.5) * currentWidth;
            }
          } else {
            // Right Tip (Pencil) (7.5%)
            const t = Math.random();
            if (t < 0.4) {
              const localT = t / 0.4;
              const xStart = 1.5,
                yStart = -2.0;
              const xEnd = 1.56,
                yEnd = -2.3;
              x = xStart + (xEnd - xStart) * localT;
              y = yStart + (yEnd - yStart) * localT;
              const width = 0.32;
              x += (Math.random() - 0.5) * width;
            } else {
              const localT = (t - 0.4) / 0.6;
              const xStart = 1.56,
                yStart = -2.3;
              const xEnd = 1.7,
                yEnd = -3.1;
              x = xStart + (xEnd - xStart) * localT;
              y = yStart + (yEnd - yStart) * localT;
              const maxWidth = 0.32;
              const currentWidth = maxWidth * (1.0 - localT);
              x += (Math.random() - 0.5) * currentWidth;
            }
          }

          x += (Math.random() - 0.5) * 0.15;
          y += (Math.random() - 0.5) * 0.15;

          points[i * 3] = x * scale;
          points[i * 3 + 1] = y * scale;
          points[i * 3 + 2] = z;
        }
        return points;
      }

      function generateGear(count: number, size: number) {
        const points = new Float32Array(count * 3);
        const scale = size * 0.55;
        const zThickness = size * 0.3;
        const numTeeth = 8;
        const rInner = 0.45;
        const rOuter = 0.75;
        const rTooth = 1.2;

        const anglePerTooth = (Math.PI * 2) / numTeeth;
        const gapAngle = anglePerTooth * 0.45;
        const topAngle = anglePerTooth * 0.45;
        const slopeAngle = anglePerTooth * 0.05;

        for (let i = 0; i < count; i++) {
          const pType = Math.random();
          let x = 0,
            y = 0,
            z = (Math.random() - 0.5) * zThickness;

          if (pType < 0.25) {
            const a = Math.random() * Math.PI * 2;
            x = rInner * Math.cos(a);
            y = rInner * Math.sin(a);
          } else {
            const toothIndex = Math.floor(Math.random() * numTeeth);
            const startAngle = toothIndex * anglePerTooth;
            const subType = Math.random();

            if (subType < 0.33) {
              const a = startAngle + Math.random() * gapAngle;
              x = rOuter * Math.cos(a);
              y = rOuter * Math.sin(a);
            } else if (subType < 0.66) {
              const a = startAngle + gapAngle + slopeAngle + Math.random() * topAngle;
              x = rTooth * Math.cos(a);
              y = rTooth * Math.sin(a);
            } else {
              const isUp = Math.random() < 0.5;
              const r = rOuter + Math.random() * (rTooth - rOuter);
              const t = (r - rOuter) / (rTooth - rOuter);
              const actualDownA = startAngle + gapAngle + slopeAngle + topAngle + slopeAngle * (1 - t);
              const finalA = isUp ? startAngle + gapAngle + slopeAngle * t : actualDownA;
              x = r * Math.cos(finalA);
              y = r * Math.sin(finalA);
            }
          }

          x += (Math.random() - 0.5) * 0.06;
          y += (Math.random() - 0.5) * 0.06;

          points[i * 3] = x * scale;
          points[i * 3 + 1] = y * scale;
          points[i * 3 + 2] = z;
        }
        return points;
      }

      function generateBarGraph(count: number, size: number) {
        const points = new Float32Array(count * 3);
        const scale = size * 0.45;
        const zThickness = size * 0.15;

        const bars = [
          { centerX: -1.2, width: 0.45, y0: -1.5, y1: -0.6 },
          { centerX: -0.4, width: 0.45, y0: -1.5, y1: 0.0 },
          { centerX: 0.4, width: 0.45, y0: -1.5, y1: 0.7 },
          { centerX: 1.2, width: 0.45, y0: -1.5, y1: 1.5 },
        ];

        for (let i = 0; i < count; i++) {
          const pType = Math.random();
          let x = 0,
            y = 0,
            z = (Math.random() - 0.5) * zThickness;

          if (pType < 0.82) {
            const r = Math.random() * 18.8;
            let bar;
            if (r < 2.7) bar = bars[0];
            else if (r < 6.6) bar = bars[1];
            else if (r < 11.9) bar = bars[2];
            else bar = bars[3];

            const h = bar.y1 - bar.y0;
            const w = bar.width;
            const totalPerimeter = 2 * w + 2 * h;
            const edge = Math.random() * totalPerimeter;

            if (edge < w) {
              x = bar.centerX - w / 2 + Math.random() * w;
              y = bar.y1;
            } else if (edge < 2 * w) {
              x = bar.centerX - w / 2 + Math.random() * w;
              y = bar.y0;
            } else if (edge < 2 * w + h) {
              x = bar.centerX - w / 2;
              y = bar.y0 + Math.random() * h;
            } else {
              x = bar.centerX + w / 2;
              y = bar.y0 + Math.random() * h;
            }
          } else if (pType < 0.96) {
            const t = Math.random();
            const start = { x: -1.3, y: 0.1 };
            const control = { x: 0.4, y: 0.8 };
            const end = { x: 1.6, y: 2.5 };
            const mt = 1 - t;
            x = mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x;
            y = mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y;
          } else {
            const tipX = 1.6,
              tipY = 2.5;
            const headEdge = Math.random();
            if (headEdge < 0.5) {
              const localT = Math.random();
              x = tipX - 0.6 * localT;
              y = tipY;
            } else {
              const localT = Math.random();
              x = tipX;
              y = tipY - 0.6 * localT;
            }
          }

          x += (Math.random() - 0.5) * 0.08;
          y += (Math.random() - 0.5) * 0.08;

          points[i * 3] = x * scale;
          points[i * 3 + 1] = y * scale;
          points[i * 3 + 2] = z;
        }
        return points;
      }

      function createParticleTexture() {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d")!;
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        context.fillStyle = "rgba(255, 255, 255, 1)";
        context.fill();
        return new THREE.CanvasTexture(canvas);
      }

      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;

      clock = new THREE.Clock();
      noise3D = createNoise3D(() => Math.random());
      noise4D = createNoise4D(() => Math.random());
      scene = new THREE.Scene();

      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2(-9999, -9999);
      pointer3D = new THREE.Vector3(-9999, -9999, -9999);
      pointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      // Deep space subtle fog
      scene.fog = new THREE.FogExp2(0x08081a, 0.008);

      camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
      camera.position.set(0, 2, 55);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setClearColor(0x000000, 0); // Transparent to see space starfield

      scene.add(new THREE.AmbientLight(0x505070));
      const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.7);
      dirLight1.position.set(10, 15, 10);
      scene.add(dirLight1);
      const dirLight2 = new THREE.DirectionalLight(0x99bbff, 1.0);
      dirLight2.position.set(-10, -8, -10);
      scene.add(dirLight2);

      targetPositions = SHAPES.map((shape) => shape.generator(CONFIG.particleCount, CONFIG.shapeSize));
      // Fixed cosmic field — the stable "scattered" rest state for scroll-driven morphing
      const dispersedPositions = generateCosmicField(CONFIG.particleCount);
      // Startup visual: large sphere that disperses via the opening animation
      const initialCloud = generateLargeSphere(CONFIG.particleCount, 42);

      const swarmOffsetDirs = new Float32Array(CONFIG.particleCount * 3);
      const swarmRandoms = new Float32Array(CONFIG.particleCount);
      for (let i = 0; i < CONFIG.particleCount; i++) {
        const dir = new THREE.Vector3(
          noise3D(i * 0.04, 10, 10),
          noise3D(20, i * 0.04, 20),
          noise3D(30, 30, i * 0.04)
        ).normalize();
        swarmOffsetDirs[i * 3] = dir.x;
        swarmOffsetDirs[i * 3 + 1] = dir.y;
        swarmOffsetDirs[i * 3 + 2] = dir.z;
        swarmRandoms[i] = 0.5 + Math.random() * 0.5;
      }

      particlesGeometry = new THREE.BufferGeometry();
      currentPositions = new Float32Array(initialCloud);
      sourcePositions = new Float32Array(initialCloud);
      swarmPositions = new Float32Array(CONFIG.particleCount * 3);
      particlesGeometry.setAttribute("position", new THREE.BufferAttribute(currentPositions, 3));

      particleSizes = new Float32Array(CONFIG.particleCount);
      particleOpacities = new Float32Array(CONFIG.particleCount);
      particleEffectStrengths = new Float32Array(CONFIG.particleCount);
      for (let i = 0; i < CONFIG.particleCount; i++) {
        particleSizes[i] = THREE.MathUtils.randFloat(CONFIG.particleSizeRange[0], CONFIG.particleSizeRange[1]);
        particleOpacities[i] = 0.9;
        particleEffectStrengths[i] = 0.0;
      }
      particlesGeometry.setAttribute("size", new THREE.BufferAttribute(particleSizes, 1));
      particlesGeometry.setAttribute("opacity", new THREE.BufferAttribute(particleOpacities, 1));
      particlesGeometry.setAttribute("aEffectStrength", new THREE.BufferAttribute(particleEffectStrengths, 1));

      const colors = new Float32Array(CONFIG.particleCount * 3);
      updateColorArray(colors, currentPositions, CONFIG.colorScheme, true);
      particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      particlesMaterial = new THREE.ShaderMaterial({
        uniforms: { pointTexture: { value: createParticleTexture() } },
        vertexShader: `
          attribute float size;
          attribute float opacity;
          attribute float aEffectStrength;
          varying vec3 vColor;
          varying float vOpacity;
          varying float vEffectStrength;
          void main() {
            vColor = color;
            vOpacity = opacity;
            vEffectStrength = aEffectStrength;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float sizeScale = 1.0 - vEffectStrength * ${CONFIG.morphSizeFactor.toFixed(2)};
            gl_PointSize = size * sizeScale * (600.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }`,
        fragmentShader: `
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          varying float vOpacity;
          varying float vEffectStrength;
          void main() {
            float alpha = texture2D(pointTexture, gl_PointCoord).a;
            if (alpha < 0.5) discard;
            vec3 finalColor = vColor * (1.0 + vEffectStrength * ${CONFIG.morphBrightnessFactor.toFixed(2)});
            gl_FragColor = vec4(finalColor * vOpacity, vOpacity);
          }`,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        vertexColors: true,
      });

      particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particleSystem);

      function updateColorArray(
        colorsArray: Float32Array,
        positionsArray: Float32Array,
        scheme: string,
        isDispersed: boolean = false
      ) {
        const colorScheme = COLOR_SCHEMES[scheme] || COLOR_SCHEMES.devint;
        const centerX = isDispersed ? 0 : shapeOffsetX;
        const center = new THREE.Vector3(centerX, 0, 0);
        const maxRadius = isDispersed ? 38.0 : CONFIG.shapeSize * 1.3;
        for (let i = 0; i < CONFIG.particleCount; i++) {
          const i3 = i * 3;
          tempVec.fromArray(positionsArray, i3);
          const dist = tempVec.distanceTo(center);
          const hue = THREE.MathUtils.mapLinear(dist, 0, maxRadius, colorScheme.startHue, colorScheme.endHue);
          const noiseVal = (noise3D(tempVec.x * 0.15, tempVec.y * 0.15, tempVec.z * 0.15) + 1) * 0.5;
          const saturation = THREE.MathUtils.clamp(colorScheme.saturation * (0.85 + noiseVal * 0.25), 0, 1);
          const lightness = THREE.MathUtils.clamp(colorScheme.lightness * (0.9 + noiseVal * 0.2), 0.1, 0.9);
          new THREE.Color().setHSL(hue / 360, saturation, lightness).toArray(colorsArray, i3);
        }
      }

      // Scroll-driven morph: called every frame from build-process.tsx updateProgress.
      function setScrollMorph(shapeIndex: number, morphProgress: number) {
        // Don't interfere with the opening sphere→scatter GSAP animation
        if (isMorphing) return;

        if (shapeIndex === -2) {
          // Exiting section, fly away
          isScrollDriven = true;
          scrollTargetShapeIndex = -2;
          scrollMorphProgress = morphProgress; // exitProgress
        } else if (shapeIndex < 0 || morphProgress <= 0.001) {
          // Leaving scroll-driven mode: reset source to dispersed for idle animation
          if (isScrollDriven) {
            sourcePositions.set(dispersedPositions);
            isScrollDriven = false;
            scrollMorphProgress = 0;
            scrollTargetShapeIndex = -1;
            currentShapeIndexRef.current = -1;
          }
        } else {
          isScrollDriven = true;
          scrollTargetShapeIndex = shapeIndex;
          scrollMorphProgress = morphProgress;
          currentShapeIndexRef.current = shapeIndex;
        }
      }

      // Opening animation: large sphere → cosmic scattered field (one-shot GSAP tween)
      function disperseParticles() {
        if (isMorphing) return; // prevent double-fire

        if (morphTween) morphTween.kill();
        isMorphing = true;
        isScrollDriven = false;
        currentShapeIndexRef.current = -1;
        sourcePositions.set(currentPositions); // snapshot current (sphere) positions

        for (let i = 0; i < CONFIG.particleCount; i++) {
          const i3 = i * 3;
          sourceVec.fromArray(sourcePositions, i3);
          targetVec.fromArray(dispersedPositions, i3);
          swarmVec.lerpVectors(sourceVec, targetVec, 0.5);
          
          const centerOffsetAmount = CONFIG.shapeSize * CONFIG.swarmDistanceFactor;
          const distFactor = sourceVec.distanceTo(targetVec) * 0.08 + centerOffsetAmount;
          swarmVec.x += swarmOffsetDirs[i3] * distFactor * swarmRandoms[i];
          swarmVec.y += swarmOffsetDirs[i3 + 1] * distFactor * swarmRandoms[i];
          swarmVec.z += swarmOffsetDirs[i3 + 2] * distFactor * swarmRandoms[i];

          swarmPositions[i3] = swarmVec.x;
          swarmPositions[i3 + 1] = swarmVec.y;
          swarmPositions[i3 + 2] = swarmVec.z;
        }

        morphState.progress = 0;
        morphTween = gsap.to(morphState, {
          progress: 1,
          duration: 1.0, // faster than shape morphs — opens quickly
          ease: "power2.out",
          onComplete: () => {
            currentPositions.set(dispersedPositions);
            particlesGeometry.attributes.position.needsUpdate = true;
            particleEffectStrengths.fill(0.0);
            particlesGeometry.attributes.aEffectStrength.needsUpdate = true;
            // Sync sourcePositions so idle animation flows from dispersed state
            sourcePositions.set(dispersedPositions);

            const currentColors = particlesGeometry.attributes.color.array as Float32Array;
            updateColorArray(currentColors, dispersedPositions, CONFIG.colorScheme, true);
            particlesGeometry.attributes.color.needsUpdate = true;

            isMorphing = false;
          },
        });
      }

      setScrollMorphRef.current = setScrollMorph;
      disperseRef.current = disperseParticles;

      function updateMorphAnimation(
        positions: Float32Array,
        effectStrengths: Float32Array,
        elapsedTime: number,
        deltaTime: number
      ) {
        const t = morphState.progress;
        // Targets are actually just dispersedPositions during opening GSAP animation
        const targets = dispersedPositions;
        const effectStrength = Math.sin(t * Math.PI);
        const currentSwirl = effectStrength * CONFIG.swirlFactor * deltaTime * 40;
        const currentNoise = effectStrength * CONFIG.noiseMaxStrength;

        for (let i = 0; i < CONFIG.particleCount; i++) {
          const i3 = i * 3;
          sourceVec.fromArray(sourcePositions, i3);
          swarmVec.fromArray(swarmPositions, i3);
          targetVec.fromArray(targets, i3);

          const t_inv = 1.0 - t;
          const t_inv_sq = t_inv * t_inv;
          const t_sq = t * t;
          bezPos.copy(sourceVec).multiplyScalar(t_inv_sq);
          bezPos.addScaledVector(swarmVec, 2.0 * t_inv * t);
          bezPos.addScaledVector(targetVec, t_sq);

          if (currentSwirl > 0.01) {
            tempVec.subVectors(bezPos, sourceVec);
            swirlAxis
              .set(
                noise3D(i * 0.015, elapsedTime * 0.08, 0),
                noise3D(0, i * 0.015, elapsedTime * 0.08 + 4),
                noise3D(elapsedTime * 0.08 + 8, 0, i * 0.015)
              )
              .normalize();
            tempVec.applyAxisAngle(swirlAxis, currentSwirl * (0.6 + Math.random() * 0.4));
            bezPos.copy(sourceVec).add(tempVec);
          }

          if (currentNoise > 0.01) {
            const noiseTime = elapsedTime * CONFIG.noiseTimeScale;
            noiseOffset.set(
              noise4D(bezPos.x * CONFIG.noiseFrequency, bezPos.y * CONFIG.noiseFrequency, bezPos.z * CONFIG.noiseFrequency, noiseTime),
              noise4D(bezPos.x * CONFIG.noiseFrequency + 100, bezPos.y * CONFIG.noiseFrequency + 100, bezPos.z * CONFIG.noiseFrequency + 100, noiseTime),
              noise4D(bezPos.x * CONFIG.noiseFrequency + 200, bezPos.y * CONFIG.noiseFrequency + 200, bezPos.z * CONFIG.noiseFrequency + 200, noiseTime)
            );
            bezPos.addScaledVector(noiseOffset, currentNoise);
          }

          if (isPointerActive) {
            const dx = bezPos.x - pointer3D.x;
            const dy = bezPos.y - pointer3D.y;
            const dz = bezPos.z - pointer3D.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance > 0 && distance < CONFIG.repelRadius) {
              const force = Math.pow(1 - distance / CONFIG.repelRadius, 2) * CONFIG.pointerRepel;
              bezPos.x += (dx / distance) * force;
              bezPos.y += (dy / distance) * force;
              bezPos.z += (dz / distance) * force;
            }
          }

          positions[i3] = bezPos.x;
          positions[i3 + 1] = bezPos.y;
          positions[i3 + 2] = bezPos.z;
          effectStrengths[i] = effectStrength;
        }
        particlesGeometry.attributes.aEffectStrength.needsUpdate = true;
      }

      function updateIdleAnimation(
        positions: Float32Array,
        effectStrengths: Float32Array,
        elapsedTime: number
      ) {
        const breathScale = 1.0 + Math.sin(elapsedTime * 0.4) * 0.01;
        const timeScaled = elapsedTime * CONFIG.idleFlowSpeed;
        const freq = 0.08;
        let needsEffectStrengthReset = false;

        for (let i = 0; i < CONFIG.particleCount; i++) {
          const i3 = i * 3;
          sourceVec.fromArray(sourcePositions, i3);
          tempVec.copy(sourceVec).multiplyScalar(breathScale);
          flowVec.set(
            noise4D(tempVec.x * freq, tempVec.y * freq, tempVec.z * freq, timeScaled),
            noise4D(tempVec.x * freq + 10, tempVec.y * freq + 10, tempVec.z * freq + 10, timeScaled),
            noise4D(tempVec.x * freq + 20, tempVec.y * freq + 20, tempVec.z * freq + 20, timeScaled)
          );
          tempVec.addScaledVector(flowVec, CONFIG.idleFlowStrength);

          if (isPointerActive) {
            const dx = tempVec.x - pointer3D.x;
            const dy = tempVec.y - pointer3D.y;
            const dz = tempVec.z - pointer3D.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance > 0 && distance < CONFIG.repelRadius) {
              const force = Math.pow(1 - distance / CONFIG.repelRadius, 2) * CONFIG.pointerRepel;
              tempVec.x += (dx / distance) * force;
              tempVec.y += (dy / distance) * force;
              tempVec.z += (dz / distance) * force;
            }
          }

          currentVec.fromArray(positions, i3);
          currentVec.lerp(tempVec, 0.06);
          positions[i3] = currentVec.x;
          positions[i3 + 1] = currentVec.y;
          positions[i3 + 2] = currentVec.z;

          if (effectStrengths[i] !== 0.0) {
            effectStrengths[i] = 0.0;
            needsEffectStrengthReset = true;
          }
        }
        if (needsEffectStrengthReset) {
          particlesGeometry.attributes.aEffectStrength.needsUpdate = true;
        }
      }

      function updateScrollMorphAnimation(
        positions: Float32Array,
        effectStrengths: Float32Array,
        elapsedTime: number
      ) {
        userRotation.x += (targetUserRotation.x - userRotation.x) * 0.1;
        userRotation.y += (targetUserRotation.y - userRotation.y) * 0.1;

        const t = scrollMorphProgress;
        const targets = targetPositions[scrollTargetShapeIndex];
        const effectStrength = Math.sin(t * Math.PI);
        
        const angleY = (elapsedTime * 0.035 + mouseParallax.cx * 0.12) * morphState.parallaxStrength + userRotation.y;
        const angleX = (mouseParallax.cy * 0.08) * morphState.parallaxStrength + userRotation.x;
        const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
        const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
        const centerOffsetAmount = CONFIG.shapeSize * CONFIG.swarmDistanceFactor;

        // 0: Lightbulb, 1: Compass, 2: Gear, 3: Bar Graph
        const shapeOffsetsY = [-10.0, -2.0, -2.0, -6.0];
        const shapeOffsetY = scrollTargetShapeIndex >= 0 && scrollTargetShapeIndex <= 3 
          ? shapeOffsetsY[scrollTargetShapeIndex] 
          : -10.0;

        for (let i = 0; i < CONFIG.particleCount; i++) {
          const i3 = i * 3;
          
          let tx = targets[i3];
          let ty = targets[i3 + 1];
          let tz = targets[i3 + 2];
          let ty2 = ty * cosX - tz * sinX;
          let tz2 = ty * sinX + tz * cosX;
          let tx3 = tx * cosY + tz2 * sinY;
          let tz3 = -tx * sinY + tz2 * cosY;
          targetVec.set(tx3 + shapeOffsetX, ty2 + shapeOffsetY, tz3);

          sourceVec.fromArray(dispersedPositions, i3);

          swarmVec.lerpVectors(sourceVec, targetVec, 0.5);
          const distFactor = sourceVec.distanceTo(targetVec) * 0.08 + centerOffsetAmount;
          swarmVec.x += swarmOffsetDirs[i3] * distFactor * swarmRandoms[i];
          swarmVec.y += swarmOffsetDirs[i3 + 1] * distFactor * swarmRandoms[i];
          swarmVec.z += swarmOffsetDirs[i3 + 2] * distFactor * swarmRandoms[i];

          const t_inv = 1.0 - t;
          const t_inv_sq = t_inv * t_inv;
          const t_sq = t * t;
          bezPos.copy(sourceVec).multiplyScalar(t_inv_sq);
          bezPos.addScaledVector(swarmVec, 2.0 * t_inv * t);
          bezPos.addScaledVector(targetVec, t_sq);

          if (isPointerActive) {
            const dx = bezPos.x - pointer3D.x;
            const dy = bezPos.y - pointer3D.y;
            const dz = bezPos.z - pointer3D.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance > 0 && distance < CONFIG.repelRadius) {
              const force = Math.pow(1 - distance / CONFIG.repelRadius, 2) * CONFIG.pointerRepel;
              bezPos.x += (dx / distance) * force;
              bezPos.y += (dy / distance) * force;
              bezPos.z += (dz / distance) * force;
            }
          }

          currentVec.fromArray(positions, i3);
          currentVec.lerp(bezPos, 0.14);
          positions[i3] = currentVec.x;
          positions[i3 + 1] = currentVec.y;
          positions[i3 + 2] = currentVec.z;
          effectStrengths[i] = effectStrength;
        }
        particlesGeometry.attributes.aEffectStrength.needsUpdate = true;
      }

      function animate() {
        animationFrameId = requestAnimationFrame(animate);
        if (!isActiveRef.current) return;

        const elapsedTime = clock.getElapsedTime();
        const deltaTime = clock.getDelta();

        const targetParallaxStrength = (isScrollDriven && scrollTargetShapeIndex >= 0) ? 0.0 : 1.0;
        morphState.parallaxStrength += (targetParallaxStrength - morphState.parallaxStrength) * 0.05;
        const currentParallaxStrength = morphState.parallaxStrength;

        // Parallax smooth interpolation
        mouseParallax.cx += (mouseParallax.tx - mouseParallax.cx) * 0.05;
        mouseParallax.cy += (mouseParallax.ty - mouseParallax.cy) * 0.05;

        // Dynamic 3D camera parallax — scale offset to camera depth
        camera.position.x = mouseParallax.cx * 5.0 * currentParallaxStrength;
        camera.position.y = 2 - mouseParallax.cy * 3.5 * currentParallaxStrength;
        camera.lookAt(0, 0, 0);

        if (isPointerActive) {
          raycaster.setFromCamera(mouse, camera);
          pointerPlane.normal.copy(camera.position).normalize();
          raycaster.ray.intersectPlane(pointerPlane, pointer3D);
        } else {
          pointer3D.set(-9999, -9999, -9999);
        }

        const positions = particlesGeometry.attributes.position.array as Float32Array;
        const effectStrengths = particlesGeometry.attributes.aEffectStrength.array as Float32Array;

        if (isMorphing) {
          // Opening sphere→scatter GSAP animation
          updateMorphAnimation(positions, effectStrengths, elapsedTime, deltaTime);
        } else if (isScrollDriven && scrollTargetShapeIndex === -2) {
          // Stray further away and fade out to reveal deep dark space
          const scale = 1.0 + scrollMorphProgress * 2.5;
          const exitAlpha = Math.max(0, 1.0 - scrollMorphProgress);
          
          for (let i = 0; i < CONFIG.particleCount; i++) {
            const i3 = i * 3;
            sourceVec.fromArray(dispersedPositions, i3);
            positions[i3] = sourceVec.x * scale;
            positions[i3 + 1] = sourceVec.y * scale;
            positions[i3 + 2] = sourceVec.z * scale;
            particleOpacities[i] = exitAlpha;
          }
          particlesGeometry.attributes.opacity.needsUpdate = true;
        } else if (isScrollDriven && scrollTargetShapeIndex >= 0) {
          // Reset opacity if not exiting
          if (particleOpacities[0] < 0.99) {
            particleOpacities.fill(1.0);
            particlesGeometry.attributes.opacity.needsUpdate = true;
          }
          // Scroll-position-driven shape morphing
          updateScrollMorphAnimation(positions, effectStrengths, elapsedTime);
        } else {
          // Reset opacity if not exiting
          if (particleOpacities[0] < 0.99) {
            particleOpacities.fill(1.0);
            particlesGeometry.attributes.opacity.needsUpdate = true;
          }
          // Default: particles drift gently in the cosmic field
          updateIdleAnimation(positions, effectStrengths, elapsedTime);
        }

        particlesGeometry.attributes.position.needsUpdate = true;
        if (isMorphing || particlesGeometry.attributes.aEffectStrength.needsUpdate) {
          particlesGeometry.attributes.aEffectStrength.needsUpdate = true;
        }

        renderer.render(scene, camera);
      }

      animate();

      const handleResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      const handlePointerDown = (event: PointerEvent) => {
        isDragging = true;
        previousMouse.x = event.clientX;
        previousMouse.y = event.clientY;
      };

      const handlePointerMove = (event: PointerEvent) => {
        const cx = (event.clientX / window.innerWidth) * 2 - 1;
        const cy = -(event.clientY / window.innerHeight) * 2 + 1;
        mouseParallax.tx = cx;
        mouseParallax.ty = cy;

        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          isPointerActive = true;
        }

        if (isDragging) {
          const deltaX = event.clientX - previousMouse.x;
          const deltaY = event.clientY - previousMouse.y;
          targetUserRotation.y += deltaX * 0.008;
          targetUserRotation.x += deltaY * 0.008;
          previousMouse.x = event.clientX;
          previousMouse.y = event.clientY;
        }
      };

      const handlePointerUp = () => {
        isDragging = false;
      };

      const handlePointerLeave = () => {
        mouseParallax.tx = 0;
        mouseParallax.ty = 0;
        isPointerActive = false;
        mouse.set(-9999, -9999);
        pointer3D.set(-9999, -9999, -9999);
        isDragging = false;
      };

      window.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("mouseleave", handlePointerLeave);

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
      window.addEventListener("resize", handleResize);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("mouseleave", handlePointerLeave);
        cancelAnimationFrame(animationFrameId);
        if (morphTween) morphTween.kill();
        renderer.dispose();
        particlesGeometry.dispose();
        particlesMaterial.dispose();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden bg-transparent pointer-events-auto ${className}`}
      >
        <canvas ref={canvasRef} className="block w-full h-full outline-none" />
      </div>
    );
  }
);

ParticleMorph.displayName = "ParticleMorph";
export default ParticleMorph;
