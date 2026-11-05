// Dependency-free raster encoders shared by the browser editor and Node:
//   encodeTiff     RGB TIFF with LZW compression and dpi tags
//   pngWithDpi     add a pHYs chunk so a PNG reports its print resolution
//   rasterPdf      a one-page PDF wrapping an RGB image (deflate-compressed by the caller)

let CRC_TABLE = null;
function crc32(bytes, start = 0, end = bytes.length) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Return a copy of PNG bytes with a pHYs chunk declaring `dpi`. */
export function pngWithDpi(png, dpi) {
  const src = png instanceof Uint8Array ? png : new Uint8Array(png);
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  chunk[16] = 1; // unit: meter
  dv.setUint32(17, crc32(chunk, 4, 17));
  // copy chunks, dropping any existing pHYs, inserting ours after IHDR
  const parts = [src.subarray(0, 8)];
  let off = 8;
  while (off < src.length) {
    const len = new DataView(src.buffer, src.byteOffset + off, 4).getUint32(0);
    const type = String.fromCharCode(...src.subarray(off + 4, off + 8));
    const end = off + 12 + len;
    if (type !== 'pHYs') parts.push(src.subarray(off, end));
    if (type === 'IHDR') parts.push(chunk);
    off = end;
  }
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** TIFF-flavoured LZW (MSB-first, early code-width change). */
export function lzwEncode(data) {
  const out = new Uint8Array(Math.ceil(data.length * 1.6) + 64);
  let o = 0, acc = 0, bits = 0;
  const put = (code, len) => {
    acc = (acc << len) | code;
    bits += len;
    while (bits >= 8) { out[o++] = (acc >>> (bits - 8)) & 0xff; bits -= 8; }
    acc &= (1 << bits) - 1;
  };
  const table = new Int32Array(4096 * 256);
  const gen = new Uint16Array(4096 * 256);
  let g = 1, next = 258, len = 9;
  put(256, len);
  if (!data.length) { put(257, len); if (bits) out[o++] = (acc << (8 - bits)) & 0xff; return out.slice(0, o); }
  let prefix = data[0];
  for (let i = 1; i < data.length; i++) {
    const c = data[i];
    const key = (prefix << 8) | c;
    if (gen[key] === g) { prefix = table[key]; continue; }
    put(prefix, len);
    gen[key] = g;
    table[key] = next++;
    if (next === 4094) {
      put(256, len);
      g++; if (g === 65535) { gen.fill(0); g = 1; }
      next = 258; len = 9;
    } else if (next > (1 << len) - 1 && len < 12) {
      len++;
    }
    prefix = c;
  }
  put(prefix, len);
  put(257, len);
  if (bits) out[o++] = (acc << (8 - bits)) & 0xff;
  return out.slice(0, o);
}

/** PackBits-encode `row` into `out` at `o`; returns the new offset. */
function packBitsInto(row, out, o) {
  const n = row.length;
  let i = 0;
  while (i < n) {
    let run = 1;
    while (i + run < n && run < 128 && row[i + run] === row[i]) run++;
    if (run >= 3) {
      out[o++] = 257 - run;
      out[o++] = row[i];
      i += run;
    } else {
      const start = o++;
      let len = 0;
      while (i < n && len < 128) {
        if (i + 2 < n && row[i] === row[i + 1] && row[i] === row[i + 2]) break;
        out[o++] = row[i++];
        len++;
      }
      out[start] = len - 1;
    }
  }
  return o;
}

/**
 * Encode RGBA pixels (alpha composited over white) as an LZW-compressed RGB TIFF.
 * Returns Uint8Array.
 */
export function encodeTiff(rgba, width, height, dpi = 300) {
  const rowsPerStrip = Math.max(1, Math.floor(262144 / (width * 3)));
  const strips = [];
  for (let y0 = 0; y0 < height; y0 += rowsPerStrip) {
    const rows = Math.min(rowsPerStrip, height - y0);
    const raw = new Uint8Array(rows * width * 3);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < width; x++) {
        const i = ((y0 + y) * width + x) * 4, j = (y * width + x) * 3, a = rgba[i + 3] / 255;
        raw[j] = Math.round(rgba[i] * a + 255 * (1 - a));
        raw[j + 1] = Math.round(rgba[i + 1] * a + 255 * (1 - a));
        raw[j + 2] = Math.round(rgba[i + 2] * a + 255 * (1 - a));
      }
    }
    strips.push(lzwEncode(raw));
  }
  const software = 'ForThePlot\0';
  const entries = 14;
  const ifdSize = 2 + entries * 12 + 4;
  let off = 8;
  const ifdOffset = off; off += ifdSize;
  const bpsOffset = off; off += 6;
  const xresOffset = off; off += 8;
  const yresOffset = off; off += 8;
  const swOffset = off; off += software.length + (software.length % 2);
  const offsOffset = off; off += strips.length * 4;
  const countsOffset = off; off += strips.length * 4;
  let dataOffset = off;
  const stripOffsets = strips.map((s) => { const o = dataOffset; dataOffset += s.length; return o; });
  const buf = new Uint8Array(dataOffset);
  const dv = new DataView(buf.buffer);
  buf.set([0x49, 0x49, 42, 0]);
  dv.setUint32(4, ifdOffset, true);
  dv.setUint16(ifdOffset, entries, true);
  let e = ifdOffset + 2;
  const tag = (id, type, count, value) => {
    dv.setUint16(e, id, true); dv.setUint16(e + 2, type, true); dv.setUint32(e + 4, count, true);
    if (type === 3 && count === 1) dv.setUint16(e + 8, value, true);
    else dv.setUint32(e + 8, value, true);
    e += 12;
  };
  tag(256, 4, 1, width);
  tag(257, 4, 1, height);
  tag(258, 3, 3, bpsOffset);
  tag(259, 3, 1, 5); // LZW
  tag(262, 3, 1, 2); // RGB
  tag(273, 4, strips.length, strips.length === 1 ? stripOffsets[0] : offsOffset);
  tag(277, 3, 1, 3);
  tag(278, 4, 1, rowsPerStrip);
  tag(279, 4, strips.length, strips.length === 1 ? strips[0].length : countsOffset);
  tag(282, 5, 1, xresOffset);
  tag(283, 5, 1, yresOffset);
  tag(284, 3, 1, 1);
  tag(296, 3, 1, 2); // inches
  tag(305, 2, software.length, swOffset);
  dv.setUint32(e, 0, true);
  for (let i = 0; i < 3; i++) dv.setUint16(bpsOffset + i * 2, 8, true);
  dv.setUint32(xresOffset, dpi, true); dv.setUint32(xresOffset + 4, 1, true);
  dv.setUint32(yresOffset, dpi, true); dv.setUint32(yresOffset + 4, 1, true);
  for (let i = 0; i < software.length; i++) buf[swOffset + i] = software.charCodeAt(i);
  strips.forEach((s, i) => {
    dv.setUint32(offsOffset + i * 4, stripOffsets[i], true);
    dv.setUint32(countsOffset + i * 4, s.length, true);
    buf.set(s, stripOffsets[i]);
  });
  return buf;
}

/** RGBA → RGB composited over white. */
export function rgbaToRgb(rgba) {
  const out = new Uint8Array((rgba.length / 4) * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    const a = rgba[i + 3] / 255;
    out[j] = Math.round(rgba[i] * a + 255 * (1 - a));
    out[j + 1] = Math.round(rgba[i + 1] * a + 255 * (1 - a));
    out[j + 2] = Math.round(rgba[i + 2] * a + 255 * (1 - a));
  }
  return out;
}

/**
 * Minimal PDF with one page showing one image.
 * `deflatedRgb` is zlib-deflated RGB bytes (FlateDecode), width/height in pixels,
 * page size in points.
 */
export function rasterPdf({ deflatedRgb, width, height, widthPt, heightPt, title = 'Figure' }) {
  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let pos = 0;
  const push = (data) => {
    const b = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(b);
    pos += b.length;
  };
  const obj = (n, body) => { offsets[n] = pos; push(`${n} 0 obj\n${body}\nendobj\n`); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = pos;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${deflatedRgb.length} >>\nstream\n`);
  push(deflatedRgb);
  push('\nendstream\nendobj\n');
  const content = `q ${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  obj(6, `<< /Title (${title.replace(/[()\\]/g, '')}) /Producer (ForThePlot) >>`);
  const xref = pos;
  let x = `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(x);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
