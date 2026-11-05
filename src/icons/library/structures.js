// Organelles and cell structures: lysosomes, peroxisomes, cytoskeleton, junctions, membranes,
// synapse, sarcomere, cilia.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, rng, vesicle, smooth, smoothOpen, blob, mito, rim, membrane, speckle, ring, granules, helix, membraneStrip, domain, linear } from './kit.js';
import { lipid, round, pack } from './cellkit.js';
import { chloroplast } from './cells-other.js';

const R3 = { primary: 'Main', secondary: 'Secondary', accent: 'Accent' };
const og = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Organelles', tags, colors, roles: R3, draw, size: 90, shape: 'ellipse', ...extra });
const cs = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Cell structures', tags, colors, roles: R3, draw, size: 110, ...extra });

/** A round membrane-bound organelle body with shading. */
function body(u, key, cx, cy, r, c, { sw = 2.4, ry = r } = {}) {
  const g = sphere(u, key, c, { r: 78, hi: 0.45 });
  const d = blob(cx, cy, r, ry, { n: 14, wobble: 0.02, seed: 3 });
  return { svg: defs(g) + path(d, g.url), d, edge: rim(u, `${key}r`, d, c, { op: 0.3 }) + membrane(d, c, sw) };
}

/** Tubulin-like bead with a glint. */
const bead = (x, y, r, c) => circle(x, y, r, c, dark(c, 0.4), n(r * 0.16)) + circle(x - r * 0.3, y - r * 0.32, r * 0.36, '#fff', 'none', 0, ' opacity="0.55"');

/** A vertical lipid bilayer at x (junction icons). */
function vMembrane(x, c, h = 100) {
  return `<g transform="translate(${x} 0) rotate(90) translate(0 -0)">${membraneStrip(0, h, 0, 13, c.primary, c.secondary)}</g>`;
}

export const organelles2 = [
  og('lysosome', 'Lysosome', ['lysosome', 'degradation', 'acid hydrolases', 'autophagy', 'lamp1', 'v-atpase'], { primary: '#f5b971', secondary: '#c4562f', accent: '#8e44ad' },
    (c, u) => {
      const b = body(u, 'b', 50, 50, 40, c.primary);
      let s = b.svg;
      const R = rng(5);
      let enz = '';
      for (let i = 0; i < 14; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 28; enz += `<path d="${blob(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, 3 + R() * 2, 2.4 + R() * 1.6, { n: 6, wobble: 0.25, seed: i + 3, rot: R() * 3 })}"/>`; }
      s += `<g fill="${c.accent}" stroke="${dark(c.accent, 0.4)}" stroke-width="0.7" opacity="0.85">${enz}</g>`;
      s += speckle(50, 50, 30, 30, 24, 0.8, c.secondary, 4, 0.6) + b.edge;
      // proton pumps in the membrane
      ring(50, 50, 40, 40, 6, 0.4).forEach((p) => { s += `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.a * 180) / Math.PI + 90)})">${rect(-2.6, -4, 5.2, 8, 2, c.secondary, dark(c.secondary, 0.4), 0.8)}<text x="0" y="-6" font-size="5" text-anchor="middle" fill="${dark(c.secondary, 0.3)}" font-family="Arial" font-weight="700">H⁺</text></g>`; });
      return s + gloss(34, 30, 12, 6, 0.5);
    }, { roles: { primary: 'Lumen', secondary: 'Proton pumps', accent: 'Enzymes' } }),
  og('peroxisome', 'Peroxisome', ['peroxisome', 'catalase', 'fatty acid oxidation', 'h2o2', 'microbody'], { primary: '#a8dba8', secondary: '#3d8b4f', accent: '#2f6b3d' },
    (c, u) => {
      const b = body(u, 'b', 50, 50, 38, c.primary, { ry: 34 });
      let s = b.svg + speckle(50, 50, 28, 24, 30, 0.9, c.secondary, 3, 0.5);
      // crystalline urate-oxidase core
      let lat = '';
      for (let i = -3; i <= 3; i++) lat += `M${n(40 + i * 3)} 38 L${n(40 + i * 3 + 12)} 62 M38 ${n(50 + i * 3)} L62 ${n(50 + i * 3 - 4)} `;
      s += `<g transform="rotate(20 50 50)">${rect(38, 38, 24, 24, 3, c.accent, dark(c.accent, 0.4), 1)}<path d="${lat}" stroke="${light(c.accent, 0.35)}" stroke-width="0.8" clip-path="none" opacity="0.7"/></g>`;
      return s + b.edge + gloss(34, 30, 12, 6, 0.5);
    }, { roles: { primary: 'Matrix', secondary: 'Enzymes', accent: 'Crystalline core' } }),
  og('endosome', 'Endosome (multivesicular body)', ['endosome', 'multivesicular body', 'mvb', 'endocytosis', 'intraluminal vesicles', 'early endosome', 'late endosome'], { primary: '#9fc5e8', secondary: '#3d6fb0', accent: '#f2c94c' },
    (c, u) => {
      const tub = 'M78 30 Q90 22 96 10 M80 66 Q92 76 96 90';
      let s = `<path d="${tub}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="8" stroke-linecap="round"/><path d="${tub}" fill="none" stroke="${c.primary}" stroke-width="5.4" stroke-linecap="round"/>`;
      const b = body(u, 'b', 46, 50, 38, c.primary);
      s += b.svg;
      const ps = pack(round(46, 50, 33, 33), [], 14, { rmin: 3, rmax: 6, seed: 3, margin: 0.6, gap: 0.8 });
      ps.forEach((p, i) => { s += circle(p.x, p.y, p.r, light(c.primary, 0.4), dark(c.secondary, 0.1), 1) + circle(p.x, p.y, p.r * 0.45, i % 3 ? light(c.accent, 0.3) : 'none', 'none', 0, ' opacity="0.7"'); });
      return s + b.edge + gloss(30, 30, 12, 6, 0.5);
    }, { roles: { primary: 'Endosome', secondary: 'Vesicle membranes', accent: 'Cargo' } }),
  og('autophagosome', 'Autophagosome', ['autophagosome', 'autophagy', 'lc3', 'double membrane', 'mitophagy', 'phagophore'], { primary: '#d9c2e9', secondary: '#7a5aa8', accent: '#f39a6b' },
    (c, u) => {
      const b = body(u, 'b', 50, 50, 42, c.primary);
      let s = b.svg + mito(44, 46, 30, -20, c.accent);
      s += `<path d="${blob(66, 66, 9, 7, { n: 7, wobble: 0.2, seed: 4 })}" fill="${light(c.secondary, 0.3)}" stroke="${dark(c.secondary, 0.2)}" stroke-width="1"/>` + speckle(34, 70, 8, 6, 8, 1.2, c.secondary, 6, 0.8);
      s += b.edge + circle(50, 50, 37, 'none', dark(c.primary, 0.35), 1.6) + circle(50, 50, 37, 'none', light(c.primary, 0.4), 0.6, ' opacity="0.7"');
      // LC3 on the outer membrane
      ring(50, 50, 42, 42, 10, 0.2).forEach((p) => { s += circle(p.x, p.y, 2, c.secondary, dark(c.secondary, 0.4), 0.6); });
      return s + gloss(32, 28, 12, 6, 0.5);
    }, { roles: { primary: 'Autophagosome', secondary: 'LC3 / membrane', accent: 'Cargo' } }),
  og('lipid-droplet', 'Lipid droplet', ['lipid droplet', 'triglyceride', 'perilipin', 'fat storage', 'neutral lipid'], { primary: '#f6d77a', secondary: '#c98a2b', accent: '#e8724a' },
    (c) => lipid(50, 50, 40, c.primary) + ring(50, 50, 40, 40, 18, 0.1).map((p, i) => (i % 3 === 1 ? '' : circle(p.x, p.y, 2.6, c.accent, dark(c.accent, 0.4), 0.7))).join(''),
    { roles: { primary: 'Neutral lipid', secondary: 'Edge', accent: 'Perilipin coat' } }),
  og('centrosome', 'Centrosome', ['centrosome', 'centriole', 'mtoc', 'pericentriolar material', 'spindle pole'], { primary: '#7fc9b9', secondary: '#2a6b78', accent: '#c8ead9' },
    (c, u) => {
      let s = '';
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s += line(50 + Math.cos(a) * 20, 50 + Math.sin(a) * 20, 50 + Math.cos(a) * 46, 50 + Math.sin(a) * 46, dark(c.accent, 0.2), 1.2, ' opacity="0.8"'); }
      s += path(blob(50, 50, 26, 24, { n: 10, wobble: 0.12, seed: 3 }), c.accent, 'none', 0, ' opacity="0.85"') + speckle(50, 50, 22, 20, 30, 1, dark(c.accent, 0.2), 4, 0.5);
      const cyl = (x, y, w, h, rot, k) => {
        const g = linear(u, `c${k}`, light(c.primary, 0.3), dark(c.primary, 0.2), { x1: 0, y1: 0, x2: 1, y2: 0 });
        let st = '';
        for (let i = 1; i < 6; i++) st += `M${n(x - w / 2 + (w * i) / 6)} ${n(y - h / 2 + 2)} V${n(y + h / 2 - 2)} `;
        return `<g transform="rotate(${rot} ${x} ${y})">${defs(g)}${rect(x - w / 2, y - h / 2, w, h, 3, g.url, dark(c.primary, 0.42), 1.2)}<path d="${st}" stroke="${dark(c.primary, 0.3)}" stroke-width="1.2"/>${ellipse(x, y - h / 2, w / 2, 2.6, light(c.primary, 0.35), dark(c.primary, 0.42), 1)}${circle(x, y - h / 2, 2, dark(c.primary, 0.35))}</g>`;
      };
      return s + cyl(42, 50, 12, 26, 0, 0) + cyl(60, 46, 12, 24, 90, 1);
    }, { roles: { primary: 'Centrioles', secondary: 'Detail', accent: 'PCM / microtubules' } }),
  og('chloroplast', 'Chloroplast', ['chloroplast', 'photosynthesis', 'thylakoid', 'grana', 'plant', 'stroma'], { primary: '#7cc46a', secondary: '#3d7f2f', accent: '#f6e8a8' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cy: 25, hi: 0.4 });
      const d = 'M24 10 H96 Q118 10 118 35 Q118 60 96 60 H24 Q2 60 2 35 Q2 10 24 10Z';
      let s = defs(g) + path(d, g.url, dark(c.primary, 0.45), 2) + path('M24 14 H96 Q114 14 114 35 Q114 56 96 56 H24 Q6 56 6 35 Q6 14 24 14Z', light(c.primary, 0.2), dark(c.primary, 0.3), 1);
      s += `<path d="M14 35 H106 M22 28 Q40 30 58 26 M60 44 Q80 42 98 46" fill="none" stroke="${dark(c.secondary, 0.1)}" stroke-width="1.6"/>`;
      [[22, 35], [40, 31], [58, 37], [78, 33], [96, 37]].forEach(([x, y]) => { for (let j = 0; j < 5; j++) s += rect(x - 6, y - 9 + j * 3.6, 12, 3, 1.4, j % 2 ? c.secondary : shade(c.secondary, 0.12), dark(c.secondary, 0.4), 0.5); });
      s += ellipse(50, 48, 7, 3.6, c.accent, dark(c.accent, 0.35), 0.8) + ellipse(86, 22, 5, 2.6, c.accent, dark(c.accent, 0.35), 0.8);
      return s + `<path d="M22 16 H90" stroke="#fff" stroke-width="2.4" opacity="0.4" stroke-linecap="round"/>`;
    }, { w: 120, h: 70, size: 110, shape: 'rect', roles: { primary: 'Chloroplast', secondary: 'Thylakoids', accent: 'Starch' } }),
  og('smooth-er', 'Smooth endoplasmic reticulum', ['smooth er', 'ser', 'lipid synthesis', 'detoxification', 'calcium store', 'endoplasmic reticulum'], { primary: '#f7b2c4', secondary: '#c4566e', accent: '#ffffff' },
    (c) => {
      const t = 'M8 30 Q24 18 40 28 T72 26 Q86 20 94 34 M40 28 Q44 46 30 56 T20 84 M72 26 Q66 46 78 60 T86 88 M30 56 Q50 66 78 60 M20 84 Q46 76 60 90';
      return `<path d="${t}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="${t}" fill="none" stroke="${c.primary}" stroke-width="7.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${t}" fill="none" stroke="${light(c.primary, 0.45)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" transform="translate(-1 -1.4)"/>`;
    }, { shape: 'rect' }),
  og('proteasome', 'Proteasome', ['proteasome', '26s', 'ubiquitin-proteasome', 'protein degradation', '20s core', 'bortezomib'], { primary: '#7fb0e8', secondary: '#f2a65a', accent: '#e85d75' },
    (c, u) => {
      let s = '';
      [[26, c.secondary, 22], [36, c.primary, 18], [48, shade(c.primary, -0.12), 18], [60, shade(c.primary, -0.12), 18], [72, c.primary, 18]].forEach(([y, col, h], i) => {
        const g = linear(u, `r${i}`, light(col, 0.3), dark(col, 0.25), { x1: 0, y1: 0, x2: 1, y2: 0 });
        s += defs(g) + rect(24, y - 5.6, 52, 11.2, 5.6, g.url, dark(col, 0.42), 1.2);
        for (let x = 30; x < 72; x += 7) s += `<path d="M${x} ${y - 4.4} V${y + 4.4}" stroke="${dark(col, 0.2)}" stroke-width="0.8" opacity="0.6"/>`;
      });
      // 19S regulatory caps
      [[50, 14, 1], [50, 86, -1]].forEach(([x, y, k], i) => { const g = sphere(u, `cap${i}`, c.secondary, { hi: 0.4 }); s += defs(g) + path(k > 0 ? 'M26 22 Q30 4 50 4 Q70 4 74 22 Z' : 'M26 78 Q30 96 50 96 Q70 96 74 78 Z', g.url, dark(c.secondary, 0.42), 1.4); });
      return s + `<path d="M8 10 q10 2 16 10" fill="none" stroke="${c.accent}" stroke-width="2.4" stroke-linecap="round"/>` + [[8, 10], [12, 4], [4, 4]].map(([x, y]) => circle(x, y, 3, c.accent, dark(c.accent, 0.4), 0.8)).join('');
    }, { shape: 'rect', roles: { primary: '20S core', secondary: '19S caps', accent: 'Ubiquitin' } }),
  og('clathrin-coated-vesicle', 'Clathrin-coated vesicle', ['clathrin', 'coated vesicle', 'endocytosis', 'triskelion', 'receptor-mediated endocytosis', 'coated pit'], { primary: '#f2c94c', secondary: '#c48a1a', accent: '#5aa7e6' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { hi: 0.5 });
      let s = defs(g) + circle(50, 50, 40, g.url, dark(c.primary, 0.42), 2);
      // the clathrin lattice: hexagons and pentagons projected on the sphere
      let lat = '';
      ring(50, 50, 16, 16, 5, -Math.PI / 2).forEach((p, i, arr) => { const q = arr[(i + 1) % 5]; lat += `M${n(p.x)} ${n(p.y)} L${n(q.x)} ${n(q.y)} `; const o = { x: 50 + (p.x - 50) * 2.1, y: 50 + (p.y - 50) * 2.1 }; lat += `M${n(p.x)} ${n(p.y)} L${n(o.x)} ${n(o.y)} `; });
      ring(50, 50, 34, 34, 10, -Math.PI / 2).forEach((p, i, arr) => { const q = arr[(i + 1) % 10]; lat += `M${n(p.x)} ${n(p.y)} L${n(q.x)} ${n(q.y)} `; if (i % 2 === 0) { const o = { x: 50 + (p.x - 50) * 1.17, y: 50 + (p.y - 50) * 1.17 }; lat += `M${n(p.x)} ${n(p.y)} L${n(o.x)} ${n(o.y)} `; } });
      s += `<path d="${lat}" fill="none" stroke="${dark(c.secondary, 0.25)}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="${lat}" fill="none" stroke="${light(c.primary, 0.3)}" stroke-width="1.4" stroke-linecap="round"/>`;
      return s + gloss(34, 30, 12, 6, 0.45);
    }, { roles: { primary: 'Clathrin coat', secondary: 'Lattice', accent: 'Cargo' } }),
  og('exosome', 'Exosome (extracellular vesicle)', ['exosome', 'extracellular vesicle', 'ev', 'microvesicle', 'cd63', 'tetraspanin', 'mirna cargo'], { primary: '#9fd6cf', secondary: '#2f6f6a', accent: '#e85d75' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { hi: 0.5 });
      let s = '';
      ring(50, 50, 36, 36, 12, 0.2).forEach((p, i) => { const a = (p.a * 180) / Math.PI + 90; s += `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(a)})">${i % 3 === 0 ? rect(-2.4, -8, 4.8, 9, 2.2, c.secondary, dark(c.secondary, 0.4), 0.8) : `<path d="M0 0 V-6" stroke="${dark(c.secondary, 0.3)}" stroke-width="1.6"/>${circle(0, -7.5, 2.6, light(c.secondary, 0.3), dark(c.secondary, 0.4), 0.7)}`}</g>`; });
      s += defs(g) + circle(50, 50, 34, g.url, dark(c.primary, 0.42), 2) + circle(50, 50, 30, 'none', light(c.primary, 0.4), 0.8, ' opacity="0.7"');
      s += `<path d="M36 46 q4 -6 8 0 t8 0 t8 0 M40 60 q3 -4 6 0 t6 0" fill="none" stroke="${c.accent}" stroke-width="1.8" stroke-linecap="round"/>` + domain(58, 60, 5, 4.4, light(c.secondary, 0.2)) + domain(40, 36, 4, 3.6, shade(c.accent, 0.3));
      return s + gloss(36, 34, 9, 4.6, 0.5);
    }, { roles: { primary: 'Vesicle', secondary: 'Tetraspanins', accent: 'RNA cargo' } }),

  // ---- cell structures --------------------------------------------------------------------------
  cs('microtubule', 'Microtubule', ['microtubule', 'tubulin', 'cytoskeleton', 'alpha tubulin', 'beta tubulin', 'kinesin track', 'spindle'], { primary: '#5aa7e6', secondary: '#a9d4f5', accent: '#f2c94c' },
    (c) => {
      // a hollow tube of α/β-tubulin protofilaments: rows of beads lit from the top, open end on the right
      let s = ellipse(108, 30, 9, 20, dark(c.primary, 0.45), dark(c.primary, 0.5), 1);
      const rows = 7;
      for (let j = rows - 1; j >= 0; j--) {
        const t = (j + 0.5) / rows, ang = Math.PI * t, y = 30 - Math.cos(ang) * 17, lit = Math.cos(ang - 0.6);
        for (let k = 0; k < 12; k++) {
          const x = 10 + k * 8.4 + (j % 2) * 1.6;
          s += bead(x, y, 3.9 * (0.75 + 0.25 * Math.sin(ang)), shade(k % 2 ? c.secondary : c.primary, lit * 0.18 - 0.08));
        }
      }
      s += ring(108, 30, 6.4, 15, 13).map((p, i) => bead(p.x, p.y, 2, i % 2 ? c.secondary : c.primary)).join('');
      return s;
    }, { w: 120, h: 60, shape: 'rect', roles: { primary: 'α-tubulin', secondary: 'β-tubulin', accent: 'Accent' } }),
  cs('actin-filament', 'Actin filament', ['actin', 'f-actin', 'microfilament', 'cytoskeleton', 'stress fiber', 'myosin track'], { primary: '#e85d75', secondary: '#f5a3b3', accent: '#f2c94c' },
    (c) => {
      let s = '';
      for (let i = 0; i < 26; i++) {
        const t = i / 25, x = 6 + t * 108, y = 30 + Math.sin(t * Math.PI * 4) * 6;
        const y2 = 30 - Math.sin(t * Math.PI * 4) * 6;
        const front = Math.cos(t * Math.PI * 4) > 0;
        const a = bead(x, y, 4.6, c.primary), b = bead(x + 2, y2, 4.6, c.secondary);
        s += front ? b + a : a + b;
      }
      return s;
    }, { w: 120, h: 60, shape: 'rect', roles: { primary: 'Strand 1', secondary: 'Strand 2', accent: 'Accent' } }),
  cs('intermediate-filament', 'Intermediate filament', ['intermediate filament', 'keratin', 'vimentin', 'lamin', 'neurofilament', 'cytoskeleton'], { primary: '#b38be0', secondary: '#d9c2f2', accent: '#7a5aa8' },
    (c) => {
      let s = '';
      for (let k = 0; k < 4; k++) {
        const pts = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([4 + t * 112, 30 + Math.sin(t * Math.PI * 5 + k * Math.PI / 2) * 9]); }
        const d = smoothOpen(pts), col = k % 2 ? c.secondary : c.primary;
        s += `<path d="${d}" fill="none" stroke="${dark(col, 0.42)}" stroke-width="6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-width="1" opacity="0.45" stroke-linecap="round" transform="translate(0 -1)"/>`;
      }
      return s;
    }, { w: 120, h: 60, shape: 'rect', roles: { primary: 'Strands', secondary: 'Alternate strands', accent: 'Accent' } }),
  cs('cytoskeleton', 'Cytoskeleton', ['cytoskeleton', 'actin', 'microtubules', 'intermediate filaments', 'cell shape', 'stress fibers'], { primary: '#eef4fa', secondary: '#4caf50', accent: '#e85d75' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { r: 85, hi: 0.3 });
      const d = blob(50, 50, 46, 42, { n: 14, wobble: 0.04, seed: 2 });
      let s = defs(g, `<clipPath id="${u}-c"><path d="${d}"/></clipPath>`) + path(d, g.url);
      let mt = '';
      for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + 0.1, r1 = 40 + (i % 3) * 3; mt += `M38 40 Q${n(38 + Math.cos(a + 0.3) * r1 * 0.5)} ${n(40 + Math.sin(a + 0.3) * r1 * 0.5)} ${n(50 + Math.cos(a) * r1)} ${n(50 + Math.sin(a) * r1)} `; }
      let af = `M10 40 L90 30 M8 58 L92 52 M14 74 L84 70`;
      s += `<g clip-path="url(#${u}-c)"><path d="${mt}" fill="none" stroke="${c.secondary}" stroke-width="1.3" opacity="0.85"/><path d="${af}" stroke="${c.accent}" stroke-width="2" opacity="0.8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.accent}" stroke-width="6" opacity="0.45"/></g>`;
      s += circle(54, 56, 13, light('#7a6cc8', 0.4), dark('#7a6cc8', 0.2), 1.4) + circle(54, 56, 16, 'none', '#4a90d9', 1.2, ' stroke-dasharray="4 2" opacity="0.8"');
      s += circle(38, 40, 2.6, '#2e7d32') + membrane(d, '#c8d6e5', 2.2);
      return s + gloss(30, 24, 12, 4, 0.4);
    }, { size: 130, roles: { primary: 'Cytoplasm', secondary: 'Microtubules', accent: 'Actin' } }),
  cs('cilium-cross-section', 'Cilium cross-section (9+2 axoneme)', ['axoneme', '9+2', 'cilium', 'flagellum', 'dynein arms', 'microtubule doublets', 'primary ciliary dyskinesia'], { primary: '#a8d0f0', secondary: '#2f5a8f', accent: '#e8724a' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { hi: 0.4 });
      let s = defs(g) + circle(50, 50, 44, g.url) + membrane(blob(50, 50, 44, 44, { n: 16, wobble: 0.01 }), c.primary, 2.2);
      ring(50, 50, 30, 30, 9, -Math.PI / 2).forEach((p) => {
        const a = (p.a * 180) / Math.PI;
        s += `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(a + 90)})">`
          + `<path d="M5 -2 q5 -1 6 3 M5 2 q5 1 5 5" fill="none" stroke="${c.accent}" stroke-width="1.8" stroke-linecap="round"/>`
          + circle(-3, 0, 4.2, c.secondary, dark(c.secondary, 0.4), 1) + circle(-3, 0, 2.4, light(c.primary, 0.3)) + circle(3.4, 0, 3.8, shade(c.secondary, 0.15), dark(c.secondary, 0.4), 1) + circle(3.4, 0, 2, light(c.primary, 0.3)) + '</g>';
        s += line(50 + (p.x - 50) * 0.3, 50 + (p.y - 50) * 0.3, 50 + (p.x - 50) * 0.8, 50 + (p.y - 50) * 0.8, dark(c.primary, 0.25), 1.2);
      });
      s += circle(50, 50, 12, light(c.primary, 0.2), dark(c.primary, 0.25), 1) + circle(45, 50, 3.8, c.secondary, dark(c.secondary, 0.4), 1) + circle(55, 50, 3.8, c.secondary, dark(c.secondary, 0.4), 1) + circle(45, 50, 2, light(c.primary, 0.3)) + circle(55, 50, 2, light(c.primary, 0.3));
      return s + gloss(30, 26, 10, 4, 0.35);
    }, { roles: { primary: 'Cilium', secondary: 'Microtubules', accent: 'Dynein arms' } }),
  cs('nuclear-pore', 'Nuclear pore complex', ['nuclear pore', 'npc', 'nucleoporin', 'nuclear envelope', 'nuclear transport', 'importin'], { primary: '#7a6cc8', secondary: '#c0b8ea', accent: '#f39a3d' },
    (c, u) => {
      // double nuclear membrane, pore ring, cytoplasmic filaments and the nuclear basket
      const env = (y) => rect(-2, y - 7, 44, 14, 7, c.secondary, dark(c.secondary, 0.4), 1.2) + rect(78, y - 7, 44, 14, 7, c.secondary, dark(c.secondary, 0.4), 1.2);
      let s = env(50) + `<path d="M0 50 H38 M82 50 H120" stroke="${dark(c.secondary, 0.2)}" stroke-width="1" opacity="0.6"/>`;
      const g = sphere(u, 'p', c.primary, { hi: 0.4 });
      s += defs(g) + [[42, 38], [78, 38], [42, 62], [78, 62]].map(([x, y]) => ellipse(x, y, 8, 7, g.url, dark(c.primary, 0.42), 1.2)).join('') + rect(36, 44, 8, 12, 3, c.primary, dark(c.primary, 0.42), 1) + rect(76, 44, 8, 12, 3, c.primary, dark(c.primary, 0.42), 1);
      s += `<g fill="none" stroke="${dark(c.primary, 0.1)}" stroke-width="2" stroke-linecap="round"><path d="M40 32 Q34 20 38 8 M80 32 Q86 20 82 8 M46 32 Q50 22 48 12 M74 32 Q70 22 72 12"/><path d="M42 68 Q50 84 60 86 Q70 84 78 68"/><path d="M48 68 Q54 80 60 86 M72 68 Q66 80 60 86"/></g>` + circle(60, 86, 3, c.primary, dark(c.primary, 0.42), 1);
      return s + domain(60, 50, 5, 4.6, c.accent) + `<path d="M60 40 V30 l-3 4 M60 30 l3 4" stroke="${c.accent}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    }, { w: 120, h: 100, shape: 'rect', roles: { primary: 'Pore complex', secondary: 'Nuclear envelope', accent: 'Cargo' } }),
  cs('plasma-membrane', 'Cell membrane (fluid mosaic)', ['plasma membrane', 'cell membrane', 'fluid mosaic', 'lipid bilayer', 'membrane proteins', 'glycocalyx'], { primary: '#f3c27a', secondary: '#c98a4b', accent: '#5aa7e6' },
    (c, u) => {
      let s = membraneStrip(2, 118, 50, 22, c.primary, c.secondary);
      // integral proteins (helix bundles), a channel, a peripheral protein, glycans and cholesterol
      s += helix(18, 34, 7, 32, c.accent) + helix(26, 34, 7, 32, shade(c.accent, 0.15)) + helix(34, 34, 7, 32, c.accent);
      const pg = sphere(u, 'p', '#8e7cc3', { hi: 0.4 });
      s += defs(pg) + path(blob(70, 50, 11, 20, { n: 9, wobble: 0.08, seed: 3 }), pg.url, dark('#8e7cc3', 0.42), 1.2) + path(blob(92, 66, 9, 6, { n: 8, wobble: 0.1, seed: 5 }), '#7fc9b9', dark('#7fc9b9', 0.42), 1.1);
      const glyc = (x, y) => `<path d="M${x} ${y} V${y - 8} l-4 -6 M${x} ${y - 8} l4 -6" fill="none" stroke="#7b8794" stroke-width="1.2" stroke-linecap="round"/>` + [[x, y - 8], [x - 4, y - 14], [x + 4, y - 14]].map(([a, b]) => circle(a, b, 2, '#f6c945', '#9a7a10', 0.5)).join('');
      s += glyc(26, 34) + glyc(70, 30) + glyc(104, 39) + glyc(50, 39);
      s += `<g fill="#f6e8a8" stroke="#b39a3a" stroke-width="0.6">${[[46, 45], [56, 55], [100, 45]].map(([x, y]) => `<rect x="${x - 1.4}" y="${y - 4}" width="2.8" height="8" rx="1.2"/>`).join('')}</g>`;
      return s;
    }, { w: 120, h: 80, shape: 'rect', roles: { primary: 'Lipid heads', secondary: 'Lipid tails', accent: 'Membrane proteins' }, anchor: [60, 50] }),
  cs('tight-junction', 'Tight junction', ['tight junction', 'claudin', 'occludin', 'zo-1', 'barrier', 'paracellular', 'epithelial junction'], { primary: '#f3c27a', secondary: '#c98a4b', accent: '#e85d75' },
    (c) => {
      let s = vMembrane(36, c) + vMembrane(64, c);
      [16, 34, 52, 70, 88].forEach((y) => { s += rect(38, y - 3.4, 24, 6.8, 3.4, c.accent, dark(c.accent, 0.42), 1) + circle(50, y, 2.4, light(c.accent, 0.3)) + circle(30, y, 3, '#8e7cc3', dark('#8e7cc3', 0.4), 0.8) + circle(70, y, 3, '#8e7cc3', dark('#8e7cc3', 0.4), 0.8); });
      return s;
    }, { roles: { primary: 'Lipid heads', secondary: 'Lipid tails', accent: 'Claudins' } }),
  cs('desmosome', 'Desmosome', ['desmosome', 'desmoglein', 'desmocollin', 'cadherin', 'keratin', 'cell adhesion', 'pemphigus'], { primary: '#f3c27a', secondary: '#c98a4b', accent: '#7a5aa8' },
    (c) => {
      let s = '';
      const kf = 'M4 10 Q20 30 20 50 Q20 70 4 90 M8 4 Q24 26 22 50 M96 10 Q80 30 80 50 Q80 70 96 90 M92 4 Q76 26 78 50';
      s += `<path d="${kf}" fill="none" stroke="${light(c.accent, 0.2)}" stroke-width="3" stroke-linecap="round"/>`;
      s += vMembrane(36, c) + vMembrane(64, c);
      s += rect(22, 26, 8, 48, 3, dark(c.accent, 0.15), dark(c.accent, 0.45), 1) + rect(70, 26, 8, 48, 3, dark(c.accent, 0.15), dark(c.accent, 0.45), 1);
      [30, 38, 46, 54, 62, 70].forEach((y, i) => { s += `<path d="M42 ${y} Q50 ${y + (i % 2 ? 3 : -3)} 58 ${y}" fill="none" stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round"/>` + circle(50, y + (i % 2 ? 1.6 : -1.6), 1.6, light(c.accent, 0.4)); });
      return s;
    }, { roles: { primary: 'Lipid heads', secondary: 'Lipid tails', accent: 'Cadherins / plaque' } }),
  cs('gap-junction', 'Gap junction', ['gap junction', 'connexin', 'connexon', 'electrical synapse', 'cell communication'], { primary: '#f3c27a', secondary: '#c98a4b', accent: '#4fb0a0' },
    (c, u) => {
      let s = vMembrane(36, c) + vMembrane(64, c);
      [22, 50, 78].forEach((y, i) => {
        const g = linear(u, `g${i}`, light(c.accent, 0.3), dark(c.accent, 0.25));
        s += defs(g) + rect(26, y - 8, 22, 16, 4, g.url, dark(c.accent, 0.42), 1.1) + rect(52, y - 8, 22, 16, 4, g.url, dark(c.accent, 0.42), 1.1) + rect(26, y - 2, 48, 4, 2, light(c.accent, 0.55), 'none', 0);
        s += circle(40, y, 1.4, '#f2c94c') + circle(56, y, 1.2, '#f2c94c');
      });
      return s;
    }, { roles: { primary: 'Lipid heads', secondary: 'Lipid tails', accent: 'Connexons' } }),
  cs('synapse', 'Synapse', ['synapse', 'chemical synapse', 'synaptic vesicle', 'neurotransmitter', 'synaptic cleft', 'postsynaptic density'], { primary: '#f0a35e', secondary: '#7fb0e8', accent: '#f2c94c' },
    (c, u) => {
      const pre = 'M20 2 H80 V40 Q80 58 50 58 Q20 58 20 40 Z';
      const pg = sphere(u, 'pre', c.primary, { cy: 20, hi: 0.4 }), qg = sphere(u, 'post', c.secondary, { cy: 70, hi: 0.35 });
      let s = defs(pg, qg) + path(pre, pg.url, dark(c.primary, 0.42), 2) + path('M8 98 V74 Q8 66 18 66 H82 Q92 66 92 74 V98 Z', qg.url, dark(c.secondary, 0.42), 2);
      s += mito(36, 18, 16, 10, light(c.primary, 0.2));
      const ves = [[58, 16], [66, 26], [54, 30], [44, 38], [62, 40], [36, 46], [50, 48], [70, 14]];
      ves.forEach(([x, y]) => { s += circle(x, y, 4.2, light(c.primary, 0.4), dark(c.primary, 0.35), 1) + speckle(x, y, 2, 2, 3, 0.7, dark(c.accent, 0.1), x, 1); });
      s += circle(60, 56, 4, light(c.primary, 0.4), dark(c.primary, 0.35), 1);
      s += speckle(54, 62, 12, 2.4, 10, 0.9, c.accent, 5, 1);
      s += rect(26, 66, 48, 5, 2.4, dark(c.secondary, 0.25), 'none', 0, ' opacity="0.8"');
      [32, 44, 56, 68].forEach((x) => { s += rect(x - 2.4, 62, 4.8, 8, 2, c.accent, dark(c.accent, 0.42), 0.8); });
      return s + `<path d="M26 8 H70" stroke="#fff" stroke-width="2.2" opacity="0.4" stroke-linecap="round"/>`;
    }, { roles: { primary: 'Presynaptic terminal', secondary: 'Postsynaptic cell', accent: 'Neurotransmitter / receptors' } }),
  cs('sarcomere', 'Sarcomere', ['sarcomere', 'myofibril', 'actin', 'myosin', 'z disc', 'muscle contraction', 'sliding filament'], { primary: '#e85d75', secondary: '#7a5aa8', accent: '#3d3d5c' },
    (c) => {
      let s = '';
      [14, 106].forEach((x) => { s += `<path d="M${x} 6 L${x - 4} 16 L${x + 4} 26 L${x - 4} 36 L${x + 4} 46 L${x - 4} 56 L${x} 64" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linejoin="round"/>`; });
      [12, 24, 36, 48].forEach((y) => { s += line(14, y, 50, y, c.primary, 2.6) + line(70, y, 106, y, c.primary, 2.6); });
      [18, 30, 42].forEach((y) => {
        s += rect(34, y - 2.4, 52, 4.8, 2.4, c.secondary, dark(c.secondary, 0.42), 0.8);
        for (let x = 38; x < 84; x += 5) { if (Math.abs(x - 60) < 5) continue; const dir = x < 60 ? -1 : 1; s += `<path d="M${x} ${y - 2} l${dir * 2.6} -3.4 M${x} ${y + 2} l${dir * 2.6} 3.4" stroke="${dark(c.secondary, 0.2)}" stroke-width="1.6" stroke-linecap="round"/>`; }
      });
      return s + line(60, 6, 60, 54, dark(c.secondary, 0.4), 1.2, ' stroke-dasharray="2 2"');
    }, { w: 120, h: 60, shape: 'rect', roles: { primary: 'Actin (thin)', secondary: 'Myosin (thick)', accent: 'Z discs' } }),
];

export { vMembrane };
