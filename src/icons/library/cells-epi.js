// Epithelial, skin, digestive, respiratory and kidney cell types.

import { sphere, defs, path, circle, ellipse, rect, gloss, dark, light, shade, n, rng, vesicle, smooth, smoothOpen, blob, line, nucleusDetail } from './kit.js';
import { cellCat, makeCell, round, box, outline, poly, spindle, stellate, pack, knobs, lipid, rer, golgi, brush, cilia } from './cellkit.js';

const sk = cellCat('Skin & epithelial cells');
const gi = cellCat('Digestive cells');
const rs = cellCat('Respiratory cells');
const kd = cellCat('Kidney & urinary cells');
const tall = { w: 60, h: 100, size: 70, shape: 'rect' };
const cube = { w: 70, h: 70, size: 70, shape: 'rect' };

/** Columnar / cuboidal epithelial cell with apical specialization and basal nucleus. */
export function colCell(c, u, o) {
  const { x = 7, top = 16, w = 46, h = 80, r = 8, taper = 0, bulgeTop = 0, apical = null, apLen = 11, nuc = {}, seed = 3, apicalGran = null, ...rest } = o;
  const shape = box(x, top, w, h, r, { bulgeTop, taper });
  const ax0 = x + taper * w + 3, ax1 = x + w - taper * w - 3;
  let under = '';
  if (apical === 'brush') under += brush(ax0, ax1, top + 3, apLen, c.accent);
  if (apical === 'cilia') under += cilia(ax0 + 1, ax1 - 1, top + 2, apLen, c.accent, { count: Math.round((ax1 - ax0) / 5), seed });
  if (apical === 'short') under += brush(ax0 + 2, ax1 - 2, top + 3, apLen, c.accent, { w: 2, gap: 2.2 });
  if (rest.under) under += rest.under;
  const gran = apicalGran ? { region: (px, py) => py < top + h * (apicalGran.frac ?? 0.45), margin: (apicalGran.r || 2) + 1, ...apicalGran } : rest.gran;
  return makeCell(c, u, {
    shape, seed, mito: 3, ves: 2, margin: 3,
    nuclei: [{ cx: x + w / 2 + (nuc.dx || 0), cy: top + h * (nuc.y ?? 0.72), rx: nuc.rx ?? 11, ry: nuc.ry ?? 14, seed, nucleolus: nuc.nucleolus ?? true, chroma: nuc.chroma ?? 1 }],
    gloss: [x + w * 0.3, top + 12, 5, 3, -70], ...rest, gran, under,
  });
}

/** Primary (non-motile) cilium standing up from (x, y). */
export const primaryCilium = (x, y, len, c, bend = 6) => {
  const d = `M${x} ${y} Q${x + bend} ${y - len * 0.5} ${x + bend * 0.4} ${y - len}`;
  return `<path d="${d}" fill="none" stroke="${dark(c, 0.42)}" stroke-width="3.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`
    + rect(x - 1.4, y - 1.2, 2.8, 3.4, 1, dark(c, 0.45));
};

/** Lamellar body: a vesicle with concentric surfactant layers. */
const lamellar = (x, y, r, c) => circle(x, y, r, light(c, 0.3), dark(c, 0.35), n(r * 0.16))
  + [0.72, 0.48, 0.26].map((k) => circle(x, y, r * k, 'none', dark(c, 0.2), n(r * 0.1), ' opacity="0.7"')).join('')
  + circle(x - r * 0.35, y - r * 0.38, r * 0.22, '#fff', 'none', 0, ' opacity="0.6"');

export const basement = (x0, x1, y, c) => rect(x0, y, x1 - x0, 3.2, 1.6, light(c, 0.2), dark(c, 0.35), 0.8);

export const epiCells = [
  // ---- skin & generic epithelia -----------------------------------------------------------------
  sk('keratinocyte', 'Keratinocyte', ['keratinocyte', 'epidermis', 'skin', 'spinous', 'desmosome', 'keratin'], { primary: '#f0d2b0', secondary: '#7a4a32', accent: '#c98a5a' },
    (c, u) => {
      const sh = poly(50, 50, 37, 6, { rot: 10, jitter: 0.06, seed: 3 });
      // desmosome "spines" bridging to neighbours
      let sp = '';
      sh.pts.forEach(([x, y], i) => {
        const nx = sh.pts[(i + 1) % sh.pts.length];
        [[x, y], [(x + nx[0]) / 2, (y + nx[1]) / 2]].forEach(([px, py]) => { const L = Math.hypot(px - 50, py - 50), ux = (px - 50) / L, uy = (py - 50) / L; sp += line(px - ux, py - uy, px + ux * 4.6, py + uy * 4.6, dark(c.primary, 0.42), 3.2) + line(px - ux, py - uy, px + ux * 4.6, py + uy * 4.6, c.primary, 1.8) + circle(px + ux * 5.4, py + uy * 5.4, 1.3, dark(c.accent, 0.35)); });
      });
      const R = rng(5);
      let tono = '';
      for (let i = 0; i < 7; i++) { const a = R() * Math.PI; tono += `<path d="M${n(50 + Math.cos(a) * 32)} ${n(50 + Math.sin(a) * 30)} Q${n(50 + Math.cos(a + 1.6) * 22)} ${n(50 + Math.sin(a + 1.6) * 22)} ${n(50 - Math.cos(a) * 32)} ${n(50 - Math.sin(a) * 30)}"/>`; }
      return makeCell(c, u, { shape: sh, under: sp, nuclei: [{ cx: 50, cy: 51, rx: 14, ry: 13, seed: 4 }], mito: 2, ves: 2, seed: 6,
        inside: `<g fill="none" stroke="${c.accent}" stroke-width="1.1" opacity="0.55">${tono}</g>` });
    }),
  sk('corneocyte', 'Corneocyte', ['corneocyte', 'squame', 'stratum corneum', 'cornified', 'skin barrier', 'anucleate'], { primary: '#efe0c4', secondary: '#c9a97a', accent: '#b98f5e' },
    (c, u) => {
      const top = poly(50, 30, 44, 6, { rot: 0, jitter: 0.05, seed: 2, sy: 0.5 });
      const g = sphere(u, 'b', c.primary, { cx: 35, cy: 25, r: 85, hi: 0.35 });
      const side = top.pts.map(([x, y]) => [x, y + 7]);
      let s = defs(g) + path(smooth(side, 0.7), c.secondary, dark(c.secondary, 0.35), 1.6) + path(top.d, g.url, dark(c.secondary, 0.4), 1.6);
      // cornified envelope texture: interlocking keratin ridges
      const R = rng(3);
      let rid = '';
      for (let i = 0; i < 9; i++) { const x = 18 + R() * 64, y = 20 + R() * 20; rid += `M${n(x)} ${n(y)} q${n(4 + R() * 4)} ${n(-2 + R() * 4)} ${n(8 + R() * 6)} ${n(-1 + R() * 2)} `; }
      s += `<path d="${rid}" fill="none" stroke="${c.accent}" stroke-width="1" opacity="0.55" stroke-linecap="round"/>`;
      return s + gloss(32, 22, 14, 3, 0.45, -6);
    }, { w: 100, h: 60, size: 100, shape: 'rect', roles: { primary: 'Surface', secondary: 'Edge', accent: 'Keratin' } }),
  sk('melanocyte', 'Melanocyte', ['melanocyte', 'melanin', 'melanosome', 'pigment', 'skin', 'melanoma', 'dendritic'], { primary: '#ecd3b6', secondary: '#6d4a2e', accent: '#4a2a16' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 56, rx: 18, ry: 15, seed: 5,
      arms: [{ a: -130, len: 36, w: 7, depth: 1 }, { a: -80, len: 38, w: 7.5, depth: 2 }, { a: -30, len: 34, w: 7, depth: 1 }, { a: 20, len: 28, w: 6, depth: 1 }, { a: 170, len: 30, w: 6, depth: 1 }],
      nuclei: [{ cx: 51, cy: 58, rx: 9, ry: 8, seed: 4 }], gran: { count: 16, r: 1.3, glint: 0.3 },
      armOver: (ctx, list) => {
        let s = '';
        list.flatMap((b) => b.spines).forEach((p) => p.slice(2).forEach(([x, y], k) => { s += circle(x + (k % 2 ? 0.8 : -0.8), y, 1.2, c.accent, 'none', 0, ' opacity="0.9"'); }));
        return s;
      },
    }), { size: 130, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Melanosomes' } }),
  sk('merkel-cell', 'Merkel cell', ['merkel cell', 'mechanoreceptor', 'touch', 'merkel disc', 'neuroendocrine', 'skin'], { primary: '#d7c8ea', secondary: '#4e3b80', accent: '#f2c94c' },
    (c, u) => makeCell(c, u, {
      shape: round(50, 40, 30, 24, { seed: 4 }), nuclei: [{ cx: 50, cy: 37, rx: 13, ry: 10, seed: 5, wobble: 0.12 }], mito: 2, ves: 1, seed: 4,
      gran: { count: 12, r: 1.5, core: true, color: dark(c.primary, 0.25), region: (x, y) => y > 46 },
      over: (() => {
        // the Merkel disc: a flattened nerve terminal cupping the cell, and its myelinated axon
        const disc = smooth([[22, 62], [50, 70], [78, 62], [80, 68], [50, 78], [20, 68]]);
        return `<path d="M50 76 Q52 86 48 98" fill="none" stroke="${dark(c.accent, 0.42)}" stroke-width="6" stroke-linecap="round"/><path d="M50 76 Q52 86 48 98" fill="none" stroke="${c.accent}" stroke-width="4" stroke-linecap="round"/>`
          + path(disc, c.accent, dark(c.accent, 0.42), 1.4) + `<path d="M28 65 Q50 72 72 65" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.6"/>`;
      })(),
    }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Nerve terminal' } }),
  sk('sebocyte', 'Sebocyte', ['sebocyte', 'sebaceous gland', 'sebum', 'lipid', 'skin', 'holocrine'], { primary: '#f3dca8', secondary: '#8a5a2b', accent: '#f8e7a0' },
    (c, u) => makeCell(c, u, {
      shape: poly(50, 50, 40, 7, { rot: 5, jitter: 0.05, seed: 6 }), nuclei: [{ cx: 50, cy: 50, rx: 9, ry: 8, seed: 3, wobble: 0.16, nucleolus: false, chroma: 1.3 }],
      mito: 0, ves: 0, texture: 12,
      mid: (ctx) => pack(ctx.sh, ctx.keep, 24, { rmin: 2.2, rmax: 8, seed: 3, margin: 2.4, gap: 0.6 }).map((p) => lipid(p.x, p.y, p.r, c.accent)).join(''),
    }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Lipid' } }),
  sk('squamous-epithelial-cell', 'Squamous epithelial cell', ['squamous', 'simple squamous', 'flat cell', 'epithelium', 'lining'], { primary: '#f2c6a0', secondary: '#7a4b9b', accent: '#e8a07a' },
    (c, u) => makeCell(c, u, {
      shape: outline([[4, 42], [18, 37], [34, 35], [42, 27], [56, 25], [66, 34], [82, 36], [96, 41], [84, 46], [50, 48], [18, 46]]),
      nuclei: [{ cx: 53, cy: 37, rx: 12, ry: 6.5, seed: 3, nucleolus: false }], mito: 2, ves: 1, seed: 3, margin: 2, mitoLen: 6, texture: 10, gloss: [36, 33, 10, 1.6, -4],
    }), { w: 100, h: 60, size: 110, shape: 'rect' }),
  sk('cuboidal-epithelial-cell', 'Cuboidal epithelial cell', ['cuboidal', 'simple cuboidal', 'gland', 'duct', 'epithelium'], { primary: '#f5cfa6', secondary: '#7a4b9b', accent: '#e8a07a' },
    (c, u) => colCell(c, u, { x: 8, top: 10, w: 54, h: 52, r: 9, nuc: { y: 0.52, rx: 12, ry: 12 }, mito: 3, ves: 3, apical: 'short', apLen: 4, seed: 5 }), cube),
  sk('mesothelial-cell', 'Mesothelial cell', ['mesothelium', 'mesothelial', 'pleura', 'peritoneum', 'serosa', 'mesothelioma'], { primary: '#f6d7c3', secondary: '#8b4a6b', accent: '#e9a9a0' },
    (c, u) => {
      const R = rng(4);
      let mv = '';
      for (let x = 10; x < 92; x += 7 + R() * 4) { const y = x < 40 || x > 66 ? 37 : 28; const d = `M${n(x)} ${y} q${n(R() * 4 - 2)} -6 ${n(R() * 4 - 2)} -12`; mv += `<path d="${d}"/>`; }
      const under = `<g fill="none" stroke-linecap="round"><g stroke="${dark(c.accent, 0.4)}" stroke-width="3">${mv}</g><g stroke="${c.accent}" stroke-width="1.6">${mv}</g></g>`;
      return makeCell(c, u, {
        shape: outline([[4, 44], [18, 39], [34, 37], [42, 29], [56, 27], [66, 36], [82, 38], [96, 43], [84, 48], [50, 50], [18, 48]]), under,
        nuclei: [{ cx: 53, cy: 39, rx: 12, ry: 6.5, seed: 4, nucleolus: false }], mito: 2, ves: 1, seed: 4, margin: 2, mitoLen: 6, texture: 10, gloss: [36, 35, 10, 1.6, -4],
      });
    }, { w: 100, h: 60, size: 110, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Microvilli' } }),
  sk('myoepithelial-cell', 'Myoepithelial cell', ['myoepithelial', 'basket cell', 'contractile', 'gland', 'breast', 'salivary', 'alpha-sma'], { primary: '#f0a8b0', secondary: '#7a2e48', accent: '#c4566e' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 24, ry: 11, seed: 6, fit: [100, 100],
      arms: [{ a: 180, len: 30, w: 8, depth: 1, spread: 40 }, { a: 0, len: 30, w: 8, depth: 1, spread: 40 }, { a: -120, len: 24, w: 6, depth: 1 }, { a: 60, len: 24, w: 6, depth: 1 }, { a: -50, len: 20, w: 5, depth: 0 }, { a: 125, len: 20, w: 5, depth: 0 }],
      nuclei: [{ cx: 50, cy: 50, rx: 12, ry: 5.5, seed: 3, nucleolus: false }], mito: 0, ves: 0,
      armOver: (ctx, list) => `<g fill="none" stroke="${c.accent}" stroke-width="0.8" opacity="0.6">${list.flatMap((b) => b.spines).map((p) => `<path d="${smoothOpen(p)}"/>`).join('')}</g>`,
    }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Actin filaments' } }),

  // ---- digestive -----------------------------------------------------------------------------------
  gi('enterocyte', 'Enterocyte', ['enterocyte', 'absorptive cell', 'brush border', 'small intestine', 'villus', 'microvilli', 'chylomicron'], { primary: '#f4c7a4', secondary: '#6d4a9b', accent: '#e7a27c' },
    (c, u) => colCell(c, u, {
      top: 18, apical: 'brush', apLen: 11, mito: 4, ves: 3, seed: 7,
      under: `<path d="M9 4 q4 -2 8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke="${light(c.accent, 0.3)}" stroke-width="1.4" opacity="0.8"/>`,
      mid: lipid(14, 66, 2.4, '#f6d77a') + lipid(46, 70, 2, '#f6d77a') + lipid(15, 78, 1.8, '#f6d77a'),
      over: `<g stroke="${dark(c.primary, 0.5)}" stroke-width="1.6"><path d="M7.4 22 v5 M52.6 22 v5"/></g>`,
    }), tall),
  gi('goblet-cell', 'Goblet cell', ['goblet', 'mucus', 'mucin', 'muc2', 'secretory', 'intestine', 'airway'], { primary: '#f2c6a8', secondary: '#5e3f8f', accent: '#d9e8f5' },
    (c, u) => {
      const sh = outline([[8, 14], [14, 6], [30, 3], [46, 6], [52, 14], [54, 30], [50, 48], [40, 60], [37, 72], [39, 90], [35, 97], [25, 97], [21, 90], [23, 72], [20, 60], [10, 48], [6, 30]]);
      const theca = round(30, 28, 20, 22, { seed: 2 });
      return makeCell(c, u, {
        shape: sh, nuclei: [{ cx: 30, cy: 76, rx: 6.5, ry: 9, seed: 3, nucleolus: false, chroma: 1.3 }], mito: 1, ves: 0, seed: 5, keep: [{ cx: 30, cy: 28, rx: 22, ry: 24 }], texture: 8,
        mid: pack(theca, [], 18, { rmin: 2, rmax: 5.4, seed: 4, margin: 0.4, gap: 0.4 }).map((p) => circle(p.x, p.y, p.r, c.accent, dark(c.accent, 0.3), 0.6) + circle(p.x - p.r * 0.3, p.y - p.r * 0.32, p.r * 0.3, '#fff', 'none', 0, ' opacity="0.8"')).join(''),
        gloss: [18, 14, 6, 3, -40],
      });
    }, { ...tall, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Mucin granules' } }),
  gi('paneth-cell', 'Paneth cell', ['paneth', 'crypt', 'antimicrobial', 'defensin', 'lysozyme', 'small intestine'], { primary: '#d9b8e6', secondary: '#4e3b80', accent: '#ef6a3c' },
    (c, u) => colCell(c, u, { top: 10, h: 86, taper: 0.16, nuc: { y: 0.78, rx: 10, ry: 9 }, mito: 2, ves: 0, seed: 9, er: { a0: 200, a1: 340, count: 3, gap: 3, start: 2.5 },
      apicalGran: { count: 9, r: 3.4, frac: 0.6, core: true } }), tall),
  gi('enteroendocrine-cell', 'Enteroendocrine cell', ['enteroendocrine', 'eec', 'hormone', 'serotonin', 'glp-1', 'cck', 'enterochromaffin', 'gut'], { primary: '#cfe3c4', secondary: '#3f6d4c', accent: '#b5733a' },
    (c, u) => makeCell(c, u, {
      shape: outline([[24, 12], [36, 12], [38, 30], [46, 50], [54, 70], [54, 90], [46, 97], [14, 97], [6, 90], [6, 70], [14, 50], [22, 30]]),
      under: brush(25, 35, 14, 8, c.primary, { w: 2, gap: 1 }),
      nuclei: [{ cx: 30, cy: 56, rx: 9, ry: 11, seed: 4 }], mito: 2, ves: 1, seed: 4,
      gran: { count: 16, r: 1.6, core: true, region: (x, y) => y > 70 }, gloss: [24, 30, 3, 6, -10],
    }), { ...tall, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Hormone granules' } }),
  gi('tuft-cell', 'Tuft cell', ['tuft cell', 'brush cell', 'dclk1', 'il-25', 'chemosensory', 'helminth', 'intestine'], { primary: '#d8d1ef', secondary: '#4b3f8c', accent: '#9e8fd8' },
    (c, u) => makeCell(c, u, {
      shape: outline([[22, 22], [38, 22], [40, 38], [48, 56], [54, 74], [52, 92], [44, 97], [16, 97], [8, 92], [6, 74], [12, 56], [20, 38]]),
      under: brush(22.5, 37.5, 24, 20, c.accent, { w: 2.8, gap: 0.5 }),
      nuclei: [{ cx: 30, cy: 72, rx: 10, ry: 11, seed: 5 }], mito: 3, ves: 4, seed: 7, gloss: [24, 40, 3, 6, -10],
      inside: `<g stroke="${dark(c.accent, 0.15)}" stroke-width="1" opacity="0.5"><path d="M26 24 V44 M30 24 V48 M34 24 V44"/></g>`,
    }), { ...tall, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Tuft' } }),
  gi('m-cell', 'M cell (microfold cell)', ['m cell', 'microfold', 'peyer\'s patch', 'transcytosis', 'follicle-associated epithelium', 'gut immunity'], { primary: '#f3d0b5', secondary: '#6d4a9b', accent: '#5aa7e6' },
    (c, u) => {
      const sh = outline([[8, 18], [40, 13], [72, 18], [74, 44], [73, 97], [58, 97], [57, 74], [48, 64], [32, 64], [23, 74], [22, 97], [7, 97], [6, 44]], 0.9);
      let folds = '';
      for (let x = 12; x < 70; x += 8) folds += `<path d="M${x} 18 q2 -6 4 -2 q2 4 4 -1" />`;
      const lg = sphere(u, 'ly', c.accent, { hi: 0.45 });
      return makeCell(c, u, {
        shape: sh, under: `<g fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2.6" stroke-linecap="round">${folds}</g><g fill="none" stroke="${c.primary}" stroke-width="1.4" stroke-linecap="round">${folds}</g>`,
        nuclei: [{ cx: 40, cy: 38, rx: 13, ry: 8, seed: 6 }], mito: 2, ves: 4, seed: 9, vesColor: light(c.accent, 0.35), keep: [{ cx: 40, cy: 82, rx: 20, ry: 20 }],
        over: defs(lg) + circle(40, 82, 13, lg.url, dark(c.accent, 0.42), 1.6) + nucleusDetail(u, 'ln', smooth([[30, 82], [33, 74], [41, 71], [49, 75], [51, 84], [45, 91], [35, 90]]), { cx: 41, cy: 82, rx: 10, ry: 9 }, '#3c5fb4', { seed: 7, nucleolus: false, sw: 1 })
          + vesicle(30, 52, 2.4, c.accent) + vesicle(52, 54, 2, c.accent),
        gloss: [24, 26, 8, 3, -10],
      });
    }, { w: 80, h: 100, size: 90, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Lymphocyte / cargo' } }),
  gi('intestinal-stem-cell', 'Intestinal stem cell (Lgr5⁺)', ['intestinal stem cell', 'lgr5', 'crypt base columnar', 'cbc', 'crypt', 'stem cell', 'organoid'], { primary: '#a9dcc8', secondary: '#2f7a6e', accent: '#f4b860' },
    (c, u) => colCell(c, u, { x: 13, w: 34, top: 12, h: 84, r: 8, nuc: { y: 0.6, rx: 11, ry: 18, nucleolus: 'big', chroma: 0.6 }, mito: 2, ves: 1, seed: 11,
      over: knobs(30, 54, 18, 44, 10, c.accent, { len: 3, r: 1.5, rot: 0.15 }) }), tall),
  gi('parietal-cell', 'Parietal cell', ['parietal', 'oxyntic', 'gastric acid', 'proton pump', 'h+/k+ atpase', 'intrinsic factor', 'stomach'], { primary: '#f5b49a', secondary: '#7a2e3a', accent: '#f9e3d8' },
    (c, u) => {
      // intracellular canaliculus lined with microvilli, opening at the apex
      const can = 'M50 8 L50 30 Q44 40 34 44 M50 30 Q58 40 68 42 M50 30 L52 46';
      let mv = '';
      [[50, 14], [50, 22], [44, 38], [38, 42], [56, 36], [62, 40], [51, 40]].forEach(([x, y], i) => { mv += `M${x - 3} ${y - (i % 2)} l-2.5 -1.4 M${x + 3} ${y} l2.5 1.2 `; });
      return makeCell(c, u, {
        shape: outline([[50, 6], [76, 16], [90, 42], [88, 72], [70, 92], [32, 92], [12, 72], [10, 42], [24, 16]], 0.95),
        nuclei: [{ cx: 50, cy: 66, rx: 13, ry: 12, seed: 4 }], mito: 12, ves: 0, seed: 12, mitoLen: 8, keep: [{ cx: 50, cy: 32, rx: 20, ry: 16 }],
        mid: `<path d="${can}" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${can}" fill="none" stroke="${c.accent}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${mv}" stroke="${dark(c.primary, 0.3)}" stroke-width="1.1" stroke-linecap="round"/>`,
      });
    }, { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Canaliculus' } }),
  gi('chief-cell', 'Chief cell (gastric)', ['chief cell', 'zymogenic', 'pepsinogen', 'gastric', 'stomach', 'secretory'], { primary: '#c7b6e6', secondary: '#4b2f80', accent: '#7a5ad0' },
    (c, u) => colCell(c, u, { top: 10, h: 86, nuc: { y: 0.8, rx: 11, ry: 9 }, mito: 2, ves: 0, seed: 13, er: { a0: 190, a1: 350, count: 3, gap: 3, start: 2.5 },
      apicalGran: { count: 14, r: 2.6, frac: 0.55 } }), tall),
  gi('hepatocyte', 'Hepatocyte', ['hepatocyte', 'liver cell', 'binucleate', 'glycogen', 'bile canaliculus', 'liver', 'metabolism'], { primary: '#e9a7a0', secondary: '#6e2f45', accent: '#7fb35a' },
    (c, u) => {
      const sh = poly(50, 50, 42, 6, { rot: 0, jitter: 0.05, seed: 8 });
      const canal = [[50, 9.5], [86, 72]].map(([x, y]) => circle(x, y, 3.2, c.accent, dark(c.accent, 0.4), 1) + `<path d="M${x - 4.6} ${y} h-1.6 M${x + 4.6} ${y} h1.6 M${x} ${y - 4.6} v-1.6 M${x} ${y + 4.6} v1.6" stroke="${dark(c.accent, 0.4)}" stroke-width="0.9"/>`).join('');
      const R = rng(9);
      let gly = '';
      for (let i = 0; i < 9; i++) { const x = 20 + R() * 60, y = 20 + R() * 60; if (Math.hypot(x - 40, y - 45) < 14 || Math.hypot(x - 61, y - 57) < 14) continue; for (let k = 0; k < 5; k++) gly += `<circle cx="${n(x + Math.cos(k * 1.26) * 1.6)}" cy="${n(y + Math.sin(k * 1.26) * 1.6)}" r="0.7"/>`; }
      return makeCell(c, u, {
        shape: sh, nuclei: [{ cx: 40, cy: 44, rx: 11, ry: 10.5, seed: 3 }, { cx: 61, cy: 58, rx: 10.5, ry: 10, seed: 5 }], mito: 8, ves: 1, seed: 14, mitoLen: 7,
        lipids: [{ x: 70, y: 32, r: 4.2 }], inside: `<g fill="${dark(c.primary, 0.4)}" opacity="0.55">${gly}</g>`, over: canal,
      });
    }, { roles: { primary: 'Cytoplasm', secondary: 'Nuclei', accent: 'Bile canaliculi' } }),
  gi('cholangiocyte', 'Cholangiocyte', ['cholangiocyte', 'bile duct', 'biliary epithelium', 'primary cilium', 'liver'], { primary: '#bfe0d6', secondary: '#2f6f6a', accent: '#7cc2a8' },
    (c, u) => colCell(c, u, { x: 8, top: 18, w: 54, h: 46, r: 9, nuc: { y: 0.55, rx: 13, ry: 12 }, mito: 2, ves: 2, apical: 'short', apLen: 4, seed: 15,
      under: primaryCilium(35, 18, 16, c.accent) }), cube),
  gi('hepatic-stellate-cell', 'Hepatic stellate cell', ['hepatic stellate', 'ito cell', 'vitamin a', 'fibrosis', 'liver', 'pericyte', 'myofibroblast'], { primary: '#ead8b4', secondary: '#6b4a25', accent: '#f2d16b' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 52, rx: 20, ry: 15, seed: 8,
      arms: [{ a: -150, len: 34, w: 5.5, depth: 2 }, { a: -70, len: 30, w: 5, depth: 2 }, { a: -10, len: 36, w: 5.5, depth: 2 }, { a: 60, len: 28, w: 5, depth: 1 }, { a: 140, len: 30, w: 5, depth: 1 }],
      nuclei: [{ cx: 56, cy: 56, rx: 8, ry: 6.5, seed: 4, nucleolus: false }], mito: 1, ves: 0,
      lipids: [{ x: 41, y: 46, r: 4.6 }, { x: 47, y: 61, r: 3.4 }, { x: 64, y: 45, r: 3 }], lipidColor: c.accent,
    }), { size: 130, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Vitamin A droplets' } }),
  gi('lsec', 'Liver sinusoidal endothelial cell', ['lsec', 'sinusoidal endothelium', 'fenestrae', 'sieve plate', 'liver', 'endothelial'], { primary: '#f0b8b8', secondary: '#8a2f3e', accent: '#fbe9e9' },
    (c, u) => {
      const sh = outline([[4, 34], [16, 22], [38, 14], [60, 12], [84, 16], [114, 26], [104, 38], [80, 46], [52, 50], [24, 46]]);
      const R = rng(6);
      let holes = '';
      [[26, 30], [42, 24], [86, 30], [98, 34], [36, 40]].forEach(([x, y]) => { for (let i = 0; i < 9; i++) holes += `<circle cx="${n(x + (R() - 0.5) * 9)}" cy="${n(y + (R() - 0.5) * 7)}" r="${n(0.8 + R() * 0.7)}"/>`; });
      return makeCell(c, u, { shape: sh, nuclei: [{ cx: 64, cy: 31, rx: 12, ry: 9, seed: 5 }], mito: 2, ves: 0, seed: 6, margin: 2.4, mitoLen: 6,
        inside: `<g fill="${c.accent}" stroke="${dark(c.primary, 0.35)}" stroke-width="0.4">${holes}</g>`, gloss: [40, 20, 14, 2.6, -8] });
    }, { w: 120, h: 60, size: 130, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Fenestrae' } }),
  gi('pancreatic-acinar-cell', 'Pancreatic acinar cell', ['acinar', 'pancreas', 'zymogen', 'exocrine', 'digestive enzymes', 'trypsinogen'], { primary: '#c9b8ea', secondary: '#4b2f80', accent: '#f2a23c' },
    (c, u) => colCell(c, u, { top: 12, h: 84, taper: 0.22, nuc: { y: 0.76, rx: 11, ry: 10 }, mito: 2, ves: 0, seed: 17, er: { a0: 190, a1: 350, count: 3, gap: 3, start: 2.5 },
      golgi: { x: 30, y: 54, rot: 180, s: 9 }, apicalGran: { count: 11, r: 2.8, frac: 0.5, core: true } }), tall),
  gi('pancreatic-ductal-cell', 'Pancreatic ductal cell', ['ductal cell', 'pancreatic duct', 'cftr', 'bicarbonate', 'pancreas', 'pdac'], { primary: '#d0e6f2', secondary: '#3a5b8f', accent: '#78b8d8' },
    (c, u) => colCell(c, u, { x: 8, top: 22, w: 54, h: 40, r: 8, nuc: { y: 0.55, rx: 13, ry: 10 }, mito: 3, ves: 1, apical: 'short', apLen: 3.4, seed: 19,
      under: primaryCilium(40, 22, 14, c.accent, -5) }), cube),

  // ---- respiratory -------------------------------------------------------------------------------
  rs('ciliated-cell', 'Ciliated epithelial cell', ['ciliated', 'multiciliated', 'airway epithelium', 'motile cilia', 'mucociliary', 'foxj1'], { primary: '#bfe0f2', secondary: '#3a5b8f', accent: '#5aa0d8' },
    (c, u) => colCell(c, u, { top: 26, h: 70, apical: 'cilia', apLen: 22, mito: 5, ves: 1, seed: 21, nuc: { y: 0.68 } }), { ...tall, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Cilia' } }),
  rs('club-cell', 'Club cell', ['club cell', 'clara cell', 'scgb1a1', 'cc10', 'bronchiole', 'secretory', 'airway'], { primary: '#f2d6a8', secondary: '#6b4a25', accent: '#e8a73c' },
    (c, u) => colCell(c, u, { top: 22, h: 74, bulgeTop: 14, nuc: { y: 0.7 }, mito: 3, ves: 1, seed: 23, apicalGran: { count: 8, r: 2.4, frac: 0.4 } }), tall),
  rs('airway-basal-cell', 'Airway basal cell', ['basal cell', 'airway stem cell', 'krt5', 'tp63', 'progenitor', 'epithelium'], { primary: '#a9cfe3', secondary: '#2f5f7a', accent: '#c9a0dc' },
    (c, u) => makeCell(c, u, {
      shape: outline([[6, 52], [14, 40], [26, 24], [36, 14], [46, 24], [58, 40], [64, 52]], 0.9), under: basement(2, 68, 52.5, c.accent),
      nuclei: [{ cx: 35, cy: 39, rx: 12, ry: 9, seed: 3 }], mito: 2, ves: 0, seed: 25, margin: 2.4, mitoLen: 6, gloss: [28, 28, 4, 2.4, -50],
    }), { w: 70, h: 60, size: 70, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Basement membrane' } }),
  rs('alveolar-type-1-cell', 'Alveolar type I cell (AT1)', ['at1', 'type i pneumocyte', 'alveolar epithelium', 'gas exchange', 'lung'], { primary: '#f4c3c3', secondary: '#7a3346', accent: '#f9e0e0' },
    (c, u) => makeCell(c, u, {
      shape: outline([[4, 36], [24, 33], [46, 31], [52, 23], [66, 22], [74, 31], [96, 33], [116, 36], [96, 40], [60, 42], [24, 40]]),
      nuclei: [{ cx: 62, cy: 33, rx: 11, ry: 6, seed: 3, nucleolus: false }], mito: 1, ves: 1, seed: 27, margin: 1.8, mitoLen: 5, texture: 8, gloss: [38, 31, 12, 1.4, -2],
    }), { w: 120, h: 60, size: 130, shape: 'rect' }),
  rs('alveolar-type-2-cell', 'Alveolar type II cell (AT2)', ['at2', 'type ii pneumocyte', 'surfactant', 'lamellar body', 'sftpc', 'alveolar stem cell', 'lung'], { primary: '#f2c4a0', secondary: '#7a3b22', accent: '#f6e2c8' },
    (c, u) => {
      const sh = box(8, 20, 54, 44, 14, { bulgeTop: 8 });
      return makeCell(c, u, {
        shape: sh, under: brush(18, 52, 16, 5, c.primary, { w: 2, gap: 2 }), nuclei: [{ cx: 35, cy: 50, rx: 11, ry: 9, seed: 4 }], mito: 2, ves: 0, seed: 29, mitoLen: 6,
        keep: [{ cx: 22, cy: 32, rx: 6, ry: 6 }, { cx: 44, cy: 28, rx: 6, ry: 6 }, { cx: 54, cy: 42, rx: 5, ry: 5 }],
        mid: lamellar(22, 32, 5.6, c.accent) + lamellar(44, 28, 5.4, c.accent) + lamellar(53, 42, 4.4, c.accent), gloss: [20, 22, 6, 2.6, -20],
      });
    }, { ...cube, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Lamellar bodies' } }),
  rs('ionocyte', 'Pulmonary ionocyte', ['ionocyte', 'cftr', 'foxi1', 'chloride', 'cystic fibrosis', 'airway'], { primary: '#b9e3e0', secondary: '#2f6f6a', accent: '#e0607e' },
    (c, u) => colCell(c, u, { top: 18, h: 78, apical: 'short', apLen: 5, mito: 10, ves: 0, seed: 31, mitoLen: 7, nuc: { y: 0.7, rx: 10, ry: 12 },
      over: [14, 22, 30, 38, 46].map((x) => rect(x - 1.6, 15.6, 3.2, 5, 1.2, c.accent, dark(c.accent, 0.4), 0.7)).join('') }), { ...tall, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'CFTR channels' } }),

  // ---- kidney & urinary -----------------------------------------------------------------------
  kd('podocyte', 'Podocyte', ['podocyte', 'glomerulus', 'foot processes', 'slit diaphragm', 'nephrin', 'filtration barrier', 'kidney'], { primary: '#c8b3e8', secondary: '#4b2f80', accent: '#f2b8c6' },
    (c, u) => {
      // major processes reaching the basement membrane, which is covered in interdigitating foot processes
      const legs = 'M36 40 Q24 56 18 74 M50 44 Q50 60 50 74 M64 40 Q76 56 82 74';
      let feet = '';
      for (let x = 8, k = 0; x < 93; x += 5.4, k++) feet += rect(x, 74, 4.2, 9, 2, k % 2 ? c.primary : shade(c.primary, -0.12), dark(c.primary, 0.42), 1);
      const under = basement(4, 96, 83, c.accent) + feet
        + `<path d="${legs}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="10" stroke-linecap="round"/><path d="${legs}" fill="none" stroke="${shade(c.primary, -0.04)}" stroke-width="7" stroke-linecap="round"/>`;
      return makeCell(c, u, { shape: round(50, 30, 22, 17, { seed: 3 }), under, nuclei: [{ cx: 50, cy: 29, rx: 11, ry: 9, seed: 5 }], mito: 2, ves: 1, seed: 33, mitoLen: 6, gloss: [40, 20, 7, 3, -20] });
    }, { roles: { primary: 'Cell', secondary: 'Nucleus', accent: 'Basement membrane' } }),
  kd('proximal-tubule-cell', 'Proximal tubule cell', ['proximal tubule', 'pt cell', 'brush border', 'reabsorption', 'megalin', 'kidney', 'nephron'], { primary: '#f4b8a8', secondary: '#6e2f45', accent: '#f0907a' },
    (c, u) => colCell(c, u, { top: 26, h: 70, apical: 'brush', apLen: 16, nuc: { y: 0.45, rx: 11, ry: 10 }, mito: 6, ves: 3, seed: 35, mitoAlign: 90, mitoLen: 10,
      inside: `<g stroke="${dark(c.primary, 0.3)}" stroke-width="0.9" opacity="0.5"><path d="M14 80 V95 M22 78 V95 M30 80 V95 M38 78 V95 M46 80 V95"/></g>` }), tall),
  kd('principal-cell', 'Principal cell', ['principal cell', 'collecting duct', 'aquaporin-2', 'enac', 'vasopressin', 'kidney'], { primary: '#dbe8f2', secondary: '#3a4f8f', accent: '#4fa3d9' },
    (c, u) => colCell(c, u, { x: 8, top: 18, w: 54, h: 46, r: 9, nuc: { y: 0.55, rx: 12, ry: 11 }, mito: 2, ves: 4, seed: 37, vesColor: light(c.accent, 0.3),
      under: primaryCilium(35, 18, 15, '#9fb4cc'), over: [16, 26, 44, 54].map((x) => rect(x - 1.6, 16, 3.2, 4.6, 1.2, c.accent, dark(c.accent, 0.4), 0.7)).join('') }), { ...cube, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Aquaporins' } }),
  kd('intercalated-cell', 'Intercalated cell', ['intercalated cell', 'acid-base', 'v-atpase', 'proton pump', 'collecting duct', 'kidney'], { primary: '#d9a7b8', secondary: '#5e2a48', accent: '#f2c94c' },
    (c, u) => colCell(c, u, { x: 8, top: 18, w: 54, h: 46, r: 9, nuc: { y: 0.62, rx: 11, ry: 10 }, mito: 8, ves: 4, seed: 39, mitoLen: 6, vesColor: c.accent, apical: 'short', apLen: 5 }), cube),
  kd('mesangial-cell', 'Mesangial cell', ['mesangial', 'glomerulus', 'mesangium', 'contractile', 'kidney'], { primary: '#e8b9a0', secondary: '#6b3423', accent: '#c96f4a' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 22, ry: 17, seed: 11,
      arms: [{ a: -140, len: 22, w: 9, depth: 1 }, { a: -60, len: 20, w: 8, depth: 1 }, { a: 10, len: 24, w: 9, depth: 1 }, { a: 80, len: 18, w: 8, depth: 1 }, { a: 150, len: 22, w: 8, depth: 1 }],
      nuclei: [{ cx: 50, cy: 51, rx: 11, ry: 8, seed: 3 }], mito: 2, ves: 1,
    })),
  kd('juxtaglomerular-cell', 'Juxtaglomerular cell', ['juxtaglomerular', 'jg cell', 'renin', 'granular cell', 'afferent arteriole', 'blood pressure', 'kidney'], { primary: '#f0c4c0', secondary: '#7a2e3a', accent: '#9b59b6' },
    (c, u) => makeCell(c, u, { shape: spindle(50, 50, 90, 44, { seed: 3, blunt: 0.35 }), nuclei: [{ cx: 50, cy: 50, rx: 13, ry: 8, seed: 4 }], mito: 1, ves: 0, seed: 41,
      gran: { count: 12, r: 2.8, core: true, margin: 3.6 }, gloss: [36, 36, 12, 3, -8] }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Renin granules' } }),
  kd('umbrella-cell', 'Umbrella cell', ['umbrella cell', 'urothelium', 'bladder', 'uroplakin', 'transitional epithelium', 'superficial cell'], { primary: '#f3cfb0', secondary: '#7a4b9b', accent: '#d98b5f' },
    (c, u) => {
      const sh = outline([[6, 52], [8, 30], [20, 16], [50, 10], [80, 16], [92, 30], [94, 52], [80, 60], [64, 54], [50, 62], [36, 54], [20, 60]], 0.95);
      // asymmetric unit membrane plaques along the apical surface, fusiform vesicles beneath
      let plaques = '';
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + i * 0.105); const x = 50 + Math.cos(a) * 44, y = 38 + Math.sin(a) * 28; plaques += `<path d="M${n(x - 3)} ${n(y + 1)} Q${n(x)} ${n(y - 1.6)} ${n(x + 3)} ${n(y + 1)}"/>`; }
      const fus = [[30, 24, -20], [44, 20, -5], [58, 21, 8], [70, 26, 22], [38, 30, -10], [62, 30, 12]].map(([x, y, a]) => ellipse(x, y, 4.2, 1.3, light(c.accent, 0.3), dark(c.accent, 0.3), 0.7, ` transform="rotate(${a} ${x} ${y})"`)).join('');
      return makeCell(c, u, {
        shape: sh, nuclei: [{ cx: 34, cy: 42, rx: 10, ry: 8, seed: 3 }, { cx: 64, cy: 42, rx: 10, ry: 8, seed: 5 }], mito: 2, ves: 0, seed: 43, mitoLen: 6, keep: [{ cx: 50, cy: 25, rx: 26, ry: 8 }],
        mid: fus, over: `<g fill="none" stroke="${dark(c.accent, 0.3)}" stroke-width="1.6" stroke-linecap="round">${plaques}</g>`, gloss: [28, 22, 10, 3, -25],
      });
    }, { w: 100, h: 70, size: 110, roles: { primary: 'Cytoplasm', secondary: 'Nuclei', accent: 'Uroplakin plaques' } }),
];
