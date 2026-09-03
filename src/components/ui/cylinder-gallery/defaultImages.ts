// Curated high-aesthetic editorial & architectural photography URLs + procedural fallbacks

export const DEFAULT_GALLERY_IMAGES = [
  // 1. Warm brutalist & minimalist architectural curves
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  // 2. Editorial avant-garde portrait & textured fabric
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
  // 3. Chromatic modern glass sculpture & museum aesthetics
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
  // 4. Kinetic typography & brutalist graphic design
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  // 5. Dune desert shadows & natural minimalist geometry
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
];

// Helper to generate an artistic high-res SVG/Canvas data-URL fallback if network is restricted
export function createProceduralTexture(index: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const palettes = [
    { bg: '#2b231d', accent: '#e0a96d', text: '#f5f0eb', label: 'VANTRIX / ARCHITECTURE 01' },
    { bg: '#1c242b', accent: '#7eb6d9', text: '#ecf4f9', label: 'EDITORIAL / HORIZON 02' },
    { bg: '#261e2b', accent: '#d97ebd', text: '#faeef7', label: 'PRISM / REFRACTION 03' },
    { bg: '#1a2621', accent: '#8fd9a8', text: '#eefaf2', label: 'ORGANIC / KINETIC 04' },
    { bg: '#2d251e', accent: '#d99e7e', text: '#fcf3ee', label: 'CHROMA / PERSPECTIVE 05' },
  ];

  const theme = palettes[index % palettes.length];

  // Draw background gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, theme.bg);
  grad.addColorStop(1, '#0e0e11');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Geometric curved ribbon shapes
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(canvas.width * 0.5, canvas.height * 0.5, 120 + i * 50, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Subtle noise / fine diagonal lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + canvas.height, canvas.height);
    ctx.stroke();
  }

  // Accent block
  ctx.fillStyle = theme.accent;
  ctx.fillRect(80, 80, 16, 80);

  // Label Typography
  ctx.fillStyle = theme.text;
  ctx.font = 'bold 36px monospace';
  ctx.fillText(theme.label, 120, 130);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '20px monospace';
  ctx.fillText('3D CYLINDRICAL RIBBON • R149 PROJECTION', 120, 165);

  // Center graphic
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(canvas.width * 0.75, canvas.height * 0.6, 90, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}
