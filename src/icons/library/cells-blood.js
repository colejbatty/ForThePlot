// Blood, immune and stem cell types (additions to the original immune set).

import { sphere, defs, path, circle, ellipse, gloss, dark, light, shade, n, rng, miniY, vesicle, smooth, blob, linear } from './kit.js';
import { lymphocyte } from './cells.js';
import { cellCat, makeCell, round, star, outline, spindle, stellate, pack, knobs, arcBand, donut, lipid, rer, golgi, bean } from './cellkit.js';

const imm = cellCat('Immune cells', { body: 0.8 });
const bl = cellCat('Blood & stem cells', { body: 0.8 });

/** Biconcave red cell seen at an angle (shared by the erythrocyte variants). */
function disc(c, u, { cx = 50, cy = 35, rx = 46, ry = 29 } = {}) {
  const g = sphere(u, 'b', c.primary, { cx: 38, cy: 26, hi: 0.4, lo: -0.2 });
  const dimple = `${u}-d`;
  const dd = `<linearGradient id="${dimple}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark(c.secondary, 0.25)}"/><stop offset="0.55" stop-color="${c.secondary}"/><stop offset="1" stop-color="${light(c.primary, 0.3)}"/></linearGradient>`;
  return defs(g, dd) + ellipse(cx, cy, rx, ry, g.url, dark(c.primary, 0.4), 2)
    + ellipse(cx, cy - 2, rx * 0.63, ry * 0.55, `url(#${dimple})`, 'none', 0, ' opacity="0.9"')
    + `<path d="M${cx - rx * 0.58} ${cy - 2} Q${cx} ${cy + ry * 0.6} ${cx + rx * 0.58} ${cy - 2}" fill="none" stroke="${light(c.primary, 0.45)}" stroke-width="2.4" opacity="0.6" stroke-linecap="round"/>`
    + `<path d="M${cx - rx * 0.78} ${cy - ry * 0.38} Q${cx - rx * 0.04} ${cy - ry * 1.2} ${cx + rx * 0.78} ${cy - ry * 0.45}" fill="none" stroke="#fff" stroke-width="3" opacity="0.38" stroke-linecap="round"/>`;
}

const progenitor = (seed, nucleus = [51, 52, 25, 24]) => (c, u) => {
  const r = 34;
  return lymphocyte(c, u, { seed, r, nucleus, villi: 0, organelles: 2, surface: knobs(50, 50, r - 1, r - 1, 12, c.accent, { len: 4.5, r: 2 }) });
};

export const bloodCells = [
  // ---- immune additions ------------------------------------------------------------------------
  imm('naive-t-cell', 'Naive T cell', ['naive', 'cd45ra', 'ccr7', 'resting', 't cell', 'lymphocyte'], { primary: '#8cc4f0', secondary: '#2f58a8', accent: '#f1a340' },
    (c, u) => lymphocyte(c, u, { seed: 51, r: 34, nucleus: [51, 52, 27, 26], organelles: 1, villi: 14 })),
  imm('thymocyte', 'Thymocyte', ['thymocyte', 'double positive', 'dp', 'double negative', 'developing t cell', 'thymus'], { primary: '#b4a6ef', secondary: '#4a3b9e', accent: '#f1a340' },
    (c, u) => lymphocyte(c, u, { seed: 57, r: 31, nucleus: [51, 52, 25, 24], organelles: 1, villi: 12, ruffle: 0.03 })),
  imm('nkt-cell', 'NKT cell', ['nkt', 'inkt', 'natural killer t', 'cd1d', 'innate-like t cell'], { primary: '#7fc9b9', secondary: '#2a6b78', accent: '#c2405a' },
    (c, u) => lymphocyte(c, u, { seed: 61, granules: 7, nucleus: [55, 54, 25, 24], organelles: 2 })),
  imm('plasmablast', 'Plasmablast', ['plasmablast', 'antibody secreting', 'asc', 'activated b cell', 'cd27', 'cd38'], { primary: '#f4b26b', secondary: '#7d3f17', accent: '#d4573f' },
    (c, u) => makeCell(c, u, {
      shape: round(48, 52, 37, 35, { seed: 5 }), nuclei: [{ cx: 58, cy: 55, rx: 17, ry: 16, seed: 4, nucleolus: 'big' }],
      er: { a0: 110, a1: 300, count: 4, gap: 3.4, start: 3 }, golgi: { x: 36, y: 40, rot: -30, s: 9 }, mito: 2, ves: 2, seed: 9,
      over: miniY(86, 26, 40, 9, c.accent, dark(c.accent)) + miniY(92, 44, 75, 8, c.accent, dark(c.accent)),
    })),
  imm('pdc', 'Plasmacytoid dendritic cell (pDC)', ['pdc', 'plasmacytoid', 'type i interferon', 'ifn-alpha', 'dendritic cell', 'cd123'], { primary: '#c7b4ea', secondary: '#56408f', accent: '#8f6fd6' },
    (c, u) => makeCell(c, u, {
      shape: star(50, 52, [38, 36, 40, 37, 36, 42, 38, 36, 37, 40, 38, 36], { tension: 1.05, rot: 0.3 }),
      nuclei: [{ cx: 40, cy: 54, rx: 15, ry: 17, kind: 'bean', seed: 6 }], er: { a0: -70, a1: 80, count: 4, gap: 3.4, start: 3 },
      mito: 2, ves: 3, seed: 13, vesColor: light(c.accent, 0.3),
    })),
  imm('langerhans-cell', 'Langerhans cell', ['langerhans', 'langerin', 'cd207', 'birbeck granule', 'skin dendritic cell', 'epidermis', 'apc'], { primary: '#b9dd9b', secondary: '#3f6d2c', accent: '#6b4fb3' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 52, rx: 18, ry: 16, seed: 3,
      arms: [{ a: -100, len: 34, w: 7 }, { a: -30, len: 36, w: 7 }, { a: 30, len: 30, w: 6.5 }, { a: 100, len: 30, w: 6.5, depth: 1 }, { a: 160, len: 36, w: 7 }, { a: -160, len: 28, w: 6, depth: 1 }],
      nuclei: [{ cx: 51, cy: 53, rx: 10, ry: 8, kind: 'bean', seed: 5, nucleolus: false }],
      // Birbeck granules: rods with a bulb ("tennis rackets")
      over: (ctx) => [[38, 44, -30], [62, 44, 40], [44, 64, 20]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-4 0 H2" stroke="${dark(c.accent, 0.3)}" stroke-width="1.6" stroke-linecap="round"/><circle cx="3.6" cy="0" r="2" fill="${c.accent}" stroke="${dark(c.accent, 0.35)}" stroke-width="0.7"/></g>`).join(''),
    }), { size: 130 }),
  imm('follicular-dendritic-cell', 'Follicular dendritic cell', ['fdc', 'follicular dendritic', 'germinal center', 'immune complex', 'iccosome', 'stromal'], { primary: '#f3b7c9', secondary: '#8a3f62', accent: '#f2c94c' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 14, ry: 13, seed: 7,
      arms: [-90, -40, 5, 50, 95, 140, 185, 230].map((a, i) => ({ a, len: 34 + (i % 3) * 4, w: 5, depth: 2, spread: 40, bend: 0.35 })),
      nuclei: [{ cx: 50, cy: 50, rx: 8, ry: 7, seed: 3, nucleolus: false, chroma: 0.7 }], mito: 0, ves: 1,
      armOver: (ctx, list) => {
        // immune complexes (iccosomes) beaded along the processes
        let s = '';
        list.flatMap((b) => b.spines).forEach((p, i) => p.slice(1).forEach(([x, y], k) => { if ((i + k) % 2 === 0) s += circle(x, y, 1.5, c.accent, dark(c.accent, 0.4), 0.5); }));
        return s;
      },
    }), { size: 140 }),
  imm('kupffer-cell', 'Kupffer cell', ['kupffer', 'liver macrophage', 'resident macrophage', 'sinusoid', 'erythrophagocytosis'], { primary: '#d9a273', secondary: '#6e3b1e', accent: '#d94848' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 52, rx: 26, ry: 18, seed: 9,
      arms: [{ a: -150, len: 22, w: 9, depth: 1 }, { a: -40, len: 24, w: 9, depth: 1 }, { a: 20, len: 20, w: 8, depth: 1 }, { a: 150, len: 22, w: 8, depth: 1 }, { a: 100, len: 14, w: 7, depth: 0 }],
      nuclei: [{ cx: 58, cy: 54, rx: 11, ry: 8, kind: 'bean', seed: 4 }], mito: 2, ves: 2,
      mid: (ctx) => {
        // a phagocytosed red cell inside a phagosome
        return circle(36, 50, 8, light(c.primary, 0.35), dark(c.primary, 0.3), 1) + ellipse(36, 50, 6.2, 4.4, c.accent, dark(c.accent, 0.4), 0.9) + ellipse(36, 49.5, 3.4, 2, dark(c.accent, 0.2), 'none', 0, ' opacity="0.7"');
      },
    }), { size: 130 }),
  imm('alveolar-macrophage', 'Alveolar macrophage', ['alveolar macrophage', 'dust cell', 'lung macrophage', 'resident macrophage', 'surfactant'], { primary: '#e8b98f', secondary: '#6d3a26', accent: '#5a4a42' },
    (c, u) => makeCell(c, u, {
      shape: star(50, 50, [44, 38, 46, 40, 44, 37, 45, 41, 38, 46, 39, 43, 37, 45], { tension: 1.1 }),
      nuclei: [{ cx: 58, cy: 56, rx: 12, ry: 10, kind: 'bean', seed: 7 }], mito: 2, ves: 1, seed: 21,
      mid: (ctx) => pack(ctx.sh, ctx.keep, 7, { rmin: 2.4, rmax: 6, seed: 4, margin: 4 }).map((p, i) => vesicle(p.x, p.y, p.r, light(c.primary, 0.35)) + (i % 2 ? circle(p.x + p.r * 0.15, p.y + p.r * 0.2, p.r * 0.38, c.accent, 'none', 0, ' opacity="0.8"') : '')).join(''),
    }), { size: 130 }),
  imm('foam-cell', 'Foam cell', ['foam cell', 'lipid-laden macrophage', 'atherosclerosis', 'plaque', 'oxldl'], { primary: '#f0c49b', secondary: '#7a3b22', accent: '#f6d77a' },
    (c, u) => makeCell(c, u, {
      shape: star(50, 50, [44, 41, 45, 42, 44, 40, 45, 43, 41, 44, 42, 45], { tension: 1.05 }),
      nuclei: [{ cx: 64, cy: 64, rx: 9, ry: 7, kind: 'bean', seed: 3, nucleolus: false }], mito: 0, ves: 0, texture: 20,
      mid: (ctx) => pack(ctx.sh, ctx.keep, 22, { rmin: 2.2, rmax: 9, seed: 6, margin: 2.6, gap: 0.6 }).map((p) => lipid(p.x, p.y, p.r, c.accent)).join(''),
    }), { size: 130 }),
  imm('mdsc', 'Myeloid-derived suppressor cell (MDSC)', ['mdsc', 'myeloid-derived suppressor', 'immunosuppressive', 'pmn-mdsc', 'm-mdsc', 'tumor microenvironment'], { primary: '#b9b2cf', secondary: '#4c3f7a', accent: '#8e7bb8' },
    (c, u) => makeCell(c, u, {
      shape: round(50, 50, 36, 35, { seed: 8 }), mito: 2, ves: 1, seed: 8, gran: { count: 10, r: 1.4, glint: 0 },
      keep: [{ cx: 50, cy: 51, rx: 19, ry: 19 }],
      mid: (ctx) => {
        // ring-shaped nucleus typical of immature myeloid cells
        const d = donut(50, 51, 17, 8, { seed: 4 });
        return ringNucleus(c, u, d);
      },
    })),
  imm('band-neutrophil', 'Band neutrophil', ['band cell', 'band neutrophil', 'stab', 'immature neutrophil', 'left shift', 'granulocyte'], { primary: '#f1c7d9', secondary: '#5b3a8c', accent: '#d98bb0' },
    (c, u) => makeCell(c, u, {
      shape: round(50, 50, 38, 37, { seed: 12 }), mito: 1, ves: 0, seed: 12, texture: 30,
      keep: [{ cx: 50, cy: 52, rx: 24, ry: 24 }], gran: { count: 22, r: 1.1, glint: 0, margin: 2.2 },
      mid: () => ringNucleus(c, u, arcBand(50, 52, 15, 9, 150, 390)),
    })),
  imm('giant-cell', 'Multinucleated giant cell', ['giant cell', 'langhans giant cell', 'foreign body giant cell', 'granuloma', 'fused macrophages', 'tuberculosis'], { primary: '#eab08c', secondary: '#6b3423', accent: '#f6e0c4' },
    (c, u) => makeCell(c, u, {
      shape: star(50, 50, [47, 44, 48, 45, 47, 43, 48, 46, 44, 47, 45, 48, 44, 46], { tension: 1.05 }),
      // nuclei in a horseshoe along the periphery
      nuclei: Array.from({ length: 11 }, (_, i) => { const a = (150 + i * 24) * Math.PI / 180; return { cx: 50 + Math.cos(a) * 33, cy: 52 + Math.sin(a) * 31, rx: 5.4, ry: 4.2, seed: i + 3, nucleolus: false, chroma: 0.6, sw: 1, rot: (a * 180) / Math.PI + 90 }; }),
      mito: 3, ves: 4, seed: 30, vesColor: c.accent, mitoLen: 8,
    }), { size: 150 }),

  // ---- blood & stem cells ----------------------------------------------------------------------
  bl('erythroblast', 'Erythroblast', ['erythroblast', 'normoblast', 'nucleated red cell', 'erythropoiesis', 'rbc precursor'], { primary: '#c99ac8', secondary: '#3d2a6b', accent: '#d94848' },
    (c, u) => makeCell(c, u, { shape: round(50, 50, 33, 32, { seed: 3 }), nuclei: [{ cx: 50, cy: 51, rx: 16, ry: 15, seed: 3, nucleolus: false, chroma: 1.7 }], mito: 2, ves: 1, seed: 4, mitoColor: light(c.accent, 0.2) })),
  bl('reticulocyte', 'Reticulocyte', ['reticulocyte', 'immature red cell', 'rbc', 'reticulum', 'erythropoiesis'], { primary: '#dc6a63', secondary: '#a83232', accent: '#3d5bb5' },
    (c, u) => {
      let s = disc(c, u);
      const R = rng(4);
      let net = '';
      for (let i = 0; i < 7; i++) { const x = 26 + R() * 48, y = 22 + R() * 22; net += `M${n(x)} ${n(y)} q${n(R() * 8 - 4)} ${n(R() * 6 - 3)} ${n(R() * 10 - 5)} ${n(R() * 6)} `; }
      s += `<path d="${net}" fill="none" stroke="${c.accent}" stroke-width="1.2" stroke-linecap="round" opacity="0.85"/>`;
      for (let i = 0; i < 12; i++) s += circle(24 + R() * 52, 20 + R() * 28, 0.9 + R() * 0.6, c.accent, 'none', 0, ' opacity="0.9"');
      return s + gloss(30, 16, 8, 3, 0.4, -12);
    }, { w: 100, h: 66, size: 80, roles: { primary: 'Cell', secondary: 'Center', accent: 'Reticulum (RNA)' } }),
  bl('sickle-cell', 'Sickle cell', ['sickle cell', 'sickle cell disease', 'hbs', 'drepanocyte', 'anemia', 'rbc'], { primary: '#c94040', secondary: '#8e2626' },
    (c, u) => {
      const sh = outline([[6, 50], [18, 30], [38, 18], [62, 16], [84, 24], [96, 36], [80, 32], [60, 30], [42, 34], [26, 44], [12, 58]], 1);
      const g = sphere(u, 'b', c.primary, { cx: 40, cy: 30, hi: 0.42, lo: -0.18 });
      return defs(g) + path(sh.d, g.url, dark(c.primary, 0.4), 2)
        + `<path d="M18 40 Q40 26 64 23 Q80 23 90 31" fill="none" stroke="${c.secondary}" stroke-width="3" opacity="0.45" stroke-linecap="round"/>`
        + `<path d="M16 34 Q36 20 62 19" fill="none" stroke="#fff" stroke-width="2.4" opacity="0.45" stroke-linecap="round"/>`;
    }, { w: 100, h: 70, size: 80, roles: { primary: 'Cell', secondary: 'Shading' } }),
  bl('megakaryocyte', 'Megakaryocyte', ['megakaryocyte', 'platelet production', 'proplatelet', 'thrombopoiesis', 'bone marrow', 'polyploid'], { primary: '#e7b3d3', secondary: '#6d2f6e', accent: '#a75aa0' },
    (c, u) => {
      const sh = star(48, 50, [40, 37, 41, 38, 42, 37, 40, 39, 37, 41, 38, 40, 37, 42], { tension: 1.05 });
      // proplatelet extensions budding platelets
      const buds = [[86, 30, 4.2], [94, 22, 3.4], [91, 42, 3.6], [84, 74, 3.8], [92, 82, 3]];
      const under = (ctx) => `<path d="M80 38 Q88 32 92 24 M82 62 Q88 72 90 80" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="4.6" stroke-linecap="round"/><path d="M80 38 Q88 32 92 24 M82 62 Q88 72 90 80" fill="none" stroke="${c.primary}" stroke-width="2.6" stroke-linecap="round"/>`
        + buds.map(([x, y, r]) => circle(x, y, r, light(c.primary, 0.1), dark(c.primary, 0.42), 1.1) + circle(x, y, r * 0.4, c.accent, 'none', 0, ' opacity="0.8"') + circle(x - r * 0.35, y - r * 0.35, r * 0.3, '#fff', 'none', 0, ' opacity="0.6"')).join('');
      const lobes = [[40, 44, 9], [52, 40, 9.5], [58, 52, 9], [48, 58, 9.5], [36, 56, 8], [46, 48, 8]];
      return makeCell(c, u, { shape: sh, under, nuclei: [{ kind: 'lobes', lobes, cx: 47, cy: 50, rx: 18, ry: 16, sw: 1.2 }], mito: 3, ves: 2, seed: 15, gran: { count: 34, r: 1, glint: 0, margin: 2 } });
    }, { size: 150 }),
  bl('activated-platelet', 'Activated platelet', ['activated platelet', 'thrombocyte', 'filopodia', 'clotting', 'thrombus', 'degranulation'], { primary: '#ebb3c9', secondary: '#8f4f7a', accent: '#f2d16b' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 17, ry: 15, seed: 4,
      arms: [-120, -75, -30, 10, 50, 95, 140, 185].map((a, i) => ({ a, len: 22 + (i % 3) * 7, w: 3.4, depth: i % 2, spread: 30, bend: 0.4 })),
      nuclei: [], mito: 1, ves: 0, gran: { count: 7, r: 1.8, core: true, color: c.secondary, glint: 0.4 },
      mid: () => circle(50, 50, 6, 'none', light(c.accent, 0.1), 1.6, ' opacity="0.7"'),
    }), { roles: { primary: 'Platelet', secondary: 'Dense granules', accent: 'Open canalicular system' } }),
  bl('myeloblast', 'Myeloblast', ['myeloblast', 'blast', 'myeloid precursor', 'aml', 'leukemia', 'granulopoiesis'], { primary: '#8fb2e3', secondary: '#5a3f99', accent: '#d64f8a' },
    (c, u) => makeCell(c, u, { shape: round(50, 50, 36, 35, { seed: 6 }), nuclei: [{ cx: 50, cy: 51, rx: 25, ry: 24, seed: 8, nucleolus: 'big', chroma: 0.55 }], mito: 2, ves: 1, seed: 7, mitoLen: 7,
      over: path(blob(42, 46, 3.2, 2.8, { n: 6, seed: 2 }), dark(c.secondary, 0.2), 'none', 0, ' opacity="0.8"') })),
  bl('promyelocyte', 'Promyelocyte', ['promyelocyte', 'azurophilic granules', 'myeloid precursor', 'apl', 'granulopoiesis'], { primary: '#a9c4ea', secondary: '#5a3f99', accent: '#8e3fa8' },
    (c, u) => makeCell(c, u, { shape: round(50, 50, 39, 38, { seed: 9 }), nuclei: [{ cx: 56, cy: 54, rx: 21, ry: 19, seed: 5, nucleolus: true, chroma: 0.8 }], mito: 1, ves: 0, seed: 10, golgi: { x: 30, y: 38, rot: -40, s: 8 },
      gran: { count: 24, r: 1.7, margin: 2.4 } })),
  bl('multipotent-progenitor', 'Multipotent progenitor (MPP)', ['mpp', 'multipotent progenitor', 'hspc', 'cd34', 'hematopoietic progenitor'], { primary: '#9fd6cf', secondary: '#2f6f6a', accent: '#e05d7b' },
    progenitor(71)),
  bl('lymphoid-progenitor', 'Common lymphoid progenitor (CLP)', ['clp', 'lymphoid progenitor', 'common lymphoid', 'il-7r', 'lymphopoiesis'], { primary: '#9cc0ef', secondary: '#33529e', accent: '#f1a340' },
    progenitor(73, [52, 52, 24, 23])),
  bl('myeloid-progenitor', 'Common myeloid progenitor (CMP)', ['cmp', 'myeloid progenitor', 'gmp', 'mep', 'myelopoiesis'], { primary: '#f2b894', secondary: '#8a3d22', accent: '#4f8fd6' },
    progenitor(77, [50, 52, 24, 23])),
  bl('embryonic-stem-cell', 'Embryonic stem cell', ['esc', 'embryonic stem cell', 'pluripotent', 'oct4', 'nanog', 'stem cell'], { primary: '#9ad3c4', secondary: '#2f7a6e', accent: '#f4b860' },
    (c, u) => makeCell(c, u, { shape: round(50, 50, 35, 34, { seed: 14 }), nuclei: [{ cx: 50, cy: 51, rx: 26, ry: 25, seed: 9, nucleolus: 'big', chroma: 0.6 }], mito: 2, ves: 1, seed: 15, mitoLen: 7,
      over: path(blob(40, 46, 4, 3.4, { n: 6, seed: 5 }), dark(c.secondary, 0.22), 'none', 0, ' opacity="0.85"') + circle(39, 45, 1.2, light(c.secondary, 0.4), 'none', 0, ' opacity="0.6"') })),
  bl('ipsc-colony', 'Stem cell colony (iPSC / ESC)', ['ipsc', 'induced pluripotent', 'colony', 'pluripotent stem cells', 'stem cell culture', 'reprogramming'], { primary: '#a8d8c8', secondary: '#3b7f73', accent: '#ffffff' },
    (c, u) => {
      const sh = round(50, 50, 46, 38, { seed: 3, wobble: 0.04 });
      const g = sphere(u, 'b', c.primary, { r: 80, hi: 0.45 });
      let s = defs(g, `<clipPath id="${u}-c"><path d="${sh.d}"/></clipPath>`) + path(sh.d, g.url);
      // tightly packed cells, each mostly nucleus with a nucleolus
      const cells = pack(sh, [], 40, { rmin: 3.2, rmax: 6.2, seed: 9, margin: 0.4, gap: 0.2 });
      let body = '', nuc = '', nol = '';
      cells.forEach((p) => {
        body += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(p.r + 0.9)}"/>`;
        nuc += `<circle cx="${n(p.x + 0.3)}" cy="${n(p.y + 0.3)}" r="${n(p.r * 0.72)}"/>`;
        nol += `<circle cx="${n(p.x + p.r * 0.2)}" cy="${n(p.y + p.r * 0.1)}" r="${n(p.r * 0.2)}"/>`;
      });
      s += `<g clip-path="url(#${u}-c)"><g fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="0.8" opacity="0.8">${body}</g><g fill="${c.secondary}" opacity="0.75">${nuc}</g><g fill="${dark(c.secondary, 0.35)}">${nol}</g></g>`;
      s += `<path d="${sh.d}" fill="none" stroke="${c.accent}" stroke-width="3" opacity="0.7"/>`;
      s += `<path d="${sh.d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="1.6"/>`;
      return s + gloss(32, 24, 16, 5, 0.5, -15);
    }, { size: 130, roles: { primary: 'Colony', secondary: 'Nuclei', accent: 'Bright edge' } }),
  bl('mesenchymal-stem-cell', 'Mesenchymal stem cell (MSC)', ['msc', 'mesenchymal stem', 'mesenchymal stromal', 'stromal', 'multipotent', 'bone marrow'], { primary: '#f0c08a', secondary: '#8a4a24', accent: '#f6e2a8' },
    (c, u) => {
      const sh = outline([[8, 40], [20, 30], [36, 24], [50, 14], [56, 4], [62, 14], [76, 20], [96, 22], [114, 14], [104, 30], [96, 40], [108, 54], [86, 46], [64, 46], [44, 48], [26, 46]]);
      return makeCell(c, u, { shape: sh, nuclei: [{ cx: 62, cy: 33, rx: 15, ry: 8.5, seed: 4, nucleolus: 'big', chroma: 0.7 }], mito: 4, ves: 2, seed: 5, margin: 2.4, mitoLen: 8,
        gloss: [40, 28, 12, 2.8, -12],
        inside: `<g fill="none" stroke="${dark(c.primary, 0.2)}" stroke-width="0.8" opacity="0.45"><path d="M12 40 Q60 22 110 18 M18 42 Q60 32 102 40 M30 44 Q70 40 104 50"/></g>` });
    }, { w: 120, h: 60, size: 130, shape: 'rect' }),
];

function ringNucleus(c, u, d) {
  const g = sphere(u, 'rn', c.secondary, { hi: 0.38, lo: -0.18 });
  return defs(g, `<clipPath id="${u}-rnc"><path d="${d}"/></clipPath>`) + path(d, g.url)
    + `<g clip-path="url(#${u}-rnc)">${blobSpeck(c.secondary)}</g>`
    + `<path d="${d}" fill="none" stroke="${dark(c.secondary, 0.42)}" stroke-width="1.5"/><path d="${d}" fill="none" stroke="${light(c.secondary, 0.35)}" stroke-width="0.45" opacity="0.55"/>`;
}
function blobSpeck(col) {
  const R = rng(5);
  let s = '';
  for (let i = 0; i < 26; i++) s += `<circle cx="${n(28 + R() * 44)}" cy="${n(30 + R() * 44)}" r="${n(0.8 + R() * 1.2)}"/>`;
  return `<g fill="${dark(col, 0.32)}" opacity="0.5">${s}</g>`;
}
