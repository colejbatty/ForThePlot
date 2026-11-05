// Free-form paths (pen and pencil tools): cubic Bézier curves through anchor points.
//
// Stored form: the element box {x, y, w, h} plus `points` in local units of a reference box
// {vw, vh}, so resizing a path scales it like an icon. A point is {x, y, in?, out?} where `in` and
// `out` are handle offsets [dx, dy]. With `smooth: true`, points without handles get automatic
// (Catmull-Rom) handles, so a list of points becomes a flowing curve.
//
// Agents can write points in canvas coordinates without x/y/w/h/vw/vh: normalizePath() converts
// them to the stored form.

const rotatePoint = (p, c, deg) => {
  if (!deg) return { x: p.x, y: p.y };
  const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a), dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const r2 = (v) => Math.round(v * 100) / 100;
const tidyPoint = (p) => ({
  x: r2(p.x), y: r2(p.y),
  ...(p.in ? { in: [r2(p.in[0]), r2(p.in[1])] } : {}),
  ...(p.out ? { out: [r2(p.out[0]), r2(p.out[1])] } : {}),
});

function readPoint(p) {
  if (Array.isArray(p)) {
    const q = { x: Number(p[0]) || 0, y: Number(p[1]) || 0 };
    if (p.length >= 6) { q.in = [Number(p[2]) || 0, Number(p[3]) || 0]; q.out = [Number(p[4]) || 0, Number(p[5]) || 0]; }
    return q;
  }
  const q = { x: Number(p?.x) || 0, y: Number(p?.y) || 0 };
  for (const k of ['in', 'out']) {
    const h = p?.[k];
    if (Array.isArray(h) && h.length >= 2) q[k] = [Number(h[0]) || 0, Number(h[1]) || 0];
    else if (h && isNum(h.x)) q[k] = [h.x, h.y || 0];
  }
  return q;
}

/** Anchor points with resolved handle positions, in unrotated canvas px. */
export function pathNodes(el) {
  const pts = el.points || [];
  const sx = el.w / (el.vw || el.w || 1), sy = el.h / (el.vh || el.h || 1);
  const nodes = pts.map((p) => ({
    x: el.x + p.x * sx, y: el.y + p.y * sy,
    in: p.in ? { x: el.x + (p.x + p.in[0]) * sx, y: el.y + (p.y + p.in[1]) * sy } : null,
    out: p.out ? { x: el.x + (p.x + p.out[0]) * sx, y: el.y + (p.y + p.out[1]) * sy } : null,
  }));
  if (el.smooth && nodes.length > 2) {
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      const open = !el.closed && (i === 0 || i === n - 1);
      if (open) continue;
      const a = nodes[(i - 1 + n) % n], b = nodes[(i + 1) % n], p = nodes[i];
      const tx = (b.x - a.x) / 6, ty = (b.y - a.y) / 6;
      if (!pts[i].in) p.in = { x: p.x - tx, y: p.y - ty };
      if (!pts[i].out) p.out = { x: p.x + tx, y: p.y + ty };
    }
    if (!el.closed) {
      // ends: aim the handle at the neighbour's incoming handle for a natural start
      const f0 = nodes[0], f1 = nodes[1], l0 = nodes[n - 1], l1 = nodes[n - 2];
      if (!pts[0].out) f0.out = { x: f0.x + ((f1.in?.x ?? f1.x) - f0.x) / 2, y: f0.y + ((f1.in?.y ?? f1.y) - f0.y) / 2 };
      if (!pts[n - 1].in) l0.in = { x: l0.x + ((l1.out?.x ?? l1.x) - l0.x) / 2, y: l0.y + ((l1.out?.y ?? l1.y) - l0.y) / 2 };
    }
  }
  return nodes;
}

function segments(nodes, closed) {
  const segs = [];
  const n = nodes.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = nodes[i], b = nodes[(i + 1) % n];
    segs.push([a, a.out || a, b.in || b, b, !a.out && !b.in]);
  }
  return segs;
}

const f2 = (v) => String(Math.round(v * 100) / 100);

/** SVG path data (unrotated canvas px). */
export function pathD(el) {
  const nodes = pathNodes(el);
  if (!nodes.length) return '';
  let d = `M${f2(nodes[0].x)} ${f2(nodes[0].y)}`;
  for (const [, c1, c2, b, straight] of segments(nodes, el.closed)) {
    d += straight ? ` L${f2(b.x)} ${f2(b.y)}` : ` C${f2(c1.x)} ${f2(c1.y)} ${f2(c2.x)} ${f2(c2.y)} ${f2(b.x)} ${f2(b.y)}`;
  }
  return el.closed ? d + ' Z' : d;
}

function bez(a, c1, c2, b, t) {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

/** Points along the path every ~`step` px (unrotated canvas px), each with cumulative length `s`. */
export function samplePath(el, step = 3) {
  const nodes = pathNodes(el);
  const out = [];
  if (!nodes.length) return out;
  out.push({ x: nodes[0].x, y: nodes[0].y, s: 0, seg: 0 });
  let s = 0;
  segments(nodes, el.closed).forEach(([a, c1, c2, b, straight], si) => {
    const est = Math.hypot(c1.x - a.x, c1.y - a.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(b.x - c2.x, b.y - c2.y);
    const n = straight ? Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step)) : Math.max(4, Math.min(400, Math.ceil(est / step)));
    let prev = out[out.length - 1];
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const p = straight ? { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } : bez(a, c1, c2, b, t);
      s += Math.hypot(p.x - prev.x, p.y - prev.y);
      prev = { ...p, s, seg: si, t };
      out.push(prev);
    }
  });
  return out;
}

export function pathLength(el) {
  const s = samplePath(el);
  return s.length ? s[s.length - 1].s : 0;
}

/** Tight bounds of the drawn curve (unrotated canvas px). */
export function curveBounds(el) {
  const s = samplePath(el, 1.5);
  if (!s.length) return { x: el.x, y: el.y, w: 0, h: 0 };
  const xs = s.map((p) => p.x), ys = s.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/**
 * Accept a path spec with points in canvas coordinates (no vw/vh yet) and return the stored form.
 * If the spec already has vw/vh, its points are local and it is returned as is.
 */
export function normalizePath(spec) {
  const out = { ...spec };
  out.points = (spec.points || []).map(readPoint);
  out.closed = !!spec.closed;
  out.smooth = !!spec.smooth;
  if (isNum(spec.vw) && isNum(spec.vh) && spec.vw > 0 && spec.vh > 0 && isNum(spec.w) && isNum(spec.h)) return out;
  // canvas coordinates → local
  const tmp = { ...out, x: 0, y: 0, w: 1, h: 1, vw: 1, vh: 1, rotation: 0 };
  const b = curveBounds(tmp);
  const ox = isNum(spec.x) && out.points.length === 0 ? spec.x : b.x;
  const oy = isNum(spec.y) && out.points.length === 0 ? spec.y : b.y;
  const w = Math.max(1, b.w), h = Math.max(1, b.h);
  out.points = out.points.map((p) => tidyPoint({ ...p, x: p.x - ox, y: p.y - oy }));
  out.x = r2(ox); out.y = r2(oy); out.w = r2(w); out.h = r2(h); out.vw = out.w; out.vh = out.h;
  return out;
}

/** Canvas positions (rotation applied) of every anchor and handle: for the editor's point handles. */
export function pathHandles(el) {
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const r = el.rotation || 0;
  return pathNodes(el).map((n, i) => ({
    i,
    p: rotatePoint(n, c, r),
    in: el.points[i]?.in && n.in ? rotatePoint(n.in, c, r) : null,
    out: el.points[i]?.out && n.out ? rotatePoint(n.out, c, r) : null,
  }));
}

/** Convert a canvas point (rotation applied) to the path's local units. */
export function toLocal(el, p) {
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const q = rotatePoint(p, c, -(el.rotation || 0));
  return { x: (q.x - el.x) * ((el.vw || el.w) / el.w), y: (q.y - el.y) * ((el.vh || el.h) / el.h) };
}

/**
 * After points were edited, refit the element box to the curve without moving anything on screen
 * (rotation included), and reset the reference size so later resizes start from here.
 */
export function refitPath(el) {
  if (!el.points?.length) return el;
  const sx = el.w / (el.vw || el.w), sy = el.h / (el.vh || el.h);
  // bake the current scale into local units
  el.points = el.points.map((p) => ({
    x: p.x * sx, y: p.y * sy,
    ...(p.in ? { in: [p.in[0] * sx, p.in[1] * sy] } : {}),
    ...(p.out ? { out: [p.out[0] * sx, p.out[1] * sy] } : {}),
  }));
  el.vw = el.w; el.vh = el.h;
  const b = curveBounds(el);
  const r = el.rotation || 0;
  const cOld = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const cB = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const cNew = rotatePoint(cB, cOld, r);
  const w = Math.max(1, b.w), h = Math.max(1, b.h);
  const dx = b.x - el.x, dy = b.y - el.y;
  el.points = el.points.map((p) => tidyPoint({ ...p, x: p.x - dx, y: p.y - dy }));
  el.x = r2(cNew.x - w / 2); el.y = r2(cNew.y - h / 2);
  el.w = r2(w); el.h = r2(h); el.vw = el.w; el.vh = el.h;
  return el;
}

/** Point at fraction `u` (0–1) of the length, with unit tangent and left normal (rotation applied). */
export function pointAt(el, u, samples = samplePath(el)) {
  const total = samples[samples.length - 1]?.s || 0;
  const target = Math.max(0, Math.min(1, u)) * total;
  let i = 1;
  while (i < samples.length - 1 && samples[i].s < target) i++;
  const a = samples[i - 1] || samples[0], b = samples[i] || a;
  const k = b.s > a.s ? (target - a.s) / (b.s - a.s) : 0;
  const p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  // tangent from a slightly wider window for stability
  const lo = samples[Math.max(0, i - 2)], hi = samples[Math.min(samples.length - 1, i + 1)];
  let tx = hi.x - lo.x, ty = hi.y - lo.y;
  const l = Math.hypot(tx, ty) || 1;
  tx /= l; ty /= l;
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const r = el.rotation || 0;
  const P = rotatePoint(p, c, r);
  const T = rotatePoint({ x: tx, y: ty }, { x: 0, y: 0 }, r);
  return { x: P.x, y: P.y, tx: T.x, ty: T.y, nx: T.y, ny: -T.x, u: total ? target / total : 0 };
}

/** Nearest point on the path to canvas point q: {u (fraction), d (distance), x, y}. */
export function nearestOnPath(el, q, samples = samplePath(el)) {
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const p = rotatePoint(q, c, -(el.rotation || 0));
  const total = samples[samples.length - 1]?.s || 1;
  let best = { d: Infinity, u: 0, x: 0, y: 0 };
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2));
    const x = a.x + vx * t, y = a.y + vy * t;
    const d = Math.hypot(p.x - x, p.y - y);
    const ta = a.seg === b.seg ? (a.t ?? 0) : 0;
    if (d < best.d) best = { d, u: (a.s + (b.s - a.s) * t) / total, x, y, seg: b.seg, st: ta + ((b.t ?? 1) - ta) * t };
  }
  const P = rotatePoint(best, c, el.rotation || 0);
  return { ...best, x: P.x, y: P.y };
}

/** Which side of the path is "outside": +1 = left normal, -1 = right normal. */
export function outwardSign(el, at, samples = samplePath(el)) {
  // closed: away from the enclosed area; open: away from the box center (the convex side of a curve),
  // and upward for a straight line
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const P = at;
  if (el.closed) {
    const probe = { x: P.x + P.nx * 2, y: P.y + P.ny * 2 };
    return insidePath(el, probe, samples) ? -1 : 1;
  }
  const dot = (P.x - c.x) * P.nx + (P.y - c.y) * P.ny;
  if (Math.abs(dot) > 1e-3 * Math.max(el.w, el.h)) return dot > 0 ? 1 : -1;
  return P.ny <= 0 ? 1 : -1;
}

/** Even-odd point-in-polygon on the sampled path (canvas point, rotation applied). */
export function insidePath(el, q, samples = samplePath(el)) {
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const p = rotatePoint(q, c, -(el.rotation || 0));
  let inside = false;
  for (let i = 0, j = samples.length - 1; i < samples.length; j = i++) {
    const a = samples[i], b = samples[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y || 1e-9) + a.x) inside = !inside;
  }
  return inside;
}

/** Where a ray from the box center at `angle` (deg) crosses the path, outermost crossing; null if it misses. */
export function rayHit(el, angle, samples = samplePath(el)) {
  const c = { x: el.x + el.w / 2, y: el.y + el.h / 2 };
  const a = ((angle - (el.rotation || 0)) * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  let best = null;
  const total = samples[samples.length - 1]?.s || 1;
  for (let i = 1; i < samples.length; i++) {
    const p = samples[i - 1], q = samples[i];
    const ex = q.x - p.x, ey = q.y - p.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((p.x - c.x) * ey - (p.y - c.y) * ex) / den;
    const s = ((p.x - c.x) * dy - (p.y - c.y) * dx) / den;
    if (t > 0 && s >= 0 && s <= 1 && (!best || t > best.t)) best = { t, u: (p.s + (q.s - p.s) * s) / total };
  }
  return best ? best.u : null;
}

/** Insert an anchor where the path passes closest to canvas point q, keeping the curve's shape. */
export function insertPointAt(el, q) {
  const hit = nearestOnPath(el, q);
  const n = el.points.length;
  const i = hit.seg ?? 0, j = (i + 1) % n;
  const A = el.points[i], B = el.points[j];
  const t = Math.max(0.02, Math.min(0.98, hit.st ?? 0.5));
  const lerp = (p, q2, k) => ({ x: p.x + (q2.x - p.x) * k, y: p.y + (q2.y - p.y) * k });
  if (!A.out && !B.in) {
    const L = toLocal(el, { x: hit.x, y: hit.y });
    el.points.splice(i + 1, 0, { x: L.x, y: L.y });
    return i + 1;
  }
  const C1 = A.out ? { x: A.x + A.out[0], y: A.y + A.out[1] } : { x: A.x, y: A.y };
  const C2 = B.in ? { x: B.x + B.in[0], y: B.y + B.in[1] } : { x: B.x, y: B.y };
  const p01 = lerp(A, C1, t), p12 = lerp(C1, C2, t), p23 = lerp(C2, B, t);
  const p012 = lerp(p01, p12, t), p123 = lerp(p12, p23, t), M = lerp(p012, p123, t);
  A.out = [p01.x - A.x, p01.y - A.y];
  B.in = [p23.x - B.x, p23.y - B.y];
  el.points.splice(i + 1, 0, { x: M.x, y: M.y, in: [p012.x - M.x, p012.y - M.y], out: [p123.x - M.x, p123.y - M.y] });
  return i + 1;
}

/** Turn automatic (smooth) handles into explicit ones so they can be edited; the shape stays. */
export function bakeHandles(el) {
  const nodes = pathNodes(el);
  const kx = (el.vw || el.w) / el.w, ky = (el.vh || el.h) / el.h;
  el.points = el.points.map((p, i) => {
    const n = nodes[i];
    const q = { ...p };
    if (!q.in && n.in) q.in = [(n.in.x - n.x) * kx, (n.in.y - n.y) * ky];
    if (!q.out && n.out) q.out = [(n.out.x - n.x) * kx, (n.out.y - n.y) * ky];
    return tidyPoint(q);
  });
  el.smooth = false;
  return el;
}

/** Simplify a freehand stroke (Ramer–Douglas–Peucker). */
export function simplifyStroke(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bi = -1;
    const A = pts[a], B = pts[b];
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i].x - A.x) * dy - (pts[i].y - A.y) * dx) / L;
      if (d > best) { best = d; bi = i; }
    }
    if (best > eps) { keep[bi] = true; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
