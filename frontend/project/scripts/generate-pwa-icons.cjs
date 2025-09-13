/*
 Generate PWA icons with gradient background and lightning bolt.
 Outputs maskable and any icons at 192 and 512, plus smaller sizes.
*/

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const outDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizesAny = [48, 72, 96, 144, 192, 512];
const sizesMaskable = [192, 512];

function drawIcon(size, { maskable = false } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background with gradient (tailwind from-emerald-400 to-blue-500)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#34d399'); // emerald-400
  grad.addColorStop(1, '#3b82f6'); // blue-500

  // If maskable, add safe padding
  const pad = maskable ? Math.round(size * 0.1) : 0; // 10% padding for maskable
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Rounded rect to simulate the rounded tile (optional)
  const radius = Math.max(8, Math.round(size * 0.08));
  ctx.save();
  ctx.beginPath();
  const x = pad, y = pad, w = size - 2 * pad, h = size - 2 * pad;
  const r = Math.min(radius, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
  // Overlay gradient clipped to rounded rect
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // Lightning bolt (white)
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  // Draw a stylized bolt. Coordinates scaled to size.
  const s = size;
  const bx = s * 0.46, by = s * 0.18; // top start
  ctx.moveTo(bx, by);
  ctx.lineTo(s * 0.52, s * 0.18);
  ctx.lineTo(s * 0.40, s * 0.48);
  ctx.lineTo(s * 0.56, s * 0.48);
  ctx.lineTo(s * 0.32, s * 0.82);
  ctx.lineTo(s * 0.28, s * 0.82);
  ctx.lineTo(s * 0.40, s * 0.54);
  ctx.lineTo(s * 0.26, s * 0.54);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  return canvas.toBuffer('image/png');
}

function writeIcon(file, size, opts) {
  const buf = drawIcon(size, opts);
  fs.writeFileSync(path.join(outDir, file), buf);
}

sizesAny.forEach((sz) => writeIcon(`icon-${sz}x${sz}.png`, sz, { maskable: false }));
sizesMaskable.forEach((sz) => writeIcon(`manifest-icon-${sz}.maskable.png`, sz, { maskable: true }));

console.log('PWA icons generated successfully in /public');
