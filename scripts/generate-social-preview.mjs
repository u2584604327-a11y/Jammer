import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const WIDTH = 1280;
const HEIGHT = 640;

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
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

const pixels = new Uint8Array(WIDTH * HEIGHT * 4);

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = color[3] ?? 255;
}

function fillRect(x, y, w, h, color) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(WIDTH, Math.ceil(x + w));
  const y1 = Math.min(HEIGHT, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy += 1) {
    for (let xx = x0; xx < x1; xx += 1) setPixel(xx, yy, color);
  }
}

function disc(cx, cy, r, color) {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rr) setPixel(x, y, color);
    }
  }
}

function line(x1, y1, x2, y2, width, color) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    disc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, color);
  }
}

function roundedRect(x, y, w, h, r, color) {
  fillRect(x + r, y, w - 2 * r, h, color);
  fillRect(x, y + r, w, h - 2 * r, color);
  disc(x + r, y + r, r, color);
  disc(x + w - r, y + r, r, color);
  disc(x + r, y + h - r, r, color);
  disc(x + w - r, y + h - r, r, color);
}

const FONT = {
  A:["01110","10001","10001","11111","10001","10001","10001"],
  E:["11111","10000","10000","11110","10000","10000","11111"],
  J:["00111","00010","00010","00010","10010","10010","01100"],
  M:["10001","11011","10101","10101","10001","10001","10001"],
  R:["11110","10001","10001","11110","10100","10010","10001"]
};

function drawWord(word, x, y, scale, color) {
  let cursor = x;
  for (const char of word) {
    const glyph = FONT[char];
    if (!glyph) {
      cursor += scale * 4;
      continue;
    }
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === "1") {
          fillRect(cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += scale * 6;
  }
}

fillRect(0, 0, WIDTH, HEIGHT, [12, 17, 27, 255]);
disc(1130, 80, 285, [21, 28, 55, 255]);
disc(1170, 620, 330, [10, 31, 48, 255]);

roundedRect(92, 104, 392, 392, 92, [79, 70, 229, 255]);
for (let y = 104; y < 496; y += 1) {
  const t = (y - 104) / 392;
  const c = [
    Math.round(79 + (6 - 79) * t),
    Math.round(70 + (182 - 70) * t),
    Math.round(229 + (212 - 229) * t),
    255
  ];
  fillRect(184, y, 208, 1, c);
}

line(336, 184, 336, 334, 52, [255,255,255,255]);
line(336, 334, 285, 410, 52, [255,255,255,255]);
line(285, 410, 221, 402, 52, [255,255,255,255]);
fillRect(301, 257, 73, 20, [71,89,202,255]);
fillRect(301, 296, 73, 20, [56,111,208,255]);

drawWord("JAMMER", 570, 210, 15, [248,250,252,255]);

roundedRect(570, 380, 204, 54, 27, [36,43,64,255]);
roundedRect(792, 380, 224, 54, 27, [36,43,64,255]);
roundedRect(1034, 380, 172, 54, 27, [36,43,64,255]);
disc(596, 407, 7, [86,217,138,255]);
disc(818, 407, 7, [139,131,255,255]);
disc(1060, 407, 7, [57,196,222,255]);

fillRect(570, 476, 636, 4, [44,55,75,255]);
fillRect(570, 506, 440, 10, [166,176,194,255]);
fillRect(570, 532, 520, 10, [103,112,133,255]);

const raw = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
for (let y = 0; y < HEIGHT; y += 1) {
  const rowOffset = y * (WIDTH * 4 + 1);
  raw[rowOffset] = 0;
  Buffer.from(pixels.buffer, pixels.byteOffset + y * WIDTH * 4, WIDTH * 4)
    .copy(raw, rowOffset + 1);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND')
]);

await mkdir(resolve('generated/brand'), { recursive: true });
await writeFile(resolve('generated/brand/social-preview.png'), png);

if (png.length >= 1_000_000) {
  throw new Error(`Social preview must stay below 1 MB, got ${png.length} bytes`);
}

console.log(`social-preview: PASS 1280x640 bytes=${png.length}`);
