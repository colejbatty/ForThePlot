// Drawing kit shared by the built-in icons: gradients, organic blobs, and a
// seeded RNG so icons are deterministic (identical output every render).

import { shade } from '../../core/color.js';

export { shade };

export const dark = (c, a = 0.38) => shade(c, -a);
export const light = (c, a = 0.4) => shade(c, a);

/**
 * Radial "lit sphere" gradient: a highlight, the base color, a core shadow, and a little
 * reflected light at the rim so bodies read as round. Returns { def, url }.
 */
export function sphere(uid, key, c, { cx = 38, cy = 32, r = 72, hi = 0.5, lo = -0.12 } = {}) {
  const id = `${uid}-${key}`;
  const stops = [[0, shade(c, hi)], [0.2, shade(c, hi * 0.45)], [0.56, c], [0.86, shade(c, lo - 0.1)], [1, shade(c, lo)]];
  return {
    def: `<radialGradient id="${id}" cx="${cx}%" cy="${cy}%" r="${r}%">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</radialGradient>`,
    url: `url(#${id})`,
  };
}

/**
 * Inner shading along the edge of a shape (ambient occlusion), as an overlay path.
 * `d` is the shape's path; the shadow fades in from `from` (0–1 of the radius).
 */
export function rim(uid, key, d, c, { op = 0.32, from = 0.66, cx = 54, cy = 56, r = 58 } = {}) {
  const id = `${uid}-${key}`;
  return `<defs><radialGradient id="${id}" cx="${cx}%" cy="${cy}%" r="${r}%"><stop offset="${from}" stop-color="${shade(c, -0.55)}" stop-opacity="0"/><stop offset="1" stop-color="${shade(c, -0.55)}" stop-opacity="${op}"/></radialGradient></defs>`
    + `<path d="${d}" fill="url(#${id})"/>`;
}

/** A membrane outline: a dark edge with a fine light line inside it, like a bilayer seen edge-on. */
export function membrane(d, c, sw = 2.2, { inner = 0.42, op = 0.7 } = {}) {
  return `<path d="${d}" fill="none" stroke="${shade(c, -0.42)}" stroke-width="${sw}" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${shade(c, inner)}" stroke-width="${n2(sw * 0.3)}" stroke-linejoin="round" opacity="${op}"/>`;
}

/** Linear gradient, top-to-bottom by default. */
export function linear(uid, key, c1, c2, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  const id = `${uid}-${key}`;
  return {
    def: `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`,
    url: `url(#${id})`,
  };
}

export const defs = (...d) => `<defs>${d.map((x) => (typeof x === 'string' ? x : x.def)).join('')}</defs>`;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n2 = (v) => Math.round(v * 100) / 100;

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
export function smooth(points, tension = 1) {
  const n = points.length;
  let d = `M${n2(points[0][0])} ${n2(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const t = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${n2(c1[0])} ${n2(c1[1])} ${n2(c2[0])} ${n2(c2[1])} ${n2(p2[0])} ${n2(p2[1])}`;
  }
  return d + 'Z';
}

/** Smooth open path through points. */
export function smoothOpen(points, tension = 1) {
  const n = points.length;
  let d = `M${n2(points[0][0])} ${n2(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(n - 1, i + 2)];
    const t = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${n2(c1[0])} ${n2(c1[1])} ${n2(c2[0])} ${n2(c2[1])} ${n2(p2[0])} ${n2(p2[1])}`;
  }
  return d;
}

/** Organic blob: n points around (cx, cy) with radius r ± wobble. */
export function blob(cx, cy, rx, ry, { n = 10, wobble = 0.08, seed = 1, rot = 0 } = {}) {
  const rand = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const k = 1 + (rand() * 2 - 1) * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(pts);
}

/** Star-like blob with protrusions (pseudopods, dendrites). radii: array of radius per point. */
export function radial(cx, cy, radii, { rot = 0, tension = 1 } = {}) {
  const n = radii.length;
  const pts = radii.map((r, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    const [rx, ry] = Array.isArray(r) ? r : [r, r];
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
  return smooth(pts, tension);
}

export function circle(cx, cy, r, fill, stroke = 'none', sw = 0, extra = '') {
  return `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
}

export function ellipse(cx, cy, rx, ry, fill, stroke = 'none', sw = 0, extra = '') {
  return `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx)}" ry="${n2(ry)}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
}

export function path(d, fill, stroke = 'none', sw = 0, extra = '') {
  return `<path d="${d}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;
}

export function rect(x, y, w, h, rx, fill, stroke = 'none', sw = 0, extra = '') {
  return `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(rx)}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
}

export const line = (x1, y1, x2, y2, stroke, sw = 2, extra = '') =>
  `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${extra}/>`;

/** Soft specular highlight: layered ellipses fade out without filters (PDF-safe). */
export const gloss = (cx, cy, rx, ry, op = 0.45, rot = -30) => {
  const layer = (k, o, dx = 0, dy = 0) => `<ellipse cx="${n2(cx + dx)}" cy="${n2(cy + dy)}" rx="${n2(rx * k)}" ry="${n2(ry * k)}" opacity="${n2(o)}"/>`;
  return `<g fill="#ffffff" transform="rotate(${rot} ${n2(cx)} ${n2(cy)})">`
    + layer(1.25, op * 0.16) + layer(1, op * 0.28) + layer(0.7, op * 0.38, -rx * 0.06, -ry * 0.08) + layer(0.38, op * 0.55, -rx * 0.12, -ry * 0.14)
    + '</g>';
};

/** Scatter n dots inside an ellipse (granules, chromatin), deterministic. */
export function speckle(cx, cy, rx, ry, n, r, fill, seed = 7, op = 1) {
  const rand = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
    const rr = r * (0.7 + rand() * 0.6);
    out += `<circle cx="${n2(cx + Math.cos(a) * rx * d)}" cy="${n2(cy + Math.sin(a) * ry * d)}" r="${n2(rr)}"/>`;
  }
  return `<g fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}>${out}</g>`;
}

/** Points evenly spaced on an ellipse. */
export function ring(cx, cy, rx, ry, n, rot = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, a };
  });
}

/** Small Y-shaped receptor glyph (antibody / BCR / CAR on cell surfaces), with rounded Fab tips. */
export function miniY(x, y, angleDeg, size, color, stroke) {
  const s = size;
  const d = `M0 0 L0 ${n2(-s * 0.55)} M0 ${n2(-s * 0.55)} L${n2(-s * 0.36)} ${n2(-s * 0.92)} M0 ${n2(-s * 0.55)} L${n2(s * 0.36)} ${n2(-s * 0.92)}`;
  const tip = (tx) => `<circle cx="${n2(tx)}" cy="${n2(-s * 0.95)}" r="${n2(s * 0.17)}" fill="${shade(color, 0.12)}" stroke="${stroke}" stroke-width="${n2(s * 0.07)}"/>`
    + `<circle cx="${n2(tx - s * 0.05)}" cy="${n2(-s * 1)}" r="${n2(s * 0.06)}" fill="#fff" opacity="0.6"/>`;
  return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(angleDeg)})">`
    + `<path d="${d}" stroke="${stroke}" stroke-width="${n2(s * 0.34)}" stroke-linecap="round" fill="none"/>`
    + `<path d="${d}" stroke="${color}" stroke-width="${n2(s * 0.2)}" stroke-linecap="round" fill="none"/>`
    + `<path d="M${n2(-s * 0.04)} ${n2(-s * 0.05)} L${n2(-s * 0.04)} ${n2(-s * 0.5)}" stroke="#fff" stroke-width="${n2(s * 0.06)}" stroke-linecap="round" opacity="0.45"/>`
    + tip(-s * 0.36) + tip(s * 0.36)
    + '</g>';
}

/**
 * Rounded protein domain (Ig-like bead) with depth: a shaded body, a lit face, a glint and
 * a faint β-sheet fold, without gradients so it needs no ids.
 */
export function domain(cx, cy, rx, ry, color, rot = 0, sw = 1.6) {
  const t = `transform="rotate(${n2(rot)} ${n2(cx)} ${n2(cy)})"`;
  const e = (x, y, a, b, fill, extra = '') => `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(a)}" ry="${n2(b)}" fill="${fill}"${extra}/>`;
  return `<g ${t}>`
    + e(cx, cy, rx, ry, shade(color, -0.16), ` stroke="${shade(color, -0.42)}" stroke-width="${sw}"`)
    + e(cx - rx * 0.1, cy - ry * 0.1, rx * 0.84, ry * 0.84, color)
    + e(cx - rx * 0.22, cy - ry * 0.26, rx * 0.52, ry * 0.5, shade(color, 0.22), ' opacity="0.85"')
    + `<path d="M${n2(cx - rx * 0.45)} ${n2(cy + ry * 0.05)} Q${n2(cx - rx * 0.1)} ${n2(cy + ry * 0.55)} ${n2(cx + rx * 0.5)} ${n2(cy + ry * 0.2)} M${n2(cx - rx * 0.35)} ${n2(cy - ry * 0.25)} Q${n2(cx + rx * 0.05)} ${n2(cy + ry * 0.25)} ${n2(cx + rx * 0.55)} ${n2(cy - ry * 0.12)}" fill="none" stroke="${shade(color, -0.3)}" stroke-width="${n2(Math.min(rx, ry) * 0.09)}" stroke-linecap="round" opacity="0.35"/>`
    + e(cx - rx * 0.36, cy - ry * 0.42, rx * 0.2, ry * 0.14, '#ffffff', ' opacity="0.7"')
    + '</g>';
}

/** An α-helix drawn as a rounded rod with helical turns. */
export function helix(x, y, w, h, color, { turns = null, sw = 1.2, rot = 0 } = {}) {
  const k = turns ?? Math.max(2, Math.round(h / (w * 0.8)));
  let stripes = '';
  for (let i = 1; i < k; i++) {
    const yy = y + (h * i) / k;
    stripes += `M${n2(x + w * 0.12)} ${n2(yy - w * 0.22)} Q${n2(x + w / 2)} ${n2(yy + w * 0.28)} ${n2(x + w * 0.88)} ${n2(yy - w * 0.22)} `;
  }
  return `<g${rot ? ` transform="rotate(${n2(rot)} ${n2(x + w / 2)} ${n2(y + h / 2)})"` : ''}>`
    + `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(w / 2)}" fill="${color}" stroke="${shade(color, -0.4)}" stroke-width="${sw}"/>`
    + `<rect x="${n2(x + w * 0.16)}" y="${n2(y + w * 0.2)}" width="${n2(w * 0.3)}" height="${n2(h - w * 0.4)}" rx="${n2(w * 0.15)}" fill="${shade(color, 0.3)}" opacity="0.75"/>`
    + `<path d="${stripes}" fill="none" stroke="${shade(color, -0.32)}" stroke-width="${n2(w * 0.1)}" stroke-linecap="round" opacity="0.6"/>`
    + '</g>';
}

/** Membrane strip (for receptor icons): a short bilayer at y, from x0 to x1, with shaded heads and kinked tails. */
export function membraneStrip(x0, x1, y, t = 14, head = '#f3c27a', tail = '#c98a4b') {
  const r = t * 0.17;
  const step = r * 2.15;
  let tails = '', heads = '', glints = '';
  let k = 0;
  for (let x = x0 + r; x <= x1 - r + 0.01; x += step, k++) {
    for (const [hy, dir] of [[y - t / 2 + r, 1], [y + t / 2 - r, -1]]) {
      const ey = y - dir * t * 0.04;
      const kink = (k % 3 === 0 ? 1 : 0) * r * 0.35;
      const mid = (hy + ey) / 2;
      tails += `M${n2(x - r * 0.35)} ${n2(hy)} L${n2(x - r * 0.35)} ${n2(ey)} M${n2(x + r * 0.35)} ${n2(hy)} L${n2(x + r * 0.35)} ${n2(mid)} L${n2(x + r * 0.35 + kink)} ${n2(ey)} `;
      heads += `<circle cx="${n2(x)}" cy="${n2(hy)}" r="${n2(r)}"/>`;
      glints += `<circle cx="${n2(x - r * 0.3)}" cy="${n2(hy - r * 0.32)}" r="${n2(r * 0.34)}"/>`;
    }
  }
  return `<path d="${tails}" stroke="${tail}" stroke-width="${n2(r * 0.3)}" fill="none" stroke-linejoin="round"/>`
    + `<g fill="${head}" stroke="${shade(head, -0.3)}" stroke-width="${n2(r * 0.18)}">${heads}</g>`
    + `<g fill="#ffffff" opacity="0.55">${glints}</g>`;
}

export const n = n2;

// ---- Cell detail ---------------------------------------------------------------------------

/**
 * A nucleus with depth: gradient, chromatin (heterochromatin patches along the envelope,
 * fine granules), an optional nucleolus, inner shading and a double-line envelope.
 * shape: { cx, cy, rx, ry } for placing detail; d: the outline path.
 */
export function nucleusDetail(uid, key, d, { cx, cy, rx, ry }, c, { seed = 3, nucleolus = true, chroma = 1, sw = 1.5, hi = 0.38 } = {}) {
  const g = sphere(uid, key, c, { hi, lo: -0.18 });
  const clip = `${uid}-${key}-clip`;
  const rand = rng(seed * 7 + 1);
  let inner = '';
  // heterochromatin hugging the envelope, and a few clumps inside
  const patches = Math.round(6 * chroma);
  for (let i = 0; i < patches; i++) {
    const a = rand() * Math.PI * 2, edge = i < patches * 0.7;
    const d0 = edge ? 0.92 : 0.25 + rand() * 0.35;
    const pr = (edge ? 0.26 : 0.17) * Math.min(rx, ry) * (0.75 + rand() * 0.5);
    inner += `<path d="${blob(cx + Math.cos(a) * rx * d0, cy + Math.sin(a) * ry * d0, pr * 1.3, pr, { n: 7, wobble: 0.22, seed: seed + i * 13, rot: a })}"/>`;
  }
  let s = `<defs>${g.def}<clipPath id="${clip}"><path d="${d}"/></clipPath></defs>`;
  s += `<path d="${d}" fill="${g.url}"/>`;
  s += `<g clip-path="url(#${clip})"><g fill="${shade(c, -0.3)}" opacity="0.42">${inner}</g>`;
  s += speckle(cx, cy, rx * 0.8, ry * 0.8, Math.round(16 * chroma), Math.min(rx, ry) * 0.05, shade(c, -0.38), seed + 2, 0.5);
  s += speckle(cx, cy, rx * 0.7, ry * 0.7, Math.round(9 * chroma), Math.min(rx, ry) * 0.045, shade(c, 0.4), seed + 4, 0.45);
  s += '</g>';
  if (nucleolus) {
    const nx = cx + rx * 0.22, ny = cy + ry * 0.12, nr = Math.min(rx, ry) * (nucleolus === 'big' ? 0.22 : 0.15);
    s += `<path d="${blob(nx, ny, nr * 1.1, nr, { n: 7, wobble: 0.12, seed: seed + 5 })}" fill="${shade(c, -0.22)}" opacity="0.85"/>`;
    s += circle(nx - nr * 0.25, ny - nr * 0.3, nr * 0.35, shade(c, 0.3), 'none', 0, ' opacity="0.55"');
  }
  s += rim(uid, `${key}-rim`, d, c, { op: 0.3, from: 0.62 });
  s += membrane(d, c, sw, { inner: 0.35, op: 0.55 });
  return s;
}

/** A mitochondrion: outer membrane, lighter matrix and folded cristae. */
export function mito(x, y, len, rot, c) {
  const h = len * 0.46, w = len;
  let cr = '';
  const k = 5;
  for (let i = 0; i <= k; i++) {
    const px = -w / 2 + w * 0.16 + (w * 0.68 * i) / k;
    cr += `${i ? 'L' : 'M'}${n2(px)} ${n2(i % 2 ? h * 0.26 : -h * 0.26)} `;
  }
  return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(rot)})">`
    + `<rect x="${n2(-w / 2)}" y="${n2(-h / 2)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(h / 2)}" fill="${c}" stroke="${shade(c, -0.4)}" stroke-width="${n2(h * 0.14)}"/>`
    + `<rect x="${n2(-w / 2 + h * 0.18)}" y="${n2(-h / 2 + h * 0.18)}" width="${n2(w - h * 0.36)}" height="${n2(h * 0.64)}" rx="${n2(h * 0.32)}" fill="${shade(c, 0.3)}"/>`
    + `<path d="${cr}" fill="none" stroke="${shade(c, -0.3)}" stroke-width="${n2(h * 0.12)}" stroke-linejoin="round" stroke-linecap="round"/>`
    + '</g>';
}

/** A small vesicle or lysosome with a rim and a highlight. */
export function vesicle(x, y, r, c, op = 1) {
  return `<g${op < 1 ? ` opacity="${op}"` : ''}>${circle(x, y, r, shade(c, 0.2), shade(c, -0.35), n2(r * 0.22))}${circle(x - r * 0.3, y - r * 0.32, r * 0.34, '#ffffff', 'none', 0, ' opacity="0.6"')}</g>`;
}

/** Shaded granules scattered in an ellipse (each with an edge and a glint). */
export function granules(cx, cy, rx, ry, count, r, c, seed = 7, { glint = 0.55, op = 1 } = {}) {
  const rand = rng(seed);
  let body = '', hi = '';
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
    const rr = r * (0.75 + rand() * 0.5);
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    body += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(rr)}"/>`;
    if (glint) hi += `<circle cx="${n2(x - rr * 0.32)}" cy="${n2(y - rr * 0.34)}" r="${n2(rr * 0.34)}"/>`;
  }
  return `<g${op < 1 ? ` opacity="${op}"` : ''}><g fill="${c}" stroke="${shade(c, -0.35)}" stroke-width="${n2(r * 0.22)}">${body}</g>`
    + (glint ? `<g fill="#ffffff" opacity="${glint}">${hi}</g>` : '') + '</g>';
}

/** Short finger-like microvilli around an ellipse (drawn before the cell body). */
export function microvilli(cx, cy, rx, ry, count, c, { len = 5, w = 2.4, seed = 5, rot = 0 } = {}) {
  const rand = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.12;
    const L = len * (0.6 + rand() * 0.6);
    const x = cx + Math.cos(a) * (rx - 2), y = cy + Math.sin(a) * (ry - 2);
    out += `<rect x="${n2(-w / 2)}" y="${n2(-L - 2)}" width="${n2(w)}" height="${n2(L + 2)}" rx="${n2(w / 2)}" transform="translate(${n2(x)} ${n2(y)}) rotate(${n2((a * 180) / Math.PI + 90)})"/>`;
  }
  return `<g fill="${shade(c, 0.05)}" stroke="${shade(c, -0.32)}" stroke-width="0.6">${out}</g>`;
}

/**
 * Spots in the cytoplasm between a round cell (radius r around 50,50) and its nucleus
 * (ellipse nx, ny, nrx, nry), widest gaps first: [{ x, y, a, gap }].
 */
export function cytoSpots(r, [nx, ny, nrx, nry], count, { cx = 50, cy = 50, min = 5, skip = 0 } = {}) {
  const cand = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const ux = Math.cos(a), uy = Math.sin(a);
    // distance from the cell center to the nucleus edge along this ray (sampled)
    let t = 0, inside = false;
    for (let k = 0; k <= 60; k++) {
      const q = (k / 60) * r;
      const px = cx + ux * q, py = cy + uy * q;
      const v = ((px - nx) / nrx) ** 2 + ((py - ny) / nry) ** 2;
      if (v <= 1) { inside = true; t = q; } else if (inside) break;
    }
    const start = inside ? t : 0;
    const gap = r - start;
    cand.push({ x: cx + ux * (start + gap * 0.5), y: cy + uy * (start + gap * 0.5), a: (a * 180) / Math.PI + 90, gap });
  }
  const picked = [];
  for (const c of cand.sort((p, q) => q.gap - p.gap)) {
    if (c.gap < min) break;
    if (picked.every((p) => Math.hypot(p.x - c.x, p.y - c.y) > 8)) picked.push(c);
    if (picked.length >= count + skip) break;
  }
  return picked.slice(skip);
}
