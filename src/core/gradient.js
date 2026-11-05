// Gradient fills. Anywhere a shape, closed path, panel or membrane interior takes a fill color,
// it can take a gradient instead:
//
//   { "type": "linear", "angle": 90, "stops": [{ "offset": 0, "color": "#4a8fe7" }, { "offset": 1, "color": "#9b5de5" }] }
//   { "type": "radial", "cx": 0.35, "cy": 0.3, "r": 0.75, "stops": [ … ] }
//
// `angle` follows CSS: 0 points up, 90 runs left → right, 180 (the default) top → bottom.
// Radial centers and radius are fractions of the object's box (0.5, 0.5, 0.5 by default).
// When writing, shorthands are accepted too: "linear-gradient(90deg, #fff, #4a8fe7)",
// "radial-gradient(#ffffff, #4a8fe7 80%)", or { "type": "linear", "colors": ["#fff", "#4a8fe7"] }.

import { normalizeColor, mix } from './color.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const r3 = (v) => Math.round(v * 1000) / 1000;

export function isGradient(v) {
  return !!v && typeof v === 'object' && (v.type === 'linear' || v.type === 'radial') && Array.isArray(v.stops);
}

/** Split "a, b(c, d), e" at top-level commas. */
function splitTop(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const SIDES = {
  'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270,
  'to top right': 45, 'to right top': 45, 'to bottom right': 135, 'to right bottom': 135,
  'to bottom left': 225, 'to left bottom': 225, 'to top left': 315, 'to left top': 315,
};

/** Parse a CSS-style gradient string, or return null. */
export function parseCssGradient(str) {
  const m = /^\s*(linear|radial)-gradient\(\s*([\s\S]*)\)\s*$/i.exec(String(str));
  if (!m) return null;
  const type = m[1].toLowerCase();
  const parts = splitTop(m[2]);
  const g = { type, stops: [] };
  if (type === 'linear' && parts.length) {
    const p = parts[0].toLowerCase().trim();
    const deg = /^(-?[\d.]+)\s*(deg|turn|rad)$/.exec(p);
    if (deg) { g.angle = deg[2] === 'turn' ? Number(deg[1]) * 360 : deg[2] === 'rad' ? (Number(deg[1]) * 180) / Math.PI : Number(deg[1]); parts.shift(); } else if (SIDES[p] != null) { g.angle = SIDES[p]; parts.shift(); }
  }
  if (type === 'radial' && parts.length && /^(circle|ellipse|closest|farthest|at\s)/i.test(parts[0])) {
    const at = /at\s+(-?[\d.]+)%\s+(-?[\d.]+)%/i.exec(parts[0]);
    if (at) { g.cx = Number(at[1]) / 100; g.cy = Number(at[2]) / 100; }
    parts.shift();
  }
  for (const p of parts) {
    const sm = /^(.*?)(?:\s+(-?[\d.]+)%)?$/.exec(p.trim());
    g.stops.push({ color: sm[1].trim(), ...(sm[2] != null ? { offset: Number(sm[2]) / 100 } : {}) });
  }
  return g;
}

/** A gradient in its stored form, or null if `v` isn't one. */
export function normalizeGradient(v) {
  let g = v;
  if (typeof g === 'string') g = parseCssGradient(g);
  if (!g || typeof g !== 'object' || (g.type !== 'linear' && g.type !== 'radial')) return null;
  let stops = Array.isArray(g.stops) ? g.stops : Array.isArray(g.colors) ? g.colors.map((c) => ({ color: c })) : [];
  stops = stops.map((s) => (typeof s === 'string' ? { color: s } : s)).filter((s) => s && s.color != null);
  if (stops.length === 0) return null;
  if (stops.length === 1) stops = [stops[0], { ...stops[0] }];
  // fill in missing offsets evenly between known ones, as CSS does
  const off = stops.map((s) => (s.offset != null && Number.isFinite(Number(s.offset)) ? clamp01(Number(s.offset)) : null));
  if (off[0] == null) off[0] = 0;
  if (off[off.length - 1] == null) off[off.length - 1] = 1;
  for (let i = 1; i < off.length; i++) {
    if (off[i] != null) { off[i] = Math.max(off[i], off[i - 1]); continue; }
    let j = i;
    while (off[j] == null) j++;
    for (let k = i; k < j; k++) off[k] = off[i - 1] + ((off[j] - off[i - 1]) * (k - i + 1)) / (j - i + 1);
  }
  const out = {
    type: g.type,
    stops: stops.map((s, i) => {
      const o = { offset: r3(off[i]), color: normalizeColor(s.color, '#000000') };
      if (s.opacity != null && Number(s.opacity) < 1) o.opacity = r3(clamp01(Number(s.opacity)));
      return o;
    }),
  };
  if (g.type === 'linear') out.angle = ((num(g.angle, 180) % 360) + 360) % 360;
  else {
    out.cx = r3(num(g.cx, 0.5));
    out.cy = r3(num(g.cy, 0.5));
    out.r = r3(Math.max(0.05, num(g.r, 0.5)));
  }
  return out;
}

/** A fill value in stored form: a gradient object, or a color string ("none" allowed). */
export function normalizePaint(v, fallback = 'none') {
  if (v && (typeof v === 'object' || /gradient\(/i.test(String(v)))) return normalizeGradient(v) || fallback;
  return normalizeColor(v, fallback);
}

/** One color that stands for a fill (for text contrast, thumbnails, exports without gradients). */
export function paintColor(v, fallback = 'none') {
  if (!isGradient(v)) return v == null ? fallback : v;
  const cs = v.stops.map((s) => s.color).filter((c) => c !== 'none');
  if (!cs.length) return fallback;
  let c = cs[0];
  for (let i = 1; i < cs.length; i++) c = mix(c, cs[i], 1 / (i + 1));
  return c;
}

/** Line endpoints (object bounding box units) for a CSS angle, reaching the corners like CSS does. */
function linearEnds(angle) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const half = (Math.abs(dx) + Math.abs(dy)) / 2;
  return { x1: 0.5 - dx * half, y1: 0.5 - dy * half, x2: 0.5 + dx * half, y2: 0.5 + dy * half };
}

/** SVG markup for a gradient definition. */
export function gradientDef(g, id) {
  const stops = g.stops.map((s) => `<stop offset="${r3(s.offset)}" stop-color="${s.color === 'none' ? '#ffffff' : s.color}"${s.color === 'none' ? ' stop-opacity="0"' : s.opacity != null ? ` stop-opacity="${s.opacity}"` : ''}/>`).join('');
  if (g.type === 'radial') return `<radialGradient id="${id}" cx="${r3(g.cx)}" cy="${r3(g.cy)}" r="${r3(g.r)}">${stops}</radialGradient>`;
  const e = linearEnds(g.angle ?? 180);
  return `<linearGradient id="${id}" x1="${r3(e.x1)}" y1="${r3(e.y1)}" x2="${r3(e.x2)}" y2="${r3(e.y2)}">${stops}</linearGradient>`;
}

/** Fill attribute value plus any <defs> it needs: { fill, defs }. */
export function paint(v, id) {
  if (!isGradient(v)) return { fill: v || 'none', defs: '' };
  const safe = String(id).replace(/[^A-Za-z0-9_-]/g, '_');
  return { fill: `url(#${safe})`, defs: `<defs>${gradientDef(v, safe)}</defs>` };
}

/** CSS for previews in the editor. */
export function cssGradient(g) {
  if (!isGradient(g)) return g && g !== 'none' ? g : 'transparent';
  const stops = g.stops.map((s) => `${s.color === 'none' ? 'transparent' : s.color} ${Math.round(s.offset * 100)}%`).join(', ');
  return g.type === 'radial'
    ? `radial-gradient(circle at ${Math.round(g.cx * 100)}% ${Math.round(g.cy * 100)}%, ${stops})`
    : `linear-gradient(${Math.round(g.angle ?? 180)}deg, ${stops})`;
}

/** Short text for descriptions, e.g. "linear-gradient(90deg, #ffffff 0%, #4a8fe7 100%)". */
export function paintText(v) {
  if (!isGradient(v)) return String(v);
  return cssGradient(v);
}
