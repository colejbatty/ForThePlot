// More specialized human cell types: eye, teeth, tendon, glia, thymic and lymph node stroma, and others.

import { sphere, defs, path, circle, ellipse, rect, gloss, dark, light, shade, n, rng, vesicle, smooth, line, nucleusDetail, speckle } from './kit.js';
import { lymphocyte } from './cells.js';
import { cellCat, makeCell, round, box, outline, poly, spindle, stellate, pack, lipid, brush, cilia, spots } from './cellkit.js';
import { colCell } from './cells-epi.js';

const C = (cat, extra) => cellCat(cat, extra);
const tall = { w: 60, h: 100, size: 70, shape: 'rect' };

export const moreCells = [
  C('Immune cells', { body: 0.8 })('ilc2', 'Group 2 innate lymphoid cell (ILC2)', ['ilc2', 'innate lymphoid', 'type 2 immunity', 'il-5', 'il-13', 'allergy', 'helminth'], { primary: '#f6c37a', secondary: '#8a4a1c', accent: '#d9534f' },
    (c, u) => lymphocyte(c, u, { seed: 81, granules: 4, nucleus: [53, 54, 25, 24], organelles: 3 })),
  C('Immune cells', { size: 130 })('thymic-epithelial-cell', 'Thymic epithelial cell (TEC)', ['tec', 'thymic epithelial', 'mtec', 'ctec', 'aire', 'negative selection', 'thymus'], { primary: '#c6dcae', secondary: '#45632c', accent: '#8a6fd1' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 18, ry: 15, seed: 31,
      arms: [{ a: -140, len: 30, w: 8, depth: 1 }, { a: -60, len: 28, w: 8, depth: 1 }, { a: 10, len: 30, w: 8, depth: 1 }, { a: 80, len: 26, w: 7, depth: 1 }, { a: 150, len: 28, w: 7, depth: 1 }],
      nuclei: [{ cx: 50, cy: 50, rx: 10, ry: 9, seed: 4, nucleolus: 'big', chroma: 0.6 }], mito: 1, ves: 1,
      extraUnder: (ctx) => {
        // thymocytes nestled between the epithelial processes
        let s = '';
        [[22, 26], [80, 28], [82, 76], [20, 74], [52, 88], [50, 12]].forEach(([x, y], i) => { const g = sphere(u, `t${i}`, '#9cc0ef', { hi: 0.45 }); s += defs(g) + circle(x, y, 8, g.url, dark('#9cc0ef', 0.42), 1.2) + circle(x + 0.6, y + 0.6, 5.6, '#4a5fb0', 'none', 0, ' opacity="0.8"') + circle(x - 2.4, y - 2.6, 1.6, '#fff', 'none', 0, ' opacity="0.55"'); });
        return s;
      },
      armOver: (ctx, list) => list.slice(0, 5).map((b) => { const p = b.spines[0][2]; return rect(p[0] - 1.6, p[1] - 1.6, 3.2, 3.2, 0.8, c.accent, dark(c.accent, 0.4), 0.6); }).join(''),
    }), { roles: { primary: 'Epithelial cell', secondary: 'Nucleus', accent: 'Desmosomes' } }),
  C('Connective tissue cells')('hev-endothelial-cell', 'High endothelial venule cell (HEV)', ['hev', 'high endothelial venule', 'pnad', 'lymphocyte homing', 'lymph node', 'endothelium'], { primary: '#f2b8b8', secondary: '#8a2f3e', accent: '#7ba7ec' },
    (c, u) => {
      let s = '';
      s += colCell(c, u, { x: 10, top: 18, w: 50, h: 44, r: 12, bulgeTop: 6, nuc: { y: 0.55, rx: 13, ry: 11 }, mito: 2, ves: 3, seed: 21, vesColor: light(c.accent, 0.35) });
      const g = sphere(u, 'ly', c.accent, { hi: 0.45 });
      return s + defs(g) + circle(60, 22, 9, g.url, dark(c.accent, 0.42), 1.2) + circle(60.6, 22.6, 6.4, '#3c5fb4', 'none', 0, ' opacity="0.85"') + circle(57, 19, 1.8, '#fff', 'none', 0, ' opacity="0.6"');
    }, { w: 70, h: 70, size: 70, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Homing lymphocyte' } }),
  C('Nervous system cells', { size: 120 })('satellite-glial-cell', 'Satellite glial cell', ['satellite glia', 'satellite glial cell', 'sensory ganglion', 'drg', 'glia', 'pns'], { primary: '#9fd6c4', secondary: '#2f6b5a', accent: '#f2c14e' },
    (c, u) => {
      const ng = sphere(u, 'nr', c.accent, { hi: 0.45 });
      let s = defs(ng) + circle(50, 50, 28, ng.url, dark(c.accent, 0.42), 1.6) + nucleusDetail(u, 'nn', smooth([[42, 50], [44, 42], [52, 40], [58, 46], [58, 54], [50, 58], [44, 56]]), { cx: 50, cy: 49, rx: 8, ry: 8 }, '#7a5216', { seed: 3, nucleolus: 'big', chroma: 0.5, sw: 1.1 });
      // flattened glia hugging the neuron soma
      [0, 1, 2, 3, 4].forEach((i) => {
        const a0 = i * 72 + 8, a1 = a0 + 62, R = 33;
        const P = (a, r) => [50 + Math.cos((a * Math.PI) / 180) * r, 50 + Math.sin((a * Math.PI) / 180) * r];
        const pts = [P(a0, R - 3), P((a0 + a1) / 2, R - 3.4), P(a1, R - 3), P(a1 - 4, R + 3), P((a0 + a1) / 2, R + 6), P(a0 + 4, R + 3)];
        const nm = P((a0 + a1) / 2, R + 1.4);
        s += makeCell(c, `${u}g${i}`, { shape: { ...round(nm[0], nm[1], 10, 4), d: smooth(pts, 0.9), pts }, nuclei: [{ cx: nm[0], cy: nm[1], rx: 6, ry: 2.6, rot: (a0 + a1) / 2 + 90, seed: i + 3, nucleolus: false, sw: 0.8 }], mito: 0, ves: 0, texture: 3, gloss: false, sw: 1.4 });
      });
      return s + gloss(40, 36, 8, 4, 0.4, -35);
    }, { roles: { primary: 'Glial cells', secondary: 'Nuclei', accent: 'Neuron' } }),
  C('Sensory cells')('muller-glia', 'Müller glia', ['muller glia', 'müller cell', 'retina', 'radial glia', 'retinal glia'], { primary: '#b7d98f', secondary: '#45632c', accent: '#8fb04a' },
    (c, u) => {
      const sh = outline([[12, 4], [28, 4], [24, 14], [24, 40], [30, 48], [30, 62], [24, 70], [24, 88], [34, 96], [6, 96], [16, 88], [16, 70], [10, 62], [10, 48], [16, 40], [16, 14]], 0.9);
      return makeCell(c, u, { shape: sh, under: brush(13, 27, 5, 4, c.primary, { w: 1.6, gap: 1.2 }), nuclei: [{ cx: 20, cy: 55, rx: 6.5, ry: 8.5, seed: 4 }], mito: 2, ves: 0, seed: 33, mitoLen: 4.4, margin: 1.6, mitoAlign: 90, gloss: [17, 46, 1.6, 4, 0],
        inside: `<g stroke="${dark(c.primary, 0.25)}" stroke-width="0.8" opacity="0.5"><path d="M18 16 V38 M22 16 V38 M18 72 V88 M22 72 V88"/></g>` });
    }, { w: 40, h: 100, size: 60, shape: 'rect' }),
  C('Sensory cells')('lens-fiber-cell', 'Lens fiber cell', ['lens fiber', 'lens', 'crystallin', 'cataract', 'eye', 'anucleate'], { primary: '#d6ecf7', secondary: '#7fa9c9', accent: '#ffffff' },
    (c, u) => {
      // long hexagonal-section ribbons, packed; the cut ends show the hexagons
      let s = '';
      [[14, 0], [32, 1], [50, 2]].forEach(([y, k]) => {
        const g = sphere(u, `f${k}`, c.primary, { cx: 30, cy: 20, r: 120, hi: 0.4, lo: -0.1 });
        s += defs(g) + path(`M10 ${y} L104 ${y} L110 ${y + 7} L104 ${y + 14} L10 ${y + 14} L4 ${y + 7} Z`, g.url, dark(c.secondary, 0.25), 1.2) + `<path d="M12 ${y + 3} H100" stroke="${c.accent}" stroke-width="1.6" opacity="0.7" stroke-linecap="round"/>`;
        for (let x = 20; x < 104; x += 14) s += `<path d="M${x} ${y + 1} q2 6 0 12" fill="none" stroke="${dark(c.secondary, 0.1)}" stroke-width="0.6" opacity="0.5"/>`;
      });
      return s;
    }, { w: 114, h: 70, size: 120, shape: 'rect', roles: { primary: 'Fiber', secondary: 'Edges', accent: 'Sheen' } }),
  C('Sensory cells')('corneal-endothelial-cell', 'Corneal endothelium', ['corneal endothelium', 'cornea', 'hexagonal cells', 'fuchs dystrophy', 'eye'], { primary: '#cfe2f3', secondary: '#4a6fa5', accent: '#ffffff' },
    (c, u) => {
      let s = '';
      const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => [cx + Math.cos((i * 60 + 30) * Math.PI / 180) * r, cy + Math.sin((i * 60 + 30) * Math.PI / 180) * r]);
      const R = 15.6;
      let k = 0;
      for (let row = -1; row <= 1; row++) for (let col = -1; col <= 1; col++) {
        const cx = 50 + col * R * 1.732 + (row % 2 ? R * 0.866 : 0), cy = 50 + row * R * 1.5;
        if (cx < 20 || cx > 80) continue;
        const pts = hex(cx, cy, R - 0.6);
        s += makeCell(c, `${u}h${k}`, { shape: { d: `M${pts.map((p) => p.map(n).join(' ')).join(' L')}Z`, pts, cx, cy, rx: R, ry: R }, nuclei: [{ cx, cy, rx: 5.4, ry: 5, seed: k + 3, sw: 0.9, nucleolus: false }], mito: 2, ves: 0, mitoLen: 4, margin: 1.6, texture: 4, seed: k + 5, sw: 1.4, gloss: [cx - 5, cy - 6, 3, 1.6, -20] });
        k++;
      }
      return s;
    }, { roles: { primary: 'Cells', secondary: 'Nuclei', accent: 'Sheen' } }),
  C('Skin & epithelial cells')('odontoblast', 'Odontoblast', ['odontoblast', 'dentin', 'tooth', 'dentinal tubule', 'dental pulp'], { primary: '#f2d0b8', secondary: '#7a4a32', accent: '#f4ecd8' },
    (c, u) => {
      const dg = sphere(u, 'd', c.accent, { cx: 40, cy: 10, hi: 0.2, lo: -0.08 });
      let s = defs(dg) + rect(2, 2, 56, 22, 4, dg.url, dark(c.accent, 0.3), 1) + `<path d="M30 24 V4" stroke="${dark(c.primary, 0.42)}" stroke-width="3.4" stroke-linecap="round"/><path d="M30 24 V4" stroke="${c.primary}" stroke-width="1.8" stroke-linecap="round"/>`;
      s += `<path d="M8 8 H52 M8 14 H52 M8 20 H52" stroke="${dark(c.accent, 0.12)}" stroke-width="0.8" opacity="0.6"/>`;
      return s + colCell(c, u, { x: 14, w: 32, top: 26, h: 70, r: 7, taper: 0.06, nuc: { y: 0.78, rx: 9, ry: 10 }, mito: 3, ves: 2, seed: 41, er: { a0: 200, a1: 340, count: 2, gap: 3, start: 2.4 } });
    }, { ...tall, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Dentin' } }),
  C('Skin & epithelial cells')('ameloblast', 'Ameloblast', ['ameloblast', 'enamel', 'tooth', 'amelogenesis', "tomes' process"], { primary: '#c9d8f0', secondary: '#33529e', accent: '#fbf6ea' },
    (c, u) => {
      const eg = sphere(u, 'e', c.accent, { cx: 40, cy: 10, hi: 0.3, lo: -0.06 });
      let s = defs(eg) + path('M2 2 H58 V14 L38 14 L34 22 L26 22 L22 14 L2 14 Z', eg.url, dark(c.accent, 0.3), 1);
      s += `<g stroke="${dark(c.accent, 0.12)}" stroke-width="0.8" opacity="0.7"><path d="M8 4 l-3 8 M14 4 l-3 8 M20 4 l-3 8 M40 4 l3 8 M46 4 l3 8 M52 4 l3 8"/></g>`;
      return s + colCell(c, u, { x: 12, w: 36, top: 18, h: 78, r: 6, taper: 0.1, nuc: { y: 0.8, rx: 9, ry: 9 }, mito: 4, ves: 3, seed: 43, under: path('M26 22 L30 14 L34 22 Z', c.primary, dark(c.primary, 0.42), 1),
        apicalGran: { count: 6, r: 1.8, frac: 0.35, color: light(c.accent, 0.1) } });
    }, { ...tall, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Enamel' } }),
  C('Connective tissue cells')('tenocyte', 'Tenocyte', ['tenocyte', 'tendon', 'tendon cell', 'scleraxis', 'collagen i', 'ligament'], { primary: '#e9b48a', secondary: '#7b3b1d', accent: '#f6e2d0' },
    (c, u) => {
      // flattened cells in rows between parallel collagen bundles
      let s = '';
      [10, 40, 70].forEach((y, i) => { const g = sphere(u, `b${i}`, c.accent, { cx: 30, cy: 10, r: 120, hi: 0.3, lo: -0.12 }); s += defs(g) + rect(2, y - 8, 116, 15, 7.5, g.url, dark(c.accent, 0.3), 1) + `<path d="M6 ${y - 3} Q30 ${y - 5} 60 ${y - 3} T114 ${y - 3} M6 ${y + 2} Q40 ${y} 70 ${y + 2} T114 ${y + 2}" fill="none" stroke="${dark(c.accent, 0.15)}" stroke-width="0.8" opacity="0.7"/>`; });
      [[30, 25], [86, 25], [56, 55]].forEach(([x, y], i) => { s += makeCell(c, `${u}c${i}`, { shape: spindle(x, y, 44, 9, { seed: i + 3, blunt: 0.1 }), nuclei: [{ cx: x, cy: y, rx: 11, ry: 2.8, seed: i + 4, nucleolus: false, sw: 0.9 }], mito: 0, ves: 0, texture: 4, gloss: [x - 8, y - 2.4, 8, 1, -2] }); });
      return s;
    }, { w: 120, h: 80, size: 130, shape: 'rect', roles: { primary: 'Tenocytes', secondary: 'Nuclei', accent: 'Collagen bundles' } }),
  C('Endocrine cells')('parathyroid-chief-cell', 'Parathyroid chief cell', ['parathyroid', 'chief cell', 'pth', 'parathyroid hormone', 'calcium', 'endocrine'], { primary: '#f0d0e0', secondary: '#6a2a5a', accent: '#b05a8a' },
    (c, u) => makeCell(c, u, { shape: poly(50, 50, 36, 6, { rot: 0, seed: 21 }), nuclei: [{ cx: 50, cy: 50, rx: 12, ry: 12, seed: 21 }], mito: 3, ves: 0, seed: 101, mitoLen: 6,
      lipids: [{ x: 32, y: 34, r: 3 }], gran: { count: 12, r: 1.4, core: true, margin: 2.4 } }), { size: 90 }),
  C('Endocrine cells')('pinealocyte', 'Pinealocyte', ['pinealocyte', 'pineal gland', 'melatonin', 'circadian', 'endocrine'], { primary: '#d9cdea', secondary: '#4b3f80', accent: '#8f6fd6' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 46, rx: 18, ry: 16, seed: 35,
      arms: [{ a: -150, len: 26, w: 5, depth: 0 }, { a: -40, len: 24, w: 5, depth: 0 }, { a: 60, len: 30, w: 4.6, depth: 0 }, { a: 140, len: 26, w: 4.6, depth: 0 }],
      nuclei: [{ cx: 50, cy: 46, rx: 10, ry: 9, seed: 4, wobble: 0.14, nucleolus: 'big' }], mito: 2, ves: 1,
      armOver: (ctx, list) => list.slice(0, 4).map((b) => { const p = b.spines[0], [x, y] = p[p.length - 1]; return circle(x, y, 3.2, light(c.primary, 0.1), dark(c.primary, 0.42), 1.1) + circle(x, y, 1.3, c.accent); }).join(''),
    })),
  C('Digestive cells', { size: 130 })('interstitial-cell-of-cajal', 'Interstitial cell of Cajal', ['icc', 'interstitial cell of cajal', 'pacemaker', 'gut motility', 'kit', 'peristalsis'], { primary: '#f3b38a', secondary: '#7a3b1d', accent: '#e86a5a' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 16, ry: 10, seed: 37,
      arms: [{ a: 180, len: 34, w: 6, depth: 2, spread: 40 }, { a: 0, len: 34, w: 6, depth: 2, spread: 40 }, { a: -90, len: 24, w: 4.6, depth: 1 }, { a: 90, len: 24, w: 4.6, depth: 1 }],
      nuclei: [{ cx: 50, cy: 50, rx: 10, ry: 5.4, seed: 4 }], mito: 1, ves: 0,
    })),
  C('Digestive cells')('foveolar-cell', 'Gastric foveolar (surface mucous) cell', ['foveolar', 'surface mucous cell', 'gastric pit', 'mucus', 'stomach', 'muc5ac'], { primary: '#f2cdb0', secondary: '#6d3a6b', accent: '#e4ecf6' },
    (c, u) => colCell(c, u, { top: 12, h: 84, nuc: { y: 0.8, rx: 10, ry: 9 }, mito: 2, ves: 0, seed: 45, keep: [{ cx: 30, cy: 34, rx: 20, ry: 20 }],
      mid: (ctx) => pack(round(30, 34, 19, 20, { seed: 2 }), [], 12, { rmin: 2, rmax: 5, seed: 7, margin: 0.4, gap: 0.4 }).map((p) => circle(p.x, p.y, p.r, c.accent, dark(c.accent, 0.3), 0.6) + circle(p.x - p.r * 0.3, p.y - p.r * 0.32, p.r * 0.3, '#fff', 'none', 0, ' opacity="0.8"')).join('') }), { ...tall, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Mucin granules' } }),
  C('Reproductive cells')('mammary-luminal-cell', 'Mammary luminal cell (lactocyte)', ['mammary', 'lactocyte', 'luminal epithelial', 'milk', 'breast', 'lactation'], { primary: '#f5c6d0', secondary: '#7a2e48', accent: '#fdf3d8' },
    (c, u) => colCell(c, u, { x: 8, top: 14, w: 54, h: 50, r: 9, bulgeTop: 4, nuc: { y: 0.68, rx: 11, ry: 9 }, mito: 3, ves: 4, seed: 47, vesColor: '#fde6c0', apical: 'short', apLen: 3,
      lipids: [{ x: 26, y: 26, r: 5 }, { x: 44, y: 24, r: 3.6 }, { x: 52, y: 6, r: 4.6 }], lipidColor: c.accent }), { w: 70, h: 70, size: 70, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Milk lipid' } }),
  C('Connective tissue cells')('endothelial-tip-cell', 'Endothelial tip cell', ['tip cell', 'angiogenesis', 'sprouting', 'vegf', 'filopodia', 'endothelial'], { primary: '#f2b8b8', secondary: '#8a2f3e', accent: '#d9534f' },
    (c, u) => stellate(c, u, {
      cx: 40, cy: 50, rx: 26, ry: 13, seed: 39,
      arms: [{ a: 180, len: 30, w: 16, depth: 0, bend: 0.02 }, ...[-50, -25, 0, 25, 50].map((a) => ({ a, len: 40, w: 3, depth: 1, spread: 30, bend: 0.5 }))],
      nuclei: [{ cx: 38, cy: 50, rx: 12, ry: 7.5, seed: 4 }], mito: 2, ves: 1,
    }), { size: 130 }),
];
