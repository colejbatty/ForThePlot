// Small molecules (ball-and-stick), drug-delivery systems, and structural / motor proteins.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, rng, smooth, smoothOpen, blob, ring, speckle, domain, helix, membraneStrip, linear } from './kit.js';
import { lipid } from './cellkit.js';

const ATOM_ROLES = { primary: 'Carbon', secondary: 'Oxygen', accent: 'Nitrogen' };
const R3 = { primary: 'Main', secondary: 'Secondary', accent: 'Accent' };
const mo = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Molecules', tags, colors, roles: ATOM_ROLES, draw, size: 70, shape: 'ellipse', ...extra });
const dr = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Drugs & delivery', tags, colors, roles: R3, draw, size: 80, shape: 'ellipse', ...extra });
const pr = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Proteins', tags, colors, roles: R3, draw, size: 90, ...extra });
const CPK = { C: '#5f6b7a', O: '#e8504a', N: '#4a7fe8' };
const ATOMS = { primary: CPK.C, secondary: CPK.O, accent: CPK.N };

/**
 * Ball-and-stick molecule. atoms: [x, y, element, r?]; bonds: [i, j, order].
 * C/O/N follow the icon's colour roles; H, P, S are fixed.
 */
function ballStick(c, u, atoms, bonds, { scale = 1 } = {}) {
  const col = { C: c.primary, O: c.secondary, N: c.accent, H: '#eef1f5', P: '#f39a3d', S: '#f2c94c', F: '#7fd36b', Cl: '#5fcf6b' };
  const rad = { C: 6, O: 6, N: 6, H: 3.8, P: 7, S: 7, F: 5, Cl: 6.4 };
  const used = [...new Set(atoms.map((a) => a[2]))];
  const grads = Object.fromEntries(used.map((el) => [el, sphere(u, `a${el}`, col[el], { hi: 0.6, lo: -0.15 })]));
  let s = defs(...used.map((el) => grads[el]));
  let b1 = '', b2 = '';
  bonds.forEach(([i, j, o = 1]) => {
    const [x0, y0] = atoms[i], [x1, y1] = atoms[j];
    const L = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    const offs = o === 2 ? [-1.8, 1.8] : o === 3 ? [-2.6, 0, 2.6] : [0];
    offs.forEach((k) => { const d = `M${n(x0 + nx * k * scale)} ${n(y0 + ny * k * scale)} L${n(x1 + nx * k * scale)} ${n(y1 + ny * k * scale)} `; b1 += d; b2 += d; });
  });
  s += `<path d="${b1}" stroke="#4a5563" stroke-width="${n((o2(bonds) ? 2.6 : 3.4) * scale)}" stroke-linecap="round"/><path d="${b2}" stroke="#c9d1db" stroke-width="${n((o2(bonds) ? 1.1 : 1.6) * scale)}" stroke-linecap="round"/>`;
  [...atoms].map((a, i) => [a, i]).sort((p, q) => p[0][1] - q[0][1]).forEach(([[x, y, el, r]]) => {
    const rr = (r || rad[el]) * scale;
    s += circle(x, y, rr, grads[el].url, dark(col[el], 0.45), n(0.8 * scale)) + circle(x - rr * 0.32, y - rr * 0.36, rr * 0.28, '#fff', 'none', 0, ' opacity="0.7"');
  });
  return s;
}
const o2 = (bonds) => bonds.some((b) => (b[2] || 1) > 1);

/** Polygon ring vertices. */
const ringPts = (cx, cy, r, k, rot = -90, sy = 1) => Array.from({ length: k }, (_, i) => { const a = ((rot + (360 * i) / k) * Math.PI) / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy]; });

/** A thick, shaded skeletal ring (for cholesterol / adenine glyphs). */
function ringGlyph(pts, fill, edge) {
  const d = `M${pts.map((p) => p.map(n).join(' ')).join(' L')}Z`;
  return path(d, fill, edge, 2.6) + `<path d="${d}" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.45" transform="translate(-0.6 -0.8)"/>`;
}

/** Phospholipid glyph: head, glycerol neck and two tails (one kinked). */
export function phospholipid(x, y, s, head, tail, rot = 0) {
  const t1 = `M${-s * 0.18} ${s * 0.3} V${s * 1.5}`, t2 = `M${s * 0.18} ${s * 0.3} V${s * 0.9} L${s * 0.34} ${s * 1.15} V${s * 1.5}`;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})"><path d="${t1} ${t2}" fill="none" stroke="${dark(tail, 0.35)}" stroke-width="${n(s * 0.2)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${t1} ${t2}" fill="none" stroke="${tail}" stroke-width="${n(s * 0.11)}" stroke-linecap="round" stroke-linejoin="round"/>${circle(0, 0, s * 0.42, head, dark(head, 0.4), n(s * 0.06))}${circle(-s * 0.13, -s * 0.14, s * 0.13, '#fff', 'none', 0, ' opacity="0.65"')}</g>`;
}

/** Amino-acid-chain beads along a path of points. */
function chain(pts, c, r = 3.2) {
  let s = `<path d="${smoothOpen(pts)}" fill="none" stroke="${dark(c, 0.4)}" stroke-width="${n(r * 0.5)}"/>`;
  pts.forEach(([x, y]) => { s += circle(x, y, r, c, dark(c, 0.4), n(r * 0.18)) + circle(x - r * 0.3, y - r * 0.32, r * 0.32, '#fff', 'none', 0, ' opacity="0.6"'); });
  return s;
}

/** Twisted strands (collagen, amyloid, coiled coils). */
function strands(cols, { x0 = 4, x1 = 116, y = 30, amp = 9, turns = 2.5, w = 5 } = {}) {
  let s = '';
  const k = cols.length;
  const layers = [];
  cols.forEach((col, j) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([x0 + t * (x1 - x0), y + Math.sin(t * Math.PI * 2 * turns + (j * 2 * Math.PI) / k) * amp]); }
    layers.push({ col, d: smoothOpen(pts) });
  });
  layers.forEach(({ col, d }) => { s += `<path d="${d}" fill="none" stroke="${dark(col, 0.42)}" stroke-width="${w + 2}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="${n(w * 0.25)}" stroke-linecap="round" opacity="0.5" transform="translate(0 -${n(w * 0.25)})"/>`; });
  return s;
}

export const molecules2 = [
  // ---- small molecules -------------------------------------------------------------------------
  mo('glucose', 'Glucose', ['glucose', 'sugar', 'hexose', 'carbohydrate', 'glycolysis', 'monosaccharide'], ATOMS,
    (c, u) => {
      const P = (deg) => [50 + Math.cos((deg * Math.PI) / 180) * 26, 50 + Math.sin((deg * Math.PI) / 180) * 12];
      const A = [[...P(-60), 'O'], [...P(0), 'C'], [...P(60), 'C'], [...P(120), 'C'], [...P(180), 'C'], [...P(-120), 'C']];
      const sub = [[1, 0, 18, 'O'], [2, 0, 18, 'O'], [3, 0, -18, 'O'], [4, 0, 18, 'O'], [5, 0, -16, 'C']];
      const atoms = [...A], bonds = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]];
      sub.forEach(([i, dx, dy, el]) => { atoms.push([A[i][0] + dx, A[i][1] + dy, el]); bonds.push([i, atoms.length - 1]); });
      atoms.push([atoms[10][0] + 12, atoms[10][1] - 8, 'O']); bonds.push([10, atoms.length - 1]);
      [6, 7, 8, 9, 11].forEach((i) => { const [x, y] = atoms[i]; atoms.push([x + 7, y + (y > 50 ? 4 : -4), 'H']); bonds.push([i, atoms.length - 1]); });
      return ballStick(c, u, atoms, bonds);
    }),
  mo('atp', 'ATP', ['atp', 'adenosine triphosphate', 'energy', 'nucleotide', 'phosphate', 'adp'], { primary: '#5f6b7a', secondary: '#e8504a', accent: '#4a7fe8' },
    (c, u) => {
      // adenine (fused rings), ribose, and a chain of three phosphates
      const hex = ringPts(20, 30, 10, 6, -90), pent = ringPts(36, 33, 8.4, 5, 162);
      let s = ringGlyph(hex, light(c.accent, 0.45), dark(c.accent, 0.3)) + ringGlyph(pent, light(c.accent, 0.35), dark(c.accent, 0.3));
      const rib = ringPts(52, 46, 9, 5, -90);
      s += line(42, 37, 46, 42, '#4a5563', 2.6) + ringGlyph(rib, light(c.primary, 0.55), dark(c.primary, 0.2)) + circle(rib[0][0], rib[0][1], 3, c.secondary, dark(c.secondary, 0.4), 0.8);
      s += line(60, 42, 72, 38, '#4a5563', 2.6) + line(72, 38, 112, 38, '#4a5563', 2.6);
      [[76, 38], [90, 38], [104, 38]].forEach(([x, y], i) => {
        const g = sphere(u, `p${i}`, '#f39a3d', { hi: 0.55 });
        s += line(x, y - 12, x, y + 12, '#4a5563', 2.4) + circle(x, y - 13, 3.4, c.secondary, dark(c.secondary, 0.4), 0.8) + circle(x, y + 13, 3.4, c.secondary, dark(c.secondary, 0.4), 0.8);
        s += defs(g) + circle(x, y, 6.6, g.url, dark('#f39a3d', 0.45), 1) + `<text x="${x}" y="${y + 2.6}" font-size="7.4" font-family="Arial" font-weight="700" text-anchor="middle" fill="#fff">P</text>`;
      });
      return `<g transform="translate(0 -7)">${s}${circle(114, 38, 3.4, c.secondary, dark(c.secondary, 0.4), 0.8)}</g>`;
    }, { w: 120, h: 56, size: 100, shape: 'rect', roles: { primary: 'Ribose', secondary: 'Oxygen', accent: 'Adenine' } }),
  mo('water', 'Water molecule', ['water', 'h2o', 'solvent', 'hydration'], ATOMS,
    (c, u) => ballStick(c, u, [[50, 46, 'O', 16], [26, 64, 'H', 10], [74, 64, 'H', 10]], [[0, 1], [0, 2]], { scale: 1.3 })),
  mo('oxygen', 'Oxygen (O₂)', ['oxygen', 'o2', 'gas', 'respiration', 'hypoxia'], ATOMS,
    (c, u) => ballStick(c, u, [[34, 50, 'O', 15], [66, 50, 'O', 15]], [[0, 1, 2]], { scale: 1.4 })),
  mo('carbon-dioxide', 'Carbon dioxide (CO₂)', ['carbon dioxide', 'co2', 'gas', 'respiration'], ATOMS,
    (c, u) => ballStick(c, u, [[50, 50, 'C', 13], [22, 50, 'O', 13], [78, 50, 'O', 13]], [[0, 1, 2], [0, 2, 2]], { scale: 1.3 })),
  mo('amino-acid', 'Amino acid', ['amino acid', 'residue', 'alanine', 'peptide building block', 'protein'], ATOMS,
    (c, u) => ballStick(c, u, [[22, 52, 'N'], [44, 46, 'C'], [66, 52, 'C'], [70, 72, 'O'], [84, 40, 'O'], [44, 24, 'C'], [12, 40, 'H'], [14, 64, 'H'], [52, 60, 'H'], [94, 46, 'H'], [36, 16, 'H'], [52, 14, 'H'], [34, 30, 'H']],
      [[0, 1], [1, 2], [2, 3, 2], [2, 4], [1, 5], [0, 6], [0, 7], [1, 8], [4, 9], [5, 10], [5, 11], [5, 12]])),
  mo('fatty-acid', 'Fatty acid', ['fatty acid', 'lipid', 'palmitate', 'carboxylic acid', 'saturated'], ATOMS,
    (c, u) => {
      const atoms = [], bonds = [];
      for (let i = 0; i < 9; i++) { atoms.push([10 + i * 11, i % 2 ? 40 : 30, 'C']); if (i) bonds.push([i - 1, i]); }
      atoms.push([108, 22, 'O']); bonds.push([8, 9, 2]); atoms.push([112, 44, 'O']); bonds.push([8, 10]);
      return ballStick(c, u, atoms, bonds);
    }, { w: 120, h: 60, size: 110, shape: 'rect' }),
  mo('phospholipid', 'Phospholipid', ['phospholipid', 'lipid', 'phosphatidylcholine', 'amphipathic', 'membrane lipid'], { primary: '#f3c27a', secondary: '#c98a4b', accent: '#4a7fe8' },
    (c) => phospholipid(50, 22, 38, c.primary, c.secondary), { roles: { primary: 'Polar head', secondary: 'Fatty acid tails', accent: 'Accent' } }),
  mo('cholesterol', 'Cholesterol', ['cholesterol', 'sterol', 'steroid', 'lipid', 'ldl', 'membrane'], { primary: '#f2d16b', secondary: '#e8504a', accent: '#c48a1a' },
    (c) => {
      const h1 = ringPts(22, 52, 10, 6, -30), h2 = ringPts(39.3, 42, 10, 6, -30), h3 = ringPts(56.6, 52, 10, 6, -30), p = ringPts(72, 43, 8.6, 5, 198);
      let s = [h1, h2, h3].map((r) => ringGlyph(r, light(c.primary, 0.3), dark(c.accent, 0.25))).join('') + ringGlyph(p, light(c.primary, 0.3), dark(c.accent, 0.25));
      s += `<path d="M80 38 L90 32 L98 38 L108 32 L114 38" fill="none" stroke="${dark(c.accent, 0.25)}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += line(13.3, 57, 6, 62, dark(c.accent, 0.25), 2.6) + circle(6, 63, 4.6, c.secondary, dark(c.secondary, 0.42), 1) + circle(4.6, 61.6, 1.4, '#fff', 'none', 0, ' opacity="0.7"');
      return `<g transform="translate(-2 -17)">${s}</g>`;
    }, { w: 120, h: 56, size: 110, shape: 'rect', roles: { primary: 'Steroid rings', secondary: 'Hydroxyl', accent: 'Bonds' } }),
  mo('ions', 'Ions (Na⁺, K⁺, Cl⁻, Ca²⁺)', ['ions', 'sodium', 'potassium', 'chloride', 'calcium', 'electrolytes', 'na+', 'k+'], { primary: '#8e7cc3', secondary: '#5aa7e6', accent: '#7fd36b' },
    (c, u) => [[30, 32, 13, c.primary, 'K⁺'], [70, 30, 10, c.secondary, 'Na⁺'], [32, 72, 14, c.accent, 'Cl⁻'], [72, 70, 11, '#f2c94c', 'Ca²⁺']].map(([x, y, r, col, t], i) => {
      const g = sphere(u, `i${i}`, col, { hi: 0.55 });
      return defs(g) + circle(x, y, r, g.url, dark(col, 0.42), 1.2) + `<text x="${x}" y="${y + 3.4}" font-size="${n(r * 0.75)}" font-family="Arial" font-weight="700" text-anchor="middle" fill="#fff" stroke="${dark(col, 0.4)}" stroke-width="0.4">${t}</text>`;
    }).join(''), { roles: { primary: 'K⁺', secondary: 'Na⁺', accent: 'Cl⁻' } }),
  mo('ros', 'Reactive oxygen species (ROS)', ['ros', 'reactive oxygen species', 'superoxide', 'oxidative stress', 'free radical', 'h2o2'], { primary: '#e8504a', secondary: '#f2c94c', accent: '#ffffff' },
    (c, u) => {
      let s = `<path d="M50 6 L58 30 L84 18 L70 42 L96 52 L68 60 L80 86 L54 70 L42 94 L38 66 L10 74 L28 52 L6 34 L34 34 Z" fill="${c.secondary}" stroke="${dark(c.secondary, 0.4)}" stroke-width="1.4" stroke-linejoin="round"/>`;
      s += ballStick({ primary: '#5f6b7a', secondary: c.primary, accent: '#4a7fe8' }, u, [[40, 50, 'O', 11], [62, 50, 'O', 11]], [[0, 1]]);
      return s + circle(74, 36, 3.2, c.accent, dark(c.primary, 0.3), 1) + `<text x="76" y="44" font-size="12" font-family="Arial" font-weight="700" fill="${dark(c.primary, 0.3)}">−</text>`;
    }, { roles: { primary: 'Oxygen', secondary: 'Burst', accent: 'Radical' } }),
  mo('n-glycan', 'N-glycan', ['glycan', 'n-glycan', 'glycosylation', 'sugar chain', 'oligosaccharide', 'snfg', 'sialic acid'], { primary: '#4a7fe8', secondary: '#4caf50', accent: '#f2c94c' },
    (c) => {
      // symbol nomenclature: squares GlcNAc, circles Man/Gal, diamonds sialic acid, triangle fucose
      const sq = (x, y) => rect(x - 5, y - 5, 10, 10, 1, c.primary, dark(c.primary, 0.42), 1.1);
      const ci = (x, y, col) => circle(x, y, 5.4, col, dark(col, 0.42), 1.1);
      const di = (x, y) => `<path d="M${x} ${y - 6.4} L${x + 6.4} ${y} L${x} ${y + 6.4} L${x - 6.4} ${y} Z" fill="#a24bb5" stroke="${dark('#a24bb5', 0.42)}" stroke-width="1.1"/>`;
      let s = `<path d="M50 96 V64 M50 64 L32 50 M50 64 L68 50 M32 50 V36 M68 50 V36 M32 36 V22 M68 36 V22 M32 22 V8 M68 22 V8 M50 86 L66 90" stroke="#7b8794" stroke-width="2" fill="none"/>`;
      s += sq(50, 92) + sq(50, 78) + ci(50, 64, c.secondary) + ci(32, 50, c.secondary) + ci(68, 50, c.secondary) + sq(32, 36) + sq(68, 36) + ci(32, 22, c.accent) + ci(68, 22, c.accent) + di(32, 8) + di(68, 8);
      return s + `<path d="M66 84 L72 95 L60 95 Z" fill="#e8504a" stroke="${dark('#e8504a', 0.42)}" stroke-width="1.1"/>`;
    }, { size: 70, shape: 'rect', roles: { primary: 'GlcNAc', secondary: 'Mannose', accent: 'Galactose' } }),

  // ---- drugs & delivery -------------------------------------------------------------------------
  dr('pill', 'Tablet', ['pill', 'tablet', 'oral drug', 'medication', 'small molecule drug', 'dose'], { primary: '#f2f4f7', secondary: '#c9d1db', accent: '#5aa7e6' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cy: 25, hi: 0.3, lo: -0.12 });
      return ellipse(50, 56, 40, 20, c.secondary, dark(c.secondary, 0.35), 1.4) + rect(10, 44, 80, 12, 0, c.secondary) + defs(g) + ellipse(50, 44, 40, 20, g.url, dark(c.secondary, 0.4), 1.4)
        + `<path d="M26 34 L74 54" stroke="${dark(c.secondary, 0.2)}" stroke-width="2.4" stroke-linecap="round"/>` + gloss(36, 36, 10, 4, 0.5, 20);
    }, { w: 100, h: 80, roles: { primary: 'Face', secondary: 'Edge', accent: 'Accent' } }),
  dr('capsule', 'Capsule', ['capsule', 'pill', 'oral drug', 'medication', 'gelcap'], { primary: '#e85d75', secondary: '#f2f4f7', accent: '#f2c94c' },
    (c, u) => {
      const a = linear(u, 'a', light(c.primary, 0.35), dark(c.primary, 0.25)), b = linear(u, 'b', '#ffffff', dark(c.secondary, 0.18));
      return `<g transform="rotate(-30 50 40)">${defs(a, b)}<path d="M50 24 H26 A16 16 0 0 0 26 56 H50 Z" fill="${a.url}" stroke="${dark(c.primary, 0.42)}" stroke-width="1.4"/><path d="M50 24 H74 A16 16 0 0 1 74 56 H50 Z" fill="${b.url}" stroke="${dark(c.secondary, 0.42)}" stroke-width="1.4"/><path d="M22 30 H78" stroke="#fff" stroke-width="3" opacity="0.6" stroke-linecap="round"/></g>`;
    }, { w: 100, h: 80, roles: { primary: 'Half 1', secondary: 'Half 2', accent: 'Accent' } }),
  dr('liposome', 'Liposome', ['liposome', 'lipid vesicle', 'drug delivery', 'nanocarrier', 'bilayer vesicle', 'doxil'], { primary: '#f3c27a', secondary: '#c98a4b', accent: '#5aa7e6' },
    (c, u) => {
      let s = circle(50, 50, 30, light(c.accent, 0.55));
      const outer = ring(50, 50, 42, 42, 28, 0), inner = ring(50, 50, 24, 24, 16, 0.1);
      outer.forEach((p) => { s += phospholipid(p.x, p.y, 10, c.primary, c.secondary, (p.a * 180) / Math.PI - 90); });
      inner.forEach((p) => { s += phospholipid(p.x, p.y, 9, c.primary, c.secondary, (p.a * 180) / Math.PI + 90); });
      return s + speckle(50, 50, 13, 13, 7, 2, c.accent, 3, 0.9);
    }, { roles: { primary: 'Lipid heads', secondary: 'Lipid tails', accent: 'Cargo' } }),
  dr('micelle', 'Micelle', ['micelle', 'surfactant', 'amphiphile', 'nanocarrier', 'detergent'], { primary: '#f3c27a', secondary: '#c98a4b', accent: '#e8724a' },
    (c) => {
      let s = circle(50, 50, 14, light(c.accent, 0.5), 'none', 0, ' opacity="0.7"');
      ring(50, 50, 36, 36, 20, 0).forEach((p) => { s += phospholipid(p.x, p.y, 14, c.primary, c.secondary, (p.a * 180) / Math.PI - 90); });
      return s + circle(48, 50, 4, c.accent, dark(c.accent, 0.4), 0.8);
    }, { roles: { primary: 'Heads', secondary: 'Tails', accent: 'Cargo' } }),
  dr('polymer-nanoparticle', 'Polymeric nanoparticle', ['nanoparticle', 'plga', 'polymer', 'peg', 'drug delivery', 'nanomedicine'], { primary: '#8e7cc3', secondary: '#c9d1db', accent: '#e85d75' },
    (c, u) => {
      let peg = '';
      ring(50, 50, 34, 34, 22, 0.1).forEach((p, i) => { const a = p.a, ox = Math.cos(a), oy = Math.sin(a); peg += `M${n(p.x)} ${n(p.y)} q${n(ox * 6 - oy * 3)} ${n(oy * 6 + ox * 3)} ${n(ox * 12)} ${n(oy * 12)} `; });
      const g = sphere(u, 'b', c.primary, { hi: 0.5 });
      let s = `<path d="${peg}" fill="none" stroke="${dark(c.secondary, 0.2)}" stroke-width="1.6" stroke-linecap="round"/>` + defs(g) + circle(50, 50, 35, g.url, dark(c.primary, 0.42), 1.6);
      let mesh = '';
      const R = rng(4);
      for (let i = 0; i < 9; i++) { const a = R() * 6.28, b = R() * 6.28; mesh += `M${n(50 + Math.cos(a) * 28)} ${n(50 + Math.sin(a) * 28)} Q${n(50 + R() * 20 - 10)} ${n(50 + R() * 20 - 10)} ${n(50 + Math.cos(b) * 28)} ${n(50 + Math.sin(b) * 28)} `; }
      s += `<path d="${mesh}" fill="none" stroke="${light(c.primary, 0.35)}" stroke-width="1.2" opacity="0.7"/>` + speckle(50, 50, 24, 24, 10, 2, c.accent, 6, 0.9);
      return s + gloss(36, 34, 10, 5, 0.5);
    }, { roles: { primary: 'Polymer core', secondary: 'PEG corona', accent: 'Drug' } }),
  dr('gold-nanoparticle', 'Gold nanoparticle', ['gold nanoparticle', 'aunp', 'nanoparticle', 'functionalized', 'imaging', 'plasmonic'], { primary: '#e6b422', secondary: '#7b8794', accent: '#5aa7e6' },
    (c, u) => {
      let s = '';
      ring(50, 50, 32, 32, 16, 0).forEach((p, i) => { const ox = Math.cos(p.a), oy = Math.sin(p.a); s += line(p.x, p.y, p.x + ox * 12, p.y + oy * 12, c.secondary, 1.4) + (i % 4 === 0 ? domain(p.x + ox * 15, p.y + oy * 15, 3.6, 3.2, c.accent) : circle(p.x + ox * 13, p.y + oy * 13, 1.8, dark(c.secondary, 0.1))); });
      const g = sphere(u, 'b', c.primary, { hi: 0.7, lo: -0.3 });
      return s + defs(g) + circle(50, 50, 32, g.url, dark(c.primary, 0.45), 1.6) + gloss(38, 36, 10, 6, 0.65);
    }, { roles: { primary: 'Gold core', secondary: 'Ligand shell', accent: 'Targeting ligand' } }),
  dr('dendrimer', 'Dendrimer', ['dendrimer', 'pamam', 'branched polymer', 'nanocarrier', 'multivalent'], { primary: '#4fb0a0', secondary: '#9be0cf', accent: '#f39a3d' },
    (c) => {
      let b = '', ends = '';
      const grow = (x, y, a, L, d) => {
        const x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L;
        b += `M${n(x)} ${n(y)} L${n(x1)} ${n(y1)} `;
        if (d > 0) { grow(x1, y1, a - 0.45, L * 0.78, d - 1); grow(x1, y1, a + 0.45, L * 0.78, d - 1); } else ends += circle(x1, y1, 3.2, c.accent, dark(c.accent, 0.42), 0.8);
      };
      for (let k = 0; k < 4; k++) grow(50, 50, (k * Math.PI) / 2 + 0.4, 14, 2);
      return `<path d="${b}" stroke="${dark(c.primary, 0.35)}" stroke-width="4" stroke-linecap="round"/><path d="${b}" stroke="${c.secondary}" stroke-width="2" stroke-linecap="round"/>` + ends + circle(50, 50, 6, c.primary, dark(c.primary, 0.42), 1.2);
    }, { roles: { primary: 'Core', secondary: 'Branches', accent: 'Surface groups' } }),
  dr('protac', 'PROTAC (targeted degrader)', ['protac', 'degrader', 'targeted protein degradation', 'e3 ligase', 'molecular glue', 'cereblon'], { primary: '#5aa7e6', secondary: '#8e7cc3', accent: '#f39a3d' },
    (c, u) => {
      const tg = sphere(u, 't', c.primary, { hi: 0.4 }), eg = sphere(u, 'e', c.secondary, { hi: 0.4 });
      let s = defs(tg, eg) + path(blob(28, 44, 22, 26, { n: 9, seed: 3, wobble: 0.1 }), tg.url, dark(c.primary, 0.42), 1.6) + path(blob(92, 46, 24, 28, { n: 9, seed: 5, wobble: 0.1 }), eg.url, dark(c.secondary, 0.42), 1.6);
      s += `<path d="M42 54 Q60 68 74 54" fill="none" stroke="${dark(c.accent, 0.4)}" stroke-width="3.6" stroke-linecap="round"/><path d="M42 54 Q60 68 74 54" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 2"/>`;
      s += `<path d="M42 48 l6 6 l-6 6 l-6 -6Z" fill="${c.accent}" stroke="${dark(c.accent, 0.4)}" stroke-width="1"/>` + `<path d="M74 48 l6 6 l-6 6 l-6 -6Z" fill="${c.accent}" stroke="${dark(c.accent, 0.4)}" stroke-width="1"/>`;
      s += [[46, 14], [52, 8], [58, 14]].map(([x, y]) => circle(x, y, 3.2, '#e85d75', dark('#e85d75', 0.4), 0.8)).join('') + `<path d="M38 22 L46 14" stroke="#e85d75" stroke-width="1.4"/>`;
      return s + gloss(20, 30, 6, 4, 0.45) + gloss(84, 30, 6, 4, 0.45);
    }, { w: 120, h: 80, size: 100, shape: 'rect', roles: { primary: 'Target protein', secondary: 'E3 ligase', accent: 'Degrader' } }),

  // ---- proteins ---------------------------------------------------------------------------------
  pr('hemoglobin', 'Hemoglobin', ['hemoglobin', 'haemoglobin', 'heme', 'oxygen transport', 'globin', 'tetramer'], { primary: '#e57373', secondary: '#f2a5a5', accent: '#a83232' },
    (c, u) => {
      let s = '';
      [[34, 34, c.primary, 3], [66, 34, c.secondary, 5], [34, 66, c.secondary, 7], [66, 66, c.primary, 9]].forEach(([x, y, col, sd], i) => {
        const g = sphere(u, `s${i}`, col, { hi: 0.45 });
        s += defs(g) + path(blob(x, y, 22, 20, { n: 9, wobble: 0.1, seed: sd }), g.url, dark(col, 0.42), 1.4);
        const hx = x + (x < 50 ? -6 : 6), hy = y + (y < 50 ? -6 : 6);
        s += `<path d="M${hx - 6} ${hy} L${hx - 3} ${hy - 5} H${hx + 3} L${hx + 6} ${hy} L${hx + 3} ${hy + 5} H${hx - 3} Z" fill="${c.accent}" stroke="${dark(c.accent, 0.4)}" stroke-width="0.8"/>` + circle(hx, hy, 1.8, '#f2c94c');
      });
      return s + gloss(26, 22, 8, 4, 0.45);
    }, { roles: { primary: 'α subunits', secondary: 'β subunits', accent: 'Heme' } }),
  pr('insulin', 'Insulin', ['insulin', 'peptide hormone', 'a chain', 'b chain', 'disulfide', 'diabetes'], { primary: '#5aa7e6', secondary: '#4fb0a0', accent: '#f2c94c' },
    (c) => {
      const A = Array.from({ length: 10 }, (_, i) => [16 + i * 8, 28 + Math.sin(i * 0.9) * 4]), B = Array.from({ length: 13 }, (_, i) => [8 + i * 8, 58 + Math.sin(i * 0.7 + 1) * 5]);
      let s = `<g stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round"><path d="M${A[2][0]} ${A[2][1]} L${B[3][0]} ${B[3][1]} M${A[8][0]} ${A[8][1]} L${B[9][0]} ${B[9][1]} M${A[3][0]} ${A[3][1]} Q${A[5][0]} ${A[5][1] - 12} ${A[6][0]} ${A[6][1]}"/></g>`;
      return s + chain(A, c.primary, 3.6) + chain(B, c.secondary, 3.6);
    }, { w: 110, h: 80, roles: { primary: 'A chain', secondary: 'B chain', accent: 'Disulfide bonds' } }),
  pr('collagen', 'Collagen', ['collagen', 'triple helix', 'extracellular matrix', 'ecm', 'fibrosis', 'tropocollagen'], { primary: '#e8a0b4', secondary: '#f2c4d0', accent: '#c46a86' },
    (c) => strands([c.primary, c.secondary, c.accent], { amp: 8, turns: 3, w: 4.6 }), { w: 120, h: 60, roles: { primary: 'Chain 1', secondary: 'Chain 2', accent: 'Chain 3' } }),
  pr('amyloid-fibril', 'Amyloid fibril', ['amyloid', 'fibril', 'beta amyloid', 'tau', 'alpha-synuclein', 'aggregate', 'neurodegeneration'], { primary: '#c49be0', secondary: '#8a5ac0', accent: '#f2c94c' },
    (c) => {
      let s = '';
      for (let i = 0; i < 16; i++) {
        const x = 8 + i * 6.6, tw = Math.cos(i * 0.5);
        s += `<path d="M${x} ${n(30 - 14 * Math.abs(tw))} L${x} ${n(30 + 14 * Math.abs(tw))}" stroke="${dark(tw > 0 ? c.primary : c.secondary, 0.42)}" stroke-width="5.6" stroke-linecap="round"/><path d="M${x} ${n(30 - 14 * Math.abs(tw))} L${x} ${n(30 + 14 * Math.abs(tw))}" stroke="${tw > 0 ? c.primary : c.secondary}" stroke-width="3.6" stroke-linecap="round"/><path d="M${x - 1.6} ${n(30 + 14 * Math.abs(tw) - 2)} l1.6 3 l1.6 -3" fill="none" stroke="${light(c.primary, 0.4)}" stroke-width="0.9"/>`;
      }
      return s;
    }, { w: 120, h: 60, roles: { primary: 'β-strands', secondary: 'Back face', accent: 'Accent' } }),
  pr('myosin', 'Myosin', ['myosin', 'motor protein', 'muscle', 'myosin ii', 'actomyosin', 'power stroke'], { primary: '#8e7cc3', secondary: '#c0b2f0', accent: '#f39a3d' },
    (c) => {
      return strands([c.primary, c.secondary], { x0: 40, x1: 114, y: 44, amp: 2.4, turns: 5, w: 3.4 })
        + domain(22, 26, 14, 10, c.primary, -30) + domain(26, 52, 14, 10, c.secondary, 20) + `<path d="M34 34 L42 42 M36 50 L42 44" stroke="${dark(c.primary, 0.3)}" stroke-width="3" stroke-linecap="round"/>`
        + circle(14, 20, 3.4, c.accent, dark(c.accent, 0.4), 0.8);
    }, { w: 120, h: 70, roles: { primary: 'Heavy chain 1', secondary: 'Heavy chain 2', accent: 'ATP' } }),
  pr('kinesin', 'Kinesin', ['kinesin', 'motor protein', 'microtubule', 'cargo transport', 'axonal transport', 'vesicle'], { primary: '#f39a3d', secondary: '#5aa7e6', accent: '#7fc9b9' },
    (c, u) => {
      let s = '';
      for (let k = 0; k < 14; k++) s += circle(6 + k * 8.4, 92, 4, k % 2 ? light(c.secondary, 0.35) : c.secondary, dark(c.secondary, 0.4), 0.8);
      s += strands([c.primary, shade(c.primary, 0.2)], { x0: 52, x1: 56, y: 50, amp: 0.1, turns: 1, w: 3 });
      s += `<path d="M48 80 Q52 64 54 50 Q56 36 54 28 M58 80 Q58 64 56 50" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="4" stroke-linecap="round"/><path d="M48 80 Q52 64 54 50 Q56 36 54 28 M58 80 Q58 64 56 50" fill="none" stroke="${c.primary}" stroke-width="2.4" stroke-linecap="round"/>`;
      s += domain(44, 84, 7, 5, c.primary, -20) + domain(62, 82, 7, 5, shade(c.primary, 0.15), 30);
      const vg = sphere(u, 'v', c.accent, { hi: 0.5 });
      return s + defs(vg) + circle(54, 18, 16, vg.url, dark(c.accent, 0.42), 1.6) + gloss(48, 12, 5, 3, 0.5);
    }, { roles: { primary: 'Kinesin', secondary: 'Microtubule', accent: 'Cargo vesicle' } }),
  pr('ubiquitin', 'Ubiquitin chain', ['ubiquitin', 'polyubiquitin', 'ubiquitination', 'proteasome', 'degradation tag', 'e3 ligase'], { primary: '#e85d75', secondary: '#5aa7e6', accent: '#f2c94c' },
    (c, u) => {
      const sg = sphere(u, 's', c.secondary, { hi: 0.4 });
      let s = defs(sg) + path(blob(36, 66, 28, 24, { n: 9, seed: 4, wobble: 0.1 }), sg.url, dark(c.secondary, 0.42), 1.6) + gloss(26, 54, 8, 4, 0.45);
      [[62, 46], [72, 30], [84, 18], [96, 10]].forEach(([x, y], i) => { s += line(i ? x - 12 : 54, i ? y + 12 : 56, x, y, dark(c.primary, 0.3), 2); });
      [[62, 46], [72, 30], [84, 18], [96, 10]].forEach(([x, y]) => { s += domain(x, y, 7.4, 6.6, c.primary); });
      return s;
    }, { w: 110, h: 100, roles: { primary: 'Ubiquitin', secondary: 'Substrate', accent: 'Accent' } }),
  pr('chaperone', 'Chaperone (HSP)', ['chaperone', 'heat shock protein', 'hsp70', 'hsp90', 'protein folding', 'proteostasis'], { primary: '#4fb0a0', secondary: '#9be0cf', accent: '#e8724a' },
    (c, u) => {
      const g = sphere(u, 'a', c.primary, { hi: 0.4 }), h = sphere(u, 'b', c.secondary, { hi: 0.4 });
      let s = defs(g, h) + path('M14 70 Q8 40 30 24 Q44 16 52 30 Q38 40 40 60 Q42 76 28 82 Q18 82 14 70Z', g.url, dark(c.primary, 0.42), 1.6) + path('M86 70 Q92 40 70 24 Q56 16 48 30 Q62 40 60 60 Q58 76 72 82 Q82 82 86 70Z', h.url, dark(c.secondary, 0.42), 1.6);
      const pts = [[50, 6], [44, 18], [56, 30], [44, 42], [56, 54], [46, 66], [54, 78], [50, 94]];
      return s + chain(pts, c.accent, 3.2) + gloss(24, 36, 4, 8, 0.45, 20);
    }, { roles: { primary: 'Domain 1', secondary: 'Domain 2', accent: 'Client protein' } }),
  pr('spike-protein', 'Viral spike protein', ['spike', 'spike protein', 'sars-cov-2', 's protein', 'rbd', 'fusion protein', 'trimer', 'coronavirus'], { primary: '#e85d5d', secondary: '#f2a0a0', accent: '#f6c945' },
    (c, u) => {
      let s = membraneStrip(0, 60, 88, 12);
      s += `<path d="M24 82 V60 M30 82 V58 M36 82 V60" stroke="${dark(c.primary, 0.35)}" stroke-width="3.4" stroke-linecap="round"/><path d="M24 82 V60 M30 82 V58 M36 82 V60" stroke="${c.secondary}" stroke-width="2" stroke-linecap="round"/>`;
      [[18, 30, c.secondary, -12], [42, 30, c.secondary, 12], [30, 34, c.primary, 0]].forEach(([x, y, col, a], i) => {
        const g = sphere(u, `h${i}`, col, { hi: 0.45 });
        s += defs(g) + path(blob(x, y, 12, 22, { n: 9, seed: i + 3, wobble: 0.1 }), g.url, dark(col, 0.42), 1.4, ` transform="rotate(${a} ${x} ${y})"`);
      });
      s += domain(30, 12, 7, 5.4, shade(c.primary, -0.1));
      [[14, 44], [46, 44], [22, 18], [40, 20], [30, 54]].forEach(([x, y]) => { s += circle(x, y, 1.8, c.accent, dark(c.accent, 0.4), 0.5); });
      return s;
    }, { w: 60, h: 100, size: 60, roles: { primary: 'Protomer (RBD up)', secondary: 'Protomers', accent: 'Glycans' }, anchor: [30, 88] }),
  pr('mucin', 'Mucin', ['mucin', 'muc1', 'muc2', 'mucus', 'glycoprotein', 'bottlebrush', 'mucosal barrier'], { primary: '#8e7cc3', secondary: '#f2c94c', accent: '#4caf50' },
    (c) => {
      let s = `<path d="M6 30 Q60 24 114 30" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="5" stroke-linecap="round"/><path d="M6 30 Q60 24 114 30" fill="none" stroke="${c.primary}" stroke-width="3" stroke-linecap="round"/>`;
      for (let x = 12; x < 110; x += 6) {
        const up = (x / 6) % 2 < 1, y0 = 27.6, L = 10 + ((x * 7) % 5);
        const y1 = up ? y0 - L : y0 + L + 3;
        s += line(x, up ? y0 : y0 + 3, x + 1, y1, '#7b8794', 1.2) + circle(x + 1, y1, 2, (x / 6) % 3 < 1 ? c.accent : c.secondary, dark(c.secondary, 0.4), 0.5);
      }
      return s;
    }, { w: 120, h: 60, roles: { primary: 'Protein backbone', secondary: 'Glycans', accent: 'Sialic acid' } }),
];
