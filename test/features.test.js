// Building blocks, sticky notes, icon recoloring and journal-ready export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {
  createFigure, applyOps, renderSVG, describeFigure, lintFigure, visualBounds, findElement, creditLine, figureCredits, registerPack,
} from '../src/core/index.js';
import { recolorSvg, iconPalette } from '../src/icons/registry.js';
import { journalCheck, exportSize, minFontPx, presetById } from '../src/core/journal.js';
import { encodeTiff, pngWithDpi, rgbaToRgb, rasterPdf } from '../src/core/raster.js';
import { exportFigure } from '../src/node/export.js';

const ok = (r) => { assert.equal(r.error, null, r.error); return r.doc; };
const box = (doc, id) => visualBounds(findElement(doc, id), doc);
const overlaps = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

// ---- building blocks ---------------------------------------------------------------------

test('synapse: receptor pairs meet in the gap and a blocking antibody sits between them', () => {
  const r = applyOps(createFigure(), [{
    op: 'synapse', left: 't-cell-cd8', right: 'tumor-cell',
    pairs: [['tcr', 'mhc-i'], { left: 'pd-1', right: 'pd-l1', blockedBy: { icon: 'antibody', label: 'anti-PD-1' } }], legend: true,
  }]);
  const doc = ok(r);
  const L = box(doc, 't-cell-cd8'), R = box(doc, 'tumor-cell');
  assert.ok(L.x + L.w < R.x, 'cells do not overlap');
  for (const [a, b] of [['tcr', 'mhc-i'], ['pd-1', 'pd-l1']]) {
    assert.equal(findElement(doc, a).attachedTo, 't-cell-cd8');
    assert.equal(findElement(doc, b).attachedTo, 'tumor-cell');
    const gap = box(doc, b).x - (box(doc, a).x + box(doc, a).w);
    assert.ok(gap <= 2 && gap >= -20, `${a}/${b} tips should meet, gap ${gap}`);
  }
  const ab = box(doc, 'antibody'), pd1 = box(doc, 'pd-1');
  assert.ok(ab.x >= L.x + L.w - 10 && ab.x + ab.w <= R.x + 10, 'antibody sits in the gap between the cells');
  assert.ok(Math.abs(ab.y + ab.h / 2 - (pd1.y + pd1.h / 2)) < 3, 'antibody in line with PD-1');
  // legend: one swatch + text per receptor kind, all on the canvas
  assert.ok(r.results[0].ids.filter((id) => id.startsWith('text')).length >= 5);
  for (const e of doc.elements) {
    const b = visualBounds(e, doc);
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= doc.canvas.width && b.y + b.h <= doc.canvas.height, `${e.id} on canvas`);
  }
});

test('pathway: nodes are layered top to bottom, edges connect them, compartments enclose', () => {
  const doc = ok(applyOps(createFigure(), [{
    op: 'pathway', membrane: true,
    nodes: [{ id: 'il', icon: 'cytokine', label: 'Cytokine' }, { id: 'rec', icon: 'cytokine-receptor', label: 'Receptor' }, 'JAK', 'STAT', { id: 'genes', label: 'Target genes', shape: 'box' }],
    edges: [['il', 'rec', 'binds'], ['rec', 'JAK', 'activates'], ['JAK', 'STAT', 'phosphorylates'], ['STAT', 'genes', 'translocates']],
    compartments: [{ label: 'Nucleus', ids: ['genes'] }],
  }]));
  const ids = ['il', 'rec', 'JAK', 'STAT', 'genes'];
  for (const id of ids) assert.ok(findElement(doc, id), id);
  for (let i = 1; i < ids.length; i++) assert.ok(box(doc, ids[i]).y > box(doc, ids[i - 1]).y, `${ids[i]} below ${ids[i - 1]}`);
  const arrows = doc.elements.filter((e) => e.type === 'arrow');
  assert.equal(arrows.length, 4);
  assert.ok(arrows.every((a) => a.from?.id && a.to?.id));
  assert.ok(doc.elements.some((e) => e.type === 'shape' && e.shape.startsWith('membrane')), 'membrane drawn');
  assert.ok(doc.elements.some((e) => e.type === 'text' && /Nucleus/.test(e.text)), 'compartment labelled');
  const g = box(doc, 'genes');
  const encloses = doc.elements.filter((e) => e.type === 'shape' && e.id !== 'genes' && !e.shape.startsWith('membrane')).some((e) => {
    const n = visualBounds(e, doc);
    return g.x >= n.x && g.y >= n.y && g.x + g.w <= n.x + n.w && g.y + g.h <= n.y + n.h;
  });
  assert.ok(encloses, 'compartment encloses its node');
  assert.throws(() => { const r = applyOps(createFigure(), [{ op: 'pathway', nodes: ['A'], edges: [['A', 'B']] }]); if (r.error) throw new Error(r.error); }, /B/);
});

test('timeline: axis, repeated events, ranges and icons', () => {
  const r = applyOps(createFigure(), [{
    op: 'timeline', subject: { icon: 'mouse', label: 'C57BL/6' }, end: 24,
    events: [{ at: 0, label: 'MC38 s.c.', icon: 'mouse-sc' }, { at: [7, 10, 13], label: 'anti-PD-1 i.p.', icon: 'syringe' }, { from: 7, to: 21, label: 'Tumor measurements', below: true }],
  }]);
  const doc = ok(r);
  const texts = doc.elements.filter((e) => e.type === 'text').map((e) => e.text);
  for (const t of ['MC38 s.c.', 'anti-PD-1 i.p.', 'Tumor measurements', 'Day']) assert.ok(texts.some((x) => x.includes(t)), t);
  assert.ok(doc.elements.some((e) => e.icon === 'syringe'));
  assert.ok(doc.elements.some((e) => e.icon === 'mouse'));
  // tick labels never collide
  const ticks = doc.elements.filter((e) => e.type === 'text' && /^\d+$/.test(e.text)).map((e) => visualBounds(e, doc)).sort((a, b) => a.x - b.x);
  for (let i = 1; i < ticks.length; i++) assert.ok(!overlaps(ticks[i - 1], ticks[i]), 'tick labels overlap');
});

test('gating: one plot per step, fitted to the canvas, with arrows between', () => {
  const steps = [{ x: 'FSC-A', y: 'SSC-A', gate: 'Lymphocytes', pct: '58.3' }, { x: 'FSC-A', y: 'FSC-H', gate: 'Single cells' }, { x: 'CD4', y: 'CD8', gate: 'CD8^+', pct: '35.2' }];
  const doc = ok(applyOps(createFigure({ width: 900, height: 400 }), [{ op: 'gating', steps }]));
  const plots = doc.elements.filter((e) => e.shape === 'plot');
  assert.equal(plots.length, 3);
  for (const p of plots) { const b = visualBounds(p, doc); assert.ok(b.x + b.w <= 900 && b.y + b.h <= 400, 'plot on canvas'); }
  assert.ok(doc.elements.filter((e) => e.type === 'arrow').length >= 2);
  const svg = renderSVG(doc);
  assert.match(svg, /Lymphocytes/);
  assert.match(svg, /58\.3/);
});

test('tidy pulls overlapping elements apart and keeps them on the canvas', () => {
  let doc = ok(applyOps(createFigure(), [
    { op: 'add', element: { id: 'a', icon: 't-cell-cd8', x: 300, y: 300, w: 160 } },
    { op: 'add', element: { id: 'b', icon: 'b-cell', x: 340, y: 320, w: 160 } },
    { op: 'add', element: { id: 'c', icon: 'nk-cell', x: 1100, y: 700, w: 160 } },
  ]));
  assert.ok(overlaps(box(doc, 'a'), box(doc, 'b')));
  doc = ok(applyOps(doc, [{ op: 'tidy' }]));
  assert.ok(!overlaps(box(doc, 'a'), box(doc, 'b')), 'a and b no longer overlap');
  for (const id of ['a', 'b', 'c']) { const b = box(doc, id); assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= doc.canvas.width + 0.5 && b.y + b.h <= doc.canvas.height + 0.5, id); }
});

// ---- sticky notes ------------------------------------------------------------------------------

test('notes: shown to agents, never in exports or layout checks', async () => {
  const doc = ok(applyOps(createFigure(), [
    { op: 'add', element: { id: 'tc', icon: 't-cell-cd8', x: 100, y: 100, w: 150 } },
    { op: 'add', element: { id: 'n1', type: 'note', text: 'Make this bigger please', target: 'tc', x: 120, y: 120 } },
    { op: 'add', element: { id: 'n2', type: 'note', text: 'Done', resolved: true, x: 600, y: 100, author: 'claude' } },
  ]));
  assert.doesNotMatch(renderSVG(doc), /Make this bigger/);
  assert.match(renderSVG(doc, { notes: true }), /Make this bigger/);
  const d = describeFigure(doc);
  assert.match(d, /Notes \(1 open\)/);
  assert.match(d, /Make this bigger/);
  assert.ok(!lintFigure(doc).some((i) => (i.ids || []).includes('n1')), 'note overlap is not a layout problem');
  const png = await exportFigure(doc, { format: 'svg' });
  assert.doesNotMatch(String(png.data), /Make this bigger/);
  // removing the target leaves a detached note, not an error
  const d2 = ok(applyOps(doc, [{ op: 'remove', id: 'tc' }]));
  assert.ok(findElement(d2, 'n1'));
});

// ---- recoloring imported icons -----------------------------------------------------------------

test('recolorSvg: tint shifts hues and keeps greys; colorMap swaps exact colors', () => {
  const svg = '<path fill="#e64980" stroke="#333333"/><circle fill="#ffffff" style="fill:#4dabf7"/>';
  const tinted = recolorSvg(svg, { tint: '#2f9e44' });
  assert.doesNotMatch(tinted, /#e64980|#4dabf7/i);
  assert.match(tinted, /#333333/);
  assert.match(tinted, /#ffffff/);
  const mapped = recolorSvg(svg, { colorMap: { '#E64980': '#000000' } });
  assert.match(mapped, /fill="#000000"/);
  assert.match(mapped, /#4dabf7/);
  assert.equal(recolorSvg(svg, {}), svg);
  const pal = iconPalette({ svg });
  assert.ok(pal.includes('#e64980') && pal.includes('#4dabf7'));
});

test('imported icons render with tint and colorMap, and credits name the pack', () => {
  registerPack({ prefix: 'testpack', name: 'Test pack', source: 'https://example.org', icons: [{ id: 'blob', name: 'Blob', author: 'Someone', license: 'CC-BY-4.0', w: 10, h: 10, svg: '<circle cx="5" cy="5" r="4" fill="#e64980"/>' }] });
  const doc = ok(applyOps(createFigure(), [{ op: 'add', element: { id: 'x', icon: 'testpack/blob', x: 10, y: 10, w: 50, colorMap: { '#e64980': '#123456' } } }]));
  assert.match(renderSVG(doc), /#123456/);
  assert.doesNotMatch(renderSVG(doc), /#e64980/);
  assert.equal(figureCredits(doc)[0].author, 'Someone');
  assert.match(creditLine(doc), /“Blob” by Someone \(CC BY 4\.0\)/);
});

// ---- journal check and raster encoders ---------------------------------------------------------

test('journal check flags text that prints too small and computes the fix', () => {
  const doc = ok(applyOps(createFigure({ width: 1200, height: 800 }), [
    { op: 'add', element: { id: 't1', type: 'text', text: 'Tiny', x: 10, y: 10, fontSize: 9 } },
    { op: 'add', element: { id: 't2', type: 'text', text: 'Fine', x: 10, y: 60, fontSize: 24 } },
  ]));
  const p = presetById('nature-1col');
  const c = journalCheck(doc, { widthMm: p.widthMm, minPt: p.minPt, maxPt: p.maxPt });
  const warn = c.issues.find((i) => i.level === 'warning');
  assert.ok(warn && warn.ids.includes('t1') && !warn.ids.includes('t2'));
  const need = minFontPx(doc, p.widthMm, p.minPt);
  const fixed = ok(applyOps(doc, [{ op: 'update', id: 't1', set: { fontSize: need } }]));
  assert.ok(!journalCheck(fixed, { widthMm: 89, minPt: 5 }).issues.some((i) => i.level === 'warning'));
  const s = exportSize(doc, 183, 300);
  assert.equal(s.widthPx, Math.round((183 / 25.4) * 300));
  assert.ok(Math.abs(s.heightMm - 122) < 0.01);
});

function lzwDecode(bytes) {
  const out = [];
  let dict, len, bit = 0, prev = null;
  const reset = () => { dict = []; for (let i = 0; i < 256; i++) dict.push([i]); dict.push(null, null); len = 9; };
  reset();
  const read = () => { let v = 0; for (let i = 0; i < len; i++) { v = (v << 1) | ((bytes[(bit >> 3)] >> (7 - (bit & 7))) & 1); bit++; } return v; };
  for (;;) {
    if (bit + len > bytes.length * 8) break;
    const code = read();
    if (code === 257) break;
    if (code === 256) { reset(); prev = null; continue; }
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (code === dict.length && prev) entry = [...prev, prev[0]];
    else throw new Error(`bad code ${code}`);
    out.push(...entry);
    if (prev) dict.push([...prev, entry[0]]);
    prev = entry;
    if (dict.length + 1 >= (1 << len) && len < 12) len++;
  }
  return Uint8Array.from(out);
}

test('TIFF: LZW strips decode back to the exact pixels, with dpi tags', () => {
  const w = 300, h = 220;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = (i * 7) % 256; rgba[i * 4 + 1] = (i >> 3) % 256; rgba[i * 4 + 2] = i % 3 ? 255 : 0; rgba[i * 4 + 3] = 255; }
  const tif = encodeTiff(rgba, w, h, 600);
  const dv = new DataView(tif.buffer, tif.byteOffset, tif.byteLength);
  assert.equal(String.fromCharCode(tif[0], tif[1]), 'II');
  const ifd = dv.getUint32(4, true);
  const tags = {};
  for (let i = 0; i < dv.getUint16(ifd, true); i++) {
    const o = ifd + 2 + i * 12;
    tags[dv.getUint16(o, true)] = { type: dv.getUint16(o + 2, true), count: dv.getUint32(o + 4, true), value: dv.getUint32(o + 8, true), o };
  }
  const val = (t) => (tags[t].type === 3 && tags[t].count === 1 ? dv.getUint16(tags[t].o + 8, true) : tags[t].value);
  assert.equal(val(256), w);
  assert.equal(val(257), h);
  assert.equal(val(259), 5, 'LZW');
  assert.equal(dv.getUint32(tags[282].value, true) / dv.getUint32(tags[282].value + 4, true), 600);
  const n = tags[273].count;
  const offs = [], counts = [];
  for (let i = 0; i < n; i++) {
    offs.push(n === 1 ? tags[273].value : dv.getUint32(tags[273].value + i * 4, true));
    counts.push(n === 1 ? tags[279].value : dv.getUint32(tags[279].value + i * 4, true));
  }
  const pixels = Buffer.concat(offs.map((o, i) => Buffer.from(lzwDecode(tif.subarray(o, o + counts[i])))));
  assert.deepEqual(new Uint8Array(pixels), rgbaToRgb(rgba));
});

test('PNG dpi chunk and raster PDF are well formed', () => {
  const png = zlib.deflateSync(Buffer.alloc(10));
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length); b.write(type, 4); data.copy(b, 8); b.writeUInt32BE(zlib.crc32 ? zlib.crc32(Buffer.concat([Buffer.from(type), data])) : 0, 8 + data.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
  const src = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', png), chunk('IEND', Buffer.alloc(0))]);
  const out = Buffer.from(pngWithDpi(new Uint8Array(src), 300));
  const at = out.indexOf('pHYs');
  assert.ok(at > 0 && at < out.indexOf('IDAT'), 'pHYs before IDAT');
  assert.equal(out.readUInt32BE(at + 4), Math.round(300 / 0.0254));
  const pdf = Buffer.from(rasterPdf({ deflatedRgb: zlib.deflateSync(Buffer.alloc(12)), width: 2, height: 2, widthPt: 100, heightPt: 100, title: 'T' })).toString('latin1');
  assert.match(pdf, /^%PDF-1\.\d/);
  assert.match(pdf, /\/MediaBox \[0 0 100(\.0+)? 100(\.0+)?\]/);
  assert.match(pdf, /%%EOF\s*$/);
});

// ---- Node export ------------------------------------------------------------------------------

test('exportFigure: vector PDF, LZW TIFF and PowerPoint at a journal size', { timeout: 60000 }, async () => {
  const doc = ok(applyOps(createFigure({ width: 1000, height: 500 }), [
    { op: 'add', element: { id: 'tc', icon: 't-cell-cd8', x: 100, y: 100, w: 180, label: 'CD8^+ T cell' } },
    { op: 'add', element: { id: 'tm', icon: 'tumor-cell', x: 600, y: 100, w: 180, label: 'Tumor' } },
    { op: 'connect', from: 'tc', to: 'tm', label: '**kills**' },
    { op: 'add', element: { type: 'note', text: 'internal note', x: 10, y: 10 } },
  ]));
  const pdf = await exportFigure(doc, { format: 'pdf', journal: 'nature-2col' });
  assert.equal(Buffer.from(pdf.data).subarray(0, 4).toString(), '%PDF');
  assert.ok(Math.abs(pdf.size.widthMm - 183) < 0.01);
  const pdfText = Buffer.from(pdf.data).toString('latin1');
  assert.match(pdfText, /MediaBox \[0 0 518\.7/);
  assert.match(pdfText, /LiberationSans/);
  assert.match(pdf.credit, /ForThePlot/);

  const tif = await exportFigure(doc, { format: 'tiff', widthMm: 90, dpi: 600 });
  assert.equal(Buffer.from(tif.data).subarray(0, 4).toString('hex'), '49492a00');
  assert.equal(tif.size.widthPx, Math.round((90 / 25.4) * 600));

  const pptx = await exportFigure(doc, { format: 'pptx' });
  const buf = Buffer.from(pptx.data);
  assert.equal(buf.subarray(0, 2).toString(), 'PK');
  assert.ok(buf.includes(Buffer.from('ppt/slides/slide1.xml')));
});
