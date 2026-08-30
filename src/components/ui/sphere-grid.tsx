"use client";

import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

export interface SphereGridRef {
  updateScroll: (pTotal: number) => void;
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

    useImperativeHandle(ref, () => ({
      updateScroll(pTotal: number) {
        if (lastPTotalRef.current === null) {
          lastPTotalRef.current = pTotal;
          return;
        }
        const delta = pTotal - lastPTotalRef.current;
        lastPTotalRef.current = pTotal;
        // Negate delta: scrolling down (positive delta) should push grid upward (negative Y)
        scrollVelocityRef.current -= delta * 2500;
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
      });
    }

    const render = () => {
      if (!isActive) {
        animationFrameId = null;
        return;
      }

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

      // Parallax smooth interpolation
      parallaxRef.current.cx += (parallaxRef.current.tx - parallaxRef.current.cx) * 0.06;
      parallaxRef.current.cy += (parallaxRef.current.ty - parallaxRef.current.cy) * 0.06;
      const pOffsetX = parallaxRef.current.cx * (parallaxStrength * 0.5);
      const pOffsetY = parallaxRef.current.cy * (parallaxStrength * 0.5);
      const eyeX = parallaxRef.current.cx * (parallaxStrength * 0.7);
      const eyeY = parallaxRef.current.cy * (parallaxStrength * 0.7);

      // Solid background fill
      ctx.fillStyle = backgroundColor;
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

      // Momentum-based scroll — integrate velocity with friction (mirrors Starfield behaviour)
      const friction = 0.88;
      scrollVelocityRef.current *= friction;
      // Also drain any legacy target offset
      currentScrollRef.current.x += (targetScrollRef.current.x - currentScrollRef.current.x) * 0.06;
      currentScrollRef.current.y += scrollVelocityRef.current;

      const scrollX = currentScrollRef.current.x;
      const scrollY = currentScrollRef.current.y;
      const rawOffsetX = scrollX / cellSize;
      const logicalOffsetX = Math.floor(rawOffsetX);
      const pixelOffsetX = (rawOffsetX - logicalOffsetX) * cellSize;

      const rawOffsetY = scrollY / cellSize;
      const logicalOffsetY = Math.floor(rawOffsetY);
      const pixelOffsetY = (rawOffsetY - logicalOffsetY) * cellSize;

      let cellCount = 0;
      const cellPool = cellPoolRef.current;
      const startX = (logicalWidth - gridCols * cellSize) / 2;
      const startY = (logicalHeight - gridRows * cellSize) / 2;
      const maxCamDistSq = Math.pow(D * 2.5, 2);

      for (let row = -margin; row < gridRows + margin; row++) {
        for (let col = -margin; col < gridCols + margin; col++) {
          const lCol = col - logicalOffsetX;
          const lRow = row - logicalOffsetY;

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
          state.elevation += (targetElevation - state.elevation) * elevationSmoothing;
          state.lastSeen = frameCount;
          const elev = state.elevation;

          // Corner coordinates
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
        if (c.elev > 0.01) {
          // Horizontal visible side wall:
          // In bottom-right / top-right (dx >= 0), viewer sees the RIGHT wall
          // In bottom-left / top-left (dx < 0), viewer sees the LEFT wall
          if (c.dx >= 0) {
            drawQuad(ctx, c.bTRx, c.bTRy, c.bBRx, c.bBRy, c.tBRx, c.tBRy, c.tTRx, c.tTRy, cRightWall);
          } else {
            drawQuad(ctx, c.bTLx, c.bTLy, c.bBLx, c.bBLy, c.tBLx, c.tBLy, c.tTLx, c.tTLy, cLeftWall);
          }

          // Vertical visible side wall:
          // In bottom-right / bottom-left (dy >= 0), viewer sees the BOTTOM wall
          // In top-right / top-left (dy < 0), viewer sees the TOP wall
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

    if (isActive) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, [gridCols, gridRows, maxElevation, elevationSmoothing, gapRatio, bgRGB, parallaxStrength, isActive, backgroundColor]);

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
