import * as THREE from 'three';

export interface NumberedCardData {
  id: number;
  digit: string;
  tag: string;
  label: string;
  subtext: string;
  sentence: string;
}

export const NUMBERED_CARDS: NumberedCardData[] = [
  {
    id: 1,
    digit: '01',
    tag: 'CARD // 01',
    label: 'ORIGIN',
    subtext: 'Helical vector rail entry',
    sentence: 'This is number one.',
  },
  {
    id: 2,
    digit: '02',
    tag: 'CARD // 02',
    label: 'PERSPECTIVE',
    subtext: 'Cylindrical 3D coordinate',
    sentence: 'This is number two.',
  },
  {
    id: 3,
    digit: '03',
    tag: 'CARD // 03',
    label: 'MOTION',
    subtext: 'Inertial kinetic glide',
    sentence: 'This is number three.',
  },
  {
    id: 4,
    digit: '04',
    tag: 'CARD // 04',
    label: 'STRUCTURE',
    subtext: 'Geometric mesh ribbon',
    sentence: 'This is number four.',
  },
  {
    id: 5,
    digit: '05',
    tag: 'CARD // 05',
    label: 'HARMONY',
    subtext: 'Synchronized orbit arc',
    sentence: 'This is number five.',
  },
  {
    id: 6,
    digit: '06',
    tag: 'CARD // 06',
    label: 'VELOCITY',
    subtext: 'Momentum damping dynamic',
    sentence: 'This is number six.',
  },
  {
    id: 7,
    digit: '07',
    tag: 'CARD // 07',
    label: 'INFINITY',
    subtext: 'Continuous vertical wrap',
    sentence: 'This is number seven.',
  },
];

/**
 * Creates the smoked glass backplate texture (background obsidian gradient, gloss sheen, sharp borders, grid).
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

  ctx.clearRect(0, 0, width, height);

  const padding = 20;
  const cardW = width - padding * 2;
  const cardH = height - padding * 2;

  // --- 1. Smoked Glass Card Body (Sharp 90-degree edges) ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding, padding, cardW, cardH);
  ctx.clip();

  // Translucent dark glass gradient fill (rich smoked obsidian glass)
  const glassGrad = ctx.createLinearGradient(padding, padding, width - padding, height - padding);
  glassGrad.addColorStop(0, 'rgba(28, 30, 38, 0.76)');
  glassGrad.addColorStop(0.4, 'rgba(16, 17, 22, 0.86)');
  glassGrad.addColorStop(1, 'rgba(8, 8, 12, 0.94)');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(padding, padding, cardW, cardH);

  // Top specular reflection highlight (gloss sheen across top left)
  const sheenGrad = ctx.createLinearGradient(padding, padding, padding + cardW * 0.75, padding + cardH * 0.5);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  sheenGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.06)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = sheenGrad;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding + cardW, padding);
  ctx.lineTo(padding, padding + cardH * 0.75);
  ctx.closePath();
  ctx.fill();

  // Interior cyber grid pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = padding + gridSize; x < width - padding; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }
  for (let y = padding + gridSize; y < height - padding; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Top gloss highlight bar (sharp straight line)
  const topBarGrad = ctx.createLinearGradient(padding, padding, width - padding, padding);
  topBarGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  topBarGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.65)');
  topBarGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
  ctx.strokeStyle = topBarGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding + 1);
  ctx.lineTo(width - padding, padding + 1);
  ctx.stroke();

  ctx.restore();

  // --- 2. Crisp Sharp Etched Glass Borders ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(padding, padding, cardW, cardH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.rect(padding + 10, padding + 10, cardW - 20, cardH - 20);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Creates the floating 3D content texture containing the Hero Number, "This is number X" sentence,
 * indicators, and labels that float in front of the card along the Z axis (translateZ).
 * Shadow on the numbers is completely removed.
 */
export function createCardFloatingContentTexture(card: NumberedCardData, cycleNumber: number = 1): THREE.CanvasTexture {
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

  const padding = 20;

  // --- 1. Header Badges & Indicators ---
  // Status indicator dot (Amber)
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(padding + 36, padding + 46, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tag
  ctx.save();
  ctx.font = '600 16px "SF Mono", "Fira Code", monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const cycleTag = `${card.tag} • CYCLE 0${cycleNumber}`;
  ctx.fillText(cycleTag, padding + 54, padding + 46);

  // Brand tag on top right
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.textAlign = 'right';
  ctx.fillText('VENTRIX // 3D STREAM', width - padding - 36, padding + 46);
  ctx.restore();

  // --- 2. Hero 3D Digit - SHADOW COMPLETELY REMOVED ---
  ctx.save();
  ctx.font = '800 205px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Plus Jakarta Sans", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Crisp gradient fill with ZERO shadow
  const textGrad = ctx.createLinearGradient(width / 2, height / 2 - 110, width / 2, height / 2 + 80);
  textGrad.addColorStop(0, '#FFFFFF');
  textGrad.addColorStop(0.7, '#E2E8F0');
  textGrad.addColorStop(1, '#94A3B8');
  ctx.fillStyle = textGrad;
  ctx.fillText(card.digit, width / 2, height / 2 - 15);
  ctx.restore();

  // --- 3. Floating Sentence Below Number: "This is number X." ---
  ctx.save();
  const pillText = card.sentence;
  ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textMetrics = ctx.measureText(pillText);
  const pillW = textMetrics.width + 36;
  const pillH = 34;
  const pillX = width / 2 - pillW / 2;
  const pillY = height / 2 + 105;

  // Sharp rectangular container for sentence
  ctx.beginPath();
  ctx.rect(pillX, pillY, pillW, pillH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Sentence text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, width / 2, pillY + pillH / 2);
  ctx.restore();

  // --- 4. Bottom Labels & Micro-Counters ---
  ctx.save();
  ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.label, padding + 36, height - padding - 56);

  ctx.font = '400 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(card.subtext, padding + 36, height - padding - 30);

  // Bottom right index counter
  ctx.font = '700 16px "SF Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.textAlign = 'right';
  ctx.fillText(`[ ${card.digit} / 07 ]`, width - padding - 36, height - padding - 40);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Backward compatibility function returning complete card texture
 */
export function createBlackCardTexture(card: NumberedCardData): THREE.CanvasTexture {
  return createCardFloatingContentTexture(card);
}
