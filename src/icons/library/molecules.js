// Antibodies, immune receptors, ligands and other proteins.
// Receptors are drawn without a membrane (ectodomain on top, transmembrane segment
// and short cytoplasmic tail below) so they can sit on any membrane shape.

import { defs, sphere, path, circle, ellipse, rect, line, domain, dark, light, shade, n, ring, blob, smooth, membraneStrip, smoothOpen, helix, gloss, rim, granules, vesicle } from './kit.js';

const AB_ROLES = { primary: 'Heavy chain', secondary: 'Light chain', accent: 'Variable / payload' };

/** IgG drawn with hinge at (0,0), arms up, Fc down. */
export function igg(c, { armB = null, fcDomains = 2, rx = 8, ry = 11.5, hingeLen = 6 } = {}) {
  const H = c.primary, L = c.secondary;
  const HB = armB ? armB.h : H, LB = armB ? armB.l : L;
  let s = '';
  const arm = (sx, heavy, light) => {
    const dx = 0.6 * sx, dy = -0.8, nx = 0.8 * sx, ny = 0.6;
    const rot = 36.87 * sx;
    const h1 = [dx * 17, dy * 17 - hingeLen], h2 = [dx * 36, dy * 36 - hingeLen];
    const l1 = [h1[0] + nx * 15, h1[1] + ny * 15], l2 = [h2[0] + nx * 15, h2[1] + ny * 15];
    let a = '';
    a += line(sx * 5, 6, h1[0], h1[1], dark(heavy, 0.15), 3.2);
    a += line(h1[0] + nx * 4, h1[1] + ny * 4, l1[0], l1[1], dark(light, 0.15), 2.4);
    a += domain(h1[0], h1[1], rx, ry, heavy, rot) + domain(h2[0], h2[1], rx, ry, light === L && !armB ? shade(heavy, 0.18) : shade(heavy, 0.18), rot);
    a += domain(l1[0], l1[1], rx * 0.92, ry * 0.92, light, rot) + domain(l2[0], l2[1], rx * 0.92, ry * 0.92, shade(light, 0.18), rot);
    return a;
  };
  // Fc
  const fy = [16, 36, 56].slice(0, fcDomains);
  s += line(-6, -2, -6, fy[fy.length - 1], dark(H, 0.15), 3.2) + line(6, -2, 6, fy[fy.length - 1], dark(H, 0.15), 3.2);
  s += line(-5, 2, 5, 2, dark(H, 0.35), 1.8) + line(-5, 6, 5, 6, dark(H, 0.35), 1.8);
  fy.forEach((y) => { s += domain(-8, y, rx * 0.95, ry * 0.92, H) + domain(8, y, rx * 0.95, ry * 0.92, HB); });
  // N-linked glycans tucked between the CH2 domains
  const gy = fy[0] + 2;
  s += `<g stroke="#7b8794" stroke-width="0.9" stroke-linecap="round" fill="none"><path d="M-2 ${gy} l-1.6 3.4 M-3.6 ${gy + 3.4} l-1.6 2.6 M-3.6 ${gy + 3.4} l1.2 3 M2 ${gy} l1.6 3.4 M3.6 ${gy + 3.4} l1.6 2.6 M3.6 ${gy + 3.4} l-1.2 3"/></g>`;
  for (const [gx, gyy] of [[-5.2, gy + 6], [-2.4, gy + 6.4], [5.2, gy + 6], [2.4, gy + 6.4]]) s += `<circle cx="${gx}" cy="${gyy}" r="1.25" fill="#f6c945" stroke="#9a7a10" stroke-width="0.5"/>`;
  s += arm(-1, H, L) + arm(1, HB, LB);
  return s;
}

export const g = (tx, ty, rot, sc, inner) => `<g transform="translate(${n(tx)} ${n(ty)}) rotate(${n(rot)}) scale(${sc})">${inner}</g>`;

function ab(id, name, tags, colors, draw, extra = {}) {
  return { id, name, category: 'Antibodies', tags, colors, roles: AB_ROLES, draw, size: 90, ...extra };
}

export const antibodies = [
  ab('antibody', 'Antibody (IgG)', ['igg', 'immunoglobulin', 'mab', 'monoclonal', 'antibody', 'checkpoint inhibitor'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#f39a3d' },
    (c) => g(50, 46, 0, 1, igg(c))),
  ab('igm', 'IgM pentamer', ['igm', 'pentamer', 'immunoglobulin m', 'antibody'], { primary: '#7a5fd0', secondary: '#c0b2f0', accent: '#f39a3d' },
    (c) => {
      let s = '';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 360 - 90;
        const rad = (a * Math.PI) / 180;
        s += g(50 + Math.cos(rad) * 22, 50 + Math.sin(rad) * 22, a + 90, 0.46, igg(c, { fcDomains: 2 }));
      }
      return s + circle(50, 50, 6, c.accent, dark(c.accent), 1.4);
    }),
  ab('iga', 'IgA dimer (secretory)', ['iga', 'secretory', 'mucosal', 'dimer', 'j chain', 'antibody'], { primary: '#2fa58f', secondary: '#9be0cf', accent: '#f39a3d' },
    (c) => g(32, 50, -90, 0.62, igg(c)) + g(108, 50, 90, 0.62, igg(c)) + ellipse(70, 50, 8, 5, c.accent, dark(c.accent), 1.4),
    { w: 140, h: 100, size: 120 }),
  ab('ige', 'IgE', ['ige', 'allergy', 'mast cell', 'antibody', 'fc epsilon'], { primary: '#d9534f', secondary: '#f3a6a4', accent: '#f39a3d' },
    (c) => g(50, 38, 0, 0.9, igg(c, { fcDomains: 3, hingeLen: 2 }))),
  ab('fab', 'Fab fragment', ['fab', 'fragment', 'antigen binding', 'antibody'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#f39a3d' },
    (c) => {
      let s = '';
      s += domain(26, 60, 10, 14, c.primary) + domain(26, 30, 10, 14, shade(c.primary, 0.18));
      s += domain(46, 64, 9.5, 13.5, c.secondary) + domain(46, 34, 9.5, 13.5, shade(c.secondary, 0.18));
      return s + line(36, 74, 37, 74, dark(c.primary, 0.3), 2);
    }, { w: 70, h: 90, size: 60 }),
  ab('scfv', 'scFv', ['scfv', 'single chain', 'variable fragment', 'binder', 'antibody fragment'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#9aa5b1' },
    (c) => `<path d="M30 52 C 34 76, 58 76, 62 54" fill="none" stroke="${c.accent}" stroke-width="2.4" stroke-dasharray="3 3" stroke-linecap="round"/>`
      + domain(26, 36, 13, 17, c.primary, -10) + domain(58, 36, 13, 17, c.secondary, 10), { w: 84, h: 80, size: 60 }),
  ab('nanobody', 'Nanobody (VHH)', ['vhh', 'nanobody', 'single domain', 'camelid', 'sdab'], { primary: '#2fa58f', secondary: '#9be0cf', accent: '#f39a3d' },
    (c) => domain(25, 30, 15, 21, c.primary) + rect(22, 50, 6, 10, 3, dark(c.primary, 0.1)), { w: 50, h: 64, size: 40 }),
  ab('bispecific-antibody', 'Bispecific antibody', ['bispecific', 'bsab', 'dual targeting', 'antibody', 't cell engager'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#e8724a' },
    (c) => g(50, 46, 0, 1, igg(c, { armB: { h: c.accent, l: shade(c.accent, 0.45) } }))),
  ab('bite', 'BiTE (T cell engager)', ['bite', 'blinatumomab', 'tandem scfv', 't cell engager', 'tce', 'cd3'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#e8724a' },
    (c) => domain(18, 32, 11, 15, c.primary, -15) + domain(40, 26, 11, 15, c.secondary, 10)
      + `<path d="M48 40 C 60 56, 70 56, 76 46" fill="none" stroke="#9aa5b1" stroke-width="2.4" stroke-dasharray="3 3" stroke-linecap="round"/>`
      + domain(84, 34, 11, 15, c.accent, -10) + domain(106, 40, 11, 15, shade(c.accent, 0.4), 15),
    { w: 124, h: 64, size: 100 }),
  ab('adc', 'Antibody–drug conjugate', ['adc', 'conjugate', 'payload', 'toxin', 'antibody'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#e85d5d' },
    (c) => {
      let s = g(50, 46, 0, 1, igg(c));
      [[28, 66], [72, 66], [16, 40], [84, 40]].forEach(([x, y]) => {
        s += line(x + (x < 50 ? 8 : -8), y - 4, x, y, '#52606d', 1.6);
        s += `<path d="${star(x, y, 5.5, 2.6, 6)}" fill="${c.accent}" stroke="${dark(c.accent)}" stroke-width="1"/>`;
      });
      return s;
    }),
];

export function star(cx, cy, R, r, k) {
  let d = '';
  for (let i = 0; i < k * 2; i++) {
    const a = (i / (k * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${n(cx + Math.cos(a) * rr)} ${n(cy + Math.sin(a) * rr)} `;
  }
  return d + 'Z';
}


/** The peptide-binding groove, seen from the front and a little above: β-sheet floor, α-helix walls, peptide. */
function groove(cx, cy, w, c1, c2, pep, count = 7) {
  let s = '';
  // β-sheet floor: a shallow dish with strands
  const floor = `M${n2(cx - w / 2)} ${n2(cy - 2)} Q${n2(cx - w / 2 - 2)} ${n2(cy + 14)} ${n2(cx - w / 4)} ${n2(cy + 17)} Q${n2(cx)} ${n2(cy + 20)} ${n2(cx + w / 4)} ${n2(cy + 17)} Q${n2(cx + w / 2 + 2)} ${n2(cy + 14)} ${n2(cx + w / 2)} ${n2(cy - 2)} Z`;
  s += `<path d="${floor}" fill="${shade(c2, 0.05)}" stroke="${dark(c2, 0.42)}" stroke-width="1.4" stroke-linejoin="round"/>`;
  for (let i = 0; i < 6; i++) {
    const x = cx - w / 2 + 4 + ((w - 8) * i) / 5;
    s += `<path d="M${n2(x)} ${n2(cy + 4)} L${n2(x + (x - cx) * 0.08)} ${n2(cy + 15 - Math.abs(x - cx) * 0.12)}" stroke="${shade(c2, 0.35)}" stroke-width="2.6" stroke-linecap="round" opacity="0.7"/>`;
  }
  // back helix (α2), peptide in the groove, front helix (α1)
  const rod = (y, color, wd) => helix(cx - wd / 2, y - (w - 4) / 2, wd, w - 4, color, { rot: 90, sw: 1.2, turns: 6 });
  s += rod(cy - 2, shade(c1, 0.12), 8);
  for (let i = 0; i < count; i++) {
    const x = cx - w / 2 + 6 + (i * (w - 12)) / (count - 1), y = cy + 4.5 - Math.sin(i * 0.9) * 1.2;
    s += circle(x, y, 2.8, pep, dark(pep, 0.38), 0.8) + circle(x - 0.9, y - 1, 1, '#fff', 'none', 0, ' opacity="0.6"');
  }
  s += rod(cy + 9, c1, 8.5);
  return s;
}
const n2 = (v) => Math.round(v * 100) / 100;

// ---- Receptors ---------------------------------------------------------------

const REC_ROLES = { primary: 'Chain 1', secondary: 'Chain 2', accent: 'Ligand / signaling' };

/** TM helix segment + short cytoplasmic tail at x from y0. */
export function tm(x, y0, color, { len = 16, tail = 12, w = 6 } = {}) {
  // cytoplasmic tail: a gently wavy, unstructured chain
  const y1 = y0 + len, y2 = y0 + len + tail;
  const waves = Math.max(1, Math.round(tail / 8));
  let d = `M${n(x)} ${n(y1)}`;
  for (let i = 0; i < waves; i++) {
    const a = y1 + (tail * i) / waves, b = y1 + (tail * (i + 1)) / waves;
    d += ` Q${n(x + (i % 2 ? -2.4 : 2.4))} ${n((a + b) / 2)} ${n(x)} ${n(b)}`;
  }
  return `<path d="${d}" fill="none" stroke="${dark(color, 0.3)}" stroke-width="3.2" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="${shade(color, 0.05)}" stroke-width="1.8" stroke-linecap="round"/>`
    + helix(x - w / 2, y0, w, len, shade(color, -0.05), { sw: 1.1 });
}

/** Single-chain receptor: list of domains stacked upward from stalk top. */
export function stalked(x, yTop, doms, color, { stalk = 10, tmY = null } = {}) {
  let s = '';
  let y = yTop;
  const centers = doms.map((d) => { const cy = y + d[1]; y += d[1] * 2 - 2; return cy; });
  const stalkTop = y;
  const ty = tmY ?? stalkTop + stalk;
  s += line(x, stalkTop - 4, x, ty, dark(color, 0.35), 3.6) + line(x, stalkTop - 4, x, ty, shade(color, 0.1), 2);
  s += tm(x, ty, color);
  doms.forEach((d, i) => { s += domain(x, centers[i], d[0], d[1], d[2] || color); });
  return s;
}

function rec(id, name, tags, colors, draw, extra = {}) {
  return { id, name, category: 'Receptors & ligands', tags, colors, roles: REC_ROLES, draw, w: 60, h: 100, size: 60, ...extra };
}

export const receptors = [
  rec('tcr', 'T cell receptor (αβ TCR)', ['tcr', 'alpha beta', 'antigen receptor', 't cell'], { primary: '#3f7fd9', secondary: '#7fb7f0', accent: '#f39a3d' },
    (c) => {
      let s = line(20, 50, 20, 64, dark(c.primary, 0.1), 3) + line(40, 50, 40, 64, dark(c.secondary, 0.1), 3);
      s += line(21, 58, 39, 58, '#52606d', 1.6);
      s += tm(20, 64, c.primary) + tm(40, 64, c.secondary);
      s += domain(20, 40, 9.5, 12, c.primary) + domain(20, 16, 9.5, 12, shade(c.primary, 0.2));
      s += domain(40, 40, 9.5, 12, c.secondary) + domain(40, 16, 9.5, 12, shade(c.secondary, 0.2));
      return s;
    }),
  rec('tcr-cd3', 'TCR–CD3 complex', ['tcr', 'cd3', 'zeta', 'itam', 'signaling', 'complex', 't cell'], { primary: '#3f7fd9', secondary: '#7fb7f0', accent: '#6abf59' },
    (c) => {
      let s = '';
      const itam = (x, y) => rect(x - 3.2, y, 6.4, 5, 1.5, '#f6c945', dark('#f6c945'), 0.8);
      // CD3 dimers either side
      for (const [x1, x2] of [[10, 22], [98, 110]]) {
        for (const x of [x1, x2]) {
          s += line(x, 54, x, 64, dark(c.accent, 0.1), 2.6) + tm(x, 64, c.accent, { tail: 22 }) + itam(x, 88);
          s += domain(x, 46, 6.5, 8, c.accent);
        }
      }
      // ζζ
      for (const x of [56, 64]) s += tm(x, 64, '#9aa5b1', { tail: 30 }) + itam(x, 84) + itam(x, 92);
      s += line(56, 58, 56, 64, '#7b8794', 2.4) + line(64, 58, 64, 64, '#7b8794', 2.4);
      // TCR
      s += line(40, 50, 40, 64, dark(c.primary, 0.1), 3) + line(80, 50, 80, 64, dark(c.secondary, 0.1), 3);
      s += tm(40, 64, c.primary) + tm(80, 64, c.secondary);
      s += domain(40, 40, 10, 12, c.primary) + domain(40, 16, 10, 12, shade(c.primary, 0.2));
      s += domain(80, 40, 10, 12, c.secondary) + domain(80, 16, 10, 12, shade(c.secondary, 0.2));
      return s;
    }, { w: 120, h: 104, size: 110 }),
  rec('bcr', 'B cell receptor (BCR)', ['bcr', 'membrane igm', 'cd79', 'ig alpha', 'ig beta', 'b cell'], { primary: '#e0912f', secondary: '#f6c98e', accent: '#2fa58f' },
    (c) => {
      let s = g(50, 30, 0, 0.62, igg({ primary: c.primary, secondary: c.secondary }, { fcDomains: 2 }));
      s += line(46, 64, 46, 70, dark(c.primary), 2.6) + line(54, 64, 54, 70, dark(c.primary), 2.6);
      s += tm(46, 70, c.primary, { tail: 6, w: 5 }) + tm(54, 70, c.primary, { tail: 6, w: 5 });
      for (const x of [26, 74]) {
        s += line(x, 60, x, 70, dark(c.accent, 0.1), 2.6) + tm(x, 70, c.accent, { tail: 18 }) + domain(x, 54, 7, 9, c.accent);
        s += rect(x - 3.2, 92, 6.4, 5, 1.5, '#f6c945', dark('#f6c945'), 0.8);
      }
      return s;
    }, { w: 100, h: 104, size: 90 }),
  rec('mhc-i', 'MHC class I + peptide', ['mhc', 'mhc i', 'hla', 'hla-a', 'class i', 'b2m', 'antigen presentation', 'pmhc'], { primary: '#8c6bd6', secondary: '#c3b3ef', accent: '#e85d5d' },
    (c) => {
      let s = line(28, 66, 28, 74, dark(c.primary, 0.1), 3) + tm(28, 74, c.primary);
      s += domain(28, 52, 10, 13, shade(c.primary, -0.05));
      s += domain(50, 56, 9, 11, c.secondary);
      s += line(28, 40, 28, 30, dark(c.primary, 0.3), 3);
      s += groove(30, 14, 48, c.primary, shade(c.primary, 0.3), c.accent, 7);
      return s;
    }),
  rec('mhc-ii', 'MHC class II + peptide', ['mhc', 'mhc ii', 'hla-dr', 'class ii', 'antigen presentation', 'cd4', 'pmhc'], { primary: '#2fa58f', secondary: '#7fd3bf', accent: '#e85d5d' },
    (c) => {
      let s = line(20, 60, 20, 70, dark(c.primary, 0.1), 3) + line(40, 60, 40, 70, dark(c.secondary, 0.1), 3);
      s += tm(20, 70, c.primary) + tm(40, 70, c.secondary);
      s += domain(20, 50, 9, 11, c.primary) + domain(40, 50, 9, 11, c.secondary);
      s += line(20, 40, 22, 32, dark(c.primary, 0.3), 3) + line(40, 40, 38, 32, dark(c.secondary, 0.3), 3);
      s += groove(30, 16, 52, c.primary, c.secondary, c.accent, 8);
      return s;
    }),
  rec('pd-1', 'PD-1', ['pd-1', 'pd1', 'pdcd1', 'cd279', 'checkpoint', 'inhibitory receptor', 'exhaustion'], { primary: '#e8724a', secondary: '#f6b49a', accent: '#f6c945' },
    (c) => stalked(20, 6, [[12, 15]], c.primary, { stalk: 24 }), { w: 40, h: 100, size: 40 }),
  rec('pd-l1', 'PD-L1', ['pd-l1', 'pdl1', 'cd274', 'b7-h1', 'checkpoint ligand', 'tumor'], { primary: '#8c6bd6', secondary: '#c3b3ef', accent: '#f6c945' },
    (c) => stalked(20, 4, [[11, 14], [10, 13, shade(c.primary, -0.08)]], c.primary, { stalk: 8 }), { w: 40, h: 100, size: 40 }),
  rec('ctla-4', 'CTLA-4', ['ctla-4', 'ctla4', 'cd152', 'checkpoint', 'inhibitory receptor', 'treg'], { primary: '#d9534f', secondary: '#f3a6a4', accent: '#f6c945' },
    (c) => stalked(14, 10, [[10, 14]], c.primary, { stalk: 22 }) + stalked(36, 10, [[10, 14]], shade(c.primary, 0.12), { stalk: 22 }) + line(15, 44, 35, 44, '#52606d', 1.6),
    { w: 50, h: 100, size: 50 }),
  rec('cd28', 'CD28', ['cd28', 'costimulation', 'signal 2', 'costimulatory receptor'], { primary: '#6abf59', secondary: '#b5e0aa', accent: '#f6c945' },
    (c) => stalked(14, 10, [[10, 14]], c.primary, { stalk: 22 }) + stalked(36, 10, [[10, 14]], shade(c.primary, 0.12), { stalk: 22 }) + line(15, 44, 35, 44, '#52606d', 1.6),
    { w: 50, h: 100, size: 50 }),
  rec('cd80-cd86', 'CD80 / CD86 (B7)', ['cd80', 'cd86', 'b7', 'b7-1', 'b7-2', 'costimulatory ligand', 'apc'], { primary: '#f6c945', secondary: '#fbe39a', accent: '#6abf59' },
    (c) => stalked(20, 4, [[11, 14], [10, 13, shade(c.primary, -0.12)]], c.primary, { stalk: 8 }), { w: 40, h: 100, size: 40 }),
  rec('car', 'Chimeric antigen receptor (CAR)', ['car', 'chimeric antigen receptor', 'scfv', '4-1bb', 'cd28', 'cd3 zeta', 'construct'], { primary: '#3f7fd9', secondary: '#9aa5b1', accent: '#f39a3d' },
    (c) => {
      let s = '';
      s += line(25, 30, 25, 50, dark(c.secondary), 3);
      s += helix(21, 50, 8, 16, c.secondary, { sw: 1.2 });
      s += line(25, 66, 25, 116, dark(c.secondary), 2.4);
      s += domain(25, 76, 8.5, 6.2, '#6abf59');
      for (let i = 0; i < 3; i++) s += domain(25, 91.5 + i * 9.5, 7.5, 4.4, c.accent);
      s += domain(16, 18, 9, 12, c.primary, -12) + domain(34, 18, 9, 12, shade(c.primary, 0.35), 12);
      return s;
    }, { w: 50, h: 120, size: 50 }),
  rec('cd4', 'CD4 co-receptor', ['cd4', 'co-receptor', 'coreceptor', 'helper', 'mhc ii'], { primary: '#6c9be8', secondary: '#b5cdf5', accent: '#f6c945' },
    (c) => stalked(16, 2, [[9, 10], [8.5, 9.5, shade(c.primary, 0.1)], [8.5, 9.5], [8.5, 9.5, shade(c.primary, 0.1)]], c.primary, { stalk: 4 }), { w: 32, h: 120, size: 32 }),
  rec('cd8', 'CD8 co-receptor', ['cd8', 'cd8a', 'cd8b', 'co-receptor', 'cytotoxic', 'mhc i'], { primary: '#46b9a8', secondary: '#9fe0d6', accent: '#f6c945' },
    (c) => stalked(14, 4, [[9, 11]], c.primary, { stalk: 34 }) + stalked(34, 4, [[9, 11]], c.secondary, { stalk: 34 }), { w: 48, h: 100, size: 48 }),
  rec('fc-receptor', 'Fc receptor', ['fcr', 'fcgr', 'fc gamma', 'cd16', 'cd32', 'cd64', 'fc receptor', 'adcc'], { primary: '#c97bb8', secondary: '#e8bde0', accent: '#f6c945' },
    (c) => {
      let s = line(28, 54, 28, 62, dark(c.primary, 0.1), 3) + tm(28, 62, c.primary);
      s += domain(26, 44, 10, 12, c.primary, 15) + domain(18, 22, 10, 12, shade(c.primary, 0.15), -15);
      return s;
    }, { w: 44, h: 100, size: 44 }),
  rec('cytokine-receptor', 'Cytokine receptor', ['cytokine receptor', 'il-2r', 'il receptor', 'ifnar', 'jak', 'stat', 'receptor'], { primary: '#f39a3d', secondary: '#f8c48f', accent: '#5b6bd6' },
    (c) => {
      let s = '';
      s += line(20, 52, 20, 62, dark(c.primary, 0.1), 3) + line(44, 52, 44, 62, dark(c.secondary, 0.1), 3);
      s += tm(20, 62, c.primary, { tail: 18 }) + tm(44, 62, c.secondary, { tail: 18 });
      s += domain(20, 42, 10, 11, c.primary) + domain(20, 20, 10, 11, shade(c.primary, 0.15));
      s += domain(44, 42, 10, 11, c.secondary) + domain(44, 20, 10, 11, shade(c.secondary, 0.1));
      s += domain(13, 90, 7.5, 5.5, c.accent, -20) + domain(51, 90, 7.5, 5.5, c.accent, 20);
      return s;
    }, { w: 64, h: 100, size: 60 }),
  rec('tlr', 'Toll-like receptor (TLR)', ['tlr', 'toll', 'pattern recognition', 'prr', 'pamp', 'innate', 'tlr4'], { primary: '#5b6bd6', secondary: '#a7b0ef', accent: '#e85d5d' },
    (c) => {
      const arc = 'M14 40 C 4 14, 46 2, 48 30';
      let s = `<path d="${arc}" fill="none" stroke="${dark(c.primary, 0.4)}" stroke-width="16" stroke-linecap="round"/>`;
      s += `<path d="${arc}" fill="none" stroke="${c.primary}" stroke-width="13" stroke-linecap="round"/>`;
      // leucine-rich repeats: rungs across the solenoid, lit on the outside
      s += `<path d="${arc}" fill="none" stroke="${dark(c.primary, 0.25)}" stroke-width="13" stroke-dasharray="1.2 2.8" opacity="0.55"/>`;
      s += `<path d="M10.5 36 C 2 12, 46 -1, 51.5 28" fill="none" stroke="${light(c.primary, 0.45)}" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>`;
      s += `<path d="${arc}" fill="none" stroke="${c.secondary}" stroke-width="2.4" stroke-dasharray="1.6 2.4" stroke-linecap="round" transform="translate(1.5 2)"/>`;
      s += line(14, 44, 14, 60, dark(c.primary, 0.35), 3.6) + line(14, 44, 14, 60, c.primary, 2) + tm(14, 60, c.primary, { tail: 8 });
      s += domain(14, 92, 10, 7, c.secondary);
      return s;
    }, { w: 60, h: 100, size: 56 }),
  rec('gpcr', 'GPCR / chemokine receptor', ['gpcr', 'chemokine receptor', 'ccr7', 'cxcr4', 'seven transmembrane', '7tm', 'g protein'], { primary: '#2fa58f', secondary: '#f3c27a', accent: '#e8724a' },
    (c) => {
      let s = `<rect x="0" y="30" width="120" height="30" fill="${light(c.secondary, 0.55)}"/>` + membraneStrip(0, 120, 45, 30, c.secondary, dark(c.secondary, 0.25));
      const xs = [16, 30, 44, 58, 72, 86, 100];
      for (let i = 0; i < xs.length - 1; i++) {
        const top = i % 2 === 0;
        const x0 = xs[i], x1 = xs[i + 1];
        s += `<path d="M${x0} ${top ? 26 : 64} Q${(x0 + x1) / 2} ${top ? 10 : 80} ${x1} ${top ? 26 : 64}" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="3.6"/><path d="M${x0} ${top ? 26 : 64} Q${(x0 + x1) / 2} ${top ? 10 : 80} ${x1} ${top ? 26 : 64}" fill="none" stroke="${light(c.primary, 0.15)}" stroke-width="1.8"/>`;
      }
      s += `<path d="M16 26 Q12 14 6 10" fill="none" stroke="${dark(c.primary, 0.1)}" stroke-width="3"/><path d="M100 64 Q104 76 112 80" fill="none" stroke="${dark(c.primary, 0.1)}" stroke-width="3"/>`;
      xs.forEach((x, i) => { s += helix(x - 5.5, 24, 11, 42, i % 2 ? shade(c.primary, 0.15) : c.primary, { turns: 5, sw: 1.3 }); });
      return s;
    }, { w: 120, h: 86, size: 110 }),
  rec('transmembrane-receptor', 'Receptor (generic)', ['receptor', 'transmembrane', 'surface protein', 'marker', 'cd'], { primary: '#4a8fe7', secondary: '#9cc4f3', accent: '#f6c945' },
    (c) => stalked(20, 4, [[13, 16], [10, 12, shade(c.primary, 0.12)]], c.primary, { stalk: 8 }), { w: 40, h: 100, size: 40 }),
  rec('membrane-segment', 'Membrane segment', ['membrane', 'lipid bilayer', 'plasma membrane', 'phospholipid'], { primary: '#f3c27a', secondary: '#c98a4b' },
    (c) => membraneStrip(0, 160, 15, 30, c.primary, c.secondary), { w: 160, h: 30, size: 160, roles: { primary: 'Heads', secondary: 'Tails' } }),
];

// Where each receptor crosses the membrane (viewBox y), used by the "attach" op.
const MEMBRANE_Y = {
  tcr: 72, 'tcr-cd3': 72, bcr: 78, 'mhc-i': 82, 'mhc-ii': 78, 'pd-1': 66, 'pd-l1': 70, 'ctla-4': 66, cd28: 66,
  'cd80-cd86': 70, car: 58, cd4: 83, cd8: 66, 'fc-receptor': 70, 'cytokine-receptor': 70, tlr: 68, gpcr: 45,
  'transmembrane-receptor': 72, 'membrane-segment': 15,
};
for (const r of receptors) r.anchor = [(r.w || 100) / 2, MEMBRANE_Y[r.id] ?? (r.h || 100) * 0.72];

// ---- Soluble molecules ---------------------------------------------------------

function mol(id, name, tags, colors, draw, extra = {}) {
  return { id, name, category: 'Molecules', tags, colors, roles: { primary: 'Main', secondary: 'Secondary', accent: 'Accent' }, draw, size: 50, shape: 'ellipse', ...extra };
}

export const molecules = [
  mol('cytokine', 'Cytokine', ['cytokine', 'interleukin', 'il-2', 'ifn-gamma', 'tnf', 'il-6', 'signal 3', 'four helix bundle'], { primary: '#f39a3d', secondary: '#f8c48f' },
    (c) => {
      // four-helix bundle with connecting loops
      let s = `<path d="M34 12 Q48 2 60 10 M30 82 Q16 92 22 74 M62 84 Q76 92 72 72" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="3.4" stroke-linecap="round"/>`;
      s += `<path d="M34 12 Q48 2 60 10 M30 82 Q16 92 22 74 M62 84 Q76 92 72 72" fill="none" stroke="${c.secondary}" stroke-width="1.8" stroke-linecap="round"/>`;
      [[34, 30, -20, c.primary], [62, 64, -15, shade(c.primary, 0.12)], [60, 28, 15, shade(c.primary, -0.06)], [30, 62, 15, shade(c.primary, 0.06)]].forEach(([x, y, r, col]) => {
        s += helix(x - 11, y - 20, 22, 40, col, { rot: r, sw: 1.8, turns: 5 });
      });
      return s;
    }),
  mol('cytokines', 'Cytokines (secreted)', ['cytokines', 'secretion', 'chemokines', 'soluble factors', 'cytokine release'], { primary: '#f39a3d', secondary: '#e85d5d' },
    (c, u) => {
      const a = sphere(u, 'a', c.primary), b = sphere(u, 'b', c.secondary);
      let s = defs(a, b);
      [[22, 30, 9, 'a'], [52, 18, 7, 'b'], [76, 36, 9, 'a'], [40, 54, 8, 'b'], [70, 70, 7, 'a'], [20, 76, 7, 'b'], [86, 84, 5, 'b'], [54, 86, 6, 'a']]
        .forEach(([x, y, r, k], i) => {
          const col = k === 'a' ? c.primary : c.secondary;
          const d = blob(x, y, r, r * 0.9, { n: 6, wobble: 0.16, seed: i + 3 });
          s += path(d, k === 'a' ? a.url : b.url, dark(col, 0.4), 1.2) + gloss(x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.2, 0.55, -25);
        });
      // motion trails: these are on their way out
      s += `<g stroke="${dark(c.primary, 0.1)}" stroke-width="1.2" stroke-linecap="round" opacity="0.45" fill="none"><path d="M8 38 q-4 -6 -6 -10 M40 10 q-3 -4 -6 -6 M64 30 q2 -6 0 -10"/></g>`;
      return s;
    }, { size: 70 }),
  mol('chemokine', 'Chemokine', ['chemokine', 'ccl', 'cxcl', 'ccl19', 'ccl21', 'cxcl12', 'migration', 'gradient'], { primary: '#c95fc0', secondary: '#e8b0e2' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      const d = blob(50, 52, 34, 30, { n: 7, wobble: 0.18, seed: 21 });
      let s = defs(gr) + path(d, gr.url) + rim(u, 'r', d, c.primary, { op: 0.3 });
      // three-stranded β-sheet and the C-terminal helix lying across it
      for (let i = 0; i < 3; i++) s += `<path d="M${30 + i * 2} ${62 - i * 9} q14 -8 30 2" fill="none" stroke="${c.secondary}" stroke-width="4.2" stroke-linecap="round" opacity="0.85"/><path d="M${57 + i * 2} ${61 - i * 9} l4 1.2 -3 3" fill="${c.secondary}" opacity="0.85"/>`;
      s += helix(54, 36, 9, 30, light(c.primary, 0.15), { rot: 60, sw: 1.2, turns: 4 });
      // the flexible N-terminus that triggers the receptor
      s += `<path d="M24 26 q6 -12 14 -6 q4 3 8 -4" fill="none" stroke="${dark(c.primary, 0.4)}" stroke-width="3.4" stroke-linecap="round"/><path d="M24 26 q6 -12 14 -6 q4 3 8 -4" fill="none" stroke="${c.secondary}" stroke-width="1.6" stroke-linecap="round"/>`;
      return s + `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>` + gloss(36, 34, 8, 4, 0.45);
    }),
  mol('antigen', 'Antigen', ['antigen', 'epitope', 'immunogen', 'target', 'protein antigen'], { primary: '#e85d5d', secondary: '#f6c945' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      const d = blob(50, 50, 40, 36, { n: 9, wobble: 0.2, seed: 33 });
      let s = defs(gr) + path(d, gr.url);
      // surface texture: shallow bumps
      [[60, 30, 8], [30, 56, 9], [64, 64, 7], [44, 40, 6]].forEach(([x, y, r], i) => { s += path(blob(x, y, r, r * 0.8, { n: 6, wobble: 0.2, seed: i + 7 }), dark(c.primary, 0.1), 'none', 0, ' opacity="0.35"'); });
      s += rim(u, 'r', d, c.primary, { op: 0.3 });
      s += `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>`;
      // epitopes: raised patches with a glint
      [[32, 30, 7], [72, 44, 6], [46, 74, 6.5]].forEach(([x, y, r]) => {
        s += circle(x, y, r, c.secondary, dark(c.secondary, 0.42), 1.3) + circle(x + r * 0.15, y + r * 0.2, r * 0.6, dark(c.secondary, 0.1), 'none', 0, ' opacity="0.4"') + circle(x - r * 0.3, y - r * 0.32, r * 0.3, '#fff', 'none', 0, ' opacity="0.65"');
      });
      return s + gloss(34, 26, 9, 4.5, 0.4);
    }, { roles: { primary: 'Antigen', secondary: 'Epitopes' } }),
  mol('peptide', 'Peptide', ['peptide', 'epitope', 'neoantigen', 'amino acids', 'antigen peptide'], { primary: '#e85d5d', secondary: '#f6a3a3' },
    (c) => {
      let s = '';
      const pts = Array.from({ length: 9 }, (_, i) => [10 + i * 10, 20 + Math.sin(i * 1.1) * 6]);
      // side chains, backbone, then residues
      pts.forEach(([x, y], i) => { if (i % 2 === 0) s += line(x, y, x + 2, y - 9, dark(c.primary, 0.25), 1.4) + circle(x + 2, y - 10, 1.8, dark(c.secondary, 0.1), dark(c.primary, 0.35), 0.6); else s += line(x, y, x - 1, y + 9, dark(c.primary, 0.25), 1.4) + circle(x - 1, y + 10, 1.8, dark(c.secondary, 0.1), dark(c.primary, 0.35), 0.6); });
      s += `<path d="${smoothOpen(pts)}" fill="none" stroke="${dark(c.primary, 0.4)}" stroke-width="2.4"/>`;
      pts.forEach(([x, y], i) => {
        const col = i % 2 ? c.secondary : c.primary;
        s += circle(x, y, 5.2, col, dark(col, 0.42), 1.2) + circle(x + 0.6, y + 0.8, 3.6, dark(col, 0.08), 'none', 0, ' opacity="0.35"') + circle(x - 1.7, y - 1.8, 1.6, '#fff', 'none', 0, ' opacity="0.7"');
      });
      return s;
    }, { w: 100, h: 40, size: 80, shape: 'rect' }),
  mol('protein', 'Protein (generic)', ['protein', 'enzyme', 'globular', 'factor', 'molecule'], { primary: '#5b6bd6', secondary: '#a7b0ef' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      const d = blob(50, 50, 40, 38, { n: 8, wobble: 0.14, seed: 8 });
      let s = defs(gr) + path(d, gr.url);
      // a second domain and a few secondary-structure hints
      s += path(blob(60, 58, 16, 14, { n: 6, wobble: 0.2, seed: 2 }), c.secondary, dark(c.primary, 0.2), 1, ' opacity="0.6"');
      s += helix(26, 30, 9, 26, light(c.primary, 0.15), { rot: -35, sw: 1, turns: 4 });
      s += `<path d="M48 26 q10 -4 18 4" fill="none" stroke="${c.secondary}" stroke-width="4" stroke-linecap="round" opacity="0.8"/><path d="M50 34 q10 -4 18 4" fill="none" stroke="${c.secondary}" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`;
      s += rim(u, 'r', d, c.primary, { op: 0.3 });
      return s + `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>` + gloss(34, 28, 9, 4.5, 0.45);
    }),
  mol('enzyme', 'Enzyme', ['enzyme', 'catalysis', 'kinase', 'protease', 'active site'], { primary: '#2fa58f', secondary: '#9be0cf' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      const d = 'M50 50 L90 30 A44 44 0 1 0 90 70 Z';
      let s = defs(gr) + path(d, gr.url);
      // active-site cleft shading and catalytic residues
      s += `<path d="M50 50 L90 30 L84 38 Z M50 50 L90 70 L84 62 Z" fill="${dark(c.primary, 0.3)}" opacity="0.5"/>`;
      s += circle(56, 50, 3.2, c.secondary, dark(c.primary, 0.4), 1) + circle(66, 44, 2.4, c.secondary, dark(c.primary, 0.4), 1) + circle(66, 56, 2.4, c.secondary, dark(c.primary, 0.4), 1);
      s += helix(18, 34, 9, 30, light(c.primary, 0.15), { rot: 10, sw: 1, turns: 4 });
      s += rim(u, 'r', d, c.primary, { op: 0.28 });
      return s + `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2" stroke-linejoin="round"/>` + gloss(30, 22, 10, 4.5, 0.45);
    }),
  mol('small-molecule', 'Small molecule / drug', ['small molecule', 'drug', 'compound', 'inhibitor', 'chemical', 'ligand'], { primary: '#52606d', secondary: '#e85d5d' },
    (c) => {
      const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i + Math.PI / 6; return `${i ? 'L' : 'M'}${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`; }).join(' ') + 'Z';
      const atom = (x, y, col) => circle(x, y, 4.8, col, dark(col, 0.4), 1) + circle(x - 1.5, y - 1.6, 1.5, '#fff', 'none', 0, ' opacity="0.7"');
      let s = `<path d="${hex(36, 50, 18)}" fill="${light(c.primary, 0.85)}" stroke="${c.primary}" stroke-width="3.4" stroke-linejoin="round"/>`
        + `<path d="${hex(67.2, 50, 18)}" fill="${light(c.primary, 0.85)}" stroke="${c.primary}" stroke-width="3.4" stroke-linejoin="round"/>`;
      // aromatic double bonds
      s += `<g stroke="${c.primary}" stroke-width="2" stroke-linecap="round"><path d="M26 41 L36 35.5 M24.6 57 L24.6 46 M46 59 L36 64.5 M71 36 L80 41.5 M82 56 L73 61.4"/></g>`;
      s += line(82.8, 41, 92, 35, c.primary, 3.4) + atom(95, 33, c.secondary) + line(20.4, 59, 11, 65, c.primary, 3.4) + atom(8, 67, c.secondary);
      s += line(36, 32, 36, 22, c.primary, 3.4) + atom(36, 19, '#4a8fe7');
      return s;
    }, { shape: 'rect' }),
  mol('granzyme-perforin', 'Perforin pore + granzymes', ['perforin', 'granzyme', 'cytotoxicity', 'killing', 'pore', 'lysis', 'ctl', 'nk'], { primary: '#c95fc0', secondary: '#e85d5d', accent: '#f3c27a' },
    (c) => {
      let s = membraneStrip(0, 38, 40, 26, c.accent, dark(c.accent, 0.25)) + membraneStrip(62, 100, 40, 26, c.accent, dark(c.accent, 0.25));
      // perforin β-barrel walls lining the pore
      for (const x of [34, 41, 59, 66]) s += helix(x - 4, 22, 8, 36, x < 50 ? c.primary : shade(c.primary, 0.12), { sw: 1.2, turns: 5 });
      // granzymes passing through
      [[50, 10, 5.2], [38, 4, 4], [62, 6, 4.4], [50, 66, 4.8], [43, 78, 3.8]].forEach(([x, y, r], i) => {
        s += path(blob(x, y, r, r * 0.9, { n: 6, wobble: 0.15, seed: i + 2 }), c.secondary, dark(c.secondary, 0.42), 1.1) + circle(x - r * 0.3, y - r * 0.32, r * 0.3, '#fff', 'none', 0, ' opacity="0.6"');
      });
      s += `<path d="M50 18 v40" stroke="${dark(c.secondary, 0.2)}" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.6"/>`;
      return s;
    }, { w: 100, h: 86, size: 90, shape: 'rect' }),
  mol('cytotoxic-granule', 'Cytotoxic granule', ['granule', 'lytic granule', 'granzyme', 'perforin', 'vesicle', 'secretory'], { primary: '#f6d2f0', secondary: '#c95fc0', accent: '#e85d5d' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary, { hi: 0.3 });
      const d = blob(50, 50, 40, 40, { n: 12, wobble: 0.02, seed: 4 });
      let s = defs(gr) + path(d, gr.url);
      // dense core and loaded granzymes / perforin
      s += path(blob(50, 52, 16, 15, { n: 8, wobble: 0.12, seed: 5 }), dark(c.secondary, 0.1), dark(c.secondary, 0.4), 1.2) + gloss(45, 46, 5, 3, 0.4);
      ring(50, 50, 27, 27, 9, 0.4).forEach((p, i) => {
        const col = i % 3 === 0 ? c.secondary : c.accent;
        s += path(blob(p.x, p.y, 5, 4.4, { n: 6, wobble: 0.18, seed: i + 9 }), col, dark(col, 0.42), 1) + circle(p.x - 1.5, p.y - 1.6, 1.4, '#fff', 'none', 0, ' opacity="0.6"');
      });
      s += rim(u, 'r', d, c.secondary, { op: 0.25, from: 0.75 });
      // a lipid bilayer for the granule membrane
      s += `<path d="${d}" fill="none" stroke="${dark(c.secondary, 0.25)}" stroke-width="4"/><path d="${d}" fill="none" stroke="${c.primary}" stroke-width="1.6" stroke-dasharray="1.2 1.6"/>`;
      return s + gloss(32, 26, 10, 5, 0.5);
    }),
  mol('lipid-nanoparticle', 'Lipid nanoparticle', ['lnp', 'nanoparticle', 'liposome', 'mrna vaccine', 'delivery', 'vesicle'], { primary: '#f3c27a', secondary: '#e85d5d', accent: '#c98a4b' },
    (c, u) => {
      const core = sphere(u, 'c', light(c.primary, 0.6), { hi: 0.3 });
      let s = defs(core) + circle(50, 50, 34, core.url);
      // ionizable-lipid core with mRNA strands
      s += `<path d="M28 48 q8 -14 16 0 t16 0 t14 -4" fill="none" stroke="${dark(c.secondary, 0.3)}" stroke-width="4.4" stroke-linecap="round"/><path d="M28 48 q8 -14 16 0 t16 0 t14 -4" fill="none" stroke="${c.secondary}" stroke-width="2.6" stroke-linecap="round"/>`;
      s += `<path d="M28 60 q8 -10 16 0 t16 0" fill="none" stroke="${dark(c.secondary, 0.3)}" stroke-width="4.4" stroke-linecap="round"/><path d="M28 60 q8 -10 16 0 t16 0" fill="none" stroke="${c.secondary}" stroke-width="2.6" stroke-linecap="round"/>`;
      s += `<path d="M36 34 q6 -6 14 0" fill="none" stroke="${c.secondary}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
      // lipid shell: tails inward, shaded heads outside, a few PEG chains
      let tails = '', heads = '', hi = '';
      ring(50, 50, 40, 40, 32).forEach((p) => {
        tails += `M${n(p.x)} ${n(p.y)} L${n(50 + Math.cos(p.a) * 31)} ${n(50 + Math.sin(p.a) * 31)} `;
        heads += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="4.2"/>`;
        hi += `<circle cx="${n(p.x - 1.3)}" cy="${n(p.y - 1.4)}" r="1.3"/>`;
      });
      s += `<path d="${tails}" stroke="${c.accent}" stroke-width="1.6"/>`;
      ring(50, 50, 44, 44, 6, 0.3).forEach((p) => { s += `<path d="M${n(p.x)} ${n(p.y)} q${n(Math.cos(p.a) * 4 - 2)} ${n(Math.sin(p.a) * 4 + 2)} ${n(Math.cos(p.a) * 7)} ${n(Math.sin(p.a) * 7)}" fill="none" stroke="#9aa5b1" stroke-width="1.2" stroke-linecap="round"/>`; });
      s += `<g fill="${c.primary}" stroke="${dark(c.primary, 0.35)}" stroke-width="0.8">${heads}</g><g fill="#fff" opacity="0.6">${hi}</g>`;
      return s;
    }, { roles: { primary: 'Lipid heads', secondary: 'Cargo (mRNA)', accent: 'Lipid tails' } }),
];
