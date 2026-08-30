"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";

export interface GlowingOrbHandle {
  updateProgress: (pTotal: number) => void;
}

/**
 * GlowingOrb — a scroll-driven star that materialises from a single pixel,
 * grows organically with rough edges, and eventually engulfs the screen white.
 *
 * Renders on a fullscreen quad with a single fragment shader.
 * Uses `alpha: true` + `premultipliedAlpha: false` on the WebGL renderer so
 * the canvas is **truly transparent** — the starfield behind it is always visible.
 * No EffectComposer, no bloom pass, no 3-D sphere.
 */
export const GlowingOrb = forwardRef<GlowingOrbHandle, {}>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseSmooth = useRef({ x: 0, y: 0 });

  const threeRefs = useRef<{
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    camera: THREE.OrthographicCamera | null;
    material: THREE.ShaderMaterial | null;
    animationId: number | null;
  }>({
    renderer: null,
    scene: null,
    camera: null,
    material: null,
    animationId: null,
  });

  /* ─── WebGL initialisation ──────────────────────────────────── */
  useEffect(() => {
    const refs = threeRefs.current;
    if (!canvasRef.current) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Orthographic camera for a fullscreen quad
    refs.scene = new THREE.Scene();
    refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    refs.renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      premultipliedAlpha: false,
      antialias: false, // Not needed for a fullscreen shader
    });
    refs.renderer.setClearColor(0x000000, 0); // fully transparent clear
    refs.renderer.setSize(w, h);
    refs.renderer.setPixelRatio(dpr);

    /* ── Shader material ────────────────────────────────────── */
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uSize: { value: 0.0 }, // 0 = invisible pixel, ~0.15 = 20% screen, 3+ = full white
        uResolution: { value: new THREE.Vector2(w * dpr, h * dpr) },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: /* glsl */ `
        void main() {
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;

        uniform float uTime;
        uniform float uSize;
        uniform vec2  uResolution;
        uniform vec2  uMouse;

        /* ── Simplex 2-D noise (Ashima / Stefan Gustavson) ────── */
        vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
        vec2 mod289(vec2 x){ return x - floor(x*(1.0/289.0))*289.0; }
        vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v){
          const vec4 C = vec4(0.211324865405187,0.366025403784439,
                             -0.577350269189626,0.024390243902439);
          vec2  i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
          vec3 m = max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
          m = m*m; m = m*m;
          vec3 x_ = 2.0*fract(p*C.www)-1.0;
          vec3 h  = abs(x_)-0.5;
          vec3 ox = floor(x_+0.5);
          vec3 a0 = x_-ox;
          m *= 1.79284291400159-0.85373472095314*(a0*a0+h*h);
          vec3 g;
          g.x  = a0.x *x0.x  + h.x *x0.y;
          g.yz = a0.yz*x12.xz + h.yz*x12.yw;
          return 130.0*dot(m,g);
        }

        void main(){
          /* Early-out when fully invisible */
          if(uSize < 0.0003){
            gl_FragColor = vec4(0.0);
            return;
          }

          /* Centred, aspect-corrected UVs */
          vec2 uv = gl_FragCoord.xy / uResolution;
          vec2 c  = (uv - 0.5) * 2.0;
          c.x *= uResolution.x / uResolution.y;

          /* Parallax offset — strength scales with visible size so the
             tiny point doesn't jump around, but a medium orb sways nicely */
          c -= uMouse * 0.18 * clamp(uSize * 4.0, 0.0, 1.0);

          float dist  = length(c);
          float angle = atan(c.y, c.x);

          /* ── Organic edge distortion ───────────────────────────
             Multiple noise octaves at different angular frequencies
             create a slowly-morphing, rough star boundary.
             Distortion fades out as the orb grows very large so the
             final white wash is smooth. */
          float roughness = clamp(1.0 - uSize * 0.6, 0.0, 1.0);
          float n1 = snoise(vec2(angle*2.5 + uTime*0.15, uTime*0.08      )) * 0.22;
          float n2 = snoise(vec2(angle*5.5 - uTime*0.12, uTime*0.10 + 3.0)) * 0.11;
          float n3 = snoise(vec2(angle*11.0+ uTime*0.07, uTime*0.06 + 7.0)) * 0.05;
          float distortion = 1.0 + (n1 + n2 + n3) * roughness;

          float noisyDist = dist * distortion;
          float s = max(uSize, 0.0003);
          float scaled = noisyDist / s;

          /* ── Core: white-hot centre ─────────────────────────── */
          float core = exp(-scaled * scaled * 14.0);

          /* ── Inner glow: blue-white halo ────────────────────── */
          float inner = exp(-scaled * 4.5) * 0.75;

          /* ── Outer aura: soft blue mist ─────────────────────── */
          float outer = exp(-scaled * 2.0) * 0.25;

          /* ── Subtle diffraction spikes (4-pointed star) ─────── */
          float spikes = 0.0;
          for(int i = 0; i < 4; i++){
            float sa = float(i)*0.7854 + 0.3927;          // PI/4 steps, offset
            float sp = pow(abs(cos(angle - sa)), 60.0);
            spikes += sp * exp(-scaled * 3.5) * 0.12;
          }
          spikes *= roughness; // fade spikes when orb engulfs the screen

          /* ── Slow organic pulse ─────────────────────────────── */
          float pulse = 1.0 + sin(uTime*1.2)*0.04 + sin(uTime*2.7)*0.02;

          /* ── Colour layering ────────────────────────────────── */
          vec3 whiteHot  = vec3(1.0);
          vec3 blueWhite = vec3(0.75, 0.88, 1.0);
          vec3 deepBlue  = vec3(0.25, 0.48, 0.96);

          vec3 col = whiteHot  * core
                   + blueWhite * inner
                   + deepBlue  * outer
                   + whiteHot  * spikes;
          col *= pulse;

          /* ── Alpha ──────────────────────────────────────────── */
          float alpha = clamp(core + inner*0.65 + outer*0.35 + spikes, 0.0, 1.0);

          /* ── White-engulf transition ────────────────────────── *
           *  As uSize passes ~0.5 the colour shifts toward pure white,
           *  and alpha fills the whole screen.  By uSize ≈ 3 the
           *  viewport is fully opaque white. */
          float whiteBlend = smoothstep(0.4, 1.8, uSize);
          col   = mix(col,   vec3(1.0), whiteBlend);
          alpha = mix(alpha,  1.0,       whiteBlend * smoothstep(0.0, 0.6, 1.0 - scaled*0.4));

          float fullWhite = smoothstep(1.8, 3.5, uSize);
          col   = mix(col,   vec3(1.0), fullWhite);
          alpha = mix(alpha,  1.0,       fullWhite);

          col = min(col, vec3(1.0));

          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    refs.scene.add(new THREE.Mesh(geo, material));
    refs.material = material;

    /* ── Render loop ────────────────────────────────────────── */
    const animate = () => {
      refs.animationId = requestAnimationFrame(animate);

      // Smooth mouse lerp
      const d = 0.04;
      mouseSmooth.current.x += (mouseTarget.current.x - mouseSmooth.current.x) * d;
      mouseSmooth.current.y += (mouseTarget.current.y - mouseSmooth.current.y) * d;

      if (refs.material) {
        refs.material.uniforms.uTime.value = performance.now() * 0.001;
        refs.material.uniforms.uMouse.value.set(
          mouseSmooth.current.x,
          mouseSmooth.current.y
        );
      }

      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera);
      }
    };
    animate();

    /* ── Resize ─────────────────────────────────────────────── */
    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      const ndpr = Math.min(window.devicePixelRatio || 1, 2);
      if (refs.renderer) refs.renderer.setSize(nw, nh);
      if (refs.material)
        refs.material.uniforms.uResolution.value.set(nw * ndpr, nh * ndpr);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId);
      window.removeEventListener("resize", handleResize);
      geo.dispose();
      material.dispose();
      if (refs.renderer) refs.renderer.dispose();
    };
  }, []);

  /* ─── Mouse listener for parallax ────────────────────────── */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseTarget.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTarget.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* ─── Imperative scroll-progress API ─────────────────────── */
  useImperativeHandle(ref, () => ({
    updateProgress: (pTotal: number) => {
      const refs = threeRefs.current;
      if (!refs.material) return;

      /*
       * Timeline (pTotal units, 1 stroke ≈ 0.0625):
       *
       *  0.28        Text 2 disappears
       *  0.28 → 0.33 ~0.8 strokes of empty gap (user just sees stars)
       *  0.33 → 0.80 Single smooth curve — star from pixel to full white
       *  0.80+       Full white
       *
       *  Uses one quadratic (t²) across the whole range so the growth
       *  rate increases linearly — no phase boundaries, no pauses.
       */

      let orbSize = 0;

      if (pTotal >= 0.12 && pTotal <= 0.30) {
        const t = (pTotal - 0.12) / 0.18; // 0 → 1 over the full range
        orbSize = 4.0 * t * t;            // smooth quadratic ease-in
      } else if (pTotal > 0.30) {
        orbSize = 4.0;
      }

      refs.material.uniforms.uSize.value = orbSize;
    },
  }));

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
});

GlowingOrb.displayName = "GlowingOrb";
export default GlowingOrb;
