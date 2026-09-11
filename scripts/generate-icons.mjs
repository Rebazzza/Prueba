import sharp from "sharp";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const SRC = join(import.meta.dirname, "..", "public", "IconOriginal.jpg");
const PUB = join(import.meta.dirname, "..", "public");

// --- PWA PNGs ---
const pwaTargets = [
  { name: "pwa-192.png", size: 192 },
  { name: "pwa-512.png", size: 512 },
  { name: "pwa-maskable-192.png", size: 192, mask: true },
  { name: "pwa-maskable-512.png", size: 512, mask: true },
];

for (const t of pwaTargets) {
  const buf = await sharp(SRC)
    .resize(t.size, t.size, { fit: "cover" })
    .png()
    .toBuffer();
  writeFileSync(join(PUB, t.name), buf);
  console.log(`  ${t.name}  (${buf.length} bytes)`);
}

// --- ICO (multi-size: 16, 32, 48) ---
const icoSizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  icoSizes.map((s) =>
    sharp(SRC).resize(s, s, { fit: "cover" }).png().toBuffer()
  )
);

// ICO format: header (6) + directory entry (16 each) + PNG data
const HEADER_LEN = 6;
const DIR_LEN = 16;
const totalDataLen = pngBuffers.reduce((a, b) => a + b.length, 0);
const totalLen = HEADER_LEN + icoSizes.length * DIR_LEN + totalDataLen;

const buf = Buffer.alloc(totalLen);
// Header: reserved(2) + type(2, 1=icon) + count(2)
buf.writeUInt16LE(0, 0);
buf.writeUInt16LE(1, 2);
buf.writeUInt16LE(icoSizes.length, 4);

let dataOffset = HEADER_LEN + icoSizes.length * DIR_LEN;
for (let i = 0; i < icoSizes.length; i++) {
  const s = icoSizes[i];
  const d = pngBuffers[i];
  const off = HEADER_LEN + i * DIR_LEN;
  buf.writeUInt8(s < 256 ? s : 0, off);      // width
  buf.writeUInt8(s < 256 ? s : 0, off + 1);   // height
  buf.writeUInt8(0, off + 2);                   // color palette
  buf.writeUInt8(0, off + 3);                   // reserved
  buf.writeUInt16LE(1, off + 4);                // color planes
  buf.writeUInt16LE(32, off + 6);               // bits per pixel
  buf.writeUInt32LE(d.length, off + 8);         // data size
  buf.writeUInt32LE(dataOffset, off + 12);      // data offset
  d.copy(buf, dataOffset);
  dataOffset += d.length;
}

writeFileSync(join(PUB, "IconOriginal.ico"), buf);
console.log(`  IconOriginal.ico  (${buf.length} bytes)`);
console.log("\nAll icons generated from IconOriginal.jpg");
