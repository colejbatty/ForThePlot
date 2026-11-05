// Channels and transporters, more receptors, antibody formats and signaling proteins.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, blob, ring, domain, helix, membraneStrip, linear, speckle } from './kit.js';
import { igg, g, tm, stalked } from './molecules.js';

const R3 = { primary: 'Main', secondary: 'Secondary', accent: 'Accent' };
const AB = { primary: 'Heavy chain', secondary: 'Light chain', accent: 'Variable / payload' };
const ch = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Channels & transporters', tags, colors, roles: R3, draw, w: 80, h: 100, size: 70, anchor: [40, 50], ...extra });
const rc = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Receptors & ligands', tags, colors, roles: { primary: 'Chain 1', secondary: 'Chain 2', accent: 'Ligand / signaling' }, draw, w: 60, h: 100, size: 60, ...extra });
const ab = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Antibodies', tags, colors, roles: AB, draw, size: 70, ...extra });
const sg = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Signaling', tags, colors, roles: R3, draw, size: 70, ...extra });

const MEM = (y = 50, w = 80) => membraneStrip(0, w, y, 16);
const label = (x, y, t, col, size = 6) => `<text x="${x}" y="${y}" font-size="${size}" font-family="Arial" font-weight="700" text-anchor="middle" fill="${col}">${t}</text>`;
const ion = (x, y, r, col, t) => circle(x, y, r, col, dark(col, 0.42), 0.8) + circle(x - r * 0.3, y - r * 0.32, r * 0.3, '#fff', 'none', 0, ' opacity="0.6"') + (t ? label(x, y + r * 0.42, t, '#fff', r * 1.05) : '');
const arrow = (x0, y0, x1, y1, col) => {
  const a = Math.atan2(y1 - y0, x1 - x0), h = 4;
  return `<path d="M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)} M${n(x1 - Math.cos(a - 0.5) * h)} ${n(y1 - Math.sin(a - 0.5) * h)} L${n(x1)} ${n(y1)} L${n(x1 - Math.cos(a + 0.5) * h)} ${n(y1 - Math.sin(a + 0.5) * h)}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
};
/** A globular blob with a lit gradient. */
const glob = (u, key, x, y, rx, ry, col, seed = 3, extra = '') => { const gr = sphere(u, key, col, { hi: 0.45 }); return defs(gr) + path(blob(x, y, rx, ry, { n: 9, wobble: 0.1, seed }), gr.url, dark(col, 0.42), 1.4, extra); };
/** Four-helix cytokine glyph. */
const cytokine = (x, y, col, s = 1) => `<g transform="translate(${n(x)} ${n(y)}) scale(${s})">${helix(-9, -10, 5.6, 20, col, { sw: 0.8 })}${helix(-3, -12, 5.6, 22, shade(col, 0.12), { sw: 0.8 })}${helix(3, -10, 5.6, 20, col, { sw: 0.8 })}</g>`;
/** Small virion with spikes. */
function virion(u, x, y, r, col) {
  let s = '';
  ring(x, y, r, r, 14, 0).forEach((p) => { const ox = Math.cos(p.a), oy = Math.sin(p.a); s += line(p.x, p.y, p.x + ox * 6, p.y + oy * 6, dark(col, 0.3), 1.6) + circle(p.x + ox * 7, p.y + oy * 7, 2.4, shade(col, 0.15), dark(col, 0.4), 0.7); });
  const gr = sphere(u, 'vir', col, { hi: 0.45 });
  return s + defs(gr) + circle(x, y, r, gr.url, dark(col, 0.42), 1.4) + gloss(x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.18, 0.5);
}

export const receptors2 = [
  // ---- channels & transporters -------------------------------------------------------------------
  ch('ion-channel', 'Ion channel', ['ion channel', 'channel', 'voltage-gated', 'ligand-gated', 'pore', 'sodium channel', 'potassium channel'], { primary: '#5aa7e6', secondary: '#9fcbf0', accent: '#f2c94c' },
    (c) => {
      let s = MEM();
      [[14, 0], [22, 1], [52, 1], [60, 0]].forEach(([x, k]) => { s += helix(x, 26, 8, 48, k ? c.secondary : c.primary, { turns: 6 }); });
      [[40, 16], [40, 36], [40, 56], [40, 80]].forEach(([x, y], i) => { s += ion(x + (i % 2 ? 2 : -2), y, 4.4, c.accent, '+'); });
      return s + arrow(40, 6, 40, 92, dark(c.accent, 0.3)).replace('stroke-width="1.6"', 'stroke-width="1" opacity="0.5"');
    }, { roles: { primary: 'Pore helices', secondary: 'Outer helices', accent: 'Ions' } }),
  ch('sodium-potassium-pump', 'Na⁺/K⁺-ATPase', ['sodium potassium pump', 'na+/k+ atpase', 'atpase', 'active transport', 'ion pump', 'p-type atpase'], { primary: '#8e7cc3', secondary: '#c0b2f0', accent: '#f39a3d' },
    (c, u) => {
      let s = MEM();
      s += glob(u, 'b', 40, 52, 22, 34, c.primary, 4) + `<path d="M40 24 V80" stroke="${light(c.primary, 0.4)}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`;
      s += [[10, 12], [20, 6], [14, 22]].map(([x, y]) => ion(x, y, 4.2, '#5aa7e6', 'Na')).join('') + arrow(24, 30, 20, 18, '#3d6fb0');
      s += [[66, 88], [74, 80]].map(([x, y]) => ion(x, y, 4.6, '#8e44ad', 'K')).join('') + arrow(64, 18, 66, 30, '#6b2f8a') + ion(68, 10, 4.6, '#8e44ad', 'K');
      s += ion(14, 86, 4.6, c.accent, '') + label(14, 94.6, 'ATP', dark(c.accent, 0.4), 5.4);
      return s + gloss(32, 30, 5, 9, 0.45, 10);
    }, { roles: { primary: 'Pump', secondary: 'Detail', accent: 'ATP' } }),
  ch('glucose-transporter', 'Glucose transporter (GLUT)', ['glut', 'glut1', 'glut4', 'glucose transporter', 'facilitated diffusion', 'carrier', 'slc2a'], { primary: '#4fb0a0', secondary: '#9be0cf', accent: '#f2c94c' },
    (c, u) => {
      let s = MEM();
      s += glob(u, 'a', 28, 50, 14, 30, c.primary, 5) + glob(u, 'b', 52, 50, 14, 30, c.secondary, 7);
      const hex = (x, y) => `<path d="M${x - 6} ${y} L${x - 3} ${y - 5} H${x + 3} L${x + 6} ${y} L${x + 3} ${y + 5} H${x - 3} Z" fill="${c.accent}" stroke="${dark(c.accent, 0.42)}" stroke-width="1"/>`;
      return s + hex(40, 12) + hex(40, 50) + hex(46, 88) + arrow(40, 20, 40, 40, dark(c.primary, 0.3)) + arrow(41, 60, 44, 78, dark(c.primary, 0.3));
    }, { roles: { primary: 'N-domain', secondary: 'C-domain', accent: 'Glucose' } }),
  ch('aquaporin', 'Aquaporin', ['aquaporin', 'aqp', 'water channel', 'aqp2', 'osmosis'], { primary: '#5aa7e6', secondary: '#9fcbf0', accent: '#e8504a' },
    (c) => {
      let s = MEM();
      s += path('M8 26 Q28 26 32 50 Q28 74 8 74 Z', c.primary, dark(c.primary, 0.42), 1.4) + path('M72 26 Q52 26 48 50 Q52 74 72 74 Z', c.secondary, dark(c.secondary, 0.42), 1.4);
      s += `<path d="M12 32 Q24 34 26 50 M68 32 Q56 34 54 50" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.5"/>`;
      [10, 26, 42, 58, 74, 90].forEach((y) => { s += circle(40, y, 3.6, c.accent, dark(c.accent, 0.42), 0.8) + circle(36, y + 3, 2, '#eef1f5', '#9aa5b1', 0.5) + circle(44, y + 3, 2, '#eef1f5', '#9aa5b1', 0.5); });
      return s;
    }, { roles: { primary: 'Half 1', secondary: 'Half 2', accent: 'Water' } }),
  ch('atp-synthase', 'ATP synthase', ['atp synthase', 'f1fo', 'complex v', 'oxidative phosphorylation', 'rotary motor', 'mitochondria'], { primary: '#e8724a', secondary: '#f6b49a', accent: '#5aa7e6' },
    (c, u) => {
      let s = membraneStrip(0, 80, 78, 16);
      const rg = linear(u, 'r', light(c.accent, 0.3), dark(c.accent, 0.25), { x1: 0, y1: 0, x2: 1, y2: 0 });
      s += defs(rg) + rect(18, 70, 44, 16, 6, rg.url, dark(c.accent, 0.42), 1.2);
      for (let x = 24; x < 60; x += 6) s += line(x, 72, x, 84, dark(c.accent, 0.2), 1, ' opacity="0.6"');
      s += rect(37, 40, 6, 32, 3, '#9aa5b1', '#5f6b7a', 1) + `<path d="M64 76 V28 Q64 22 58 20" fill="none" stroke="${dark(c.secondary, 0.35)}" stroke-width="4.4" stroke-linecap="round"/><path d="M64 76 V28 Q64 22 58 20" fill="none" stroke="${c.secondary}" stroke-width="2.6" stroke-linecap="round"/>`;
      [[26, 30, c.primary], [40, 26, c.secondary], [54, 30, c.primary], [33, 40, c.secondary], [47, 40, c.primary]].forEach(([x, y, col], i) => { s += glob(u, `h${i}`, x, y, 9, 10, col, i + 3); });
      return s + arrow(70, 50, 70, 64, dark(c.accent, 0.2)) + label(72, 46, 'H⁺', dark(c.accent, 0.3), 6) + ion(14, 22, 4.4, '#f39a3d', '') + label(14, 14, 'ATP', '#b8651c', 5.4);
    }, { roles: { primary: 'α subunits', secondary: 'β subunits / stator', accent: 'Fo rotor' }, anchor: [40, 78] }),

  // ---- receptors ------------------------------------------------------------------------------------
  rc('receptor-tyrosine-kinase', 'Receptor tyrosine kinase (RTK)', ['rtk', 'receptor tyrosine kinase', 'egfr', 'her2', 'growth factor receptor', 'dimerization', 'kinase'], { primary: '#3f9fd8', secondary: '#9fd0f0', accent: '#f39a3d' },
    (c, u) => {
      let s = '';
      [[22, c.primary], [58, c.secondary]].forEach(([x, col]) => {
        s += stalked(x, 14, [[9, 9], [9, 9, shade(col, 0.12)], [8, 8]], col, { stalk: 6, tmY: 66 });
        s += glob(u, `k${x}`, x + (x < 40 ? -2 : 2), 104, 12, 9, shade(col, -0.05), x);
        s += ion(x + (x < 40 ? -12 : 12), 116, 3.6, c.accent, 'P') + ion(x + (x < 40 ? 4 : -4), 118, 3.6, c.accent, 'P');
      });
      return s + domain(40, 10, 7, 6, c.accent);
    }, { w: 80, h: 124, size: 70, anchor: [40, 74] }),
  rc('integrin', 'Integrin', ['integrin', 'lfa-1', 'vla-4', 'adhesion', 'ecm receptor', 'alpha beta heterodimer', 'rgd'], { primary: '#8e7cc3', secondary: '#4fb0a0', accent: '#f2c94c' },
    (c, u) => {
      let s = '';
      s += `<path d="M20 30 Q16 52 22 74 M40 30 Q44 52 38 74" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="5" stroke-linecap="round"/><path d="M20 30 Q16 52 22 74" fill="none" stroke="${c.primary}" stroke-width="3" stroke-linecap="round"/><path d="M40 30 Q44 52 38 74" fill="none" stroke="${c.secondary}" stroke-width="3" stroke-linecap="round"/>`;
      s += tm(22, 74, c.primary, { len: 14, tail: 10, w: 5 }) + tm(38, 74, c.secondary, { len: 14, tail: 10, w: 5 });
      s += glob(u, 'a', 22, 20, 13, 12, c.primary, 3) + glob(u, 'b', 40, 22, 10, 11, c.secondary, 5) + domain(31, 8, 5, 4.4, c.accent);
      return s;
    }, { anchor: [30, 81] }),
  rc('cadherin', 'Cadherin (adherens junction)', ['cadherin', 'e-cadherin', 'adherens junction', 'cell adhesion', 'calcium-dependent', 'emt'], { primary: '#e8724a', secondary: '#f6b49a', accent: '#f2c94c' },
    (c) => {
      let s = '';
      const chainDown = (x, y0, col, dir) => { let t = ''; for (let i = 0; i < 4; i++) { const y = y0 + dir * i * 13, xx = x + (i % 2 ? 3 : -3) * dir; t += domain(xx, y, 6, 7, i % 2 ? shade(col, 0.15) : col); if (i < 3) t += circle(xx + dir * 2, y + dir * 6.5, 1.6, c.accent, dark(c.accent, 0.4), 0.4); } return t; };
      s += chainDown(24, 80, c.primary, -1) + chainDown(36, 20, c.secondary, 1);
      return s + tm(24, 88, c.primary, { len: 10, tail: 6, w: 4.6 });
    }, { anchor: [30, 93] }),
  rc('notch', 'Notch receptor', ['notch', 'notch1', 'delta', 'jagged', 'lateral inhibition', 'nicd', 'cell fate'], { primary: '#5b6bd6', secondary: '#a7b0ef', accent: '#e8724a' },
    (c) => {
      let s = '';
      for (let i = 0; i < 7; i++) s += domain(30 + (i % 2 ? 3 : -3), 12 + i * 8.6, 5, 5, i % 2 ? c.secondary : c.primary);
      s += domain(30, 74, 7, 5, shade(c.primary, -0.1)) + tm(30, 80, c.primary, { len: 12, tail: 6, w: 5 });
      return s + domain(42, 6, 6, 5, c.accent, 20) + domain(50, 0.5, 5, 4, shade(c.accent, 0.2), 20);
    }, { anchor: [30, 86] }),
  rc('ace2', 'ACE2', ['ace2', 'angiotensin converting enzyme 2', 'sars-cov-2 receptor', 'spike receptor', 'peptidase'], { primary: '#4fb0a0', secondary: '#9be0cf', accent: '#e85d5d' },
    (c, u) => {
      let s = '';
      [[18, c.primary, 3], [42, c.secondary, 5]].forEach(([x, col, sd]) => { s += glob(u, `p${x}`, x, 34, 14, 18, col, sd) + domain(x, 60, 6, 6, shade(col, -0.1)) + tm(x, 66, col, { len: 12, tail: 8, w: 5 }); });
      return s + glob(u, 'rbd', 18, 10, 8, 6, c.accent, 9);
    }, { anchor: [30, 72], roles: { primary: 'Protomer 1', secondary: 'Protomer 2', accent: 'Spike RBD' } }),
  rc('nkg2d', 'NKG2D', ['nkg2d', 'klrk1', 'activating receptor', 'nk cell receptor', 'mica', 'micb', 'ulbp', 'dap10'], { primary: '#e85d75', secondary: '#f5a3b3', accent: '#f2c94c' },
    (c) => stalked(20, 10, [[8, 8]], c.primary, { stalk: 26, tmY: 60 }) + stalked(40, 10, [[8, 8]], c.secondary, { stalk: 26, tmY: 60 }) + line(21, 34, 39, 34, '#52606d', 1.4)
      + line(30, 76, 30, 92, dark(c.accent, 0.3), 3) + domain(30, 94, 6, 4, c.accent), { anchor: [30, 68] }),
  rc('kir', 'Killer Ig-like receptor (KIR)', ['kir', 'killer immunoglobulin-like receptor', 'nk cell', 'inhibitory receptor', 'hla class i', 'itim'], { primary: '#c2405a', secondary: '#f2a0b0', accent: '#5b6bd6' },
    (c) => stalked(30, 8, [[10, 11], [10, 11, shade(c.primary, 0.15)]], c.primary, { stalk: 16, tmY: 62 }) + rect(27, 88, 6, 6, 2, c.accent, dark(c.accent, 0.4), 0.8), { anchor: [30, 70] }),
  rc('cd47-sirpa', 'CD47–SIRPα', ['cd47', 'sirpa', 'sirp alpha', "don't eat me", 'phagocytosis checkpoint', 'macrophage checkpoint', 'magrolimab'], { primary: '#f2b134', secondary: '#7a5fd0', accent: '#e85d5d' },
    (c) => {
      // CD47 rising from the target-cell membrane meets SIRPα hanging from the macrophage
      let s = `<g transform="rotate(180 30 50)">${stalked(30, 6, [[10, 11], [9, 10, shade(c.secondary, 0.12)], [9, 10, shade(c.secondary, 0.22)]], c.secondary, { stalk: 4, tmY: 76 })}</g>`;
      s += domain(30, 68, 10, 9, c.primary) + `<g>${[18, 24, 30, 36, 42].map((x) => helix(x - 2.4, 78, 4.8, 18, x % 12 ? c.primary : shade(c.primary, -0.1), { sw: 0.7 })).join('')}</g>`;
      return s;
    }, { w: 60, h: 100, roles: { primary: 'CD47', secondary: 'SIRPα', accent: 'Accent' } }),
  rc('tnf-receptor', 'TNF receptor (with TNF)', ['tnfr', 'tnf receptor', 'tnfr1', 'tnf', 'death receptor', '4-1bb', 'ox40', 'cd40', 'fas', 'trimer'], { primary: '#d9534f', secondary: '#f3a6a4', accent: '#f39a3d' },
    (c, u) => {
      let s = '';
      [[16, c.primary], [30, c.secondary], [44, c.primary]].forEach(([x, col]) => {
        for (let i = 0; i < 4; i++) s += domain(x, 30 + i * 9, 4.6, 5, i % 2 ? shade(col, 0.15) : col);
        s += tm(x, 68, col, { len: 12, tail: 10, w: 4.6 });
      });
      [[22, 14], [38, 14], [30, 6]].forEach(([x, y], i) => { s += glob(u, `t${i}`, x, y, 8, 8, c.accent, i + 3); });
      return s;
    }, { anchor: [30, 74] }),

  // ---- antibody formats -------------------------------------------------------------------------
  ab('igd', 'IgD', ['igd', 'immunoglobulin d', 'naive b cell', 'bcr', 'antibody'], { primary: '#4fb0a0', secondary: '#9be0cf', accent: '#f39a3d' },
    (c) => g(50, 52, 0, 0.92, igg(c, { hingeLen: 14 }))),
  ab('igg-fc', 'Fc fragment', ['fc', 'fc fragment', 'crystallizable fragment', 'fcrn', 'effector function', 'ch2', 'ch3'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#f6c945' },
    (c) => {
      let s = line(42, 14, 58, 14, dark(c.primary, 0.35), 2) + line(42, 18, 58, 18, dark(c.primary, 0.35), 2);
      [[40, 34], [60, 34], [40, 62], [60, 62]].forEach(([x, y], i) => { s += domain(x, y, 9.5, 13, i % 2 ? shade(c.primary, 0.12) : c.primary); });
      return s + circle(50, 40, 2, c.accent, dark(c.accent, 0.4), 0.6) + circle(47, 44, 1.6, c.accent, dark(c.accent, 0.4), 0.5) + circle(53, 44, 1.6, c.accent, dark(c.accent, 0.4), 0.5);
    }, { w: 100, h: 84, size: 50 }),
  ab('fc-fusion', 'Fc-fusion protein', ['fc fusion', 'fc-fusion', 'etanercept', 'abatacept', 'receptor-fc', 'trap', 'antibody'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#4fb0a0' },
    (c) => {
      let s = '';
      [[40, 64], [60, 64], [40, 88], [60, 88]].forEach(([x, y], i) => { s += domain(x, y, 9, 11.5, i % 2 ? shade(c.primary, 0.12) : c.primary); });
      s += line(42, 48, 58, 48, dark(c.primary, 0.35), 2) + `<path d="M40 52 L28 38 M60 52 L72 38" stroke="${dark(c.primary, 0.3)}" stroke-width="2.6" stroke-linecap="round"/>`;
      s += domain(24, 30, 9, 10, c.accent, -30) + domain(16, 12, 8, 9.5, shade(c.accent, 0.15), -30) + domain(76, 30, 9, 10, c.accent, 30) + domain(84, 12, 8, 9.5, shade(c.accent, 0.15), 30);
      return s;
    }, { w: 100, h: 100, roles: { primary: 'Fc', secondary: 'Hinge', accent: 'Fused receptor / ligand' } }),
  ab('diabody', 'Diabody', ['diabody', 'bispecific fragment', 'dart', 'antibody fragment', 'vh-vl'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#e8724a' },
    (c) => domain(30, 30, 12, 16, c.primary, -25) + domain(50, 38, 12, 16, shade(c.accent, 0.4), 25) + domain(52, 62, 12, 16, c.accent, -25) + domain(32, 70, 12, 16, c.secondary, 25)
      + `<path d="M40 44 Q46 50 42 56 M58 50 Q52 46 46 52" fill="none" stroke="#9aa5b1" stroke-width="2" stroke-dasharray="2.6 2" stroke-linecap="round"/>`, { w: 80, h: 100, size: 50 }),
  ab('dvd-ig', 'DVD-Ig (dual-variable-domain)', ['dvd-ig', 'dual variable domain', 'bispecific', 'tetravalent', 'antibody'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#e8724a' },
    (c) => {
      let extra = '';
      [-1, 1].forEach((sx) => {
        const dx = 0.6 * sx, dy = -0.8, nx = 0.8 * sx, ny = 0.6, rot = 36.87 * sx;
        const h = [dx * 55, dy * 55 - 6], l = [h[0] + nx * 15, h[1] + ny * 15];
        extra += line(dx * 45, dy * 45 - 6, h[0], h[1], dark(c.accent, 0.2), 3) + domain(h[0], h[1], 8, 11.5, c.accent, rot) + domain(l[0], l[1], 7.4, 10.6, shade(c.accent, 0.35), rot);
      });
      return g(50, 66, 0, 0.78, igg(c) + extra);
    }, { w: 100, h: 110, size: 75 }),
  ab('immunocytokine', 'Immunocytokine', ['immunocytokine', 'antibody-cytokine fusion', 'il-2 fusion', 'cytokine fusion', 'antibody'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#f39a3d' },
    (c) => g(50, 40, 0, 0.82, igg(c) + `<path d="M-8 47 V54 M8 47 V54" stroke="#9aa5b1" stroke-width="2" stroke-dasharray="2 1.6"/>` + cytokine(-12, 66, c.accent, 0.8) + cytokine(12, 66, c.accent, 0.8)), { w: 100, h: 110, size: 75, roles: { primary: 'Heavy chain', secondary: 'Light chain', accent: 'Cytokine' } }),
  ab('immune-complex', 'Immune complex', ['immune complex', 'antigen-antibody complex', 'opsonization', 'complement activation', 'crosslinking'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#e8724a' },
    (c, u) => {
      let s = glob(u, 'ag', 50, 50, 15, 14, c.accent, 4);
      [[50, 14, 180], [86, 52, -90], [50, 86, 0], [14, 50, 90]].forEach(([x, y, a]) => { s += g(x, y, a, 0.4, igg(c)); });
      return s + gloss(44, 44, 4, 3, 0.5);
    }, { roles: { primary: 'Heavy chain', secondary: 'Light chain', accent: 'Antigen' } }),
  ab('trispecific-antibody', 'Trispecific antibody', ['trispecific', 'multispecific', 't cell engager', 'antibody', 'cd3', 'cd28'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#e8724a' },
    (c) => g(50, 44, 0, 0.9, igg(c, { armB: { h: c.accent, l: shade(c.accent, 0.45) } }) + `<path d="M8 47 Q12 56 20 58" fill="none" stroke="#9aa5b1" stroke-width="2" stroke-dasharray="2 1.6"/>` + domain(26, 62, 7, 9, '#4fb0a0', -60) + domain(36, 72, 6.6, 8.6, shade('#4fb0a0', 0.35), -60)), { w: 100, h: 100 }),
  ab('neutralizing-antibody', 'Neutralizing antibodies on a virus', ['neutralizing antibody', 'neutralization', 'virus', 'spike', 'antiviral', 'vaccine response', 'nab'], { primary: '#3f7fd9', secondary: '#8cc3f5', accent: '#e85d5d' },
    (c, u) => {
      let s = virion(u, 50, 68, 22, c.accent);
      [[18, 40, 125], [50, 24, 180], [82, 40, -125]].forEach(([x, y, a]) => { s += g(x, y, a, 0.46, igg(c)); });
      return s;
    }, { roles: { primary: 'Heavy chain', secondary: 'Light chain', accent: 'Virus' } }),

  // ---- signaling ---------------------------------------------------------------------------------
  sg('g-protein', 'Heterotrimeric G protein', ['g protein', 'gpcr signaling', 'g alpha', 'g beta gamma', 'gtp', 'gdp', 'gs', 'gi', 'gq'], { primary: '#e8724a', secondary: '#5aa7e6', accent: '#7fd36b' },
    (c, u) => {
      let s = membraneStrip(0, 100, 14, 16);
      s += glob(u, 'a', 34, 46, 18, 16, c.primary, 3) + glob(u, 'b', 64, 50, 16, 15, c.secondary, 5) + glob(u, 'g', 72, 30, 8, 7, c.accent, 7);
      s += `<path d="M30 30 V20 M74 23 V18" stroke="#7b8794" stroke-width="1.6"/>` + ion(30, 52, 5, '#f39a3d', '') + label(30, 66, 'GDP', '#b8651c', 6);
      return s + label(34, 40, 'α', '#fff', 8) + label(64, 52, 'β', '#fff', 8) + label(72, 32.6, 'γ', '#fff', 6);
    }, { w: 100, h: 72, roles: { primary: 'Gα', secondary: 'Gβ', accent: 'Gγ' }, anchor: [50, 14] }),
  sg('ras', 'Ras (small GTPase)', ['ras', 'kras', 'nras', 'small gtpase', 'gtp', 'oncogene', 'mapk pathway'], { primary: '#4fb0a0', secondary: '#f39a3d', accent: '#e8504a' },
    (c, u) => membraneStrip(0, 80, 12, 16) + `<path d="M40 20 V30" stroke="#7b8794" stroke-width="1.6"/>` + glob(u, 'r', 40, 48, 22, 18, c.primary, 4) + ion(48, 52, 5.6, c.secondary, '') + label(48, 66, 'GTP', dark(c.secondary, 0.4), 6) + gloss(32, 40, 6, 3, 0.45),
    { w: 80, h: 72, roles: { primary: 'Ras', secondary: 'GTP', accent: 'Accent' }, anchor: [40, 12] }),
  sg('kinase-cascade', 'Kinase cascade (MAPK)', ['mapk', 'kinase cascade', 'raf', 'mek', 'erk', 'phosphorylation cascade', 'signal transduction'], { primary: '#5b6bd6', secondary: '#8e7cc3', accent: '#f39a3d' },
    (c, u) => {
      let s = '';
      [[26, 16, c.primary, 'RAF'], [50, 50, c.secondary, 'MEK'], [74, 84, shade(c.primary, 0.15), 'ERK']].forEach(([x, y, col, t], i) => { s += glob(u, `k${i}`, x, y, 16, 12, col, i + 3) + label(x, y + 2.4, t, '#fff', 7) + ion(x + 15, y - 9, 4, c.accent, 'P'); });
      return s + arrow(36, 28, 44, 38, '#52606d') + arrow(60, 62, 68, 72, '#52606d');
    }, { roles: { primary: 'Kinases', secondary: 'Middle kinase', accent: 'Phosphate' } }),
  sg('nf-kb', 'NF-κB (p65/p50 with IκB)', ['nf-kb', 'nfkb', 'p65', 'rela', 'p50', 'ikb', 'inflammation', 'transcription factor'], { primary: '#e85d75', secondary: '#f5a3b3', accent: '#8e7cc3' },
    (c, u) => glob(u, 'p65', 34, 56, 18, 20, c.primary, 3) + glob(u, 'p50', 64, 58, 16, 18, c.secondary, 5)
      + path('M18 30 Q50 14 82 30 Q84 38 76 38 Q50 26 24 38 Q16 38 18 30Z', c.accent, dark(c.accent, 0.42), 1.4) + label(34, 60, 'p65', '#fff', 7) + label(64, 62, 'p50', dark(c.secondary, 0.5), 7) + label(50, 30, 'IκBα', '#fff', 6),
    { roles: { primary: 'p65 (RelA)', secondary: 'p50', accent: 'IκB' } }),
  sg('stat-dimer', 'Phosphorylated STAT dimer', ['stat', 'stat3', 'stat1', 'stat5', 'jak-stat', 'transcription factor', 'cytokine signaling'], { primary: '#f39a3d', secondary: '#f8c48f', accent: '#e8504a' },
    (c, u) => glob(u, 'a', 34, 50, 16, 26, c.primary, 3) + glob(u, 'b', 66, 50, 16, 26, c.secondary, 5)
      + `<path d="M44 40 Q50 50 56 60 M56 40 Q50 50 44 60" stroke="${dark(c.primary, 0.3)}" stroke-width="2.4" stroke-linecap="round"/>` + ion(44, 40, 4.4, c.accent, 'P') + ion(56, 40, 4.4, c.accent, 'P') + gloss(28, 34, 4, 7, 0.45) + gloss(60, 34, 4, 7, 0.45),
    { roles: { primary: 'STAT 1', secondary: 'STAT 2', accent: 'Phosphate' } }),
];
