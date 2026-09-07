"use client";

import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

export interface SphereGridRef {
  updateScroll: (pTotal: number) => void;
  updateDissolve: (progress: number) => void;
}

export interface SphereGridProps {
  /** Number of columns in the grid */
  gridCols?: number;
  /** Number of rows in the grid */
  gridRows?: number;
  /** Maximum elevation for the 3D effect */
  maxElevation?: number;
  /** How smoothly the pixels return to rest (0-1) */
  elevationSmoothing?: number;
  /** Background color of the canvas */
  backgroundColor?: string;
  /** Gap between cells (0-1, fraction of cell size) */
  gapRatio?: number;
  /** Intensity of the parallax effect */
  parallaxStrength?: number;
  /** Whether the animation loop is active */
  isActive?: boolean;
  /** Whether animation and parallax are frozen */
  isFrozen?: boolean;
  /** Additional class name */
  className?: string;
}

// Deterministic pseudo-random
const seededRandom = (x: number, y: number) => {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
};

// Color helpers
const darken = (rgb: { r: number; g: number; b: number }, amount: number) =>
  `rgb(${Math.max(0, rgb.r - amount)}, ${Math.max(0, rgb.g - amount)}, ${Math.max(0, rgb.b - amount)})`;

const brighten = (rgb: { r: number; g: number; b: number }, amount: number) =>
  `rgb(${Math.min(255, rgb.r + amount)}, ${Math.min(255, rgb.g + amount)}, ${Math.min(255, rgb.b + amount)})`;

interface CellData {
  camDistSq: number;
  dx: number;
  dy: number;
  elev: number;
  bTLx: number; bTLy: number;
  bTRx: number; bTRy: number;
  bBLx: number; bBLy: number;
  bBRx: number; bBRy: number;
  tTLx: number; tTLy: number;
  tTRx: number; tTRy: number;
  tBLx: number; tBLy: number;
  tBRx: number; tBRy: number;
  fTLx: number; fTLy: number;
  fTRx: number; fTRy: number;
  fBLx: number; fBLy: number;
  fBRx: number; fBRy: number;
}

export const SphereGrid = forwardRef<SphereGridRef, SphereGridProps>(
  (
    {
      gridCols = 35,
      gridRows = 23,
      maxElevation = 70,
      elevationSmoothing = 0.10,
      backgroundColor = "#f4f4f5",
      gapRatio = 0.04,
      parallaxStrength = 75,
      isActive = true,
      isFrozen = false,
      className = "",
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const mousePosRef = useRef({ x: -1000, y: -1000, active: false });
    const targetScrollRef = useRef({ x: 0, y: 0 });
    const currentScrollRef = useRef({ x: 0, y: 0 });
    const parallaxRef = useRef({ cx: 0, cy: 0, tx: 0, ty: 0 });

    // Map for cell elevation smoothing
    const cellStateRef = useRef(new Map<string, { elevation: number; lastSeen: number }>());

    // Pre-allocated cell pool to avoid any GC allocations in render loop
    const cellPoolRef = useRef<CellData[]>([]);

    const lastPTotalRef = useRef<number | null>(null);
    const scrollVelocityRef = useRef(0);
    const dissolveProgressRef = useRef(0);
    const dissolveStartRowRef = useRef<number | null>(null);
    const lastRenderTimeRef = useRef(0);

    // Track isActive and isFrozen via refs so the RAF loop can check them without recreating canvas
    const isActiveRef = useRef(isActive);
    useEffect(() => {
      isActiveRef.current = isActive;
    }, [isActive]);

    const isFrozenRef = useRef(isFrozen);
    useEffect(() => {
      isFrozenRef.current = isFrozen;
    }, [isFrozen]);

    useImperativeHandle(ref, () => ({
      updateScroll(pTotal: number) {
        if (lastPTotalRef.current === null) {
          lastPTotalRef.current = pTotal;
          return;
        }
        const delta = pTotal - lastPTotalRef.current;
        lastPTotalRef.current = pTotal;
        // Faster scroll during erosion so remaining cubes cleanly exit off the top
        const multiplier = pTotal >= 0.938 ? 5600 : 2500;
        scrollVelocityRef.current -= delta * multiplier;
      },
      updateDissolve(progress: number) {
        dissolveProgressRef.current = progress;
        if (progress <= 0) {
          dissolveStartRowRef.current = null;
        }
      },
    }));

  const bgRGB = React.useMemo(() => {
    const hex = backgroundColor.replace("#", "");
    return {
      r: parseInt(hex.slice(0, 2), 16) || 244,
      g: parseInt(hex.slice(2, 4), 16) || 244,
      b: parseInt(hex.slice(4, 6), 16) || 245,
    };
  }, [backgroundColor]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    targetScrollRef.current.x -= e.deltaX * 1.1;
    targetScrollRef.current.y -= e.deltaY * 1.1;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animationFrameId: number | null = null;
    let frameCount = 0;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(rect.width || window.innerWidth);
      const h = Math.floor(rect.height || window.innerHeight);
      if (w > 0 && h > 0) {
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
        }
      }
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const handlePointerMove = (e: PointerEvent) => {
      if (isFrozenRef.current) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
      parallaxRef.current.tx = (mousePosRef.current.x - rect.width / 2) / (rect.width / 2);
      parallaxRef.current.ty = (mousePosRef.current.y - rect.height / 2) / (rect.height / 2);
    };

    const handlePointerLeave = () => {
      mousePosRef.current.active = false;
      parallaxRef.current.tx = 0;
      parallaxRef.current.ty = 0;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);

    // Natural solid directional lighting colors for inner sphere cube walls (lightened for soft aesthetic)
    const cBottomWall = darken(bgRGB, 20);
    const cTopWall = darken(bgRGB, 8);
    const cRightWall = darken(bgRGB, 14);
    const cLeftWall = darken(bgRGB, 14);
    const cFace = brighten(bgRGB, 2);

    const drawQuad = (
      ctx: CanvasRenderingContext2D,
      x1: number, y1: number,
      x2: number, y2: number,
      x3: number, y3: number,
      x4: number, y4: number,
      color: string
    ) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5; // Seamless edge fill without hollow seams
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.lineTo(x4, y4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // Pre-populate cell pool
    const margin = 2;
    const totalMaxCells = (gridRows + margin * 2) * (gridCols + margin * 2);
    while (cellPoolRef.current.length < totalMaxCells) {
      cellPoolRef.current.push({
        camDistSq: 0, dx: 0, dy: 0, elev: 0,
        bTLx: 0, bTLy: 0, bTRx: 0, bTRy: 0,
        bBLx: 0, bBLy: 0, bBRx: 0, bBRy: 0,
        tTLx: 0, tTLy: 0, tTRx: 0, tTRy: 0,
        tBLx: 0, tBLy: 0, tBRx: 0, tBRy: 0,
        fTLx: 0, fTLy: 0, fTRx: 0, fTRy: 0,
        fBLx: 0, fBLy: 0, fBRx: 0, fBRy: 0,
      });
    }

    const render = (now: DOMHighResTimeStamp) => {
      if (!isActiveRef.current || isFrozenRef.current) {
        // Keep loop alive so it resumes instantly when activated or unfrozen
        lastRenderTimeRef.current = 0;
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const dt = lastRenderTimeRef.current === 0 ? 16.666 : now - lastRenderTimeRef.current;
      lastRenderTimeRef.current = now;
      const timeScale = dt / 16.666;

      frameCount++;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      if (canvas.width === 0 || canvas.height === 0) {
        resizeCanvas();
        if (canvas.width === 0 || canvas.height === 0) {
          animationFrameId = requestAnimationFrame(render);
          return;
        }
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width;
      const height = canvas.height;
      const logicalWidth = width / dpr;
      const logicalHeight = height / dpr;

      const cx = logicalWidth / 2;
      const cy = logicalHeight / 2;

      // Parallax smooth interpolation (frame-rate independent)
      const pK = 1 - Math.pow(1 - 0.06, timeScale);
      parallaxRef.current.cx += (parallaxRef.current.tx - parallaxRef.current.cx) * pK;
      parallaxRef.current.cy += (parallaxRef.current.ty - parallaxRef.current.cy) * pK;
      const pOffsetX = parallaxRef.current.cx * (parallaxStrength * 0.5);
      const pOffsetY = parallaxRef.current.cy * (parallaxStrength * 0.5);
      const eyeX = parallaxRef.current.cx * (parallaxStrength * 0.7);
      const eyeY = parallaxRef.current.cy * (parallaxStrength * 0.7);

      const dp = dissolveProgressRef.current;

      // Canvas background fill:
      // When normal (dp === 0), solid #f4f4f5.
      // When dissolving (dp > 0), smooth Starfield radial vignette with zero grid lines.
      if (dp > 0) {
        const bgGrad = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) * 0.75
        );
        bgGrad.addColorStop(0, "rgb(8, 8, 26)");
        bgGrad.addColorStop(1, "rgb(4, 4, 13)");
        ctx.fillStyle = bgGrad;
      } else {
        ctx.fillStyle = backgroundColor;
      }
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(-pOffsetX, -pOffsetY);

      const cellSize = Math.max(logicalWidth / gridCols, logicalHeight / gridRows);
      const gap = cellSize * gapRatio;
      
      // Calibrated mouseover radius for a subtle, refined hover interaction
      const hoverRadius = cellSize * 2.3;

      const D = Math.max(logicalWidth, logicalHeight) * 1.1;
      const C = -0.0007;
      const extMult = 2.8;

      // Gentle global time for subtle background breathing
      const time = performance.now() * 0.0018;

      // Momentum-based scroll — integrate velocity with friction (frame-rate independent)
      const friction = Math.pow(0.88, timeScale);
      scrollVelocityRef.current *= friction;
      // Also drain any legacy target offset
      const sK = 1 - Math.pow(1 - 0.06, timeScale);
      currentScrollRef.current.x += (targetScrollRef.current.x - currentScrollRef.current.x) * sK;
      currentScrollRef.current.y += scrollVelocityRef.current * timeScale;

      const scrollX = currentScrollRef.current.x;
      const scrollY = currentScrollRef.current.y;
      const rawOffsetX = scrollX / cellSize;
      const logicalOffsetX = Math.floor(rawOffsetX);
      const pixelOffsetX = (rawOffsetX - logicalOffsetX) * cellSize;

      const rawOffsetY = scrollY / cellSize;
      const logicalOffsetY = Math.floor(rawOffsetY);
      const pixelOffsetY = (rawOffsetY - logicalOffsetY) * cellSize;

      // Anchor the bottom visible row where missing cubes will begin entering
      if (dp > 0 && dissolveStartRowRef.current === null) {
        // gridRows - 1 is the bottom-most visible row currently on screen
        dissolveStartRowRef.current = (gridRows - 1) - logicalOffsetY;
      }

      const EROSION_ROWS = 28; // Doubled scroll transition distance
      const startMissingRow = dissolveStartRowRef.current;

      let cellCount = 0;
      const cellPool = cellPoolRef.current;
      const startX = (logicalWidth - gridCols * cellSize) / 2;
      const startY = (logicalHeight - gridRows * cellSize) / 2;
      const maxCamDistSq = Math.pow(D * 2.5, 2);

      for (let row = -margin; row < gridRows + margin; row++) {
        for (let col = -margin; col < gridCols + margin; col++) {
          const lCol = col - logicalOffsetX;
          const lRow = row - logicalOffsetY;

          // Missing cubes logic:
          // Cubes do not disappear on-screen. Instead, new rows scrolling in from below the viewport
          // have an increasing chance of missing cubes, until all cubes run out and the grid vanishes.
          let isMissing = false;
          if (dp >= 1.0) {
            isMissing = true;
          } else if (dp > 0 && startMissingRow !== null) {
            const dRow = lRow - startMissingRow;
            if (dRow > 0) {
              if (dRow >= EROSION_ROWS) {
                isMissing = true;
              } else {
                // Starts immediately with ~8% missing in the very first incoming row so erosion is visible right as the sentence disappears
                const baseChance = 0.08;
                const missingChance = baseChance + (1 - baseChance) * Math.pow(dRow / EROSION_ROWS, 1.4);
                isMissing = seededRandom(lCol + 555, lRow + 666) < missingChance;
              }
            }
          }

          // If a cube is missing, skip drawing it entirely so the smooth Starfield background shines through
          if (isMissing) {
            continue;
          }

          const x = startX + col * cellSize + pixelOffsetX;
          const y = startY + row * cellSize + pixelOffsetY;
          const cellCx = x + cellSize / 2;
          const cellCy = y + cellSize / 2;

          const dx = cellCx - cx;
          const dy = cellCy - cy;
          const centerBZ = D + C * (dx * dx + dy * dy);
          const camDistSq = dx * dx + dy * dy + centerBZ * centerBZ;

          if (camDistSq > maxCamDistSq) continue;

          // Subtle organic background breathing
          const phase = seededRandom(lCol, lRow) * 6.283185;
          const speed = 0.28 + seededRandom(lCol + 1, lRow + 1) * 0.28;
          const wave = Math.sin(time * speed + phase);
          const aliveMotion = Math.pow(Math.max(0, wave), 4) * 0.14; // Subtle resting motion

          // Refined, gentle mouse hover
          let hoverMotion = 0;
          if (mousePosRef.current.active) {
            const screenCellCx = cellCx - pOffsetX;
            const screenCellCy = cellCy - pOffsetY;
            const distToMouse = Math.hypot(screenCellCx - mousePosRef.current.x, screenCellCy - mousePosRef.current.y);
            if (distToMouse < hoverRadius) {
              hoverMotion = Math.pow(1 - distToMouse / hoverRadius, 1.5);
            }
          }

          // Subtle background + refined hover response
          const totalMotion = Math.min(1, hoverMotion * 0.95 + aliveMotion);
          const targetElevation = totalMotion * maxElevation;

          const key = `${lCol}_${lRow}`;
          let state = cellStateRef.current.get(key);
          if (!state) {
            state = { elevation: targetElevation * 0.3, lastSeen: frameCount };
            cellStateRef.current.set(key, state);
          }
          const eK = 1 - Math.pow(1 - elevationSmoothing, timeScale);
          state.elevation += (targetElevation - state.elevation) * eK;
          state.lastSeen = frameCount;
          const elev = state.elevation;

          // Corner coordinates for intact 3D cube
          const x1 = x + gap / 2;
          const x2 = x + cellSize - gap / 2;
          const y1 = y + gap / 2;
          const y2 = y + cellSize - gap / 2;

          const lx1 = x1 - (cx + eyeX); const ly1 = y1 - (cy + eyeY);
          const lx2 = x2 - (cx + eyeX); const ly2 = y2 - (cy + eyeY);

          // Depth projection
          const bZ1 = D + C * (lx1 * lx1 + ly1 * ly1);
          const bZ2 = D + C * (lx2 * lx2 + ly1 * ly1);
          const bZ3 = D + C * (lx1 * lx1 + ly2 * ly2);
          const bZ4 = D + C * (lx2 * lx2 + ly2 * ly2);

          // Base floor coordinates (gap = 0 so adjacent intact cubes seamlessly join #f4f4f5 floor)
          const fx1 = x;
          const fx2 = x + cellSize;
          const fy1 = y;
          const fy2 = y + cellSize;

          const flx1 = fx1 - (cx + eyeX); const fly1 = fy1 - (cy + eyeY);
          const flx2 = fx2 - (cx + eyeX); const fly2 = fy2 - (cy + eyeY);

          const fbZ1 = D + C * (flx1 * flx1 + fly1 * fly1);
          const fbZ2 = D + C * (flx2 * flx2 + fly1 * fly1);
          const fbZ3 = D + C * (flx1 * flx1 + fly2 * fly2);
          const fbZ4 = D + C * (flx2 * flx2 + fly2 * fly2);

          // Normals & 3D Extrusion
          const nx1 = 2 * C * lx1; const ny1 = 2 * C * ly1; const len1 = Math.sqrt(nx1 * nx1 + ny1 * ny1 + 1);
          const nx2 = 2 * C * lx2; const ny2 = 2 * C * ly1; const len2 = Math.sqrt(nx2 * nx2 + ny2 * ny2 + 1);
          const nx3 = 2 * C * lx1; const ny3 = 2 * C * ly2; const len3 = Math.sqrt(nx3 * nx3 + ny3 * ny3 + 1);
          const nx4 = 2 * C * lx2; const ny4 = 2 * C * ly2; const len4 = Math.sqrt(nx4 * nx4 + ny4 * ny4 + 1);

          const tX1 = lx1 + (elev * extMult * nx1 / len1);
          const tY1 = ly1 + (elev * extMult * ny1 / len1);
          const tZ1 = bZ1 - (elev * extMult / len1);

          const tX2 = lx2 + (elev * extMult * nx2 / len2);
          const tY2 = ly1 + (elev * extMult * ny2 / len2);
          const tZ2 = bZ2 - (elev * extMult / len2);

          const tX3 = lx1 + (elev * extMult * nx3 / len3);
          const tY3 = ly2 + (elev * extMult * ny3 / len3);
          const tZ3 = bZ3 - (elev * extMult / len3);

          const tX4 = lx2 + (elev * extMult * nx4 / len4);
          const tY4 = ly2 + (elev * extMult * ny4 / len4);
          const tZ4 = bZ4 - (elev * extMult / len4);

          const item = cellPool[cellCount];
          item.camDistSq = camDistSq;
          item.dx = dx;
          item.dy = dy;
          item.elev = elev;

          // Screen coords
          item.bTLx = cx + eyeX + (lx1 / bZ1) * D; item.bTLy = cy + eyeY + (ly1 / bZ1) * D;
          item.bTRx = cx + eyeX + (lx2 / bZ2) * D; item.bTRy = cy + eyeY + (ly1 / bZ2) * D;
          item.bBLx = cx + eyeX + (lx1 / bZ3) * D; item.bBLy = cy + eyeY + (ly2 / bZ3) * D;
          item.bBRx = cx + eyeX + (lx2 / bZ4) * D; item.bBRy = cy + eyeY + (ly2 / bZ4) * D;

          item.fTLx = cx + eyeX + (flx1 / fbZ1) * D; item.fTLy = cy + eyeY + (fly1 / fbZ1) * D;
          item.fTRx = cx + eyeX + (flx2 / fbZ2) * D; item.fTRy = cy + eyeY + (fly1 / fbZ2) * D;
          item.fBLx = cx + eyeX + (flx1 / fbZ3) * D; item.fBLy = cy + eyeY + (fly2 / fbZ3) * D;
          item.fBRx = cx + eyeX + (flx2 / fbZ4) * D; item.fBRy = cy + eyeY + (fly2 / fbZ4) * D;

          item.tTLx = cx + eyeX + (tX1 / tZ1) * D; item.tTLy = cy + eyeY + (tY1 / tZ1) * D;
          item.tTRx = cx + eyeX + (tX2 / tZ2) * D; item.tTRy = cy + eyeY + (tY2 / tZ2) * D;
          item.tBLx = cx + eyeX + (tX3 / tZ3) * D; item.tBLy = cy + eyeY + (tY3 / tZ3) * D;
          item.tBRx = cx + eyeX + (tX4 / tZ4) * D; item.tBRy = cy + eyeY + (tY4 / tZ4) * D;

          cellCount++;
        }
      }

      // Cleanup inactive keys periodically
      if (frameCount % 180 === 0) {
        for (const [key, val] of cellStateRef.current.entries()) {
          if (val.lastSeen < frameCount - 90) {
            cellStateRef.current.delete(key);
          }
        }
      }

      // Sort visible slice by depth
      const activeSlice = cellPool.slice(0, cellCount);
      activeSlice.sort((a, b) => b.camDistSq - a.camDistSq);

      // Render solid 3D cubes with physically accurate inner-sphere perspective
      for (let i = 0; i < cellCount; i++) {
        const c = activeSlice[i];
        
        if (dp > 0) {
          // Draw seamless #f4f4f5 floor under intact cube so gap between intact cubes stays light
          drawQuad(ctx, c.fTLx, c.fTLy, c.fTRx, c.fTRy, c.fBRx, c.fBRy, c.fBLx, c.fBLy, backgroundColor);
        }

        if (c.elev > 0.01) {
          // Horizontal visible side wall:
          if (c.dx >= 0) {
            drawQuad(ctx, c.bTRx, c.bTRy, c.bBRx, c.bBRy, c.tBRx, c.tBRy, c.tTRx, c.tTRy, cRightWall);
          } else {
            drawQuad(ctx, c.bTLx, c.bTLy, c.bBLx, c.bBLy, c.tBLx, c.tBLy, c.tTLx, c.tTLy, cLeftWall);
          }

          // Vertical visible side wall:
          if (c.dy >= 0) {
            drawQuad(ctx, c.bBLx, c.bBLy, c.bBRx, c.bBRy, c.tBRx, c.tBRy, c.tBLx, c.tBLy, cBottomWall);
          } else {
            drawQuad(ctx, c.bTLx, c.bTLy, c.bTRx, c.bTRy, c.tTRx, c.tTRy, c.tTLx, c.tTLy, cTopWall);
          }
        }

        // Top Face without artificial borders - cleanly caps the solid cube
        drawQuad(ctx, c.tTLx, c.tTLy, c.tTRx, c.tTRy, c.tBRx, c.tBRy, c.tBLx, c.tBLy, cFace);
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    // Always start loop — render() will idle when isActiveRef.current is false
    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [gridCols, gridRows, maxElevation, elevationSmoothing, gapRatio, bgRGB, parallaxStrength, backgroundColor]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden cursor-crosshair ${className}`}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ touchAction: "none" }}
      />
    </div>
  );
});

SphereGrid.displayName = "SphereGrid";

export default SphereGrid;
