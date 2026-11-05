// Nervous system, sensory, muscle, connective tissue, vascular, bone and cartilage cells.

import { sphere, defs, path, circle, ellipse, rect, gloss, dark, light, shade, n, rng, vesicle, smooth, smoothOpen, blob, line, mito, granules, nucleusDetail, rim, membrane, speckle } from './kit.js';
import { cellCat, makeCell, round, box, outline, poly, spindle, stellate, pack, lipid, rer, golgi, brush, cilia, taper } from './cellkit.js';
import { colCell, basement } from './cells-epi.js';

const nv = cellCat('Nervous system cells', { size: 130 });
const se = cellCat('Sensory cells');
const mu = cellCat('Muscle cells', { shape: 'rect' });
const ct = cellCat('Connective tissue cells');
const bo = cellCat('Bone & cartilage cells');

/** Myelin segments (internodes) along a polyline, with gaps (nodes of Ranvier). */
function myelin(pts, c, w = 6, from = 1) {
  let s = '';
  for (let i = from; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0) * 0.78, a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    s += `<g transform="translate(${n(mx)} ${n(my)}) rotate(${n(a)})">${rect(-L / 2, -w / 2, L, w, w / 2, c, dark(c, 0.4), 0.9)}${rect(-L / 2 + w * 0.3, -w * 0.32, L - w * 0.6, w * 0.22, w * 0.11, '#fff', 'none', 0, ' opacity="0.55"')}</g>`;
  }
  return s;
}
const bouton = (x, y, r, c) => circle(x, y, r, light(c, 0.15), dark(c, 0.42), 1) + circle(x + r * 0.15, y + r * 0.15, r * 0.4, dark(c, 0.15), 'none', 0, ' opacity="0.5"') + circle(x - r * 0.35, y - r * 0.35, r * 0.28, '#fff', 'none', 0, ' opacity="0.6"');
const tip = (list, i) => { const sp = list[i].spines; const p = sp[sp.length > 1 ? 1 : 0]; return p[p.length - 1]; };

/** A shaded cylinder (muscle fibers): light top edge, darker underside. */
function cylGrad(u, key, c) {
  const id = `${u}-${key}`;
  return { def: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, 0.3)}"/><stop offset="0.3" stop-color="${shade(c, 0.08)}"/><stop offset="0.75" stop-color="${shade(c, -0.12)}"/><stop offset="1" stop-color="${shade(c, -0.3)}"/></linearGradient>`, url: `url(#${id})` };
}

/** Bone or cartilage matrix block with lamellae / texture. */
function matrix(u, key, x, y, w, h, c, { lamellae = true, seed = 3 } = {}) {
  const g = sphere(u, key, c, { r: 90, hi: 0.25, lo: -0.08 });
  let s = defs(g) + rect(x, y, w, h, 8, g.url, dark(c, 0.3), 1.4);
  if (lamellae) {
    let l = '';
    for (let i = 1; i < 6; i++) l += `M${x + 4} ${n(y + (h * i) / 6)} Q${n(x + w / 2)} ${n(y + (h * i) / 6 + (i % 2 ? 3 : -3))} ${x + w - 4} ${n(y + (h * i) / 6)} `;
    s += `<path d="${l}" fill="none" stroke="${dark(c, 0.12)}" stroke-width="1" opacity="0.6"/>`;
  }
  return s + speckle(x + w / 2, y + h / 2, w * 0.45, h * 0.42, 24, 0.7, dark(c, 0.2), seed, 0.5);
}

export const tissueCells = [
  // ---- nervous system ---------------------------------------------------------------------------
  nv('pyramidal-neuron', 'Pyramidal neuron', ['pyramidal', 'cortical neuron', 'excitatory', 'glutamatergic', 'hippocampus', 'cortex', 'neuron'], { primary: '#f0a35e', secondary: '#7b3b1d', accent: '#f6e2a8' },
    (c, u) => stellate(c, u, {
      soma: outline([[50, 34], [60, 50], [64, 62], [50, 66], [36, 62], [40, 50]], 0.9), seed: 3, cx: 50, cy: 54, rx: 10, ry: 10,
      arms: [{ a: -90, len: 32, w: 6.5, depth: 2, spread: 28 }, { a: 160, len: 24, w: 4.5, depth: 1 }, { a: 20, len: 24, w: 4.5, depth: 1 }, { a: 125, len: 20, w: 4, depth: 1 }, { a: 60, len: 18, w: 4, depth: 1 }, { a: 92, len: 34, w: 2.6, depth: 0, bend: 0.05 }],
      nuclei: [{ cx: 50, cy: 56, rx: 6, ry: 6, seed: 4, nucleolus: 'big', chroma: 0.5, sw: 1.1 }], mito: 0, ves: 0, gran: { count: 6, r: 1, glint: 0, color: dark(c.primary, 0.3) },
      armOver: (ctx, list) => { const sp = list[5].spines[0]; return myelin(sp, c.accent, 4.4, 1); },
    })),
  nv('purkinje-cell', 'Purkinje cell', ['purkinje', 'cerebellum', 'gabaergic', 'dendritic tree', 'neuron'], { primary: '#e9787a', secondary: '#6e2034', accent: '#f6e2a8' },
    (c, u) => stellate(c, u, {
      soma: outline([[50, 58], [60, 64], [62, 74], [50, 80], [38, 74], [40, 64]], 0.95), seed: 7, cx: 50, cy: 69, rx: 11, ry: 10,
      arms: [{ a: -90, len: 30, w: 7, depth: 3, spread: 26, twig: 0.7 }, { a: -125, len: 26, w: 5.5, depth: 3, spread: 30, twig: 0.7 }, { a: -55, len: 26, w: 5.5, depth: 3, spread: 30, twig: 0.7 }, { a: 90, len: 18, w: 2.8, depth: 0 }],
      nuclei: [{ cx: 50, cy: 70, rx: 6, ry: 5.5, seed: 4, nucleolus: 'big', chroma: 0.5, sw: 1.1 }], mito: 0, ves: 0,
      armOver: (ctx, list) => { const sp = list[3].spines[0]; return myelin(sp, c.accent, 4.2, 1); },
    })),
  nv('motor-neuron', 'Motor neuron', ['motor neuron', 'motoneuron', 'spinal cord', 'als', 'efferent', 'multipolar', 'neuron'], { primary: '#7fb0e8', secondary: '#2f4f8f', accent: '#f6e2a8' },
    (c, u) => stellate(c, u, {
      cx: 30, cy: 34, rx: 15, ry: 13, seed: 9,
      arms: [{ a: -150, len: 22, w: 6, depth: 2 }, { a: -95, len: 24, w: 6, depth: 2 }, { a: -35, len: 22, w: 6, depth: 2 }, { a: 170, len: 18, w: 5, depth: 1 }, { a: 115, len: 20, w: 5, depth: 1 }, { a: 42, len: 90, w: 3.2, depth: 0, bend: 0.04 }],
      nuclei: [{ cx: 30, cy: 34, rx: 6.5, ry: 6, seed: 4, nucleolus: 'big', chroma: 0.5, sw: 1.1 }], mito: 0, ves: 0, gran: { count: 8, r: 1.1, glint: 0, color: dark(c.primary, 0.32) },
      armOver: (ctx, list) => {
        const sp = list[5].spines[0], [ex, ey] = sp[sp.length - 1];
        return myelin(sp, c.accent, 5.4, 1) + `<g stroke="${dark(c.primary, 0.42)}" stroke-width="2.4" stroke-linecap="round"><path d="M${n(ex)} ${n(ey)} l7 -2 M${n(ex)} ${n(ey)} l1 7 M${n(ex)} ${n(ey)} l6 5"/></g>` + bouton(ex + 8, ey - 2, 2.6, c.primary) + bouton(ex + 1, ey + 8, 2.6, c.primary) + bouton(ex + 7, ey + 6, 2.6, c.primary);
      },
    })),
  nv('sensory-neuron', 'Sensory neuron (pseudounipolar)', ['sensory neuron', 'pseudounipolar', 'drg', 'dorsal root ganglion', 'afferent', 'nociceptor', 'neuron'], { primary: '#f2c14e', secondary: '#7a5216', accent: '#f6e2a8' },
    (c, u) => {
      const ax = 'M4 70 Q30 66 50 68 Q70 70 96 64';
      const stem = 'M50 68 Q46 56 50 44';
      const under = `<g fill="none" stroke-linecap="round"><path d="${ax} ${stem}" stroke="${dark(c.primary, 0.42)}" stroke-width="5.6"/><path d="${ax} ${stem}" stroke="${c.primary}" stroke-width="3.4"/></g>`
        + myelin([[4, 70], [16, 68.4], [28, 67.2], [40, 67.6]], c.accent, 5.6, 0) + myelin([[60, 69], [72, 69.2], [84, 67], [96, 64]], c.accent, 5.6, 0)
        + `<g stroke="${dark(c.primary, 0.42)}" stroke-width="1.6" stroke-linecap="round"><path d="M4 70 l-2 -5 M4 70 l-2 4"/></g>`;
      return makeCell(c, u, { shape: round(50, 30, 17, 16, { seed: 4 }), under, nuclei: [{ cx: 50, cy: 30, rx: 7, ry: 6.5, seed: 4, nucleolus: 'big', chroma: 0.5, sw: 1.1 }], mito: 1, ves: 1, seed: 5,
        gran: { count: 6, r: 1, glint: 0, color: dark(c.primary, 0.3) }, gloss: [42, 21, 6, 3, -25] });
    }),
  nv('bipolar-neuron', 'Bipolar neuron', ['bipolar neuron', 'retinal bipolar', 'bipolar cell', 'retina', 'neuron'], { primary: '#9bd17a', secondary: '#3a6b22', accent: '#f6e2a8' },
    (c, u) => stellate(c, u, {
      soma: outline([[50, 38], [58, 46], [58, 56], [50, 62], [42, 56], [42, 46]]), seed: 11,
      arms: [{ a: -90, len: 30, w: 5, depth: 2, spread: 30 }, { a: 90, len: 30, w: 4, depth: 2, spread: 32 }],
      nuclei: [{ cx: 50, cy: 50, rx: 5.6, ry: 7.5, seed: 4, nucleolus: true, chroma: 0.6, sw: 1.1 }], mito: 0, ves: 0,
      armOver: (ctx, list) => list[1].spines.map((p) => p[p.length - 1]).map(([x, y]) => bouton(x, y, 2.2, c.primary)).join(''),
    })),
  nv('interneuron', 'Interneuron', ['interneuron', 'gabaergic', 'inhibitory', 'basket cell', 'pv', 'sst', 'neuron'], { primary: '#c49be0', secondary: '#55307a', accent: '#f2c94c' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 13, ry: 12, seed: 13,
      arms: [-100, -40, 20, 80, 140, 200].map((a, i) => ({ a, len: 26 + (i % 2) * 6, w: 4.6, depth: 2, spread: 36, bend: 0.4 })),
      nuclei: [{ cx: 50, cy: 50, rx: 6, ry: 5.6, seed: 4, nucleolus: 'big', chroma: 0.5, sw: 1.1 }], mito: 0, ves: 0,
      armOver: (ctx, list) => list.slice(0, 6).flatMap((b) => b.spines.slice(1)).map((p) => p[p.length - 1]).map(([x, y], i) => (i % 2 ? circle(x, y, 1.6, c.accent, dark(c.accent, 0.4), 0.6) : '')).join(''),
    })),
  nv('astrocyte', 'Astrocyte', ['astrocyte', 'glia', 'gfap', 'blood-brain barrier', 'endfoot', 'cns', 'reactive astrocyte'], { primary: '#7fd3c7', secondary: '#226b62', accent: '#e57373' },
    (c, u) => stellate(c, u, {
      cx: 46, cy: 44, rx: 15, ry: 14, seed: 15,
      arms: [{ a: -160, len: 30, w: 6, depth: 2 }, { a: -110, len: 30, w: 6, depth: 2 }, { a: -55, len: 28, w: 6, depth: 2 }, { a: -5, len: 30, w: 6, depth: 2 }, { a: 150, len: 28, w: 6, depth: 2 }, { a: 75, len: 30, w: 7.5, depth: 0 }],
      nuclei: [{ cx: 46, cy: 44, rx: 7, ry: 6.5, seed: 4, nucleolus: false, chroma: 0.6, sw: 1.1 }], mito: 1, ves: 0,
      extraUnder: () => {
        // a capillary wrapped by the endfoot
        const vg = sphere(u, 'v', c.accent, { cx: 40, cy: 20, hi: 0.4 });
        return defs(vg) + rect(18, 76, 80, 18, 9, vg.url, dark(c.accent, 0.42), 1.6) + ellipse(30, 82, 5, 2.6, light(c.accent, 0.4), 'none', 0, ' opacity="0.6"') + ellipse(60, 88, 5, 2.6, light(c.accent, 0.4), 'none', 0, ' opacity="0.6"');
      },
      armOver: () => path('M44 74 Q48 70 60 70 Q72 70 76 75 Q72 79 60 78 Q48 78 44 74Z', shade(c.primary, -0.04), dark(c.primary, 0.42), 1.6),
    }), { roles: { primary: 'Astrocyte', secondary: 'Nucleus', accent: 'Blood vessel' } }),
  nv('oligodendrocyte', 'Oligodendrocyte', ['oligodendrocyte', 'myelin', 'myelination', 'glia', 'white matter', 'cns', 'multiple sclerosis'], { primary: '#b6a6e8', secondary: '#45358a', accent: '#f6e2a8' },
    (c, u) => {
      // axons running past, each wrapped by a myelin internode from one process
      const axons = [[8, 14], [8, 86], [92, 18], [92, 82]];
      const segs = [[18, 14, 40, 14], [18, 86, 40, 86], [64, 18, 86, 18], [62, 82, 84, 82]];
      const under = (ctx, list) => axons.map(([x, y], i) => `<path d="M${x < 50 ? 0 : 52} ${y} H${x < 50 ? 48 : 100}" stroke="${dark('#e0a060', 0.4)}" stroke-width="4.4" stroke-linecap="round"/><path d="M${x < 50 ? 0 : 52} ${y} H${x < 50 ? 48 : 100}" stroke="#e0a060" stroke-width="2.6" stroke-linecap="round"/>`).join('');
      return stellate(c, u, {
        cx: 50, cy: 50, rx: 12, ry: 11, seed: 17,
        arms: segs.map(([x0, y0, x1, y1]) => { const mx = (x0 + x1) / 2, my = y0; return { a: (Math.atan2(my - 50, mx - 50) * 180) / Math.PI, len: Math.hypot(mx - 50, my - 50) - 14, w: 3.4, depth: 0, bend: 0.05 }; }),
        nuclei: [{ cx: 50, cy: 50, rx: 6, ry: 5.6, seed: 4, nucleolus: false, chroma: 0.8, sw: 1.1 }], mito: 0, ves: 0, extraUnder: under,
        armOver: () => segs.map(([x0, y0, x1]) => { const g = sphere(u, `m${x0}${y0}`, c.accent, { cx: 40, cy: 20, hi: 0.4 }); return defs(g) + rect(x0, y0 - 5, x1 - x0, 10, 5, g.url, dark(c.accent, 0.42), 1.2) + `<path d="M${x0 + 4} ${y0 - 2} H${x1 - 4}" stroke="#fff" stroke-width="1.2" opacity="0.6"/><path d="M${x0 + 3} ${y0 + 2.4} H${x1 - 3}" stroke="${dark(c.accent, 0.2)}" stroke-width="0.7" opacity="0.6"/>`; }).join(''),
      });
    }, { roles: { primary: 'Oligodendrocyte', secondary: 'Nucleus', accent: 'Myelin' } }),
  nv('schwann-cell', 'Schwann cell (myelinating)', ['schwann cell', 'myelin sheath', 'peripheral nerve', 'pns', 'glia', 'neurilemma', 'cross-section'], { primary: '#f2d2a6', secondary: '#7a4a24', accent: '#e0a060' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 80 });
      const ag = sphere(u, 'a', c.accent, { hi: 0.45 });
      // compact myelin spiral around the axon, Schwann cytoplasm and nucleus outside
      let s = defs(g, ag) + path(blob(52, 52, 44, 42, { n: 14, wobble: 0.03, seed: 3 }), g.url, dark(c.primary, 0.42), 2);
      s += path(smooth([[22, 20], [40, 8], [64, 10], [78, 22], [62, 18], [42, 16], [28, 24]]), c.primary);
      s += nucleusDetail(u, 'n', smooth([[26, 22], [40, 10], [62, 11], [74, 19], [60, 20], [42, 18], [30, 25]]), { cx: 48, cy: 16, rx: 22, ry: 5 }, c.secondary, { seed: 4, nucleolus: false, sw: 1.1 });
      for (let i = 0; i < 8; i++) s += circle(52, 54, 34 - i * 2.2, 'none', i % 2 ? light(c.primary, 0.35) : dark(c.primary, 0.12), i % 2 ? 1.2 : 1.6);
      s += circle(52, 54, 16, ag.url, dark(c.accent, 0.42), 1.6) + speckle(52, 54, 12, 12, 10, 0.8, dark(c.accent, 0.35), 4, 0.6);
      return s + gloss(34, 30, 10, 4, 0.45, -35);
    }, { roles: { primary: 'Schwann cell / myelin', secondary: 'Nucleus', accent: 'Axon' } }),
  nv('microglia', 'Microglia', ['microglia', 'brain macrophage', 'cns immune', 'ramified', 'neuroinflammation', 'glia', 'iba1'], { primary: '#e6b06e', secondary: '#6b3d14', accent: '#c96f4a' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 11, ry: 9, seed: 19,
      arms: [-130, -70, -10, 50, 110, 170].map((a, i) => ({ a, len: 32 + (i % 2) * 4, w: 3.8, depth: 3, spread: 38, bend: 0.45, twig: 0.6 })),
      nuclei: [{ cx: 50, cy: 50, rx: 6.5, ry: 4.6, seed: 4, nucleolus: false, chroma: 1.2, sw: 1, wobble: 0.15 }], mito: 0, ves: 0,
    })),
  nv('ependymal-cell', 'Ependymal cell', ['ependymal', 'ependyma', 'ventricle', 'csf', 'cerebrospinal fluid', 'ciliated', 'glia'], { primary: '#a8d0f0', secondary: '#2f5a8f', accent: '#6fa8dc' },
    (c, u) => colCell(c, u, { x: 8, top: 26, w: 44, h: 52, r: 8, apical: 'cilia', apLen: 16, mito: 3, ves: 1, seed: 21, nuc: { y: 0.6 } }), { w: 60, h: 80, size: 70, shape: 'rect' }),
  nv('radial-glia', 'Radial glia (neural stem cell)', ['radial glia', 'neural stem cell', 'nsc', 'neural progenitor', 'neurogenesis', 'sox2', 'nestin'], { primary: '#9ed6b0', secondary: '#2f6b46', accent: '#f4b860' },
    (c, u) => stellate(c, u, {
      soma: round(50, 30, 9, 13, { seed: 3, k: 14 }), seed: 23, cx: 50, cy: 30, rx: 9, ry: 13,
      arms: [{ a: 90, len: 62, w: 5, depth: 1, spread: 22, fork: 0.85, bend: 0.1 }, { a: -90, len: 18, w: 5, depth: 0, bend: 0.05 }],
      nuclei: [{ cx: 50, cy: 31, rx: 6.5, ry: 9.5, seed: 4, nucleolus: true, chroma: 0.7, sw: 1.1 }], mito: 0, ves: 0,
      armOver: (ctx, list) => { const p = list[1].spines[0], [x, y] = p[p.length - 1]; return primaryCilium2(x, y + 1, c.accent); },
    }), { size: 110 }),

  // ---- sensory ----------------------------------------------------------------------------------
  se('rod-cell', 'Rod photoreceptor', ['rod', 'photoreceptor', 'rhodopsin', 'retina', 'scotopic', 'vision'], { primary: '#a9c8ea', secondary: '#2f4f8f', accent: '#b484d8' },
    (c, u) => {
      const og = sphere(u, 'o', c.accent, { cx: 30, cy: 20, r: 90, hi: 0.4 });
      let s = defs(og) + rect(11, 4, 18, 40, 8, og.url, dark(c.accent, 0.42), 1.4);
      for (let y = 9; y < 42; y += 2.6) s += line(13, y, 27, y, dark(c.accent, 0.25), 0.8, ' opacity="0.7"');
      s += rect(15, 6, 3, 34, 1.5, '#fff', 'none', 0, ' opacity="0.35"') + rect(18.6, 43, 2.8, 5, 1, dark(c.primary, 0.3));
      const body = outline([[13, 50], [20, 46], [27, 50], [28, 64], [26, 80], [21, 86], [19, 86], [14, 80], [12, 64]]);
      s += makeCell(c, u, { shape: body, nuclei: [{ cx: 20, cy: 74, rx: 5.6, ry: 7, seed: 3, nucleolus: false, chroma: 1.4, sw: 1 }], mito: 3, ves: 0, seed: 25, mitoLen: 5, margin: 1.8, region: (x, y) => y < 64, gloss: [17, 53, 2, 3, 0],
        under: `<path d="M20 84 V93" stroke="${dark(c.primary, 0.42)}" stroke-width="3.6" stroke-linecap="round"/><path d="M20 84 V93" stroke="${c.primary}" stroke-width="2" stroke-linecap="round"/>` + circle(20, 95, 3.4, light(c.primary, 0.1), dark(c.primary, 0.42), 1.1) });
      return s;
    }, { w: 40, h: 100, size: 60, shape: 'rect', roles: { primary: 'Inner segment', secondary: 'Nucleus', accent: 'Outer segment' } }),
  se('cone-cell', 'Cone photoreceptor', ['cone', 'photoreceptor', 'opsin', 'color vision', 'retina', 'fovea', 'photopic'], { primary: '#f2c47e', secondary: '#7a4a24', accent: '#e57373' },
    (c, u) => {
      const og = sphere(u, 'o', c.accent, { cx: 30, cy: 30, r: 90, hi: 0.4 });
      const cone = 'M20 12 L28 40 Q20 43 12 40 Z';
      let s = defs(og, `<clipPath id="${u}-oc"><path d="${cone}"/></clipPath>`) + path(cone, og.url, dark(c.accent, 0.42), 1.4);
      let disc = '';
      for (let y = 17; y < 41; y += 2.4) disc += `M8 ${y} H32 `;
      s += `<path d="${disc}" stroke="${dark(c.accent, 0.25)}" stroke-width="0.8" opacity="0.7" clip-path="url(#${u}-oc)"/>` + rect(18.6, 41, 2.8, 5, 1, dark(c.primary, 0.3));
      const body = outline([[11, 50], [20, 44], [29, 50], [31, 62], [27, 72], [26, 82], [32, 90], [20, 92], [8, 90], [14, 82], [13, 72], [9, 62]]);
      s += makeCell(c, u, { shape: body, nuclei: [{ cx: 20, cy: 72, rx: 5.6, ry: 6.5, seed: 4, nucleolus: true, chroma: 0.8, sw: 1 }], mito: 4, ves: 0, seed: 27, mitoLen: 5, margin: 1.8, region: (x, y) => y < 64, gloss: [16, 52, 3, 3, 0] });
      return s;
    }, { w: 40, h: 100, size: 60, shape: 'rect', roles: { primary: 'Inner segment', secondary: 'Nucleus', accent: 'Outer segment' } }),
  se('hair-cell', 'Hair cell (inner ear)', ['hair cell', 'cochlea', 'stereocilia', 'hearing', 'inner ear', 'mechanotransduction', 'vestibular'], { primary: '#f0b8c8', secondary: '#7a2e52', accent: '#f2c94c' },
    (c, u) => {
      let st = '';
      [[16, 10], [22, 13], [28, 16], [34, 20], [40, 24]].forEach(([x, h], i) => { st += rect(x - 1.6, 30 - h * 1.15, 3.2, h * 1.15 + 2, 1.6, shade(c.primary, 0.08 - i * 0.02), dark(c.primary, 0.42), 0.8) + rect(x - 0.8, 31 - h * 1.1, 0.8, h * 0.8, 0.4, '#fff', 'none', 0, ' opacity="0.55"'); });
      st += `<path d="M16 18.5 L22 15 L28 11.5 L34 7 L40 2.5" fill="none" stroke="${dark(c.primary, 0.5)}" stroke-width="0.7"/>`;
      const sh = outline([[10, 32], [30, 29], [50, 32], [52, 50], [50, 74], [42, 88], [30, 92], [18, 88], [10, 74], [8, 50]]);
      return makeCell(c, u, { shape: sh, under: st, nuclei: [{ cx: 30, cy: 66, rx: 10, ry: 10, seed: 5 }], mito: 3, ves: 2, seed: 29, mitoLen: 6, gloss: [20, 40, 4, 6, -10],
        inside: `<path d="M10 34 H50" stroke="${dark(c.primary, 0.25)}" stroke-width="3" opacity="0.4"/>`,
        over: path('M16 90 Q30 98 44 90 Q46 96 40 99 H20 Q14 96 16 90Z', c.accent, dark(c.accent, 0.42), 1.1) });
    }, { w: 60, h: 100, size: 70, shape: 'rect', roles: { primary: 'Cell', secondary: 'Nucleus', accent: 'Nerve ending' } }),
  se('olfactory-neuron', 'Olfactory sensory neuron', ['olfactory', 'smell', 'odorant receptor', 'olfactory epithelium', 'bipolar', 'neuron'], { primary: '#c3d98a', secondary: '#4a5f1c', accent: '#8fb04a' },
    (c, u) => {
      const proc = 'M20 46 V18 M20 72 V96';
      let cil = '';
      [-60, -35, -12, 12, 35, 60].forEach((a) => { const r = (a - 90) * Math.PI / 180; cil += `M20 14 q${n(Math.cos(r) * 8 + 2)} ${n(Math.sin(r) * 8)} ${n(Math.cos(r) * 16)} ${n(Math.sin(r) * 10 - 2)} `; });
      const under = `<path d="${cil}" fill="none" stroke="${dark(c.accent, 0.3)}" stroke-width="1.3" stroke-linecap="round"/><path d="${proc}" stroke="${dark(c.primary, 0.42)}" stroke-width="5" stroke-linecap="round"/><path d="${proc}" stroke="${c.primary}" stroke-width="3" stroke-linecap="round"/>` + circle(20, 15, 4, light(c.primary, 0.1), dark(c.primary, 0.42), 1.2);
      return makeCell(c, u, { shape: round(20, 59, 10, 14, { seed: 4 }), under, nuclei: [{ cx: 20, cy: 60, rx: 6, ry: 8.5, seed: 4, nucleolus: true, sw: 1 }], mito: 1, ves: 0, seed: 31, mitoLen: 5, margin: 1.6, gloss: [16, 50, 2, 4, 0] });
    }, { w: 40, h: 100, size: 60, shape: 'rect', roles: { primary: 'Neuron', secondary: 'Nucleus', accent: 'Cilia' } }),
  se('taste-bud', 'Taste bud', ['taste bud', 'taste receptor cell', 'gustatory', 'tongue', 'papilla', 'taste'], { primary: '#f2b6a8', secondary: '#7a3346', accent: '#f2c94c' },
    (c, u) => {
      const sh = outline([[50, 8], [66, 14], [80, 34], [84, 60], [76, 84], [50, 94], [24, 84], [16, 60], [20, 34], [34, 14]]);
      const g = sphere(u, 'b', c.primary, { r: 80 });
      let s = defs(g, `<clipPath id="${u}-c"><path d="${sh.d}"/></clipPath>`) + path(sh.d, g.url);
      let cells = '', nuc = '';
      for (let i = 0; i < 9; i++) {
        const x = 22 + i * 7, bend = (x - 50) * 0.5;
        cells += `<path d="M${50 + (x - 50) * 0.12} 10 Q${n(50 + bend * 1.3)} 50 ${n(x)} 94" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="1" opacity="0.7"/>`;
        const nx = 50 + (x - 50) * 0.95 + 3.4, ny = 56 + (i % 3) * 7;
        nuc += ellipse(nx, ny, 2.6, 5, i % 2 ? c.secondary : light(c.secondary, 0.2), dark(c.secondary, 0.35), 0.7, ` transform="rotate(${n((x - 50) * 0.5)} ${n(nx)} ${n(ny)})"`);
      }
      s += `<g clip-path="url(#${u}-c)">${cells}${nuc}</g>` + rim(u, 'r', sh.d, c.primary) + membrane(sh.d, c.primary, 2);
      s += `<path d="M42 10 Q50 2 58 10" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>` + `<g stroke="${dark(c.primary, 0.35)}" stroke-width="1.3" stroke-linecap="round"><path d="M46 8 v-5 M50 7 v-6 M54 8 v-5"/></g>`;
      s += `<path d="M32 98 Q40 88 50 92 Q60 88 68 98" fill="none" stroke="${dark(c.accent, 0.42)}" stroke-width="3.4" stroke-linecap="round"/><path d="M32 98 Q40 88 50 92 Q60 88 68 98" fill="none" stroke="${c.accent}" stroke-width="1.8" stroke-linecap="round"/>`;
      return s + gloss(34, 26, 8, 4, 0.45, -40);
    }, { roles: { primary: 'Taste cells', secondary: 'Nuclei', accent: 'Nerve fibers' } }),
  se('retinal-ganglion-cell', 'Retinal ganglion cell', ['retinal ganglion', 'rgc', 'optic nerve', 'retina', 'glaucoma', 'neuron'], { primary: '#f0a35e', secondary: '#7b3b1d', accent: '#f6e2a8' },
    (c, u) => stellate(c, u, {
      cx: 40, cy: 54, rx: 13, ry: 12, seed: 33,
      arms: [{ a: -150, len: 28, w: 5, depth: 2, spread: 36 }, { a: -105, len: 30, w: 5, depth: 2, spread: 36 }, { a: -60, len: 28, w: 5, depth: 2, spread: 36 }, { a: 160, len: 20, w: 4, depth: 1 }, { a: 20, len: 64, w: 2.8, depth: 0, bend: 0.03 }],
      nuclei: [{ cx: 40, cy: 54, rx: 6, ry: 5.6, seed: 4, nucleolus: 'big', chroma: 0.5, sw: 1.1 }], mito: 0, ves: 0,
    }), { size: 120 }),
  se('rpe-cell', 'Retinal pigment epithelial cell', ['rpe', 'retinal pigment epithelium', 'melanin', 'phagocytosis', 'macular degeneration', 'retina'], { primary: '#d9b48a', secondary: '#5a3a20', accent: '#3d2414' },
    (c, u) => {
      let mv = '';
      for (let x = 12; x < 60; x += 5) mv += `M${x} 22 q-1.5 -7 1 -14 `;
      const under = `<path d="${mv}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2.8" stroke-linecap="round"/><path d="${mv}" fill="none" stroke="${c.primary}" stroke-width="1.4" stroke-linecap="round"/>`;
      return colCell(c, u, { x: 8, top: 20, w: 54, h: 44, r: 6, nuc: { y: 0.66, rx: 11, ry: 9 }, mito: 3, ves: 1, seed: 35, under,
        apicalGran: { count: 14, r: 1.5, frac: 0.4, glint: 0.3 },
        inside: `<g stroke="${dark(c.primary, 0.3)}" stroke-width="0.9" opacity="0.5"><path d="M16 56 V64 M24 54 V64 M32 56 V64 M40 54 V64 M48 56 V64 M56 54 V64"/></g>` });
    }, { w: 70, h: 70, size: 70, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Melanin' } }),

  // ---- muscle ------------------------------------------------------------------------------------
  mu('skeletal-muscle-fiber', 'Skeletal muscle fiber', ['skeletal muscle', 'muscle fiber', 'myofiber', 'striated', 'sarcomere', 'multinucleated', 'myocyte'], { primary: '#e57373', secondary: '#6e2034', accent: '#b03a48' },
    (c, u) => {
      const g = cylGrad(u, 'b', c.primary);
      const d = 'M10 10 H104 A8 20 0 0 1 104 50 H10 A8 20 0 0 1 10 10Z';
      let st = '';
      for (let x = 8; x < 106; x += 6) st += rect(x, 10, 3, 40, 0, c.accent, 'none', 0, ' opacity="0.42"') + line(x + 4.5, 10, x + 4.5, 50, dark(c.accent, 0.3), 0.6, ' opacity="0.5"');
      let s = defs(g, `<clipPath id="${u}-c"><path d="${d}"/></clipPath>`) + path(d, g.url) + `<g clip-path="url(#${u}-c)">${st}</g>`;
      // peripheral, flattened nuclei just under the sarcolemma
      [[30, 12.6], [66, 12.4], [48, 47.4], [86, 47.6]].forEach(([x, y], i) => { s += nucleusDetail(u, `n${i}`, smooth([[x - 9, y], [x - 4, y - 2.6], [x + 4, y - 2.6], [x + 9, y], [x + 4, y + 2.6], [x - 4, y + 2.6]]), { cx: x, cy: y, rx: 9, ry: 2.6 }, c.secondary, { seed: i + 3, nucleolus: false, sw: 0.9 }); });
      s += `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.45)}" stroke-width="1.8"/>`;
      // cut face showing myofibrils
      const fg = sphere(u, 'f', c.primary, { hi: 0.25 });
      s += defs(fg) + ellipse(104, 30, 8, 20, fg.url, dark(c.primary, 0.45), 1.6) + speckle(104, 30, 5.6, 16, 30, 0.9, c.accent, 4, 0.8);
      return s + `<path d="M14 15 H96" stroke="#fff" stroke-width="2.4" opacity="0.4" stroke-linecap="round"/>`;
    }, { w: 120, h: 60, size: 130, roles: { primary: 'Fiber', secondary: 'Nuclei', accent: 'Striations' } }),
  mu('cardiomyocyte', 'Cardiomyocyte', ['cardiomyocyte', 'heart muscle', 'cardiac muscle', 'intercalated disc', 'striated', 'myocyte'], { primary: '#e8787a', secondary: '#6e2f45', accent: '#9e2f3f' },
    (c, u) => {
      const sh = outline([[8, 14], [60, 12], [84, 8], [112, 6], [112, 22], [96, 26], [112, 34], [112, 50], [80, 48], [40, 50], [8, 48]], 0.6);
      let st = '';
      for (let x = 10; x < 112; x += 5.5) st += rect(x, 0, 2.6, 60, 0, c.accent, 'none', 0, ' opacity="0.38"');
      const disc = (x, y0, y1) => { let d = `M${x} ${y0}`; for (let y = y0; y < y1; y += 4) d += ` L${x + ((y - y0) / 4) % 2 * 2.4 - 1.2} ${y + 4}`; return `<path d="${d}" fill="none" stroke="${dark(c.accent, 0.4)}" stroke-width="1.8" stroke-linejoin="round"/>`; };
      return makeCell(c, u, { shape: sh, nuclei: [{ cx: 44, cy: 31, rx: 9, ry: 5, seed: 3, nucleolus: true, chroma: 0.7, sw: 1 }, { cx: 70, cy: 30, rx: 8.5, ry: 5, seed: 5, nucleolus: true, chroma: 0.7, sw: 1 }], mito: 6, ves: 0, seed: 37, mitoAlign: 0, mitoLen: 6, margin: 2.4,
        inside: st, grad: { cx: 40, cy: 20, r: 90, hi: 0.35 }, over: disc(9, 15, 47) + disc(111, 7, 21) + disc(111, 35, 49), gloss: [30, 17, 18, 2, -2] });
    }, { w: 120, h: 60, size: 130, roles: { primary: 'Cell', secondary: 'Nuclei', accent: 'Striations / discs' } }),
  mu('smooth-muscle-cell', 'Smooth muscle cell', ['smooth muscle', 'vascular smooth muscle', 'vsmc', 'myocyte', 'contractile', 'alpha-sma'], { primary: '#f2a0a8', secondary: '#7a2e48', accent: '#c4566e' },
    (c, u) => {
      const sh = spindle(60, 20, 112, 26, { seed: 3, blunt: 0.04 });
      let fil = '';
      for (let i = -5; i < 6; i++) fil += `M${30 + i * 9} 8 L${44 + i * 9} 32 M${44 + i * 9} 8 L${30 + i * 9} 32 `;
      return makeCell(c, u, { shape: sh, nuclei: [{ cx: 60, cy: 20, rx: 15, ry: 4.4, seed: 4, nucleolus: false, chroma: 0.8, sw: 1 }], mito: 2, ves: 0, seed: 39, mitoAlign: 0, mitoLen: 6, margin: 2,
        inside: `<path d="${fil}" stroke="${c.accent}" stroke-width="0.7" opacity="0.45"/>` + granules(60, 20, 40, 7, 10, 0.9, c.accent, 6, { glint: 0 }), gloss: [44, 14, 14, 1.8, -2] });
    }, { w: 120, h: 40, size: 130, roles: { primary: 'Cell', secondary: 'Nucleus', accent: 'Filaments / dense bodies' } }),
  mu('myoblast', 'Myoblast', ['myoblast', 'muscle progenitor', 'myogenesis', 'c2c12', 'myod'], { primary: '#f0a0a0', secondary: '#7a2e3a', accent: '#f6e2c8' },
    (c, u) => makeCell(c, u, { shape: outline([[6, 34], [22, 24], [44, 20], [60, 12], [64, 20], [84, 24], [114, 30], [90, 40], [64, 44], [42, 46], [24, 44]]), nuclei: [{ cx: 50, cy: 33, rx: 12, ry: 7, seed: 5, nucleolus: 'big', chroma: 0.7 }], mito: 4, ves: 2, seed: 41, mitoLen: 6, margin: 2.2, gloss: [34, 26, 12, 2, -6] }),
    { w: 120, h: 60, size: 130 }),
  mu('myotube', 'Myotube', ['myotube', 'myogenesis', 'fusion', 'differentiation', 'multinucleated', 'muscle'], { primary: '#ec8f8f', secondary: '#6e2f3a', accent: '#f6e2c8' },
    (c, u) => makeCell(c, u, { shape: outline([[4, 30], [12, 22], [40, 20], [80, 20], [108, 22], [116, 30], [108, 38], [80, 40], [40, 40], [12, 38]], 0.8),
      nuclei: [22, 38, 54, 70, 86, 100].map((x, i) => ({ cx: x, cy: 30 + (i % 2 ? 1 : -1), rx: 6, ry: 4.4, seed: i + 3, nucleolus: true, chroma: 0.6, sw: 0.9 })), mito: 3, ves: 0, seed: 43, mitoLen: 5, margin: 1.8, gloss: [40, 24, 24, 1.6, -1] }),
    { w: 120, h: 60, size: 130 }),
  mu('satellite-cell', 'Muscle satellite cell', ['satellite cell', 'muscle stem cell', 'pax7', 'regeneration', 'myofiber niche'], { primary: '#9fd6a8', secondary: '#2f6b3d', accent: '#e57373' },
    (c, u) => {
      const g = cylGrad(u, 'f', c.accent);
      const d = 'M4 26 H112 A6 18 0 0 1 112 62 H4 Z';
      let st = '';
      for (let x = 6; x < 116; x += 6) st += rect(x, 26, 3, 36, 0, dark(c.accent, 0.35), 'none', 0, ' opacity="0.35"');
      let s = defs(g, `<clipPath id="${u}-c"><path d="${d}"/></clipPath>`) + path(d, g.url) + `<g clip-path="url(#${u}-c)">${st}</g>` + `<path d="${d}" fill="none" stroke="${dark(c.accent, 0.45)}" stroke-width="1.6"/>`;
      s += makeCell(c, u, { shape: outline([[34, 27], [44, 16], [60, 13], [76, 16], [86, 27], [60, 29]], 0.9), nuclei: [{ cx: 60, cy: 21, rx: 10, ry: 5, seed: 4, nucleolus: false, chroma: 1, sw: 1 }], mito: 0, ves: 0, texture: 4, gloss: [50, 17, 6, 1.6, -8] });
      return s + `<path d="M8 30 H100" stroke="#fff" stroke-width="2" opacity="0.4" stroke-linecap="round"/>`;
    }, { w: 120, h: 70, size: 130, roles: { primary: 'Satellite cell', secondary: 'Nucleus', accent: 'Muscle fiber' } }),

  // ---- connective tissue & vascular ---------------------------------------------------------------
  ct('white-adipocyte', 'White adipocyte', ['adipocyte', 'fat cell', 'white adipose', 'lipid droplet', 'signet ring', 'obesity'], { primary: '#f4e3b8', secondary: '#7a5a2b', accent: '#f8e08e' },
    (c, u) => makeCell(c, u, { shape: round(50, 50, 44, 42, { seed: 3 }), nuclei: [{ cx: 80, cy: 70, rx: 9, ry: 4, rot: -40, seed: 4, nucleolus: false, chroma: 1.2, sw: 1 }], mito: 0, ves: 0, texture: 6,
      mid: lipid(48, 47, 38, c.accent) }), { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Lipid droplet' } }),
  ct('brown-adipocyte', 'Brown adipocyte', ['brown fat', 'brown adipocyte', 'ucp1', 'thermogenesis', 'multilocular', 'beige adipocyte'], { primary: '#d9965f', secondary: '#5a2e14', accent: '#f6d77a' },
    (c, u) => makeCell(c, u, { shape: poly(50, 50, 42, 6, { rot: 15, seed: 4 }), nuclei: [{ cx: 50, cy: 50, rx: 10, ry: 9.5, seed: 3 }], mito: 10, ves: 0, seed: 45, mitoLen: 6, mitoColor: shade(c.primary, -0.18),
      lipids: [[30, 34, 7], [66, 30, 6.4], [74, 56, 6], [56, 74, 6.8], [30, 66, 6.6], [46, 26, 4.4], [24, 50, 4.6], [70, 72, 3.6]].map(([x, y, r]) => ({ x, y, r })), lipidColor: c.accent }),
    { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Lipid droplets' } }),
  ct('myofibroblast', 'Myofibroblast', ['myofibroblast', 'fibrosis', 'wound healing', 'alpha-sma', 'activated fibroblast', 'contractile'], { primary: '#e9b48a', secondary: '#7b3b1d', accent: '#c0392b' },
    (c, u) => makeCell(c, u, { shape: outline([[4, 40], [22, 30], [40, 22], [52, 8], [60, 18], [80, 20], [100, 10], [116, 14], [102, 30], [112, 50], [86, 44], [62, 48], [40, 50], [20, 48]]),
      nuclei: [{ cx: 60, cy: 34, rx: 14, ry: 7.5, seed: 4 }], mito: 3, ves: 1, seed: 47, mitoLen: 6, margin: 2.4,
      inside: `<g fill="none" stroke="${c.accent}" stroke-width="1.3" opacity="0.65" stroke-linecap="round"><path d="M10 40 Q60 22 108 16 M16 44 Q60 36 104 42 M30 46 Q60 44 92 46 M40 26 Q70 26 100 24"/></g>`, gloss: [38, 28, 12, 2.6, -14] }),
    { w: 120, h: 60, size: 130, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Stress fibers' } }),
  ct('cancer-associated-fibroblast', 'Cancer-associated fibroblast (CAF)', ['caf', 'cancer-associated fibroblast', 'tumor stroma', 'desmoplasia', 'fap', 'tumor microenvironment'], { primary: '#d6a07a', secondary: '#6b3423', accent: '#e7a1b0' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 22, ry: 13, seed: 25,
      arms: [{ a: 180, len: 30, w: 8, depth: 2 }, { a: 0, len: 30, w: 8, depth: 2 }, { a: -110, len: 22, w: 6, depth: 1 }, { a: 70, len: 22, w: 6, depth: 1 }],
      nuclei: [{ cx: 50, cy: 50, rx: 12, ry: 6.5, seed: 4 }], mito: 2, ves: 1,
      extraUnder: () => {
        let f = '';
        for (let i = 0; i < 6; i++) f += `<path d="M${-4} ${14 + i * 15} C30 ${4 + i * 16} 60 ${26 + i * 13} 104 ${10 + i * 16}"/>`;
        return `<g fill="none" stroke-linecap="round"><g stroke="${dark(c.accent, 0.25)}" stroke-width="3.6" opacity="0.6">${f}</g><g stroke="${light(c.accent, 0.2)}" stroke-width="1.6" opacity="0.8">${f}</g></g>`;
      },
    }), { size: 130, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Collagen fibers' } }),
  ct('fibroblastic-reticular-cell', 'Fibroblastic reticular cell (FRC)', ['frc', 'fibroblastic reticular', 'lymph node stroma', 'conduit', 'ccl19', 'ccl21', 'podoplanin'], { primary: '#f0c8a0', secondary: '#7a4a24', accent: '#e8a0b4' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 13, ry: 11, seed: 27,
      arms: [-120, -50, 10, 70, 130, 190].map((a, i) => ({ a, len: 34, w: 6.4, depth: 1, spread: 40 })),
      nuclei: [{ cx: 50, cy: 50, rx: 7.5, ry: 6, seed: 4, nucleolus: false }], mito: 0, ves: 0,
      armOver: (ctx, list) => `<g fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round" opacity="0.9">${list.slice(0, 6).flatMap((b) => b.spines).map((p) => `<path d="${smoothOpen(p.slice(0, -1))}"/>`).join('')}</g>`,
    }), { size: 130, roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Collagen conduit' } }),
  ct('endothelial-cell', 'Endothelial cell', ['endothelial cell', 'endothelium', 'huvec', 'blood vessel', 'weibel-palade', 'cd31', 'vascular'], { primary: '#f2b8b8', secondary: '#8a2f3e', accent: '#d9534f' },
    (c, u) => makeCell(c, u, { shape: outline([[4, 30], [20, 18], [46, 12], [74, 12], [100, 18], [116, 30], [100, 42], [74, 48], [46, 48], [20, 42]], 0.9),
      nuclei: [{ cx: 60, cy: 30, rx: 14, ry: 8.5, seed: 5 }], mito: 3, ves: 2, seed: 49, mitoLen: 6, margin: 2.4,
      mid: [[26, 26, 20], [32, 36, -10], [90, 24, 30], [96, 34, -20], [40, 20, 5], [80, 40, 10]].map(([x, y, a]) => rect(x - 3.4, y - 1, 6.8, 2, 1, c.accent, dark(c.accent, 0.4), 0.6, ` transform="rotate(${a} ${x} ${y})"`)).join(''), gloss: [40, 18, 16, 2.6, -4] }),
    { w: 120, h: 60, size: 130, shape: 'rect', roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Weibel–Palade bodies' } }),
  ct('lymphatic-endothelial-cell', 'Lymphatic endothelial cell', ['lymphatic endothelial', 'lec', 'lymphatic vessel', 'prox1', 'lyve-1', 'button junctions', 'oak leaf'], { primary: '#cfe6d0', secondary: '#2f6b46', accent: '#7fbf8f' },
    (c, u) => makeCell(c, u, { shape: outline([[6, 30], [14, 16], [24, 24], [32, 8], [44, 18], [56, 6], [66, 18], [80, 8], [88, 22], [102, 14], [114, 30], [102, 44], [90, 38], [80, 52], [66, 42], [56, 54], [44, 42], [32, 52], [24, 38], [14, 46]], 0.8),
      nuclei: [{ cx: 60, cy: 30, rx: 12, ry: 7.5, seed: 6 }], mito: 3, ves: 1, seed: 51, mitoLen: 5, margin: 2.4, gloss: [36, 22, 12, 2.4, -4] }),
    { w: 120, h: 60, size: 130, shape: 'rect' }),
  ct('pericyte', 'Pericyte', ['pericyte', 'mural cell', 'capillary', 'microvasculature', 'pdgfrb', 'blood-brain barrier'], { primary: '#d9a7d6', secondary: '#5e2a6b', accent: '#e57373' },
    (c, u) => {
      const vg = cylGrad(u, 'v', c.accent);
      let s = defs(vg) + rect(2, 24, 116, 30, 15, vg.url, dark(c.accent, 0.42), 1.6) + `<path d="M8 30 H112" stroke="#fff" stroke-width="2" opacity="0.4" stroke-linecap="round"/>`;
      // processes wrapping around the capillary
      const wrap = 'M26 22 C22 34 22 46 28 56 M44 20 C40 34 40 46 46 57 M76 20 C80 34 80 46 74 57 M94 22 C98 34 98 46 92 56 M30 22 H90';
      s += `<path d="${wrap}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="6.4" stroke-linecap="round"/><path d="${wrap}" fill="none" stroke="${c.primary}" stroke-width="4" stroke-linecap="round"/>`;
      s += makeCell(c, u, { shape: outline([[34, 22], [44, 12], [60, 9], [76, 12], [86, 22], [60, 26]], 0.9), nuclei: [{ cx: 60, cy: 17, rx: 10, ry: 5, seed: 4, nucleolus: false, sw: 1 }], mito: 0, ves: 0, texture: 4, gloss: [50, 13, 6, 1.6, -8] });
      return s;
    }, { w: 120, h: 60, size: 130, shape: 'rect', roles: { primary: 'Pericyte', secondary: 'Nucleus', accent: 'Capillary' } }),

  // ---- bone & cartilage ---------------------------------------------------------------------------
  bo('osteoblast', 'Osteoblast', ['osteoblast', 'bone formation', 'osteoid', 'runx2', 'ossification', 'bone'], { primary: '#a9c9ea', secondary: '#33529e', accent: '#efe2c4' },
    (c, u) => {
      let s = matrix(u, 'm', 2, 70, 116, 28, c.accent) + rect(4, 64, 112, 8, 3, light(c.accent, 0.3), dark(c.accent, 0.2), 0.8, ' opacity="0.9"');
      [16, 104].forEach((x, i) => { s += makeCell(c, u + 'x' + i, { shape: box(x - 12, 30, 24, 34, 7), nuclei: [{ cx: x, cy: 40, rx: 7, ry: 6, seed: i + 5, sw: 1 }], mito: 1, ves: 0, texture: 4, gloss: false }); });
      s += makeCell(c, u, { shape: box(34, 18, 52, 46, 10), nuclei: [{ cx: 60, cy: 31, rx: 12, ry: 9, seed: 4 }], mito: 2, ves: 3, seed: 53, mitoLen: 6, er: { a0: 30, a1: 150, count: 3, gap: 3.2, start: 3 }, vesColor: light(c.accent, 0.2), gloss: [44, 24, 6, 2.4, -20] });
      return s;
    }, { w: 120, h: 100, size: 130, shape: 'rect', roles: { primary: 'Osteoblast', secondary: 'Nucleus', accent: 'Bone / osteoid' } }),
  bo('osteocyte', 'Osteocyte', ['osteocyte', 'lacuna', 'canaliculi', 'mechanosensing', 'sclerostin', 'bone'], { primary: '#e9b48a', secondary: '#7b3b1d', accent: '#efe2c4' },
    (c, u) => stellate(c, u, {
      cx: 50, cy: 50, rx: 18, ry: 10, seed: 29,
      arms: [-160, -120, -75, -30, 20, 65, 115, 160].map((a, i) => ({ a, len: 32, w: 2.6, depth: 2, spread: 34, bend: 0.4 })),
      nuclei: [{ cx: 50, cy: 50, rx: 9, ry: 5.5, seed: 4, nucleolus: false, chroma: 1.1, sw: 1 }], mito: 0, ves: 0,
      extraUnder: () => matrix(u, 'm', 2, 2, 96, 96, c.accent) + ellipse(50, 50, 24, 15, dark(c.accent, 0.1), dark(c.accent, 0.3), 1, ' opacity="0.9"'),
    }), { roles: { primary: 'Osteocyte', secondary: 'Nucleus', accent: 'Bone matrix' } }),
  bo('osteoclast', 'Osteoclast', ['osteoclast', 'bone resorption', 'ruffled border', 'howship lacuna', 'rankl', 'multinucleated', 'bone'], { primary: '#e6a0c0', secondary: '#6a2a5a', accent: '#efe2c4' },
    (c, u) => {
      // bone with a resorption pit; the cell's ruffled border faces the pit
      const bone = 'M2 64 H22 Q34 64 38 74 Q60 86 82 74 Q86 64 98 64 H118 V98 H2 Z';
      const bg = sphere(u, 'bn', c.accent, { r: 90, hi: 0.25, lo: -0.08 });
      let s = defs(bg) + path(bone, bg.url, dark(c.accent, 0.3), 1.4) + speckle(60, 86, 54, 10, 30, 0.8, dark(c.accent, 0.22), 3, 0.5);
      s += `<path d="M2 80 Q60 92 118 80 M2 90 Q60 98 118 90" fill="none" stroke="${dark(c.accent, 0.12)}" stroke-width="1" opacity="0.6"/>`;
      const sh = outline([[20, 62], [24, 40], [40, 22], [60, 16], [80, 22], [96, 40], [100, 62], [86, 64], [80, 70], [70, 76], [60, 78], [50, 76], [40, 70], [34, 64]], 0.95);
      let ruffle = 'M38 68';
      for (let x = 40; x <= 82; x += 3) ruffle += ` L${x} ${n(70 + Math.sin((x - 38) / 21 * Math.PI) * 6 + (x % 6 ? 2 : -1.4))}`;
      s += makeCell(c, u, { shape: sh, nuclei: [[38, 44], [52, 34], [68, 34], [82, 44], [60, 50]].map(([x, y], i) => ({ cx: x, cy: y, rx: 6.5, ry: 5.4, seed: i + 3, nucleolus: true, chroma: 0.6, sw: 1 })), mito: 4, ves: 5, seed: 55, mitoLen: 6, vesColor: light(c.primary, 0.3),
        over: `<path d="${ruffle}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="1.3" stroke-linejoin="round"/>`, gloss: [42, 26, 10, 3.4, -25] });
      return s;
    }, { w: 120, h: 100, size: 140, shape: 'rect', roles: { primary: 'Osteoclast', secondary: 'Nuclei', accent: 'Bone' } }),
  bo('chondrocyte', 'Chondrocyte', ['chondrocyte', 'cartilage', 'lacuna', 'isogenous group', 'collagen ii', 'aggrecan', 'osteoarthritis'], { primary: '#c9a7e0', secondary: '#4b2f80', accent: '#cfe0f2' },
    (c, u) => {
      let s = matrix(u, 'm', 2, 2, 96, 96, c.accent, { lamellae: false }) + ellipse(50, 50, 40, 30, dark(c.accent, 0.12), dark(c.accent, 0.35), 1.2, ' opacity="0.85"');
      s += makeCell(c, u + 'a', { shape: round(32, 50, 16, 20, { seed: 3 }), nuclei: [{ cx: 32, cy: 50, rx: 7, ry: 7, seed: 3, sw: 1 }], mito: 1, ves: 1, lipids: [{ x: 26, y: 62, r: 3 }], texture: 6 });
      s += makeCell(c, u, { shape: round(68, 50, 16, 20, { seed: 5 }), nuclei: [{ cx: 68, cy: 50, rx: 7, ry: 7, seed: 5, sw: 1 }], mito: 1, ves: 1, lipids: [{ x: 74, y: 38, r: 3 }], texture: 6 });
      return s;
    }, { roles: { primary: 'Chondrocytes', secondary: 'Nuclei', accent: 'Cartilage matrix' } }),
];

function primaryCilium2(x, y, col) {
  return `<path d="M${n(x)} ${n(y)} q3 -6 1 -12" fill="none" stroke="${dark(col, 0.42)}" stroke-width="3" stroke-linecap="round"/><path d="M${n(x)} ${n(y)} q3 -6 1 -12" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>`;
}
