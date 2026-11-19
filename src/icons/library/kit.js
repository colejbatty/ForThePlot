// Drawing kit shared by the built-in icons: gradients, organic blobs, and a
// seeded RNG so icons are deterministic (identical output every render).

import { shade, hexToRgb, rgbToHsl, hslToRgb, rgbToHex } from '../../core/color.js';

export { shade };

export const dark = (c, a = 0.38) => shade(c, -a);
export const light = (c, a = 0.4) => shade(c, a);

/**
 * Shade a color the way light does: lit areas drift a little warm, shadows a little cool and
 * richer, instead of only moving toward white or black. amount in [-1, 1], like shade().
 */
export function tone(hex, amount, drift = 1) {
  const hsl = rgbToHsl(hexToRgb(hex));
  if (hsl.s > 0.05) {
    // move the hue toward yellow (lit) or blue-violet (shadow) by the shorter way round
    const target = amount >= 0 ? 0.14 : 0.68;
    let d = target - hsl.h; if (d > 0.5) d -= 1; if (d < -0.5) d += 1;
    hsl.h = (hsl.h + d * Math.min(0.5, Math.abs(amount)) * (amount >= 0 ? 0.16 : 0.22) * drift + 1) % 1;
    if (amount < 0) hsl.s = Math.min(1, hsl.s * (1 + 0.25 * -amount));
  }
  if (amount >= 0) hsl.l += (1 - hsl.l) * amount; else hsl.l *= 1 + amount;
  const { r, g, b } = hslToRgb(hsl);
  return rgbToHex(r, g, b);
}

/**
 * Radial "lit sphere" gradient: a highlight, the base color, a core shadow, and a little
 * reflected light at the rim so bodies read as round. Returns { def, url }.
 */
export function sphere(uid, key, c, { cx = 38, cy = 32, r = 72, hi = 0.5, lo = -0.12 } = {}) {
  const id = `${uid}-${key}`;
  const stops = [[0, tone(c, hi)], [0.2, tone(c, hi * 0.45)], [0.56, c], [0.86, tone(c, lo - 0.1)], [1, tone(c, lo)]];
  return {
    def: `<radialGradient id="${id}" cx="${cx}%" cy="${cy}%" r="${r}%">${stops.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('')}</radialGradient>`,
    url: `url(#${id})`,
  };
}

/**
 * Define an outline once so every layer drawn from it (fill, shading, clip, membrane) can
 * refer to it instead of repeating the path. Returns { d, id, def }: put it in defs(), then
 * pass it wherever a path `d` is accepted. It still reads as its path string when interpolated.
 */
export function shape(uid, key, d) {
  const id = `${uid}-${key}`;
  return { d: String(d), id, def: `<path id="${id}" d="${d}"/>`, toString() { return this.d; } };
}

/** One layer of an outline: a <path> for a plain path string, a <use> for a shape(). */
export function layer(d, attrs) {
  return d && d.id ? `<use xlink:href="#${d.id}" ${attrs}/>` : `<path d="${d}" ${attrs}/>`;
}

/**
 * Inner shading along the edge of a shape (ambient occlusion), as an overlay path, plus a thin
 * band of light just inside the edge so the body reads as translucent rather than solid.
 * `d` is the shape's path; the shadow fades in from `from` (0–1 of the radius).
 */
export function rim(uid, key, d, c, { op = 0.32, from = 0.66, cx = 54, cy = 56, r = 58, glow = 0.3, glowW = 4.4 } = {}) {
  const id = `${uid}-${key}`;
  const dk = tone(c, -0.55);
  let s = `<defs><radialGradient id="${id}" cx="${cx}%" cy="${cy}%" r="${r}%"><stop offset="${from}" stop-color="${dk}" stop-opacity="0"/><stop offset="${n2(from + (1 - from) * 0.6)}" stop-color="${dk}" stop-opacity="${n2(op * 0.45)}"/><stop offset="1" stop-color="${dk}" stop-opacity="${op}"/></radialGradient>`
    + (glow ? `<clipPath id="${id}-c">${layer(d, '')}</clipPath>` : '') + '</defs>'
    + layer(d, `fill="url(#${id})"`);
  if (glow) s += `<g clip-path="url(#${id}-c)">${layer(d, `fill="none" stroke="${shade(c, 0.62)}" stroke-linejoin="round" stroke-width="${glowW}" opacity="${n2(glow * 1.12)}"`)}</g>`;
  return s;
}

/** A membrane outline: a dark edge with a fine light line inside it, like a bilayer seen edge-on. */
export function membrane(d, c, sw = 2.2, { inner = 0.5, op = 0.6 } = {}) {
  return layer(d, `fill="none" stroke="${shade(c, -0.46)}" stroke-width="${sw}" stroke-linejoin="round"`)
    + layer(d, `fill="none" stroke="${shade(c, inner)}" stroke-width="${n2(sw * 0.24)}" stroke-linejoin="round" opacity="${op}"`);
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

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). digits: decimals kept in the path. */
export function smooth(points, tension = 1, digits = 2) {
  const n = points.length;
  const q = 10 ** digits, f = (v) => Math.round(v * q) / q;
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const t = tension / 6;
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
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

/**
 * A round cell outline with a softly ruffled surface: low, rounded folds of the membrane at
 * irregular intervals (lymphocyte microvilli seen at icon scale), all in one smooth outline.
 */
export function villous(cx, cy, rx, ry, { count = 14, len = 3, w = 2.6, wobble = 0.02, seed = 1, rot = 0 } = {}) {
  const rand = rng(seed);
  const step = (Math.PI * 2) / count;
  const sig = w / Math.max(rx, ry); // angular width of a fold
  const folds = Array.from({ length: count }, (_, i) => ({ a: rot + i * step + (rand() - 0.5) * step * 0.9, h: len * (0.15 + rand() * 1.15), s: sig * (0.75 + rand() * 0.7) }));
  const K = 56, ph = rand() * 6.28, ph2 = rand() * 6.28;
  const pts = [];
  for (let k = 0; k < K; k++) {
    const a = (k / K) * Math.PI * 2;
    let extra = 0;
    for (const f of folds) {
      let d = Math.abs(a - f.a) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
      extra += f.h * Math.exp(-((d / f.s) ** 2));
    }
    const kf = 1 + wobble * (Math.sin(a * 2 + ph) * 0.6 + Math.sin(a * 3 + ph2) * 0.4);
    pts.push([cx + Math.cos(a) * (rx * kf + extra), cy + Math.sin(a) * (ry * kf + extra)]);
  }
  return smooth(pts, 1, 1);
}

/**
 * An outline built from a base ellipse plus smooth lobes: pseudopods (broad, low) or dendrites
 * (narrow, tall, optionally curling). lobes: [{ a (deg), h, s (deg, width), curl (deg) }].
 */
export function lobed(cx, cy, rx, ry, lobes, { K = 24, wobble = 0, seed = 1, rot = 0 } = {}) {
  const rand = rng(seed);
  const ph = rand() * 6.28, ph2 = rand() * 6.28;
  const TAU = Math.PI * 2;
  const L = lobes.map((l) => ({ a: ((l.a + rot) * Math.PI) / 180, h: l.h, s: ((l.s || 12) * Math.PI) / 180, curl: ((l.curl || 0) * Math.PI) / 180 }));
  const wrap = (d) => { d %= TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  // sample finely across each lobe and coarsely in between, so tips stay round and paths stay short
  const fine = [0, 0.3, 0.64, 1.02, 1.46, 2.05];
  let angles = [];
  for (const l of L) for (const m of fine) { angles.push(l.a + m * l.s); if (m) angles.push(l.a - m * l.s); }
  for (let k = 0; k < K; k++) {
    const a = (k / K) * TAU;
    if (L.every((l) => Math.abs(wrap(a - l.a)) > l.s * 2.5)) angles.push(a);
  }
  angles = angles.map((a) => ((a % TAU) + TAU) % TAU).sort((p, q) => p - q).filter((a, i, arr) => i === 0 || a - arr[i - 1] > 0.012);
  const pts = angles.map((a) => {
    let extra = 0, shift = 0;
    for (const l of L) {
      const e = Math.exp(-((wrap(a - l.a) / l.s) ** 2));
      extra += l.h * e;
      shift += l.curl * e * e;
    }
    const kf = 1 + wobble * (Math.sin(a * 3 + ph) * 0.6 + Math.sin(a * 5 + ph2) * 0.4);
    const aa = a + shift;
    return [cx + Math.cos(aa) * (rx * kf + extra), cy + Math.sin(aa) * (ry * kf + extra)];
  });
  return smooth(pts, 1, 1);
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
  return layer(d, `fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}`);
}

export function rect(x, y, w, h, rx, fill, stroke = 'none', sw = 0, extra = '') {
  return `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(rx)}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
}

export const line = (x1, y1, x2, y2, stroke, sw = 2, extra = '') =>
  `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"${extra}/>`;

/**
 * Soft specular highlight: a broad sheen that fades out over many thin layers, with a small
 * crisp glint inside it. No filters or gradients, so it is PDF-safe and needs no ids.
 */
export const gloss = (cx, cy, rx, ry, op = 0.45, rot = -30) => {
  const L = 8;
  let s = '';
  for (let i = 0; i < L; i++) {
    const t = i / (L - 1); // 0 = outermost layer
    const k = 1.4 - t * 1.02;
    s += `<ellipse cx="${n2(cx - rx * 0.1 * t)}" cy="${n2(cy - ry * 0.14 * t)}" rx="${n2(rx * k)}" ry="${n2(ry * k)}" opacity="${n2(op * (0.05 + 0.085 * t))}"/>`;
  }
  const gl = Math.min(0.8, op * 1.1);
  s += `<ellipse cx="${n2(cx - rx * 0.14)}" cy="${n2(cy - ry * 0.2)}" rx="${n2(rx * 0.36)}" ry="${n2(ry * 0.27)}" opacity="${n2(gl * 0.45)}"/>`
    + `<ellipse cx="${n2(cx - rx * 0.16)}" cy="${n2(cy - ry * 0.22)}" rx="${n2(rx * 0.25)}" ry="${n2(ry * 0.17)}" opacity="${n2(gl)}"/>`;
  return `<g fill="#ffffff" transform="rotate(${rot} ${n2(cx)} ${n2(cy)})">${s}</g>`;
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
  const d = `M0 0 L0 ${n2(-s * 0.52)} M0 ${n2(-s * 0.52)} L${n2(-s * 0.34)} ${n2(-s * 0.9)} M0 ${n2(-s * 0.52)} L${n2(s * 0.34)} ${n2(-s * 0.9)}`;
  const tip = (tx) => `<ellipse cx="${n2(tx)}" cy="${n2(-s * 0.95)}" rx="${n2(s * 0.15)}" ry="${n2(s * 0.19)}" transform="rotate(${tx < 0 ? -34 : 34} ${n2(tx)} ${n2(-s * 0.95)})" fill="${shade(color, 0.16)}" stroke="${stroke}" stroke-width="${n2(s * 0.06)}"/>`
    + `<circle cx="${n2(tx - s * 0.04)}" cy="${n2(-s * 1.01)}" r="${n2(s * 0.05)}" fill="#fff" opacity="0.7"/>`;
  return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(angleDeg)})">`
    + `<path d="${d}" stroke="${stroke}" stroke-width="${n2(s * 0.28)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    + `<path d="${d}" stroke="${color}" stroke-width="${n2(s * 0.16)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    + `<path d="M${n2(-s * 0.035)} ${n2(-s * 0.06)} L${n2(-s * 0.035)} ${n2(-s * 0.48)}" stroke="#fff" stroke-width="${n2(s * 0.05)}" stroke-linecap="round" opacity="0.45"/>`
    + tip(-s * 0.36) + tip(s * 0.36)
    + '</g>';
}

/**
 * Rounded protein domain (Ig-like bead) shaded as a lit, glossy bead: stacked tones stepping
 * from a shadowed edge up to a highlight and a glint, without gradients so it needs no ids.
 */
export function domain(cx, cy, rx, ry, color, rot = 0, sw = 1.6) {
  const t = `transform="rotate(${n2(rot)} ${n2(cx)} ${n2(cy)})"`;
  const e = (x, y, a, b, fill, extra = '') => `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(a)}" ry="${n2(b)}" fill="${fill}"${extra}/>`;
  // light comes from the top left of the page, whichever way the bead is turned
  const a = (-rot * Math.PI) / 180, lx = -0.62 * Math.cos(a) + 0.78 * Math.sin(a), ly = -0.62 * Math.sin(a) - 0.78 * Math.cos(a);
  const L = (k, off, amt, extra = '') => e(cx + lx * rx * off, cy + ly * ry * off, rx * k, ry * k, tone(color, amt), extra);
  return `<g ${t}>`
    + e(cx, cy, rx, ry, tone(color, -0.2), ` stroke="${tone(color, -0.46, 0.6)}" stroke-width="${n2(sw * 0.72)}"`)
    + L(0.91, 0.06, -0.09) + L(0.81, 0.12, -0.01) + L(0.69, 0.19, 0.08) + L(0.56, 0.26, 0.17) + L(0.42, 0.33, 0.26) + L(0.28, 0.4, 0.35)
    + e(cx + lx * rx * 0.5, cy + ly * ry * 0.5, rx * 0.16, ry * 0.11, '#ffffff', ' opacity="0.8"')
    + '</g>';
}

/**
 * A globular protein domain (kinase lobe, integrin head, cytokine trimer…): a lit, organic blob
 * with edge shading, a band of light inside its outline and a glint, to sit beside domain() beads.
 */
export function globule(uid, key, x, y, rx, ry, c, seed = 3) {
  const g = sphere(uid, key, c, { hi: 0.48, lo: -0.16, cx: 36, cy: 30, r: 74 });
  const d = shape(uid, `${key}-o`, blob(x, y, rx, ry, { n: 9, wobble: 0.1, seed }));
  const m = Math.min(rx, ry);
  const gx = x - rx * 0.34, gy = y - ry * 0.42;
  return defs(g, d) + layer(d, `fill="${g.url}"`)
    + rim(uid, `${key}-r`, d, c, { op: 0.3, from: 0.52, glow: 0.3, glowW: n2(Math.min(3.4, m * 0.34)) })
    + layer(d, `fill="none" stroke="${tone(c, -0.46, 0.6)}" stroke-width="${n2(Math.max(0.9, Math.min(1.3, m * 0.16)))}" stroke-linejoin="round"`)
    + `<g fill="#ffffff" transform="rotate(-28 ${n2(gx)} ${n2(gy)})"><ellipse cx="${n2(gx)}" cy="${n2(gy)}" rx="${n2(rx * 0.3)}" ry="${n2(ry * 0.17)}" opacity="0.22"/><ellipse cx="${n2(gx)}" cy="${n2(gy)}" rx="${n2(rx * 0.17)}" ry="${n2(ry * 0.09)}" opacity="0.75"/></g>`;
}

/** An α-helix drawn as a rounded rod: lit down one side, shaded down the other, with slanted turns. */
export function helix(x, y, w, h, color, { turns = null, sw = 1.2, rot = 0 } = {}) {
  const k = turns ?? Math.max(2, Math.round(h / (w * 0.8)));
  let stripes = '';
  for (let i = 0; i < k; i++) {
    const yy = y + w * 0.36 + ((h - w * 0.72) * (i + 0.5)) / k;
    stripes += `M${n2(x + w * 0.17)} ${n2(yy + w * 0.24)} L${n2(x + w * 0.83)} ${n2(yy - w * 0.24)} `;
  }
  const r = w / 2;
  return `<g${rot ? ` transform="rotate(${n2(rot)} ${n2(x + w / 2)} ${n2(y + h / 2)})"` : ''}>`
    + `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(r)}" fill="${shade(color, -0.2)}" stroke="${shade(color, -0.46)}" stroke-width="${n2(sw * 0.85)}"/>`
    + `<rect x="${n2(x + w * 0.05)}" y="${n2(y + w * 0.05)}" width="${n2(w * 0.76)}" height="${n2(h - w * 0.1)}" rx="${n2(w * 0.38)}" fill="${color}"/>`
    + `<rect x="${n2(x + w * 0.12)}" y="${n2(y + w * 0.14)}" width="${n2(w * 0.42)}" height="${n2(h - w * 0.28)}" rx="${n2(w * 0.21)}" fill="${shade(color, 0.24)}"/>`
    + `<rect x="${n2(x + w * 0.2)}" y="${n2(y + w * 0.26)}" width="${n2(w * 0.16)}" height="${n2(h - w * 0.52)}" rx="${n2(w * 0.08)}" fill="${shade(color, 0.5)}" opacity="0.8"/>`
    + `<path d="${stripes}" fill="none" stroke="${shade(color, -0.36)}" stroke-width="${n2(w * 0.11)}" stroke-linecap="round" opacity="0.55"/>`
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
 * A nucleus with depth: gradient, chromatin (heterochromatin clumped along the envelope, soft
 * mottling and a few fine granules inside), an optional nucleolus, a sheen, inner shading and
 * a double-line envelope.
 * shape: { cx, cy, rx, ry } for placing detail; d: the outline path.
 */
export function nucleusDetail(uid, key, d, { cx, cy, rx, ry }, c, { seed = 3, nucleolus = true, chroma = 1, sw = 1.5, hi = 0.38 } = {}) {
  const g = sphere(uid, key, c, { hi, lo: -0.2, cx: 36, cy: 30, r: 76 });
  const clip = `${uid}-${key}-clip`;
  const rand = rng(seed * 7 + 1);
  const m = Math.min(rx, ry);
  const k = Math.max(0.35, Math.min(1.6, chroma));
  const dk = shade(c, -0.36), lt = shade(c, 0.34);
  // heterochromatin hugging the envelope: a thick, broken stroke along the outline, clipped to the inside
  const pw = m * (0.3 + 0.12 * k);
  const dash = [];
  for (let i = 0; i < 7; i++) dash.push(n2(m * (0.08 + rand() * 0.55 * k)), n2(pw + m * (0.1 + rand() * 0.42 / k)));
  const P = d && d.id ? d : shape(uid, `${key}-o`, d);
  let inner = layer(P, `fill="none" stroke="${dk}" stroke-width="${n2(pw)}" stroke-linecap="round" stroke-dasharray="${dash.join(' ')}" stroke-dashoffset="${n2(rand() * m * 4)}" opacity="${n2(Math.min(0.5, 0.26 + 0.1 * k))}"`);
  // soft mottling: darker condensed regions and paler open chromatin
  let dkB = '', ltB = '';
  const clumps = Math.round(3 + 2.4 * k), pale = 3;
  for (let i = 0; i < clumps; i++) {
    const a = rand() * Math.PI * 2, q = 0.18 + rand() * 0.5, pr = m * (0.13 + rand() * 0.15);
    dkB += `<path d="${blob(cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q, pr * 1.35, pr, { n: 7, wobble: 0.28, seed: seed + i * 13, rot: a })}"/>`;
  }
  for (let i = 0; i < pale; i++) {
    const a = rand() * Math.PI * 2, q = 0.1 + rand() * 0.45, pr = m * (0.16 + rand() * 0.14);
    ltB += `<path d="${blob(cx + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q, pr * 1.3, pr, { n: 7, wobble: 0.25, seed: seed + i * 17 + 5, rot: a })}"/>`;
  }
  inner += `<g fill="${lt}" opacity="0.16">${ltB}</g><g fill="${dk}" opacity="${n2(0.16 + 0.07 * k)}">${dkB}</g>`;
  inner += speckle(cx, cy, rx * 0.74, ry * 0.74, Math.round(5 * k), m * 0.028, shade(c, -0.42), seed + 2, 0.3);
  let s = `<defs>${g.def}${d && d.id ? '' : P.def}<clipPath id="${clip}">${layer(P, '')}</clipPath></defs>`;
  s += layer(P, `fill="${g.url}"`);
  s += `<g clip-path="url(#${clip})">${inner}</g>`;
  if (nucleolus) {
    const nx = cx + rx * 0.2, ny = cy + ry * 0.14, nr = m * (nucleolus === 'big' ? 0.22 : 0.15);
    s += ellipse(nx, ny, nr * 1.6, nr * 1.45, lt, 'none', 0, ' opacity="0.14"');
    s += `<path d="${blob(nx, ny, nr * 1.1, nr, { n: 7, wobble: 0.12, seed: seed + 5 })}" fill="${shade(c, -0.26)}" opacity="0.62"/>`;
    s += ellipse(nx + nr * 0.1, ny + nr * 0.14, nr * 0.6, nr * 0.52, shade(c, -0.4), 'none', 0, ' opacity="0.22"');
    s += ellipse(nx - nr * 0.3, ny - nr * 0.36, nr * 0.34, nr * 0.2, shade(c, 0.3), 'none', 0, ' opacity="0.4"');
  }
  s += rim(uid, `${key}-rim`, P, c, { op: 0.34, from: 0.58, glow: 0.22, glowW: n2(Math.max(1.6, m * 0.16)) });
  s += membrane(P, c, sw, { inner: 0.42, op: 0.5 });
  if (m > 4.5) s += gloss(cx - rx * 0.36, cy - ry * 0.5, rx * 0.26, ry * 0.11, 0.26, -24);
  return s;
}

/** A mitochondrion: outer membrane, lighter matrix and cristae folding in from both sides. */
export function mito(x, y, len, rot, c) {
  const h = len * 0.44, w = len;
  const k = Math.max(3, Math.round(len / 2.1));
  let cr = '';
  for (let i = 0; i < k; i++) {
    const px = -w / 2 + h * 0.5 + ((w - h) * (i + 0.5)) / k;
    cr += i % 2 ? `M${n2(px)} ${n2(-h * 0.34)} L${n2(px + h * 0.06)} ${n2(h * 0.1)} ` : `M${n2(px)} ${n2(h * 0.34)} L${n2(px - h * 0.06)} ${n2(-h * 0.1)} `;
  }
  return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(rot)})">`
    + `<rect x="${n2(-w / 2)}" y="${n2(-h / 2)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(h / 2)}" fill="${shade(c, -0.1)}" stroke="${shade(c, -0.44)}" stroke-width="${n2(h * 0.13)}"/>`
    + `<rect x="${n2(-w / 2 + h * 0.15)}" y="${n2(-h / 2 + h * 0.15)}" width="${n2(w - h * 0.3)}" height="${n2(h * 0.7)}" rx="${n2(h * 0.35)}" fill="${shade(c, 0.34)}"/>`
    + `<path d="${cr}" fill="none" stroke="${shade(c, -0.26)}" stroke-width="${n2(h * 0.11)}" stroke-linecap="round"/>`
    + `<path d="M${n2(-w / 2 + h * 0.5)} ${n2(-h * 0.27)} H${n2(w / 2 - h * 0.5)}" stroke="#ffffff" stroke-width="${n2(h * 0.09)}" stroke-linecap="round" opacity="0.5"/>`
    + '</g>';
}

/** A small vesicle or lysosome with a rim, a shaded side and a highlight. */
export function vesicle(x, y, r, c, op = 1) {
  return `<g${op < 1 ? ` opacity="${op}"` : ''}>${circle(x, y, r, shade(c, 0.05), shade(c, -0.38), n2(r * 0.2))}${circle(x - r * 0.1, y - r * 0.12, r * 0.72, shade(c, 0.3))}${circle(x - r * 0.32, y - r * 0.34, r * 0.3, '#ffffff', 'none', 0, ' opacity="0.7"')}</g>`;
}

/** Shaded granules scattered in an ellipse (each with an edge, a shaded side and a glint). */
export function granules(cx, cy, rx, ry, count, r, c, seed = 7, { glint = 0.55, op = 1 } = {}) {
  const rand = rng(seed);
  let body = '', lit = '', hi = '';
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
    const rr = r * (0.75 + rand() * 0.5);
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    body += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(rr)}"/>`;
    lit += `<circle cx="${n2(x - rr * 0.14)}" cy="${n2(y - rr * 0.16)}" r="${n2(rr * 0.66)}"/>`;
    if (glint) hi += `<circle cx="${n2(x - rr * 0.34)}" cy="${n2(y - rr * 0.36)}" r="${n2(rr * 0.27)}"/>`;
  }
  return `<g${op < 1 ? ` opacity="${op}"` : ''}><g fill="${shade(c, -0.14)}" stroke="${shade(c, -0.42)}" stroke-width="${n2(r * 0.18)}">${body}</g>`
    + `<g fill="${shade(c, 0.1)}">${lit}</g>`
    + (glint ? `<g fill="#ffffff" opacity="${glint}">${hi}</g>` : '') + '</g>';
}

/** Short finger-like microvilli around an ellipse (drawn before the cell body, sharing its outline). */
export function microvilli(cx, cy, rx, ry, count, c, { len = 5, w = 2.4, seed = 5, rot = 0 } = {}) {
  const rand = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = rot + ((i + (rand() - 0.5) * 0.3) / count) * Math.PI * 2;
    const L = len * (0.8 + rand() * 0.45);
    const x = cx + Math.cos(a) * (rx - 2), y = cy + Math.sin(a) * (ry - 2);
    out += `<rect x="${n2(-w / 2)}" y="${n2(-L - 2)}" width="${n2(w)}" height="${n2(L + 2.6)}" rx="${n2(w / 2)}" transform="translate(${n2(x)} ${n2(y)}) rotate(${n2((a * 180) / Math.PI + 90)})"/>`;
  }
  return `<g fill="${shade(c, 0.12)}" stroke="${shade(c, -0.46)}" stroke-width="${n2(Math.min(1.5, w * 0.42))}">${out}</g>`;
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
