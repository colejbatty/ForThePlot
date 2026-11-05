// Builds the example figures in examples/ *using the same ops an agent would send*.
// Run: node scripts/build-examples.js   (also renders examples/*.png previews)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFigure, applyOps, renderSVG, lintFigure, formatIssues, findElement } from '../src/core/index.js';
import { surfacePoint } from '../src/core/geometry.js';

const surfacePointFor = (doc, id, angle, inset) => surfacePoint(findElement(doc, id), angle, doc, inset);
import { svgToPng } from '../src/node/png.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'examples');

async function build(name, opts, steps) {
  let doc = createFigure(opts);
  for (const ops of steps) {
    const list = typeof ops === 'function' ? ops(doc) : ops;
    const r = applyOps(doc, list);
    if (r.error) throw new Error(`${name}: ${r.error}`);
    doc = r.doc;
  }
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(doc, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, `${name}.png`), await svgToPng(renderSVG(doc), { scale: 1 }));
  const issues = lintFigure(doc).filter((i) => !/overlap/.test(i.message));
  console.log(`${name}: ${doc.elements.length} elements${issues.length ? '\n' + formatIssues(issues) : ''}`);
  return doc;
}

const T = (text, x, y, extra = {}) => ({ op: 'add', element: { type: 'text', text, x, y, ...extra } });
const I = (id, icon, cx, cy, w, extra = {}) => ({ op: 'add', element: { id, icon, cx, cy, w, ...extra } });
const badge = (id, label, cx, cy, fill) => ({ op: 'add', element: { id, type: 'shape', shape: 'ellipse', x: cx - 15, y: cy - 15, w: 30, h: 30, fill, stroke: '#ffffff', strokeWidth: 2, text: `**${label}**`, fontSize: 17, textColor: '#ffffff' } });
const panel = (id, x, y, w, h, fill, stroke) => ({ op: 'add', element: { id, type: 'shape', shape: 'rect', x, y, w, h, radius: 18, fill, stroke, strokeWidth: 1.5 } });

// 1 ── PD-1 checkpoint blockade ------------------------------------------------------
function synapse(sfx, tcx, ucx, cy, pdl1Angle = 160) {
  return [
    [
      I(`tcell${sfx}`, 't-cell-cd8', tcx, cy, 210, { label: { text: 'CD8^+ T cell', fontSize: 18, bold: true } }),
      I(`tumor${sfx}`, 'tumor-cell', ucx, cy, 210, { label: { text: 'Tumor cell', fontSize: 18, bold: true } }),
      I(`tcr${sfx}`, 'tcr', 0, 0, 54),
      I(`pd1${sfx}`, 'pd-1', 0, 0, 44),
      I(`mhc${sfx}`, 'mhc-i', 0, 0, 54),
      I(`pdl1${sfx}`, 'pd-l1', 0, 0, 40),
      { op: 'attach', id: `tcr${sfx}`, to: `tcell${sfx}`, angle: -20 },
      { op: 'attach', id: `pd1${sfx}`, to: `tcell${sfx}`, angle: 20 },
      { op: 'attach', id: `mhc${sfx}`, to: `tumor${sfx}`, angle: 200 },
      { op: 'attach', id: `pdl1${sfx}`, to: `tumor${sfx}`, angle: pdl1Angle },
    ],
  ];
}

await build('pd1-blockade', { title: 'Checkpoint blockade: anti-PD-1 restores T cell killing', width: 1400, height: 800 }, [
  [
    T('**Checkpoint blockade: anti-PD-1 restores T cell killing**', 40, 26, { fontSize: 30 }),
    panel('panel-a', 30, 90, 655, 600, '#f6f8fb', '#d9e2ec'),
    panel('panel-b', 715, 90, 655, 600, '#f3faf5', '#cfe8d8'),
    T('**A**  PD-L1 engages PD-1: T cell is held in check', 54, 108, { fontSize: 20, color: '#3e4c59' }),
    T('**B**  Anti-PD-1 blocks the interaction', 739, 108, { fontSize: 20, color: '#3e4c59' }),
  ],
  ...synapse('-a', 200, 490, 380),
  ...synapse('-b', 885, 1175, 380, 126),
  [
    { op: 'connect', from: [372, 478], to: 'tcell-a', routing: 'curved', curvature: -0.3, head: 'inhibit', stroke: '#d64545', width: 3.5, label: 'inhibitory\nsignal', labelSize: 15 },
    T('Exhausted: ↓ IFN-γ, ↓ proliferation,\n↓ cytotoxicity', 120, 590, { fontSize: 17, color: '#52606d', align: 'center', w: 300 }),
    I('antibody-b', 'antibody', 0, 0, 56, { rotation: 290, colors: { primary: '#2f9e6e', secondary: '#9ad8b8' }, label: { text: 'anti-PD-1', position: 'bottom', fontSize: 15, color: '#2f7a55', bold: true } }),
  ],
  (doc) => {
    // seat the antibody's arms on the tip of PD-1
    const tip = surfacePointFor(doc, 'tcell-b', 20, -64);
    const a = (20 * Math.PI) / 180;
    return [{ op: 'moveTo', id: 'antibody-b', cx: tip.x + Math.cos(a) * 27, cy: tip.y + Math.sin(a) * 27 }];
  },
  [
    { op: 'connect', from: { id: 'tcell-b', anchor: 'top' }, to: { id: 'tumor-b', anchor: 'top' }, routing: 'curved', curvature: -0.3, head: 'arrow', stroke: '#2f7a55', width: 4, label: '**killing**', labelSize: 16 },
    I('cytokines-b', 'cytokines', 800, 215, 64, { label: { text: 'IFN-γ, TNF', position: 'right', fontSize: 15, color: '#52606d' } }),
    I('burst-b', 'burst', 1250, 296, 46, { opacity: 0.9 }),
    T('Reinvigorated: cytokines, proliferation, tumor killing', 760, 640, { fontSize: 17, color: '#2f7a55', align: 'center', w: 560 }),
    // legend
    I('lg-tcr', 'tcr', 70, 742, 26), T('TCR', 92, 732, { fontSize: 15 }),
    I('lg-mhc', 'mhc-i', 160, 742, 26), T('MHC-I + peptide', 182, 732, { fontSize: 15 }),
    I('lg-pd1', 'pd-1', 340, 742, 22), T('PD-1', 358, 732, { fontSize: 15 }),
    I('lg-pdl1', 'pd-l1', 420, 742, 22), T('PD-L1', 438, 732, { fontSize: 15 }),
    I('lg-ab', 'antibody', 520, 742, 32, { colors: { primary: '#2f9e6e', secondary: '#9ad8b8' } }), T('Anti-PD-1 antibody', 544, 732, { fontSize: 15 }),
  ],
]);

// 2 ── T cell activation: three signals -----------------------------------------------
await build('t-cell-activation', { title: 'T cell activation requires three signals', width: 1200, height: 720 }, [
  [
    T('**T cell activation requires three signals**', 40, 26, { fontSize: 30 }),
    I('dc', 'dendritic-cell', 310, 400, 330, { rotation: 20, label: { text: 'Dendritic cell (APC)', fontSize: 19, bold: true } }),
    I('tcell', 't-cell-cd4', 615, 400, 250, { label: { text: 'Naïve CD4^+ T cell', fontSize: 19, bold: true } }),
    I('mhc2', 'mhc-ii', 0, 0, 52), I('cd80', 'cd80-cd86', 0, 0, 44),
    I('tcr', 'tcr', 0, 0, 52), I('cd28', 'cd28', 0, 0, 52), I('cd4', 'cd4', 0, 0, 30),
    I('il2r', 'cytokine-receptor', 0, 0, 56),
    { op: 'attach', id: 'mhc2', to: 'dc', angle: -9, inset: 10 },
    { op: 'attach', id: 'cd80', to: 'dc', angle: 13, inset: 10 },
    { op: 'attach', id: 'tcr', to: 'tcell', angle: 191 },
    { op: 'attach', id: 'cd4', to: 'tcell', angle: 203 },
    { op: 'attach', id: 'cd28', to: 'tcell', angle: 167 },
    { op: 'attach', id: 'il2r', to: 'tcell', angle: 250 },
  ],
  [
    I('cyt', 'cytokines', 410, 170, 80),
    { op: 'connect', from: 'cyt', to: 'il2r', routing: 'curved', curvature: 0.3, head: 'arrow', stroke: '#f39a3d', width: 3 },
    { op: 'connect', from: 'dc', to: 'cyt', routing: 'curved', curvature: 0.2, head: 'arrow', stroke: '#f39a3d', width: 3, dash: 'dashed' },
    badge('b1', '1', 468, 312, '#3f63b5'), badge('b2', '2', 462, 486, '#3a8a2f'), badge('b3', '3', 470, 150, '#c26a14'),
    T('**1** Antigen: peptide–MHC II : TCR', 120, 640, { fontSize: 17, color: '#3f63b5' }),
    T('**2** Co-stimulation: CD80/86 : CD28', 440, 640, { fontSize: 17, color: '#3a8a2f' }),
    T('**3** Cytokines: IL-12, IL-2 …', 770, 640, { fontSize: 17, color: '#c26a14' }),
    { op: 'add', element: { id: 'outcome', type: 'shape', shape: 'rect', x: 860, y: 350, w: 290, h: 100, radius: 14, fill: '#eaf2fd', stroke: '#4a8fe7', text: '**Clonal expansion &\neffector differentiation**', fontSize: 17 } },
    { op: 'connect', from: 'tcell', to: 'outcome', head: 'arrow', stroke: '#4a8fe7', width: 4 },
    T('Signal 1 without signal 2 → anergy', 860, 470, { fontSize: 15, color: '#7b8794', italic: true }),
  ],
]);

// 3 ── CAR-T manufacturing ----------------------------------------------------------------
await build('car-t-workflow', { title: 'Autologous CAR-T cell therapy', width: 1500, height: 520 }, [
  [
    T('**Autologous CAR-T cell therapy**', 40, 26, { fontSize: 30 }),
    I('patient', 'human', 0, 0, 70, { label: { text: '**1** Patient', fontSize: 16 } }),
    I('blood', 'blood-tube', 0, 0, 44, { label: { text: '**2** Leukapheresis', fontSize: 16 } }),
    I('tcells', 't-cell', 0, 0, 110, { label: { text: '**3** Isolate T cells', fontSize: 16 } }),
    I('vector', 'retrovirus', 0, 0, 90, { label: { text: '**4** Lentiviral CAR\ntransduction', fontSize: 16 } }),
    I('flask', 'culture-flask', 0, 0, 140, { label: { text: '**5** Expand', fontSize: 16 } }),
    I('cart', 'car-t-cell', 0, 0, 130, { label: { text: '**6** CAR-T cells', fontSize: 16 } }),
    I('infuse', 'syringe', 0, 0, 130, { label: { text: '**7** Infuse', fontSize: 16 } }),
    { op: 'arrange', ids: ['patient', 'blood', 'tcells', 'vector', 'flask', 'cart', 'infuse'], layout: 'row', gap: 92, x: 70, cy: 200 },
    { op: 'connect', from: 'patient', to: 'blood', stroke: '#9aa5b1', width: 3 },
    { op: 'connect', from: 'blood', to: 'tcells', stroke: '#9aa5b1', width: 3 },
    { op: 'connect', from: 'tcells', to: 'vector', stroke: '#9aa5b1', width: 3 },
    { op: 'connect', from: 'vector', to: 'flask', stroke: '#9aa5b1', width: 3 },
    { op: 'connect', from: 'flask', to: 'cart', stroke: '#9aa5b1', width: 3 },
    { op: 'connect', from: 'cart', to: 'infuse', stroke: '#9aa5b1', width: 3 },
    { op: 'connect', from: { id: 'infuse', anchor: 'bottom' }, to: { id: 'patient', anchor: 'bottom' }, routing: 'elbow', stroke: '#e8724a', width: 3, dash: 'dashed', label: 'Re-infusion (~2–4 weeks vein-to-vein)', labelSize: 15 },
  ],
  [
    I('car', 'car', 80, 455, 30, { label: { text: 'CAR: scFv – hinge – TM – 4-1BB – CD3ζ', position: 'right', fontSize: 15, color: '#52606d' } }),
  ],
]);

// 4 ── Flow cytometry workflow ------------------------------------------------------------
await build('flow-cytometry-workflow', { title: 'Immunophenotyping by flow cytometry', width: 1400, height: 460 }, [
  [
    T('**Immunophenotyping by flow cytometry**', 40, 26, { fontSize: 30 }),
    I('mouse', 'mouse', 0, 0, 130, { label: { text: 'Mouse', fontSize: 16 } }),
    I('spleen', 'spleen', 0, 0, 100, { label: { text: 'Harvest spleen', fontSize: 16 } }),
    I('tube', 'conical-tube', 0, 0, 40, { label: { text: 'Single-cell\nsuspension', fontSize: 16 } }),
    I('stain', 'antibody', 0, 0, 80, { colors: { primary: '#8c6bd6', secondary: '#c3b3ef' }, label: { text: 'Stain with\nantibodies', fontSize: 16 } }),
    I('facs', 'facs-tube', 0, 0, 40, { label: { text: 'Acquire', fontSize: 16 } }),
    I('cyto', 'flow-cytometer', 0, 0, 140, { label: { text: 'Flow cytometer', fontSize: 16 } }),
    I('plot', 'flow-plot', 0, 0, 110, { label: { text: 'Gate populations', fontSize: 16 } }),
    I('umap', 'umap', 0, 0, 110, { label: { text: 'Cluster (UMAP)', fontSize: 16 } }),
    { op: 'arrange', ids: ['mouse', 'spleen', 'tube', 'stain', 'facs', 'cyto', 'plot', 'umap'], layout: 'row', gap: 76, x: 50, cy: 200 },
  ],
  (doc) => {
    const ids = ['mouse', 'spleen', 'tube', 'stain', 'facs', 'cyto', 'plot', 'umap'];
    return [...ids.slice(1).map((id, i) => ({ op: 'connect', from: ids[i], to: id, stroke: '#9aa5b1', width: 3 })), { op: 'fit', margin: 40 }];
  },
]);

// 5 ── EBV and B cells --------------------------------------------------------------------
await build('ebv-b-cell', { title: 'EBV infection of B cells and T cell control', width: 1300, height: 700 }, [
  [
    T('**EBV infects B cells; CD8^+ T cells control infected cells**', 40, 26, { fontSize: 28 }),
    I('ebv', 'herpesvirus', 150, 300, 120, { label: { text: 'EBV', fontSize: 18, bold: true } }),
    I('bcell', 'b-cell', 450, 300, 190, { label: { text: 'Resting B cell', fontSize: 18 } }),
    I('lcl', 'b-cell', 820, 300, 210, { colors: { primary: '#e88c3a', accent: '#c4532a' }, label: { text: 'Latently infected,\nproliferating B cell', fontSize: 18 } }),
    I('ctl', 't-cell-cd8', 1130, 520, 170, { label: { text: 'EBV-specific CD8^+ T cell', fontSize: 18 } }),
    I('ep', 'herpesvirus', 800, 280, 56),
    I('ep2', 'dna', 860, 330, 70),
    { op: 'connect', from: 'ebv', to: 'bcell', head: 'arrow', stroke: '#3f63b5', width: 3, label: 'gp350 : CD21', labelSize: 15 },
    { op: 'connect', from: 'bcell', to: 'lcl', head: 'arrow', stroke: '#52606d', width: 3, label: 'latency III\n(EBNAs, LMP1/2)', labelSize: 15 },
    { op: 'connect', from: 'ctl', to: 'lcl', head: 'inhibit', stroke: '#d64545', width: 4, routing: 'curved', curvature: 0.3, label: 'killing', labelSize: 15 },
    T('Loss of T cell control → lymphoproliferation (e.g. PTLD)', 360, 600, { fontSize: 17, color: '#7b8794', italic: true }),
    { op: 'fit', margin: 40 },
  ],
]);

// 6 ── Tumor model study, built from building blocks and lettered panels --------------------
await build('tumor-model-study', { title: 'Anti-PD-1 in the MC38 tumor model', width: 1400, height: 800 }, [
  [
    T('**Anti-PD-1 in the MC38 tumor model**', 40, 24, { fontSize: 30 }),
    {
      op: 'panels', y: 80, margin: 24, gap: 22, rows: 2, cols: 2, heights: [0.8, 1.2],
      cells: [
        { row: 0, col: 0, colSpan: 2, title: 'Experimental design' },
        { row: 1, col: 0, title: 'Tumor-infiltrating CD8^+ T cells' },
        { row: 1, col: 1, title: 'Mechanism: blockade restores killing' },
      ],
    },
    {
      op: 'timeline', x: 60, y: 238, width: 1225, subject: { icon: 'mouse', label: 'C57BL/6' }, end: 24,
      events: [
        { at: 0, label: 'MC38 s.c.', icon: 'mouse-sc' },
        { at: [7, 10, 13], label: 'anti-PD-1 i.p.', icon: 'syringe' },
        { from: 7, to: 21, label: 'Tumor measurements', below: true },
        { at: 21, label: 'Harvest tumors → flow', icon: 'flow-cytometer' },
      ],
    },
    {
      op: 'gating', x: 76, y: 500, cols: 3, size: 150, gap: 56,
      steps: [
        { x: 'FSC-A', y: 'SSC-A', gate: 'Lymphocytes', pct: '41.2' },
        { x: 'FSC-A', y: 'FSC-H', gate: 'Single cells', pct: '95.8' },
        { x: 'CD4', y: 'CD8', gate: 'CD8^+', pct: '38.9' },
      ],
    },
    {
      op: 'synapse', cx: 1043, cy: 590, left: 't-cell-cd8', right: 'tumor-cell', size: 170,
      pairs: [['tcr', 'mhc-i'], { left: 'pd-1', right: 'pd-l1', blockedBy: { icon: 'antibody', colors: { primary: '#2f9e6e', secondary: '#9ad8b8' }, label: 'anti-PD-1' } }],
    },
  ],
]);
