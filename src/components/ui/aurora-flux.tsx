'use client';

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';

export type AuroraFluxProps = {
  /** Run full-bleed (fills viewport fixed). If false, canvas fills parent relative/absolute container. */
  fullScreen?: boolean;
  /** Pause animation when not visible (via page visibility). Default: true */
  pauseWhenHidden?: boolean;
  /** Pause animation while pointer is over the canvas. Default: false */
  pauseOnHover?: boolean;
  /** Initial value for u_mix. */
  mix?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Optional aria label for accessibility. */
  ariaLabel?: string;
  /**
   * Whether formation is scroll-based internally (listening to window scroll).
   * Set to false if controlled externally via `progress` prop or `setProgress` handle.
   * Default: false when used in section orchestration.
   */
  scrollBased?: boolean;
  /**
   * Explicit formation progress (0.0 = transparent/unformed, 1.0 = fully formed).
   */
  progress?: number;
  /**
   * Whether the component should disappear in reverse after being fully formed.
   * Only used if scrollBased is true and progress is not provided.
   */
  disappearOnScroll?: boolean;
  appearThreshold?: number;
  disappearThreshold?: number;
  /** Callback to notify parent of the current smoothed formation progress (0.0 to 1.0). */
  onProgressChange?: (progress: number) => void;
};

export interface AuroraFluxHandle {
  setProgress: (progress: number) => void;
  getCanvas: () => HTMLCanvasElement | null;
}

const VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
out vec2 vUv;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  vUv = a_position * 0.5 + 0.5;
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec3 u_resolution;
uniform float u_time;
uniform float u_live_time;
uniform float u_mix;
uniform float u_progress;
uniform float u_ambient_time;
out vec4 fragColor;

void main() {
  // At progress 0, display a completely black screen
  if (u_progress <= 0.0001) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 fragCoord = gl_FragCoord.xy;
  vec2 r = u_resolution.xy;
  vec2 p = (fragCoord + fragCoord - r) / r.y;
  float dist = length(p);

  vec2 z = vec2(0.5);
  vec2 i = vec2(0.1);
  vec2 f = p * (z += 5. - 6. * exp(.4 - dot(p, p)));
  vec4 O = vec4(0.0);

  // Formation timeline: 0.0 (incomplete open ring) -> 1.05 (fully formed torus)
  float formationPhase = u_progress * 1.05;
  
  // Smooth, organic living motion (alive from the first percent, without any harsh shimmer or glare)
  float aliveMotion = sin(u_live_time * 0.45) * 0.04 * min(u_progress * 2.0, 1.0);
  float t = formationPhase + aliveMotion + u_ambient_time;

  for (i.y = 1.0; i.y <= 8.0; i.y += 1.0) {
    O += (tanh(f) + 1.0).xyyx * abs(f.x - f.y);
    float waveLayer = sin(u_live_time * 0.5 + i.y * 0.7) * 0.035;
    f += tanh(f.yx * i.y + i + t + waveLayer) / i.y + 0.7;
  }
  O = tanh(5.0 * exp(z.x - 4.0 - p.y * vec4(-1.0, 1.0, 2.0, 0.0)) / O);

  // Incoming ray reach: natural converging lines advance from outer boundary (2.5) inward to center ring (0.65)
  float rayReach = mix(2.6, 0.62, smoothstep(0.0, 1.0, u_progress));
  float rayInwardMask = smoothstep(rayReach + 0.35, rayReach - 0.08, dist);

  // Synchronized edge formation:
  // Edges are NOT completely formed until center ring is formed (both reach full 100% completion together at progress = 1.0)
  float edgeCompleteness = smoothstep(0.0, 1.0, u_progress);
  float edgeRegion = smoothstep(0.62, 1.30, dist);
  float edgeDefinition = mix(0.15, 1.0, edgeCompleteness);

  // Modulate the natural field: edges deepen and extend inward with progress, cleanly without glare
  O *= mix(1.0, edgeDefinition, edgeRegion);
  O *= mix(rayInwardMask, 1.0, edgeCompleteness);

  // Smooth, elegant chromatic glow that flows gently
  float mixPhase = dot(p, p) + z.x + (t * 0.4 + u_live_time * 0.3) + sin(p.x * 1.5 + p.y * 2.5 + u_live_time * 0.35);
  float channel = cos(mixPhase * 3.0);
  vec3 glow = vec3(
    0.6 + 0.4 * sin(channel + 1.0),
    0.6 + 0.4 * sin(channel + 0.0),
    0.6 + 0.4 * sin(channel + 2.0)
  );
  O.rgb *= glow;

  // Smooth entry from absolute black
  float visibility = smoothstep(0.0, 0.04, u_progress);
  O.rgb *= visibility;

  fragColor = O;
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh) || 'Unknown shader compile error';
    gl.deleteShader(sh);
    throw new Error(info);
  }
  return sh;
}

function createProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) || 'Unknown program link error';
    gl.deleteProgram(prog);
    throw new Error(info);
  }
  return prog;
}

export const AuroraFlux = forwardRef<AuroraFluxHandle, AuroraFluxProps>(
  function AuroraFlux(
    {
      fullScreen = false,
      pauseWhenHidden = true,
      pauseOnHover = false,
      mix = 0.5,
      className = '',
      style,
      ariaLabel = 'Aurora flux shader background',
      scrollBased = false,
      progress,
      disappearOnScroll = true,
      appearThreshold = 0.20,
      disappearThreshold = 0.78,
      onProgressChange,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const glRef = useRef<WebGL2RenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
    const rafRef = useRef<number | null>(null);
    const hoverRef = useRef(false);

    // uniforms
    const uTimeRef = useRef<WebGLUniformLocation | null>(null);
    const uLiveTimeRef = useRef<WebGLUniformLocation | null>(null);
    const uResRef = useRef<WebGLUniformLocation | null>(null);
    const uMixRef = useRef<WebGLUniformLocation | null>(null);
    const uProgressRef = useRef<WebGLUniformLocation | null>(null);
    const uAmbientTimeRef = useRef<WebGLUniformLocation | null>(null);

    // progress & time tracking refs
    const targetProgressRef = useRef(progress ?? 0);
    const currentProgressRef = useRef(progress ?? 0);
    const ambientTimeRef = useRef(0);
    const liveTimeRef = useRef(0);
    const lastTimeRef = useRef<number | null>(null);
    const onProgressChangeRef = useRef(onProgressChange);

    useImperativeHandle(ref, () => ({
      setProgress(p: number) {
        const clamped = Math.min(Math.max(p, 0), 1);
        targetProgressRef.current = clamped;
      },
      getCanvas() {
        return canvasRef.current;
      },
    }));

    useEffect(() => {
      onProgressChangeRef.current = onProgressChange;
    }, [onProgressChange]);

    // Keep target progress in sync if explicitly passed as prop
    useEffect(() => {
      if (progress !== undefined) {
        targetProgressRef.current = Math.min(Math.max(progress, 0), 1);
      }
    }, [progress]);

    // Scroll listener if internal scroll mode is requested
    useEffect(() => {
      if (!scrollBased || progress !== undefined) return;

      const computeScrollProgress = () => {
        const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const maxScroll = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight
        );
        const rawP = Math.min(Math.max(scrollY / maxScroll, 0), 1);

        let formedP = rawP;
        if (disappearOnScroll) {
          if (rawP <= appearThreshold) {
            formedP = rawP / Math.max(0.01, appearThreshold);
          } else if (rawP <= disappearThreshold) {
            formedP = 1.0;
          } else {
            const dissRatio = (rawP - disappearThreshold) / Math.max(0.01, 1.0 - disappearThreshold);
            formedP = Math.max(0, 1.0 - dissRatio);
          }
        }

        targetProgressRef.current = Math.min(Math.max(formedP, 0), 1);
      };

      computeScrollProgress();
      window.addEventListener('scroll', computeScrollProgress, { passive: true });
      window.addEventListener('resize', computeScrollProgress);

      return () => {
        window.removeEventListener('scroll', computeScrollProgress);
        window.removeEventListener('resize', computeScrollProgress);
      };
    }, [scrollBased, progress, disappearOnScroll, appearThreshold, disappearThreshold]);

    // handle DPR sizing
    const resize = () => {
      const canvas = canvasRef.current;
      const gl = glRef.current;
      if (!canvas || !gl) return;
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const displayW = fullScreen ? window.innerWidth : (canvas.clientWidth || window.innerWidth);
      const displayH = fullScreen ? window.innerHeight : (canvas.clientHeight || window.innerHeight);
      const w = Math.floor(displayW * dpr);
      const h = Math.floor(displayH * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      if (uResRef.current) gl.uniform3f(uResRef.current, w, h, 1);
    };

    const shouldRender = () =>
      !(pauseWhenHidden && document.visibilityState === 'hidden') &&
      !(pauseOnHover && hoverRef.current);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (fullScreen) {
        canvas.style.position = 'fixed';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '0';
        canvas.style.pointerEvents = pauseOnHover ? 'auto' : 'none';
      } else {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
      }

      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
      if (!gl) {
        console.error('WebGL2 not supported for AuroraFlux.');
        return;
      }
      glRef.current = gl;

      // program & quad
      const program = createProgram(gl, VERT, FRAG);
      programRef.current = program;
      gl.useProgram(program);

      const vao = gl.createVertexArray()!;
      vaoRef.current = vao;
      gl.bindVertexArray(vao);

      const quad = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
      ]);
      const vbo = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

      const aPosLoc = 0; // layout(location = 0)
      gl.enableVertexAttribArray(aPosLoc);
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

      // uniforms
      uTimeRef.current = gl.getUniformLocation(program, 'u_time');
      uLiveTimeRef.current = gl.getUniformLocation(program, 'u_live_time');
      uResRef.current = gl.getUniformLocation(program, 'u_resolution');
      uMixRef.current  = gl.getUniformLocation(program, 'u_mix');
      uProgressRef.current = gl.getUniformLocation(program, 'u_progress');
      uAmbientTimeRef.current = gl.getUniformLocation(program, 'u_ambient_time');

      if (uMixRef.current) gl.uniform1f(uMixRef.current, mix);

      resize();
      const onResize = () => resize();
      window.addEventListener('resize', onResize);
      const onVisibility = () => {
        if (shouldRender() && rafRef.current === null) loop(performance.now());
      };
      document.addEventListener('visibilitychange', onVisibility);

      // render loop
      const loop = (t: number) => {
        if (!shouldRender()) {
          rafRef.current = null;
          return;
        }
        if (!gl || !program) return;

        if (lastTimeRef.current === null) {
          lastTimeRef.current = t;
        }
        const dt = Math.min((t - lastTimeRef.current) * 0.001, 0.1);
        lastTimeRef.current = t;

        liveTimeRef.current += dt;

        // Smooth progress lerp for fluid motion
        const targetP = targetProgressRef.current;
        const delta = targetP - currentProgressRef.current;
        if (Math.abs(delta) > 0.0003) {
          currentProgressRef.current += delta * 0.14;
        } else {
          currentProgressRef.current = targetP;
        }
        const curP = currentProgressRef.current;

        if (onProgressChangeRef.current) {
          onProgressChangeRef.current(curP);
        }

        // Seamless steady-state rotation once formed (curP > 0.90)
        if (curP > 0.90) {
          const ambientFactor = (curP - 0.90) / 0.10;
          ambientTimeRef.current += dt * ambientFactor * 0.45;
        } else {
          ambientTimeRef.current = Math.max(0, ambientTimeRef.current - dt * 1.5);
        }

        gl.useProgram(program);

        if (uLiveTimeRef.current) {
          gl.uniform1f(uLiveTimeRef.current, liveTimeRef.current);
        }
        if (uProgressRef.current) {
          gl.uniform1f(uProgressRef.current, curP);
        }
        if (uAmbientTimeRef.current) {
          gl.uniform1f(uAmbientTimeRef.current, ambientTimeRef.current);
        }
        if (uTimeRef.current) {
          gl.uniform1f(uTimeRef.current, curP * 1.05 + ambientTimeRef.current);
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame((time: number) => {
        loop(time);
      });

      return () => {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (vaoRef.current) gl.deleteVertexArray(vaoRef.current);
        if (programRef.current) gl.deleteProgram(programRef.current);
        glRef.current = null;
        programRef.current = null;
        vaoRef.current = null;
        lastTimeRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullScreen, pauseWhenHidden, pauseOnHover, mix]);

    return (
      <canvas
        ref={canvasRef}
        id="aurora-flux-canvas"
        className={`mix-blend-screen pointer-events-none ${className}`}
        style={{ background: 'black', ...style }}
        aria-label={ariaLabel}
        role="img"
      />
    );
  }
);

export default AuroraFlux;
