// Cell-drawing kit for the human cell-type library: outline generators (round, columnar,
// polygonal, spindle, branched), organelle placement that works inside any outline, and a
// makeCell() that assembles a shaded, detailed cell from a short spec.

import {
  sphere, defs, blob, path, circle, ellipse, gloss, speckle, dark, light, shade, rng, n, smooth, smoothOpen,
  rim, membrane, nucleusDetail, mito, vesicle, granules, microvilli,
} from './kit.js';
import { lobedNucleus } from './cells.js';

export const CELL_ROLES = { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Granules / features' };

/** Icon-definition factory for a category of cells. */
export const cellCat = (category, defaults = {}) => (id, name, tags, colors, draw, extra = {}) => ({
  id, name, category, tags, colors, roles: CELL_ROLES, shape: 'ellipse', size: 110, draw, ...defaults, ...extra,
});

// ---- outlines: each returns { d, pts, cx, cy, rx, ry } ----------------------------------------

const rot2 = (x, y, cx, cy, deg) => {
  const a = (deg * Math.PI) / 180, dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
};

function bbox(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 };
}

const shapeOf = (pts, tension = 1) => ({ d: smooth(pts, tension), pts, ...bbox(pts) });

/** Ellipse-ish outline with a little wobble; rot turns it. */
export function round(cx, cy, rx, ry = rx, { wobble = 0.025, seed = 1, k = 26, rot = 0 } = {}) {
  const R = rng(seed);
  const pts = Array.from({ length: k }, (_, i) => {
    const a = (i / k) * Math.PI * 2, f = 1 + (R() * 2 - 1) * wobble;
    return rot2(cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f, cx, cy, rot);
  });
  return shapeOf(pts);
}

/** Rounded rectangle outline (columnar / cuboidal cells). bulge: convex top. */
export function box(x, y, w, h, r, { bulgeTop = 0, bulgeSide = 0, taper = 0, seed = 1, wobble = 0 } = {}) {
  const R = rng(seed);
  const pts = [];
  const j = () => (wobble ? (R() * 2 - 1) * wobble : 0);
  const tx = taper * w; // narrower at the top when taper > 0
  const corner = (cx, cy, a0) => { for (let i = 0; i <= 2; i++) { const a = a0 + (i / 2) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r + j(), cy + Math.sin(a) * r + j()]); } };
  corner(x + tx + r, y + r, Math.PI); // top-left
  pts.push([x + w / 2, y - bulgeTop]);
  corner(x + w - tx - r, y + r, -Math.PI / 2);
  pts.push([x + w - tx / 2 + bulgeSide, y + h / 2]);
  corner(x + w - r, y + h - r, 0);
  pts.push([x + w / 2, y + h + j()]);
  corner(x + r, y + h - r, Math.PI / 2);
  pts.push([x + tx / 2 - bulgeSide, y + h / 2]);
  return shapeOf(pts, 0.9);
}

/** Outline with a radius per spoke (ruffled macrophages, platelets, pseudopods). */
export function star(cx, cy, radii, { rot = 0, tension = 1, sy = 1 } = {}) {
  const k = radii.length;
  const pts = radii.map((r, i) => { const a = rot + (i / k) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy]; });
  return shapeOf(pts, tension);
}

/** Smooth outline through explicit points. */
export const outline = (pts, tension = 1) => shapeOf(pts, tension);

/** Fusiform (spindle) cell: pointed or blunt ends, optional bend. */
export function spindle(cx, cy, len, wid, { rot = 0, bend = 0, blunt = 0.15, seed = 1, wobble = 0.04 } = {}) {
  const R = rng(seed);
  const top = [], bot = [];
  const k = 8;
  for (let i = 0; i <= k; i++) {
    const t = i / k, x = -len / 2 + len * t;
    const w = (wid / 2) * (blunt + (1 - blunt) * Math.sin(Math.PI * t) ** 0.8) * (1 + (R() * 2 - 1) * wobble);
    const yb = bend * (4 * t * (1 - t)) * len * 0.25;
    top.push([x, yb - w]);
    bot.push([x, yb + w]);
  }
  const pts = [...top, ...bot.reverse().slice(1, -1)].map(([x, y]) => rot2(cx + x, cy + y, cx, cy, rot));
  return shapeOf(pts);
}

/** Irregular polygon (polygonal epithelial cells, hepatocytes): k corners, slightly rounded. */
export function poly(cx, cy, r, k = 6, { rot = 0, jitter = 0.08, seed = 1, sy = 1 } = {}) {
  const R = rng(seed);
  const pts = [];
  for (let i = 0; i < k; i++) {
    const a = ((rot + (360 * i) / k) * Math.PI) / 180;
    const f = 1 + (R() * 2 - 1) * jitter;
    const x = cx + Math.cos(a) * r * f, y = cy + Math.sin(a) * r * f * sy;
    // two points per corner keep corners soft but defined
    const a2 = a + Math.PI / k;
    pts.push([x, y]);
    pts.push([cx + Math.cos(a2) * r * 0.9 * f, cy + Math.sin(a2) * r * 0.9 * f * sy]);
  }
  return shapeOf(pts, 0.7);
}

// ---- geometry helpers for placing detail inside outlines ----------------------------------------

function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeDist(pts, x, y) {
  let m = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
    m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return m;
}
const ellDist = (e, x, y) => (Math.hypot((x - e.cx) / e.rx, (y - e.cy) / e.ry) - 1) * Math.min(e.rx, e.ry);

/**
 * Well-spread spots inside an outline, away from its edge and from keep-out ellipses
 * (nuclei, lipid droplets). Returns [{ x, y, room, a }] (a = tangent angle around the first keep-out).
 */
export function spots(shape, keep = [], count = 4, { margin = 3, seed = 3, step = 0, region = null } = {}) {
  if (count <= 0) return [];
  const R = rng(seed);
  const st = step || Math.max(1.6, Math.min(shape.rx, shape.ry) / 9);
  const cand = [];
  for (let y = shape.cy - shape.ry; y <= shape.cy + shape.ry; y += st) {
    for (let x = shape.cx - shape.rx; x <= shape.cx + shape.rx; x += st) {
      const jx = x + (R() - 0.5) * st * 0.6, jy = y + (R() - 0.5) * st * 0.6;
      if (region && !region(jx, jy)) continue;
      if (!inside(shape.pts, jx, jy)) continue;
      const de = edgeDist(shape.pts, jx, jy);
      if (de < margin) continue;
      let dk = Infinity;
      for (const e of keep) dk = Math.min(dk, ellDist(e, jx, jy));
      if (dk < margin * 0.7) continue;
      cand.push({ x: jx, y: jy, room: Math.min(de, dk) });
    }
  }
  if (!cand.length) return [];
  const picked = [cand.reduce((a, b) => (b.room > a.room ? b : a))];
  while (picked.length < count) {
    let best = null, bs = -1;
    for (const c of cand) {
      const dmin = Math.min(...picked.map((p) => Math.hypot(p.x - c.x, p.y - c.y)));
      const s = dmin * (0.6 + Math.min(1, c.room / 6) * 0.4);
      if (s > bs) { bs = s; best = c; }
    }
    if (!best || bs < st * 0.8) break;
    picked.push(best);
  }
  const k0 = keep[0] || shape;
  return picked.map((p) => ({ ...p, a: (Math.atan2(p.y - k0.cy, p.x - k0.cx) * 180) / Math.PI + 90 + (R() - 0.5) * 40 }));
}

// ---- organelle and surface detail ---------------------------------------------------------------

/** Rough ER: concentric arcs around an ellipse (from angle a0 to a1, degrees), studded with ribosomes. */
export function rer(e, c, { a0 = 120, a1 = 300, count = 4, gap = 3.6, start = 3, sw = 1.3, op = 0.6 } = {}) {
  let arcs = '', ribo = '';
  const A0 = (a0 * Math.PI) / 180, A1 = (a1 * Math.PI) / 180;
  for (let i = 0; i < count; i++) {
    const rx = e.rx + start + i * gap, ry = e.ry + start + i * gap;
    const p0 = [e.cx + rx * Math.cos(A0), e.cy + ry * Math.sin(A0)], p1 = [e.cx + rx * Math.cos(A1), e.cy + ry * Math.sin(A1)];
    const large = A1 - A0 > Math.PI ? 1 : 0;
    arcs += `M${n(p0[0])} ${n(p0[1])} A${n(rx)} ${n(ry)} 0 ${large} 1 ${n(p1[0])} ${n(p1[1])} `;
    const stepA = (gap * 0.55) / Math.max(rx, ry);
    for (let a = A0 + stepA; a < A1; a += stepA) ribo += `<circle cx="${n(e.cx + (rx + sw * 0.8) * Math.cos(a))}" cy="${n(e.cy + (ry + sw * 0.8) * Math.sin(a))}" r="${n(sw * 0.48)}"/>`;
  }
  return `<path d="${arcs}" fill="none" stroke="${dark(c, 0.22)}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}"/><g fill="${dark(c, 0.45)}" opacity="${op}">${ribo}</g>`;
}

/** Golgi stack: curved cisternae with budding vesicles. */
export function golgi(x, y, rot, s, c) {
  let out = '';
  for (let i = 0; i < 4; i++) {
    const w = s * (1 - i * 0.12), yy = i * s * 0.22;
    out += `<path d="M${n(-w / 2)} ${n(yy)} Q0 ${n(yy - s * 0.32)} ${n(w / 2)} ${n(yy)}" fill="none" stroke="${shade(c, 0.1 - i * 0.1)}" stroke-width="${n(s * 0.13)}" stroke-linecap="round"/>`;
  }
  out += vesicle(-s * 0.62, s * 0.18, s * 0.1, c) + vesicle(s * 0.62, s * 0.24, s * 0.09, c) + vesicle(s * 0.1, s * 0.86, s * 0.08, c);
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})">${out}</g>`;
}

/** Lipid droplet: glossy, slightly translucent sphere drawn without gradients. */
export function lipid(x, y, r, c = '#f6d77a') {
  return circle(x, y, r, shade(c, -0.06), shade(c, -0.4), n(Math.max(0.6, r * 0.08)))
    + circle(x - r * 0.08, y - r * 0.1, r * 0.82, c)
    + circle(x - r * 0.18, y - r * 0.2, r * 0.55, shade(c, 0.3), 'none', 0, ' opacity="0.7"')
    + circle(x - r * 0.38, y - r * 0.4, r * 0.2, '#ffffff', 'none', 0, ' opacity="0.8"');
}

/** Brush border of microvilli along y (pointing up when dir = -1). */
export function brush(x0, x1, y, len, c, { w = 2.6, gap = 1.2, dir = -1 } = {}) {
  let out = '', hi = '';
  for (let x = x0 + w / 2; x <= x1 - w / 2 + 0.01; x += w + gap) {
    const y0 = dir < 0 ? y - len : y;
    out += `<rect x="${n(x - w / 2)}" y="${n(y0)}" width="${n(w)}" height="${n(len)}" rx="${n(w / 2)}"/>`;
    hi += `<rect x="${n(x - w * 0.25)}" y="${n(y0 + w * 0.4)}" width="${n(w * 0.22)}" height="${n(len * 0.6)}" rx="${n(w * 0.11)}"/>`;
  }
  return `<g fill="${c}" stroke="${shade(c, -0.36)}" stroke-width="${n(w * 0.26)}">${out}</g><g fill="#fff" opacity="0.45">${hi}</g>`;
}

/** Motile cilia: wavy hairs with basal bodies along y between x0 and x1. */
export function cilia(x0, x1, y, len, c, { count = 8, seed = 4, sw = 1.5, dir = -1 } = {}) {
  const R = rng(seed);
  let hairs = '', bases = '';
  for (let i = 0; i < count; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / count;
    const L = len * (0.85 + R() * 0.3), sway = 2 + R() * 2;
    const pts = [[x, y], [x + sway * 0.4, y + dir * L * 0.33], [x - sway * 0.2, y + dir * L * 0.66], [x + sway, y + dir * L]];
    hairs += `<path d="${smoothOpen(pts)}"/>`;
    bases += `<rect x="${n(x - sw * 0.6)}" y="${n(y - sw * 0.9)}" width="${n(sw * 1.2)}" height="${n(sw * 1.8)}" rx="${n(sw * 0.4)}"/>`;
  }
  return `<g fill="none" stroke-linecap="round"><g stroke="${shade(c, -0.42)}" stroke-width="${n(sw + 1)}">${hairs}</g><g stroke="${c}" stroke-width="${sw}">${hairs}</g><g stroke="${shade(c, 0.4)}" stroke-width="${n(sw * 0.35)}" opacity="0.7" transform="translate(-0.3 0)">${hairs}</g></g>`
    + `<g fill="${shade(c, -0.45)}">${bases}</g>`;
}

/** A tapered process (dendrite, filopodium) along a polyline: a closed outline. */
export function taper(points, w0, w1 = 0.6) {
  const N = points.length, L = [], Rr = [];
  for (let i = 0; i < N; i++) {
    const p = points[i], q = points[Math.min(N - 1, i + 1)], o = points[Math.max(0, i - 1)];
    let dx = q[0] - o[0], dy = q[1] - o[1];
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const w = (w0 + (w1 - w0) * (i / (N - 1))) / 2;
    L.push([p[0] - dy * w, p[1] + dx * w]);
    Rr.push([p[0] + dy * w, p[1] - dx * w]);
  }
  const tip = points[N - 1];
  return smooth([...L, tip, ...Rr.reverse()], 0.8);
}

/**
 * A branching tree of processes from (x, y) heading `ang` degrees. Returns { outlines, spines } where
 * spines are the centerlines (for highlights).
 */
export function branches(x, y, ang, len, w, { depth = 2, seed = 1, spread = 34, bend = 0.25, fork = 0.6, twig = 0.62 } = {}) {
  const R = rng(seed);
  const outlines = [], spines = [];
  const grow = (x0, y0, a, L, W, d) => {
    const pts = [[x0, y0]];
    let cx = x0, cy = y0, ca = a;
    const k = 4;
    for (let i = 1; i <= k; i++) {
      ca += (R() - 0.5) * bend * 40;
      const r = (ca * Math.PI) / 180;
      cx += (Math.cos(r) * L) / k; cy += (Math.sin(r) * L) / k;
      pts.push([cx, cy]);
    }
    const tipW = d > 0 ? W * 0.55 : Math.max(0.7, W * 0.3);
    outlines.push(taper(pts, W, tipW));
    spines.push(pts);
    if (d > 0) {
      const fi = Math.max(1, Math.round(k * fork));
      const [bx, by] = pts[fi];
      const wAt = W + (tipW - W) * (fi / k);
      grow(bx, by, ca - spread * (0.7 + R() * 0.6), L * twig, wAt * 0.75, d - 1);
      grow(cx, cy, ca + spread * (0.4 + R() * 0.5), L * twig * 0.9, tipW * 0.95, d - 1);
    }
  };
  grow(x, y, ang, len, w, depth);
  return { outlines, spines };
}

/** Draw process outlines merged with a body: dark union outline, then fills, then highlights. */
export function processes(list, c, { sw = 2, fill = null, hi = true } = {}) {
  const outl = list.flatMap((b) => b.outlines), sp = list.flatMap((b) => b.spines);
  const f = fill || shade(c, -0.05);
  return `<g fill="none" stroke="${shade(c, -0.42)}" stroke-width="${sw * 2}" stroke-linejoin="round">${outl.map((d) => `<path d="${d}"/>`).join('')}</g>`
    + `<g fill="${f}">${outl.map((d) => `<path d="${d}"/>`).join('')}</g>`
    + (hi ? `<g fill="none" stroke="${shade(c, 0.32)}" stroke-width="0.9" stroke-linecap="round" opacity="0.55">${sp.map((p) => `<path d="${smoothOpen(p.slice(0, -1))}"/>`).join('')}</g>` : '');
}

/** Bean / kidney-shaped nucleus outline. */
export function bean(cx, cy, w, h, rot = 0) {
  const pts = [[-0.5, 0], [-0.4, -0.38], [0, -0.5], [0.4, -0.38], [0.5, 0], [0.38, 0.4], [0.16, 0.48], [0, 0.26], [-0.16, 0.48], [-0.38, 0.4]]
    .map(([x, y]) => rot2(cx + x * w, cy + y * h, cx, cy, rot));
  return smooth(pts);
}

// ---- the cell assembler ---------------------------------------------------------------------------

/**
 * Build a cell from a spec. Common fields:
 *   shape       outline from round()/box()/spindle()/poly()/outline()
 *   nuclei      [{ cx, cy, rx, ry, rot, seed, nucleolus, chroma, kind: 'blob'|'bean'|'lobes', lobes, color, wobble }]
 *   grad        sphere() options for the body; color: body color (default c.primary)
 *   under/over  extra markup before the body / after the nucleus (string or fn(ctx))
 *   inside      markup clipped to the body, drawn under organelles (string or fn(ctx))
 *   mito, ves, gran, lipids, golgi, er, texture
 */
export function makeCell(c, u, o) {
  const sh = o.shape;
  const col = o.color || c.primary;
  const g = sphere(u, 'b', col, { r: 80, ...(o.grad || {}) });
  const nuc = (o.nuclei || []).map((e) => ({ rot: 0, ...e }));
  const keep = [...nuc.map((e) => {
    const m = Math.max(e.rx, e.ry) * (e.kind === 'lobes' ? 1.2 : 1);
    return e.rot || e.kind === 'lobes' ? { cx: e.cx, cy: e.cy, rx: m, ry: m } : { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry };
  }), ...(o.keep || [])];
  const ctx = { c, u, sh, col, nuc, keep, g };
  const run = (v) => (typeof v === 'function' ? v(ctx) : v || '');
  const clip = `${u}-bc`;
  let s = defs(g, `<clipPath id="${clip}"><path d="${sh.d}"/></clipPath>`);
  s += run(o.under);
  s += path(sh.d, g.url);
  let inner = '';
  if (o.texture !== 0) inner += speckle(sh.cx, sh.cy, sh.rx * 0.9, sh.ry * 0.9, o.texture ?? Math.round((sh.rx * sh.ry) / 40), 0.6, dark(col, 0.35), (o.seed || 1) + 11, 0.35);
  if (o.er && nuc[0]) inner += rer(nuc[0], o.er.color || col, o.er);
  inner += run(o.inside);
  s += `<g clip-path="url(#${clip})">${inner}</g>`;
  // organelles in the free cytoplasm
  const seed = o.seed || 3;
  const lip = o.lipids || [];
  lip.forEach((L) => { s += lipid(L.x, L.y, L.r, L.color || o.lipidColor); });
  const keep2 = [...keep, ...lip.map((L) => ({ cx: L.x, cy: L.y, rx: L.r + 1, ry: L.r + 1 }))];
  const nm = o.mito ?? 3, nv = o.ves ?? 2, gr = o.gran || null;
  const all = spots(sh, keep2, nm + nv, { margin: o.margin ?? 3.4, seed, region: o.region });
  all.forEach((p, i) => {
    if (i < nm) s += mito(p.x, p.y, Math.max(4, Math.min(o.mitoLen || 9, p.room * 1.7)), o.mitoAlign ?? p.a, o.mitoColor || shade(c.accent, 0.12));
    else s += vesicle(p.x, p.y, Math.max(0.9, Math.min(o.vesR || 2.4, p.room * 0.45)), o.vesColor || light(col, 0.35));
  });
  if (o.golgi) s += golgi(o.golgi.x, o.golgi.y, o.golgi.rot || 0, o.golgi.s || 8, o.golgi.color || shade(c.accent, 0.05));
  if (gr) {
    const gp = spots(sh, [...keep2, ...all.map((p) => ({ cx: p.x, cy: p.y, rx: 2.6, ry: 2.6 }))], gr.count, { margin: gr.margin ?? (gr.r || 2) + 1.2, seed: seed + 5, step: gr.step || 0, region: gr.region });
    let body = '', hi = '';
    gp.forEach((p, i) => {
      const r = (gr.r || 2) * (0.8 + ((i * 37) % 10) / 22);
      body += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(r)}"/>`;
      if (gr.glint !== 0) hi += `<circle cx="${n(p.x - r * 0.32)}" cy="${n(p.y - r * 0.34)}" r="${n(r * 0.34)}"/>`;
      if (gr.core) body += `<circle cx="${n(p.x + r * 0.1)}" cy="${n(p.y + r * 0.1)}" r="${n(r * 0.45)}" fill="${shade(gr.color || c.accent, -0.35)}" stroke="none"/>`;
    });
    const gc = gr.color || c.accent;
    s += `<g fill="${gc}" stroke="${shade(gc, -0.38)}" stroke-width="${n((gr.r || 2) * 0.22)}">${body}</g><g fill="#fff" opacity="0.5">${hi}</g>`;
  }
  s += run(o.mid);
  s += rim(u, 'br', sh.d, col, { op: o.rimOp ?? 0.28, from: o.rimFrom ?? 0.66 });
  if (o.membrane !== false) s += membrane(sh.d, col, o.sw || 2.1);
  nuc.forEach((e, i) => {
    const ncol = e.color || c.secondary;
    if (e.kind === 'lobes') { s += lobedNucleus({ secondary: ncol }, `${u}-l${i}`, e.lobes, e.sw || 1.3); return; }
    const d = e.kind === 'bean' ? bean(e.cx, e.cy, e.rx * 2, e.ry * 2) : blob(e.cx, e.cy, e.rx, e.ry, { n: e.k || 9, wobble: e.wobble ?? 0.05, seed: e.seed || i + 2 });
    const body = nucleusDetail(u, `n${i}`, d, { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry }, ncol, { seed: e.seed || seed + i, nucleolus: e.nucleolus ?? true, chroma: e.chroma ?? 1, sw: e.sw || 1.4 });
    s += e.rot ? `<g transform="rotate(${n(e.rot)} ${n(e.cx)} ${n(e.cy)})">${body}</g>` : body;
  });
  s += run(o.over);
  if (o.gloss !== false) {
    const [gx, gy, grx, gry, gr0] = o.gloss || [sh.cx - sh.rx * 0.4, sh.cy - sh.ry * 0.52, sh.rx * 0.3, sh.ry * 0.15, -25];
    s += gloss(gx, gy, grx, gry, 0.45, gr0);
  }
  return s;
}

export { microvilli, granules, mito, vesicle, nucleusDetail, membrane, rim };

/**
 * Greedy circle packing inside an outline (lipid droplets, mucin granules, vacuoles):
 * returns [{ x, y, r }] largest first.
 */
export function pack(shape, keep = [], count = 8, { rmin = 2, rmax = 8, seed = 2, margin = 1.6, gap = 0.8 } = {}) {
  const R = rng(seed);
  const st = Math.max(1.2, Math.min(shape.rx, shape.ry) / 14);
  const cand = [];
  for (let y = shape.cy - shape.ry; y <= shape.cy + shape.ry; y += st) {
    for (let x = shape.cx - shape.rx; x <= shape.cx + shape.rx; x += st) {
      const jx = x + (R() - 0.5) * st * 0.5, jy = y + (R() - 0.5) * st * 0.5;
      if (!inside(shape.pts, jx, jy)) continue;
      let room = edgeDist(shape.pts, jx, jy) - margin;
      for (const e of keep) room = Math.min(room, ellDist(e, jx, jy) - margin);
      if (room >= rmin) cand.push({ x: jx, y: jy, room });
    }
  }
  const out = [];
  while (out.length < count) {
    let best = null, br = 0;
    for (const c of cand) {
      let r = Math.min(rmax, c.room);
      for (const o of out) r = Math.min(r, Math.hypot(o.x - c.x, o.y - c.y) - o.r - gap);
      if (r > br) { br = r; best = c; }
    }
    if (!best || br < rmin) break;
    out.push({ x: best.x, y: best.y, r: br * (0.92 + R() * 0.08) });
  }
  return out;
}

/** Knob-like surface markers (CD34, receptors) around an ellipse. */
export function knobs(cx, cy, rx, ry, count, color, { len = 4, r = 1.7, rot = 0.3 } = {}) {
  let st = '', hd = '', gl = '';
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
    const x0 = cx + ux * rx, y0 = cy + uy * ry, x1 = cx + ux * (rx + len), y1 = cy + uy * (ry + len);
    st += `M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)} `;
    hd += `<circle cx="${n(x1 + ux * r * 0.6)}" cy="${n(y1 + uy * r * 0.6)}" r="${n(r)}"/>`;
    gl += `<circle cx="${n(x1 + ux * r * 0.6 - r * 0.3)}" cy="${n(y1 + uy * r * 0.6 - r * 0.32)}" r="${n(r * 0.35)}"/>`;
  }
  return `<path d="${st}" stroke="${shade(color, -0.4)}" stroke-width="${n(r * 0.7)}" stroke-linecap="round"/>`
    + `<g fill="${color}" stroke="${shade(color, -0.4)}" stroke-width="${n(r * 0.3)}">${hd}</g><g fill="#fff" opacity="0.55">${gl}</g>`;
}

/** Thick arc band with rounded ends (band-neutrophil nucleus, horseshoe arrangements). */
export function arcBand(cx, cy, r, w, a0, a1, { k = 10, sy = 1 } = {}) {
  const P = (a, rr) => [cx + Math.cos((a * Math.PI) / 180) * rr, cy + Math.sin((a * Math.PI) / 180) * rr * sy];
  const outer = [], inner = [];
  for (let i = 0; i <= k; i++) { const a = a0 + ((a1 - a0) * i) / k; outer.push(P(a, r + w / 2)); inner.push(P(a, r - w / 2)); }
  const capA = P(a1 + ((w / 2 / r) * 180) / Math.PI * 0.9, r), capB = P(a0 - ((w / 2 / r) * 180) / Math.PI * 0.9, r);
  return smooth([...outer, capA, ...inner.reverse(), capB], 0.9);
}

/** Ring (donut) outline: outer and reversed inner contour so the middle stays empty. */
export function donut(cx, cy, r0, r1, { seed = 2, wobble = 0.06 } = {}) {
  const R = rng(seed);
  const k = 12;
  const o = [], i2 = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2, f = 1 + (R() * 2 - 1) * wobble;
    o.push([cx + Math.cos(a) * r0 * f, cy + Math.sin(a) * r0 * f]);
    i2.push([cx + Math.cos(a) * r1 * f, cy + Math.sin(a) * r1 * f]);
  }
  return smooth(o) + ' ' + smooth(i2.reverse());
}

/**
 * A branched cell: a soma with tapered, forking processes merged into one outline.
 * arms: [{ a (deg), len, w, depth, spread, bend }]. Other fields go to makeCell().
 */
export function stellate(c, u, { cx = 50, cy = 50, rx = 16, ry = 15, arms = [], seed = 1, fit = [100, 100], soma = null, armColor = null, sw = 2, extraUnder = '', armOver = '', ...rest }) {
  const shape = soma || round(cx, cy, rx, ry, { wobble: 0.05, seed, k: 16 });
  const gen = (k) => arms.map((a, i) => {
    const r = (a.a * Math.PI) / 180;
    return branches(cx + Math.cos(r) * rx * 0.55, cy + Math.sin(r) * ry * 0.55, a.a, a.len * k, a.w, { depth: a.depth ?? 2, seed: seed * 10 + i, spread: a.spread ?? 34, bend: a.bend ?? 0.25, fork: a.fork ?? 0.6, twig: a.twig ?? 0.62 });
  });
  // shrink the processes until the whole cell fits the viewBox
  const [W, H] = fit;
  let list = gen(1);
  for (let k = 0.9, i = 0; i < 8; i++, k *= 0.9) {
    const pts = list.flatMap((b) => b.spines.flat());
    if (pts.every(([x, y]) => x > 3 && x < W - 3 && y > 3 && y < H - 3)) break;
    list = gen(k);
  }
  const col = rest.color || c.primary;
  list.push({ outlines: [shape.d], spines: [] });
  const under = (ctx) => (typeof extraUnder === 'function' ? extraUnder(ctx, list) : extraUnder) + processes(list, armColor || col, { sw }) + (typeof armOver === 'function' ? armOver(ctx, list) : armOver);
  return makeCell(c, u, { shape, grad: { lo: 0.04, hi: 0.45, r: 75 }, membrane: false, rimOp: 0.14, rimFrom: 0.72, mito: 1, ves: 1, ...rest, under, seed });
}
