// Genera le icone PNG (nessuna dipendenza): sfondo verde, cerchio bianco, bersaglio blu/rosso.
import fs from 'node:fs';
import zlib from 'node:zlib';

function crc32(buf) {
  let crc = ~0;
  for (const b of buf) {
    let c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(t, d) {
  const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
  const td = Buffer.concat([Buffer.from(t), d]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([l, td, c]);
}
function png(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - size / 2, y - size / 2) / size;
      let col = [0x1f, 0x3d, 0x2b];
      if (r < 0.38) col = [255, 255, 255];
      if (r < 0.3 && r > 0.22) col = [0x0a, 0x5f, 0xd6];
      if (r < 0.1) col = [0xb3, 0x26, 0x1e];
      const o = y * stride + 1 + x * 4;
      raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
for (const s of [180, 192, 512]) fs.writeFileSync(`public/icon-${s}.png`, png(s));
console.log('icone create');
