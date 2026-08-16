// Generates a 1024x1024 app icon (Task Orbit) as a PNG without dependencies.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const W = 1024;
const H = 1024;

/* ---------- PNG encoding ---------- */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // compression, filter, interlace = 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- Drawing ---------- */
const px = Buffer.alloc(W * H * 4);

function setPx(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = a;
}

function inRoundedRect(x, y, left, top, size, radius) {
  const right = left + size;
  const bottom = top + size;
  if (x < left || x > right || y < top || y > bottom) return false;
  const dx = Math.max(left + radius - x, x - (right - radius), 0);
  const dy = Math.max(top + radius - y, y - (bottom - radius), 0);
  return dx * dx + dy * dy <= radius * radius;
}

const size = 880;
const left = (W - size) / 2;
const top = (H - size) / 2;
const radius = 210;
const cx = W / 2;
const cy = H / 2;

// Background gradient (violet family), rounded square
const topCol = [123, 102, 201]; // #7B66C9
const botCol = [86, 60, 153]; // #563C99

// Orbit geometry
const angle = (-28 * Math.PI) / 180;
const rx = 302;
const ry = 132;
const ringHalf = 0.07; // normalized thickness
const cosA = Math.cos(-angle);
const sinA = Math.sin(-angle);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!inRoundedRect(x, y, left, top, size, radius)) continue;
    const t = (y - top) / size;
    let r = Math.round(topCol[0] + (botCol[0] - topCol[0]) * t);
    let g = Math.round(topCol[1] + (botCol[1] - topCol[1]) * t);
    let b = Math.round(topCol[2] + (botCol[2] - topCol[2]) * t);

    // Rotate point into orbit-local coordinates
    const dx = x - cx;
    const dy = y - cy;
    const xl = dx * cosA + dy * sinA;
    const yl = -dx * sinA + dy * cosA;

    // Central planet
    if (dx * dx + dy * dy <= 92 * 92) {
      r = 255;
      g = 255;
      b = 255;
    } else {
      // Orbit ring
      const e = Math.sqrt((xl * xl) / (rx * rx) + (yl * yl) / (ry * ry));
      if (Math.abs(e - 1) < ringHalf) {
        r = 255;
        g = 255;
        b = 255;
      }
      // Satellite dot at theta = 55deg on the orbit
      const th = (55 * Math.PI) / 180;
      const pxw = cx + rx * Math.cos(th) * cosA - ry * Math.sin(th) * sinA;
      const pyw = cy + rx * Math.cos(th) * sinA + ry * Math.sin(th) * cosA;
      const sdx = x - pxw;
      const sdy = y - pyw;
      if (sdx * sdx + sdy * sdy <= 54 * 54) {
        r = 255;
        g = 255;
        b = 255;
      }
    }

    setPx(x, y, r, g, b, 255);
  }
}

const out = path.join(__dirname, "..", "app-icon.png");
fs.writeFileSync(out, encodePNG(W, H, px));
console.log("wrote", out);
