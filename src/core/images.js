// Raster images in figures (micrographs, blots, real flow plots).
//
// Picture data lives in a registry, not on the elements, so editing, undo and agent ops stay fast
// however large the images are. A figure file carries the pictures it uses in a top-level
// `images` map ({ id: { src, w, h, name } }); normalizeFigure() registers them and
// embedUsedImages() writes them back when saving. Elements refer to a picture by id:
//   { "type": "image", "image": "img-1a2b3c4d", "x": 40, "y": 60, "w": 320, "h": 240 }
// Ops may pass `src` (a data: URL) instead of `image`; it is registered on the way in.

import { sanitizeSvg, prefixIds } from '../icons/registry.js';

const store = new Map();

function hash(str) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 + c, 2246822519) ^ (h2 >>> 13);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).slice(0, 12);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64I = new Int16Array(128).fill(-1);
for (let i = 0; i < 64; i++) B64I[B64.charCodeAt(i)] = i;

/** Decode (the start of) a base64 string to bytes. */
function b64bytes(s, max = Infinity) {
  const n = Math.min(Math.floor((s.length * 3) / 4), max);
  const out = new Uint8Array(n);
  let o = 0, buf = 0, bits = 0;
  for (let i = 0; i < s.length && o < n; i++) {
    const v = B64I[s.charCodeAt(i)];
    if (v < 0) continue;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 0xff; }
  }
  return out.subarray(0, o);
}

export function parseDataUrl(src) {
  const m = /^data:([^;,]+)(;base64)?,/i.exec(String(src || ''));
  if (!m) return null;
  return { mime: m[1].toLowerCase(), base64: !!m[2], data: String(src).slice(m[0].length) };
}

function dataText(d) {
  if (d.base64) { const b = b64bytes(d.data); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); try { return decodeURIComponent(escape(s)); } catch { return s; } }
  try { return decodeURIComponent(d.data); } catch { return d.data; }
}

const UNIT = { px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };
function svgLength(v) {
  const m = /^\s*([\d.]+)\s*(px|pt|pc|mm|cm|in)?\s*$/i.exec(v || '');
  return m ? Number(m[1]) * (UNIT[(m[2] || 'px').toLowerCase()] || 1) : null;
}

/** Root size and viewBox of an SVG document. */
export function svgInfo(text) {
  const tag = (String(text).match(/<svg\b[^>]*>/i) || [''])[0];
  const attr = (n) => (tag.match(new RegExp(`\\s${n}\\s*=\\s*["']([^"']*)["']`, 'i')) || [])[1];
  const vbRaw = attr('viewBox');
  const vb = vbRaw ? vbRaw.trim().split(/[\s,]+/).map(Number) : null;
  const w = svgLength(attr('width')), h = svgLength(attr('height'));
  const box = vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0 ? { x: vb[0], y: vb[1], w: vb[2], h: vb[3] } : { x: 0, y: 0, w: w || 300, h: h || 150 };
  return { viewBox: box, w: w || box.w, h: h || box.h };
}

/** Pixel size of a PNG, JPEG, GIF, WebP or SVG data URL (null if unknown). */
export function imageSize(src) {
  const d = parseDataUrl(src);
  if (d && d.mime === 'image/svg+xml') { const i = svgInfo(dataText(d)); return { w: Math.round(i.viewBox.w * 100) / 100, h: Math.round(i.viewBox.h * 100) / 100 }; }
  if (!d || !d.base64) return null;
  const b = b64bytes(d.data, d.mime === 'image/jpeg' ? Infinity : 64);
  const u16 = (i) => (b[i] << 8) | b[i + 1];
  const u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  if (b[0] === 0x89 && b[1] === 0x50) return { w: u32(16), h: u32(20) };
  if (b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57) {
    const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (tag === 'VP8 ') return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
    if (tag === 'VP8L') { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
    if (tag === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: u16(i + 7), h: u16(i + 5) };
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      i += 2 + u16(i + 2);
    }
  }
  return null;
}

/** Add a picture to the registry; returns its id (content-addressed, so duplicates share one). */
export function registerImage({ src, w, h, name, id } = {}) {
  const d = parseDataUrl(src);
  if (!d || !/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(d.mime)) throw new Error('An image needs a PNG or JPEG data URL as "src" (or, with the CLI and MCP server, a "file" path)');
  const key = id || `img-${hash(src)}`;
  if (!store.has(key)) {
    const size = w && h ? { w, h } : imageSize(src) || { w: 400, h: 300 };
    store.set(key, { id: key, src, w: Number(size.w), h: Number(size.h), name: name || '' });
    if (d.mime === 'image/svg+xml') { const im = store.get(key); im.vector = true; }
  }
  return key;
}

export function getImage(id) {
  return store.get(id) || null;
}

export function isSvgImage(img) {
  return /^data:image\/svg\+xml/i.test(img?.src || '');
}

/**
 * Vector pictures (SVG exported from Prism, FlowJo, R…) are drawn inline in exports so PDFs stay
 * vector. Returns { viewBox, markup } with ids and CSS classes made unique to this picture.
 */
export function svgImageParts(img) {
  if (img._svg) return img._svg;
  const d = parseDataUrl(img.src);
  const text = sanitizeSvg(dataText(d));
  const info = svgInfo(text);
  const open = text.match(/<svg\b[^>]*>/i);
  let inner = open ? text.slice(text.indexOf(open[0]) + open[0].length).replace(/<\/svg>\s*$/i, '') : text;
  const uid = `pic-${img.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  inner = prefixIds(inner, uid);
  if (/<style/i.test(inner)) {
    // scope class names so two pictures' styles can't clash
    inner = inner
      .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, css, c) => a + css.replace(/\.(-?[_a-zA-Z][\w-]*)/g, `.${uid}-$1`) + c)
      .replace(/\sclass\s*=\s*(["'])([^"']*)\1/g, (m, q, cls) => ` class=${q}${cls.trim().split(/\s+/).map((c) => `${uid}-${c}`).join(' ')}${q}`);
  }
  img._svg = { viewBox: info.viewBox, markup: inner };
  return img._svg;
}

/** Register the pictures carried by a figure file (its top-level `images` map). */
export function registerEmbeddedImages(raw) {
  for (const [id, v] of Object.entries(raw?.images || {})) {
    if (v && v.src && !store.has(id)) {
      try { registerImage({ ...v, id }); } catch { /* skip unreadable */ }
    }
  }
}

/** Put the pictures a figure uses into its `images` map (for saving). */
export function embedUsedImages(doc) {
  const out = {};
  for (const e of doc.elements || []) {
    if (e.type !== 'image') continue;
    const img = store.get(e.image);
    if (img) out[img.id] = { src: img.src, w: img.w, h: img.h, ...(img.name ? { name: img.name } : {}) };
  }
  if (Object.keys(out).length) doc.images = out;
  else delete doc.images;
  return doc;
}

/** Source-pixel rectangle shown by an image element (after crop). */
export function cropRect(el, img = getImage(el.image)) {
  const c = el.crop || { x: 0, y: 0, w: 1, h: 1 };
  const W = img?.w || 1, H = img?.h || 1;
  return { x: c.x * W, y: c.y * H, w: Math.max(1e-6, c.w) * W, h: Math.max(1e-6, c.h) * H };
}
