import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFigure, normalizeFigure, applyOps, renderSVG, validateFigure, lintFigure, describeFigure, parseRich, layoutText,
  searchIcons, allIcons, getIcon, arrowGeometry, findElement, embedUsedIcons, registerEmbeddedIcons, registerPack,
} from '../src/core/index.js';
import { sanitizeSvg, unwrapSvg, prefixIds } from '../src/icons/registry.js';

const ok = (r) => { assert.equal(r.error, null, r.error); return r.doc; };

test('built-in library is immunology-first and every icon renders', () => {
  const icons = allIcons().filter((i) => i.draw);
  assert.ok(icons.length >= 120, `only ${icons.length} icons`);
  for (const id of ['t-cell-cd8', 'treg', 'b-cell', 'plasma-cell', 'nk-cell', 'macrophage', 'dendritic-cell', 'antibody', 'igm', 'tcr-cd3', 'mhc-i', 'mhc-ii', 'pd-1', 'pd-l1', 'ctla-4', 'car', 'herpesvirus', 'flow-cytometer']) {
    assert.ok(getIcon(id), id);
  }
  let doc = createFigure();
  doc = ok(applyOps(doc, icons.map((ic, i) => ({ op: 'add', element: { icon: ic.id, x: (i % 20) * 60, y: Math.floor(i / 20) * 60, w: 50 } }))));
  const svg = renderSVG(doc);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(!svg.includes('NaN'), 'NaN in output');
  assert.ok(!svg.includes('undefined'), 'undefined in output');
});

test('ops: add, near, connect, attach, align, arrange, remove are transactional', () => {
  let doc = createFigure({ width: 1000, height: 600 });
  doc = ok(applyOps(doc, [
    { op: 'add', element: { id: 'a', icon: 't-cell', cx: 200, cy: 300, w: 120 } },
    { op: 'add', element: { id: 'b', icon: 'tumor-cell', w: 120, near: { id: 'a', side: 'right', gap: 100 } } },
    { op: 'connect', from: 'a', to: 'b', head: 'inhibit', label: 'blocks' },
    { op: 'add', element: { id: 'r', icon: 'pd-1', w: 30 } },
    { op: 'attach', id: 'r', to: 'a', toward: 'b' },
  ]));
  const a = findElement(doc, 'a'), b = findElement(doc, 'b'), r = findElement(doc, 'r');
  assert.equal(Math.round(b.x - (a.x + a.w)), 100);
  assert.equal(r.attachedTo, 'a');
  assert.ok(Math.abs(r.rotation - 90) < 1, `rotation ${r.rotation}`);
  // moving the host carries the receptor
  const rx = r.x;
  doc = ok(applyOps(doc, [{ op: 'move', ids: ['a'], dx: 10, dy: 0 }]));
  assert.equal(Math.round(findElement(doc, 'r').x - rx), 10);
  // failing op leaves the doc unchanged
  const before = JSON.stringify(doc);
  const bad = applyOps(doc, [{ op: 'move', ids: ['a'], dx: 5 }, { op: 'remove', id: 'nope' }]);
  assert.match(bad.error, /op #2/);
  assert.equal(JSON.stringify(bad.doc), before);
  // removing the host removes arrows and attached receptors
  doc = ok(applyOps(doc, [{ op: 'remove', id: 'a' }]));
  assert.deepEqual(doc.elements.map((e) => e.id), ['b']);
});

test('arrange, align and distribute', () => {
  let doc = createFigure();
  doc = ok(applyOps(doc, [
    ...['x', 'y', 'z'].map((id, i) => ({ op: 'add', element: { id, icon: 'antibody', x: i * 37, y: i * 50, w: 60 } })),
    { op: 'arrange', ids: ['x', 'y', 'z'], layout: 'row', gap: 20, x: 100, y: 100 },
  ]));
  assert.deepEqual(doc.elements.map((e) => Math.round(e.x)), [100, 180, 260]);
  assert.ok(doc.elements.every((e) => e.y === 100));
  doc = ok(applyOps(doc, [{ op: 'move', ids: ['y'], dx: 0, dy: 40 }, { op: 'align', ids: ['x', 'y', 'z'], edge: 'top' }]));
  assert.ok(doc.elements.every((e) => e.y === 100));
});

test('fit resizes the canvas to content', () => {
  let doc = createFigure({ width: 2000, height: 2000 });
  doc = ok(applyOps(doc, [{ op: 'add', element: { icon: 'mouse', x: 500, y: 700, w: 200 } }, { op: 'fit', margin: 20 }]));
  assert.ok(doc.canvas.width < 300 && doc.canvas.height < 200, `${doc.canvas.width}x${doc.canvas.height}`);
  assert.equal(lintFigure(doc).length, 0);
});

test('rich text markup', () => {
  const runs = parseRich('**CD8**^+ T_{reg} *IFNG* a\\*b');
  assert.deepEqual(runs.map((r) => [r.text, r.bold, r.italic, r.script]), [
    ['CD8', true, false, null], ['+', false, false, 'sup'], [' T', false, false, null], ['reg', false, false, 'sub'],
    [' ', false, false, null], ['IFNG', false, true, null], [' a*b', false, false, null],
  ]);
  const lay = layoutText('one two three four five six', { fontSize: 20, maxWidth: 80 });
  assert.ok(lay.lines.length >= 3);
});

test('arrows attach to element outlines and support all routings', () => {
  let doc = createFigure();
  doc = ok(applyOps(doc, [
    { op: 'add', element: { id: 'p', type: 'shape', shape: 'rect', x: 100, y: 100, w: 100, h: 100 } },
    { op: 'add', element: { id: 'q', type: 'shape', shape: 'rect', x: 400, y: 100, w: 100, h: 100 } },
    { op: 'connect', id: 's', from: 'p', to: 'q', gap: 0 },
    { op: 'connect', id: 'c', from: 'p', to: 'q', routing: 'curved' },
    { op: 'connect', id: 'e', from: { id: 'p', anchor: 'bottom' }, to: { id: 'q', anchor: 'bottom' }, routing: 'elbow' },
  ]));
  const g = arrowGeometry(findElement(doc, 's'), doc);
  assert.deepEqual([Math.round(g.start.x), Math.round(g.end.x)], [200, 400]);
  const e = arrowGeometry(findElement(doc, 'e'), doc);
  assert.ok(e.points.length === 4 && e.points[1].y > 200, 'elbow routes below');
  assert.ok(!renderSVG(doc).includes('NaN'));
});

test('validation catches unknown icons and dangling arrows', () => {
  const doc = normalizeFigure({ elements: [{ id: 'a', icon: 'nope' }, { id: 'b', type: 'arrow', from: 'a', to: 'zzz' }] });
  const msgs = validateFigure(doc).map((i) => i.message).join('\n');
  assert.match(msgs, /Unknown icon "nope"/);
  assert.match(msgs, /missing element "zzz"/);
});

test('search finds immunology terms and synonyms', () => {
  assert.equal(searchIcons('pd-l1')[0].id, 'pd-l1');
  assert.equal(searchIcons('ctl')[0].id, 't-cell-cd8');
  assert.equal(searchIcons('ebv')[0].id, 'herpesvirus');
  assert.ok(searchIcons('facs').some((i) => i.id === 'flow-cytometer'));
});

test('imported SVGs are sanitized, namespaced and embeddable', () => {
  const dirty = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="x" viewBox="0 0 10 20" onload="alert(1)"><script>alert(1)</script><sodipodi:namedview id="n"/><defs><linearGradient id="g"/></defs><rect inkscape:label="r" fill="url(#g)" width="10" height="20" onclick="x()"/><image href="https://evil.example/x.png"/></svg>';
  const clean = sanitizeSvg(dirty);
  assert.ok(!/script|onload|onclick|sodipodi|inkscape|evil\.example/.test(clean), clean);
  const { w, h, svg } = unwrapSvg(dirty);
  assert.deepEqual([w, h], [10, 20]);
  const pre = prefixIds(svg, 'u1');
  assert.match(pre, /id="u1-g"/);
  assert.match(pre, /url\(#u1-g\)/);
  registerPack({ format: 'fortheplot-icon-pack', name: 'Test', prefix: 'test', license: 'CC0-1.0', author: 'Tester', icons: [{ id: 'bar', name: 'Bar', category: 'Test', w, h, svg }] });
  let doc = ok(applyOps(createFigure(), [{ op: 'add', element: { icon: 'test/bar', x: 0, y: 0, w: 50 } }]));
  embedUsedIcons(doc);
  assert.equal(doc.iconDefs.length, 1);
  assert.match(renderSVG(doc), /Icons by Tester \(CC0-1.0\)/);
  const round = JSON.parse(JSON.stringify(doc));
  registerEmbeddedIcons(round);
  assert.equal(validateFigure(normalizeFigure(round)).filter((i) => i.level === 'error').length, 0);
});

test('describe lists every element', () => {
  const doc = ok(applyOps(createFigure({ title: 'D' }), [{ op: 'add', element: { id: 'k', icon: 'b-cell', label: 'B cell' } }]));
  assert.match(describeFigure(doc), /- k: icon b-cell \(B cell\) .* label "B cell"/);
});

test('examples conform to the JSON schema', async (t) => {
  let Ajv;
  try { Ajv = (await import('ajv/dist/2020.js')).default; } catch { t.skip('ajv not installed'); return; }
  const fs = await import('node:fs');
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile(JSON.parse(fs.readFileSync('schema/figure.schema.json', 'utf8')));
  for (const f of fs.readdirSync('examples').filter((x) => x.endsWith('.json'))) {
    assert.ok(validate(JSON.parse(fs.readFileSync(`examples/${f}`, 'utf8'))), `${f}: ${JSON.stringify(validate.errors?.slice(0, 2))}`);
  }
});
