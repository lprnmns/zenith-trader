/*
Generate PWA icons from a provided PNG source image.
- Writes standard "any" icons: 48, 72, 96, 144, 192, 512
- Writes maskable icons: 192, 512 (with ~10% safe padding)
Usage:
  node scripts/generate-icons-from-png.cjs "C:/path/to/logo.png"
  OR
  node scripts/generate-icons-from-png.cjs -i "C:/path/to/logo.png"
*/

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const outDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizesAny = [48, 72, 96, 144, 192, 512];
const sizesMaskable = [192, 512];

function parseArgs(argv) {
  const args = argv.slice(2);
  let input = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-i' || a === '--input') {
      input = args[i + 1];
      i++;
      continue;
    }
    if (a.startsWith('-i=') || a.startsWith('--input=')) {
      input = a.split('=')[1];
      continue;
    }
    if (!a.startsWith('-') && !input) {
      input = a;
    }
  }
  return input;
}

async function loadSourceImage(src) {
  try {
    return await loadImage(src);
  } catch (err) {
    console.error('Failed to load source image:', src, err.message);
    process.exit(1);
  }
}

function drawContain(img, size, { padRatio = 0 } = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Compute drawable area with optional padding ratio (for maskable safe zone)
  const drawableSize = size * (1 - padRatio * 2);

  const scale = Math.min(drawableSize / img.width, drawableSize / img.height);
  const dw = Math.round(img.width * scale);
  const dh = Math.round(img.height * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = Math.round((size - dh) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, dw, dh);

  return canvas.toBuffer('image/png');
}

function writeFileSafe(filepath, buffer) {
  fs.writeFileSync(filepath, buffer);
  console.log('Wrote', path.relative(path.join(__dirname, '..'), filepath));
}

async function main() {
  const inputPath = parseArgs(process.argv);
  if (!inputPath) {
    console.error('Usage: node scripts/generate-icons-from-png.cjs -i "C:/path/to/logo.png"');
    process.exit(1);
  }
  if (!fs.existsSync(inputPath)) {
    console.error('Input file does not exist:', inputPath);
    process.exit(1);
  }

  const img = await loadSourceImage(inputPath);

  // Standard icons (purpose: any)
  for (const sz of sizesAny) {
    const buf = drawContain(img, sz, { padRatio: 0 });
    writeFileSafe(path.join(outDir, `icon-${sz}x${sz}.png`), buf);
  }

  // Maskable icons (with safe area padding ~10%)
  for (const sz of sizesMaskable) {
    const buf = drawContain(img, sz, { padRatio: 0.1 });
    writeFileSafe(path.join(outDir, `manifest-icon-${sz}.maskable.png`), buf);
  }

  console.log('All icons generated successfully.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
