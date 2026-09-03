import { useEffect, useRef, type CSSProperties } from "react";
import * as THREE from "three";
import {
  NUMBERED_CARDS,
  createGlassBackplateTexture,
  createCardFloatingContentTexture,
  type NumberedCardData,
} from "./cardTextures";
import "./gallery.css";

export interface StreamProgressInfo {
  scrollOffset: number;
  maxScrollOffset: number;
  progress: number; // 0.0 to 1.0
  activeCardIndex: number; // 0 to TOTAL_PANELS - 1
  activeCard: NumberedCardData | null;
  activeCycle: number; // 1 to cycles
  cardInCycle: number; // 1 to 7
  isWidescreenInitial: boolean;
  isConcluded: boolean;
}

export type GalleryProps = {
  speed?: number; // Scroll sensitivity / speed
  damping?: number; // Fluid scroll momentum damping (e.g. 0.85 - 0.985)
  translucency?: number; // Glass opacity / translucency (0.15 - 1.0)
  parallax?: number; // 3D mouse parallax tilt intensity (0 - 2.5)
  cylinderParallax?: boolean; // Toggle 3D parallax on the entire cylinder
  cardDepth?: number; // 3D translateZ distance in px (0 - 100)
  cycles?: number; // Number of cycles (default 4)
  autoScroll?: boolean; // Auto stream playback
  scale?: number;
  opacity?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
  wireframe?: boolean;
  onPanelClick?: (card: NumberedCardData) => void;
  onProgressChange?: (info: StreamProgressInfo) => void;
  resetTrigger?: number;
  stepNextTrigger?: number;
  stepPrevTrigger?: number;
  scrollProgress?: number;
  renderHalf?: 'front' | 'back' | 'all';
};

export const GALLERY_DEFAULTS = {
  speed: 0.3, // Slow, elegant, controlled scroll sensitivity
  damping: 0.98, // Cinematic fluid momentum glide
  translucency: 0.55, // Frosted glass translucency
  parallax: 0, // Responsive 3D perspective parallax tilt
  cylinderParallax: false, // Entire cylinder 3D parallax
  cardDepth: 100, // 3D translateZ depth (100px)
  cycles: 10, // Fixed 10 complete cycles
  autoScroll: false,
  scale: 1.00,
  opacity: 1,
  saturation: 1,
  brightness: 1,
} as const satisfies Required<
  Pick<
    GalleryProps,
    | "speed"
    | "damping"
    | "translucency"
    | "parallax"
    | "cylinderParallax"
    | "cardDepth"
    | "cycles"
    | "autoScroll"
    | "scale"
    | "opacity"
    | "saturation"
    | "brightness"
  >
>;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function Gallery({
  speed = GALLERY_DEFAULTS.speed,
  damping = GALLERY_DEFAULTS.damping,
  translucency = GALLERY_DEFAULTS.translucency,
  parallax = GALLERY_DEFAULTS.parallax,
  cylinderParallax = GALLERY_DEFAULTS.cylinderParallax,
  cardDepth = GALLERY_DEFAULTS.cardDepth,
  cycles = GALLERY_DEFAULTS.cycles,
  autoScroll = GALLERY_DEFAULTS.autoScroll,
  scale = GALLERY_DEFAULTS.scale,
  opacity = GALLERY_DEFAULTS.opacity,
  saturation = GALLERY_DEFAULTS.saturation,
  brightness = GALLERY_DEFAULTS.brightness,
  className = "",
  style,
  interactive = true,
  wireframe = false,
    onPanelClick,
    onProgressChange,
    resetTrigger,
    stepNextTrigger,
    stepPrevTrigger,
    scrollProgress,
    renderHalf = 'all',
  }: GalleryProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Mutable settings ref for 60fps render loop
    const settingsRef = useRef({
      speed,
      damping,
      translucency,
      parallax,
      cylinderParallax,
      cardDepth,
      cycles,
      autoScroll,
      scale,
      interactive,
      wireframe,
      onPanelClick,
      onProgressChange,
      scrollProgress,
      renderHalf,
    });
  
    const scrollOffsetRef = useRef(0);
    const scrollVelocityRef = useRef(0);
  
    useEffect(() => {
      settingsRef.current = {
        speed,
        damping,
        translucency,
        parallax,
        cylinderParallax,
        cardDepth,
        cycles,
        autoScroll,
        scale,
        interactive,
        wireframe,
        onPanelClick,
        onProgressChange,
        scrollProgress,
        renderHalf,
      };
    }, [
      speed,
      damping,
      translucency,
      parallax,
      cylinderParallax,
      cardDepth,
      cycles,
      autoScroll,
      scale,
      interactive,
      wireframe,
      onPanelClick,
      onProgressChange,
      scrollProgress,
      renderHalf,
    ]);

  // Handle external reset trigger (Return to Initial Widescreen)
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      scrollOffsetRef.current = 0;
      scrollVelocityRef.current = 0;
    }
  }, [resetTrigger]);

  // Handle step next trigger
  useEffect(() => {
    if (stepNextTrigger !== undefined && stepNextTrigger > 0) {
      scrollVelocityRef.current += 0.85;
    }
  }, [stepNextTrigger]);

  // Handle step prev trigger
  useEffect(() => {
    if (stepPrevTrigger !== undefined && stepPrevTrigger > 0) {
      scrollVelocityRef.current -= 0.85;
    }
  }, [stepPrevTrigger]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    // WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);

    if ('outputColorSpace' in renderer) {
      (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer) {
      (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 32; // Shifted back to show full front view

    const gallery = new THREE.Group();
    scene.add(gallery);

    // Setup Layout Variables
    const currentRadius = 15; // 1.25x larger so text is encapsulated within the cylinder
    const CARDS_PER_CYCLE = 6;
    const ARC_SPAN = (Math.PI * 2) / CARDS_PER_CYCLE; // Angle per card slot
    
    // Width along the arc of the cylinder. 
    // Increased horizontal gap by 1.5x (gap was 0.35, now 0.525, so span is 0.475).
    const cardArcSpan = ARC_SPAN * 0.475;
    const cardWidth = currentRadius * cardArcSpan;
    // We maintain a 16:9 aspect ratio
    const cardHeight = cardWidth * (9 / 16);

    // Geometries:
    // Base backplate geometry centered symmetrically on angle 0
    const backplateGeometry = new THREE.CylinderGeometry(
      currentRadius, currentRadius, cardHeight, 64, 1, true, -cardArcSpan / 2, cardArcSpan
    );
    // Floating 3D content layer geometry slightly larger radius
    const contentGeometry = new THREE.CylinderGeometry(
      currentRadius + 0.002, currentRadius + 0.002, cardHeight, 64, 1, true, -cardArcSpan / 2, cardArcSpan
    );

    let disposed = false;
    let frame = 0;
    
    const ringRotationOffsets = new Float32Array(20); // Max 20 cycles supported

    let hostVisible = true;
    let documentVisible = !document.hidden;

    // Stream Setup: 10 cycles of cards
    const NUM_CYCLES = Math.max(1, Math.min(20, settingsRef.current.cycles || 10));
    const TOTAL_PANELS = NUM_CYCLES * CARDS_PER_CYCLE; 
    
    // Vertical spacing (tripled the vertical gap)
    const PANEL_SPACING_Y = cardHeight * 3.0; 
    
    // We want the cylinder to appear from the BOTTOM and go towards the TOP on scroll down.
    // In ThreeJS, positive Y is UP. So cards should start at a negative Y (below viewport) and move to positive Y.
    const START_Y = -12.5; // Staged below bottom viewport edge at scrollOffset = 0 (clean white screen)
    
    // Calculate total height needed.
    const TOTAL_Y_STEPS = NUM_CYCLES;
    const MAX_SCROLL_OFFSET = Math.abs(START_Y) + (TOTAL_Y_STEPS - 1) * PANEL_SPACING_Y + 12.5; // Exits top (+12.5)

    // Create invisible hit meshes for each ring to detect hover anywhere on the ring
    const ringHitMeshes: THREE.Mesh[] = [];
    const ringHitGeom = new THREE.CylinderGeometry(currentRadius, currentRadius, cardHeight, 32, 1, true);
    const ringHitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }); // invisible but catches raycasts on both front and back faces
    
    for (let i = 0; i < NUM_CYCLES; i++) {
      const mesh = new THREE.Mesh(ringHitGeom, ringHitMat);
      mesh.userData = { ringIndex: i };
      gallery.add(mesh);
      ringHitMeshes.push(mesh);
    }

    // Generate high-resolution procedural textures
    const backplateTextures = NUMBERED_CARDS.map((card) => createGlassBackplateTexture(card));
    const contentTextures: THREE.CanvasTexture[] = [];
    for (let cycle = 1; cycle <= NUM_CYCLES; cycle++) {
      NUMBERED_CARDS.forEach((card) => {
        contentTextures.push(createCardFloatingContentTexture(card, cycle));
      });
    }

    interface PanelItem {
      group: THREE.Group;
      backplateMesh: THREE.Mesh;
      contentMesh: THREE.Mesh;
      backplateMat: THREE.MeshBasicMaterial;
      contentMat: THREE.MeshBasicMaterial;
      card: NumberedCardData;
      index: number;
      cycleNumber: number;
      cardInCycle: number;
    }

    const panels: PanelItem[] = [];
    const interactiveMeshes: THREE.Mesh[] = [];

    for (let index = 0; index < TOTAL_PANELS; index++) {
      const card = NUMBERED_CARDS[index % NUMBERED_CARDS.length];
      const cycleNumber = Math.floor(index / CARDS_PER_CYCLE) + 1;
      const cardInCycle = (index % CARDS_PER_CYCLE) + 1;
      const backplateTex = backplateTextures[index % backplateTextures.length];
      const contentTex = contentTextures[index] || contentTextures[index % contentTextures.length];

      // 1. Smoked glass backplate material
      const backplateMat = new THREE.MeshBasicMaterial({
        map: backplateTex,
        opacity: clamp(settingsRef.current.translucency, 0.1, 1.0),
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
        depthWrite: false, // Ensures layered glass renders seamlessly
        wireframe: settingsRef.current.wireframe,
      });

      // 2. Floating 3D content material (number, sentence, tags)
      const contentMat = new THREE.MeshBasicMaterial({
        map: contentTex,
        opacity: 1.0,
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
        depthWrite: false,
        wireframe: settingsRef.current.wireframe,
      });

      const panelGroup = new THREE.Group();
      const backplateMesh = new THREE.Mesh(backplateGeometry, backplateMat);
      const contentMesh = new THREE.Mesh(contentGeometry, contentMat);

      panelGroup.add(backplateMesh);
      panelGroup.add(contentMesh);

      // Initial position staged above top of screen
      panelGroup.position.y = START_Y + index * PANEL_SPACING_Y;
      panelGroup.visible = false;

      panelGroup.userData = { index, card, cycleNumber, cardInCycle };
      backplateMesh.userData = { index, card, cycleNumber, cardInCycle };
      contentMesh.userData = { index, card, cycleNumber, cardInCycle };

      gallery.add(panelGroup);
      panels.push({
        group: panelGroup,
        backplateMesh,
        contentMesh,
        backplateMat,
        contentMat,
        card,
        index,
        cycleNumber,
        cardInCycle,
      });

      interactiveMeshes.push(backplateMesh, contentMesh);
    }

    // Raycaster for card clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Parallax Coordinates & Lerp States
    let pointerNormX = 0;
    let pointerNormY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let currentRotZ = 0;
    let currentCamX = 0;
    let currentCamY = 0;

    // Scroll & Inertia State Tracking
    let isDragging = false;
    let pointerStartY = 0;
    let pointerStartX = 0;
    let isPointerOverCanvas = false;
    let lastPointerY = 0;
    let lastPointerTime = 0;
    let recentVelocities: { v: number; t: number }[] = [];
    let lastReportTime = 0;

    const render = () => {
      const safeScale = clamp(settingsRef.current.scale, 0.5, 2.0);
      const currentTranslucency = clamp(settingsRef.current.translucency, 0.1, 1.0);
      const currentDamping = clamp(settingsRef.current.damping, 0.70, 0.995);
      const safeParallax = clamp(settingsRef.current.parallax, 0, 3.0);
      const safeCardDepth = clamp(settingsRef.current.cardDepth, 0, 100);
      const zTranslateDistance = (safeCardDepth / 100) * 0.40; // 3D translateZ separation

      // Real-time material updates (opacity & wireframe)
      panels.forEach(({ backplateMat, contentMat }) => {
        if (backplateMat.opacity !== currentTranslucency) {
          backplateMat.opacity = currentTranslucency;
        }
        if (backplateMat.wireframe !== settingsRef.current.wireframe) {
          backplateMat.wireframe = settingsRef.current.wireframe;
        }
        if (contentMat.wireframe !== settingsRef.current.wireframe) {
          contentMat.wireframe = settingsRef.current.wireframe;
        }
      });

      // Auto Stream Playback or External Scroll mapping
      if (settingsRef.current.scrollProgress !== undefined) {
        // Direct lerp — no spring, no velocity, no overshoot
        const targetOffset = settingsRef.current.scrollProgress * MAX_SCROLL_OFFSET;
        const lerpFactor = 0.08;
        scrollOffsetRef.current += (targetOffset - scrollOffsetRef.current) * lerpFactor;
        // Snap when close enough to avoid perpetual micro-drift
        if (Math.abs(targetOffset - scrollOffsetRef.current) < 0.01) {
          scrollOffsetRef.current = targetOffset;
        }
        scrollVelocityRef.current = 0; // bypass velocity system entirely
      } else {
        if (settingsRef.current.autoScroll && !isDragging) {
          if (scrollOffsetRef.current < MAX_SCROLL_OFFSET) {
            scrollVelocityRef.current += 0.007;
          }
        }

        // Fluid scroll momentum glide with elastic spring boundaries
        let currentOffset = scrollOffsetRef.current;
        let currentVel = scrollVelocityRef.current;

        // Elastic resistance at top
        if (currentOffset < 0) {
          currentOffset += (0 - currentOffset) * 0.14;
          currentVel *= 0.72;
        }
        // Elastic resistance at bottom
        else if (currentOffset > MAX_SCROLL_OFFSET) {
          currentOffset += (MAX_SCROLL_OFFSET - currentOffset) * 0.14;
          currentVel *= 0.72;
        }

        if (Math.abs(currentVel) > 0.000005) {
          currentOffset += currentVel;
          currentVel *= currentDamping;
          if (Math.abs(currentVel) < 0.00001) {
            currentVel = 0;
          }
        }

        scrollOffsetRef.current = currentOffset;
        scrollVelocityRef.current = currentVel;
      }

      // Read the current offset for downstream positioning (works for both paths)
      const currentOffset = scrollOffsetRef.current;

      // Update raycaster for independent ring hover detection
      if (isPointerOverCanvas) {
        mouse.x = pointerNormX;
        mouse.y = pointerNormY;
      } else {
        mouse.x = -1000;
        mouse.y = -1000;
      }
      raycaster.setFromCamera(mouse, camera);
      
      // Update the invisible ring hit meshes positions to match the actual rings
      for (let i = 0; i < TOTAL_Y_STEPS; i++) {
        ringHitMeshes[i].position.y = START_Y - (i * PANEL_SPACING_Y) + currentOffset;
      }
      
      const ringIntersects = raycaster.intersectObjects(ringHitMeshes, false);
      let hoveredRingIndex = -1;
      if (ringIntersects.length > 0) {
        const hit = ringIntersects[0].object;
        if (hit.userData && hit.userData.ringIndex !== undefined) {
           hoveredRingIndex = hit.userData.ringIndex;
        }
      }

      // Check card intersections just for updating the pointer cursor
      const cardIntersects = raycaster.intersectObjects(interactiveMeshes, false);
      
      // Apply constant slow revolution.
      // If a ring is hovered anywhere on its band, it revolves even slower.
      const baseRotationSpeed = 0.0015;
      const hoveredRotationSpeed = 0.0006; // Slowed down less extremely

      for (let i = 0; i < TOTAL_Y_STEPS; i++) {
        if (i === hoveredRingIndex) {
          ringRotationOffsets[i] += hoveredRotationSpeed;
        } else {
          ringRotationOffsets[i] += baseRotationSpeed;
        }
      }

      // Sequential Card Stream: Cards enter from bottom, travel through center, exit above
      panels.forEach(({ group, contentMesh, index }) => {
        const ringIndex = Math.floor(index / CARDS_PER_CYCLE);
        const cardInRing = index % CARDS_PER_CYCLE;
        
        const targetY = START_Y - (ringIndex * PANEL_SPACING_Y) + currentOffset;
        
        // Cards are evenly spaced in a circle. Add a slight dynamic spin to the whole ring as it moves up,
        // plus the constant slow revolution.
        const dynamicAngle = (cardInRing * ARC_SPAN) + (targetY * 0.04) + ringRotationOffsets[ringIndex]; 
        
        // Frustum culling: Render cards within visible 3D cylindrical volume (front, sides, and back)
        const isVisible = targetY >= -50 && targetY <= 50;
        
        let renderHalfVisible = true;
        if (settingsRef.current.renderHalf !== 'all') {
          const normalizedAngle = ((dynamicAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const isFront = normalizedAngle <= Math.PI / 2 || normalizedAngle >= (3 * Math.PI) / 2;
          
          if (settingsRef.current.renderHalf === 'front' && !isFront) {
            renderHalfVisible = false;
          } else if (settingsRef.current.renderHalf === 'back' && isFront) {
            renderHalfVisible = false;
          }
        }

        group.visible = isVisible && renderHalfVisible;

        if (group.visible) {
          group.position.y = targetY;

          // Full 360-degree cylindrical helical rotation:
          const contentRadialScale = 1.0 + (zTranslateDistance / 4.0);
          contentMesh.scale.set(contentRadialScale, 1.0 + (zTranslateDistance * 0.04), contentRadialScale);

          // Cylinder mapping: aligned around cylinder axis
          group.rotation.x = 0;
          group.rotation.z = 0;
          group.rotation.y = dynamicAngle;
          group.scale.setScalar(1.0);

          contentMesh.position.x = 0;
          contentMesh.position.y = 0;
        }
      });

      // Removed 3D Cylinder Parallax Tilt
      gallery.rotation.set(0, 0, 0);
      gallery.position.y = 0;
      gallery.scale.setScalar(safeScale);

      camera.position.x = 0;
      camera.position.y = 0;
      camera.position.z = 32;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      // Report Stream Telemetry & Progress
      const now = performance.now();
      if (now - lastReportTime > 80 && settingsRef.current.onProgressChange) {
        lastReportTime = now;
        const activeIndex = clamp(
          Math.round((currentOffset - START_Y) / PANEL_SPACING_Y),
          0,
          TOTAL_PANELS - 1
        );
        const activeCycle = Math.floor(activeIndex / CARDS_PER_CYCLE) + 1;
        const activeCardInCycle = (activeIndex % CARDS_PER_CYCLE) + 1;
        const activeCard = NUMBERED_CARDS[activeIndex % CARDS_PER_CYCLE] || null;
        const isWidescreenInitial = currentOffset <= 1.0;
        const isConcluded = currentOffset >= MAX_SCROLL_OFFSET - 1.2;
        const progress = clamp(currentOffset / MAX_SCROLL_OFFSET, 0, 1);

        settingsRef.current.onProgressChange({
          scrollOffset: currentOffset,
          maxScrollOffset: MAX_SCROLL_OFFSET,
          progress,
          activeCardIndex: activeIndex,
          activeCard,
          activeCycle,
          cardInCycle: activeCardInCycle,
          isWidescreenInitial,
          isConcluded,
        });
      }
    };

    const tick = () => {
      if (disposed || !hostVisible || !documentVisible) {
        frame = 0;
        return;
      }
      render();
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (!frame && hostVisible && documentVisible) frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };

    // --- Wheel / Trackpad Scroll with Fluid Momentum ---
    const onWheel = (e: WheelEvent) => {
      if (!settingsRef.current.interactive) return;
      e.preventDefault();
      
      const currentSensitivity = clamp(settingsRef.current.speed, 0.005, 1.0);
      
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= 200;

      // Wheel down (+delta) sends cards descending from top to bottom
      const impulse = (delta * 0.0007) * (currentSensitivity * 10);
      scrollVelocityRef.current += impulse;
    };

    // --- Pointer Movement for 3D Parallax & Drag Scrolling ---
    const onGlobalPointerMove = (e: PointerEvent) => {
      if (!settingsRef.current.interactive) return;

      // Always calculate normalized coordinates for 3D perspective parallax
      pointerNormX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerNormY = -((e.clientY / window.innerHeight) * 2 - 1);
      
      // Determine if the pointer is actually over the canvas and not the text overlay UI
      isPointerOverCanvas = (e.target as HTMLElement)?.tagName?.toLowerCase() === 'canvas';

      if (isDragging) {
        const now = performance.now();
        const dt = Math.max(1, now - lastPointerTime);
        const dy = -(e.clientY - lastPointerY); // Dragging up advances stream downwards
        
        const currentSensitivity = clamp(settingsRef.current.speed, 0.005, 1.0);
        const moveDelta = (dy * 0.0035) * (currentSensitivity * 10);

        scrollOffsetRef.current += moveDelta;

        const instantaneousVelocity = (moveDelta / dt) * 16.6;
        recentVelocities.push({ v: instantaneousVelocity, t: now });
        if (recentVelocities.length > 5) {
          recentVelocities.shift();
        }

        lastPointerY = e.clientY;
        lastPointerTime = now;
      }
    };

    // --- Pointer / Touch Push & Glide Interaction ---
    const onPointerDown = (e: PointerEvent) => {
      if (!settingsRef.current.interactive) return;
      isDragging = true;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      lastPointerY = e.clientY;
      lastPointerTime = performance.now();
      recentVelocities = [];

      pointerNormX = (e.clientX / window.innerWidth) * 2 - 1;
      pointerNormY = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;

      // Transfer release momentum scaled by damping
      const now = performance.now();
      const validSamples = recentVelocities.filter((s) => now - s.t < 120);
      
      if (validSamples.length > 0) {
        const avgVelocity = validSamples.reduce((sum, s) => sum + s.v, 0) / validSamples.length;
        const currentDamping = clamp(settingsRef.current.damping, 0.70, 0.995);
        scrollVelocityRef.current = avgVelocity * (currentDamping * 1.55);
      }

      // Check click for inspecting card
      const movedDist = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);
      if (movedDist < 5 && settingsRef.current.onPanelClick) {
        const bounds = host.getBoundingClientRect();
        mouse.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
        mouse.y = -(((e.clientY - bounds.top) / bounds.height) * 2 - 1);

        raycaster.setFromCamera(mouse, camera);
        const visibleMeshes = interactiveMeshes.filter(m => m.parent && m.parent.visible);
        const intersects = raycaster.intersectObjects(visibleMeshes);
        if (intersects.length > 0) {
          const hit = intersects[0].object as THREE.Mesh;
          const uData = hit.userData;
          if (uData.card) {
            settingsRef.current.onPanelClick(uData.card);
          }
        }
      }
    };

    const onPointerCancel = () => {
      isDragging = false;
    };

    // Keyboard Arrow navigation (Up/Down)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        scrollVelocityRef.current += 0.55;
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        scrollVelocityRef.current -= 0.55;
      } else if (e.key === "Home") {
        scrollOffsetRef.current = 0;
        scrollVelocityRef.current = 0;
      }
    };

    const hostElem = host;
    hostElem.addEventListener("wheel", onWheel, { passive: false });
    hostElem.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      hostVisible = entry?.isIntersecting ?? true;
      if (hostVisible) start();
      else stop();
    });

    const handleVisibility = () => {
      documentVisible = !document.hidden;
      if (documentVisible) start();
      else stop();
    };

    resizeObserver.observe(host);
    intersectionObserver.observe(host);
    document.addEventListener("visibilitychange", handleVisibility);
    
    resize();
    start();

    return () => {
      disposed = true;
      stop();
      hostElem.removeEventListener("wheel", onWheel);
      hostElem.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);

      gallery.clear();
      backplateGeometry.dispose();
      contentGeometry.dispose();
      panels.forEach(({ backplateMat, contentMat }) => {
        backplateMat.dispose();
        contentMat.dispose();
      });
      backplateTextures.forEach((texture) => texture.dispose());
      contentTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      id="gallery-container"
      className={`threeui-background gallery cursor-ns-resize ${className}`}
      data-mode="light"
      role="img"
      aria-label="Sequential 3D black numbered glass card stream"
      style={style}
    >
      <canvas
        ref={canvasRef}
        id="gallery-webgl-canvas"
        className="gallery__canvas"
        aria-hidden="true"
        style={{
          opacity: clamp(opacity, 0.05, 1),
          filter: `saturate(${clamp(saturation, 0, 2)}) brightness(${clamp(brightness, 0.35, 1.65)})`,
        }}
      />
    </div>
  );
}

