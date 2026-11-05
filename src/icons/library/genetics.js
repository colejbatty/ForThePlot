// Nucleic-acid structures and the machinery of gene expression and gene editing.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, rng, smooth, smoothOpen, blob, ring, domain, speckle } from './kit.js';
import { helix as dnaHelix, capsid, hexagon } from './bio.js';

const R3 = { primary: 'Main', secondary: 'Secondary', accent: 'Accent' };
const na = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Nucleic acids', tags, colors, roles: R3, draw, size: 100, ...extra });
const ge = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Gene expression & editing', tags, colors, roles: R3, draw, size: 110, ...extra });
const BASES = ['#f2c94c', '#6abf59', '#5b6bd6', '#e8724a'];

/** A strand drawn as a shaded tube through points. */
function tube(d, col, w = 4.4) {
  return `<path d="${d}" fill="none" stroke="${dark(col, 0.38)}" stroke-width="${n(w + 2.4)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${light(col, 0.5)}" stroke-width="${n(w * 0.3)}" stroke-linecap="round" opacity="0.7" transform="translate(-0.5 -0.9)"/>`;
}
/** A ladder of two parallel strands with base rungs between y0 and y1 (paired region of RNA / DNA). */
function ladder(x0, x1, y0, y1, c1, c2, { step = 6, seed = 1 } = {}) {
  let s = '';
  for (let x = x0 + step / 2, k = seed; x < x1; x += step, k++) s += line(x, y0, x, (y0 + y1) / 2, BASES[k % 4], 2.4) + line(x, (y0 + y1) / 2, x, y1, BASES[(k + 2) % 4], 2.4);
  return s + tube(`M${x0} ${y0} H${x1}`, c1) + tube(`M${x0} ${y1} H${x1}`, c2);
}
/** Globular protein with gradient. */
const glob = (u, key, x, y, rx, ry, col, seed = 3) => { const g = sphere(u, key, col, { hi: 0.45 }); return defs(g) + path(blob(x, y, rx, ry, { n: 9, wobble: 0.1, seed }), g.url, dark(col, 0.42), 1.4); };
const lbl = (x, y, t, col, size = 6) => `<text x="${x}" y="${y}" font-size="${size}" font-family="Arial" font-weight="700" text-anchor="middle" fill="${col}">${t}</text>`;
/** Small double helix segment placed and scaled. */
const miniHelix = (c, x, y, w, h, turns = 1.4) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(w / 120)} ${n(h / 50)})">${dnaHelix(c, 120, 50, turns)}</g>`;

export const genetics = [
  na('nucleosome', 'Nucleosome', ['nucleosome', 'histone', 'chromatin', 'histone octamer', 'epigenetics', 'h3', 'h4'], { primary: '#f39a6b', secondary: '#4a8fe7', accent: '#e85d75' },
    (c, u) => {
      // DNA wrapped around a histone octamer disc
      const back = 'M14 40 C14 10 86 10 86 40', front = 'M10 54 C10 86 90 86 90 52 C90 30 20 30 18 50';
      let s = tube(back, dark(c.secondary, 0.1), 6);
      const g = sphere(u, 'h', c.primary, { hi: 0.4 });
      s += defs(g) + ellipse(50, 50, 30, 24, g.url, dark(c.primary, 0.42), 1.6);
      [[38, 42], [50, 38], [62, 42], [42, 54], [58, 54], [50, 62]].forEach(([x, y], i) => { s += circle(x, y, 7, shade(c.primary, i % 2 ? 0.12 : -0.05), dark(c.primary, 0.3), 0.8) + circle(x - 2, y - 2.4, 2, '#fff', 'none', 0, ' opacity="0.5"'); });
      s += tube(front, c.secondary, 6);
      s += `<path d="M68 26 Q74 16 82 14" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round"/>` + circle(83, 13.6, 3, c.accent, dark(c.accent, 0.4), 0.8);
      return s;
    }, { roles: { primary: 'Histones', secondary: 'DNA', accent: 'Histone tail mark' } }),
  na('chromatin', 'Chromatin (beads on a string)', ['chromatin', 'nucleosomes', 'euchromatin', 'heterochromatin', '10 nm fiber', 'epigenome'], { primary: '#f39a6b', secondary: '#4a8fe7', accent: '#e85d75' },
    (c, u) => {
      const pts = [[2, 40], [20, 22], [40, 36], [60, 20], [80, 38], [100, 22], [118, 34]];
      let s = tube(smoothOpen(pts), c.secondary, 3);
      pts.slice(1, -1).forEach(([x, y], i) => {
        const g = sphere(u, `n${i}`, c.primary, { hi: 0.45 });
        s += defs(g) + ellipse(x, y, 10, 8, g.url, dark(c.primary, 0.42), 1.2) + `<path d="M${x - 9} ${y + 2} Q${x} ${y + 9} ${x + 9} ${y - 1}" fill="none" stroke="${c.secondary}" stroke-width="2.4" stroke-linecap="round"/>`;
        if (i % 2) s += circle(x + 7, y - 8, 2.2, c.accent, dark(c.accent, 0.4), 0.6);
      });
      return s;
    }, { w: 120, h: 56, roles: { primary: 'Nucleosomes', secondary: 'DNA', accent: 'Modifications' } }),
  na('trna', 'tRNA', ['trna', 'transfer rna', 'anticodon', 'aminoacyl', 'translation', 'cloverleaf'], { primary: '#c95fc0', secondary: '#f39a3d', accent: '#6abf59' },
    (c) => {
      // cloverleaf: acceptor stem (top) with the amino acid, D/T arms, anticodon loop (bottom)
      let s = '';
      s += tube('M46 6 V40 M54 14 V40', c.primary, 3.6);
      for (let y = 18; y < 40; y += 5) s += line(46, y, 54, y, BASES[(y / 5) % 4 | 0], 2.2);
      s += tube('M46 40 Q30 40 20 46 Q8 52 18 60 Q28 64 40 54 M54 40 Q70 40 80 46 Q92 52 82 60 Q72 64 60 54 M40 54 Q46 58 46 66 V76 M60 54 Q54 58 54 66 V76', c.primary, 3.6);
      s += tube('M46 76 Q40 92 50 94 Q60 92 54 76', c.primary, 3.6);
      [44, 50, 56].forEach((x, i) => { s += rect(x - 2.4, 94, 4.8, 6, 1.4, BASES[i + 1], dark(BASES[i + 1], 0.4), 0.6); });
      const g = c.secondary;
      return s + circle(46, 4, 5, g, dark(g, 0.42), 1.2) + circle(44.4, 2.4, 1.6, '#fff', 'none', 0, ' opacity="0.6"');
    }, { roles: { primary: 'tRNA', secondary: 'Amino acid', accent: 'Accent' } }),
  na('sirna', 'siRNA duplex', ['sirna', 'small interfering rna', 'rnai', 'gene silencing', 'knockdown', 'risc'], { primary: '#c95fc0', secondary: '#5b6bd6', accent: '#f6c945' },
    (c) => ladder(16, 100, 22, 38, c.primary, c.secondary) + tube('M100 22 H110', c.primary) + tube('M6 38 H16', c.secondary), { w: 116, h: 60, size: 100 }),
  na('mirna-hairpin', 'miRNA hairpin (pre-miRNA)', ['mirna', 'microrna', 'pre-mirna', 'hairpin', 'stem loop', 'dicer', 'shrna'], { primary: '#c95fc0', secondary: '#c95fc0', accent: '#f6c945' },
    (c) => ladder(14, 86, 20, 36, c.primary, c.secondary) + tube('M86 20 Q104 18 106 28 Q104 38 86 36', c.primary) + tube('M14 36 H6', c.secondary), { w: 112, h: 56, size: 100 }),
  na('ssdna', 'Single-stranded DNA', ['ssdna', 'single stranded dna', 'oligonucleotide', 'oligo', 'primer', 'probe'], { primary: '#4a8fe7', secondary: '#f6c945', accent: '#6abf59' },
    (c) => {
      const pts = Array.from({ length: 12 }, (_, i) => [6 + i * 10, 26 + Math.sin(i * 0.8) * 6]);
      let s = '';
      pts.forEach(([x, y], i) => { s += line(x, y, x, y + 14, BASES[i % 4], 2.6) + rect(x - 2.6, y + 12, 5.2, 6, 1.6, BASES[i % 4], dark(BASES[i % 4], 0.4), 0.6); });
      return s + tube(smoothOpen(pts), c.primary, 4);
    }, { w: 120, h: 56 }),
  na('nucleotide', 'Nucleotide', ['nucleotide', 'dntp', 'ntp', 'phosphate sugar base', 'building block'], { primary: '#f39a3d', secondary: '#9aa5b1', accent: '#5b6bd6' },
    (c, u) => {
      const pg = sphere(u, 'p', c.primary, { hi: 0.55 }), bg = sphere(u, 'b', c.accent, { hi: 0.45 });
      return line(22, 50, 46, 56, '#52606d', 3) + line(60, 50, 76, 40, '#52606d', 3) + defs(pg, bg) + circle(18, 48, 12, pg.url, dark(c.primary, 0.42), 1.4) + lbl(18, 52, 'P', '#fff', 11)
        + path('M40 50 L52 40 L66 46 L64 62 L46 64 Z', c.secondary, dark(c.secondary, 0.42), 1.6) + rect(70, 26, 26, 24, 6, bg.url, dark(c.accent, 0.42), 1.4) + lbl(83, 42, 'A', '#fff', 12);
    }, { w: 100, h: 80, roles: { primary: 'Phosphate', secondary: 'Sugar', accent: 'Base' } }),
  na('base-pair', 'Base pairs (A–T, G–C)', ['base pair', 'complementary', 'watson-crick', 'hydrogen bonds', 'a-t', 'g-c'], { primary: '#f2c94c', secondary: '#6abf59', accent: '#5b6bd6' },
    (c) => {
      const pair = (y, a, b, ca, cb, hb) => rect(8, y - 9, 38, 18, 5, ca, dark(ca, 0.4), 1.2) + rect(54, y - 9, 38, 18, 5, cb, dark(cb, 0.4), 1.2) + lbl(27, y + 4, a, dark(ca, 0.6), 11) + lbl(73, y + 4, b, dark(cb, 0.6), 11)
        + Array.from({ length: hb }, (_, i) => line(46, y - 4 + i * (8 / Math.max(1, hb - 1)), 54, y - 4 + i * (8 / Math.max(1, hb - 1)), '#7b8794', 1.2, ' stroke-dasharray="1.6 1.4"')).join('');
      return pair(22, 'A', 'T', c.primary, c.secondary, 2) + pair(56, 'G', 'C', c.accent, '#e8724a', 3);
    }, { w: 100, h: 80, roles: { primary: 'Adenine', secondary: 'Thymine', accent: 'Guanine' } }),
  na('methylated-dna', 'Methylated DNA', ['dna methylation', 'cpg', '5mc', 'epigenetics', 'methyl group', 'dnmt'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#f6c945' },
    (c) => dnaHelix(c, 120, 50, 2.2) + [[22, 8], [50, 42], [78, 8], [104, 42]].map(([x, y]) => line(x, y + (y < 20 ? 6 : -6), x, y, '#52606d', 1.4) + circle(x, y, 3.6, '#ffffff', '#52606d', 1.2) + lbl(x, y + 2, 'M', '#52606d', 4.6)).join(''), { w: 120, h: 50, roles: { primary: 'Strand 1', secondary: 'Strand 2', accent: 'Bases' } }),
  na('dna-damage', 'DNA double-strand break', ['dna damage', 'double-strand break', 'dsb', 'genotoxic', 'radiation', 'dna repair', 'γh2ax'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#f6c945' },
    (c) => `<g clip-path="none"><g transform="translate(-6 4) rotate(-6 30 25)">${miniHelix(c, 0, 0, 58, 50, 1.1)}</g><g transform="translate(8 -4) rotate(6 90 25)">${miniHelix(c, 62, 0, 58, 50, 1.1)}</g></g>`
      + `<path d="M60 4 L52 22 L62 22 L54 44" fill="${c.accent}" stroke="${dark(c.accent, 0.4)}" stroke-width="1.2" stroke-linejoin="round"/><path d="M60 4 L52 22 L62 22 L54 44" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linejoin="round"/>`, { w: 120, h: 50 }),
  na('aptamer', 'Aptamer', ['aptamer', 'selex', 'nucleic acid binder', 'oligonucleotide', 'rna aptamer'], { primary: '#c95fc0', secondary: '#5aa7e6', accent: '#f6c945' },
    (c, u) => {
      let s = tube('M30 94 V60 Q30 50 24 44 Q12 34 22 24 Q34 18 40 30 Q44 40 50 40 Q56 40 60 30 Q66 18 78 24 Q88 34 76 44 Q70 50 70 60 V94', c.primary, 3.8);
      for (let y = 64; y < 94; y += 6) s += line(31, y, 69, y, BASES[(y / 6) % 4 | 0], 2) ;
      return s + glob(u, 't', 50, 18, 9, 8, c.secondary, 4);
    }, { roles: { primary: 'Aptamer', secondary: 'Target', accent: 'Accent' } }),

  // ---- gene expression & editing ---------------------------------------------------------------------
  ge('replication-fork', 'Replication fork', ['dna replication', 'replication fork', 'helicase', 'dna polymerase', 'okazaki fragments', 'leading strand', 'lagging strand'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#6abf59' },
    (c, u) => {
      let s = `<g transform="translate(0 6)">${miniHelix(c, 0, 18, 50, 30, 1.2)}</g>`;
      s += tube('M48 36 Q70 22 116 12', c.primary, 4) + tube('M48 40 Q70 54 116 64', c.secondary, 4);
      s += tube('M66 30 Q84 22 108 18', c.accent, 3) + tube('M72 50 Q80 54 88 56 M94 58 Q100 60 108 61', c.accent, 3);
      return s + glob(u, 'h', 50, 38, 9, 11, '#f39a3d', 3) + glob(u, 'p1', 66, 26, 7, 6, '#8e7cc3', 5) + glob(u, 'p2', 90, 54, 7, 6, '#8e7cc3', 7);
    }, { w: 120, h: 76, roles: { primary: 'Leading template', secondary: 'Lagging template', accent: 'New DNA' } }),
  ge('transcription', 'Transcription', ['transcription', 'rna polymerase', 'mrna synthesis', 'gene expression', 'promoter', 'transcription bubble'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#c95fc0' },
    (c, u) => {
      let s = tube('M2 56 H40 M80 56 H118', c.primary, 4) + tube('M2 64 H40 M80 64 H118', c.secondary, 4) + tube('M40 56 Q60 42 80 56', c.primary, 4) + tube('M40 64 Q60 72 80 64', c.secondary, 4);
      s += glob(u, 'pol', 60, 58, 22, 18, '#8e7cc3', 4) + gloss(52, 48, 6, 3, 0.45);
      s += tube('M62 44 Q66 26 80 22 Q96 18 102 6', c.accent, 3.4) + circle(103, 5, 3, c.accent, dark(c.accent, 0.4), 0.8);
      return s + `<path d="M8 50 V40 H22" fill="none" stroke="#52606d" stroke-width="2" stroke-linecap="round"/><path d="M19 36 L24 40 L19 44" fill="none" stroke="#52606d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }, { w: 120, h: 80, roles: { primary: 'Template strand', secondary: 'Coding strand', accent: 'mRNA' } }),
  ge('translation', 'Translation (ribosome)', ['translation', 'ribosome', 'protein synthesis', 'polypeptide', 'codon', 'trna'], { primary: '#5b6bd6', secondary: '#a7b0ef', accent: '#c95fc0' },
    (c, u) => {
      let s = tube('M2 66 H118', c.accent, 3.4);
      for (let x = 6; x < 118; x += 6) s += line(x, 62, x, 58, BASES[(x / 6) % 4 | 0], 2);
      s += glob(u, 'l', 58, 40, 30, 20, c.primary, 3) + glob(u, 's', 58, 70, 24, 11, c.secondary, 5);
      const chainPts = [[56, 22], [50, 14], [56, 6], [64, 10], [72, 4], [80, 10], [88, 6]];
      chainPts.forEach(([x, y], i) => { s += circle(x, y, 3.6, BASES[i % 4], dark(BASES[i % 4], 0.4), 0.8); });
      return s + gloss(46, 30, 9, 4, 0.45);
    }, { w: 120, h: 86, roles: { primary: 'Large subunit', secondary: 'Small subunit', accent: 'mRNA' } }),
  ge('splicing', 'RNA splicing', ['splicing', 'pre-mrna', 'exon', 'intron', 'spliceosome', 'alternative splicing', 'lariat'], { primary: '#4a8fe7', secondary: '#9aa5b1', accent: '#f39a3d' },
    (c) => {
      const ex = (x, w, y, col) => rect(x, y - 6, w, 12, 3, col, dark(col, 0.4), 1.2);
      let s = tube('M8 20 H112', c.secondary, 2.6) + ex(8, 24, 20, c.primary) + ex(48, 24, 20, c.accent) + ex(88, 24, 20, c.primary);
      s += `<path d="M58 34 V46 l-5 -5 M58 46 l5 -5" fill="none" stroke="#52606d" stroke-width="2" stroke-linecap="round"/>`;
      s += ex(16, 24, 62, c.primary) + ex(40, 24, 62, c.accent) + ex(64, 24, 62, c.primary) + tube('M96 60 Q110 50 104 66 Q100 72 94 66', c.secondary, 2.6);
      return s;
    }, { w: 120, h: 80, roles: { primary: 'Exons', secondary: 'Introns', accent: 'Alternative exon' } }),
  ge('expression-cassette', 'Expression cassette (promoter–gene–terminator)', ['expression cassette', 'construct', 'promoter', 'cds', 'terminator', 'sbol', 'transgene', 'vector map'], { primary: '#4a8fe7', secondary: '#6abf59', accent: '#e85d5d' },
    (c) => {
      let s = line(2, 40, 118, 40, '#52606d', 2.4);
      s += `<path d="M14 40 V24 H32" fill="none" stroke="${c.secondary}" stroke-width="3" stroke-linecap="round"/><path d="M28 18 L36 24 L28 30" fill="${c.secondary}" stroke="${dark(c.secondary, 0.3)}" stroke-width="1"/>`;
      s += `<path d="M40 30 H82 L92 40 L82 50 H40 Z" fill="${c.primary}" stroke="${dark(c.primary, 0.42)}" stroke-width="1.4"/><path d="M44 33 H80" stroke="#fff" stroke-width="1.6" opacity="0.5"/>`;
      return s + `<path d="M104 40 V26 M96 26 H112" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>` + ellipse(28, 46, 4, 3, '#f39a3d', dark('#f39a3d', 0.4), 0.8);
    }, { w: 120, h: 60, roles: { primary: 'Coding sequence', secondary: 'Promoter', accent: 'Terminator' } }),
  ge('aav-vector', 'AAV vector', ['aav', 'adeno-associated virus', 'gene therapy', 'viral vector', 'capsid', 'transduction', 'serotype'], { primary: '#5aa7e6', secondary: '#f6c945', accent: '#c95fc0' },
    (c) => capsid(50, 50, 40, c.primary) + `<path d="M34 40 Q46 30 58 40 T76 46 Q66 60 50 56 T32 62" fill="none" stroke="${dark(c.accent, 0.35)}" stroke-width="3.6" stroke-linecap="round" opacity="0.9"/><path d="M34 40 Q46 30 58 40 T76 46 Q66 60 50 56 T32 62" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linecap="round"/>`,
    { size: 80, roles: { primary: 'Capsid', secondary: 'Accent', accent: 'ssDNA genome' } }),
  ge('base-editor', 'Base editor', ['base editor', 'cbe', 'abe', 'deaminase', 'nickase', 'crispr', 'precision editing'], { primary: '#6ab0e6', secondary: '#c95fc0', accent: '#f39a3d' },
    (c, u) => {
      let s = tube('M2 70 H118', '#4a8fe7', 4) + tube('M2 78 H118', '#e85d5d', 4);
      s += glob(u, 'cas', 64, 52, 30, 24, c.primary, 3) + tube('M44 66 Q30 60 34 44 Q40 30 56 32', c.secondary, 3);
      s += `<path d="M90 42 Q98 34 100 24" fill="none" stroke="#9aa5b1" stroke-width="2" stroke-dasharray="2 1.6"/>` + glob(u, 'de', 100, 18, 12, 10, c.accent, 5);
      return s + `<path d="M84 70 l-3 6 h6 Z" fill="${c.accent}"/>` + gloss(54, 40, 9, 4, 0.45);
    }, { w: 120, h: 86, roles: { primary: 'Cas9 nickase', secondary: 'Guide RNA', accent: 'Deaminase' } }),
  ge('prime-editor', 'Prime editor', ['prime editor', 'pegrna', 'reverse transcriptase', 'prime editing', 'crispr', 'nickase'], { primary: '#6ab0e6', secondary: '#c95fc0', accent: '#4fb0a0' },
    (c, u) => {
      let s = tube('M2 70 H118', '#4a8fe7', 4) + tube('M2 78 H52 M60 78 H118', '#e85d5d', 4);
      s += glob(u, 'cas', 52, 50, 28, 22, c.primary, 3) + tube('M30 62 Q20 50 28 36 Q40 26 50 30 M76 58 Q86 64 82 74', c.secondary, 3);
      s += `<path d="M76 40 Q86 32 92 30" fill="none" stroke="#9aa5b1" stroke-width="2" stroke-dasharray="2 1.6"/>` + glob(u, 'rt', 100, 28, 14, 11, c.accent, 5);
      return s + gloss(42, 38, 9, 4, 0.45);
    }, { w: 120, h: 86, roles: { primary: 'Cas9 nickase', secondary: 'pegRNA', accent: 'Reverse transcriptase' } }),
  ge('antisense-oligo', 'Antisense oligonucleotide (ASO)', ['aso', 'antisense', 'oligonucleotide', 'rnase h', 'gapmer', 'splice switching', 'nusinersen'], { primary: '#c95fc0', secondary: '#4fb0a0', accent: '#f6c945' },
    (c) => tube('M2 30 H118', c.primary, 4) + Array.from({ length: 9 }, (_, i) => line(34 + i * 6, 30, 34 + i * 6, 44, BASES[i % 4], 2.4)).join('') + tube('M32 44 H88', c.secondary, 4)
      + [32, 38, 82, 88].map((x) => circle(x, 44, 2.6, c.accent, dark(c.accent, 0.4), 0.7)).join(''), { w: 120, h: 60, roles: { primary: 'Target RNA', secondary: 'ASO', accent: 'Modified ends' } }),
  ge('pcr-amplification', 'PCR amplification', ['pcr', 'amplification', 'polymerase chain reaction', 'exponential', 'qpcr', 'primers', 'thermocycling'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#f6c945' },
    (c) => {
      const seg = (x, y, w) => tube(`M${x} ${y} H${x + w}`, c.primary, 3) + tube(`M${x} ${y + 5} H${x + w}`, c.secondary, 3);
      let s = seg(6, 46, 22);
      [[46, 30], [46, 60]].forEach(([x, y]) => { s += seg(x, y, 22); });
      [[86, 14], [86, 36], [86, 56], [86, 78]].forEach(([x, y]) => { s += seg(x, y, 22); });
      const arr = (x0, y0, x1, y1) => `<path d="M${x0} ${y0} L${x1} ${y1}" stroke="#7b8794" stroke-width="1.6" stroke-linecap="round"/>`;
      return s + arr(30, 46, 42, 34) + arr(30, 50, 42, 62) + arr(70, 30, 82, 18) + arr(70, 34, 82, 40) + arr(70, 60, 82, 58) + arr(70, 64, 82, 80);
    }, { w: 114, h: 90, size: 100 }),
];
