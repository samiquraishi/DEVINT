"use client";
import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import {
  Color,
  Scene,
  PerspectiveCamera,
  Vector3,
  Group,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  RingGeometry,
  DoubleSide,
} from "three";
import ThreeGlobe from "three-globe";
import { useThree, Canvas, extend, useFrame } from "@react-three/fiber";
import countries from "../../../public/data/globe.json";

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: ThreeElements["mesh"] & {
      new (): ThreeGlobe;
    };
  }
}

extend({ ThreeGlobe: ThreeGlobe });

const CAMERA_Z = 270;
const ASPECT = 1.2;

type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  globeOpacity?: number;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  polygonMargin?: number;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  arcTime?: number;
  arcLength?: number;
  rings?: number;
  maxRings?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
};

export interface GlobeWorldRef {
  /** Set the globe's Y rotation directly from scroll progress */
  setScrollRotation: (angle: number) => void;
  /** Set the 3D scale of the globe directly (0.0 to 1.0) */
  setScale: (scale: number) => void;
}

interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
}

// ── Inner Globe (runs inside Canvas) ──────────────────────────────────
function GlobeInner({
  globeConfig,
  data,
  targetScrollRotationRef,
  targetScaleRef,
}: WorldProps & {
  targetScrollRotationRef: React.MutableRefObject<number>;
  targetScaleRef: React.MutableRefObject<number>;
}) {
  const globeRef = useRef<ThreeGlobe | null>(null);
  const groupRef = useRef<Group>(null);
  const { camera, scene, gl } = useThree();

  const smoothScrollRotation = useRef(0);
  const dragRotationY = useRef(0);
  const dragRotationX = useRef(0);
  const dragVelocity = useRef({ x: 0, y: 0 });
  const idleRotation = useRef(0);
  const isDragging = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });

  const defaultProps = {
    pointSize: 1.4,
    atmosphereColor: "#ffffff",
    showAtmosphere: false,
    atmosphereAltitude: 0.1,
    polygonColor: "#ffffff",
    polygonMargin: 0.8,
    globeColor: "#062056",
    globeOpacity: 0.3,
    emissive: "#062056",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 1500,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    ...globeConfig,
  };

  // Synchronous One-Pass Initialization on Mount
  useEffect(() => {
    if (!groupRef.current) return;

    if (globeRef.current) {
      (groupRef.current as any).remove(globeRef.current);
      globeRef.current = null;
    }

    const globe = new ThreeGlobe();
    globeRef.current = globe;
    (groupRef.current as any).add(globe);

    // 1. Material
    const globeMaterial = globe.globeMaterial() as unknown as {
      color: Color;
      emissive: Color;
      emissiveIntensity: number;
      shininess: number;
      transparent: boolean;
      opacity: number;
    };
    globeMaterial.color = new Color(defaultProps.globeColor);
    globeMaterial.emissive = new Color(defaultProps.emissive);
    globeMaterial.emissiveIntensity = defaultProps.emissiveIntensity;
    globeMaterial.shininess = defaultProps.shininess;
    globeMaterial.transparent = true;
    globeMaterial.opacity = defaultProps.globeOpacity;

    // 2. Arcs and Points
    const arcs = data || [];
    const startPoints: any[] = [];
    const endPoints: any[] = [];
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      startPoints.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: arc.color,
        lat: arc.startLat,
        lng: arc.startLng,
      });
      endPoints.push({
        size: defaultProps.pointSize,
        order: arc.order,
        color: arc.color,
        lat: arc.endLat,
        lng: arc.endLng,
      });
    }

    const points = [...startPoints, ...endPoints];
    const filteredPoints = points.filter(
      (v, i, a) =>
        a.findIndex((v2) =>
          ["lat", "lng"].every(
            (k) => v2[k as "lat" | "lng"] === v[k as "lat" | "lng"]
          )
        ) === i
    );

    // 3. Hex Polygons (Continents)
    globe
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(defaultProps.polygonMargin)
      .showAtmosphere(defaultProps.showAtmosphere)
      .atmosphereColor(defaultProps.atmosphereColor)
      .atmosphereAltitude(defaultProps.atmosphereAltitude)
      .hexPolygonColor(() => defaultProps.polygonColor);

    // 4. Arcs
    globe
      .arcsData(arcs)
      .arcStartLat((d) => (d as { startLat: number }).startLat * 1)
      .arcStartLng((d) => (d as { startLng: number }).startLng * 1)
      .arcEndLat((d) => (d as { endLat: number }).endLat * 1)
      .arcEndLng((d) => (d as { endLng: number }).endLng * 1)
      .arcColor((e: any) => (e as { color: string }).color)
      .arcAltitude((e) => (e as { arcAlt: number }).arcAlt * 1)
      .arcStroke(() => 0.4)
      .arcDashLength(defaultProps.arcLength)
      .arcDashInitialGap((e) => (e as { order: number }).order * 1)
      .arcDashGap(15)
      .arcDashAnimateTime(() => defaultProps.arcTime);

    // 5. Custom Layer (Orbs and Ripples)
    globe
      .customLayerData(filteredPoints)
      .customThreeObject((d: any) => {
        const group = new Group();
        const pointSize = d.size || defaultProps.pointSize || 1;
        const color = d.color || "#ffffff";

        const orb = new Mesh(
          new SphereGeometry(pointSize, 16, 16),
          new MeshBasicMaterial({ color })
        );
        group.add(orb);

        const ripple = new Mesh(
          new RingGeometry(pointSize, pointSize + 0.2, 32),
          new MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            side: DoubleSide,
          })
        );
        group.add(ripple);

        group.userData = {
          isOrbGroup: true,
          lat: d.lat,
          lng: d.lng,
          ripple,
          phase: Math.random(),
          speed: 0.005 + Math.random() * 0.01,
          maxRings: defaultProps.maxRings || 3,
        };

        return group;
      })
      .customThreeObjectUpdate((obj: any, d: any) => {
        const coords = globeRef.current?.getCoords(d.lat, d.lng, 0);
        if (coords) {
          obj.position.set(coords.x, coords.y, coords.z);
          const lookAtPos = new Vector3(
            coords.x,
            coords.y,
            coords.z
          ).multiplyScalar(2);
          obj.lookAt(lookAtPos);
        }
      });

    return () => {
      if (groupRef.current && globe) {
        (groupRef.current as any).remove(globe);
      }
      globeRef.current = null;
    };
  }, [data]);

  // Direct pointer drag tracking (works across ocean, continents, and entire canvas)
  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Left click only
      isDragging.current = true;
      prevPointer.current = { x: e.clientX, y: e.clientY };
      dragVelocity.current = { x: 0, y: 0 };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevPointer.current.x;
      const dy = e.clientY - prevPointer.current.y;
      prevPointer.current = { x: e.clientX, y: e.clientY };

      const factor = 0.005;
      dragVelocity.current = { x: dx * factor, y: dy * factor };
      dragRotationY.current += dx * factor;
      dragRotationX.current = Math.max(
        -0.7,
        Math.min(0.7, dragRotationX.current + dy * factor)
      );
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [gl]);

  // Per-frame: drive rotation and 3D scale from fluid scroll tracking, mouse drag, inertia, and idle
  useFrame(() => {
    if (!groupRef.current) return;

    // 1. 3D scale (scales uniformly from center in 3D WebGL space, avoids Canvas CSS resize)
    const s = targetScaleRef.current;
    groupRef.current.scale.set(s, s, s);

    // 2. Fluid momentum scroll rotation (smooth lerp, rotates right on scroll-down, LEFT on scroll-up!)
    const target = targetScrollRotationRef.current;
    const lerpFactor = 0.18; // Buttery smooth response identical to cylinder gallery
    smoothScrollRotation.current += (target - smoothScrollRotation.current) * lerpFactor;
    if (Math.abs(target - smoothScrollRotation.current) < 0.0005) {
      smoothScrollRotation.current = target;
    }

    // 3. Mouse drag inertia & idle rotation
    if (!isDragging.current) {
      dragVelocity.current.x *= 0.94;
      dragVelocity.current.y *= 0.94;
      dragRotationY.current += dragVelocity.current.x;
      dragRotationX.current = Math.max(
        -0.7,
        Math.min(0.7, dragRotationX.current + dragVelocity.current.y)
      );

      // Continuous gentle idle spin
      idleRotation.current += 0.001;
    }

    // 4. Composite rotation:
    // Scroll rotation + drag rotation + idle spin
    groupRef.current.rotation.y =
      smoothScrollRotation.current + dragRotationY.current + idleRotation.current;
    groupRef.current.rotation.x = dragRotationX.current;

    // Animate orb ripples and backface culling
    if (globeRef.current && camera && scene) {
      const cameraDir = camera.position.clone().normalize();

      scene.traverse((child: any) => {
        if (child.userData && child.userData.isOrbGroup) {
          const pos = new Vector3();
          child.getWorldPosition(pos);
          const normal = pos.normalize();
          const dot = normal.dot(cameraDir);

          child.visible = dot > -0.05;

          if (child.visible && child.userData.ripple) {
            child.userData.phase += child.userData.speed;
            if (child.userData.phase > 1) {
              child.userData.phase -= 1;
            }
            const p = child.userData.phase;
            const maxScale = child.userData.maxRings || 3;
            const scale = 1 + p * (maxScale - 1);
            child.userData.ripple.scale.set(scale, scale, 1);
            child.userData.ripple.material.opacity = 1 - p;
          }
        }
      });
    }
  });

  return <group ref={groupRef} />;
}

// ── Public World Component ────────────────────────────────────────────
export const GlobeWorld = forwardRef<GlobeWorldRef, WorldProps>(
  (props, ref) => {
    const scrollRotationRef = useRef(0);
    const scaleRef = useRef(1.0);

    useImperativeHandle(ref, () => ({
      setScrollRotation(angle: number) {
        scrollRotationRef.current = angle;
      },
      setScale(scale: number) {
        scaleRef.current = scale;
      },
    }));

    return (
      <Canvas
        camera={{ position: [0, 0, CAMERA_Z], fov: 50, near: 0.1, far: 2000 }}
        style={{ background: "transparent", touchAction: "none" }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight color="white" intensity={1.8} />
        <directionalLight
          color="white"
          position={new Vector3(-400, 100, 400)}
          intensity={1.0}
        />
        <directionalLight
          color="white"
          position={new Vector3(-200, 500, 200)}
          intensity={0.8}
        />
        <GlobeInner
          {...props}
          targetScrollRotationRef={scrollRotationRef}
          targetScaleRef={scaleRef}
        />
      </Canvas>
    );
  }
);

GlobeWorld.displayName = "GlobeWorld";
