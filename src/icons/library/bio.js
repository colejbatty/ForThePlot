// Nucleic acids, pathogens and organelles.

import { defs, sphere, linear, path, circle, ellipse, rect, line, dark, light, shade, n, ring, blob, smooth, smoothOpen, gloss, speckle, rng, rim, membrane, granules, mito, vesicle, nucleusDetail } from './kit.js';

const R3 = { primary: 'Main', secondary: 'Secondary', accent: 'Accent' };

function icon(category, id, name, tags, colors, draw, extra = {}) {
  return { id, name, category, tags, colors, roles: R3, draw, size: 90, ...extra };
}
const na = (...a) => icon('Nucleic acids', ...a);
const pa = (...a) => icon('Pathogens', ...a);
const og = (...a) => icon('Organelles', ...a);

export function helix(c, w = 120, h = 50, turns = 2.2) {
  const N = 80, A = h * 0.36, mid = h / 2;
  const pts = (ph) => Array.from({ length: N + 1 }, (_, i) => {
    const x = 6 + (i / N) * (w - 12);
    return [x, mid + Math.sin((i / N) * turns * 2 * Math.PI + ph) * A];
  });
  const s1 = pts(0), s2 = pts(Math.PI);
  let s = '';
  // base pairs: each rung is two half-bases in complementary colors
  const bases = [[c.accent, '#6abf59'], [shade(c.accent, -0.2), '#5b6bd6'], ['#6abf59', c.accent], ['#5b6bd6', shade(c.accent, -0.2)]];
  const rungs = 18;
  for (let k = 0; k < rungs; k++) {
    const i = Math.round(((k + 0.5) / rungs) * N);
    const [b1, b2] = bases[k % 4];
    const mx = (s1[i][0] + s2[i][0]) / 2, my = (s1[i][1] + s2[i][1]) / 2;
    s += line(s1[i][0], s1[i][1], mx, my, b1, 2.6) + line(mx, my, s2[i][0], s2[i][1], b2, 2.6);
  }
  const strand = (p, color) => {
    const d = smoothOpen(p.filter((_, i) => i % 2 === 0));
    return `<path d="${d}" fill="none" stroke="${dark(color, 0.35)}" stroke-width="6.8" stroke-linecap="round"/>`
      + `<path d="${d}" fill="none" stroke="${color}" stroke-width="4.4" stroke-linecap="round"/>`
      + `<path d="${d}" fill="none" stroke="${light(color, 0.5)}" stroke-width="1.4" stroke-linecap="round" opacity="0.7" transform="translate(-0.6 -1.1)"/>`;
  };
  return strand(s2, c.secondary) + s + strand(s1, c.primary);
}

export const nucleic = [
  na('dna', 'DNA double helix', ['dna', 'helix', 'genome', 'double stranded', 'dsdna', 'gene'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#f6c945' },
    (c) => helix(c), { w: 120, h: 50, size: 120, shape: 'rect' }),
  na('rna', 'RNA strand', ['rna', 'single stranded', 'ssrna', 'transcript', 'guide rna', 'mirna'], { primary: '#c95fc0', secondary: '#f6c945', accent: '#6abf59' },
    (c) => {
      const pts = Array.from({ length: 13 }, (_, i) => [6 + i * 9, 24 + Math.sin(i * 0.9) * 8]);
      let s = '';
      const cols = [c.secondary, c.accent, '#4a8fe7', '#e85d5d'];
      pts.forEach(([x, y], i) => { if (i < 12) { const col = cols[i % 4]; s += line(x, y, x, y - 12, dark(col, 0.3), 3.6) + line(x, y, x, y - 12, col, 2.2) + circle(x, y - 13, 2.2, col, dark(col, 0.35), 0.6); } });
      const d = smoothOpen(pts);
      return s + `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="6.8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.primary}" stroke-width="4.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${light(c.primary, 0.5)}" stroke-width="1.4" stroke-linecap="round" opacity="0.7" transform="translate(-0.5 -1)"/>`;
    }, { w: 120, h: 40, size: 110, shape: 'rect' }),
  na('mrna', 'mRNA', ['mrna', 'messenger rna', 'transcript', 'vaccine', '5 cap', 'poly a'], { primary: '#c95fc0', secondary: '#f39a3d', accent: '#9aa5b1' },
    (c) => {
      const pts = Array.from({ length: 9 }, (_, i) => [16 + i * 10.5, 20 + Math.sin(i * 1.2) * 6]);
      const d = smoothOpen(pts);
      let s = `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="6.8" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.primary}" stroke-width="4.4" stroke-linecap="round"/>`;
      // untranslated regions in a lighter tone at each end
      s += `<path d="${smoothOpen(pts.slice(0, 3))}" fill="none" stroke="${light(c.primary, 0.35)}" stroke-width="4.4" stroke-linecap="round"/><path d="${smoothOpen(pts.slice(6))}" fill="none" stroke="${light(c.primary, 0.35)}" stroke-width="4.4" stroke-linecap="round"/>`;
      s += `<path d="${d}" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity="0.5" transform="translate(-0.5 -1)"/>`;
      s += circle(10, 20, 7, c.secondary, dark(c.secondary, 0.42), 1.4) + `<text x="10" y="22.4" font-size="6.5" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle" fill="${dark(c.secondary, 0.6)}">m7G</text>`.replace('m7G', 'G') + gloss(7.6, 16.8, 2.4, 1.4, 0.6);
      for (let i = 0; i < 5; i++) s += circle(103 + i * 4.6, 20 + (pts[8][1] - 20) + (i % 2 ? 1 : -1), 2.5, c.accent, dark(c.accent, 0.42), 0.8) + circle(102.2 + i * 4.6, 19 + (pts[8][1] - 20) + (i % 2 ? 1 : -1), 0.8, '#fff', 'none', 0, ' opacity="0.6"');
      return s;
    }, { w: 126, h: 40, size: 110, shape: 'rect', roles: { primary: 'Coding sequence', secondary: "5' cap", accent: 'Poly(A) tail' } }),
  na('plasmid', 'Plasmid', ['plasmid', 'vector', 'circular dna', 'cloning', 'construct', 'transfection'], { primary: '#9aa5b1', secondary: '#4a8fe7', accent: '#f39a3d' },
    (c) => {
      const arc = (a0, a1, r, col) => {
        const p = (a) => [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
        const [x0, y0] = p(a0), [x1, y1] = p(a1);
        const dd = `M${n(x0)} ${n(y0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${n(x1)} ${n(y1)}`;
        return `<path d="${dd}" fill="none" stroke="${dark(col, 0.35)}" stroke-width="11.6" stroke-linecap="butt"/><path d="${dd}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="butt"/><path d="${dd}" fill="none" stroke="${light(col, 0.45)}" stroke-width="2" opacity="0.7" transform="translate(-0.6 -0.8)"/>`;
      };
      let s = circle(50, 50, 35, 'none', dark(c.primary, 0.35), 7.4) + circle(50, 50, 35, 'none', c.primary, 5) + circle(50, 50, 36.2, 'none', light(c.primary, 0.5), 1.2, ' opacity="0.7"');
      s += arc(-1.4, 0.2, 35, c.secondary) + arc(0.6, 1.7, 35, c.accent) + arc(2.4, 3.4, 35, '#6abf59');
      // arrow tips
      const tip = (a, col) => { const x = 50 + Math.cos(a) * 35, y = 50 + Math.sin(a) * 35; const t = a + Math.PI / 2; return `<path d="M${n(x + Math.cos(a) * 9)} ${n(y + Math.sin(a) * 9)} L${n(x + Math.cos(t) * 9)} ${n(y + Math.sin(t) * 9)} L${n(x - Math.cos(a) * 9)} ${n(y - Math.sin(a) * 9)}Z" fill="${col}"/>`; };
      // origin of replication
      return s + tip(0.2, c.secondary) + tip(1.7, c.accent) + tip(3.4, '#6abf59') + rect(46, 81, 8, 8, 1.6, '#f6c945', dark('#f6c945', 0.42), 1);
    }, { shape: 'ellipse', roles: { primary: 'Backbone', secondary: 'Gene 1', accent: 'Gene 2' } }),
  na('chromosome', 'Chromosome', ['chromosome', 'chromatid', 'karyotype', 'centromere', 'genome'], { primary: '#8c6bd6', secondary: '#5b3fb0', accent: '#f6c945' },
    (c, u) => {
      const gr = linear(u, 'g', light(c.primary, 0.3), dark(c.primary, 0.1), { x2: 1, y2: 0 });
      let arms = '';
      for (const sx of [-1, 1]) {
        arms += `M35 50 C ${35 + sx * 4} 40, ${35 + sx * 22} 30, ${35 + sx * 26} 8 Q ${35 + sx * 30} 2 ${35 + sx * 18} 4 C ${35 + sx * 12} 22, ${35 + sx * 4} 36, 35 50 Z `;
        arms += `M35 50 C ${35 + sx * 4} 60, ${35 + sx * 22} 70, ${35 + sx * 26} 92 Q ${35 + sx * 30} 98 ${35 + sx * 18} 96 C ${35 + sx * 12} 78, ${35 + sx * 4} 64, 35 50 Z `;
      }
      let s = defs(gr, `<clipPath id="${u}-clip"><path d="${arms}"/></clipPath>`) + `<path d="${arms}" fill="${gr.url}"/>`;
      // G-bands, clipped to the chromatids
      let bands = '';
      for (const t of [0.22, 0.4, 0.55, 0.7, 0.86]) for (const dir of [-1, 1]) {
        const y = 50 + dir * t * 46;
        bands += `<rect x="0" y="${n(y - (t === 0.4 ? 2.4 : 1.5))}" width="70" height="${t === 0.4 ? 4.8 : 3}" transform="rotate(${dir * -8} 35 ${n(y)})"/>`;
      }
      s += `<g clip-path="url(#${u}-clip)"><g fill="${c.secondary}" opacity="0.75">${bands}</g><path d="M24 12 C 28 26, 32 38, 34.5 46 M46 12 C 42 26, 38 38, 35.5 46" fill="none" stroke="#fff" stroke-width="2" opacity="0.4" stroke-linecap="round"/></g>`;
      s += `<path d="${arms}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="1.6" stroke-linejoin="round"/>`;
      return s + circle(35, 50, 4.5, c.accent, dark(c.accent, 0.42), 1) + circle(34, 48.8, 1.4, '#fff', 'none', 0, ' opacity="0.6"');
    }, { w: 70, h: 100, size: 60 }),
  na('gene', 'Gene (exons/introns)', ['gene', 'locus', 'exon', 'intron', 'promoter', 'transgene', 'construct'], { primary: '#4a8fe7', secondary: '#6abf59', accent: '#9aa5b1' },
    (c) => line(4, 15, 116, 15, c.accent, 2.6) + `<path d="M6 5 L6 15 M6 5 L14 5 M11 2 L14 5 L11 8" fill="none" stroke="#52606d" stroke-width="1.8"/>`
      + [[18, 22, c.secondary], [52, 18, c.primary], [82, 26, c.primary]].map(([x, w, col]) => rect(x, 7, w, 16, 3, col, dark(col, 0.42), 1.2) + rect(x + 2, 9, w - 4, 5, 2, light(col, 0.45), 'none', 0, ' opacity="0.7"') + rect(x + 1, 18, w - 2, 4, 2, dark(col, 0.15), 'none', 0, ' opacity="0.5"')).join(''),
    { w: 120, h: 30, size: 120, shape: 'rect', roles: { primary: 'Exons', secondary: 'Promoter / 5′', accent: 'Introns' } }),
  na('crispr-cas9', 'CRISPR–Cas9', ['crispr', 'cas9', 'gene editing', 'knockout', 'guide rna', 'sgrna'], { primary: '#6ab0e6', secondary: '#c95fc0', accent: '#f6c945' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      let s = defs(gr);
      const wave = (ph) => { let d = ''; for (let x = 2; x <= 98; x += 2) d += `${x === 2 ? 'M' : 'L'}${x} ${n(58 + Math.sin((x / 96) * Math.PI * 3 + ph) * 5)} `; return d; };
      for (let x = 6; x < 98; x += 4.5) { const y1 = 58 + Math.sin((x / 96) * Math.PI * 3) * 5, y2 = 58 - Math.sin((x / 96) * Math.PI * 3) * 5; s += line(x, y1, x, y2, c.accent, 1.6); }
      s += `<path d="${wave(Math.PI)}" fill="none" stroke="#e85d5d" stroke-width="3" stroke-linecap="round"/><path d="${wave(0)}" fill="none" stroke="#4a8fe7" stroke-width="3" stroke-linecap="round"/>`;
      // Cas9: recognition lobe and nuclease lobe, translucent over the DNA
      const body = smooth([[20, 38], [36, 14], [62, 10], [84, 26], [86, 50], [74, 72], [50, 78], [26, 70], [14, 54]]);
      s += path(body, gr.url, 'none', 0, ' opacity="0.9"');
      s += path(blob(56, 30, 22, 16, { n: 7, wobble: 0.12, seed: 3 }), light(c.primary, 0.25), 'none', 0, ' opacity="0.55"');
      s += rim(u, 'r', body, c.primary, { op: 0.3 }) + `<path d="${body}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>`;
      s += `<path d="M40 30 q10 -10 20 0 t14 6" fill="none" stroke="${dark(c.secondary, 0.35)}" stroke-width="4.8" stroke-linecap="round"/><path d="M40 30 q10 -10 20 0 t14 6" fill="none" stroke="${c.secondary}" stroke-width="3" stroke-linecap="round"/>`;
      // the cut
      s += `<path d="M66 50 l4 -6 M66 66 l4 6" stroke="#52606d" stroke-width="1.8" stroke-linecap="round"/>`;
      return s + line(38, 52, 62, 52, c.secondary, 3.4) + gloss(36, 24, 10, 4.5, 0.45);
    }, { w: 100, h: 84, size: 100, roles: { primary: 'Cas9', secondary: 'Guide RNA', accent: 'Base pairs' } }),
];

export function spikes(cx, cy, r, count, len, color, head, sw = 2.4, rot = 0) {
  // stalks with club-shaped heads (glycoprotein trimers), each head lit from the top left
  let s = '', heads = '', glints = '';
  ring(cx, cy, r, r, count, rot).forEach((p) => {
    const x2 = cx + Math.cos(p.a) * (r + len), y2 = cy + Math.sin(p.a) * (r + len);
    s += line(p.x, p.y, x2, y2, dark(color, 0.35), sw + 1.2) + line(p.x, p.y, x2, y2, shade(color, 0.1), sw * 0.55);
    if (head) {
      heads += `<ellipse cx="${n(x2)}" cy="${n(y2)}" rx="${n(head)}" ry="${n(head * 0.82)}" transform="rotate(${n((p.a * 180) / Math.PI)} ${n(x2)} ${n(y2)})"/>`;
      glints += `<circle cx="${n(x2 - head * 0.3)}" cy="${n(y2 - head * 0.32)}" r="${n(head * 0.32)}"/>`;
    }
  });
  if (head) s += `<g fill="${color}" stroke="${dark(color, 0.4)}" stroke-width="1">${heads}</g><g fill="#fff" opacity="0.5">${glints}</g>`;
  return s;
}

export function hexagon(cx, cy, r, rot = 0) {
  return Array.from({ length: 6 }, (_, i) => { const a = rot + (Math.PI / 3) * i; return `${i ? 'L' : 'M'}${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`; }).join(' ') + 'Z';
}

/** An icosahedral capsid seen face-on: a hexagon split into lit and shaded triangular facets. */
export function capsid(cx, cy, r, color, rot = Math.PI / 6) {
  const v = Array.from({ length: 6 }, (_, i) => { const a = rot + (Math.PI / 3) * i; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const shades = [0.28, 0.12, -0.05, -0.2, -0.1, 0.18];
  let s = '';
  for (let i = 0; i < 6; i++) {
    const [a, b] = [v[i], v[(i + 1) % 6]];
    s += `<path d="M${n(cx)} ${n(cy)} L${n(a[0])} ${n(a[1])} L${n(b[0])} ${n(b[1])}Z" fill="${shade(color, shades[i])}" stroke="${dark(color, 0.3)}" stroke-width="0.8" stroke-linejoin="round"/>`;
  }
  // capsomers dotted over the facets
  ring(cx, cy, r * 0.55, r * 0.55, 6, rot + Math.PI / 6).forEach((p) => { s += circle(p.x, p.y, r * 0.09, light(color, 0.35), dark(color, 0.25), 0.6); });
  return s + `<path d="${hexagon(cx, cy, r, rot)}" fill="none" stroke="${dark(color, 0.45)}" stroke-width="1.8" stroke-linejoin="round"/>`;
}

export const pathogens = [
  pa('virus', 'Virus (enveloped)', ['virus', 'virion', 'coronavirus', 'sars-cov-2', 'influenza', 'enveloped', 'spike'], { primary: '#e85d5d', secondary: '#f6c945', accent: '#b8323a' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      const d = blob(50, 50, 31, 31, { n: 16, wobble: 0.015, seed: 3 });
      let s = defs(gr) + spikes(50, 50, 30, 16, 12, c.accent, 5, 2.4) + path(d, gr.url);
      // ribonucleoprotein inside, membrane proteins on the surface
      s += `<path d="M36 52 q4 -8 8 0 t8 0 t8 0 M38 62 q4 -6 8 0 t8 0" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="2" stroke-linecap="round" opacity="0.35"/>`;
      s += granules(50, 50, 22, 22, 9, 2.6, c.secondary, 4, { glint: 0.5 });
      s += rim(u, 'r', d, c.primary, { op: 0.35 }) + membrane(d, c.primary, 2.2);
      return s + gloss(40, 37, 10, 5.5, 0.5);
    }, { shape: 'ellipse', size: 80, roles: { primary: 'Envelope', secondary: 'Surface proteins', accent: 'Spikes' } }),
  pa('herpesvirus', 'Herpesvirus (e.g. EBV)', ['herpesvirus', 'ebv', 'epstein-barr', 'cmv', 'hsv', 'kshv', 'gammaherpesvirus', 'capsid', 'dsdna virus'], { primary: '#7fb7f0', secondary: '#f6c945', accent: '#3f63b5' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary, { hi: 0.4 });
      const d = blob(50, 50, 40, 40, { n: 20, wobble: 0.01, seed: 2 });
      let s = defs(gr) + spikes(50, 50, 40, 22, 6, c.accent, 2.6, 2, 0.1) + path(d, gr.url);
      // tegument layer
      s += circle(50, 50, 31, light(c.primary, 0.35), 'none', 0, ' opacity="0.9"') + speckle(50, 50, 30, 30, 26, 1.4, shade(c.primary, -0.12), 6, 0.6);
      s += rim(u, 'r', d, c.primary, { op: 0.3, from: 0.78 }) + membrane(d, c.primary, 2.2);
      s += capsid(50, 50, 22, c.secondary);
      s += `<path d="M40 48 q5 -8 10 0 t10 0 M42 56 q4 -6 8 0 t8 0" fill="none" stroke="${dark(c.secondary, 0.5)}" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>`;
      return s + gloss(34, 30, 9, 4.5, 0.45);
    }, { shape: 'ellipse', size: 90, roles: { primary: 'Envelope / tegument', secondary: 'Capsid', accent: 'Glycoproteins' } }),
  pa('retrovirus', 'Retrovirus (e.g. HIV)', ['hiv', 'retrovirus', 'lentivirus', 'lentiviral vector', 'capsid', 'transduction'], { primary: '#6abf59', secondary: '#f39a3d', accent: '#2f7a3a' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      const cg = linear(u, 'cg', light(c.secondary, 0.35), dark(c.secondary, 0.15), { x2: 1, y2: 0 });
      const d = blob(50, 50, 35, 35, { n: 18, wobble: 0.012, seed: 5 });
      let s = defs(gr, cg) + spikes(50, 50, 34, 10, 7, c.accent, 4.2, 2.2, 0.3) + path(d, gr.url);
      s += circle(50, 50, 29, 'none', dark(c.primary, 0.2), 2.2, ' stroke-dasharray="1.6 2.2" opacity="0.6"');
      s += rim(u, 'r', d, c.primary, { op: 0.32 }) + membrane(d, c.primary, 2.2);
      // conical capsid with two RNA genomes and reverse transcriptase
      s += `<path d="M37 30 L63 30 Q65 30 64 33 L57 71 Q56 73 54 73 L46 73 Q44 73 43 71 L36 33 Q35 30 37 30Z" fill="${cg.url}" stroke="${dark(c.secondary, 0.42)}" stroke-width="2" stroke-linejoin="round"/>`;
      s += `<path d="M46 38 q4 6 0 12 t0 12 M53 38 q-4 6 0 12 t0 12" fill="none" stroke="${dark(c.secondary, 0.5)}" stroke-width="1.8" stroke-linecap="round"/>`;
      s += circle(50, 66, 2.6, '#5b6bd6', dark('#5b6bd6', 0.35), 0.8) + `<path d="M39 33 L45 70" stroke="#fff" stroke-width="2" opacity="0.4" stroke-linecap="round"/>`;
      return s + gloss(36, 34, 8, 4, 0.45);
    }, { shape: 'ellipse', size: 80, roles: { primary: 'Envelope', secondary: 'Capsid', accent: 'Env spikes' } }),
  pa('bacteriophage', 'Bacteriophage', ['phage', 'bacteriophage', 't4', 'virus'], { primary: '#8c6bd6', secondary: '#c3b3ef', accent: '#52606d' },
    (c, u) => {
      const sh = linear(u, 'sh', light(c.secondary, 0.25), dark(c.secondary, 0.2), { x2: 1, y2: 0 });
      let s = defs(sh) + capsid(30, 22, 18, c.primary, Math.PI / 2);
      // collar, contractile sheath with rings, baseplate, jointed tail fibres
      s += rect(23, 39, 14, 4, 2, dark(c.primary, 0.1), dark(c.primary, 0.42), 1.1);
      s += rect(25, 43, 10, 31, 3, sh.url, dark(c.primary, 0.42), 1.4);
      for (let y = 47; y < 72; y += 3.6) s += line(25.5, y, 34.5, y, dark(c.secondary, 0.35), 1);
      s += rect(19, 74, 22, 5, 2, c.primary, dark(c.primary, 0.42), 1.4);
      s += `<g fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 79 L12 88 L6 99 M38 79 L48 88 L54 99 M26 79 L22 90 L18 100 M34 79 L38 90 L42 100"/></g>`;
      return s + gloss(24, 14, 5, 3, 0.45);
    }, { w: 60, h: 100, size: 50 }),
  pa('bacterium', 'Bacterium (rod)', ['bacterium', 'bacteria', 'bacillus', 'e. coli', 'microbe', 'microbiome', 'pathogen'], { primary: '#6abf59', secondary: '#2f7a3a', accent: '#9aa5b1' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary, { cx: 40, cy: 25, r: 90 });
      const d = 'M36 12 H82 Q102 12 102 32 Q102 52 82 52 H36 Q16 52 16 32 Q16 12 36 12Z';
      let s = defs(gr);
      // flagella and pili
      s += `<path d="M100 28 q8 -8 14 -2 t10 -2 M100 38 q8 6 12 14 t8 10 M18 34 q-6 8 -14 2" fill="none" stroke="${dark(c.accent, 0.2)}" stroke-width="2.2" stroke-linecap="round"/>`;
      ring(59, 32, 44, 21, 22, 0.1).forEach((p) => { s += line(p.x, p.y, 59 + Math.cos(p.a) * 47, 32 + Math.sin(p.a) * 23.6, dark(c.primary, 0.25), 0.9); });
      s += path(d, gr.url);
      // cell envelope (outer membrane + wall), ribosomes and coiled nucleoid
      s += speckle(59, 32, 38, 15, 50, 0.8, dark(c.primary, 0.3), 3, 0.45);
      s += `<path d="M36 32 q4 -9 9 -2 t9 2 t9 -3 t9 3 t8 -1" fill="none" stroke="${c.secondary}" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/><path d="M38 38 q6 4 12 -1 t12 1 t12 0" fill="none" stroke="${c.secondary}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`;
      s += rim(u, 'r', d, c.primary, { op: 0.3, from: 0.6 });
      s += `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2.4"/><path d="M36 15.5 H82 Q98.5 15.5 98.5 32 Q98.5 48.5 82 48.5 H36 Q19.5 48.5 19.5 32 Q19.5 15.5 36 15.5Z" fill="none" stroke="${light(c.primary, 0.35)}" stroke-width="1.2" opacity="0.7"/>`;
      return s + gloss(42, 21, 18, 3.6, 0.5, 0);
    }, { w: 124, h: 64, size: 100, roles: { primary: 'Cell body', secondary: 'Nucleoid', accent: 'Flagella' } }),
  pa('cocci', 'Bacteria (cocci)', ['cocci', 'staphylococcus', 'streptococcus', 'bacteria', 'gram positive', 'microbe'], { primary: '#c95fc0', secondary: '#8a2f86', accent: '#c95fc0' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      let s = defs(gr);
      [[30, 34], [54, 26], [74, 44], [46, 54], [24, 64], [66, 70], [44, 80]].forEach(([x, y], i) => {
        s += circle(x, y, 13, gr.url, dark(c.primary, 0.42), 1.8) + circle(x, y, 11.4, 'none', light(c.primary, 0.3), 0.8, ' opacity="0.6"');
        if (i % 3 === 1) s += `<path d="M${x - 11} ${y + 3} Q${x} ${y - 1} ${x + 11} ${y + 3}" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="1.4" opacity="0.7"/>`;
        s += speckle(x, y, 8, 8, 5, 0.9, c.secondary, i + 2, 0.5) + gloss(x - 4, y - 5, 4, 2.4, 0.5);
      });
      return s;
    }, { shape: 'ellipse', size: 80 }),
  pa('yeast', 'Yeast / fungus', ['yeast', 'fungus', 'candida', 'saccharomyces', 'budding', 'fungal'], { primary: '#e9c46a', secondary: '#a07a2a', accent: '#e9c46a' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      const m = ellipse(40, 44, 32, 28, gr.url), bud = ellipse(78, 60, 16, 14, gr.url);
      let s = defs(gr) + bud + m;
      // cell wall, vacuole, nucleus, bud scar
      s += ellipse(40, 44, 32, 28, 'none', dark(c.primary, 0.42), 2.6) + ellipse(40, 44, 29.5, 25.5, 'none', light(c.primary, 0.3), 1.2, ' opacity="0.7"');
      s += ellipse(78, 60, 16, 14, 'none', dark(c.primary, 0.42), 2.2);
      s += ellipse(50, 52, 12, 10, light(c.primary, 0.55), dark(c.primary, 0.2), 1, ' opacity="0.85"');
      s += circle(30, 40, 8, c.secondary, dark(c.secondary, 0.35), 1.2, ' opacity="0.8"') + circle(32, 38, 2.4, dark(c.secondary, 0.3));
      s += speckle(40, 44, 24, 20, 20, 0.9, dark(c.primary, 0.3), 3, 0.5);
      s += ellipse(22, 22, 4, 2.4, 'none', dark(c.primary, 0.35), 1.2, ' transform="rotate(-40 22 22)"');
      return s + gloss(28, 28, 9, 4.5, 0.5) + gloss(74, 53, 4, 2.4, 0.45);
    }, { w: 100, h: 80, shape: 'ellipse', size: 80 }),
  pa('parasite', 'Parasite (protozoan)', ['parasite', 'plasmodium', 'malaria', 'toxoplasma', 'trypanosome', 'protozoa', 'helminth'], { primary: '#7cc47c', secondary: '#2f6b3a', accent: '#f6c945' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      const d = smooth([[10, 40], [30, 22], [60, 18], [88, 26], [112, 40], [88, 52], [58, 58], [30, 54]]);
      let s = defs(gr);
      s += `<path d="M112 40 q8 -6 6 -14" fill="none" stroke="${dark(c.primary, 0.4)}" stroke-width="2.6" stroke-linecap="round"/><path d="M112 40 q8 -6 6 -14" fill="none" stroke="${c.primary}" stroke-width="1.2" stroke-linecap="round"/>`;
      s += path(d, gr.url);
      // apical complex, organelles, nucleus with detail
      s += `<path d="M98 34 l8 4 -8 4" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="1.4"/>` + granules(84, 36, 6, 4, 5, 1.6, c.accent, 3, { glint: 0.5 });
      s += granules(30, 40, 8, 6, 4, 1.8, c.accent, 5, { glint: 0.5 }) + mito(72, 46, 8, -5, light(c.accent, 0.1));
      s += rim(u, 'r', d, c.primary, { op: 0.3, from: 0.55 }) + membrane(d, c.primary, 2);
      s += nucleusDetail(u, 'n', blob(54, 38, 10, 8, { n: 7, wobble: 0.06, seed: 3 }), { cx: 54, cy: 38, rx: 10, ry: 8 }, c.secondary, { seed: 2, chroma: 0.6, sw: 1.2 });
      return s + gloss(46, 25, 14, 3, 0.45, -5);
    }, { w: 124, h: 70, size: 100 }),
];

export const organelles = [
  og('nucleus', 'Nucleus', ['nucleus', 'nuclear envelope', 'chromatin', 'nucleolus', 'nuclear pore'], { primary: '#8c6bd6', secondary: '#5b3fb0', accent: '#c3b3ef' },
    (c, u) => {
      // double nuclear envelope with pore complexes, chromatin and a nucleolus
      let s = circle(50, 50, 45, light(c.primary, 0.55), dark(c.primary, 0.42), 2);
      ring(50, 50, 42, 42, 14).forEach((p) => { s += `<rect x="-3" y="-2.4" width="6" height="4.8" rx="1.6" fill="${light(c.primary, 0.3)}" stroke="${dark(c.primary, 0.45)}" stroke-width="1" transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.a * 180) / Math.PI)})"/>`; });
      const d = blob(50, 50, 38, 38, { n: 16, wobble: 0.01, seed: 1 });
      s += nucleusDetail(u, 'n', d, { cx: 50, cy: 50, rx: 38, ry: 38 }, c.primary, { seed: 6, nucleolus: false, chroma: 1.4 });
      s += `<path d="M28 40 q8 -10 14 2 t16 -4 t14 8 M30 62 q10 6 18 -4 t20 6" fill="none" stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>`;
      s += path(blob(58, 50, 10, 9, { n: 7, wobble: 0.12, seed: 4 }), c.secondary, dark(c.secondary, 0.4), 1.4) + speckle(58, 50, 6, 5, 6, 1.2, light(c.secondary, 0.3), 2, 0.6);
      return s + gloss(34, 30, 10, 5, 0.45);
    }, { shape: 'ellipse', size: 90 }),
  og('mitochondrion', 'Mitochondrion', ['mitochondria', 'mitochondrion', 'metabolism', 'oxphos', 'atp', 'cristae'], { primary: '#f39a6b', secondary: '#c4532a', accent: '#fcd9c4' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary, { cy: 25 });
      const outer = 'M28 6 H92 Q116 6 116 30 Q116 54 92 54 H28 Q4 54 4 30 Q4 6 28 6Z';
      let s = defs(gr) + path(outer, gr.url) + rim(u, 'r', outer, c.primary, { op: 0.3, from: 0.6 }) + `<path d="${outer}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2.2"/>`;
      // matrix inside the inner membrane, with shelf-like cristae folding in from both sides
      s += rect(11, 12, 98, 36, 18, c.accent, c.secondary, 1.8);
      for (let i = 0; i < 7; i++) {
        const x = 22 + i * 12.5, top = i % 2 === 0;
        const y0 = top ? 12 : 48, y1 = top ? 36 : 24;
        s += `<path d="M${x - 2.4} ${y0} L${x - 2.4} ${y1} Q${x} ${y1 + (top ? 4 : -4)} ${x + 2.4} ${y1} L${x + 2.4} ${y0}" fill="${light(c.primary, 0.25)}" stroke="${c.secondary}" stroke-width="1.6" stroke-linejoin="round"/>`;
      }
      s += granules(60, 30, 40, 12, 10, 1.2, dark(c.primary, 0.1), 7, { glint: 0 });
      s += circle(30, 30, 4, 'none', c.secondary, 1.1, ' stroke-dasharray="1.4 1.2"') + circle(88, 32, 3.4, 'none', c.secondary, 1.1, ' stroke-dasharray="1.4 1.2"');
      return s + gloss(36, 9, 22, 2.4, 0.5, 0);
    }, { w: 120, h: 60, size: 90, shape: 'ellipse' }),
  og('endoplasmic-reticulum', 'Endoplasmic reticulum', ['er', 'rough er', 'endoplasmic reticulum', 'secretory', 'protein folding'], { primary: '#f6a3c4', secondary: '#c4537a', accent: '#5b3fb0' },
    (c) => {
      let s = '';
      for (let i = 0; i < 4; i++) {
        const y = 18 + i * 18;
        const d = `M8 ${y} q12 -10 24 0 t24 0 t24 0 t24 0`;
        s += `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="10" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.primary}" stroke-width="7" stroke-linecap="round"/>`;
        s += `<path d="${d}" fill="none" stroke="${light(c.primary, 0.45)}" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
        for (let x = 12; x < 104; x += 7) {
          const yy = y - 5.6 + Math.sin(((x - 8) / 24) * Math.PI * 2) * -4;
          s += circle(x, yy, 1.7, c.accent, dark(c.accent, 0.3), 0.4);
        }
      }
      return s;
    }, { w: 112, h: 90, size: 100 }),
  og('golgi', 'Golgi apparatus', ['golgi', 'secretion', 'glycosylation', 'trafficking', 'cisternae'], { primary: '#6ab0e6', secondary: '#2f6fb0', accent: '#f6c945' },
    (c) => {
      let s = '';
      for (let i = 0; i < 5; i++) {
        const y = 22 + i * 12, w = 70 - Math.abs(i - 2) * 8;
        const d = `M${50 - w / 2} ${y + 6} Q50 ${y - 8} ${50 + w / 2} ${y + 6}`;
        const col = shade(c.primary, 0.12 - i * 0.06);
        s += `<path d="${d}" fill="none" stroke="${dark(col, 0.42)}" stroke-width="10" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"/>`;
        s += `<path d="${d}" fill="none" stroke="${light(col, 0.5)}" stroke-width="2" stroke-linecap="round" opacity="0.75" transform="translate(0 -1.2)"/>`;
        // dilated rims budding vesicles
        s += circle(50 - w / 2 - 1, y + 7, 4.2, col, dark(col, 0.42), 1.2) + circle(50 + w / 2 + 1, y + 7, 4.2, col, dark(col, 0.42), 1.2);
      }
      [[10, 28], [90, 34], [12, 82], [88, 86], [50, 94]].forEach(([x, y]) => { s += vesicle(x, y, 5, c.accent); });
      return s;
    }, { w: 100, h: 100, size: 90 }),
  og('vesicle', 'Vesicle / endosome / lysosome', ['vesicle', 'endosome', 'lysosome', 'exosome', 'extracellular vesicle', 'phagosome'], { primary: '#f6c945', secondary: '#e85d5d', accent: '#c98a4b' },
    (c, u) => {
      const gr = sphere(u, 'b', light(c.primary, 0.55), { hi: 0.3 });
      let s = defs(gr) + circle(50, 50, 38, gr.url);
      s += granules(50, 52, 22, 22, 10, 3.6, c.secondary, 3, { glint: 0.55 });
      // lipid bilayer membrane
      let heads = '', inner = '';
      ring(50, 50, 42, 42, 40).forEach((p) => { heads += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="2.6"/>`; });
      ring(50, 50, 35, 35, 34, 0.05).forEach((p) => { inner += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="2.3"/>`; });
      s += circle(50, 50, 38.5, 'none', c.accent, 5.6, ' opacity="0.6"');
      s += `<g fill="${c.primary}" stroke="${dark(c.primary, 0.35)}" stroke-width="0.6">${heads}${inner}</g>`;
      return s + gloss(36, 34, 9, 4.5, 0.5);
    }, { shape: 'ellipse', size: 60 }),
  og('ribosome', 'Ribosome', ['ribosome', 'translation', 'protein synthesis', '80s', 'rrna'], { primary: '#5b6bd6', secondary: '#a7b0ef', accent: '#c95fc0' },
    (c, u) => {
      const a = sphere(u, 'a', c.primary), b = sphere(u, 'b', c.secondary);
      const big = blob(50, 40, 38, 24, { n: 8, wobble: 0.08, seed: 3 }), small = blob(50, 74, 28, 16, { n: 8, wobble: 0.08, seed: 5 });
      let s = defs(a, b) + `<path d="M4 70 q20 -6 46 0 t46 0" fill="none" stroke="${dark(c.accent, 0.35)}" stroke-width="4.8" stroke-linecap="round"/><path d="M4 70 q20 -6 46 0 t46 0" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>`;
      s += path(big, a.url) + rim(u, 'r1', big, c.primary, { op: 0.3 }) + `<path d="${big}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="2"/>`;
      // nascent polypeptide leaving the exit tunnel
      s += `<path d="M58 18 q6 -10 14 -8 q6 2 10 -6" fill="none" stroke="${dark('#f39a3d', 0.3)}" stroke-width="3.2" stroke-linecap="round"/><path d="M58 18 q6 -10 14 -8 q6 2 10 -6" fill="none" stroke="#f39a3d" stroke-width="1.8" stroke-linecap="round"/>`;
      s += path(small, b.url) + rim(u, 'r2', small, c.secondary, { op: 0.28 }) + `<path d="${small}" fill="none" stroke="${dark(c.secondary, 0.42)}" stroke-width="2"/>`;
      return s + gloss(36, 30, 10, 4.5, 0.45) + gloss(42, 68, 7, 3, 0.4);
    }, { w: 100, h: 94, size: 70, roles: { primary: 'Large subunit', secondary: 'Small subunit', accent: 'mRNA' } }),
];
