// The ForThePlot figure format (version 1) and helpers to create, normalize and
// validate figures. A figure is plain JSON so people, scripts and agents can all
// read and write it. See docs/FORMAT.md for the full specification.

import { getIcon } from '../icons/registry.js';
import { normalizeColor } from './color.js';
import { normalizePaint, paintColor } from './gradient.js';
import { normalizePath } from './path.js';
import { registerImage, registerEmbeddedImages, getImage } from './images.js';

export const FORMAT_VERSION = 1;
export const ELEMENT_TYPES = ['icon', 'shape', 'text', 'arrow', 'note', 'path', 'image', 'panel'];
export const CORNERS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
export const SHAPES = ['rect', 'ellipse', 'triangle', 'diamond', 'hexagon', 'membrane', 'membrane-ellipse', 'brace', 'plot'];
export const NOTE_COLORS = { yellow: '#fff1a8', blue: '#d6ebff', pink: '#ffd9e8', green: '#d9f5dd' };
export const HEADS = ['arrow', 'open', 'inhibit', 'circle', 'diamond', 'none'];
export const ROUTINGS = ['straight', 'elbow', 'curved'];
export const LABEL_POSITIONS = ['bottom', 'top', 'left', 'right', 'center', 'none'];
export const ANCHORS = ['auto', 'center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

export const DEFAULT_FONT = 'Arial, Helvetica, sans-serif';

export function createFigure({ title = 'Untitled figure', width = 1200, height = 800, background = '#ffffff', font = DEFAULT_FONT } = {}) {
  return {
    fortheplot: FORMAT_VERSION,
    title,
    canvas: { width, height, background },
    font,
    elements: [],
  };
}

const BASE = { x: 0, y: 0, rotation: 0, opacity: 1 };

export const DEFAULTS = {
  icon: { ...BASE, colors: {}, flipX: false, flipY: false, label: null },
  shape: {
    ...BASE, shape: 'rect', w: 160, h: 100, fill: '#eaf2fd', stroke: '#4a8fe7', strokeWidth: 2,
    radius: 12, dash: 'solid', text: '', textColor: null, fontSize: 18, bold: false,
  },
  text: { ...BASE, text: 'Text', fontSize: 20, color: '#1f2933', bold: false, italic: false, align: 'left', w: 0, background: null },
  note: { ...BASE, w: 200, text: '', color: '#fff1a8', author: 'you', resolved: false, target: null },
  panel: { ...BASE, w: 520, h: 360, title: '', fill: '#f7f9fc', stroke: '#dde3ea', strokeWidth: 1.5, radius: 14, dash: 'solid', letter: null },
  image: { ...BASE, image: null, crop: null, radius: 0, stroke: 'none', strokeWidth: 2, scaleBar: null, label: null },
  path: {
    ...BASE, points: [], closed: false, smooth: false, fill: 'none', stroke: '#52606d', strokeWidth: 3, dash: 'solid',
    head: 'none', tail: 'none', membrane: false, thickness: 26, inner: null,
  },
  arrow: {
    from: null, to: null, routing: 'straight', curvature: 0.3, stroke: '#52606d', width: 3,
    dash: 'solid', head: 'arrow', tail: 'none', label: '', labelSize: 14, gap: 6, opacity: 1,
  },
};

const LABEL_DEFAULT = { text: '', position: 'bottom', fontSize: 16, color: '#1f2933', bold: false };

export function clone(x) {
  return x == null ? x : JSON.parse(JSON.stringify(x));
}

function slug(s) {
  return String(s || 'el').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'el';
}

/** Generate a short readable id unique within the figure. */
export function newId(doc, base) {
  const used = new Set(doc.elements.map((e) => e.id));
  const b = slug(base);
  if (!used.has(b)) return b;
  for (let i = 2; ; i++) if (!used.has(`${b}-${i}`)) return `${b}-${i}`;
}

function normEndpoint(p) {
  if (p == null) return null;
  if (typeof p === 'string') return { id: p, anchor: 'auto' };
  if (Array.isArray(p)) return { x: Number(p[0]) || 0, y: Number(p[1]) || 0 };
  const out = {};
  if (p.id != null) {
    out.id = String(p.id);
    out.anchor = ANCHORS.includes(p.anchor) ? p.anchor : 'auto';
  } else {
    out.x = Number(p.x) || 0;
    out.y = Number(p.y) || 0;
  }
  return out;
}

function normLabel(l) {
  if (l == null || l === '' || l === false) return null;
  if (typeof l === 'string') return { ...LABEL_DEFAULT, text: l };
  return { ...LABEL_DEFAULT, ...l, text: String(l.text ?? '') };
}

/**
 * Fill defaults and coerce types for one element. Does not assign ids.
 * Unknown properties are preserved so the format can be extended.
 */
export function normalizeElement(el) {
  const type = el.type || (el.icon ? 'icon' : el.shape ? 'shape' : el.from || el.to ? 'arrow' : el.points ? 'path' : el.image || el.src ? 'image' : el.author ? 'note' : 'text');
  const d = DEFAULTS[type];
  if (!d) throw new Error(`Unknown element type "${el.type}". Use one of: ${ELEMENT_TYPES.join(', ')}`);
  const out = { ...clone(d), ...clone(el), type };
  if (type === 'arrow') {
    out.from = normEndpoint(out.from);
    out.to = normEndpoint(out.to);
    if (!HEADS.includes(out.head)) out.head = 'arrow';
    if (!HEADS.includes(out.tail)) out.tail = 'none';
    if (!ROUTINGS.includes(out.routing)) out.routing = 'straight';
    out.stroke = normalizeColor(out.stroke, DEFAULTS.arrow.stroke);
    out.width = num(out.width, 3);
    out.curvature = num(out.curvature, 0.3);
    out.gap = num(out.gap, 6);
    out.labelSize = num(out.labelSize, 14);
    delete out.x; delete out.y; delete out.w; delete out.h; delete out.rotation;
    return out;
  }
  out.x = num(out.x, 0);
  out.y = num(out.y, 0);
  out.rotation = num(out.rotation, 0);
  out.opacity = Math.max(0, Math.min(1, num(out.opacity, 1)));
  if (type === 'icon') {
    const def = getIcon(out.icon);
    const aspect = def ? def.h / def.w : 1;
    const dw = def ? def.size : 120;
    if (out.w == null && out.h == null) { out.w = dw; out.h = dw * aspect; }
    else if (out.w == null) out.w = num(out.h, dw) / aspect;
    else if (out.h == null) out.h = num(out.w, dw) * aspect;
    out.w = num(out.w, dw); out.h = num(out.h, dw * aspect);
    out.label = normLabel(out.label);
    out.colors = out.colors || {};
  } else if (type === 'shape') {
    if (!SHAPES.includes(out.shape)) out.shape = 'rect';
    out.w = num(out.w, 160); out.h = num(out.h, 100);
    if (out.shape.startsWith('membrane') && el.fill == null) out.fill = '#f6c37b';
    if (out.shape.startsWith('membrane') && el.stroke == null) out.stroke = '#d9893b';
    if (out.shape === 'plot') {
      if (el.fill == null) out.fill = '#ffffff';
      if (el.stroke == null) out.stroke = '#1f2933';
      if (el.strokeWidth == null) out.strokeWidth = 1.5;
      out.plot = { kind: 'dot', ...(out.plot || {}) };
    }
    // lipid heads and plot backgrounds take one color; other shapes may take a gradient
    out.fill = out.shape.startsWith('membrane') || out.shape === 'plot' ? normalizeColor(paintColor(out.fill), 'none') : normalizePaint(out.fill, 'none');
    if (out.inner != null) out.inner = out.inner ? normalizePaint(out.inner, 'none') : null;
    out.stroke = normalizeColor(out.stroke, 'none');
    out.strokeWidth = num(out.strokeWidth, 2);
    out.label = normLabel(out.label);
  } else if (type === 'panel') {
    out.w = num(out.w, 520); out.h = num(out.h, 360);
    out.title = String(out.title ?? '');
    out.fill = normalizePaint(out.fill, 'none');
    out.stroke = normalizeColor(out.stroke, 'none');
    out.strokeWidth = num(out.strokeWidth, 1.5);
    out.radius = Math.max(0, num(out.radius, 14));
    if (out.letter != null && out.letter !== false) out.letter = String(out.letter);
    for (const k of ['letterSize', 'titleSize']) if (!(Number(out[k]) > 0)) delete out[k]; else out[k] = Number(out[k]);
  } else if (type === 'image') {
    if (out.src) { out.image = registerImage({ src: out.src, name: out.name }); delete out.src; }
    delete out.file;
    const img = getImage(out.image);
    let c = out.crop;
    if (c && typeof c === 'object') {
      const cx = clamp01(num(c.x, 0)), cy = clamp01(num(c.y, 0));
      c = { x: cx, y: cy, w: Math.max(0.01, Math.min(1 - cx, num(c.w, 1 - cx))), h: Math.max(0.01, Math.min(1 - cy, num(c.h, 1 - cy))) };
      out.crop = c.x === 0 && c.y === 0 && c.w === 1 && c.h === 1 ? null : c;
    } else out.crop = null;
    const cw = (out.crop?.w ?? 1) * (img?.w || 400), ch = (out.crop?.h ?? 1) * (img?.h || 300);
    const aspect = ch / cw;
    if (el.w == null && el.h == null) { out.w = Math.min(480, cw); out.h = out.w * aspect; }
    else if (el.w == null) { out.h = num(el.h, 300); out.w = out.h / aspect; }
    else if (el.h == null) { out.w = num(el.w, 400); out.h = out.w * aspect; }
    out.w = num(out.w, 400); out.h = num(out.h, 300);
    out.radius = Math.max(0, num(out.radius, 0));
    out.stroke = normalizeColor(out.stroke, 'none');
    out.strokeWidth = num(out.strokeWidth, 2);
    if (out.scaleBar && typeof out.scaleBar === 'object') {
      const sb = out.scaleBar;
      out.scaleBar = {
        length: num(sb.length, 10), unit: String(sb.unit ?? 'µm'), perPx: num(sb.perPx ?? sb.umPerPx ?? sb.per_px, 0),
        position: CORNERS.includes(sb.position) ? sb.position : 'bottom-right', color: normalizeColor(sb.color, '#ffffff'),
        label: sb.label !== false, ...(sb.thickness != null ? { thickness: num(sb.thickness, 4) } : {}), ...(sb.fontSize != null ? { fontSize: num(sb.fontSize, 14) } : {}),
      };
    } else out.scaleBar = null;
    out.label = normLabel(out.label);
  } else if (type === 'path') {
    // points are canvas coordinates; if the spec also gives x/y, they are relative to (x, y)
    const stored = el.vw != null && el.vh != null && el.w != null && el.h != null;
    if (!stored && (el.x != null || el.y != null) && Array.isArray(el.points)) {
      const ox = Number(el.x) || 0, oy = Number(el.y) || 0;
      out.points = el.points.map((q) => (Array.isArray(q) ? [Number(q[0]) + ox, Number(q[1]) + oy, ...q.slice(2)] : { ...q, x: Number(q.x) + ox, y: Number(q.y) + oy }));
    }
    Object.assign(out, normalizePath(out));
    out.membrane = !!out.membrane;
    if (out.membrane && el.fill == null) out.fill = '#f6c37b';
    if (out.membrane && el.stroke == null) out.stroke = '#d9893b';
    out.fill = out.membrane ? normalizeColor(paintColor(out.fill), 'none') : normalizePaint(out.fill, 'none');
    out.stroke = normalizeColor(out.stroke, 'none');
    out.inner = out.inner ? normalizePaint(out.inner, 'none') : null;
    out.strokeWidth = num(out.strokeWidth, 3);
    out.thickness = Math.max(6, num(out.thickness, 26));
    if (!HEADS.includes(out.head)) out.head = 'none';
    if (!HEADS.includes(out.tail)) out.tail = 'none';
  } else if (type === 'note') {
    out.text = String(out.text ?? '');
    out.w = num(out.w, 200);
    out.color = NOTE_COLORS[out.color] || normalizeColor(out.color, '#fff1a8');
    out.author = out.author === 'claude' || out.author === 'agent' ? 'claude' : 'you';
    out.resolved = !!out.resolved;
    if (out.target != null) out.target = String(out.target);
  } else if (type === 'text') {
    out.text = String(out.text ?? '');
    out.fontSize = num(out.fontSize, 20);
    out.w = num(out.w, 0);
    out.color = normalizeColor(out.color, '#1f2933');
    if (!['left', 'center', 'right'].includes(out.align)) out.align = 'left';
  }
  return out;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/** Normalize a whole figure (accepts partial / hand-written JSON). */
export function normalizeFigure(input) {
  const src = typeof input === 'string' ? JSON.parse(input) : clone(input || {});
  registerEmbeddedImages(src);
  const doc = createFigure({
    title: src.title,
    width: num(src.canvas?.width ?? src.width, 1200),
    height: num(src.canvas?.height ?? src.height, 800),
    background: src.canvas?.background ?? src.background ?? '#ffffff',
    font: src.font || DEFAULT_FONT,
  });
  doc.canvas.background = normalizeColor(doc.canvas.background, '#ffffff');
  // the printed width in mm, when known: text sizes can then be read and set in points
  if (Number(src.canvas?.printWidth) > 0) doc.canvas.printWidth = Number(src.canvas.printWidth);
  if (src.title == null) doc.title = 'Untitled figure';
  for (const k of Object.keys(src)) {
    if (!['fortheplot', 'epitope', 'title', 'canvas', 'font', 'elements', 'width', 'height', 'background', 'images'].includes(k)) doc[k] = src[k];
  }
  for (const raw of src.elements || []) {
    const el = normalizeElement(raw);
    el.id = raw.id ? String(raw.id) : newId(doc, el.icon || el.shape || el.type);
    if (doc.elements.some((e) => e.id === el.id)) el.id = newId(doc, el.id);
    doc.elements.push(el);
  }
  return doc;
}

/** Validate a figure. Returns a list of { level: 'error'|'warning', id?, message }. */
export function validateFigure(doc) {
  const issues = [];
  if (!doc || typeof doc !== 'object') return [{ level: 'error', message: 'Figure must be an object' }];
  if (doc.fortheplot !== FORMAT_VERSION) issues.push({ level: 'warning', message: `Expected "fortheplot": ${FORMAT_VERSION}` });
  if (!Array.isArray(doc.elements)) return [...issues, { level: 'error', message: '"elements" must be an array' }];
  const ids = new Set();
  for (const el of doc.elements) {
    if (!el.id) issues.push({ level: 'error', message: 'Element without id' });
    else if (ids.has(el.id)) issues.push({ level: 'error', id: el.id, message: `Duplicate id "${el.id}"` });
    if (el.attachedTo && !doc.elements.some((x) => x.id === el.attachedTo)) delete el.attachedTo;
    ids.add(el.id);
    if (!ELEMENT_TYPES.includes(el.type)) issues.push({ level: 'error', id: el.id, message: `Unknown type "${el.type}"` });
    if (el.type === 'icon' && !getIcon(el.icon)) issues.push({ level: 'error', id: el.id, message: `Unknown icon "${el.icon}" (search with: fortheplot icons <query>)` });
    if (el.type === 'shape' && !SHAPES.includes(el.shape)) issues.push({ level: 'error', id: el.id, message: `Unknown shape "${el.shape}"` });
    if (el.type === 'image' && !getImage(el.image)) issues.push({ level: 'error', id: el.id, message: `Image "${el.id}" has no picture data (the file's "images" map is missing "${el.image}")` });
    if (el.type === 'path' && (!Array.isArray(el.points) || el.points.length < 2)) issues.push({ level: 'error', id: el.id, message: `Path "${el.id}" needs at least 2 points` });
    if (el.type === 'note' && el.target && !doc.elements.some((x) => x.id === el.target)) issues.push({ level: 'warning', id: el.id, message: `Note "${el.id}" points at missing element "${el.target}"` });
  }
  for (const el of doc.elements) {
    if (el.type !== 'arrow') continue;
    for (const end of ['from', 'to']) {
      const p = el[end];
      if (!p) issues.push({ level: 'error', id: el.id, message: `Arrow is missing "${end}"` });
      else if (p.id != null && !ids.has(p.id)) issues.push({ level: 'error', id: el.id, message: `Arrow ${end} references missing element "${p.id}"` });
    }
  }
  return issues;
}

export function findElement(doc, id) {
  return doc.elements.find((e) => e.id === id);
}

/** Elements that share a group with any of the given ids (including themselves). */
export function expandGroups(doc, ids) {
  const set = new Set(ids);
  const groups = new Set(doc.elements.filter((e) => set.has(e.id) && e.group).map((e) => e.group));
  if (!groups.size) return [...set];
  for (const e of doc.elements) if (e.group && groups.has(e.group)) set.add(e.id);
  return [...set];
}

/** The given ids plus everything attached to their surfaces (recursively). */
export function expandAttached(doc, ids) {
  const set = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of doc.elements) if (e.attachedTo && set.has(e.attachedTo) && !set.has(e.id)) { set.add(e.id); grew = true; }
  }
  return [...set];
}
