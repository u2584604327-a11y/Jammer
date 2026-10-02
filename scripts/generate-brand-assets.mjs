import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sizes = [16, 32, 48, 128];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function insideRoundedRect(x, y, width, height, radius) {
  if (x >= radius && x < width - radius) return true;
  if (y >= radius && y < height - radius) return true;
  const cx = x < radius ? radius : width - radius - 1;
  const cy = y < radius ? radius : height - radius - 1;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function setPixel(pixels, size, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  pixels[index] = r;
  pixels[index + 1] = g;
  pixels[index + 2] = b;
  pixels[index + 3] = a;
}

function drawDisc(pixels, size, cx, cy, radius, color) {
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);
  const rr = radius * radius;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rr) setPixel(pixels, size, x, y, ...color);
    }
  }
}

function drawLine(pixels, size, x1, y1, x2, y2, width, color) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance * 2));
  const radius = width / 2;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    drawDisc(
      pixels,
      size,
      x1 + (x2 - x1) * t,
      y1 + (y2 - y1) * t,
      radius,
      color
    );
  }
}

function fillRect(pixels, size, x, y, width, height, color) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(size, Math.ceil(x + width));
  const y1 = Math.min(size, Math.ceil(y + height));
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) {
      setPixel(pixels, size, xx, yy, ...color);
    }
  }
}

function makeIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const radius = Math.max(2, Math.round(size * 0.22));
  const start = [79, 70, 229];
  const end = [6, 182, 212];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!insideRoundedRect(x, y, size, size, radius)) continue;
      const t = (x + y) / (2 * Math.max(1, size - 1));
      setPixel(
        pixels,
        size,
        x,
        y,
        mix(start[0], end[0], t),
        mix(start[1], end[1], t),
        mix(start[2], end[2], t),
        255
      );
    }
  }

  const white = [255, 255, 255, 255];
  const stroke = Math.max(2, size * 0.115);
  drawLine(pixels, size, size * 0.64, size * 0.23, size * 0.64, size * 0.59, stroke, white);
  drawLine(pixels, size, size * 0.64, size * 0.59, size * 0.50, size * 0.74, stroke, white);
  drawLine(pixels, size, size * 0.50, size * 0.74, size * 0.33, size * 0.68, stroke, white);

  const cutA = [72, 88, 202, 255];
  const cutB = [58, 118, 207, 255];
  fillRect(pixels, size, size * 0.57, size * 0.37, size * 0.17, Math.max(1, size * 0.045), cutA);
  fillRect(pixels, size, size * 0.57, size * 0.47, size * 0.17, Math.max(1, size * 0.045), cutB);

  return pixels;
}

function encodePng(size, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    raw[rowOffset] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * size * 4, size * 4)
      .copy(raw, rowOffset + 1);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND')
  ]);
}

const outputDir = resolve('generated/brand');
await mkdir(outputDir, { recursive: true });

for (const size of sizes) {
  const png = encodePng(size, makeIcon(size));
  await writeFile(resolve(outputDir, `icon-${size}.png`), png);
  console.log(`brand-icon: ${size}x${size} bytes=${png.length}`);
}
