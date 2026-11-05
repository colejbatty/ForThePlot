// Immunology depth: cell states and subsets, signaling molecules, innate immunity,
// more receptors, and mouse experiment procedures.

import { sphere, defs, blob, radial, path, circle, ellipse, rect, line, gloss, speckle, ring, miniY, dark, light, shade, rng, n, smooth, smoothOpen, domain, membraneStrip, rim, membrane, nucleusDetail, mito, vesicle, granules, helix } from './kit.js';
import { lymphocyte, surfaceYs, immuneCells } from './cells.js';
import { stalked, tm } from './molecules.js';
import { organisms } from './lab.js';

const CELL_ROLES = { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Granules / receptors' };
const cellIcon = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Immune cells', tags, colors, roles: CELL_ROLES, shape: 'ellipse', size: 110, body: 0.8, draw, ...extra });
const variant = (baseId, id, name, tags, colors, extra = {}) => {
  const base = immuneCells.find((c) => c.id === baseId);
  return { ...base, id, name, tags, colors, ...extra };
};

// small inhibitory receptor "lollipops" around a cell
function lollipops(count, colors, r = 38, len = 9) {
  return ring(50, 50, r - 1, r - 1, count, 0.3).map((p, i) => {
    const c = colors[i % colors.length];
    const x2 = 50 + Math.cos(p.a) * (r + len), y2 = 50 + Math.sin(p.a) * (r + len);
    return line(p.x, p.y, x2, y2, dark(c, 0.2), 2.2) + circle(x2, y2, 3.4, c, dark(c, 0.35), 0.9);
  }).join('');
}

export const cellStates = [
  cellIcon('t-cell-activated', 'Activated T cell (blast)', ['activated', 'effector', 'blast', 'proliferating', 'cd69', 'cd25', 't cell'], { primary: '#4f9be8', secondary: '#5a78c8', accent: '#f6c945' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      const R = rng(19);
      const radii = Array.from({ length: 22 }, (_, i) => 41 + (i % 2 ? 3 : -1) + R() * 3);
      const body = radial(50, 52, radii, { tension: 1.1 });
      let s = defs(g);
      // activation sparks
      s += `<g stroke="${dark(c.accent, 0.2)}" stroke-width="4.2" stroke-linecap="round"><path d="M80 12 l6 -7 M86 22 l9 -3 M72 6 l2 -8"/></g>`;
      s += `<g stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round"><path d="M80 12 l6 -7 M86 22 l9 -3 M72 6 l2 -8"/></g>`;
      s += path(body, g.url);
      // busy cytoplasm: free ribosomes, mitochondria, vesicles
      s += speckle(50, 52, 36, 36, 60, 0.8, dark(c.primary, 0.4), 4, 0.45);
      s += mito(28, 38, 9, -50, light(c.accent, 0.1)) + mito(72, 34, 8, 40, light(c.accent, 0.1)) + mito(70, 76, 8, 130, light(c.accent, 0.1)) + mito(28, 70, 8, -120, light(c.accent, 0.1));
      s += vesicle(40, 26, 2.4, light(c.primary, 0.35)) + vesicle(80, 54, 2.2, light(c.primary, 0.35)) + vesicle(50, 82, 2.2, light(c.primary, 0.35));
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      const nd = blob(50, 54, 24, 22, { n: 9, wobble: 0.06, seed: 5 });
      s += nucleusDetail(u, 'n', nd, { cx: 50, cy: 54, rx: 24, ry: 22 }, c.secondary, { seed: 7, nucleolus: 'big', chroma: 0.5, hi: 0.5 });
      return s + gloss(32, 30, 12, 6, 0.45);
    }, { size: 120 }),
  cellIcon('t-cell-exhausted', 'Exhausted T cell', ['exhausted', 'dysfunctional', 'tex', 'pd-1 high', 'tim-3', 'lag-3', 'tox', 'chronic infection', 't cell'], { primary: '#8fa7ba', secondary: '#3f566e', accent: '#e8724a' },
    (c, u) => lymphocyte(c, u, { seed: 61, r: 37, nucleus: [52, 53, 25, 24], villi: 0, organelles: 2, surface: lollipops(9, [c.accent, '#c95fc0', '#8c6bd6'], 37) })),
  cellIcon('t-cell-dying', 'Dying T cell (apoptotic)', ['apoptosis', 'activation-induced cell death', 'aicd', 'dying', 'dead', 't cell', 'fas'], { primary: '#9ab8d8', secondary: '#3c5fb4', accent: '#9ab8d8' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 80 });
      const body = radial(46, 50, [31, 36, 29, 35, 28, 34, 30, 37, 29, 33, 28, 36], { tension: 1.3 });
      let s = defs(g) + path(body, g.url);
      s += speckle(46, 50, 26, 26, 14, 1.4, dark(c.primary, 0.3), 3, 0.4);
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2);
      // condensed, fragmented chromatin (pyknosis / karyorrhexis)
      const frag = (x, y, r, i) => {
        const fg = sphere(u, `f${i}`, c.secondary, { hi: 0.3, lo: -0.3 });
        return defs(fg) + circle(x, y, r, fg.url, dark(c.secondary, 0.45), 1.1) + circle(x - r * 0.3, y - r * 0.32, r * 0.3, '#fff', 'none', 0, ' opacity="0.45"');
      };
      [[40, 46, 6], [52, 42, 5], [50, 56, 6.5], [38, 58, 4]].forEach(([x, y, r], i) => { s += frag(x, y, r, i); });
      // apoptotic bodies budding off
      [[86, 28, 7], [90, 48, 5], [80, 74, 8]].forEach(([x, y, r], i) => {
        const d = blob(x, y, r, r, { n: 8, wobble: 0.05, seed: i + 2 });
        s += path(d, g.url) + rim(u, `ar${i}`, d, c.primary, { op: 0.25 }) + membrane(d, c.primary, 1.4) + frag(x - r * 0.1, y + r * 0.1, r * 0.38, `a${i}`);
      });
      return s + gloss(32, 30, 8, 4, 0.4);
    }),
  cellIcon('t-cell-dividing', 'Dividing T cell', ['dividing', 'proliferation', 'mitosis', 'clonal expansion', 'cytokinesis', 'ki-67', 't cell'], { primary: '#62a8ea', secondary: '#3c5fb4', accent: '#f1a340' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      // one outline around two daughter cells pinched by the cleavage furrow
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const x = Math.cos(a), y = Math.sin(a);
        const pinch = 1 - 0.32 * Math.exp(-((x * x) / 0.06));
        pts.push([50 + x * 47, 50 + y * 30 * pinch]);
      }
      const body = smooth(pts);
      let s = defs(g) + path(body, g.url);
      s += speckle(50, 50, 40, 22, 30, 0.8, dark(c.primary, 0.4), 4, 0.4);
      s += `<path d="M50 30 q-3 20 0 40" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="1.4" opacity="0.6"/>`;
      s += mito(26, 30, 7, -30, light(c.accent, 0.1)) + mito(74, 70, 7, 150, light(c.accent, 0.1));
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      const left = blob(29, 52, 14, 13, { n: 8, wobble: 0.06, seed: 2 }), right = blob(71, 52, 14, 13, { n: 8, wobble: 0.06, seed: 9 });
      s += nucleusDetail(u, 'nl', left, { cx: 29, cy: 52, rx: 14, ry: 13 }, c.secondary, { seed: 2, chroma: 0.7 });
      s += nucleusDetail(u, 'nr', right, { cx: 71, cy: 52, rx: 14, ry: 13 }, c.secondary, { seed: 9, chroma: 0.7 });
      return s + gloss(24, 34, 8, 4, 0.45) + gloss(62, 34, 8, 4, 0.45);
    }, { w: 100, h: 100, size: 130, body: 0.6 }),
  cellIcon('t-cell-migrating', 'Migrating T cell', ['migration', 'chemotaxis', 'polarized', 'uropod', 'lamellipodium', 'trafficking', 'extravasation', 't cell'], { primary: '#62a8ea', secondary: '#3c5fb4', accent: '#f1a340' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cx: 65, cy: 35, r: 80 });
      const body = smooth([[8, 50], [16, 42], [30, 34], [50, 22], [72, 16], [90, 20], [104, 30], [112, 44], [108, 52], [114, 60], [104, 70], [86, 80], [62, 80], [40, 70], [24, 60], [14, 60]]);
      let s = defs(g);
      // uropod microvilli at the rear
      s += `<g stroke="${dark(c.primary, 0.3)}" stroke-width="2.6" stroke-linecap="round"><path d="M10 48 l-6 -3 M9 55 l-7 1 M13 61 l-5 4"/></g>`;
      s += `<g stroke="${c.primary}" stroke-width="1.4" stroke-linecap="round"><path d="M10 48 l-6 -3 M9 55 l-7 1 M13 61 l-5 4"/></g>`;
      s += path(body, g.url);
      // lamellipodium: a pale, ruffled leading edge
      s += `<path d="M76 18 Q100 20 110 40 Q114 52 112 58 Q110 70 92 78 Q100 60 98 48 Q96 30 76 18Z" fill="${light(c.primary, 0.4)}" opacity="0.55"/>`;
      for (let i = 0; i < 5; i++) s += `<path d="M${96 + i * 2.6} ${26 + i * 10} q5 4 2 9" fill="none" stroke="${light(c.primary, 0.55)}" stroke-width="1.2" opacity="0.8" stroke-linecap="round"/>`;
      s += mito(70, 36, 8, 10, light(c.accent, 0.1)) + mito(74, 66, 7, -20, light(c.accent, 0.1)) + vesicle(86, 50, 2.2, light(c.primary, 0.35)) + vesicle(30, 50, 2, light(c.primary, 0.35));
      s += rim(u, 'br', body, c.primary, { cx: 40 });
      s += membrane(body, c.primary, 2.2);
      const nd = blob(46, 52, 18, 15, { n: 8, wobble: 0.08, seed: 4 });
      s += nucleusDetail(u, 'n', nd, { cx: 46, cy: 52, rx: 18, ry: 15 }, c.secondary, { seed: 4 });
      s += `<path d="M98 26 l6 -4 M108 40 l7 -1 M106 64 l6 4" stroke="${dark(c.primary, 0.2)}" stroke-width="2" stroke-linecap="round"/>`;
      return s + gloss(78, 30, 13, 5.5, 0.45, -10);
    }, { w: 120, h: 90, size: 130, body: 0.75 }),
  variant('t-cell-cd4', 'th1-cell', 'Th1 cell', ['th1', 't-bet', 'ifn-gamma', 'type 1', 'helper', 'cd4', 't cell'], { primary: '#ee7b6e', secondary: '#8a2f3e', accent: '#f6c945' }),
  variant('t-cell-cd4', 'th2-cell', 'Th2 cell', ['th2', 'gata3', 'il-4', 'il-13', 'type 2', 'allergy', 'helper', 'cd4', 't cell'], { primary: '#f2c14e', secondary: '#9a6a12', accent: '#e8724a' }),
  variant('t-cell-cd4', 'th17-cell', 'Th17 cell', ['th17', 'rorgt', 'il-17', 'type 3', 'helper', 'cd4', 't cell'], { primary: '#f39a3d', secondary: '#8a4a12', accent: '#f6c945' }),
  variant('t-cell-cd4', 'tfh-cell', 'T follicular helper (Tfh) cell', ['tfh', 'bcl6', 'cxcr5', 'germinal center', 'il-21', 'helper', 'cd4', 't cell'], { primary: '#4fc3d9', secondary: '#1f6f86', accent: '#f6c945' }),
  variant('t-cell', 'gd-t-cell', 'γδ T cell', ['gamma delta', 'gd t', 'unconventional', 'innate-like', 'tcr gd', 't cell'], { primary: '#a3c95f', secondary: '#4f6f1f', accent: '#f1a340' }),
  variant('t-cell', 'mait-cell', 'MAIT cell', ['mait', 'mr1', 'unconventional', 'innate-like', 'mucosal', 't cell'], { primary: '#f08bb4', secondary: '#8a2f5e', accent: '#f6c945' }),
  variant('nk-cell', 'ilc', 'Innate lymphoid cell (ILC)', ['ilc', 'ilc1', 'ilc2', 'ilc3', 'innate lymphoid', 'tissue resident'], { primary: '#d39be0', secondary: '#6b3c8e', accent: '#8c3fa0' }),
  variant('b-cell', 'memory-b-cell', 'Memory B cell', ['memory b', 'cd27', 'class switched', 'b cell'], { primary: '#f7d08a', secondary: '#a8661c', accent: '#d4573f' }),
  cellIcon('gc-b-cell', 'Germinal center B cell', ['germinal center', 'gc b', 'centroblast', 'centrocyte', 'somatic hypermutation', 'aid', 'b cell'], { primary: '#f2b54f', secondary: '#7d4a12', accent: '#d4573f' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      const body = blob(50, 50, 42, 41, { n: 28, wobble: 0.025, seed: 33 });
      let s = defs(g) + surfaceYs(6, c.accent, dark(c.accent), { r: 41, size: 10 }) + path(body, g.url);
      s += speckle(50, 50, 38, 38, 40, 0.8, dark(c.primary, 0.38), 4, 0.45);
      s += mito(24, 36, 7, -60, light(c.primary, 0.3)) + mito(76, 66, 7, 120, light(c.primary, 0.3));
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      const nd = blob(51, 52, 30, 28, { n: 10, wobble: 0.05, seed: 34 });
      s += nucleusDetail(u, 'n', nd, { cx: 51, cy: 52, rx: 30, ry: 28 }, light(c.secondary, 0.15), { seed: 34, nucleolus: 'big', chroma: 0.6, hi: 0.5 });
      s += circle(42, 60, 3.4, dark(c.secondary, 0.1), 'none', 0, ' opacity="0.8"');
      return s + gloss(32, 26, 11, 5.5, 0.45);
    }, { size: 120 }),
  variant('macrophage', 'm1-macrophage', 'M1 macrophage', ['m1', 'classically activated', 'inflammatory', 'ifn-gamma', 'lps', 'macrophage'], { primary: '#e57373', secondary: '#7b1f2a', accent: '#fde0dc' }),
  variant('macrophage', 'm2-macrophage', 'M2 macrophage', ['m2', 'alternatively activated', 'tam', 'il-4', 'repair', 'macrophage'], { primary: '#6fbfa0', secondary: '#1f5f4a', accent: '#e0f4ec' }),
  cellIcon('neutrophil-net', 'Neutrophil NETosis', ['net', 'netosis', 'neutrophil extracellular trap', 'dna web', 'neutrophil', 'innate'], { primary: '#f4b6c4', secondary: '#6b3c8e', accent: '#d58aa5' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      let s = defs(g);
      const R = rng(8);
      let strands = '', beads = '';
      for (let i = 0; i < 10; i++) {
        const a = -0.95 + i * 0.21;
        const pts = Array.from({ length: 6 }, (_, k) => {
          const d = 26 + k * 13;
          return [40 + Math.cos(a) * d + (R() - 0.5) * 8, 50 + Math.sin(a) * d + (R() - 0.5) * 8];
        });
        const d = smoothOpen(pts);
        strands += `<path d="${d}" stroke="${dark(c.secondary, 0.2)}" stroke-width="2.2"/><path d="${d}" stroke="${light(c.secondary, 0.25)}" stroke-width="0.9" opacity="0.8"/>`;
        pts.slice(2).forEach(([x, y]) => { beads += circle(x, y, 1.9, c.accent, dark(c.accent, 0.35), 0.5); });
        // fine cross-links between strands
        if (i) strands += `<path d="M${n(pts[3][0])} ${n(pts[3][1])} L${n(pts[3][0] - 6)} ${n(pts[3][1] - 10)}" stroke="${c.secondary}" stroke-width="0.7" opacity="0.6"/>`;
      }
      s += `<g fill="none" stroke-linecap="round" opacity="0.9">${strands}</g>${beads}`;
      const body = radial(38, 50, [30, 33, 30, 34, 31, 26, 22, 26, 30, 33], { tension: 1.1 });
      s += path(body, g.url);
      s += speckle(36, 50, 22, 24, 30, 0.9, c.accent, 5, 0.8);
      s += rim(u, 'br', body, c.primary);
      s += membrane(body, c.primary, 2.2);
      s += nucleusDetail(u, 'n1', blob(32, 46, 8, 8, { n: 7, wobble: 0.1, seed: 1 }), { cx: 32, cy: 46, rx: 8, ry: 8 }, c.secondary, { seed: 1, nucleolus: false, chroma: 0.5, sw: 1.2 });
      s += nucleusDetail(u, 'n2', blob(40, 58, 6, 6, { n: 7, wobble: 0.1, seed: 2 }), { cx: 40, cy: 58, rx: 6, ry: 6 }, c.secondary, { seed: 2, nucleolus: false, chroma: 0.5, sw: 1.2 });
      return s + gloss(28, 32, 8, 4, 0.4);
    }, { w: 130, h: 100, size: 140, body: 0.5 }),
];

// ---- signaling ---------------------------------------------------------------------

const SIG_ROLES = { primary: 'Protein', secondary: 'Detail', accent: 'Accent' };
const sig = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Signaling', tags, colors, roles: SIG_ROLES, draw, size: 60, shape: 'ellipse', ...extra });

function pGlyph(cx, cy, r, fill, ink) {
  // a phosphate: circle with a drawn "P"
  return circle(cx, cy, r, dark(fill, 0.12), dark(fill, 0.42), r * 0.1)
    + circle(cx - r * 0.05, cy - r * 0.06, r * 0.8, fill)
    + `<path d="M${n(cx - r * 0.62)} ${n(cy - r * 0.3)} A${n(r * 0.7)} ${n(r * 0.7)} 0 0 1 ${n(cx + r * 0.2)} ${n(cy - r * 0.68)}" fill="none" stroke="#fff" stroke-width="${n(r * 0.12)}" stroke-linecap="round" opacity="0.6"/>`
    + `<path d="M${n(cx - r * 0.28)} ${n(cy + r * 0.5)} V${n(cy - r * 0.5)} H${n(cx + r * 0.08)} a${n(r * 0.28)} ${n(r * 0.26)} 0 0 1 0 ${n(r * 0.52)} H${n(cx - r * 0.28)}" fill="none" stroke="${ink}" stroke-width="${n(r * 0.2)}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

export const signaling = [
  sig('kinase', 'Kinase', ['kinase', 'lck', 'zap-70', 'syk', 'btk', 'jak', 'pi3k', 'akt', 'mapk', 'erk', 'pkc', 'itk', 'enzyme'], { primary: '#5b6bd6', secondary: '#a7b0ef', accent: '#f6c945' },
    (c, u) => {
      const a = sphere(u, 'a', c.secondary), b = sphere(u, 'b', c.primary);
      const nl = blob(46, 32, 26, 18, { n: 8, wobble: 0.1, seed: 4 }), cl = blob(52, 66, 38, 26, { n: 9, wobble: 0.08, seed: 7 });
      let s = defs(a, b) + path(cl, b.url);
      s += helix(34, 56, 8, 20, light(c.primary, 0.12), { rot: -70, sw: 1, turns: 3 }) + helix(50, 66, 8, 24, light(c.primary, 0.08), { rot: -80, sw: 1, turns: 4 });
      s += rim(u, 'rc', cl, c.primary, { op: 0.3 }) + `<path d="${cl}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>`;
      s += path(nl, a.url);
      for (let i = 0; i < 3; i++) s += `<path d="M${28 + i * 2} ${38 - i * 7} q14 -6 30 2" fill="none" stroke="${dark(c.secondary, 0.25)}" stroke-width="3.4" stroke-linecap="round" opacity="0.55"/>`;
      s += rim(u, 'rn', nl, c.secondary, { op: 0.28 }) + `<path d="${nl}" fill="none" stroke="${dark(c.secondary, 0.45)}" stroke-width="2"/>`;
      // ATP in the cleft between the lobes
      s += ellipse(70, 47, 9, 5, dark(c.primary, 0.45)) + `<g fill="#f39a3d" stroke="${dark('#f39a3d', 0.4)}" stroke-width="0.7">${circle(64, 47, 2.2, '#f39a3d')}${circle(69, 47, 2, '#f6c945')}${circle(73.5, 47, 2, '#f6c945')}</g>`;
      return s + gloss(36, 26, 8, 3.6, 0.45) + gloss(40, 60, 10, 4, 0.35) + pGlyph(80, 24, 10, c.accent, dark(c.accent, 0.6));
    }, { roles: { primary: 'C-lobe', secondary: 'N-lobe', accent: 'Phosphate' } }),
  sig('transcription-factor', 'Transcription factor on DNA', ['transcription factor', 'nf-kb', 'nfat', 'ap-1', 'stat', 'irf', 'foxp3', 't-bet', 'gata3', 'rorgt', 'bcl6', 'tox', 'nucleus', 'gene expression'], { primary: '#c95fc0', secondary: '#e8a6e2', accent: '#4a8fe7' },
    (c, u) => {
      const a = sphere(u, 'a', c.primary), b = sphere(u, 'b', c.secondary);
      let s = defs(a, b);
      // B-DNA: two backbones winding around each other, base pairs between
      const wave = (ph) => { let d = ''; for (let x = 2; x <= 118; x += 2) { const y = 79 + Math.sin((x / 116) * Math.PI * 4 + ph) * 7; d += `${x === 2 ? 'M' : 'L'}${x} ${n(y)} `; } return d; };
      for (let x = 6; x < 116; x += 4.5) {
        const y1 = 79 + Math.sin((x / 116) * Math.PI * 4) * 7, y2 = 79 + Math.sin((x / 116) * Math.PI * 4 + Math.PI) * 7;
        s += line(x, y1, x, (y1 + y2) / 2, '#f6c945', 1.8) + line(x, (y1 + y2) / 2, x, y2, '#6abf59', 1.8);
      }
      s += `<path d="${wave(Math.PI)}" fill="none" stroke="${dark('#e85d5d', 0.3)}" stroke-width="4.6" stroke-linecap="round"/><path d="${wave(Math.PI)}" fill="none" stroke="#e85d5d" stroke-width="3" stroke-linecap="round"/>`;
      s += `<path d="${wave(0)}" fill="none" stroke="${dark(c.accent, 0.3)}" stroke-width="4.6" stroke-linecap="round"/><path d="${wave(0)}" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>`;
      const d1 = blob(42, 46, 26, 26, { n: 8, wobble: 0.1, seed: 2 }), d2 = blob(76, 48, 24, 24, { n: 8, wobble: 0.1, seed: 6 });
      s += path(d1, a.url) + helix(34, 54, 9, 24, light(c.primary, 0.15), { rot: 80, sw: 1, turns: 4 }) + rim(u, 'r1', d1, c.primary, { op: 0.28 }) + `<path d="${d1}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>`;
      s += path(d2, b.url) + helix(70, 54, 9, 22, light(c.secondary, 0.15), { rot: 100, sw: 1, turns: 4 }) + rim(u, 'r2', d2, c.secondary, { op: 0.28 }) + `<path d="${d2}" fill="none" stroke="${dark(c.secondary, 0.45)}" stroke-width="2"/>`;
      return s + gloss(32, 32, 9, 4.5, 0.45) + gloss(68, 36, 8, 4, 0.45);
    }, { w: 120, h: 92, size: 90, shape: 'rect', roles: { primary: 'Subunit 1', secondary: 'Subunit 2', accent: 'DNA' } }),
  sig('phosphate', 'Phosphate (P)', ['phosphate', 'phosphorylation', 'p', 'phospho', 'itam', 'ptm'], { primary: '#f6c945', secondary: '#7a5a00' },
    (c) => pGlyph(50, 50, 42, c.primary, c.secondary), { size: 28 }),
  sig('calcium', 'Calcium ions (Ca²⁺)', ['calcium', 'ca2+', 'ion', 'second messenger', 'flux', 'store-operated', 'crac'], { primary: '#6cc3e8', secondary: '#1f6f86' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      let s = defs(g);
      [[30, 34], [62, 26], [74, 60], [40, 68], [52, 48]].forEach(([x, y]) => {
        s += circle(x, y, 15, c.primary, 'none', 0, ' opacity="0.18"') + circle(x, y, 11, g.url, dark(c.primary, 0.42), 1.4) + line(x - 5, y, x + 5, y, c.secondary, 2.4) + line(x, y - 5, x, y + 5, c.secondary, 2.4) + gloss(x - 4, y - 5, 3.4, 1.8, 0.6);
      });
      return s;
    }, { size: 50 }),
  sig('adaptor-protein', 'Adaptor / scaffold protein', ['adaptor', 'scaffold', 'lat', 'slp-76', 'myd88', 'grb2', 'signalosome'], { primary: '#2fa58f', secondary: '#9be0cf', accent: '#f6c945' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cy: 25 });
      const d = 'M18 38 H102 Q114 38 114 50 Q114 62 102 62 H18 Q6 62 6 50 Q6 38 18 38Z';
      let s = defs(g) + path(d, g.url) + rim(u, 'r', d, c.primary, { op: 0.3, from: 0.5 }) + `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>`;
      s += `<path d="M14 44 H106" stroke="${light(c.primary, 0.45)}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>`;
      [26, 52, 78, 100].forEach((x) => { s += domain(x, 37, 7.5, 6.5, c.secondary); });
      s += line(52, 30, 52, 26, dark(c.accent, 0.4), 1.6) + line(100, 30, 100, 26, dark(c.accent, 0.4), 1.6);
      return s + pGlyph(52, 18, 9, c.accent, dark(c.accent, 0.6)) + pGlyph(100, 18, 9, c.accent, dark(c.accent, 0.6));
    }, { w: 120, h: 70, size: 90, shape: 'rect' }),
];

// ---- innate immunity ------------------------------------------------------------------

const innate = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Innate immunity', tags, colors, roles: { primary: 'Main', secondary: 'Secondary', accent: 'Accent' }, draw, size: 80, ...extra });

export const innateIcons = [
  innate('c1q', 'Complement C1q', ['c1q', 'complement', 'classical pathway', 'c1', 'opsonization'], { primary: '#8c6bd6', secondary: '#c3b3ef' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      let s = defs(g);
      s += helix(44, 62, 12, 34, c.secondary, { sw: 1.6, turns: 7 });
      for (let i = 0; i < 6; i++) {
        const a = (-150 + i * 24) * Math.PI / 180;
        const x = 50 + Math.cos(a) * 40, y = 62 + Math.sin(a) * 46;
        const d = `M50 64 Q${n(50 + Math.cos(a) * 18)} ${n(62 + Math.sin(a) * 18 + 6)} ${n(x)} ${n(y)}`;
        s += `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.4)}" stroke-width="4.2"/><path d="${d}" fill="none" stroke="${c.secondary}" stroke-width="2.2" stroke-dasharray="2 1.6"/>`;
        // globular head: three subdomains
        s += circle(x, y, 9, g.url, dark(c.primary, 0.42), 1.6);
        s += `<path d="M${n(x)} ${n(y)} L${n(x)} ${n(y - 8.5)} M${n(x)} ${n(y)} L${n(x - 7.4)} ${n(y + 4.3)} M${n(x)} ${n(y)} L${n(x + 7.4)} ${n(y + 4.3)}" stroke="${dark(c.primary, 0.3)}" stroke-width="1" opacity="0.6"/>`;
        s += gloss(x - 3, y - 3.4, 3, 1.8, 0.55);
      }
      return s;
    }),
  innate('mac-pore', 'Membrane attack complex', ['mac', 'membrane attack complex', 'c5b-9', 'complement', 'lysis', 'pore', 'c9'], { primary: '#e85d5d', secondary: '#f3c27a', accent: '#c98a4b' },
    (c) => {
      let s = membraneStrip(0, 36, 50, 28, c.secondary, c.accent) + membraneStrip(64, 100, 50, 28, c.secondary, c.accent);
      for (let i = 0; i < 6; i++) {
        const x = 36 + i * 5.6;
        s += helix(x - 2.6, 22 - (i % 2) * 2, 5.2, 58 + (i % 2) * 2, i % 2 ? shade(c.primary, 0.2) : c.primary, { sw: 0.9, turns: 9 });
      }
      return s;
    }, { w: 100, h: 92, size: 90, shape: 'rect' }),
  innate('inflammasome', 'Inflammasome (NLRP3)', ['inflammasome', 'nlrp3', 'asc', 'caspase-1', 'il-1b', 'pyroptosis', 'gasdermin', 'innate'], { primary: '#f39a3d', secondary: '#e85d5d', accent: '#5b6bd6' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary);
      let s = defs(g);
      ring(50, 50, 30, 30, 8).forEach((p) => {
        s += domain(p.x, p.y, 9, 14, c.primary, n((p.a * 180) / Math.PI + 90));
        s += domain(50 + Math.cos(p.a) * 18, 50 + Math.sin(p.a) * 18, 4.5, 4, light(c.primary, 0.2));
      });
      s += circle(50, 50, 14, c.secondary, dark(c.secondary, 0.42), 1.6) + circle(49, 49, 11, light(c.secondary, 0.12));
      ring(50, 50, 7, 7, 5).forEach((p) => { s += circle(p.x, p.y, 3, c.accent, dark(c.accent, 0.4), 0.7) + circle(p.x - 0.8, p.y - 0.9, 0.9, '#fff', 'none', 0, ' opacity="0.6"'); });
      s += gloss(44, 44, 5, 2.6, 0.45);
      return s;
    }, { shape: 'ellipse' }),
];

// ---- more receptors --------------------------------------------------------------------

const REC_ROLES = { primary: 'Chain 1', secondary: 'Chain 2', accent: 'Ligand / signaling' };
const rec = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Receptors & ligands', tags, colors, roles: REC_ROLES, draw, w: 40, h: 100, size: 40, ...extra });

export const moreReceptors = [
  rec('tim-3', 'TIM-3', ['tim-3', 'havcr2', 'checkpoint', 'inhibitory receptor', 'exhaustion', 'galectin-9'], { primary: '#c95fc0', secondary: '#e8b0e2', accent: '#f6c945' },
    (c) => stalked(20, 4, [[11, 13]], c.primary, { stalk: 30 }) + `<path d="M20 34 v22" stroke="${c.secondary}" stroke-width="3" stroke-dasharray="2 2.5"/>`, { anchor: [20, 66] }),
  rec('lag-3', 'LAG-3', ['lag-3', 'cd223', 'checkpoint', 'inhibitory receptor', 'exhaustion', 'mhc ii'], { primary: '#8c6bd6', secondary: '#c3b3ef', accent: '#f6c945' },
    (c) => stalked(18, 2, [[9, 10], [8.5, 9.5, shade(c.primary, 0.12)], [8.5, 9.5], [8.5, 9.5, shade(c.primary, 0.12)]], c.primary, { stalk: 4 }), { w: 36, h: 120, size: 36, anchor: [18, 83] }),
  rec('tigit', 'TIGIT', ['tigit', 'checkpoint', 'inhibitory receptor', 'cd155', 'pvr', 'nk'], { primary: '#2fa58f', secondary: '#9be0cf', accent: '#f6c945' },
    (c) => stalked(20, 6, [[11, 14]], c.primary, { stalk: 24 }), { anchor: [20, 64] }),
  rec('cd40', 'CD40', ['cd40', 'tnfr', 'costimulation', 'b cell', 'apc', 'licensing'], { primary: '#f39a3d', secondary: '#f8c48f', accent: '#f6c945' },
    (c) => stalked(20, 4, [[8, 7], [8, 7, shade(c.primary, 0.15)], [8, 7], [8, 7, shade(c.primary, 0.15)]], c.primary, { stalk: 8 }), { anchor: [20, 68] }),
  rec('cd40l', 'CD40L (CD154)', ['cd40l', 'cd154', 'tnf family', 'trimer', 'helper', 't cell help'], { primary: '#4a8fe7', secondary: '#9cc4f3', accent: '#f6c945' },
    (c) => {
      let s = line(20, 34, 20, 60, dark(c.primary, 0.1), 3) + tm(20, 60, c.primary);
      s += domain(10, 22, 9, 13, c.primary, -12) + domain(30, 22, 9, 13, shade(c.primary, 0.18), 12) + domain(20, 16, 9, 13, shade(c.primary, 0.08));
      return s;
    }, { anchor: [20, 68] }),
  rec('il-2-receptor', 'IL-2 receptor (αβγ)', ['il-2r', 'cd25', 'cd122', 'common gamma chain', 'cd132', 'il-2', 'cytokine receptor', 'treg'], { primary: '#f39a3d', secondary: '#f8c48f', accent: '#5b6bd6' },
    (c) => {
      let s = '';
      s += line(12, 48, 12, 64, dark(c.accent, 0.1), 2.6) + tm(12, 64, c.accent, { tail: 6 });
      s += domain(12, 24, 8, 10, c.accent) + domain(12, 42, 8, 9, shade(c.accent, 0.2));
      s += line(32, 50, 32, 64, dark(c.primary, 0.1), 3) + tm(32, 64, c.primary, { tail: 18 }) + domain(32, 22, 9, 11, c.primary) + domain(32, 42, 9, 10, shade(c.primary, 0.15));
      s += line(50, 50, 50, 64, dark(c.secondary, 0.3), 3) + tm(50, 64, c.secondary, { tail: 18 }) + domain(50, 22, 9, 11, c.secondary) + domain(50, 42, 9, 10, shade(c.secondary, 0.1));
      return s;
    }, { w: 62, h: 100, size: 62, anchor: [31, 72], roles: { primary: 'β chain (CD122)', secondary: 'γc (CD132)', accent: 'α chain (CD25)' } }),
];

// ---- mouse procedures ---------------------------------------------------------------------

const mouseDef = organisms.find((o) => o.id === 'mouse');

/** A small syringe with its needle tip at (x, y), pointing along `angle` degrees. */
function syringe(x, y, angle, s, fill, ink = '#7b8794') {
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)}) scale(${s})">`
    + `<line x1="0" y1="0" x2="-16" y2="0" stroke="${ink}" stroke-width="1.4"/><line x1="-1" y1="-0.4" x2="-15" y2="-0.4" stroke="#ffffff" stroke-width="0.5"/>`
    + `<rect x="-20" y="-2.4" width="4" height="4.8" fill="${ink}"/>`
    + `<rect x="-48" y="-6" width="28" height="12" rx="2" fill="#eef2f7" stroke="${ink}" stroke-width="1.4"/>`
    + `<rect x="-36" y="-4.5" width="15" height="9" fill="${fill}" opacity="0.85"/><rect x="-36" y="-4.5" width="15" height="2.6" fill="${light(fill, 0.4)}" opacity="0.8"/>`
    + `<rect x="-38" y="-4.5" width="2.4" height="9" fill="#52606d"/>`
    + `<line x1="-46" y1="-3.6" x2="-22" y2="-3.6" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>`
    + `<rect x="-56" y="-1.6" width="8" height="3.2" fill="${ink}"/><rect x="-58" y="-7" width="3" height="14" rx="1" fill="${ink}"/>`
    + '</g>';
}

const mouseIcon = (id, name, tags, extraDraw, w = 170) => ({
  id, name, category: 'Organisms', tags, colors: { primary: '#f1f3f5', secondary: '#f4a6b4', accent: '#e85d5d' },
  roles: { primary: 'Fur', secondary: 'Ears / tail / paws', accent: 'Injected / tumor' }, w, h: 120, size: 130, shape: 'rect',
  draw: (c, u) => `<g transform="translate(40 34)">${mouseDef.draw(c, u)}</g>` + extraDraw(c),
});

export const mouseProcedures = [
  mouseIcon('mouse-iv', 'Mouse: intravenous injection (i.v.)', ['iv', 'i.v.', 'intravenous', 'tail vein', 'injection', 'adoptive transfer', 'mouse'], (c) => syringe(52, 99, 0, 0.9, c.accent)),
  mouseIcon('mouse-ip', 'Mouse: intraperitoneal injection (i.p.)', ['ip', 'i.p.', 'intraperitoneal', 'injection', 'antibody treatment', 'mouse'], (c) => syringe(100, 91, -20, 0.9, c.accent)),
  mouseIcon('mouse-sc', 'Mouse: subcutaneous injection (s.c.)', ['sc', 's.c.', 'subcutaneous', 'tumor inoculation', 'injection', 'flank', 'mouse'], (c) => syringe(92, 62, 70, 0.9, c.accent)),
  mouseIcon('mouse-oral', 'Mouse: oral gavage (p.o.)', ['oral', 'p.o.', 'gavage', 'feeding', 'mouse'], (c) => syringe(150, 79, 180, 0.8, c.accent), 200),
  mouseIcon('mouse-tumor', 'Mouse with tumor', ['tumor bearing', 'syngeneic', 'xenograft', 'subcutaneous tumor', 'mc38', 'b16', 'mouse'], (c) => {
    const d = blob(92, 58, 14, 11, { n: 8, wobble: 0.12, seed: 3 });
    return path(d, c.accent, dark(c.accent, 0.42), 1.6) + path(blob(94, 61, 9, 6, { n: 7, wobble: 0.2, seed: 5 }), dark(c.accent, 0.12), 'none', 0, ' opacity="0.6"')
      + `<path d="M84 54 q4 4 8 2 M94 52 q2 4 6 4" fill="none" stroke="${dark(c.accent, 0.35)}" stroke-width="1" opacity="0.7"/>` + gloss(87, 53, 4, 2.2, 0.55);
  }),
];

export const immuno2 = [...cellStates, ...signaling, ...innateIcons, ...moreReceptors, ...mouseProcedures];
