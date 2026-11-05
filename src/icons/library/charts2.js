// More chart types and figure symbols.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, rng, smoothOpen, ring, linear } from './kit.js';
import { axes } from './lab.js';

const ch = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Charts & symbols', tags, colors, roles: { primary: 'Series 1', secondary: 'Series 2', accent: 'Axes / ink' }, draw, size: 80, shape: 'rect', ...extra });
const sy = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Charts & symbols', tags, colors, roles: { primary: 'Main', secondary: 'Secondary', accent: 'Accent' }, draw, size: 60, shape: 'rect', ...extra });
const dot = (x, y, r, col) => circle(x, y, r, col, dark(col, 0.4), n(r * 0.3)) + circle(x - r * 0.3, y - r * 0.32, r * 0.3, '#fff', 'none', 0, ' opacity="0.6"');
const curve = (pts, col, w = 2.6) => `<path d="${smoothOpen(pts)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
const arrowHead = (x, y, ang, col, s = 7) => { const a = (ang * Math.PI) / 180; return `<path d="M${n(x)} ${n(y)} L${n(x - Math.cos(a - 0.45) * s)} ${n(y - Math.sin(a - 0.45) * s)} L${n(x - Math.cos(a + 0.45) * s)} ${n(y - Math.sin(a + 0.45) * s)} Z" fill="${col}"/>`; };

export const charts2 = [
  ch('scatter-plot', 'Scatter plot (correlation)', ['scatter plot', 'correlation', 'regression', 'xy plot', 'data'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#3e4c59' },
    (c) => { const R = rng(3); let s = axes(c.accent); for (let i = 0; i < 22; i++) { const x = 16 + R() * 74, y = 84 - (x - 14) * 0.85 + (R() - 0.5) * 22; s += dot(x, Math.max(8, Math.min(86, y)), 2.2, i % 4 ? c.primary : c.secondary); } return s + line(14, 86, 94, 14, c.accent, 1.6, ' stroke-dasharray="4 3"'); }),
  ch('line-graph', 'Line graph (time course)', ['line graph', 'time course', 'kinetics', 'growth curve', 'trend', 'longitudinal'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#3e4c59' },
    (c) => {
      let s = axes(c.accent);
      const A = [[14, 80], [32, 70], [50, 52], [68, 34], [88, 18]], B = [[14, 80], [32, 76], [50, 70], [68, 66], [88, 62]];
      [[A, c.primary], [B, c.secondary]].forEach(([p, col]) => { s += curve(p, col) + p.map(([x, y]) => line(x, y - 5, x, y + 5, col, 1.1) + dot(x, y, 2.6, col)).join(''); });
      return s;
    }),
  ch('box-plot', 'Box plot', ['box plot', 'box and whisker', 'distribution', 'median', 'quartiles', 'statistics'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#3e4c59' },
    (c, u) => {
      let s = axes(c.accent);
      [[30, [70, 58, 50, 40, 26], c.primary], [66, [60, 44, 36, 28, 14], c.secondary]].forEach(([x, [lo, q1, m, q3, hi], col], i) => {
        const g = linear(u, `b${i}`, light(col, 0.35), col, { x2: 1, y2: 0 });
        s += line(x, hi, x, q3, col, 1.4) + line(x, q1, x, lo, col, 1.4) + line(x - 5, hi, x + 5, hi, col, 1.4) + line(x - 5, lo, x + 5, lo, col, 1.4) + defs(g) + rect(x - 10, q3, 20, q1 - q3, 2, g.url, dark(col, 0.4), 1.2) + line(x - 10, m, x + 10, m, dark(col, 0.5), 2.4);
        const R = rng(i + 3); for (let k = 0; k < 6; k++) s += circle(x - 6 + R() * 12, q3 + R() * (q1 - q3), 1.2, '#fff', dark(col, 0.4), 0.6);
      });
      return s;
    }),
  ch('violin-plot', 'Violin plot', ['violin plot', 'distribution', 'density', 'single cell expression', 'statistics'], { primary: '#8e7cc3', secondary: '#4fb0a0', accent: '#3e4c59' },
    (c, u) => {
      let s = axes(c.accent);
      [[30, c.primary, [[30, 14], [30, 30], [22, 48], [16, 60], [24, 74], [30, 84]]], [66, c.secondary, [[66, 10], [60, 24], [56, 36], [62, 54], [66, 70], [66, 82]]]].forEach(([x, col, half], i) => {
        const pts = half.concat(half.slice().reverse().map(([hx, hy]) => [2 * x - hx, hy]));
        const g = linear(u, `v${i}`, light(col, 0.35), col, { x2: 1, y2: 0 });
        s += defs(g) + `<path d="${smoothOpen(pts)}Z" fill="${g.url}" stroke="${dark(col, 0.4)}" stroke-width="1.2"/>` + rect(x - 2, 40, 4, 22, 2, '#1f2933', 'none', 0, ' opacity="0.8"') + circle(x, 52, 2, '#fff');
      });
      return s;
    }),
  ch('dose-response', 'Dose–response curve', ['dose response', 'ic50', 'ec50', 'sigmoid', 'titration', 'potency', 'neutralization curve'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#3e4c59' },
    (c) => {
      let s = axes(c.accent);
      const sig = (x, mid, k) => 84 - 70 / (1 + Math.exp(-(x - mid) / k));
      const A = Array.from({ length: 9 }, (_, i) => [14 + i * 10, sig(14 + i * 10, 46, 7)]), B = Array.from({ length: 9 }, (_, i) => [14 + i * 10, sig(14 + i * 10, 66, 7)]);
      s += curve(A, c.primary) + curve(B, c.secondary) + A.map(([x, y]) => dot(x, y, 2.2, c.primary)).join('') + B.map(([x, y]) => dot(x, y, 2.2, c.secondary)).join('');
      return s + line(46, 86, 46, 49, c.primary, 1, ' stroke-dasharray="3 2"');
    }),
  ch('volcano-plot', 'Volcano plot', ['volcano plot', 'differential expression', 'deg', 'fold change', 'p-value', 'rna-seq', 'proteomics'], { primary: '#e85d5d', secondary: '#4a8fe7', accent: '#9aa5b1' },
    (c) => {
      const R = rng(9);
      let s = axes('#3e4c59', 10, 90, 96, 4).replace(/x1="10" y1="90" x2="10" y2="4"/, 'x1="53" y1="90" x2="53" y2="4"');
      for (let i = 0; i < 70; i++) {
        const fc = (R() - 0.5) * 2, y = 88 - Math.abs(fc) ** 1.6 * 70 * (0.4 + R() * 0.8);
        const x = 53 + fc * 40, sig = y < 56 && Math.abs(fc) > 0.35;
        s += circle(x, Math.max(8, y), sig ? 2.2 : 1.6, sig ? (fc > 0 ? c.primary : c.secondary) : c.accent, sig ? dark(fc > 0 ? c.primary : c.secondary, 0.4) : 'none', 0.6, ' opacity="0.9"');
      }
      return s + line(12, 56, 94, 56, '#3e4c59', 1, ' stroke-dasharray="3 2"');
    }, { roles: { primary: 'Up', secondary: 'Down', accent: 'Not significant' } }),
  ch('pie-chart', 'Pie chart', ['pie chart', 'proportions', 'composition', 'fraction', 'donut'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#f2c94c' },
    (c, u) => {
      const slices = [[0, 0.42, c.primary], [0.42, 0.7, c.secondary], [0.7, 0.88, c.accent], [0.88, 1, '#7fd36b']];
      let s = ellipse(50, 56, 40, 12, '#000', 'none', 0, ' opacity="0.08"');
      slices.forEach(([a0, a1, col], i) => {
        const p = (t) => [50 + Math.cos(t * Math.PI * 2 - Math.PI / 2) * 40, 48 + Math.sin(t * Math.PI * 2 - Math.PI / 2) * 40];
        const [x0, y0] = p(a0), [x1, y1] = p(a1);
        const g = sphere(u, `p${i}`, col, { hi: 0.25, lo: -0.08 });
        s += defs(g) + `<path d="M50 48 L${n(x0)} ${n(y0)} A40 40 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${n(x1)} ${n(y1)} Z" fill="${g.url}" stroke="#fff" stroke-width="1.6"/>`;
      });
      return s + gloss(36, 28, 12, 5, 0.35, -30);
    }, { roles: { primary: 'Slice 1', secondary: 'Slice 2', accent: 'Slice 3' } }),
  ch('venn-diagram', 'Venn diagram', ['venn diagram', 'overlap', 'intersection', 'shared genes', 'sets'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#f2c94c' },
    (c) => circle(38, 40, 26, c.primary, dark(c.primary, 0.4), 1.6, ' fill-opacity="0.45"') + circle(62, 40, 26, c.secondary, dark(c.secondary, 0.4), 1.6, ' fill-opacity="0.45"') + circle(50, 62, 26, c.accent, dark(c.accent, 0.4), 1.6, ' fill-opacity="0.45"'),
    { roles: { primary: 'Set A', secondary: 'Set B', accent: 'Set C' } }),
  ch('network-graph', 'Network graph', ['network', 'interaction network', 'ppi', 'graph', 'pathway map', 'nodes and edges'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#9aa5b1' },
    (c, u) => {
      const N = [[50, 48, 9, 1], [22, 24, 6, 0], [80, 22, 6, 0], [86, 62, 6, 0], [60, 86, 6, 0], [18, 70, 6, 0], [36, 46, 4, 0], [68, 40, 4, 0], [44, 72, 4, 0], [10, 44, 4, 0], [92, 40, 4, 0]];
      const E = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [1, 6], [2, 7], [3, 7], [4, 8], [5, 8], [5, 9], [1, 9], [2, 10], [3, 10]];
      let s = E.map(([a, b]) => line(N[a][0], N[a][1], N[b][0], N[b][1], c.accent, 1.4)).join('');
      return s + N.map(([x, y, r, hub], i) => { const g = sphere(u, `n${i}`, hub ? c.secondary : c.primary, { hi: 0.5 }); return defs(g) + circle(x, y, r, g.url, dark(hub ? c.secondary : c.primary, 0.4), 1.1); }).join('');
    }, { roles: { primary: 'Nodes', secondary: 'Hub', accent: 'Edges' } }),
  ch('phylogenetic-tree', 'Phylogenetic tree', ['phylogenetic tree', 'phylogeny', 'clonal lineage', 'evolution', 'dendrogram', 'bcr lineage tree'], { primary: '#3e4c59', secondary: '#4a8fe7', accent: '#e85d5d' },
    (c) => {
      const t = 'M6 50 H20 M20 24 V76 M20 24 H40 M20 76 H34 M40 12 V36 M40 12 H70 M40 36 H54 M54 30 V42 M54 30 H90 M54 42 H82 M34 64 V88 M34 64 H62 M34 88 H76 M62 58 V70 M62 58 H92 M62 70 H86';
      let s = `<path d="${t}" fill="none" stroke="${c.primary}" stroke-width="2.2" stroke-linecap="round"/>`;
      return s + [[70, 12, c.secondary], [90, 30, c.secondary], [82, 42, c.secondary], [92, 58, c.accent], [86, 70, c.accent], [76, 88, c.accent]].map(([x, y, col]) => dot(x + 3, y, 3, col)).join('');
    }, { roles: { primary: 'Branches', secondary: 'Clade 1', accent: 'Clade 2' } }),
  ch('stacked-bar', 'Stacked bar chart', ['stacked bar', 'composition', 'proportion', 'cell type composition', 'abundance'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#f2c94c' },
    (c, u) => {
      let s = axes('#3e4c59');
      [[18, [30, 24, 14]], [42, [20, 30, 22]], [66, [12, 22, 40]]].forEach(([x, segs], i) => {
        let y = 90;
        segs.forEach((h, k) => { const col = [c.primary, c.secondary, c.accent][k]; const g = linear(u, `s${i}${k}`, light(col, 0.3), col, { x2: 1, y2: 0 }); y -= h; s += defs(g) + rect(x, y, 18, h, 0.6, g.url, dark(col, 0.35), 1); });
      });
      return s;
    }),
  ch('tumor-growth-curve', 'Tumor growth curves', ['tumor growth', 'tumor volume', 'xenograft', 'efficacy', 'in vivo', 'treatment response'], { primary: '#9aa5b1', secondary: '#e85d5d', accent: '#4a8fe7' },
    (c) => {
      let s = axes('#3e4c59');
      const ctl = [[14, 84], [30, 78], [46, 64], [62, 42], [78, 20], [90, 8]], trt = [[14, 84], [30, 80], [46, 76], [62, 74], [78, 72], [90, 72]], cr = [[14, 84], [30, 82], [46, 84], [62, 86], [78, 87], [90, 87]];
      [[ctl, c.primary], [trt, c.secondary], [cr, c.accent]].forEach(([p, col]) => { s += curve(p, col, 2.4) + p.map(([x, y], i) => (i ? line(x, y - 4, x, y + 4, col, 1) : '') + dot(x, y, 2.2, col)).join(''); });
      return s + `<path d="M20 90 l3 -8 l3 8" fill="${c.secondary}" opacity="0.8"/>`;
    }, { roles: { primary: 'Control', secondary: 'Treated', accent: 'Responders' } }),

  // ---- symbols -------------------------------------------------------------------------------------
  sy('inhibition', 'Inhibition (blunt arrow)', ['inhibition', 'inhibits', 'blocks', 'tee arrow', 'suppression', 'negative regulation'], { primary: '#e05252', secondary: '#3e4c59', accent: '#ffffff' },
    (c) => `<path d="M8 50 H82" stroke="${dark(c.primary, 0.35)}" stroke-width="9" stroke-linecap="round"/><path d="M8 50 H82" stroke="${c.primary}" stroke-width="6" stroke-linecap="round"/><path d="M86 24 V76" stroke="${dark(c.primary, 0.35)}" stroke-width="11" stroke-linecap="round"/><path d="M86 24 V76" stroke="${c.primary}" stroke-width="8" stroke-linecap="round"/><path d="M12 47.6 H78" stroke="#fff" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>`,
    { w: 100, h: 100 }),
  sy('activation-arrow', 'Activation (arrow)', ['activation', 'activates', 'induces', 'stimulates', 'positive regulation', 'arrow'], { primary: '#4caf50', secondary: '#3e4c59', accent: '#ffffff' },
    (c) => `<path d="M8 50 H70" stroke="${dark(c.primary, 0.35)}" stroke-width="9" stroke-linecap="round"/><path d="M8 50 H70" stroke="${c.primary}" stroke-width="6" stroke-linecap="round"/>` + `<path d="M94 50 L64 28 V72 Z" fill="${c.primary}" stroke="${dark(c.primary, 0.35)}" stroke-width="2" stroke-linejoin="round"/><path d="M12 47.6 H66" stroke="#fff" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>`, { w: 100, h: 100 }),
  sy('cycle-arrows', 'Cycle arrows', ['cycle', 'circular arrows', 'feedback loop', 'recycling', 'cell cycle', 'loop', 'iteration'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#ffffff' },
    (c) => {
      const arc = (a0, a1, col) => { const P = (a) => [50 + Math.cos((a * Math.PI) / 180) * 34, 50 + Math.sin((a * Math.PI) / 180) * 34]; const [x0, y0] = P(a0), [x1, y1] = P(a1); return `<path d="M${n(x0)} ${n(y0)} A34 34 0 0 1 ${n(x1)} ${n(y1)}" fill="none" stroke="${dark(col, 0.35)}" stroke-width="10" stroke-linecap="round"/><path d="M${n(x0)} ${n(y0)} A34 34 0 0 1 ${n(x1)} ${n(y1)}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"/>` + arrowHead(x1 + Math.cos(((a1 + 90) * Math.PI) / 180) * 12, y1 + Math.sin(((a1 + 90) * Math.PI) / 180) * 12, a1 + 90, col, 22); };
      return arc(200, 330, c.primary) + arc(20, 150, c.secondary);
    }, { roles: { primary: 'Arrow 1', secondary: 'Arrow 2', accent: 'Accent' } }),
  sy('timeline-arrow', 'Timeline arrow', ['timeline', 'time course', 'schedule', 'dosing schedule', 'days', 'study design'], { primary: '#3e4c59', secondary: '#e85d5d', accent: '#4a8fe7' },
    (c) => `<path d="M4 30 H104" stroke="${c.primary}" stroke-width="3" stroke-linecap="round"/>` + arrowHead(116, 30, 0, c.primary, 12) + [12, 36, 60, 84].map((x, i) => line(x, 24, x, 36, c.primary, 2) + (i % 2 ? `<path d="M${x} 20 l-4 -8 h8 Z" fill="${c.secondary}"/>` : circle(x, 14, 4, c.accent, dark(c.accent, 0.4), 1))).join(''),
    { w: 120, h: 44, size: 110, roles: { primary: 'Axis', secondary: 'Treatment', accent: 'Sampling' } }),
  sy('plus-sign', 'Plus', ['plus', 'add', 'positive', 'combination', '+'], { primary: '#4caf50', secondary: '#3e4c59', accent: '#ffffff' },
    (c, u) => { const g = sphere(u, 'b', c.primary, { hi: 0.4 }); return defs(g) + path('M40 10 H60 V40 H90 V60 H60 V90 H40 V60 H10 V40 H40 Z', g.url, dark(c.primary, 0.4), 2) + gloss(44, 22, 4, 6, 0.4, 0); }, { size: 40 }),
  sy('minus-sign', 'Minus', ['minus', 'subtract', 'negative', 'remove', '-'], { primary: '#e05252', secondary: '#3e4c59', accent: '#ffffff' },
    (c, u) => { const g = sphere(u, 'b', c.primary, { hi: 0.4 }); return defs(g) + rect(10, 40, 80, 20, 3, g.url, dark(c.primary, 0.4), 2) + gloss(30, 45, 12, 2.4, 0.4, 0); }, { size: 40 }),
  sy('warning', 'Warning', ['warning', 'caution', 'hazard', 'alert', 'toxicity', 'adverse event'], { primary: '#f2c94c', secondary: '#1f2933', accent: '#ffffff' },
    (c, u) => { const g = sphere(u, 'b', c.primary, { hi: 0.35 }); return defs(g) + `<path d="M50 6 L96 88 Q98 94 92 94 H8 Q2 94 4 88 Z" fill="${g.url}" stroke="${dark(c.primary, 0.42)}" stroke-width="2.6" stroke-linejoin="round"/>` + rect(45, 32, 10, 34, 5, c.secondary) + circle(50, 78, 5.6, c.secondary); }),
  sy('lightbulb', 'Light bulb (idea)', ['lightbulb', 'idea', 'hypothesis', 'insight', 'discovery', 'innovation'], { primary: '#f6d77a', secondary: '#9aa5b1', accent: '#f2a23c' },
    (c, u) => { const g = sphere(u, 'b', c.primary, { hi: 0.6 }); return [[-60], [-30], [0], [30], [60]].map(([a]) => `<g transform="rotate(${a} 50 40)">${line(50, 2, 50, -4, c.accent, 3)}</g>`).join('') + defs(g) + path('M50 8 C70 8 80 22 78 38 C76 50 64 56 62 68 H38 C36 56 24 50 22 38 C20 22 30 8 50 8Z', g.url, dark(c.primary, 0.42), 2) + `<path d="M42 66 Q42 50 48 42 M58 66 Q58 50 52 42 M44 46 Q50 38 56 46" fill="none" stroke="${c.accent}" stroke-width="1.8"/>` + rect(37, 68, 26, 18, 3, c.secondary, dark(c.secondary, 0.4), 1.4) + `<path d="M38 74 H62 M38 80 H62" stroke="${dark(c.secondary, 0.3)}" stroke-width="1.4"/>` + rect(43, 86, 14, 6, 3, dark(c.secondary, 0.2)) + gloss(38, 22, 6, 9, 0.6, 20); }),
  sy('target', 'Target (bullseye)', ['target', 'bullseye', 'targeting', 'specificity', 'goal', 'precision'], { primary: '#e05252', secondary: '#ffffff', accent: '#3e4c59' },
    (c, u) => { const g = sphere(u, 'b', c.primary, { hi: 0.3 }); let s = defs(g) + circle(50, 50, 44, g.url, dark(c.primary, 0.42), 1.6) + circle(50, 50, 33, c.secondary) + circle(50, 50, 22, c.primary) + circle(50, 50, 11, c.secondary) + circle(50, 50, 4, c.primary); return s + line(50, 50, 88, 12, c.accent, 3) + `<path d="M88 12 l2 -10 M88 12 l10 -2" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>`; }),
  sy('thermometer', 'Thermometer', ['thermometer', 'temperature', 'heat', 'fever', 'incubation temperature'], { primary: '#e05252', secondary: '#e8eef4', accent: '#3e4c59' },
    (c) => rect(40, 6, 20, 70, 10, c.secondary, dark(c.secondary, 0.42), 2) + circle(50, 80, 15, c.primary, dark(c.primary, 0.42), 2) + rect(45, 30, 10, 48, 5, c.primary) + Array.from({ length: 5 }, (_, i) => line(60, 16 + i * 10, 66, 16 + i * 10, c.accent, 1.6)).join('') + gloss(45, 76, 3, 4, 0.6, 0)),
  sy('droplet', 'Droplet', ['droplet', 'drop', 'liquid', 'water', 'reagent', 'dose', 'sample'], { primary: '#4a8fe7', secondary: '#ffffff', accent: '#3e4c59' },
    (c, u) => { const g = sphere(u, 'b', c.primary, { cx: 40, cy: 60, hi: 0.5 }); return defs(g) + path('M50 4 C62 28 84 46 84 66 C84 86 68 96 50 96 C32 96 16 86 16 66 C16 46 38 28 50 4Z', g.url, dark(c.primary, 0.42), 2) + gloss(36, 62, 4, 10, 0.7, 20); }),
  sy('snowflake', 'Snowflake (cold / frozen)', ['snowflake', 'cold', 'frozen', 'freeze', '-80', 'cryopreserved', 'on ice'], { primary: '#5aa7e6', secondary: '#ffffff', accent: '#3e4c59' },
    (c) => { const arm = `M50 50 V8 M50 20 l-8 -8 M50 20 l8 -8 M50 32 l-10 -8 M50 32 l10 -8`; return [0, 60, 120, 180, 240, 300].map((a) => `<g transform="rotate(${a} 50 50)"><path d="${arm}" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="7" stroke-linecap="round"/><path d="${arm}" fill="none" stroke="${c.primary}" stroke-width="4.4" stroke-linecap="round"/></g>`).join('') + circle(50, 50, 6, c.primary, dark(c.primary, 0.35), 1.6); }),
  sy('question-mark', 'Question mark', ['question', 'unknown', 'hypothesis', 'open question', 'mechanism unclear'], { primary: '#8e7cc3', secondary: '#ffffff', accent: '#3e4c59' },
    (c, u) => { const g = sphere(u, 'b', c.primary, { hi: 0.4 }); return defs(g) + circle(50, 50, 44, g.url, dark(c.primary, 0.42), 2) + `<path d="M36 38 Q36 22 50 22 Q64 22 64 36 Q64 46 54 50 Q50 52 50 60" fill="none" stroke="${c.secondary}" stroke-width="9" stroke-linecap="round"/>` + circle(50, 74, 5.6, c.secondary) + gloss(32, 26, 10, 5, 0.4); }),
  sy('document', 'Document', ['document', 'paper', 'report', 'protocol', 'publication', 'manuscript', 'file'], { primary: '#f6f7f9', secondary: '#9aa5b1', accent: '#4a8fe7' },
    (c, u) => { const g = linear(u, 'b', '#ffffff', c.primary); return defs(g) + path('M18 4 H64 L84 24 V96 H18 Z', g.url, dark(c.secondary, 0.2), 2) + path('M64 4 V24 H84', shade(c.primary, -0.1), dark(c.secondary, 0.2), 2) + rect(26, 30, 30, 5, 2, c.accent) + [42, 52, 62, 72, 82].map((y, i) => rect(26, y, i % 2 ? 40 : 50, 3, 1.5, c.secondary)).join(''); }),
  sy('database', 'Database', ['database', 'data storage', 'repository', 'atlas', 'server', 'dataset'], { primary: '#4a8fe7', secondary: '#9fcbf0', accent: '#ffffff' },
    (c, u) => { const g = linear(u, 'b', light(c.primary, 0.2), dark(c.primary, 0.2), { x2: 1, y2: 0 }); let s = defs(g); [66, 44, 22].forEach((y) => { s += path(`M14 ${y} V${y + 18} A36 10 0 0 0 86 ${y + 18} V${y} Z`, g.url, dark(c.primary, 0.42), 1.6) + ellipse(50, y, 36, 10, c.secondary, dark(c.primary, 0.42), 1.6); }); return s + gloss(34, 20, 12, 3, 0.5, 0); }),
];
