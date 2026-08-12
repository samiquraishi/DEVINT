"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// Generate random points in a sphere shell
function generatePoints(count = 800, radius = 2.5) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Spherical coordinates
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = radius + (Math.random() - 0.5) * 0.4; // slight variance
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

function StarBackground() {
  const ref = useRef<THREE.Points>(null);
  const [sphere] = useState(() => generatePoints(1200, 4));

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta * 0.03;
      ref.current.rotation.y -= delta * 0.02;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#00f0ff"
          size={0.015}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6}
        />
      </Points>
    </group>
  );
}

function CoreSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  
  // Parallax cursor tracking
  useFrame((state) => {
    const { x, y } = state.pointer; // normalized [-1, 1]
    
    if (meshRef.current) {
      // Gentle constant rotation + mouse parallax
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x,
        y * 0.3,
        0.1
      );
      meshRef.current.rotation.z = THREE.MathUtils.lerp(
        meshRef.current.rotation.z,
        x * 0.3,
        0.1
      );
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = state.clock.getElapsedTime() * 0.3;
      ring1Ref.current.rotation.y = THREE.MathUtils.lerp(
        ring1Ref.current.rotation.y,
        -x * 0.5,
        0.05
      );
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -state.clock.getElapsedTime() * 0.25;
      ring2Ref.current.rotation.x = THREE.MathUtils.lerp(
        ring2Ref.current.rotation.x,
        y * 0.5,
        0.05
      );
    }
  });

  return (
    <group scale={1.2}>
      {/* Central Holographic Sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial
          color="#bf5af2"
          wireframe
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer Glow Wireframe */}
      <mesh scale={1.03}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#00f0ff"
          wireframe
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ring 1 - Vertical Orbit */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.015, 8, 64]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ring 2 - Horizontal Orbit */}
      <mesh ref={ring2Ref} rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[1.8, 0.01, 8, 64]} />
        <meshBasicMaterial
          color="#bf5af2"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export default function FuturisticCanvas() {
  return (
    <div className="absolute inset-0 w-full h-full -z-10 pointer-events-none bg-[#030303]">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <CoreSphere />
        <StarBackground />
      </Canvas>
      {/* Overlay vignette/glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_20%,rgba(3,3,3,0.85)_100%)] pointer-events-none" />
    </div>
  );
}
