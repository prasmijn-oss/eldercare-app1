// generate-icons.js — creates PWA PNG icons from scratch using only Node built-ins
// Brand color: indigo #6366f1 (99, 102, 241) with a rounded-rect "CM" label
// Run: node generate-icons.js

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG chunk ──────────────────────────────────────────────────────────────
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  t.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return out;
}

// ── Draw pixel helpers ─────────────────────────────────────────────────────
function setPixel(rows, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= rows[0].length / 4 || y >= rows.length) return;
  const o = x * 4;
  // Alpha blend over existing pixel
  const sa = a / 255, da = rows[y][o + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return;
  rows[y][o]     = Math.round((r * sa + rows[y][o]     * da * (1 - sa)) / oa);
  rows[y][o + 1] = Math.round((g * sa + rows[y][o + 1] * da * (1 - sa)) / oa);
  rows[y][o + 2] = Math.round((b * sa + rows[y][o + 2] * da * (1 - sa)) / oa);
  rows[y][o + 3] = Math.round(oa * 255);
}

function fillRect(rows, x, y, w, h, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(rows, x + dx, y + dy, r, g, b, a);
}

function fillRoundRect(rows, x, y, w, h, radius, r, g, b, a = 255) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx, py = y + dy;
      // Corner distance check
      let inCorner = false;
      const cx = (dx < radius) ? radius : (dx >= w - radius) ? w - radius - 1 : -1;
      const cy = (dy < radius) ? radius : (dy >= h - radius) ? h - radius - 1 : -1;
      if (cx >= 0 && cy >= 0) {
        const dist = Math.sqrt((dx - cx) ** 2 + (dy - cy) ** 2);
        if (dist > radius) inCorner = true;
      }
      if (!inCorner) setPixel(rows, px, py, r, g, b, a);
    }
  }
}

// ── Simple bitmap font (5×7 glyphs for C and M) ───────────────────────────
const GLYPHS = {
  C: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  M: [
    [1,0,0,0,1],
    [1,1,0,1,1],
    [1,0,1,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
};

function drawGlyph(rows, glyph, ox, oy, scale, r, g, b) {
  const data = GLYPHS[glyph];
  if (!data) return;
  for (let row = 0; row < data.length; row++)
    for (let col = 0; col < data[row].length; col++)
      if (data[row][col])
        fillRect(rows, ox + col * scale, oy + row * scale, scale, scale, r, g, b, 255);
}

// ── Build PNG buffer ───────────────────────────────────────────────────────
function buildPNG(size) {
  const W = size, H = size;

  // RGBA rows, initialised transparent
  const rows = Array.from({ length: H }, () => new Uint8Array(W * 4));

  // Background: indigo #6366f1
  const [bgR, bgG, bgB] = [99, 102, 241];

  // Rounded rect covering the whole canvas
  const radius = Math.round(size * 0.18);
  fillRoundRect(rows, 0, 0, W, H, radius, bgR, bgG, bgB, 255);

  // Letters "CM" in white, scaled to fit
  const scale = Math.max(1, Math.round(size / 38));
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  const gap    = scale * 2;
  const totalW = glyphW * 2 + gap;
  const startX = Math.round((W - totalW) / 2);
  const startY = Math.round((H - glyphH) / 2);

  drawGlyph(rows, 'C', startX,              startY, scale, 255, 255, 255);
  drawGlyph(rows, 'M', startX + glyphW + gap, startY, scale, 255, 255, 255);

  // PNG signature
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA

  // Raw image data: filter byte (0) + RGBA per row
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0;
    Buffer.from(rows[y]).copy(raw, y * (1 + W * 4) + 1);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Write files ────────────────────────────────────────────────────────────
const pub = path.join(__dirname, 'public');

const files = [
  { name: 'icon-192.png',        size: 192 },
  { name: 'icon-512.png',        size: 512 },
  { name: 'apple-touch-icon.png',size: 180 },
];

for (const { name, size } of files) {
  const buf = buildPNG(size);
  fs.writeFileSync(path.join(pub, name), buf);
  console.log(`✓ ${name}  (${size}×${size}, ${buf.length} bytes)`);
}
