import * as THREE from 'three';
import offeringContent from '../../../../public/content/offering.json';

export interface NumberedCardData {
  id: number;
  digit: string;
  title: string;
  centerConcept: string;
  description: string;
  whatWeCanBuild: string[];
  typicalApplications: string[];
  applicationsText?: string;
  video: string;
  // Legacy compatibility fields
  tag?: string;
  label?: string;
  subtext?: string;
  sentence?: string;
}

export const OFFERING_CARDS: NumberedCardData[] = offeringContent.cards.map((c) => ({
  ...c,
  tag: `CARD // ${c.digit}`,
  label: c.title,
  subtext: c.centerConcept,
  sentence: c.centerConcept,
}));

// Backward compatibility alias
export const NUMBERED_CARDS: NumberedCardData[] = OFFERING_CARDS;

// In-memory cache for extracted video first-frame canvases
const videoThumbnailCanvasCache = new Map<string, HTMLCanvasElement>();
const videoThumbnailListeners = new Map<string, Array<(canvas: HTMLCanvasElement) => void>>();

/**
 * Extracts the exact first frame of a video using a browser video element and renders it to a canvas.
 */
export function loadVideoFirstFrame(
  videoUrl: string,
  onLoaded: (canvas: HTMLCanvasElement) => void
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const cached = videoThumbnailCanvasCache.get(videoUrl);
  if (cached) {
    onLoaded(cached);
    return;
  }

  const existingListeners = videoThumbnailListeners.get(videoUrl);
  if (existingListeners) {
    existingListeners.push(onLoaded);
    return;
  }

  videoThumbnailListeners.set(videoUrl, [onLoaded]);

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = videoUrl;

  let resolved = false;
  const finish = () => {
    if (resolved) return;
    resolved = true;
    try {
      const width = 1024;
      const height = 576;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
      }
      videoThumbnailCanvasCache.set(videoUrl, canvas);
      const listeners = videoThumbnailListeners.get(videoUrl) || [];
      listeners.forEach((fn) => fn(canvas));
      videoThumbnailListeners.delete(videoUrl);
    } catch {
      // Ignore extraction error; fallback obsidian glass remains
    }
    cleanup();
  };

  const onLoadedData = () => {
    video.currentTime = 0.001;
  };

  const onSeeked = () => {
    finish();
  };

  const onError = () => {
    cleanup();
    videoThumbnailListeners.delete(videoUrl);
  };

  const cleanup = () => {
    video.removeEventListener('loadeddata', onLoadedData);
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('error', onError);
  };

  video.addEventListener('loadeddata', onLoadedData);
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('error', onError);

  video.load();
}

/**
 * Draws the glass backplate including video thumbnail first frame, smoked obsidian tint,
 * gloss sheen, and sharp etched glass borders.
 */
function drawGlassBackplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  videoFrameCanvas?: HTMLCanvasElement
): void {
  ctx.clearRect(0, 0, width, height);

  // Solid dark background fallback before video frame loads
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, width, height);

  // Draw video thumbnail in its 100% natural, actual colors (edge-to-edge, un-dimmed, no borders/overlays)
  if (videoFrameCanvas) {
    ctx.drawImage(videoFrameCanvas, 0, 0, width, height);
  }
}

/**
 * Creates the smoked glass backplate texture containing the video thumbnail first frame.
 */
export function createGlassBackplateTexture(card: NumberedCardData): THREE.CanvasTexture {
  const width = 1024;
  const height = 576;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Draw initial state (cached frame if ready, or obsidian gradient)
  const cachedFrame = videoThumbnailCanvasCache.get(card.video);
  drawGlassBackplate(ctx, width, height, cachedFrame);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;

  // If frame wasn't cached yet, fetch it asynchronously and update texture
  if (!cachedFrame && card.video) {
    loadVideoFirstFrame(card.video, (frameCanvas) => {
      drawGlassBackplate(ctx, width, height, frameCanvas);
      texture.needsUpdate = true;
    });
  }

  return texture;
}

/**
 * Creates the floating content texture.
 * - When not hovered (isHovered = false): Numbering removed entirely (clean solid card).
 * - When hovered (isHovered = true): Displays ONLY the centered text concept matching the
 *   sentence font style in other sections, with zero shadows, for mix-blend-difference visibility.
 */
export function createCardFloatingContentTexture(
  card: NumberedCardData,
  isHovered: boolean = false
): THREE.CanvasTexture {
  const width = 1024;
  const height = 576;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.clearRect(0, 0, width, height);

  if (isHovered) {
    // --- Hovered State: Centered Concept in sentence font, no shadow ---
    ctx.save();
    ctx.font = '300 38px "Montserrat", "Outfit", -apple-system, BlinkMacSystemFont, sans-serif';
    if ('letterSpacing' in ctx) {
      (ctx as any).letterSpacing = '0.04em';
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadows completely removed as requested
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0;

    // Check if text wrapping is needed for longer concepts
    const text = (card.centerConcept || '').toUpperCase();
    const words = text.split(' ');

    if (text.length > 20 && words.length >= 3) {
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');
      ctx.fillText(line1, width / 2, height / 2 - 24);
      ctx.fillText(line2, width / 2, height / 2 + 24);
    } else {
      ctx.fillText(text, width / 2, height / 2);
    }
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Ring card assignment generator.
 * For each ring:
 * - 6 cards per ring.
 * - Ring 0 picks 6 cards.
 * - Ring 1 contains the 4 cards that were NOT in Ring 0 + 2 cards from Ring 0 (shuffled into slots avoiding collision).
 * - Each consecutive ring brings in the 4 cards missing from the prior ring and avoids repeating slot layouts.
 */
export function generateRingCardAssignments(
  totalRings: number,
  allCards: NumberedCardData[],
  cardsPerRing: number = 6
): NumberedCardData[][] {
  const rings: NumberedCardData[][] = [];
  const n = allCards.length; // 10

  let currentCardIndices = [0, 1, 2, 3, 4, 5];
  let prevSlots: number[] = [];

  for (let r = 0; r < totalRings; r++) {
    let chosenIndices: number[];
    if (r === 0) {
      chosenIndices = [...currentCardIndices];
    } else {
      // Find the 4 unselected cards from previous ring
      const unselected: number[] = [];
      for (let i = 0; i < n; i++) {
        if (!currentCardIndices.includes(i)) {
          unselected.push(i);
        }
      }
      // Carry over 2 cards from previous ring rotating by ring index
      const carryOverStart = (r * 2) % currentCardIndices.length;
      const carriedOver = [
        currentCardIndices[carryOverStart % currentCardIndices.length],
        currentCardIndices[(carryOverStart + 1) % currentCardIndices.length],
      ];
      chosenIndices = [...unselected, ...carriedOver];
      currentCardIndices = chosenIndices;
    }

    // Shuffle slot placement to ensure cards don't stack directly under previous ring cards
    const slots: number[] = new Array(cardsPerRing).fill(-1);
    const shift = (r * 3 + 1) % chosenIndices.length;
    const shuffled: number[] = [];
    for (let i = 0; i < chosenIndices.length; i++) {
      shuffled.push(chosenIndices[(i + shift) % chosenIndices.length]);
    }

    for (let s = 0; s < cardsPerRing; s++) {
      let candidateIdx = shuffled.findIndex((cIdx) => prevSlots[s] !== cIdx);
      if (candidateIdx === -1) candidateIdx = 0;
      slots[s] = shuffled.splice(candidateIdx, 1)[0];
    }

    prevSlots = [...slots];
    rings.push(slots.map((idx) => allCards[idx]));
  }

  return rings;
}

/**
 * Backward compatibility function returning complete card texture.
 */
export function createBlackCardTexture(card: NumberedCardData): THREE.CanvasTexture {
  return createCardFloatingContentTexture(card, false);
}
