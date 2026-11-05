// Endocrine and reproductive cells, early embryo stages, mitosis and cell states.

import { sphere, defs, path, circle, ellipse, rect, gloss, dark, light, shade, n, rng, vesicle, smooth, smoothOpen, blob, line, mito, nucleusDetail, rim, membrane, speckle, ring } from './kit.js';
import { cellCat, makeCell, round, box, outline, poly, spindle, pack, lipid, spots, rer, brush } from './cellkit.js';
import { colCell } from './cells-epi.js';

const en = cellCat('Endocrine cells');
const rp = cellCat('Reproductive cells');
const dv = cellCat('Development', { size: 120 });
const gc = cellCat('Cells', { size: 120 });

/** Secretory granules drawn from spots: halo + dense core (insulin, catecholamines…). */
const secretory = (count, { r = 2.2, halo = '#f7f2e6', core, coreK = 0.55, angular = false, seed = 4, region = null } = {}) => (ctx) => {
  const ps = spots(ctx.sh, ctx.keep, count, { margin: r + 1.6, seed, region });
  return ps.map((p, i) => {
    const rr = r * (0.8 + ((i * 31) % 10) / 25), cr = rr * coreK;
    const coreShape = angular
      ? `<rect x="${n(p.x - cr * 0.8)}" y="${n(p.y - cr * 0.8)}" width="${n(cr * 1.6)}" height="${n(cr * 1.6)}" rx="${n(cr * 0.25)}" fill="${core}" transform="rotate(${(i * 37) % 90} ${n(p.x)} ${n(p.y)})"/>`
      : circle(p.x + rr * 0.12, p.y + rr * 0.08, cr, core);
    return circle(p.x, p.y, rr, halo, dark(halo, 0.35), n(rr * 0.18)) + coreShape;
  }).join('');
};

/** X-shaped condensed chromosome (two sister chromatids joined at the centromere). */
function chromo(x, y, s, rot, c) {
  const arm = (a) => `<rect x="${n(-s * 0.16)}" y="${n(-s * 0.5)}" width="${n(s * 0.32)}" height="${n(s)}" rx="${n(s * 0.16)}" transform="rotate(${a})"/>`;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})"><g fill="${c}" stroke="${dark(c, 0.42)}" stroke-width="${n(s * 0.07)}">${arm(-16)}${arm(16)}</g>`
    + `<circle r="${n(s * 0.11)}" fill="${dark(c, 0.35)}"/><path d="M${n(-s * 0.12)} ${n(-s * 0.36)} l${n(s * 0.06)} ${n(s * 0.18)}" stroke="#fff" stroke-width="${n(s * 0.06)}" opacity="0.6" stroke-linecap="round"/></g>`;
}
/** A single chromatid bent into a V (anaphase). */
function chromatid(x, y, s, rot, c) {
  const d = `M${n(-s * 0.3)} ${n(-s * 0.42)} Q0 ${n(s * 0.2)} ${n(s * 0.3)} ${n(-s * 0.42)}`;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})"><path d="${d}" fill="none" stroke="${dark(c, 0.42)}" stroke-width="${n(s * 0.36)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${n(s * 0.24)}" stroke-linecap="round"/><circle cy="${n(-s * 0.06)}" r="${n(s * 0.1)}" fill="${dark(c, 0.35)}"/></g>`;
}
/** Centrosome with an aster of microtubules. */
function aster(x, y, c, r = 7) {
  let rays = '';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; rays += `M${n(x + Math.cos(a) * 2)} ${n(y + Math.sin(a) * 2)} L${n(x + Math.cos(a) * r)} ${n(y + Math.sin(a) * r)} `; }
  return `<path d="${rays}" stroke="${c}" stroke-width="0.8" opacity="0.7" stroke-linecap="round"/>` + circle(x, y, 2.2, c, dark(c, 0.4), 0.7);
}
/** Spindle microtubules from a pole fanning to points. */
const spindleFibers = (px, py, targets, c) => `<path d="${targets.map(([x, y]) => `M${n(px)} ${n(py)} Q${n((px + x) / 2)} ${n((py + y) / 2 + (y - py) * 0.15)} ${n(x)} ${n(y)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="0.8" opacity="0.75"/>`;

/** Zona pellucida + blastomeres for early embryos. */
function embryo(c, u, cells, { zona = 46, extra = '', seed = 3 } = {}) {
  const zg = sphere(u, 'z', c.accent, { hi: 0.4, lo: -0.05 });
  let s = defs(zg) + circle(50, 50, zona, zg.url, dark(c.accent, 0.35), 1.6) + circle(50, 50, zona - 6, light(c.accent, 0.5), dark(c.accent, 0.25), 1);
  s += speckle(50, 50, zona - 2, zona - 2, 40, 0.5, dark(c.accent, 0.18), seed, 0.45);
  s += extra;
  cells.forEach(([x, y, r, rx2], i) => {
    s += makeCell(c, `${u}c${i}`, { shape: round(x, y, r, rx2 || r, { seed: seed + i }), nuclei: r > 9 ? [{ cx: x + r * 0.1, cy: y + r * 0.05, rx: r * 0.34, ry: r * 0.32, seed: i + 2, chroma: 0.6, sw: 1 }] : [], mito: 0, ves: r > 12 ? 3 : 1, vesR: 1.6, vesColor: light(c.primary, 0.3), texture: Math.round(r), seed: seed + i, rimOp: 0.32 });
  });
  return s + gloss(32, 22, 12, 4, 0.5, -35);
}

/** Plant-cell chloroplast with grana stacks. */
export function chloroplast(x, y, len, rot, c) {
  const h = len * 0.5;
  let gr = '';
  [-0.28, 0, 0.28].forEach((k, i) => { for (let j = 0; j < 4; j++) gr += rect(len * k - len * 0.07, -h * 0.28 + j * h * 0.15 + (i % 2) * h * 0.08, len * 0.14, h * 0.1, h * 0.04, dark(c, 0.3)); });
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})">${ellipse(0, 0, len / 2, h / 2, c, dark(c, 0.42), n(h * 0.1))}${ellipse(-len * 0.06, -h * 0.08, len * 0.42, h * 0.36, light(c, 0.15))}${gr}<path d="M${n(-len * 0.38)} 0 H${n(len * 0.38)}" stroke="${dark(c, 0.25)}" stroke-width="${n(h * 0.06)}"/>${ellipse(-len * 0.18, -h * 0.26, len * 0.14, h * 0.08, '#fff', 'none', 0, ' opacity="0.55"')}</g>`;
}

export const otherCells2 = [
  // ---- endocrine -----------------------------------------------------------------------------------
  en('beta-cell', 'Pancreatic β cell', ['beta cell', 'β cell', 'insulin', 'islet of langerhans', 'diabetes', 'pancreas', 'endocrine'], { primary: '#a9d4ea', secondary: '#2f5f8f', accent: '#4a3a6b' },
    (c, u) => makeCell(c, u, { shape: poly(50, 50, 40, 6, { rot: 8, seed: 3 }), nuclei: [{ cx: 50, cy: 50, rx: 12, ry: 11.5, seed: 3 }], mito: 3, ves: 0, seed: 61, mitoLen: 7,
      mid: secretory(16, { r: 2.8, halo: '#f4f1e8', core: c.accent, angular: true, coreK: 0.5 }) }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Insulin granules' } }),
  en('alpha-cell', 'Pancreatic α cell', ['alpha cell', 'α cell', 'glucagon', 'islet of langerhans', 'pancreas', 'endocrine'], { primary: '#f3c6a5', secondary: '#7a3b22', accent: '#8a3a2a' },
    (c, u) => makeCell(c, u, { shape: poly(50, 50, 38, 6, { rot: 22, seed: 5 }), nuclei: [{ cx: 52, cy: 52, rx: 12, ry: 11, seed: 5, wobble: 0.1 }], mito: 3, ves: 0, seed: 63, mitoLen: 7,
      mid: secretory(18, { r: 2.4, halo: '#f6ead8', core: c.accent, coreK: 0.78, seed: 6 }) }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Glucagon granules' } }),
  en('delta-cell', 'Pancreatic δ cell', ['delta cell', 'δ cell', 'somatostatin', 'islet of langerhans', 'pancreas', 'endocrine'], { primary: '#c7e3b6', secondary: '#3f6d2c', accent: '#6f9a4f' },
    (c, u) => makeCell(c, u, { shape: outline([[14, 46], [24, 26], [44, 16], [58, 6], [64, 18], [80, 26], [90, 46], [98, 54], [84, 66], [70, 82], [46, 86], [24, 78], [12, 62]], 0.95), nuclei: [{ cx: 50, cy: 50, rx: 12, ry: 11, seed: 7 }], mito: 3, ves: 0, seed: 65, mitoLen: 7,
      mid: secretory(14, { r: 3, halo: light(c.accent, 0.35), core: light(c.accent, 0.05), coreK: 0.85, seed: 8 }) }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Somatostatin granules' } }),
  en('thyrocyte', 'Thyroid follicular cell', ['thyrocyte', 'thyroid follicular cell', 'thyroglobulin', 'colloid', 't3', 't4', 'thyroid'], { primary: '#f2c4b0', secondary: '#7a2e3a', accent: '#f2b84b' },
    (c, u) => {
      const cg = sphere(u, 'col', c.accent, { cx: 40, cy: 10, r: 120, hi: 0.35 });
      const under = defs(cg) + rect(2, 2, 66, 20, 6, cg.url, dark(c.accent, 0.3), 1) + brush(12, 58, 25, 5, c.primary, { w: 2, gap: 1.8 });
      return colCell(c, u, { x: 8, top: 24, w: 54, h: 42, r: 7, nuc: { y: 0.66, rx: 11, ry: 8 }, mito: 2, ves: 0, seed: 67, under,
        mid: [[20, 32, 2.6], [36, 30, 2.2], [50, 33, 2.4]].map(([x, y, r]) => circle(x, y, r, c.accent, dark(c.accent, 0.35), 0.6) + circle(x - r * 0.3, y - r * 0.3, r * 0.3, '#fff', 'none', 0, ' opacity="0.6"')).join('') });
    }, { w: 70, h: 70, size: 70, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Colloid' } }),
  en('parafollicular-cell', 'Parafollicular C cell', ['c cell', 'parafollicular', 'calcitonin', 'thyroid', 'medullary thyroid carcinoma', 'neuroendocrine'], { primary: '#e3e3f2', secondary: '#4b4f8f', accent: '#8f93d6' },
    (c, u) => makeCell(c, u, { shape: round(50, 50, 38, 34, { seed: 9 }), nuclei: [{ cx: 50, cy: 50, rx: 12, ry: 11, seed: 9 }], mito: 2, ves: 0, seed: 69, mitoLen: 6,
      mid: secretory(22, { r: 1.7, halo: light(c.accent, 0.3), core: dark(c.accent, 0.2), coreK: 0.6, seed: 10 }) }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Calcitonin granules' } }),
  en('chromaffin-cell', 'Chromaffin cell', ['chromaffin', 'adrenal medulla', 'epinephrine', 'norepinephrine', 'catecholamine', 'pheochromocytoma'], { primary: '#d8c2a0', secondary: '#5a3a20', accent: '#6b3d14' },
    (c, u) => makeCell(c, u, { shape: poly(50, 50, 40, 5, { rot: -18, seed: 11 }), nuclei: [{ cx: 50, cy: 50, rx: 12, ry: 11, seed: 11 }], mito: 2, ves: 0, seed: 71, mitoLen: 6,
      mid: secretory(24, { r: 2.1, halo: '#f4ecdc', core: c.accent, coreK: 0.62, seed: 12 }) }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Catecholamine granules' } }),
  en('adrenocortical-cell', 'Adrenocortical cell', ['adrenal cortex', 'adrenocortical', 'spongiocyte', 'cortisol', 'aldosterone', 'steroidogenesis', 'zona fasciculata'], { primary: '#f2d9a6', secondary: '#7a5216', accent: '#f6e0a0' },
    (c, u) => makeCell(c, u, { shape: poly(50, 50, 41, 6, { rot: 0, seed: 13 }), nuclei: [{ cx: 50, cy: 50, rx: 10, ry: 10, seed: 13 }], mito: 6, ves: 0, seed: 73, mitoLen: 6, mitoColor: shade(c.primary, -0.12),
      mid: (ctx) => pack(ctx.sh, ctx.keep, 16, { rmin: 2, rmax: 5.4, seed: 5, margin: 2 }).map((p) => lipid(p.x, p.y, p.r, c.accent)).join('') }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Lipid droplets' } }),
  en('somatotroph', 'Pituitary somatotroph', ['somatotroph', 'pituitary', 'growth hormone', 'anterior pituitary', 'acidophil', 'endocrine'], { primary: '#f0b8d0', secondary: '#7a2e5a', accent: '#c0508a' },
    (c, u) => makeCell(c, u, { shape: round(50, 50, 38, 36, { seed: 15 }), nuclei: [{ cx: 50, cy: 52, rx: 12, ry: 11, seed: 15 }], mito: 2, ves: 0, seed: 75, mitoLen: 6, golgi: { x: 46, y: 32, rot: 0, s: 8 },
      gran: { count: 22, r: 2.4, margin: 3 } }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Hormone granules' } }),

  // ---- reproductive ----------------------------------------------------------------------------------
  rp('sperm', 'Sperm cell', ['sperm', 'spermatozoon', 'male gamete', 'acrosome', 'flagellum', 'fertilization'], { primary: '#9fc5e8', secondary: '#2f4f8f', accent: '#f2c94c' },
    (c, u) => {
      const tail = 'M30 20 C44 12 52 28 66 20 S90 12 104 20 S114 24 118 22';
      const hg = sphere(u, 'h', c.secondary, { cx: 30, cy: 30, hi: 0.5 });
      let s = `<path d="${tail}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="3.4" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="${c.primary}" stroke-width="1.8" stroke-linecap="round"/>`;
      s += rect(18, 16.6, 14, 6.8, 3.4, c.primary, dark(c.primary, 0.42), 1);
      for (let x = 19.5; x < 31; x += 2) s += `<path d="M${x} 17 q1 3.4 0 6" stroke="${dark(c.accent, 0.25)}" stroke-width="1.1" fill="none"/>`;
      s += defs(hg) + path('M4 20 C4 13 10 11 16 13 Q21 15 21 20 Q21 25 16 27 C10 29 4 27 4 20Z', hg.url, dark(c.secondary, 0.42), 1.2);
      s += path('M4.5 18 C5 13 10 11.5 15 13 Q12 16 12 20 Q12 24 15 27 C10 28.5 5 27 4.5 22Z', c.accent, dark(c.accent, 0.4), 0.8, ' opacity="0.9"');
      return s + ellipse(9, 16, 3, 1.4, '#fff', 'none', 0, ' opacity="0.6"');
    }, { w: 120, h: 40, size: 120, shape: 'rect', roles: { primary: 'Tail', secondary: 'Head', accent: 'Acrosome / midpiece' } }),
  rp('oocyte', 'Oocyte (egg cell)', ['oocyte', 'egg', 'ovum', 'female gamete', 'zona pellucida', 'corona radiata', 'germinal vesicle'], { primary: '#f4d9c0', secondary: '#8a5a9b', accent: '#f0b8c8' },
    (c, u) => {
      const R = rng(7);
      let corona = '';
      ring(50, 50, 45, 45, 22, 0.1).forEach((p, i) => { const r = 4.2 + R() * 1.4; corona += circle(p.x, p.y, r, light(c.accent, 0.15), dark(c.accent, 0.4), 0.8) + circle(p.x + 0.4, p.y + 0.4, r * 0.45, dark(c.accent, 0.25), 'none', 0, ' opacity="0.7"'); });
      const zg = sphere(u, 'z', c.accent, { hi: 0.45, lo: 0 });
      let s = corona + defs(zg) + circle(50, 50, 40, zg.url, dark(c.accent, 0.35), 1.2) + circle(50, 50, 40, 'none', '#fff', 1, ' opacity="0.5"');
      s += makeCell(c, u, { shape: round(50, 50, 33, 33, { seed: 3, wobble: 0.01 }), nuclei: [{ cx: 56, cy: 46, rx: 12, ry: 12, seed: 5, nucleolus: 'big', chroma: 0.4 }], mito: 4, ves: 4, seed: 77, mitoLen: 5, vesR: 1.6, texture: 60,
        gran: { count: 18, r: 1, glint: 0, color: dark(c.primary, 0.15), region: (x, y) => Math.hypot(x - 50, y - 50) > 27 } });
      return s;
    }, { size: 140, roles: { primary: 'Ooplasm', secondary: 'Germinal vesicle', accent: 'Zona / corona' } }),
  rp('sertoli-cell', 'Sertoli cell', ['sertoli', 'nurse cell', 'seminiferous tubule', 'spermatogenesis', 'blood-testis barrier', 'testis'], { primary: '#f2d2b0', secondary: '#6b4a25', accent: '#8fa8e0' },
    (c, u) => {
      const sh = outline([[22, 98], [16, 84], [20, 70], [14, 56], [20, 42], [18, 26], [26, 12], [30, 4], [36, 12], [42, 26], [42, 42], [48, 56], [42, 70], [46, 84], [40, 98]], 0.9);
      const germ = (x, y, r, k) => { const g = sphere(u, `g${k}`, c.accent, { hi: 0.45 }); return defs(g) + circle(x, y, r, g.url, dark(c.accent, 0.42), 1) + circle(x + 0.5, y + 0.6, r * 0.5, dark(c.accent, 0.3), 'none', 0, ' opacity="0.75"'); };
      return makeCell(c, u, { shape: sh, nuclei: [{ cx: 30, cy: 78, rx: 7, ry: 9, seed: 3, nucleolus: 'big', wobble: 0.15 }], mito: 2, ves: 0, seed: 79, mitoLen: 5, margin: 2.4, texture: 14,
        over: germ(12, 92, 6, 0) + germ(50, 90, 5.6, 1) + germ(10, 63, 6.6, 2) + germ(51, 60, 6.4, 3) + germ(14, 40, 5, 4) + germ(46, 38, 4.8, 5)
          + [[22, 12, -20], [38, 12, 20], [30, 4, 0]].map(([x, y, a]) => `<g transform="rotate(${a} ${x} ${y})">${ellipse(x, y, 2, 4, c.secondary, dark(c.secondary, 0.4), 0.7)}<path d="M${x} ${y - 4} v-6" stroke="${dark(c.accent, 0.3)}" stroke-width="0.9"/></g>`).join(''),
        gloss: [26, 30, 3, 8, 0] });
    }, { w: 60, h: 100, size: 80, shape: 'rect', roles: { primary: 'Sertoli cell', secondary: 'Nuclei', accent: 'Germ cells' } }),
  rp('leydig-cell', 'Leydig cell', ['leydig', 'interstitial cell', 'testosterone', 'steroidogenesis', 'reinke crystal', 'testis'], { primary: '#f0b88a', secondary: '#6b3423', accent: '#f6d77a' },
    (c, u) => makeCell(c, u, { shape: poly(50, 50, 40, 6, { rot: 12, seed: 17 }), nuclei: [{ cx: 46, cy: 50, rx: 11, ry: 11, seed: 17 }], mito: 5, ves: 0, seed: 81, mitoLen: 6,
      lipids: [{ x: 72, y: 40, r: 4.4 }, { x: 66, y: 66, r: 3.8 }, { x: 32, y: 70, r: 3.4 }], lipidColor: c.accent,
      over: [[68, 54, 30], [28, 34, -20]].map(([x, y, a]) => rect(x - 6, y - 1.8, 12, 3.6, 0.6, '#f3c6e0', dark('#f3c6e0', 0.4), 0.7, ` transform="rotate(${a} ${x} ${y})"`)).join('') }),
    { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Lipid droplets' } }),
  rp('granulosa-cell', 'Granulosa cell', ['granulosa', 'ovarian follicle', 'estrogen', 'aromatase', 'cumulus', 'ovary'], { primary: '#f5c6d0', secondary: '#7a2e48', accent: '#f6d77a' },
    (c, u) => makeCell(c, u, { shape: poly(50, 50, 36, 5, { rot: -10, seed: 19 }), nuclei: [{ cx: 50, cy: 52, rx: 14, ry: 13, seed: 19 }], mito: 3, ves: 1, seed: 83, mitoLen: 6, lipids: [{ x: 30, y: 38, r: 3.2 }, { x: 70, y: 70, r: 2.6 }], lipidColor: c.accent }),
    { size: 90, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Lipid droplets' } }),
  rp('syncytiotrophoblast', 'Syncytiotrophoblast', ['syncytiotrophoblast', 'trophoblast', 'placenta', 'syncytium', 'hcg', 'cytotrophoblast'], { primary: '#e8b0c8', secondary: '#6a2a5a', accent: '#d98bb0' },
    (c, u) => {
      let s = '';
      [[30, 52], [86, 52]].forEach(([x, y], i) => { s += makeCell({ ...c, primary: c.accent }, `${u}ct${i}`, { shape: round(x, y, 18, 9, { seed: i + 5 }), nuclei: [{ cx: x, cy: y, rx: 7, ry: 5, seed: i + 4, sw: 1 }], mito: 0, ves: 0, texture: 4, gloss: false }); });
      const sh = outline([[4, 30], [20, 22], [60, 20], [100, 22], [116, 30], [112, 40], [86, 42], [60, 40], [30, 42], [8, 40]], 0.8);
      s += makeCell(c, u, { shape: sh, under: brush(8, 112, 22.5, 6, c.primary, { w: 2, gap: 1.6 }),
        nuclei: [[24, 32], [40, 31], [52, 33], [64, 31], [78, 32], [94, 31]].map(([x, y], i) => ({ cx: x, cy: y, rx: 5, ry: 3.6, seed: i + 3, nucleolus: false, sw: 0.9 })), mito: 3, ves: 2, seed: 85, mitoLen: 5, margin: 1.8, gloss: [40, 25, 20, 1.6, -2] });
      return s;
    }, { w: 120, h: 70, size: 130, shape: 'rect', roles: { primary: 'Syncytium', secondary: 'Nuclei', accent: 'Cytotrophoblasts' } }),

  // ---- development ---------------------------------------------------------------------------------
  dv('zygote', 'Zygote', ['zygote', 'fertilized egg', 'pronuclei', 'one-cell embryo', 'fertilization', 'polar body'], { primary: '#f4d9c0', secondary: '#8a5a9b', accent: '#f0c8d4' },
    (c, u) => {
      let s = embryo(c, u, [], { extra: circle(50, 50, 36, 'none', 'none', 0) });
      s += makeCell(c, u + 'z', { shape: round(52, 52, 33, 33, { seed: 3, wobble: 0.01 }), nuclei: [{ cx: 42, cy: 50, rx: 8.5, ry: 8.5, seed: 3, chroma: 0.5 }, { cx: 60, cy: 54, rx: 8, ry: 8, seed: 5, chroma: 0.5 }], mito: 0, ves: 5, vesR: 1.6, seed: 4, texture: 50 });
      s += makeCell(c, u + 'p', { shape: round(30, 18, 5, 4.4, { seed: 2 }), nuclei: [], mito: 0, ves: 0, texture: 2, gloss: false }) + makeCell(c, u + 'q', { shape: round(22, 26, 4.2, 3.8, { seed: 4 }), nuclei: [], mito: 0, ves: 0, texture: 2, gloss: false });
      return s;
    }, { roles: { primary: 'Cytoplasm', secondary: 'Pronuclei', accent: 'Zona pellucida' } }),
  dv('two-cell-embryo', 'Two-cell embryo', ['two-cell', '2-cell', 'cleavage', 'blastomere', 'embryo'], { primary: '#f4d9c0', secondary: '#8a5a9b', accent: '#f0c8d4' },
    (c, u) => embryo(c, u, [[36, 50, 20, 23], [65, 50, 20, 23]], { seed: 5 })),
  dv('four-cell-embryo', 'Four-cell embryo', ['four-cell', '4-cell', 'cleavage', 'blastomere', 'embryo'], { primary: '#f4d9c0', secondary: '#8a5a9b', accent: '#f0c8d4' },
    (c, u) => embryo(c, u, [[50, 30, 16], [34, 52, 16], [66, 52, 16], [50, 66, 16]], { seed: 7 })),
  dv('morula', 'Morula', ['morula', '16-cell', 'compaction', 'blastomeres', 'embryo'], { primary: '#f4d9c0', secondary: '#8a5a9b', accent: '#f0c8d4' },
    (c, u) => embryo(c, u, [[50, 18 + 6, 9.5], [33, 30, 9.5], [67, 30, 9.5], [24, 48, 9.5], [76, 48, 9.5], [32, 66, 9.5], [68, 66, 9.5], [50, 76, 9.5], [41, 42, 10.5], [59, 42, 10.5], [50, 58, 10.5]].map(([x, y, r]) => [x, y, r]), { seed: 9 })),
  dv('blastocyst', 'Blastocyst', ['blastocyst', 'inner cell mass', 'icm', 'trophectoderm', 'blastocoel', 'implantation', 'embryo'], { primary: '#f4d9c0', secondary: '#8a5a9b', accent: '#f0c8d4' },
    (c, u) => {
      const zg = sphere(u, 'z', c.accent, { hi: 0.4, lo: -0.05 });
      let s = defs(zg) + circle(50, 50, 46, zg.url, dark(c.accent, 0.35), 1.4) + circle(50, 50, 42, '#eaf3fb', dark(c.accent, 0.3), 1);
      // trophectoderm: a ring of flattened cells around the cavity
      const tg = sphere(u, 't', c.primary, { r: 90 });
      s += defs(tg) + circle(50, 50, 41, 'none', dark(c.primary, 0.4), 8.4) + circle(50, 50, 41, 'none', c.primary, 6);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s += line(50 + Math.cos(a) * 38, 50 + Math.sin(a) * 38, 50 + Math.cos(a) * 44, 50 + Math.sin(a) * 44, dark(c.primary, 0.4), 1); const b = a + 0.2; s += ellipse(50 + Math.cos(b) * 41, 50 + Math.sin(b) * 41, 2.6, 1.3, c.secondary, 'none', 0, ` transform="rotate(${n((b * 180) / Math.PI + 90)} ${n(50 + Math.cos(b) * 41)} ${n(50 + Math.sin(b) * 41)})"`); }
      s += `<path d="M18 34 A36 36 0 0 1 40 14" fill="none" stroke="#fff" stroke-width="2" opacity="0.6" stroke-linecap="round"/>`;
      // inner cell mass
      [[50, 22, 7], [40, 26, 7], [60, 26, 7], [46, 33, 6.5], [56, 33, 6.5], [34, 33, 5.6], [66, 33, 5.6]].forEach(([x, y, r], i) => {
        s += makeCell({ ...c, primary: light(c.secondary, 0.45) }, `${u}i${i}`, { shape: round(x, y, r, r, { seed: i + 3 }), nuclei: [{ cx: x, cy: y, rx: r * 0.5, ry: r * 0.48, seed: i + 2, nucleolus: false, chroma: 0.6, sw: 0.8 }], mito: 0, ves: 0, texture: 2, gloss: false, sw: 1.2 });
      });
      return s + gloss(30, 22, 10, 3, 0.4, -40);
    }, { roles: { primary: 'Trophectoderm', secondary: 'Inner cell mass', accent: 'Zona pellucida' } }),

  // ---- cell division & cell states -------------------------------------------------------------------
  gc('cell-prophase', 'Cell in prophase', ['prophase', 'mitosis', 'cell division', 'chromosome condensation', 'cell cycle'], { primary: '#bfe0f5', secondary: '#7a6cc8', accent: '#e85d75' },
    (c, u) => makeCell(c, u, { shape: round(50, 50, 42, 40, { seed: 3 }), mito: 3, ves: 2, seed: 87, keep: [{ cx: 50, cy: 52, rx: 24, ry: 22 }],
      mid: `<path d="${blob(50, 52, 22, 20, { n: 9, seed: 4 })}" fill="${light(c.secondary, 0.55)}" stroke="${dark(c.secondary, 0.3)}" stroke-width="1.4" stroke-dasharray="6 3"/>`
        + chromo(42, 46, 11, 20, c.accent) + chromo(56, 44, 10, -30, c.accent) + chromo(52, 60, 11, 70, c.accent) + chromo(38, 60, 9, -50, c.accent)
        + aster(26, 26, dark(c.secondary, 0.1)) + aster(32, 20, dark(c.secondary, 0.1)) }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus / spindle', accent: 'Chromosomes' } }),
  gc('cell-metaphase', 'Cell in metaphase', ['metaphase', 'mitosis', 'cell division', 'metaphase plate', 'spindle', 'cell cycle'], { primary: '#bfe0f5', secondary: '#7a6cc8', accent: '#e85d75' },
    (c, u) => {
      const ys = [30, 41, 52, 63, 72];
      return makeCell(c, u, { shape: round(50, 50, 44, 38, { seed: 5 }), mito: 4, ves: 2, seed: 89, keep: [{ cx: 50, cy: 50, rx: 30, ry: 26 }],
        mid: spindleFibers(18, 50, ys.map((y) => [48, y]), dark(c.secondary, 0.1)) + spindleFibers(82, 50, ys.map((y) => [52, y]), dark(c.secondary, 0.1))
          + ys.map((y, i) => chromo(50, y, 10, 90 + (i % 2 ? 8 : -8), c.accent)).join('') + aster(18, 50, dark(c.secondary, 0.1)) + aster(82, 50, dark(c.secondary, 0.1)) });
    }, { roles: { primary: 'Cytoplasm', secondary: 'Spindle', accent: 'Chromosomes' } }),
  gc('cell-anaphase', 'Cell in anaphase', ['anaphase', 'mitosis', 'chromatid separation', 'cell division', 'cell cycle'], { primary: '#bfe0f5', secondary: '#7a6cc8', accent: '#e85d75' },
    (c, u) => {
      const ys = [34, 44, 54, 64];
      return makeCell(c, u, { shape: round(50, 50, 46, 34, { seed: 7 }), mito: 4, ves: 2, seed: 91, keep: [{ cx: 50, cy: 50, rx: 34, ry: 22 }],
        mid: spindleFibers(12, 50, ys.map((y) => [32, (y - 50) * 0.7 + 50]), dark(c.secondary, 0.1)) + spindleFibers(88, 50, ys.map((y) => [68, (y - 50) * 0.7 + 50]), dark(c.secondary, 0.1))
          + `<path d="M36 40 H64 M36 50 H64 M36 60 H64" stroke="${dark(c.secondary, 0.1)}" stroke-width="0.8" opacity="0.6"/>`
          + ys.map((y) => chromatid(34, (y - 50) * 0.7 + 50, 9, 90, c.accent) + chromatid(66, (y - 50) * 0.7 + 50, 9, -90, c.accent)).join('') + aster(12, 50, dark(c.secondary, 0.1)) + aster(88, 50, dark(c.secondary, 0.1)) });
    }, { roles: { primary: 'Cytoplasm', secondary: 'Spindle', accent: 'Chromatids' } }),
  gc('cell-cytokinesis', 'Cell in telophase / cytokinesis', ['telophase', 'cytokinesis', 'cleavage furrow', 'mitosis', 'daughter cells', 'cell division'], { primary: '#bfe0f5', secondary: '#7a6cc8', accent: '#e85d75' },
    (c, u) => makeCell(c, u, { shape: outline([[50, 36], [64, 22], [84, 22], [96, 38], [96, 62], [84, 78], [64, 78], [50, 64], [36, 78], [16, 78], [4, 62], [4, 38], [16, 22], [36, 22]], 0.95),
      nuclei: [{ cx: 26, cy: 50, rx: 11, ry: 11, seed: 3, chroma: 1.3 }, { cx: 74, cy: 50, rx: 11, ry: 11, seed: 5, chroma: 1.3 }], mito: 4, ves: 2, seed: 93,
      mid: `<path d="M38 50 H62" stroke="${dark(c.secondary, 0.1)}" stroke-width="3" opacity="0.5"/>` + `<path d="M50 38 V62" stroke="${c.accent}" stroke-width="2" stroke-dasharray="2 2" opacity="0.8"/>`,
      gloss: [18, 30, 8, 3, -30] }), { w: 100, h: 100, roles: { primary: 'Cytoplasm', secondary: 'Nuclei', accent: 'Contractile ring' } }),
  gc('senescent-cell', 'Senescent cell', ['senescence', 'senescent', 'sasp', 'aging', 'β-galactosidase', 'cell cycle arrest', 'p16'], { primary: '#d9c9e8', secondary: '#5a4a7a', accent: '#3d7fd6' },
    (c, u) => makeCell(c, u, { shape: outline([[6, 50], [14, 28], [34, 14], [58, 10], [82, 18], [96, 38], [92, 64], [78, 84], [50, 90], [24, 84], [10, 70]], 0.95),
      nuclei: [{ cx: 52, cy: 50, rx: 18, ry: 14, seed: 4, wobble: 0.1, chroma: 1.1 }], mito: 4, ves: 5, seed: 95, mitoLen: 9, vesR: 3.2,
      gran: { count: 18, r: 1.8, glint: 0.3, margin: 2.6 } }), { size: 130, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'SA-β-gal' } }),
  gc('necrotic-cell', 'Necrotic cell', ['necrosis', 'necrotic', 'cell lysis', 'membrane rupture', 'damps', 'cell death', 'swelling'], { primary: '#e3c7b6', secondary: '#7a5a5a', accent: '#c46a5a' },
    (c, u) => {
      const sh = round(48, 50, 40, 38, { seed: 9, wobble: 0.05 });
      const R = rng(4);
      let spill = '';
      for (let i = 0; i < 14; i++) { const a = -0.6 + R() * 1.4, d = 42 + R() * 12; spill += circle(48 + Math.cos(a) * d, 50 + Math.sin(a) * d, 0.9 + R() * 1.6, i % 3 ? c.accent : dark(c.primary, 0.2), 'none', 0, ' opacity="0.85"'); }
      return makeCell(c, u, { shape: sh, membrane: false, nuclei: [{ cx: 44, cy: 54, rx: 13, ry: 12, seed: 4, nucleolus: false, chroma: 0.4, color: light(c.secondary, 0.3) }], mito: 0, ves: 0, seed: 97,
        mid: [[30, 34], [66, 34], [64, 66], [28, 66]].map(([x, y], i) => vesicle(x, y, 4.6, light(c.accent, 0.35)) + `<path d="M${x - 2.4} ${y} q1.2 -1.6 2.4 0 t2.4 0" fill="none" stroke="${dark(c.accent, 0.2)}" stroke-width="0.8"/>`).join(''),
        over: `<path d="${sh.d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2.2" stroke-dasharray="26 7 14 9" stroke-linecap="round"/>` + spill });
    }, { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Released contents' } }),
  gc('plant-cell', 'Plant cell', ['plant cell', 'cell wall', 'chloroplast', 'vacuole', 'plant', 'botany'], { primary: '#cfe8b0', secondary: '#7a6cc8', accent: '#5aa04a' },
    (c, u) => {
      const wall = sphere(u, 'w', '#b5c97a', { r: 90, hi: 0.3 });
      let s = defs(wall) + rect(4, 10, 92, 80, 10, wall.url, dark('#b5c97a', 0.42), 1.6);
      s += makeCell(c, u, { shape: box(10, 16, 80, 68, 7), nuclei: [{ cx: 24, cy: 70, rx: 9, ry: 8, seed: 3 }], mito: 2, ves: 0, seed: 99, mitoLen: 6, keep: [{ cx: 54, cy: 48, rx: 30, ry: 24 }],
        mid: (() => {
          const vg = sphere(u, 'v', '#cfe6f7', { hi: 0.5 });
          return defs(vg) + path(blob(56, 46, 28, 22, { n: 9, seed: 5, wobble: 0.08 }), vg.url, dark('#cfe6f7', 0.35), 1.2) + [[18, 26, 30], [30, 20, -10], [86, 30, 80], [84, 60, 100], [44, 78, 0], [64, 78, 10], [16, 46, 80]].map(([x, y, a]) => chloroplast(x, y, 11, a, c.accent)).join('');
        })(), gloss: [26, 22, 10, 2.6, -10] });
      return s;
    }, { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Chloroplasts' } }),
];
