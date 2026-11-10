// Immune cells and other cell types. Roles: primary = cytoplasm/body,
// secondary = nucleus, accent = granules / surface receptors.

import {
  sphere, defs, blob, radial, path, circle, ellipse, gloss, speckle, ring, miniY, dark, light, shade, rng, n, smooth, line,
  rim, membrane, nucleusDetail, mito, vesicle, granules, cytoSpots, villous, lobed,
} from './kit.js';
import { mix } from '../../core/color.js';

const CELL_ROLES = { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Granules / receptors' };

export function lymphocyte(c, uid, o = {}) {
  const { seed = 3, ruffle = 0.022, nucleus = [52, 53, 28, 27], granules: nGran = 0, surface = null, r = 40, villi = 18, organelles = 3 } = o;
  const g = sphere(uid, 'b', c.primary);
  // microvilli are part of the outline, so the membrane runs over them in one line
  const body = villi
    ? villous(50, 50, r - 0.6, r - 0.6, { count: Math.round(villi * 0.8), len: r * 0.042, w: r * 0.09, wobble: ruffle * 0.35, seed: seed + 9 })
    : blob(50, 50, r, r, { n: 30, wobble: ruffle, seed });
  let s = defs(g);
  if (surface) s += surface;
  s += path(body, g.url);
  // cytoplasm: a couple of mitochondria and vesicles where there is room
  const spots = cytoSpots(r, nucleus, organelles + (nGran ? 0 : 1), { min: r * 0.16 });
  const org = nGran ? spots.slice(0, Math.max(1, organelles - 1)) : spots;
  org.forEach((p, i) => {
    if (i % 2 === 0) s += mito(p.x, p.y, Math.min(9, p.gap * 0.62), p.a, shade(c.accent, 0.15));
    else s += vesicle(p.x, p.y, Math.min(2.6, p.gap * 0.2), shade(c.primary, 0.35));
  });
  if (nGran) s += granulesIn(nGran, c, r, nucleus, seed, org);
  s += rim(uid, 'br', body, c.primary, { op: 0.28 });
  s += membrane(body, c.primary, 2.2);
  const [nx, ny, nrx, nry] = nucleus;
  const nd = blob(nx, ny, nrx, nry, { n: 9, wobble: 0.06, seed: seed + 1 });
  s += nucleusDetail(uid, 'n', nd, { cx: nx, cy: ny, rx: nrx, ry: nry }, c.secondary, { seed: seed + 2 });
  s += gloss(36, 29, 12, 6.5, 0.5);
  return s;
}

// cytotoxic granules gathered in the cytoplasm on the roomy side of the nucleus (not over it)
function granulesIn(count, c, r, nucleus, seed, avoid = []) {
  const [nx, ny, nrx, nry] = nucleus;
  const rand = rng(seed * 3 + 5);
  const off = Math.hypot(50 - nx, 50 - ny);
  const a0 = off > 1 ? Math.atan2(50 - ny, 50 - nx) : -2.3;
  const spread = Math.min(Math.PI, 0.55 + count * 0.13);
  const k = r / 40;
  const out = [];
  for (let t = 0; t < 900 && out.length < count; t++) {
    const a = a0 + (rand() + rand() - 1) * spread;
    const ux = Math.cos(a), uy = Math.sin(a);
    let tn = 0;
    for (let q = r; q > 0; q -= 0.5) {
      if (((50 + ux * q - nx) / nrx) ** 2 + ((50 + uy * q - ny) / nry) ** 2 <= 1) { tn = q; break; }
    }
    const rr = (1.9 + rand() * 1.3) * k;
    const lo = tn + rr + 1.4 * k, hi = r - rr - 2.8 * k;
    if (hi < lo) continue;
    const q = lo + rand() * (hi - lo), x = 50 + ux * q, y = 50 + uy * q;
    if (avoid.some((p) => Math.hypot(p.x - x, p.y - y) < rr + 4.2)) continue;
    if (out.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + rr + 0.5)) out.push({ x, y, r: rr });
  }
  let body = '', lit = '', hi = '';
  for (const g of out) {
    body += `<circle cx="${n(g.x)}" cy="${n(g.y)}" r="${n(g.r)}"/>`;
    lit += `<circle cx="${n(g.x - g.r * 0.14)}" cy="${n(g.y - g.r * 0.16)}" r="${n(g.r * 0.66)}"/>`;
    hi += `<circle cx="${n(g.x - g.r * 0.34)}" cy="${n(g.y - g.r * 0.36)}" r="${n(g.r * 0.26)}"/>`;
  }
  return `<g fill="${shade(c.accent, -0.14)}" stroke="${shade(c.accent, -0.44)}" stroke-width="0.6">${body}</g><g fill="${shade(c.accent, 0.12)}">${lit}</g><g fill="#ffffff" opacity="0.6">${hi}</g>`;
}

export function surfaceYs(count, color, stroke, { r = 40, size = 11, rot = 0.2 } = {}) {
  return ring(50, 50, r - 1, r - 1, count, rot).map((p) => miniY(p.x, p.y, (p.a * 180) / Math.PI + 90, size, color, stroke)).join('');
}

function surfaceCARs(count, color, scfv, { r = 40, size = 13 } = {}) {
  // each CAR: a hinge/spacer stalk carrying the two variable domains of an scFv
  return ring(50, 50, r - 1, r - 1, count, 0.35).map((p) => {
    const ang = (p.a * 180) / Math.PI + 90;
    const dom = (x, y, rot, col) => `<ellipse cx="${x}" cy="${n(y)}" rx="2.3" ry="3.3" transform="rotate(${rot} ${x} ${n(y)})" fill="${col}" stroke="${dark(scfv, 0.42)}" stroke-width="0.75"/>`
      + `<circle cx="${n(x - 0.6)}" cy="${n(y - 1.2)}" r="0.7" fill="#fff" opacity="0.7"/>`;
    return `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(ang)})">`
      + `<path d="M0 2 L0 ${-size * 0.56}" stroke="${dark(color, 0.3)}" stroke-width="2.8" stroke-linecap="round"/>`
      + `<path d="M0 2 L0 ${-size * 0.56}" stroke="${light(color, 0.15)}" stroke-width="1.5" stroke-linecap="round"/>`
      + dom(-2, -size * 0.78, -14, scfv) + dom(2, -size * 0.8, 14, light(scfv, 0.3))
      + '</g>';
  }).join('');
}

function bean(cx, cy, w, h, rot = 0) {
  // kidney / horseshoe nucleus
  const pts = [
    [-0.5, 0], [-0.4, -0.38], [0, -0.5], [0.4, -0.38], [0.5, 0], [0.38, 0.4], [0.16, 0.48],
    [0, 0.26], [-0.16, 0.48], [-0.38, 0.4],
  ].map(([x, y]) => {
    const a = (rot * Math.PI) / 180;
    const X = x * w, Y = y * h;
    return [cx + X * Math.cos(a) - Y * Math.sin(a), cy + X * Math.sin(a) + Y * Math.cos(a)];
  });
  return smooth(pts);
}

export function lobedNucleus(c, uid, lobes, sw = 1.4) {
  // lobes joined by thin chromatin strands; each lobe is a little elongated and turned
  // across the strand, so the nucleus reads as one segmented body rather than loose spheres
  let s = '';
  for (let i = 1; i < lobes.length; i++) {
    const [x0, y0] = lobes[i - 1], [x1, y1] = lobes[i];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0;
    const bow = (i % 2 ? 1 : -1) * 0.12;
    const d = `M${n(x0)} ${n(y0)} Q${n(mx - dy * bow)} ${n(my + dx * bow)} ${n(x1)} ${n(y1)}`;
    s += `<path d="${d}" fill="none" stroke="${dark(c.secondary, 0.46)}" stroke-width="${n(sw * 2.5)}" stroke-linecap="round"/>`
      + `<path d="${d}" fill="none" stroke="${shade(c.secondary, 0.05)}" stroke-width="${n(sw * 1.3)}" stroke-linecap="round"/>`;
  }
  lobes.forEach(([x, y, r], i) => {
    const prev = lobes[i - 1] || lobes[i + 1] || [x + 1, y], next = lobes[i + 1] || lobes[i - 1] || [x - 1, y];
    const ang = lobes.length > 1 ? (Math.atan2(next[1] - prev[1], next[0] - prev[0]) * 180) / Math.PI + 90 + (i % 2 ? 18 : -14) : 0;
    const rx = r * 1.1, ry = r * 0.88;
    const d = blob(x, y, rx, ry, { n: 9, wobble: 0.07, seed: 3 + i * 5, rot: i });
    s += `<g transform="rotate(${n(ang)} ${n(x)} ${n(y)})">`
      + nucleusDetail(uid, `n${i}`, d, { cx: x, cy: y, rx, ry }, c.secondary, { seed: 3 + i, nucleolus: false, chroma: 0.75, sw })
      + '</g>';
  });
  return s;
}

/**
 * A biconcave red cell seen at an angle: a thick, rounded rim around a dimple that is shadowed
 * under its near edge and lit on its far wall.
 */
export function rbcDisc(c, u, { cx = 50, cy = 35, rx = 46, ry = 29 } = {}) {
  const g = sphere(u, 'b', c.primary, { cx: 36, cy: 24, r: 78, hi: 0.42, lo: -0.22 });
  const dim = `${u}-d`;
  const dimDef = `<linearGradient id="${dim}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark(c.secondary, 0.5)}"/><stop offset="0.22" stop-color="${dark(c.secondary, 0.3)}"/><stop offset="0.55" stop-color="${c.secondary}"/><stop offset="1" stop-color="${light(c.primary, 0.16)}"/></linearGradient>`;
  const E = (k, ky = k) => `M${n(cx - rx * k)} ${n(cy)} A${n(rx * k)} ${n(ry * ky)} 0 1 0 ${n(cx + rx * k)} ${n(cy)} A${n(rx * k)} ${n(ry * ky)} 0 1 0 ${n(cx - rx * k)} ${n(cy)}Z`;
  const body = E(1);
  const dx = cx, dy = cy - ry * 0.05, drx = rx * 0.6, dry = ry * 0.52;
  let s = defs(g, dimDef) + path(body, g.url);
  // soft shoulder where the rim rolls into the dimple
  s += ellipse(dx, dy, drx * 1.2, dry * 1.26, dark(c.primary, 0.2), 'none', 0, ' opacity="0.16"') + ellipse(dx, dy, drx * 1.1, dry * 1.13, dark(c.primary, 0.25), 'none', 0, ' opacity="0.2"');
  s += ellipse(dx, dy, drx, dry, `url(#${dim})`);
  // light on the far wall of the dimple
  s += `<path d="M${n(dx - drx * 0.86)} ${n(dy + dry * 0.42)} Q${n(dx)} ${n(dy + dry * 1.22)} ${n(dx + drx * 0.86)} ${n(dy + dry * 0.42)}" fill="none" stroke="${light(c.primary, 0.5)}" stroke-width="2.2" opacity="0.55" stroke-linecap="round"/>`;
  s += rim(u, 'br', body, c.primary, { op: 0.34, from: 0.6, glow: 0.26, glowW: 4 });
  s += membrane(body, c.primary, 2);
  // sheen along the near shoulder of the rim
  s += `<path d="M${n(cx - rx * 0.74)} ${n(cy - ry * 0.42)} Q${n(cx - rx * 0.1)} ${n(cy - ry * 1.12)} ${n(cx + rx * 0.7)} ${n(cy - ry * 0.5)}" fill="none" stroke="#ffffff" stroke-width="2.6" opacity="0.3" stroke-linecap="round"/>`;
  return s;
}

function cell(id, name, tags, colors, draw, extra = {}) {
  return { id, name, category: 'Immune cells', tags, colors, roles: CELL_ROLES, shape: 'ellipse', size: 110, body: 0.8, draw, ...extra };
}

export const immuneCells = [
  cell('t-cell', 'T cell', ['lymphocyte', 't lymphocyte', 'adaptive', 'cd3'], { primary: '#62a8ea', secondary: '#3c5fb4', accent: '#f1a340' },
    (c, u) => lymphocyte(c, u, { seed: 3 })),
  cell('t-cell-cd8', 'CD8⁺ cytotoxic T cell', ['cd8', 'ctl', 'cytotoxic', 'killer t', 'effector', 't cell'], { primary: '#46b9a8', secondary: '#23677f', accent: '#e3564f' },
    (c, u) => lymphocyte(c, u, { seed: 11, granules: 9, nucleus: [55, 55, 25, 24] })),
  cell('t-cell-cd4', 'CD4⁺ helper T cell', ['cd4', 'helper', 'th1', 'th2', 'th17', 'tfh', 't cell'], { primary: '#7ba7ec', secondary: '#3f4fa8', accent: '#f1a340' },
    (c, u) => lymphocyte(c, u, { seed: 17 })),
  cell('treg', 'Regulatory T cell (Treg)', ['treg', 'foxp3', 'cd25', 'regulatory', 'suppressor', 't cell'], { primary: '#a28be0', secondary: '#4f3c9a', accent: '#f1a340' },
    (c, u) => lymphocyte(c, u, { seed: 23 })),
  cell('memory-t-cell', 'Memory T cell', ['memory', 'tcm', 'tem', 'trm', 't cell'], { primary: '#8fc5d9', secondary: '#2f6f8f', accent: '#f1a340' },
    (c, u) => lymphocyte(c, u, { seed: 41, r: 36, nucleus: [52, 53, 26, 25] })),
  cell('car-t-cell', 'CAR-T cell', ['car', 'car-t', 'chimeric antigen receptor', 'engineered', 'cell therapy', 't cell'], { primary: '#5aa7e6', secondary: '#33529e', accent: '#f39a3d' },
    (c, u) => lymphocyte(c, u, { seed: 29, r: 37, surface: surfaceCARs(9, dark(c.accent, 0.1), c.accent, { r: 37, size: 14 }) })),
  cell('b-cell', 'B cell', ['b lymphocyte', 'bcr', 'cd19', 'cd20', 'humoral', 'adaptive'], { primary: '#f2b54f', secondary: '#9a5a1c', accent: '#d4573f' },
    (c, u) => lymphocyte(c, u, { seed: 7, r: 37, surface: surfaceYs(10, c.accent, dark(c.accent), { r: 37, size: 11 }) })),
  cell('plasma-cell', 'Plasma cell', ['plasma', 'antibody secreting', 'asc', 'plasmablast', 'cd138', 'b cell'], { primary: '#ee9f55', secondary: '#7d3f17', accent: '#d4573f' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      const body = blob(46, 54, 38, 32, { n: 24, wobble: 0.03, seed: 5 });
      let s = defs(g, `<clipPath id="${u}-clip"><path d="${body}"/></clipPath>`) + path(body, g.url);
      // rough ER: concentric cisternae studded with ribosomes, around the eccentric nucleus
      let er = '', ribo = '';
      for (let i = 0; i < 6; i++) {
        const r = 19 + i * 4.6;
        const a0 = 1.65, a1 = 4.65;
        er += `<path d="M${n(64 + r * Math.cos(a0))} ${n(55 + r * Math.sin(a0))} A${r} ${r} 0 0 1 ${n(64 + r * Math.cos(a1))} ${n(55 + r * Math.sin(a1))}" fill="none" stroke="${dark(c.primary, 0.22)}" stroke-width="1.5" opacity="0.6" stroke-linecap="round"/>`;
        for (let a = a0 + 0.08; a < a1; a += 0.32 - i * 0.025) ribo += `<circle cx="${n(64 + (r + 1.2) * Math.cos(a))}" cy="${n(55 + (r + 1.2) * Math.sin(a))}" r="0.75"/>`;
      }
      s += `<g clip-path="url(#${u}-clip)">${er}<g fill="${dark(c.primary, 0.42)}" opacity="0.7">${ribo}</g></g>`;
      // Golgi "hof": a pale zone beside the nucleus with stacked cisternae
      s += path(blob(47, 50, 10, 9, { n: 8, wobble: 0.1, seed: 8 }), light(c.primary, 0.5), 'none', 0, ' opacity="0.75"');
      for (let i = 0; i < 4; i++) s += `<path d="M${42 + i * 1.8} ${43 + i * 0.4} q-4 7 0 14" fill="none" stroke="${dark(c.primary, 0.12)}" stroke-width="1.5" stroke-linecap="round"/>`;
      s += vesicle(51, 44, 1.6, light(c.primary, 0.2)) + vesicle(52, 57, 1.4, light(c.primary, 0.2));
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      // eccentric "clock-face" nucleus
      const nd = blob(64, 55, 15, 15, { n: 9, wobble: 0.04, seed: 6 });
      s += nucleusDetail(u, 'n', nd, { cx: 64, cy: 55, rx: 15, ry: 15 }, c.secondary, { seed: 4, nucleolus: false, chroma: 0.6 });
      s += `<g fill="${dark(c.secondary, 0.38)}" opacity="0.8">${ring(64, 55, 10.5, 10.5, 8, 0.3).map((p) => `<path d="${blob(p.x, p.y, 2.6, 2.1, { n: 6, wobble: 0.2, seed: Math.round(p.a * 10), rot: p.a })}"/>`).join('')}</g>`;
      s += circle(64, 55, 2.6, dark(c.secondary, 0.38), 'none', 0, ' opacity="0.8"');
      // secreted antibodies
      s += miniY(84, 30, 35, 9, c.accent, dark(c.accent)) + miniY(91, 46, 70, 8, c.accent, dark(c.accent)) + miniY(80, 15, 20, 7, c.accent, dark(c.accent));
      return s + gloss(30, 36, 11, 6, 0.45);
    }),
  cell('nk-cell', 'NK cell', ['natural killer', 'nk', 'cd56', 'innate lymphoid', 'cytotoxic', 'granular'], { primary: '#ec8a7e', secondary: '#8a2f3e', accent: '#7a1f4a' },
    (c, u) => lymphocyte(c, u, { seed: 13, r: 42, granules: 16, nucleus: [58, 54, 23, 25], organelles: 1 })),
  cell('macrophage', 'Macrophage', ['macrophage', 'phagocyte', 'm1', 'm2', 'tam', 'kupffer', 'innate', 'apc'], { primary: '#e7a66c', secondary: '#7b3b1d', accent: '#fbe3c6' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 78, cx: 40, cy: 34 });
      // an amoeboid body: a few broad pseudopods of different reach
      const body = lobed(50, 51, 31, 29, [
        { a: -42, h: 14, s: 30 }, { a: 32, h: 12, s: 14 }, { a: 96, h: 8, s: 22 }, { a: 158, h: 15, s: 16 }, { a: 214, h: 8, s: 26 }, { a: 282, h: 5, s: 14 },
      ], { wobble: 0.05, seed: 6 });
      let s = defs(g) + path(body, g.url);
      // phagosomes with engulfed material, lysosomes, mitochondria
      const phago = (x, y, r, sd) => circle(x, y, r, light(c.accent, 0.1), dark(c.primary, 0.34), n(r * 0.16))
        + circle(x - r * 0.08, y - r * 0.1, r * 0.78, light(c.accent, 0.5), 'none', 0, ' opacity="0.7"')
        + path(blob(x + r * 0.08, y + r * 0.1, r * 0.5, r * 0.4, { n: 7, wobble: 0.28, seed: sd }), dark(c.primary, 0.32), 'none', 0, ' opacity="0.75"')
        + circle(x - r * 0.42, y - r * 0.44, r * 0.2, '#ffffff', 'none', 0, ' opacity="0.75"');
      s += phago(27, 60, 7.2, 2) + phago(71, 37, 5.6, 3) + phago(63, 69, 4.4, 4);
      const lyso = dark(c.primary, 0.12);
      s += vesicle(37, 35, 2.8, c.accent) + vesicle(75, 54, 2.2, lyso) + vesicle(24, 44, 2, lyso) + vesicle(47, 78, 2.2, lyso) + vesicle(58, 24, 1.7, lyso);
      s += mito(46, 27, 8, 12, light(c.primary, 0.12)) + mito(77, 66, 7, 108, light(c.primary, 0.12)) + mito(37, 73, 7, -28, light(c.primary, 0.12));
      s += rim(u, 'br', body, c.primary, { op: 0.3, from: 0.62 });
      s += membrane(body, c.primary, 2.2);
      const nd = bean(52, 52, 30, 24, -15);
      s += nucleusDetail(u, 'n', nd, { cx: 52, cy: 50, rx: 14, ry: 10 }, c.secondary, { seed: 7 });
      return s + gloss(35, 27, 11, 5.5, 0.45);
    }, { size: 130 }),
  cell('monocyte', 'Monocyte', ['monocyte', 'cd14', 'cd16', 'myeloid', 'blood', 'innate'], { primary: '#9fcbe9', secondary: '#4b4f9a', accent: '#ffffff' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      const body = blob(50, 50, 41, 40, { n: 26, wobble: 0.025, seed: 9 });
      let s = defs(g) + path(body, g.url);
      s += speckle(50, 46, 32, 30, 34, 0.9, dark(c.primary, 0.3), 6, 0.45);
      s += vesicle(30, 30, 3, c.accent, 0.9) + vesicle(70, 28, 2.4, c.accent, 0.9) + vesicle(24, 52, 2, c.accent, 0.9) + vesicle(76, 46, 2.6, c.accent, 0.9);
      s += mito(50, 22, 8, 0, light(c.secondary, 0.45));
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      const nd = bean(50, 56, 46, 34, 0);
      s += nucleusDetail(u, 'n', nd, { cx: 50, cy: 54, rx: 20, ry: 12 }, c.secondary, { seed: 9 });
      return s + gloss(34, 27, 11, 5.5, 0.45);
    }),
  cell('dendritic-cell', 'Dendritic cell', ['dendritic', 'dc', 'cdc1', 'cdc2', 'pdc', 'apc', 'antigen presenting', 'langerhans'], { primary: '#7cc47c', secondary: '#2f6b3a', accent: '#f3c34a' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 66, cx: 42, cy: 38, hi: 0.46 });
      // a compact soma with long, tapering dendrites that curl a little at the tips
      const arms = [
        { a: -98, h: 27, s: 6.6, curl: 7 }, { a: -50, h: 22, s: 6.4, curl: -8 }, { a: -6, h: 28, s: 6.6, curl: 8 }, { a: 40, h: 21, s: 6.2, curl: -6 },
        { a: 84, h: 26, s: 6.8, curl: 8 }, { a: 132, h: 22, s: 6.2, curl: -8 }, { a: 176, h: 28, s: 6.6, curl: 6 }, { a: 224, h: 20, s: 6.4, curl: -7 },
      ];
      const body = lobed(50, 50, 18.5, 17.5, arms, { K: 20, wobble: 0.03, seed: 4 });
      let s = defs(g) + path(body, g.url);
      // endosomes and MHC-loading compartments in the soma, antigen carried out along the dendrites
      s += vesicle(38, 39, 2.4, light(c.primary, 0.3)) + vesicle(62, 60, 2.1, light(c.primary, 0.3)) + vesicle(61, 39, 2, c.accent) + vesicle(39, 61, 1.9, c.accent);
      s += rim(u, 'br', body, c.primary, { op: 0.26, from: 0.34, glowW: 3.2, glow: 0.34 });
      arms.forEach((l, i) => {
        const a = ((l.a + l.curl * 0.55) * Math.PI) / 180, q = 18 + l.h * 0.56;
        s += circle(50 + Math.cos(a) * q, 50 + Math.sin(a) * q, i % 2 ? 1.2 : 1.45, c.accent, dark(c.accent, 0.42), 0.45);
      });
      s += membrane(body, c.primary, 1.9);
      const nd = bean(50, 51, 27, 21, 12);
      s += nucleusDetail(u, 'n', nd, { cx: 50, cy: 49.5, rx: 12.5, ry: 9 }, c.secondary, { seed: 5, chroma: 0.7 });
      return s + gloss(42, 39, 6, 3, 0.4);
    }, { size: 130 }),
  cell('neutrophil', 'Neutrophil', ['neutrophil', 'pmn', 'granulocyte', 'polymorphonuclear', 'innate', 'net'], { primary: '#f4b6c4', secondary: '#6b3c8e', accent: '#d58aa5' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      const body = blob(50, 50, 41, 41, { n: 28, wobble: 0.022, seed: 21 });
      let s = defs(g) + path(body, g.url);
      s += speckle(50, 50, 34, 34, 70, 1, c.accent, 12, 0.85);
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      s += lobedNucleus(c, u, [[33, 44, 10], [48, 60, 10.5], [64, 48, 10], [57, 32, 8]]);
      return s + gloss(32, 27, 11, 5.5, 0.45);
    }),
  cell('eosinophil', 'Eosinophil', ['eosinophil', 'granulocyte', 'allergy', 'parasite', 'type 2'], { primary: '#f7d2c0', secondary: '#5a3f93', accent: '#e8583c' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      const body = blob(50, 50, 41, 41, { n: 28, wobble: 0.022, seed: 31 });
      let s = defs(g) + path(body, g.url);
      s += granules(50, 50, 34, 34, 62, 2.3, c.accent, 5, { glint: 0.6 });
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      s += lobedNucleus(c, u, [[36, 50, 12.5], [64, 50, 12.5]]);
      return s + gloss(32, 27, 11, 5.5, 0.45);
    }),
  cell('basophil', 'Basophil', ['basophil', 'granulocyte', 'histamine', 'allergy', 'ige'], { primary: '#cfc3ec', secondary: '#4e3a8c', accent: '#3d2470' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      const body = blob(50, 50, 40, 40, { n: 28, wobble: 0.022, seed: 37 });
      let s = defs(g) + path(body, g.url);
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      s += lobedNucleus(c, u, [[38, 52, 12], [62, 48, 12]]);
      s += granules(50, 50, 34, 34, 30, 3.1, c.accent, 8, { glint: 0.45 });
      return s + gloss(32, 27, 11, 5.5, 0.45);
    }),
  cell('mast-cell', 'Mast cell', ['mast', 'histamine', 'degranulation', 'allergy', 'ige', 'tissue resident'], { primary: '#f0cf86', secondary: '#7a4b9b', accent: '#7b3fa0' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      const body = blob(50, 50, 44, 36, { n: 26, wobble: 0.04, seed: 43 });
      let s = defs(g) + path(body, g.url);
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      const nd = blob(50, 50, 12, 11.5, { n: 8, wobble: 0.05, seed: 2 });
      s += nucleusDetail(u, 'n', nd, { cx: 50, cy: 50, rx: 12, ry: 11.5 }, c.secondary, { seed: 3, chroma: 0.7 });
      s += granules(50, 50, 38, 30, 56, 2.5, c.accent, 3, { glint: 0.45, op: 0.95 });
      // a few granules leaving the cell (degranulation)
      s += granules(92, 26, 4, 6, 4, 2.2, c.accent, 9, { glint: 0.5 });
      return s + gloss(30, 30, 11, 5.5, 0.45);
    }, { size: 120 }),
  cell('hsc', 'Hematopoietic stem cell', ['hsc', 'stem cell', 'progenitor', 'cd34', 'bone marrow', 'hematopoiesis'], { primary: '#b9da7c', secondary: '#4f7a2a', accent: '#f1a340' },
    (c, u) => lymphocyte(c, u, { seed: 51, r: 41, nucleus: [50, 52, 25, 24], villi: 0, organelles: 4 })),
  {
    id: 'red-blood-cell', name: 'Red blood cell', category: 'Immune cells', tags: ['rbc', 'erythrocyte', 'blood'],
    colors: { primary: '#d94848', secondary: '#a82a2a' }, roles: { primary: 'Cell', secondary: 'Center' }, shape: 'ellipse', w: 100, h: 66, size: 80,
    draw: (c, u) => rbcDisc(c, u) + gloss(27, 15.5, 8, 2.6, 0.42, -16),
  },
  {
    id: 'platelet', name: 'Platelets', category: 'Immune cells', tags: ['platelet', 'thrombocyte', 'clotting', 'blood'],
    colors: { primary: '#ebb3c9', secondary: '#8f4f7a' }, roles: { primary: 'Platelet', secondary: 'Granules' }, w: 100, h: 70, size: 80,
    draw: (c, u) => {
      const g = sphere(u, 'b', c.primary);
      let s = defs(g);
      [[30, 40, 22, 14, 2, true], [68, 26, 18, 11, 5, false], [70, 54, 15, 10, 8, false]].forEach(([x, y, rx, ry, sd, active], i) => {
        const d = active
          ? radial(x, y, Array.from({ length: 16 }, (_, k) => (k % 4 === 0 ? [rx * 1.25, ry * 1.35] : [rx, ry])), { tension: 0.9 })
          : blob(x, y, rx, ry, { n: 9, wobble: 0.12, seed: sd });
        s += path(d, g.url);
        s += granules(x, y, rx * 0.55, ry * 0.5, 6, 1.5, c.secondary, sd, { glint: 0.4 });
        s += rim(u, `r${i}`, d, c.primary, { op: 0.25 });
        s += membrane(d, c.primary, 1.6);
        s += gloss(x - rx * 0.35, y - ry * 0.4, rx * 0.3, ry * 0.2, 0.4, -15);
      });
      return s;
    },
  },
];

// Fraction of the icon box occupied by the cell membrane (for arrows / attach).
const BODY = { 'car-t-cell': 0.74, 'b-cell': 0.74, 'memory-t-cell': 0.72, 'nk-cell': 0.84, macrophage: 0.84, 'dendritic-cell': 0.6, 'mast-cell': 0.82, monocyte: 0.82 };
for (const c of immuneCells) if (BODY[c.id]) c.body = BODY[c.id];

export const otherCells = [
  {
    id: 'cell', name: 'Cell (cross-section)', category: 'Cells', tags: ['animal cell', 'generic', 'eukaryotic', 'organelles'],
    colors: { primary: '#bfe0f5', secondary: '#7a6cc8', accent: '#f39a6b' }, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Organelles' },
    shape: 'ellipse', size: 160, body: 0.9,
    draw: (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 85, hi: 0.35 });
      const body = blob(50, 50, 46, 42, { n: 14, wobble: 0.04, seed: 2 });
      let s = defs(g) + path(body, g.url);
      // rough ER around the nucleus, with ribosomes
      let er = '', ribo = '';
      for (let i = 0; i < 4; i++) {
        const r = 21 + i * 3.6;
        er += `<path d="M${n(48 + r * Math.cos(3.4))} ${n(52 + r * Math.sin(3.4))} A${r} ${r * 0.9} 0 0 1 ${n(48 + r * Math.cos(5.3))} ${n(52 + r * Math.sin(5.3) * 0.9)}" fill="none" stroke="${light(c.secondary, 0.35)}" stroke-width="1.6" stroke-linecap="round"/>`;
        for (let a = 3.5; a < 5.25; a += 0.22) ribo += `<circle cx="${n(48 + (r + 1.1) * Math.cos(a))}" cy="${n(52 + (r + 1.1) * Math.sin(a) * 0.9)}" r="0.6"/>`;
      }
      s += er + `<g fill="${dark(c.secondary, 0.2)}" opacity="0.7">${ribo}</g>`;
      // Golgi stack with budding vesicles
      for (let i = 0; i < 4; i++) s += `<path d="M${69 + i * 2.6} ${30 + i * 2.2} q9 7 2 18" fill="none" stroke="${shade(c.accent, 0.1 - i * 0.08)}" stroke-width="2.2" stroke-linecap="round"/>`;
      s += vesicle(83, 33, 1.8, c.accent) + vesicle(84, 52, 1.6, c.accent) + vesicle(78, 56, 1.4, c.accent);
      // mitochondria, lysosomes, centrioles
      s += mito(76, 66, 14, -25, c.accent) + mito(22, 66, 12, 30, c.accent) + mito(30, 28, 10, -60, c.accent);
      s += vesicle(40, 80, 3.5, light(c.accent, 0.2)) + vesicle(62, 83, 2.6, dark(c.accent, 0.1)) + vesicle(86, 44, 2.4, light(c.accent, 0.2));
      s += speckle(50, 50, 40, 36, 40, 0.6, dark(c.primary, 0.35), 3, 0.5);
      s += rim(u, 'br', body, c.primary, { op: 0.26, from: 0.72 });
      s += membrane(body, c.primary, 2.4);
      const nd = blob(48, 52, 18, 16, { n: 9, wobble: 0.05, seed: 3 });
      s += nucleusDetail(u, 'n', nd, { cx: 48, cy: 52, rx: 18, ry: 16 }, c.secondary, { seed: 3, nucleolus: 'big' });
      return s + gloss(28, 22, 13, 5, 0.42);
    },
  },
  {
    id: 'tumor-cell', name: 'Tumor cell', category: 'Cells', tags: ['cancer', 'tumor', 'malignant', 'neoplastic', 'target cell'],
    colors: { primary: '#c47bc0', secondary: '#5b2a6e', accent: '#f6d2f0' }, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Nucleolus' },
    shape: 'ellipse', size: 120, body: 0.86,
    draw: (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 80 });
      const R = rng(9);
      const radii = Array.from({ length: 18 }, (_, i) => 40 + (i % 3 === 0 ? 6 : 0) + R() * 4);
      const body = radial(50, 50, radii, { tension: 1.15 });
      let s = defs(g) + path(body, g.url);
      s += speckle(50, 50, 38, 38, 40, 0.8, dark(c.primary, 0.35), 2, 0.45);
      s += mito(22, 38, 8, -60, light(c.primary, 0.3)) + mito(78, 66, 8, 120, light(c.primary, 0.3)) + mito(70, 22, 7, 20, light(c.primary, 0.3));
      s += vesicle(28, 70, 2.6, c.accent) + vesicle(82, 42, 2.2, c.accent);
      s += rim(u, 'br', body, c.primary, { op: 0.3, from: 0.6 });
      s += membrane(body, c.primary, 2.2);
      // large, irregular nucleus with several prominent nucleoli
      const nd = blob(52, 50, 25, 22, { n: 10, wobble: 0.14, seed: 12 });
      s += nucleusDetail(u, 'n', nd, { cx: 52, cy: 50, rx: 25, ry: 22 }, c.secondary, { seed: 12, nucleolus: false, chroma: 1.2 });
      [[58, 44, 4.2], [44, 57, 2.8], [61, 58, 2.2]].forEach(([x, y, r], i) => { s += path(blob(x, y, r * 1.15, r, { n: 6, wobble: 0.18, seed: i + 3 }), mix(c.accent, c.secondary, 0.45), dark(c.secondary, 0.3), 0.9, ' opacity="0.9"') + circle(x - r * 0.3, y - r * 0.3, r * 0.3, '#fff', 'none', 0, ' opacity="0.45"'); });
      return s + gloss(32, 26, 11, 5.5, 0.42);
    },
  },
  {
    id: 'apoptotic-cell', name: 'Apoptotic cell', category: 'Cells', tags: ['apoptosis', 'cell death', 'blebbing', 'killing', 'dead cell'],
    colors: { primary: '#c9a3c4', secondary: '#5b2a6e', accent: '#c9a3c4' }, roles: { primary: 'Cell', secondary: 'Fragmented nucleus', accent: 'Apoptotic bodies' },
    shape: 'ellipse', size: 120,
    draw: (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 80 });
      const ga = sphere(u, 'a', c.accent, { r: 80 });
      const body = radial(46, 50, [33, 38, 31, 37, 30, 36, 32, 39, 31, 35, 30, 38], { tension: 1.3 });
      let s = defs(g, ga) + path(body, g.url) + speckle(46, 50, 28, 28, 14, 1.4, dark(c.primary, 0.3), 3, 0.4);
      s += rim(u, 'br', body, c.primary) + membrane(body, c.primary, 2);
      const frag = (x, y, r, k) => {
        const fg = sphere(u, `f${k}`, c.secondary, { hi: 0.3, lo: -0.3 });
        return defs(fg) + circle(x, y, r, fg.url, dark(c.secondary, 0.45), 1.1) + circle(x - r * 0.3, y - r * 0.32, r * 0.3, '#fff', 'none', 0, ' opacity="0.45"');
      };
      [[40, 46, 6], [52, 42, 5], [50, 56, 6.5], [38, 58, 4]].forEach(([x, y, r], i) => { s += frag(x, y, r, i); });
      [[86, 26, 7], [90, 46, 5], [82, 74, 8], [14, 82, 5]].forEach(([x, y, r], i) => {
        const d = blob(x, y, r, r, { n: 8, wobble: 0.05, seed: i + 4 });
        s += path(d, ga.url) + rim(u, `ar${i}`, d, c.accent, { op: 0.25 }) + membrane(d, c.accent, 1.4) + frag(x - r * 0.15, y + r * 0.1, r * 0.36, `a${i}`);
      });
      return s + gloss(32, 30, 8, 4, 0.4);
    },
  },
  {
    id: 'infected-cell', name: 'Virus-infected cell', category: 'Cells', tags: ['infected', 'viral infection', 'virions', 'target cell', 'budding'],
    colors: { primary: '#a9d4ef', secondary: '#4a5fb0', accent: '#e85d5d' }, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Virions' },
    shape: 'ellipse', size: 130, body: 0.78,
    draw: (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 80 });
      const vg = sphere(u, 'v', c.accent, { hi: 0.45 });
      const body = blob(48, 52, 40, 38, { n: 18, wobble: 0.03, seed: 14 });
      let s = defs(g, vg) + path(body, g.url) + speckle(48, 52, 34, 32, 30, 0.8, dark(c.primary, 0.35), 3, 0.4);
      const virion = (x, y, r) => {
        let v = '';
        ring(x, y, r, r, 10).forEach((p) => { v += line(x + Math.cos(p.a) * r, y + Math.sin(p.a) * r, x + Math.cos(p.a) * (r + 2.4), y + Math.sin(p.a) * (r + 2.4), dark(c.accent, 0.3), 1.1) + circle(x + Math.cos(p.a) * (r + 2.6), y + Math.sin(p.a) * (r + 2.6), 0.9, dark(c.accent, 0.2)); });
        return v + circle(x, y, r, vg.url, dark(c.accent, 0.4), 0.9) + circle(x - r * 0.3, y - r * 0.32, r * 0.3, '#fff', 'none', 0, ' opacity="0.5"');
      };
      // a viral factory beside the nucleus, new virions assembling
      s += path(blob(64, 44, 12, 9, { n: 8, wobble: 0.15, seed: 4 }), light(c.accent, 0.55), 'none', 0, ' opacity="0.6"');
      [[66, 40, 3.6], [70, 50, 3.2], [58, 32, 3], [30, 34, 3.2], [60, 46, 2.6]].forEach(([x, y, r]) => { s += virion(x, y, r); });
      s += rim(u, 'br', body, c.primary) + membrane(body, c.primary, 2.2);
      const nd = blob(42, 58, 17, 15, { n: 8, wobble: 0.06, seed: 15 });
      s += nucleusDetail(u, 'n', nd, { cx: 42, cy: 58, rx: 17, ry: 15 }, c.secondary, { seed: 15 });
      // budding through the membrane
      s += virion(88, 18, 4.4) + virion(95, 34, 4);
      return s + gloss(30, 28, 11, 5, 0.42);
    },
  },
  {
    id: 'epithelial-cell', name: 'Epithelial cell', category: 'Cells', tags: ['epithelium', 'columnar', 'enterocyte', 'barrier', 'mucosa'],
    colors: { primary: '#f2c6a0', secondary: '#7a4b9b', accent: '#e8a07a' }, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Microvilli' },
    w: 60, h: 100, size: 70,
    draw: (c, u) => {
      const g = sphere(u, 'b', c.primary, { cx: 40, cy: 40, r: 90 });
      const mv = sphere(u, 'm', c.accent, { cx: 30, cy: 20, hi: 0.4 });
      let s = defs(g, mv);
      // brush border
      for (let x = 9; x <= 51; x += 4.2) s += `<rect x="${n(x - 1.6)}" y="2.5" width="3.2" height="11" rx="1.6" fill="${mv.url}" stroke="${dark(c.accent, 0.35)}" stroke-width="0.7"/>`;
      const body = `M14 11 H46 Q54 11 54 19 V88 Q54 96 46 96 H14 Q6 96 6 88 V19 Q6 11 14 11Z`;
      s += path(body, g.url);
      // terminal web, mitochondria, secretory granules near the top, basal nucleus
      s += `<path d="M8 16 H52" stroke="${dark(c.primary, 0.25)}" stroke-width="1.6" opacity="0.6"/>`;
      s += mito(20, 34, 9, 80, light(c.accent, 0.1)) + mito(40, 30, 9, 100, light(c.accent, 0.1)) + mito(30, 46, 8, 70, light(c.accent, 0.1));
      s += vesicle(16, 22, 2.2, light(c.primary, 0.35)) + vesicle(44, 22, 2, light(c.primary, 0.35)) + vesicle(30, 24, 1.8, light(c.primary, 0.35));
      s += `<g stroke="${dark(c.primary, 0.45)}" stroke-width="1.4"><path d="M6.5 20 v4 M53.5 20 v4" /></g>`;
      s += rim(u, 'br', body, c.primary, { op: 0.26, from: 0.7 });
      s += membrane(body, c.primary, 2);
      const nd = blob(30, 70, 12, 16, { n: 8, wobble: 0.04, seed: 3 });
      s += nucleusDetail(u, 'n', nd, { cx: 30, cy: 70, rx: 12, ry: 16 }, c.secondary, { seed: 3 });
      return s + gloss(18, 28, 6, 3, 0.4, -70);
    },
  },
  {
    id: 'neuron', name: 'Neuron', category: 'Cells', tags: ['neuron', 'nerve', 'brain', 'axon', 'dendrite', 'cns'],
    colors: { primary: '#f0a35e', secondary: '#7b3b1d', accent: '#f6e2a8' }, roles: { primary: 'Neuron', secondary: 'Nucleus', accent: 'Myelin' },
    w: 100, h: 100, size: 130,
    draw: (c, u) => {
      const st = dark(c.primary, 0.42);
      const g = sphere(u, 'b', c.primary);
      const my = sphere(u, 'm', c.accent, { cx: 40, cy: 20, hi: 0.45 });
      let s = defs(g, my);
      // tapering dendrites with branches
      const den = [[30, 30, 12, 10, 4, 22], [30, 30, 8, 36, 2, 44], [30, 30, 24, 4, 34, 2], [30, 30, 48, 18, 56, 12], [30, 30, 10, 54, 4, 60]];
      const twigs = [[4, 22, -3, 16], [4, 22, -2, 26], [2, 44, -4, 40], [34, 2, 40, -3], [34, 2, 30, -4], [56, 12, 62, 6], [56, 12, 63, 15], [4, 60, -2, 66]];
      let under = '', over = '';
      den.forEach(([x0, y0, x1, y1, x2, y2]) => { const d = `M${x0} ${y0} Q${x1} ${y1} ${x2} ${y2}`; under += `<path d="${d}" stroke-width="6"/>`; over += `<path d="${d}" stroke-width="3.8"/>`; });
      twigs.forEach(([a, b, x, y]) => { const d = `M${a} ${b} L${x} ${y}`; under += `<path d="${d}" stroke-width="3"/>`; over += `<path d="${d}" stroke-width="1.6"/>`; });
      // axon with myelin sheaths and nodes of Ranvier, terminal boutons
      under += '<path d="M36 36 Q60 60 84 84" stroke-width="4.8"/>';
      over += '<path d="M36 36 Q60 60 84 84" stroke-width="2.8"/>';
      s += `<g fill="none" stroke="${st}" stroke-linecap="round">${under}</g><g fill="none" stroke="${c.primary}" stroke-linecap="round">${over}</g>`;
      [[50, 50], [62, 62], [74, 74]].forEach(([x, y]) => { s += `<rect x="${x - 5.4}" y="${y - 3.6}" width="10.8" height="7.2" rx="3.6" fill="${my.url}" stroke="${dark(c.accent, 0.38)}" stroke-width="1" transform="rotate(45 ${x} ${y})"/>`; });
      s += `<g stroke="${st}" stroke-width="2.6" stroke-linecap="round"><path d="M84 84 l8 2 M84 84 l2 8 M84 84 l8 8"/></g>`;
      [[93, 86], [86, 93], [93, 93]].forEach(([x, y]) => { s += circle(x, y, 2.4, light(c.primary, 0.2), st, 1); });
      const soma = blob(30, 30, 15, 14, { n: 7, wobble: 0.15, seed: 4 });
      s += path(soma, g.url) + speckle(30, 30, 11, 10, 14, 0.8, dark(c.primary, 0.4), 2, 0.5) + rim(u, 'sr', soma, c.primary, { op: 0.3 }) + membrane(soma, c.primary, 2);
      s += nucleusDetail(u, 'n', blob(30, 30, 6.5, 6, { n: 7, wobble: 0.08, seed: 5 }), { cx: 30, cy: 30, rx: 6.5, ry: 6 }, c.secondary, { seed: 5, nucleolus: 'big', chroma: 0.5, sw: 1.1 });
      return s + gloss(25, 23, 5, 2.6, 0.45);
    },
  },
  {
    id: 'fibroblast', name: 'Fibroblast', category: 'Cells', tags: ['fibroblast', 'stromal', 'caf', 'mesenchymal', 'connective tissue'],
    colors: { primary: '#e9b48a', secondary: '#7b3b1d', accent: '#e9b48a' }, roles: { primary: 'Cytoplasm', secondary: 'Nucleus' }, w: 120, h: 60, size: 130,
    draw: (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 80 });
      const d = smooth([[4, 34], [24, 24], [44, 16], [62, 18], [82, 22], [100, 12], [116, 8], [102, 24], [94, 38], [110, 52], [86, 44], [64, 44], [42, 46], [22, 44]]);
      let s = defs(g) + path(d, g.url);
      // stress fibers and ER along the long axis
      for (let i = 0; i < 4; i++) s += `<path d="M${14 + i * 3} ${33 - i * 2.4} Q60 ${22 - i * 1.5} ${100 - i * 3} ${18 + i * 4}" fill="none" stroke="${dark(c.primary, 0.2)}" stroke-width="0.9" opacity="0.5"/>`;
      s += mito(36, 38, 8, -10, light(c.primary, 0.25)) + mito(84, 34, 7, -20, light(c.primary, 0.25)) + vesicle(26, 34, 1.8, light(c.primary, 0.4)) + vesicle(92, 26, 1.6, light(c.primary, 0.4));
      s += rim(u, 'br', d, c.primary, { op: 0.28, from: 0.55 });
      s += membrane(d, c.primary, 2);
      s += nucleusDetail(u, 'n', blob(60, 31, 16, 8, { n: 9, wobble: 0.05, seed: 3 }), { cx: 60, cy: 31, rx: 16, ry: 8 }, c.secondary, { seed: 3, chroma: 0.7 });
      return s + gloss(50, 22, 12, 2.5, 0.4, -5);
    },
  },
];
