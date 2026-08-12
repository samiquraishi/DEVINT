"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader.js";

// Hex to Vector3 converter
function hexToVec3(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255
  );
}

export default function StarfieldClose() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Fixed parameters
    const CONFIG = {
      bgColor: "#08081a",      // dark complementary background tint
      flameColor: "#aee9ff",   // corner-flame color A
      flameColor2: "#c79bff",  // corner-flame color B
      flameAmt: 0.0,           // edge lighting removed
      colorA: "#aef6cf",       // star tint A (mint)
      colorB: "#5fe6a0",       // star tint B (jade)
      colorC: "#eafff2",       // star tint C (bone)
      opacity: 2,
      pointSize: 26,           // reduced base particle size
      brightness: 1.85,
      drift: 0.7,              // steady base tunnel speed (constant at rest)
      twinkle: 1,
      spin: 0.01,              // base barrel rotation rate
      repelRadius: 5,
      repelStrength: 0.35,
      scrollPushMult: 0.06,    // velocity multiplier for scrolling
      parallax: 0.6,           // cursor camera offset
    };

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // Fog near is 0, far is 18 to give a bit more depth before they pop in
    scene.fog = new THREE.Fog(0x000000, 0, 18);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      80
    );
    camera.position.set(0, 0, 5);

    const LAYERS = { NONE: 0, TORUS_SCENE: 1, BLOOM_SCENE: 2, ENTIRE_SCENE: 3 };
    camera.layers.enable(LAYERS.TORUS_SCENE);
    camera.layers.enable(LAYERS.BLOOM_SCENE);
    camera.layers.enable(LAYERS.ENTIRE_SCENE);
    scene.add(camera);

    // Geometry - INCREASED particle density so it feels rich
    const count = 3000;
    const depth = 40; // Increased depth for a longer tunnel
    const positions = new Float32Array(count * 3);
    const palette = new Float32Array(count);
    const bright = new Float32Array(count);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 28;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * depth;
      palette[i] = Math.floor(Math.random() * 3);
      bright[i] = 0.7 + Math.random() * 0.6;
      scales[i] = 0.4 + Math.pow(Math.random(), 1.4) * 1.5;
      phases[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("aScale", new THREE.Float32BufferAttribute(scales, 1));
    geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
    geometry.setAttribute("aPalette", new THREE.Float32BufferAttribute(palette, 1));
    geometry.setAttribute("aBright", new THREE.Float32BufferAttribute(bright, 1));

    // Disable frustum culling just in case modulo shifting causes bounding box issues
    geometry.computeBoundingSphere();
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: CONFIG.pointSize },
        uOpacity: { value: 0 },
        uOffset: { value: 0 },
        uDepth: { value: depth },
        uTwinkle: { value: CONFIG.twinkle },
        uCursor: { value: new THREE.Vector3() },
        uRepelRadius: { value: CONFIG.repelRadius },
        uRepelStrength: { value: CONFIG.repelStrength },
        uActivity: { value: 0 },
        uColorA: { value: hexToVec3(CONFIG.colorA) },
        uColorB: { value: hexToVec3(CONFIG.colorB) },
        uColorC: { value: hexToVec3(CONFIG.colorC) },
        uBrightness: { value: CONFIG.brightness },
      },
      vertexShader: `
        uniform float uTime; uniform float uSize; uniform float uOffset; uniform float uDepth; uniform float uTwinkle;
        uniform vec3 uCursor; uniform float uRepelRadius; uniform float uRepelStrength; uniform float uActivity;
        uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC;
        attribute float aScale; attribute float aPhase; attribute float aPalette; attribute float aBright;
        varying vec3 vColor; varying float vTwinkle;
        void main() {
          vec3 pos = position;
          // Endless drift toward +Z with mod-wrap safely avoiding negative mod issues
          float halfDepth = uDepth * 0.5;
          // Adding 1000.0 * uDepth ensures the value is strictly positive before modding
          pos.z = mod(pos.z + uOffset + halfDepth + (uDepth * 1000.0), uDepth) - halfDepth;

          float tw = sin(uTime * 0.8 + aPhase * 6.2831);
          vTwinkle = (1.0 - uTwinkle) + uTwinkle * (0.55 + 0.45 * tw);

          vec4 modelPosition = modelMatrix * vec4(pos, 1.0);

          vec3 toParticle = modelPosition.xyz - uCursor;
          float dist = length(toParticle);
          float falloff = smoothstep(uRepelRadius, 0.0, dist);
          modelPosition.xyz += normalize(toParticle + vec3(0.0001)) * falloff * uRepelStrength * uActivity;

          vec4 viewPosition = viewMatrix * modelPosition;
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = uSize * aScale;
          gl_PointSize *= (1.0 / -viewPosition.z);

          vec3 base = aPalette < 0.5 ? uColorA : (aPalette < 1.5 ? uColorB : uColorC);
          vColor = base * aBright;
        }
      `,
      fragmentShader: `
        uniform float uOpacity; uniform float uBrightness;
        varying vec3 vColor; varying float vTwinkle;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float strength = pow(1.0 - d * 2.0, 4.0);
          vec3 color = mix(vec3(0.0), vColor, strength);
          gl_FragColor = vec4(color * uBrightness, strength * uOpacity * vTwinkle);
        }
      `,
    });
    
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false; // Prevent any unexpected culling
    points.layers.enable(LAYERS.ENTIRE_SCENE);
    points.layers.enable(LAYERS.BLOOM_SCENE);
    points.layers.enable(LAYERS.TORUS_SCENE);

    const group = new THREE.Group();
    group.add(points);
    scene.add(group);

    // Dummy halo texture to avoid undefined sampler warning
    const dummyHalo = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    dummyHalo.needsUpdate = true;

    // Composite FinalPass ShaderPass
    const finalPass = new ShaderPass({
      uniforms: {
        iTime: { value: 0 },
        tDiffuse: { value: null },
        torusTexture: { value: null },
        bloomTexture: { value: null },
        haloTexture: { value: dummyHalo },
        uBg: { value: hexToVec3(CONFIG.bgColor) },
        uFlameA: { value: hexToVec3(CONFIG.flameColor) },
        uFlameB: { value: hexToVec3(CONFIG.flameColor2) },
        uFlameAmt: { value: CONFIG.flameAmt },
      },
      vertexShader: `
        varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float iTime; uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; uniform sampler2D torusTexture; uniform sampler2D haloTexture;
        uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
        varying vec2 vUv;
        void main(){
          vec2 uv = 2.*vUv - 1.;
          vec3 bg = uBg * (1.0 - 0.35 * length(uv));
          vec3 halo = texture2D(haloTexture, vUv).xyz;
          gl_FragColor = vec4(bg + texture2D(bloomTexture, vUv).xyz + texture2D(torusTexture, vUv).xyz + texture2D(tDiffuse, vUv).xyz + halo, 1.);
        }
      `,
    });

    const renderScene = new RenderPass(scene, camera);

    // torusComposer (renderToScreen=false)
    const torusComposer = new EffectComposer(renderer);
    torusComposer.renderToScreen = false;
    torusComposer.addPass(renderScene);
    torusComposer.addPass(new ShaderPass(GammaCorrectionShader));
    torusComposer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.22,
        0.2,
        0
      )
    );
    torusComposer.addPass(new ShaderPass(CopyShader));

    // bloomComposer (renderToScreen=false)
    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.4,
        0.55,
        0
      )
    );
    bloomComposer.addPass(new ShaderPass(GammaCorrectionShader));

    // finalComposer
    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(finalPass);

    finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget1.texture;
    finalPass.uniforms.torusTexture.value = torusComposer.renderTarget1.texture;

    // Pointer interaction
    const POINTER = {
      ndc: new THREE.Vector2(0, 0),
      world: new THREE.Vector3(0, 0, 0),
      active: false,
      lastMove: 0,
      activity: 0,
    };

    const handleMouseMove = (e: MouseEvent) => {
      POINTER.ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      POINTER.ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
      POINTER.active = true;
      POINTER.lastMove = performance.now();
    };

    const handleMouseLeave = () => {
      POINTER.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const planeTarget = new THREE.Vector3(0, 0, 0);

    function updatePointer(now: number) {
      if (POINTER.active) {
        const targetVector = new THREE.Vector3(POINTER.ndc.x, POINTER.ndc.y, 0.5);
        targetVector.unproject(camera);
        const dir = targetVector.sub(camera.position).normalize();

        if (Math.abs(dir.z) > 1e-4) {
          const t = -camera.position.z / dir.z;
          if (t > 0 && isFinite(t)) {
            planeTarget.copy(camera.position).addScaledVector(dir, t);
          } else {
            planeTarget.set(0, 0, 0);
          }
        } else {
          planeTarget.set(0, 0, 0);
        }
      } else {
        planeTarget.set(0, 0, 0);
      }

      POINTER.world.lerp(planeTarget, 0.12);

      const idleSeconds = (now - POINTER.lastMove) / 1000;
      const want = POINTER.active && idleSeconds < 3 ? 1 : 0;
      POINTER.activity += (want - POINTER.activity) * 0.06;

      material.uniforms.uCursor.value.copy(POINTER.world);
      material.uniforms.uActivity.value = POINTER.activity;
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    // Animation & render loop
    const appearStart = performance.now();
    let t0 = performance.now() / 1000;
    let driftAccum = 0;
    let currentVelocity = 0;
    const mouseSmooth = new THREE.Vector2(0, 0);
    let animationFrameId: number;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);

      const nowMs = performance.now();
      const t = nowMs / 1000;
      const dt = Math.min(0.05, t - t0);
      t0 = t;

      mouseSmooth.x = lerp(mouseSmooth.x, POINTER.ndc.x, 0.06);
      mouseSmooth.y = lerp(mouseSmooth.y, POINTER.ndc.y, 0.06);

      updatePointer(nowMs);

      const m = mouseSmooth;

      material.uniforms.uTime.value = t;
      
      // Ambient drift + absolute scroll offset
      driftAccum += CONFIG.drift * dt;
      const scrollOffset = window.scrollY * 0.015;
      material.uniforms.uOffset.value = driftAccum + scrollOffset;

      // Camera position: constant Z at 5, with cursor parallax
      camera.position.set(
        m.x * CONFIG.parallax,
        m.y * CONFIG.parallax,
        5
      );
      camera.lookAt(m.x * CONFIG.parallax, m.y * CONFIG.parallax, -10);

      const elapsed = nowMs - appearStart;
      const fade = Math.max(0, Math.min(1, (elapsed - 300) / 1400));
      material.uniforms.uOpacity.value = fade * CONFIG.opacity;

      group.rotation.z += dt * (CONFIG.spin + currentVelocity * 0.001);

      // Render composers
      finalPass.uniforms.iTime.value = t;

      camera.layers.set(LAYERS.TORUS_SCENE);
      torusComposer.render();

      camera.layers.set(LAYERS.BLOOM_SCENE);
      bloomComposer.render();

      camera.layers.set(LAYERS.ENTIRE_SCENE);
      finalComposer.render();
    }

    animate();

    // Resize handling
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio, 2);

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      torusComposer.setPixelRatio(pixelRatio);
      torusComposer.setSize(width, height);

      bloomComposer.setPixelRatio(pixelRatio);
      bloomComposer.setSize(width, height);

      finalComposer.setPixelRatio(pixelRatio);
      finalComposer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      dummyHalo.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block bg-black z-0 pointer-events-none"
    />
  );
}
