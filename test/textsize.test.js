// Text sizes by kind: whole figure, one panel, a selection; px and pt; panel letters and titles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFigure, applyOps, findElement, renderSVG, textSizes, textSizeSummary, describeFigure, panelHeader, normalizeFigure,
} from '../src/core/index.js';
import { journalCheck } from '../src/core/journal.js';

const ok = (r) => { assert.equal(r.error, null, r.error); return r.doc; };

function figure() {
  return ok(applyOps(createFigure({ width: 1200, height: 800 }), [
    { op: 'panels', rows: 1, cols: 2, titles: ['Design', 'Readout'] },
    { op: 'add', elements: [
      { id: 't1', icon: 't-cell', x: 80, y: 120, w: 100, label: 'CD8^+ T cell' },
      { id: 't2', icon: 'tumor-cell', x: 300, y: 120, w: 100, label: { text: 'Tumor', fontSize: 22 } },
      { id: 'note1', type: 'text', text: 'Day 7', x: 100, y: 400, fontSize: 20 },
      { id: 'box', type: 'shape', shape: 'rect', x: 700, y: 150, w: 200, h: 80, text: 'IFN-γ ELISA', fontSize: 18 },
      { id: 'cap', type: 'text', text: 'Readout note', x: 700, y: 400, fontSize: 24 },
    ] },
    { op: 'connect', id: 'a1', from: 't1', to: 't2', label: 'kills', labelSize: 14 },
  ]));
}

const panelIds = (doc) => doc.elements.filter((e) => e.type === 'panel').map((e) => e.id);

test('sizes are read by kind for the figure and for one panel', () => {
  const doc = figure();
  const all = Object.fromEntries(textSizes(doc).map((s) => [s.role, s]));
  assert.deepEqual([all.labels.min, all.labels.max], [16, 22]);
  assert.equal(all.text.count, 2);
  assert.equal(all.arrows.min, 14);
  assert.equal(all.titles.count, 2);
  assert.equal(all.letters.min, 28);
  const [, right] = panelIds(doc);
  const inB = textSizes(doc, { within: right }).map((s) => s.role);
  assert.deepEqual(inB, ['text', 'shapes', 'titles', 'letters']);
  assert.match(textSizeSummary(doc), /labels 16–22 px/);
});

test('set one kind across the figure, in px and in pt', () => {
  let doc = figure();
  doc = ok(applyOps(doc, [{ op: 'textSize', roles: ['labels'], size: 18 }]));
  assert.equal(findElement(doc, 't1').label.fontSize, 18);
  assert.equal(findElement(doc, 't2').label.fontSize, 18);
  assert.equal(findElement(doc, 'note1').fontSize, 20, 'other kinds untouched');
  // pt needs the printed width
  const r = applyOps(doc, [{ op: 'textSize', pt: 7 }]);
  assert.match(r.error, /printed width/);
  doc = ok(applyOps(doc, [{ op: 'canvas', set: { printWidth: 183 } }, { op: 'textSize', roles: ['labels', 'arrows'], pt: 7 }]));
  const k = ((183 / 25.4) * 72) / 1200;
  assert.ok(Math.abs(findElement(doc, 't1').label.fontSize * k - 7) < 0.05);
  assert.ok(Math.abs(findElement(doc, 'a1').labelSize * k - 7) < 0.05);
  assert.match(describeFigure(doc), /printed 183 mm wide/);
  assert.match(describeFigure(doc), /arrow labels 16\.2 px \(7 pt\)/);
  // the printed width survives saving
  assert.equal(normalizeFigure(JSON.parse(JSON.stringify(doc))).canvas.printWidth, 183);
});

test('all text in one panel scales together; the other panel and the letters stay', () => {
  let doc = figure();
  const [left, right] = panelIds(doc);
  doc = ok(applyOps(doc, [{ op: 'textSize', within: right, scale: 0.5 }]));
  assert.equal(findElement(doc, 'box').fontSize, 9);
  assert.equal(findElement(doc, 'cap').fontSize, 12);
  assert.equal(findElement(doc, right).titleSize, 9, 'its title follows');
  assert.equal(findElement(doc, right).letterSize, undefined, 'letters stay consistent unless asked');
  assert.equal(findElement(doc, 't1').label.fontSize, 16, 'left panel untouched');
  assert.equal(findElement(doc, left).titleSize, undefined);
  // the title is drawn at its own size
  assert.equal(panelHeader(findElement(doc, right), doc).ts, 9);
  assert.equal(panelHeader(findElement(doc, left), doc).ts, 18);
  // set everything in a panel to one size
  doc = ok(applyOps(doc, [{ op: 'textSize', within: left, size: 15 }]));
  assert.equal(findElement(doc, 't1').label.fontSize, 15);
  assert.equal(findElement(doc, 'a1').labelSize, 15, 'arrows inside the panel are included');
  assert.match(applyOps(doc, [{ op: 'textSize', within: 't1', size: 10 }]).error, /not a panel/);
});

test('panel letters and titles: figure-wide style, per-panel override, bold', () => {
  let doc = figure();
  const [left, right] = panelIds(doc);
  doc = ok(applyOps(doc, [{ op: 'update', id: right, set: { letterSize: 40 } }]));
  assert.equal(panelHeader(findElement(doc, right), doc).size, 40);
  assert.equal(panelHeader(findElement(doc, left), doc).size, 28);
  // setting letters for the whole figure makes them all match again
  doc = ok(applyOps(doc, [{ op: 'textSize', roles: ['letters'], size: 24 }, { op: 'textSize', roles: ['titles'], size: 16 }]));
  assert.equal(doc.panelLabels.size, 24);
  assert.equal(doc.panelLabels.titleSize, 16);
  assert.equal(findElement(doc, right).letterSize, undefined);
  // scaling keeps a panel's own difference
  doc = ok(applyOps(doc, [{ op: 'update', id: right, set: { titleSize: 20 } }, { op: 'textSize', roles: ['titles', 'letters'], scale: 1.5 }]));
  assert.equal(doc.panelLabels.titleSize, 24);
  assert.equal(findElement(doc, right).titleSize, 30);
  assert.equal(doc.panelLabels.size, 36);
  // plain (not bold) letters and titles
  doc = ok(applyOps(doc, [{ op: 'canvas', set: { panelLabels: { letterBold: false, titleBold: false } } }]));
  const hd = panelHeader(findElement(doc, left), doc);
  assert.equal(hd.letterText, 'A');
  assert.equal(hd.titleBold, false);
  assert.doesNotMatch(renderSVG(doc).match(/>A<\/tspan>|>A<\/text>/)?.[0] || 'none', /font-weight/);
});

test('raise small text to a minimum and the journal check sees panel letters', () => {
  let doc = figure();
  doc = ok(applyOps(doc, [{ op: 'canvas', set: { printWidth: 89 } }]));
  const before = journalCheck(doc, { widthMm: 89, minPt: 6 });
  assert.ok(before.items.some((t) => t.role === 'letter'));
  assert.ok(before.issues.length, 'small text at 89 mm');
  doc = ok(applyOps(doc, [{ op: 'textSize', minPt: 6, roles: ['text', 'labels', 'shapes', 'arrows', 'titles', 'letters'] }]));
  const after = journalCheck(doc, { widthMm: 89, minPt: 6 });
  assert.equal(after.issues.filter((i) => i.level === 'warning').length, 0, after.summary);
  assert.equal(findElement(doc, 't2').label.fontSize >= 22, true, 'bigger text is left alone');
});
