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
  /** Set additional rotation speed boost from scroll velocity */
  setVelocityBoost: (boost: number) => void;
}

interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
}

// ── Inner Globe (runs inside Canvas) ──────────────────────────────────
function GlobeInner({
  globeConfig,
  data,
  scrollRotationRef,
  velocityBoostRef,
}: WorldProps & {
  scrollRotationRef: React.MutableRefObject<number>;
  velocityBoostRef: React.MutableRefObject<number>;
}) {
  const globeRef = useRef<ThreeGlobe | null>(null);
  const groupRef = useRef<Group>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { camera, scene, gl } = useThree();
  const currentRotation = useRef(0);

  const defaultProps = {
    pointSize: 1,
    atmosphereColor: "#ffffff",
    showAtmosphere: false,
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    polygonMargin: 0.7,
    globeColor: "#1d072e",
    globeOpacity: 1,
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 2000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    ...globeConfig,
  };

  // Initialize globe once
  useEffect(() => {
    if (!globeRef.current && groupRef.current) {
      globeRef.current = new ThreeGlobe();
      (groupRef.current as any).add(globeRef.current);
      setIsInitialized(true);
    }
  }, []);

  // Build material
  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;

    const globeMaterial = globeRef.current.globeMaterial() as unknown as {
      color: Color;
      emissive: Color;
      emissiveIntensity: number;
      shininess: number;
      transparent: boolean;
      opacity: number;
    };
    globeMaterial.color = new Color(globeConfig.globeColor);
    globeMaterial.emissive = new Color(globeConfig.emissive);
    globeMaterial.emissiveIntensity = globeConfig.emissiveIntensity || 0.1;
    globeMaterial.shininess = globeConfig.shininess || 0.9;
    globeMaterial.transparent = true;
    globeMaterial.opacity =
      globeConfig.globeOpacity !== undefined ? globeConfig.globeOpacity : 1;
  }, [
    isInitialized,
    globeConfig.globeColor,
    globeConfig.globeOpacity,
    globeConfig.emissive,
    globeConfig.emissiveIntensity,
    globeConfig.shininess,
  ]);

  // Build data (hex polygons, arcs, orbs)
  useEffect(() => {
    if (!globeRef.current || !isInitialized || !data) return;

    const arcs = data;
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

    globeRef.current
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(defaultProps.polygonMargin || 0.7)
      .showAtmosphere(defaultProps.showAtmosphere)
      .atmosphereColor(defaultProps.atmosphereColor)
      .atmosphereAltitude(defaultProps.atmosphereAltitude)
      .hexPolygonColor(() => defaultProps.polygonColor);

    globeRef.current
      .arcsData(data)
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

    globeRef.current
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
  }, [isInitialized, data]);

  // Direct pointer drag tracking (works across ocean, continents, and entire canvas)
  const isDragging = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });
  const dragVelocity = useRef({ x: 0, y: 0 });
  const manualRotationY = useRef(0);
  const manualRotationX = useRef(0);

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
      manualRotationY.current += dx * factor;
      manualRotationX.current = Math.max(
        -0.7,
        Math.min(0.7, manualRotationX.current + dy * factor)
      );
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl]);

  // Per-frame: drive rotation from drag, inertia, scroll + velocity boost, animate orb ripples
  useFrame(() => {
    if (!groupRef.current) return;

    if (!isDragging.current) {
      // Smooth inertia decay on release
      dragVelocity.current.x *= 0.95;
      dragVelocity.current.y *= 0.95;
      manualRotationY.current += dragVelocity.current.x;
      manualRotationX.current = Math.max(
        -0.7,
        Math.min(0.7, manualRotationX.current + dragVelocity.current.y)
      );

      // Idle rotation + scroll boost
      const idleSpeed = 0.0015;
      const boost = velocityBoostRef.current;
      manualRotationY.current += idleSpeed + boost * 0.01;
    }

    // Scroll-driven rotation added on top
    const targetScrollRotation = scrollRotationRef.current;
    groupRef.current.rotation.y = manualRotationY.current + targetScrollRotation;
    groupRef.current.rotation.x = manualRotationX.current;

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

// ── WebGL Renderer Config ─────────────────────────────────────────────
function WebGLRendererConfig() {
  const { gl, size } = useThree();

  useEffect(() => {
    gl.setPixelRatio(window.devicePixelRatio);
    gl.setSize(size.width, size.height);
    gl.setClearColor(0x000000, 0); // transparent background
  }, [gl, size]);

  return null;
}

// ── Public World Component ────────────────────────────────────────────
export const GlobeWorld = forwardRef<GlobeWorldRef, WorldProps>(
  (props, ref) => {
    const scrollRotationRef = useRef(0);
    const velocityBoostRef = useRef(0);

    useImperativeHandle(ref, () => ({
      setScrollRotation(angle: number) {
        scrollRotationRef.current = angle;
      },
      setVelocityBoost(boost: number) {
        velocityBoostRef.current = boost;
      },
    }));

    return (
      <Canvas
        camera={{ position: [0, 0, CAMERA_Z], fov: 50, near: 0.1, far: 2000 }}
        style={{ background: "transparent", touchAction: "none" }}
        gl={{ alpha: true, antialias: true }}
      >
        <WebGLRendererConfig />
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
          scrollRotationRef={scrollRotationRef}
          velocityBoostRef={velocityBoostRef}
        />
      </Canvas>
    );
  }
);

GlobeWorld.displayName = "GlobeWorld";
