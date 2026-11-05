// Importing pictures into the editor: drop, File → Import image…, or paste.
// PNG and JPEG are kept as they are; TIFF (microscopy) is decoded; other formats and very large
// pictures are redrawn as PNG (or JPEG for photos) so every export path can use them.

import { runOps } from './state.js';
import { toast } from './ui.js';
import { viewCenter } from './stage.js';

const MAX_SIDE = 4096;
export const IMAGE_FILE = /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i;
const SVG_FILE = /\.svg$/i;

export function isImageFile(file) {
  return IMAGE_FILE.test(file.name || '') || /^image\/(png|jpeg|gif|webp|bmp|tiff)$/.test(file.type || '');
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Could not read the file'));
    r.readAsDataURL(blob);
  });
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This browser cannot open that picture'));
    img.src = src;
  });
}

function canvasFor(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

async function decodeTiff(file) {
  const UTIF = (await import('utif')).default;
  const buf = await file.arrayBuffer();
  const ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error('No image found in the TIFF file');
  const page = ifds.find((d) => !(d.t254 && d.t254[0] & 1)) || ifds[0];
  UTIF.decodeImage(buf, page, ifds);
  const rgba = UTIF.toRGBA8(page);
  const w = page.width, h = page.height;
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  let cv = canvasFor(w, h);
  cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, w * h * 4), w, h), 0, 0);
  if (k < 1) {
    const small = canvasFor(Math.round(w * k), Math.round(h * k));
    small.getContext('2d').drawImage(cv, 0, 0, small.width, small.height);
    cv = small;
  }
  return { src: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
}

/** Read a picture file into { src, w, h, name }. */
export async function readImageFile(file) {
  const name = file.name || 'pasted image';
  if (/\.tiff?$/i.test(name) || file.type === 'image/tiff') return { ...(await decodeTiff(file)), name };
  if (SVG_FILE.test(name) || file.type === 'image/svg+xml') {
    // exported graphs stay vector
    const text = await file.text();
    if (!/<svg\b/i.test(text)) throw new Error('not an SVG drawing');
    const src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text)));
    const img = await loadImg(src);
    return { src, w: img.naturalWidth || 400, h: img.naturalHeight || 300, name };
  }
  const src0 = await readAsDataUrl(file);
  const img = await loadImg(src0);
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  const native = /^data:image\/(png|jpeg)/.test(src0);
  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  if (native && k === 1) return { src: src0, w: w0, h: h0, name };
  const cv = canvasFor(Math.round(w0 * k), Math.round(h0 * k));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  const jpeg = /^data:image\/jpeg/.test(src0);
  return { src: jpeg ? cv.toDataURL('image/jpeg', 0.93) : cv.toDataURL('image/png'), w: cv.width, h: cv.height, name };
}

/** Import a picture file onto the canvas, centered at `at` (or the middle of the view). */
export async function importImageFile(file, at) {
  try {
    toast(`Importing ${file.name || 'image'}…`);
    const img = await readImageFile(file);
    const p = at || viewCenter();
    const w = Math.min(480, img.w), h = w * (img.h / img.w);
    const r = runOps([{ op: 'add', element: { type: 'image', src: img.src, name: img.name, x: p.x - w / 2, y: p.y - h / 2, w, h } }], { select: true });
    if (!r.error) toast(`Added ${img.name} (${img.w} × ${img.h} px). Crop it and add a scale bar in the panel on the right.`);
  } catch (err) {
    toast(`Couldn’t import ${file.name || 'that image'}: ${err.message}`, 'error');
  }
}
