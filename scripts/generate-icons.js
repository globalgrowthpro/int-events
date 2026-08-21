import fs from "fs";
import zlib from "zlib";
import path from "path";

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  const check = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(check, 8 + len);
  return buf;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace

  // Raw image data with filter byte 0 for each scanline
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // Filter none
    rgbaBuffer.copy(raw, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idatData = zlib.deflateSync(raw, { level: 9 });
  const ihdrChunk = createChunk("IHDR", ihdr);
  const idatChunk = createChunk("IDAT", idatData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
    Math.round(c1[3] + (c2[3] - c1[3]) * t),
  ];
}

function renderAppIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 512;
  const radius = isMaskable ? 0 : Math.round(112 * scale);

  // Colors
  const bgTop = [15, 23, 42, 255]; // #0F172A
  const bgMid = [30, 41, 59, 255]; // #1E293B
  const bgBot = [9, 13, 22, 255]; // #090D16
  const blueLight = [56, 189, 248, 255]; // #38BDF8
  const bluePrimary = [59, 130, 246, 255]; // #3B82F6
  const blueDark = [37, 99, 235, 255]; // #2563EB
  const white = [255, 255, 255, 255];
  const muted = [148, 163, 184, 255]; // #94A3B8

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Check corner rounding if not maskable
      if (!isMaskable && radius > 0) {
        let inCorner = false;
        let dist = 0;
        if (x < radius && y < radius) {
          dist = Math.hypot(x - radius, y - radius);
          inCorner = dist > radius;
        } else if (x > size - radius && y < radius) {
          dist = Math.hypot(x - (size - radius), y - radius);
          inCorner = dist > radius;
        } else if (x < radius && y > size - radius) {
          dist = Math.hypot(x - radius, y - (size - radius));
          inCorner = dist > radius;
        } else if (x > size - radius && y > size - radius) {
          dist = Math.hypot(x - (size - radius), y - (size - radius));
          inCorner = dist > radius;
        }
        if (inCorner) {
          // Antialiased corner
          const alphaFactor = Math.max(0, Math.min(1, radius - dist + 0.5));
          if (alphaFactor <= 0) {
            buf[idx] = 0;
            buf[idx + 1] = 0;
            buf[idx + 2] = 0;
            buf[idx + 3] = 0;
            continue;
          }
        }
      }

      // Normalized coordinates (0 to 512 space)
      // If maskable, scale content down slightly to fit safe zone
      const contentScale = isMaskable ? 0.78 : 1.0;
      const nx = (x / size - 0.5) / contentScale * 512 + 256;
      const ny = (y / size - 0.5) / contentScale * 512 + 256;

      // Base background gradient
      const diagT = (x + y) / (size * 2);
      let bgCol = diagT < 0.5 
        ? lerpColor(bgTop, bgMid, diagT * 2) 
        : lerpColor(bgMid, bgBot, (diagT - 0.5) * 2);

      let r = bgCol[0], g = bgCol[1], b = bgCol[2], a = 255;

      // Ambient radial glow in upper-middle
      const glowDist = Math.hypot(nx - 256, ny - 230);
      if (glowDist < 140) {
        const glowFactor = (1 - glowDist / 140) * 0.25;
        r = Math.round(r + (bluePrimary[0] - r) * glowFactor);
        g = Math.round(g + (bluePrimary[1] - g) * glowFactor);
        b = Math.round(b + (bluePrimary[2] - b) * glowFactor);
      }

      // Check Hexagon Badge (center: 256, 245)
      const hx = Math.abs(nx - 256);
      const hy = Math.abs(ny - 245);
      // Hexagon distance formula (w: 268, h: 310)
      const hexDist = Math.max(hx * 1.15 + hy * 0.66, hy);
      
      if (hexDist < 155) {
        // Outer border
        if (hexDist >= 147) {
          const borderT = (ny - 90) / 310;
          const strokeCol = lerpColor(blueLight, blueDark, Math.max(0, Math.min(1, borderT)));
          r = strokeCol[0]; g = strokeCol[1]; b = strokeCol[2];
        } else {
          // Inside hexagon
          const innerT = Math.max(0, Math.min(1, (ny - 110) / 280));
          const badgeBg = lerpColor([30, 41, 59, 255], [15, 23, 42, 255], innerT);
          r = badgeBg[0]; g = badgeBg[1]; b = badgeBg[2];
        }
      }

      // Draw "INT" Monogram
      // 'I': col from 182 to 206, y 205 to 307
      const inI = (nx >= 182 && nx <= 206 && ny >= 205 && ny <= 307);
      // 'I' dot: center 194, 180, radius 12
      const inDot = Math.hypot(nx - 194, ny - 180) <= 12;

      // 'N': left bar (226-246, 205-307), right bar (282-302, 205-307), diagonal (226-302, 205-307)
      const inNLeft = (nx >= 226 && nx <= 246 && ny >= 205 && ny <= 307);
      const inNRight = (nx >= 282 && nx <= 302 && ny >= 205 && ny <= 307);
      const diagProgress = (nx - 226) / 56;
      const diagExpectedY = 205 + diagProgress * 102;
      const inNDiag = (nx >= 226 && nx <= 282 && Math.abs(ny - diagExpectedY) <= 12);

      // 'T': top bar (314-358, 205-223), stem (328-344, 223-307)
      const inTTop = (nx >= 314 && nx <= 358 && ny >= 205 && ny <= 223);
      const inTStem = (nx >= 328 && nx <= 344 && ny >= 223 && ny <= 307);

      if (inI || inNLeft || inNRight || inNDiag) {
        r = white[0]; g = white[1]; b = white[2];
      } else if (inDot || inTTop || inTStem) {
        const tColor = lerpColor(blueLight, blueDark, Math.max(0, Math.min(1, (ny - 180) / 130)));
        r = tColor[0]; g = tColor[1]; b = tColor[2];
      }

      // Subtext "EVENTS" dot bar at bottom (center 256, y 420-435)
      if (ny >= 422 && ny <= 430 && nx >= 190 && nx <= 322) {
        r = muted[0]; g = muted[1]; b = muted[2];
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return encodePNG(size, size, buf);
}

// Generate all required icons
const outDir = path.resolve("public/icons");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log("Generating PWA icons...");
fs.writeFileSync(path.join(outDir, "icon-192.png"), renderAppIcon(192));
console.log("Created icon-192.png");

fs.writeFileSync(path.join(outDir, "icon-512.png"), renderAppIcon(512));
console.log("Created icon-512.png");

fs.writeFileSync(path.join(outDir, "icon-512-maskable.png"), renderAppIcon(512, true));
console.log("Created icon-512-maskable.png");

fs.writeFileSync(path.join(outDir, "apple-touch-icon.png"), renderAppIcon(180));
console.log("Created apple-touch-icon.png");

console.log("All PWA icons generated successfully!");
