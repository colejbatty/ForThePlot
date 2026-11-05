// Geometry: element bounds, attachment anchors and arrow routing.

import { getIcon } from '../icons/registry.js';
import { layoutText } from './text.js';
import { samplePath, pointAt, nearestOnPath, rayHit, outwardSign } from './path.js';

const DEG = Math.PI / 180;

export function rotatePoint(p, c, deg) {
  if (!deg) return { x: p.x, y: p.y };
  const a = deg * DEG, cos = Math.cos(a), sin = Math.sin(a);
  const dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

/** Measured text layout for a text element (cached by content). */
const textCache = new Map();
export function textLayout(el) {
  const key = `${el.text}|${el.fontSize}|${el.w}|${el.bold}|${el.italic}`;
  let lay = textCache.get(key);
  if (!lay) {
    lay = layoutText(el.text, { fontSize: el.fontSize, maxWidth: el.w || 0, bold: el.bold, italic: el.italic });
    if (textCache.size > 2000) textCache.clear();
    textCache.set(key, lay);
  }
  return lay;
}

export const TEXT_PAD = 6;

/** Unrotated box {x, y, w, h} of an element (arrows: bbox of the routed path). */
export const NOTE_FONT = 14;
export function noteLayout(el) {
  return layoutText(el.text || ' ', { fontSize: NOTE_FONT, maxWidth: Math.max(40, el.w - 20) });
}

export function elementBox(el, doc) {
  if (el.type === 'note') {
    const lay = noteLayout(el);
    return { x: el.x, y: el.y, w: el.w, h: 30 + lay.height + 12 };
  }
  if (el.type === 'text') {
    const lay = textLayout(el);
    const pad = el.background ? TEXT_PAD : 0;
    return { x: el.x, y: el.y, w: (el.w || lay.width) + pad * 2, h: lay.height + pad * 2 };
  }
  if (el.type === 'arrow') {
    const g = arrowGeometry(el, doc);
    const pts = g.allPoints;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  return { x: el.x, y: el.y, w: el.w, h: el.h };
}

export function center(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

/** Axis-aligned bounds after rotation. */
export function rotatedBounds(box, deg) {
  if (!deg) return { ...box };
  const c = center(box);
  const pts = [
    { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h }, { x: box.x, y: box.y + box.h },
  ].map((p) => rotatePoint(p, c, deg));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Box occupied by an icon/shape label, or null. */
export function labelBox(el) {
  const l = el.label;
  if (!l || !l.text || l.position === 'none') return null;
  const lay = layoutText(l.text, { fontSize: l.fontSize, bold: l.bold, maxWidth: l.maxWidth || 0 });
  const gap = 6;
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
  let x, y;
  switch (l.position) {
    case 'top': x = cx - lay.width / 2; y = el.y - gap - lay.height; break;
    case 'left': x = el.x - gap - lay.width; y = cy - lay.height / 2; break;
    case 'right': x = el.x + el.w + gap; y = cy - lay.height / 2; break;
    case 'center': x = cx - lay.width / 2; y = cy - lay.height / 2; break;
    default: x = cx - lay.width / 2; y = el.y + el.h + gap;
  }
  return { x, y, w: lay.width, h: lay.height, layout: lay };
}

/** Visual bounds including rotation and labels — used for selection, fit and lint. */
export function pathPad(el) {
  if (el.membrane) return Math.max(4, (el.thickness || 26) / 2);
  const hw = (el.strokeWidth || 0) / 2;
  const heads = (el.head && el.head !== 'none') || (el.tail && el.tail !== 'none');
  return hw + (heads ? headSize(el.strokeWidth || 2) * 0.6 : 0);
}

export function visualBounds(el, doc) {
  if (el.type === 'path') {
    const p = pathPad(el), box = elementBox(el, doc);
    return rotatedBounds({ x: box.x - p, y: box.y - p, w: box.w + 2 * p, h: box.h + 2 * p }, el.rotation);
  }
  const b = el.type === 'arrow' ? elementBox(el, doc) : rotatedBounds(elementBox(el, doc), el.rotation);
  const lb = el.type !== 'arrow' && el.type !== 'text' ? labelBox(el) : null;
  return lb ? union([b, lb]) : b;
}

export function union(boxes) {
  const bs = boxes.filter(Boolean);
  if (!bs.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  const r = Math.max(...bs.map((b) => b.x + b.w)), btm = Math.max(...bs.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: btm - y };
}

export function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function outlineKind(el) {
  if (el.type === 'icon') return getIcon(el.icon)?.shape || 'rect';
  if (el.type === 'shape') return el.shape === 'ellipse' || el.shape === 'membrane-ellipse' ? 'ellipse' : 'rect';
  return 'rect';
}

const NAMED_ANCHORS = {
  center: [0.5, 0.5], top: [0.5, 0], bottom: [0.5, 1], left: [0, 0.5], right: [1, 0.5],
  'top-left': [0, 0], 'top-right': [1, 0], 'bottom-left': [0, 1], 'bottom-right': [1, 1],
};

/**
 * World-space point where an arrow attaches to an element.
 * anchor: a named anchor or 'auto' (boundary point facing `toward`).
 */
export function anchorPoint(el, anchor, toward, gap, doc) {
  const box = elementBox(el, doc);
  const c = center(box);
  const rot = el.type === 'arrow' ? 0 : el.rotation || 0;
  if (anchor && anchor !== 'auto' && NAMED_ANCHORS[anchor]) {
    const [fx, fy] = NAMED_ANCHORS[anchor];
    const local = { x: box.x + box.w * fx, y: box.y + box.h * fy };
    // attach beyond a label that sits on that side, so lines don't cross the text
    const lb = !rot && (anchor === 'bottom' || anchor === 'top') && el.label?.position === anchor ? labelBox(el) : null;
    if (lb) return { x: local.x, y: anchor === 'bottom' ? lb.y + lb.h + gap : lb.y - gap };
    if (anchor !== 'center') {
      const dx = local.x - c.x, dy = local.y - c.y, len = Math.hypot(dx, dy) || 1;
      local.x += (dx / len) * gap;
      local.y += (dy / len) * gap;
    }
    return rotatePoint(local, c, rot);
  }
  if (el.type === 'path') return pathAnchor(el, toward, gap);
  // auto: intersect ray from center toward target with the outline (in local frame)
  const t = rotatePoint(toward, c, -rot);
  let dx = t.x - c.x, dy = t.y - c.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { ...c };
  dx /= len; dy /= len;
  const k = el.type === 'icon' ? (getIcon(el.icon)?.body ?? 1) : 1;
  const hw = Math.max((box.w / 2) * k, 1), hh = Math.max((box.h / 2) * k, 1);
  let s;
  if (outlineKind(el) === 'ellipse') s = 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2);
  else s = Math.min(Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity);
  const p = { x: c.x + dx * (s + gap), y: c.y + dy * (s + gap) };
  return rotatePoint(p, c, rot);
}

/** Where an arrow aimed at `toward` meets a path: its outline if closed, else its nearest point. */
function pathAnchor(el, toward, gap) {
  const S = samplePath(el);
  if (S.length < 2) return { x: el.x, y: el.y };
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  let u = null;
  if (el.closed) u = rayHit(el, (Math.atan2(toward.y - c.y, toward.x - c.x) * 180) / Math.PI, S);
  if (u == null) u = nearestOnPath(el, toward, S).u;
  const P = pointAt(el, u, S);
  const off = (el.membrane ? (el.thickness || 26) / 2 : (el.strokeWidth || 0) / 2) + gap;
  let dx = toward.x - P.x, dy = toward.y - P.y;
  const l = Math.hypot(dx, dy) || 1;
  dx /= l; dy /= l;
  return { x: P.x + dx * off, y: P.y + dy * off };
}

let arrowDepth = 0;
function endpointCenter(p, doc) {
  if (!p) return { x: 0, y: 0 };
  if (p.id != null) {
    const el = doc.elements.find((e) => e.id === p.id);
    if (!el) return { x: 0, y: 0 };
    if (el.type !== 'arrow') return center(elementBox(el, doc));
    // Arrows may point at the midpoint of another arrow (e.g. "inhibits binding").
    if (arrowDepth > 3) return { x: 0, y: 0 };
    arrowDepth++;
    try { return arrowGeometry(el, doc).mid; } finally { arrowDepth--; }
  }
  return { x: p.x, y: p.y };
}

function resolveEnd(p, toward, gap, doc, forcedAnchor) {
  if (p && p.id != null) {
    const el = doc.elements.find((e) => e.id === p.id);
    if (el && el.type !== 'arrow') {
      const anchor = p.anchor && p.anchor !== 'auto' ? p.anchor : forcedAnchor || 'auto';
      return { pt: anchorPoint(el, anchor, toward, gap, doc), side: sideOf(anchor) };
    }
    return { pt: endpointCenter(p, doc), side: null };
  }
  return { pt: { x: p?.x || 0, y: p?.y || 0 }, side: null };
}

function sideOf(anchor) {
  if (anchor === 'left' || anchor === 'right') return 'h';
  if (anchor === 'top' || anchor === 'bottom') return 'v';
  return null;
}

/**
 * Point on an element's outline in direction `angle` (degrees; 0 = right, 90 = down),
 * moved inward by `inset` px. Used to seat receptors on cell membranes.
 */
export function surfacePoint(el, angle, doc, inset = 0) {
  if (el.type === 'path') {
    const S = samplePath(el);
    const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
    let u = rayHit(el, angle, S);
    if (u == null) { const R = Math.max(el.w, el.h) * 2, a = (angle * Math.PI) / 180; u = nearestOnPath(el, { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R }, S).u; }
    const P = pointAt(el, u, S);
    const sgn = outwardSign(el, P, S);
    const half = el.membrane ? (el.thickness || 26) / 2 : 0;
    return { x: P.x + P.nx * sgn * (half - inset), y: P.y + P.ny * sgn * (half - inset) };
  }
  const box = elementBox(el, doc);
  const c = center(box);
  const rot = el.rotation || 0;
  const a = ((angle - rot) * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const k = el.type === 'icon' ? (getIcon(el.icon)?.body ?? 1) : 1;
  const hw = Math.max((box.w / 2) * k, 1), hh = Math.max((box.h / 2) * k, 1);
  let s;
  if (outlineKind(el) === 'ellipse') s = 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2);
  else s = Math.min(Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity);
  const p = { x: c.x + dx * (s - inset), y: c.y + dy * (s - inset) };
  return rotatePoint(p, c, rot);
}

export function headSize(width) {
  return 6 + 3.2 * width;
}

function shorten(head, width) {
  const L = headSize(width);
  switch (head) {
    case 'arrow': return L * 0.8;
    case 'diamond': return L;
    case 'circle': return L * 0.8;
    case 'open': return width * 0.6;
    default: return 0;
  }
}

function norm(v) {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

/**
 * Compute the routed geometry of an arrow.
 * Returns { d, start, end, startDir, endDir, mid, allPoints }.
 * startDir points *out of* the start (for the tail), endDir points *into* the end (for the head).
 */
export function arrowGeometry(el, doc) {
  const gap = el.gap ?? 6;
  const c0 = endpointCenter(el.from, doc), c1 = endpointCenter(el.to, doc);
  let A, B;
  if (el.routing === 'elbow') {
    const horiz = Math.abs(c1.x - c0.x) >= Math.abs(c1.y - c0.y);
    const fa = horiz ? (c1.x >= c0.x ? 'right' : 'left') : (c1.y >= c0.y ? 'bottom' : 'top');
    const ta = horiz ? (c1.x >= c0.x ? 'left' : 'right') : (c1.y >= c0.y ? 'top' : 'bottom');
    A = resolveEnd(el.from, c1, gap, doc, fa);
    B = resolveEnd(el.to, c0, gap, doc, ta);
    const sa = A.side || B.side || (horiz ? 'h' : 'v');
    const sb = B.side || A.side || (horiz ? 'h' : 'v');
    const p0 = A.pt, p3 = B.pt;
    let pts;
    const fa2 = el.from?.anchor, ta2 = el.to?.anchor;
    const clear = el.clearance ?? 32;
    if (sa === 'h' && sb === 'h') {
      let mx = (p0.x + p3.x) / 2;
      if (fa2 === ta2 && fa2 === 'right') mx = Math.max(p0.x, p3.x) + clear;
      if (fa2 === ta2 && fa2 === 'left') mx = Math.min(p0.x, p3.x) - clear;
      pts = [p0, { x: mx, y: p0.y }, { x: mx, y: p3.y }, p3];
    } else if (sa === 'v' && sb === 'v') {
      let my = (p0.y + p3.y) / 2;
      if (fa2 === ta2 && fa2 === 'bottom') my = Math.max(p0.y, p3.y) + clear;
      if (fa2 === ta2 && fa2 === 'top') my = Math.min(p0.y, p3.y) - clear;
      pts = [p0, { x: p0.x, y: my }, { x: p3.x, y: my }, p3];
    } else if (sa === 'h') {
      pts = [p0, { x: p3.x, y: p0.y }, p3];
    } else {
      pts = [p0, { x: p0.x, y: p3.y }, p3];
    }
    pts = pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.5);
    if (pts.length < 2) pts = [p0, p3];
    return polyGeometry(pts, el);
  }
  if (el.routing === 'curved') {
    const mid = { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
    const L = Math.hypot(c1.x - c0.x, c1.y - c0.y);
    const n = norm({ x: -(c1.y - c0.y), y: c1.x - c0.x });
    const ctrl0 = { x: mid.x + n.x * L * (el.curvature ?? 0.3), y: mid.y + n.y * L * (el.curvature ?? 0.3) };
    A = resolveEnd(el.from, ctrl0, gap, doc);
    B = resolveEnd(el.to, ctrl0, gap, doc);
    const p0 = A.pt, p2 = B.pt;
    // recompute control from the actual attach points so the curve is symmetric
    const m2 = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };
    const L2 = Math.hypot(p2.x - p0.x, p2.y - p0.y);
    const n2 = norm({ x: -(p2.y - p0.y), y: p2.x - p0.x });
    const ctrl = { x: m2.x + n2.x * L2 * (el.curvature ?? 0.3), y: m2.y + n2.y * L2 * (el.curvature ?? 0.3) };
    const endDir = norm({ x: p2.x - ctrl.x, y: p2.y - ctrl.y });
    const startDir = norm({ x: ctrl.x - p0.x, y: ctrl.y - p0.y });
    const s0 = shorten(el.tail, el.width), s1 = shorten(el.head, el.width);
    const q0 = { x: p0.x + startDir.x * s0, y: p0.y + startDir.y * s0 };
    const q2 = { x: p2.x - endDir.x * s1, y: p2.y - endDir.y * s1 };
    const midPt = { x: 0.25 * p0.x + 0.5 * ctrl.x + 0.25 * p2.x, y: 0.25 * p0.y + 0.5 * ctrl.y + 0.25 * p2.y };
    return {
      d: `M${f(q0.x)} ${f(q0.y)} Q${f(ctrl.x)} ${f(ctrl.y)} ${f(q2.x)} ${f(q2.y)}`,
      start: p0, end: p2, startDir, endDir, mid: midPt, ctrl, midDir: norm({ x: p2.x - p0.x, y: p2.y - p0.y }),
      allPoints: [p0, p2, midPt],
    };
  }
  A = resolveEnd(el.from, c1, gap, doc);
  B = resolveEnd(el.to, c0, gap, doc);
  // Refine: aim each end at the other's attach point (better for unequal sizes)
  if (el.from?.id != null) A = resolveEnd(el.from, B.pt, gap, doc);
  if (el.to?.id != null) B = resolveEnd(el.to, A.pt, gap, doc);
  return polyGeometry([A.pt, B.pt], el);
}

function polyGeometry(pts, el) {
  const n = pts.length;
  const startDir = norm({ x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y });
  const endDir = norm({ x: pts[n - 1].x - pts[n - 2].x, y: pts[n - 1].y - pts[n - 2].y });
  const s0 = shorten(el.tail, el.width), s1 = shorten(el.head, el.width);
  const drawn = pts.map((p) => ({ ...p }));
  drawn[0] = { x: pts[0].x + startDir.x * s0, y: pts[0].y + startDir.y * s0 };
  drawn[n - 1] = { x: pts[n - 1].x - endDir.x * s1, y: pts[n - 1].y - endDir.y * s1 };
  const d = drawn.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join(' ');
  // midpoint along the polyline
  let total = 0;
  const segs = [];
  for (let i = 1; i < n; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segs.push(l);
    total += l;
  }
  let acc = 0, mid = { ...pts[0] }, midDir = startDir;
  for (let i = 1; i < n; i++) {
    if (acc + segs[i - 1] >= total / 2) {
      const t = (total / 2 - acc) / (segs[i - 1] || 1);
      mid = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
      midDir = norm({ x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y });
      break;
    }
    acc += segs[i - 1];
  }
  return { d, start: pts[0], end: pts[n - 1], startDir, endDir, mid, midDir, points: pts, allPoints: pts };
}

/** SVG markup for an arrow head at tip `t` pointing along unit vector `u`. */
export function headSVG(kind, t, u, width, color) {
  if (!kind || kind === 'none') return '';
  const L = headSize(width), W = L * 0.95;
  const n = { x: -u.y, y: u.x };
  const P = (along, side) => ({ x: t.x - u.x * along + n.x * side, y: t.y - u.y * along + n.y * side });
  const pt = (p) => `${f(p.x)} ${f(p.y)}`;
  switch (kind) {
    case 'arrow': {
      const a = P(L, W / 2), b = P(L * 0.78, 0), c = P(L, -W / 2);
      return `<path d="M${pt(t)} L${pt(a)} L${pt(b)} L${pt(c)} Z" fill="${color}" stroke="${color}" stroke-width="${f(width * 0.4)}" stroke-linejoin="round"/>`;
    }
    case 'open': {
      const a = P(L * 0.9, W / 2), c = P(L * 0.9, -W / 2);
      return `<path d="M${pt(a)} L${pt(t)} L${pt(c)}" fill="none" stroke="${color}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    case 'inhibit': {
      const a = P(0, W * 0.75), c = P(0, -W * 0.75);
      return `<path d="M${pt(a)} L${pt(c)}" stroke="${color}" stroke-width="${f(width * 1.4)}" stroke-linecap="round"/>`;
    }
    case 'circle': {
      const r = L * 0.4, cc = P(r, 0);
      return `<circle cx="${f(cc.x)}" cy="${f(cc.y)}" r="${f(r)}" fill="${color}"/>`;
    }
    case 'diamond': {
      const a = P(L / 2, W * 0.42), b = P(L, 0), c = P(L / 2, -W * 0.42);
      return `<path d="M${pt(t)} L${pt(a)} L${pt(b)} L${pt(c)} Z" fill="${color}"/>`;
    }
    default: return '';
  }
}

export function f(n) {
  return String(Math.round(n * 100) / 100);
}
