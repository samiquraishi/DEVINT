"use client"

import type React from "react"
import { useRef, useEffect, useCallback } from "react"

export interface Position {
  x: number
  y: number
}

export interface Point {
  position: Position
  time: number
  drift: Position
  age: number
  direction: Position
}

export interface SVGFollowerProps {
  width?: number | string
  height?: number | string
  colors?: string[]
  removeDelay?: number
  shapeFrequency?: number
  shapeMode?: "squares-triangles" | "obtuse" | "mixed"
  maxTurnAngle?: number
  trailWidth?: number
  autoPlay?: boolean
  className?: string;
  onMouseMove?: (e: React.MouseEvent) => void;
}

export function SVGFollower({
  width = "100%",
  height = "100%",
  colors = ["#ff6b6b", "#fff200", "#45b7d1", "#96ceb4", "#ffeaa7"],
  removeDelay = 400,
  shapeFrequency = 0.025,
  shapeMode = "squares-triangles",
  maxTurnAngle = 35,
  trailWidth = 1.0,
  autoPlay = false,
  className = "",
  onMouseMove,
}: SVGFollowerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const followersRef = useRef<Follower[]>([])
  const animationRef = useRef<number>(undefined)

  class Follower {
    private points: Point[] = []
    private line: SVGPathElement
    private color: string
    private stage: SVGSVGElement
    private freq: number
    private mode: "squares-triangles" | "obtuse" | "mixed"
    private maxTurnAngle: number
    private trailWidth: number

    constructor(
      stage: SVGSVGElement,
      color: string,
      freq: number,
      mode: "squares-triangles" | "obtuse" | "mixed",
      maxTurnAngle = 35,
      trailWidth = 1.0
    ) {
      this.stage = stage
      this.color = color
      this.freq = freq
      this.mode = mode
      this.maxTurnAngle = maxTurnAngle
      this.trailWidth = trailWidth
      this.line = document.createElementNS("http://www.w3.org/2000/svg", "path")
      this.line.style.fill = color
      this.line.style.stroke = color
      this.line.style.strokeWidth = Math.max(0.15, 0.35 * this.trailWidth).toFixed(2)
      this.line.style.strokeLinejoin = "round"
      this.line.style.strokeLinecap = "round"
      this.stage.appendChild(this.line)
    }

    private getDrift(): number {
      return (Math.random() - 0.5) * 0.5
    }

    public add(position: Position) {
      const prev = this.points[0]
      let dx = prev ? position.x - prev.position.x : 0
      let dy = prev ? position.y - prev.position.y : 0
      const dist = Math.hypot(dx, dy)

      if (prev && dist < 5) return

      const gap = 18
      const gapX = dist > 0 ? (dx / dist) * gap : 12
      const gapY = dist > 0 ? (dy / dist) * gap : 12
      const targetX = position.x - gapX
      const targetY = position.y - gapY

      let finalX = targetX
      let finalY = targetY

      if (prev) {
        const lerpFactor = 0.35
        finalX = prev.position.x + (targetX - prev.position.x) * lerpFactor
        finalY = prev.position.y + (targetY - prev.position.y) * lerpFactor

        let dirX = finalX - prev.position.x
        let dirY = finalY - prev.position.y
        const dirLength = Math.hypot(dirX, dirY)

        if (prev.direction && Math.hypot(prev.direction.x, prev.direction.y) > 0) {
          const prevAngle = Math.atan2(prev.direction.y, prev.direction.x)
          let currAngle = Math.atan2(dirY, dirX)
          let diff = currAngle - prevAngle

          while (diff < -Math.PI) diff += Math.PI * 2
          while (diff > Math.PI) diff -= Math.PI * 2

          const maxTurn = (this.maxTurnAngle * Math.PI) / 180
          if (Math.abs(diff) > maxTurn) {
            const clampedAngle = prevAngle + Math.sign(diff) * maxTurn
            dirX = Math.cos(clampedAngle) * dirLength
            dirY = Math.sin(clampedAngle) * dirLength
            finalX = prev.position.x + dirX
            finalY = prev.position.y + dirY
          }
        }
      }

      const direction = {
        x: prev ? (finalX - prev.position.x) * 0.25 : 0,
        y: prev ? (finalY - prev.position.y) * 0.25 : 0,
      }

      const point: Point = {
        position: { x: finalX, y: finalY },
        time: Date.now(),
        drift: {
          x: this.getDrift() + direction.x * 0.1,
          y: this.getDrift() + direction.y * 0.1,
        },
        age: 0,
        direction: direction,
      }

      const shapeChance = Math.random()
      const chance = this.freq
      if (this.mode === "squares-triangles") {
        if (shapeChance < chance) this.makeSquare(point)
        else if (shapeChance < chance * 2) this.makeTriangle(point)
      } else if (this.mode === "obtuse") {
        if (shapeChance < chance) this.makeCircle(point)
        else if (shapeChance < chance * 2) this.makePentagon(point)
        else if (shapeChance < chance * 3) this.makeHexagon(point)
        else if (shapeChance < chance * 4) this.makeOctagon(point)
      } else {
        if (shapeChance < chance) this.makeSquare(point)
        else if (shapeChance < chance * 2) this.makeTriangle(point)
        else if (shapeChance < chance * 3) this.makeCircle(point)
        else if (shapeChance < chance * 4) this.makeHexagon(point)
      }

      this.points.unshift(point)
    }

    private createLine(points: Point[]): string {
      if (points.length === 0) return ""

      const path: string[] = []
      let forward = true
      let i = 0
      const boundaryPoints: { x: number; y: number }[] = []

      while (i >= 0) {
        const point = points[i]
        const dx = point.direction.x
        const dy = point.direction.y
        const speed = Math.hypot(dx, dy)
        const maxOffset = 0.16 * this.trailWidth
        const factor = speed > 0 ? Math.min(maxOffset, speed * 0.05 * this.trailWidth) / speed : 0
        const offsetX = dx * factor
        const offsetY = dy * factor
        const x = point.position.x + (forward ? offsetY : -offsetY)
        const y = point.position.y + (forward ? offsetX : -offsetX)
        point.age += 0.15

        boundaryPoints.push({
          x: x + point.drift.x * point.age,
          y: y + point.drift.y * point.age,
        })

        i += forward ? 1 : -1
        if (i === points.length) {
          i--
          forward = false
        }
      }

      if (boundaryPoints.length < 2) return ""

      path.push(`M ${boundaryPoints[0].x.toFixed(2)} ${boundaryPoints[0].y.toFixed(2)}`)
      for (let p = 1; p < boundaryPoints.length - 1; p++) {
        const xc = (boundaryPoints[p].x + boundaryPoints[p + 1].x) / 2
        const yc = (boundaryPoints[p].y + boundaryPoints[p + 1].y) / 2
        path.push(`Q ${boundaryPoints[p].x.toFixed(2)} ${boundaryPoints[p].y.toFixed(2)}, ${xc.toFixed(2)} ${yc.toFixed(2)}`)
      }
      path.push(`L ${boundaryPoints[boundaryPoints.length - 1].x.toFixed(2)} ${boundaryPoints[boundaryPoints.length - 1].y.toFixed(2)} Z`)

      return path.join(" ")
    }

    public trim() {
      if (this.points.length > 0) {
        const last = this.points[this.points.length - 1]
        const now = Date.now()
        if (last.time < now - removeDelay) {
          this.points.pop()
        }
      }
      this.line.setAttribute("d", this.createLine(this.points))
    }

    private makeSquare(point: Point) {
      const square = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      const speed = Math.hypot(point.direction.x, point.direction.y)
      const size = Math.min(5, 2.5 + speed * 0.1)
      square.setAttribute("width", String(Math.max(2, size)))
      square.setAttribute("height", String(Math.max(2, size)))
      square.style.fill = this.color
      this.moveShape(square, point)
    }

    private makeTriangle(point: Point) {
      const triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
      const speed = Math.hypot(point.direction.x, point.direction.y)
      const size = Math.min(5, 2.5 + speed * 0.1)
      const s = Math.max(2, size)
      triangle.setAttribute("points", `0,0 ${s.toFixed(2)},${(s / 2).toFixed(2)} 0,${s.toFixed(2)}`)
      triangle.style.fill = this.color
      this.moveShape(triangle, point)
    }

    private makeCircle(point: Point) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      const speed = Math.hypot(point.direction.x, point.direction.y)
      const radius = Math.min(5, 2 + speed * 0.1)
      circle.setAttribute("r", String(Math.max(1.5, radius)))
      circle.style.fill = this.color
      circle.setAttribute("cx", "0")
      circle.setAttribute("cy", "0")
      this.moveShape(circle, point)
    }

    private makePentagon(point: Point) {
      this.makeObtusePolygon(point, 5)
    }

    private makeHexagon(point: Point) {
      this.makeObtusePolygon(point, 6)
    }

    private makeOctagon(point: Point) {
      this.makeObtusePolygon(point, 8)
    }

    private makeObtusePolygon(point: Point, sides: number) {
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
      const speed = Math.hypot(point.direction.x, point.direction.y)
      const radius = Math.min(5, 2.5 + speed * 0.1)

      const pts: string[] = []
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
        const px = radius * Math.cos(angle)
        const py = radius * Math.sin(angle)
        pts.push(`${px.toFixed(2)},${py.toFixed(2)}`)
      }

      polygon.setAttribute("points", pts.join(" "))
      polygon.style.fill = this.color
      this.moveShape(polygon, point)
    }

    private moveShape(shape: SVGElement, point: Point) {
      this.stage.appendChild(shape)
      const driftX = point.position.x + point.direction.x * (Math.random() * 20) + point.drift.x * (Math.random() * 10)
      const driftY = point.position.y + point.direction.y * (Math.random() * 20) + point.drift.y * (Math.random() * 10)

      shape.style.transform = `translate(${point.position.x}px, ${point.position.y}px)`
      shape.style.transition = "all 0.5s ease-out"

      setTimeout(() => {
        shape.style.transform = `translate(${driftX}px, ${driftY}px) scale(0) rotate(${Math.random() * 360}deg)`
        setTimeout(() => {
          if (this.stage && this.stage.contains(shape)) {
            this.stage.removeChild(shape)
          }
        }, 500)
      }, 10)
    }
  }

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const position: Position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      followersRef.current.forEach((follower) => follower.add(position))
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const touch = e.touches[0]
      const position: Position = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }

      followersRef.current.forEach((follower) => follower.add(position))
    };

    window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
    };
  }, [colors, shapeFrequency, shapeMode, maxTurnAngle, trailWidth]);

  const animate = useCallback(() => {
    followersRef.current.forEach((follower) => follower.trim())
    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (!svgRef.current) return

    svgRef.current.innerHTML = ""
    followersRef.current = colors.map(
      (color) => new Follower(svgRef.current!, color, shapeFrequency, shapeMode, maxTurnAngle, trailWidth)
    )

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (svgRef.current) {
        svgRef.current.innerHTML = ""
      }
    }
  }, [colors, shapeFrequency, shapeMode, maxTurnAngle, trailWidth, animate])

  const isPositional = className.includes("fixed") || className.includes("absolute") || className.includes("relative");
  const positionClass = isPositional ? "" : "relative";

  return (
    <div
      ref={containerRef}
      className={`${positionClass} overflow-hidden ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}

    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 pointer-events-none"
      />
    </div>
  )
}
