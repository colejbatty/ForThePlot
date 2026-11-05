// Reading image files for the CLI and MCP server: PNG and JPEG are embedded as they are,
// TIFF (micrographs) is decoded and stored as PNG, and very large pictures are scaled down.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { imageSize } from '../core/images.js';
import { sanitizeSvg } from '../icons/registry.js';

export const IMAGE_EXT = /\.(png|jpe?g|tiff?|gif|webp|svg)$/i;
const MAX_SIDE = 4096;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encode RGBA pixels as a PNG (RGB if fully opaque). */
export function encodePng(rgba, w, h) {
  let opaque = true;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] !== 255) { opaque = false; break; }
  const ch = opaque ? 3 : 4;
  const raw = Buffer.alloc((w * ch + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (w * ch + 1);
    raw[o] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = o + 1 + x * ch;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2];
      if (ch === 4) raw[d + 3] = rgba[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = opaque ? 2 : 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function decodeTiff(buf) {
  const UTIF = (await import('utif')).default;
  const ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error('No image found in the TIFF file');
  // first full-size page
  const page = ifds.find((d) => !(d.t254 && d.t254[0] & 1)) || ifds[0];
  UTIF.decodeImage(buf, page, ifds);
  const rgba = UTIF.toRGBA8(page);
  return { rgba, w: page.width, h: page.height };
}

/** Scale a PNG/JPEG data URL down with resvg (or convert GIF/WebP to PNG). */
async function rasterVia(src, w, h) {
  const { svgToPng } = await import('./png.js');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" preserveAspectRatio="none" href="${src}"/></svg>`;
  return svgToPng(svg, { width: w });
}

/** Read an image file and return { src, w, h, name } ready for a figure. */
export async function loadImageFile(file) {
  if (!IMAGE_EXT.test(file)) throw new Error(`"${path.basename(file)}" is not a supported image (PNG, JPEG, TIFF, GIF, WebP or SVG)`);
  const buf = fs.readFileSync(file);
  const ext = path.extname(file).slice(1).toLowerCase();
  const name = path.basename(file);
  let src, size;
  if (ext === 'svg') {
    // vector graphs (Prism, FlowJo, R, Python): kept as vector
    const text = sanitizeSvg(buf.toString('utf8'));
    if (!/<svg\b/i.test(text)) throw new Error(`"${name}" is not an SVG drawing`);
    src = 'data:image/svg+xml;base64,' + Buffer.from(text, 'utf8').toString('base64');
    size = imageSize(src);
    return { src, w: size.w, h: size.h, name };
  }
  if (ext === 'tif' || ext === 'tiff') {
    const t = await decodeTiff(buf);
    src = 'data:image/png;base64,' + encodePng(t.rgba, t.w, t.h).toString('base64');
    size = { w: t.w, h: t.h };
  } else {
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    src = `data:${mime};base64,${buf.toString('base64')}`;
    size = imageSize(src);
    if (!size) throw new Error(`Could not read the size of "${name}"`);
    if (ext === 'gif' || ext === 'webp') {
      // PDF export needs PNG or JPEG
      src = 'data:image/png;base64,' + Buffer.from(await rasterVia(src, size.w, size.h)).toString('base64');
    }
  }
  const long = Math.max(size.w, size.h);
  if (long > MAX_SIDE) {
    const k = MAX_SIDE / long;
    const w = Math.round(size.w * k), h = Math.round(size.h * k);
    src = 'data:image/png;base64,' + Buffer.from(await rasterVia(src, w, h)).toString('base64');
    size = { w, h };
  }
  return { src, w: size.w, h: size.h, name };
}

/**
 * Ops may name image files: {"op":"add","element":{"type":"image","file":"cells.tif"}}.
 * Replace each `file` with the picture data (paths resolved with `resolve`).
 */
export async function resolveImageFiles(ops, resolve = (p) => p) {
  const fix = async (el) => {
    if (!el || typeof el !== 'object' || !el.file) return;
    const img = await loadImageFile(resolve(String(el.file)));
    el.src = img.src;
    if (!el.name) el.name = img.name;
    delete el.file;
    if (!el.type) el.type = 'image';
  };
  for (const op of Array.isArray(ops) ? ops : [ops]) {
    if (!op || typeof op !== 'object') continue;
    if (op.op === 'add') {
      if (Array.isArray(op.elements)) for (const e of op.elements) await fix(e);
      await fix(op.element ?? op.el);
      if (!op.element && !op.elements && op.file) await fix(op);
    }
    if (op.op === 'update' && op.set?.file) {
      const img = await loadImageFile(resolve(String(op.set.file)));
      op.set.src = img.src;
      delete op.set.file;
    }
  }
  return ops;
}
