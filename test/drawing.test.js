// Paths and drawn membranes, receptors that follow their host, images, and lettered panels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  createFigure, applyOps, renderSVG, describeFigure, findElement, normalizeFigure, validateFigure, clone,
  samplePath, refitPath, insertPointAt, bakeHandles, nearestOnPath, attachAnchor,
  registerImage, getImage, imageSize, embedUsedImages, panelLetters, layoutPanels, scaleBarBox,
} from '../src/core/index.js';
import { textItems } from '../src/core/journal.js';
import { surfacePoint } from '../src/core/geometry.js';
import { encodeTiff } from '../src/core/raster.js';
import { loadImageFile, resolveImageFiles, encodePng } from '../src/node/images.js';
import { exportFigure } from '../src/node/export.js';

const ok = (r) => { assert.equal(r.error, null, r.error); return r.doc; };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

/** Max distance from each sample of path a to path b. */
function hausdorff(a, b) {
  const c = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, r = ((a.rotation || 0) * Math.PI) / 180;
  const toCanvas = (p) => ({ x: c.x + (p.x - c.x) * Math.cos(r) - (p.y - c.y) * Math.sin(r), y: c.y + (p.x - c.x) * Math.sin(r) + (p.y - c.y) * Math.cos(r) });
  const sb = samplePath(b, 2);
  let worst = 0;
  for (const p of samplePath(a, 2)) worst = Math.max(worst, nearestOnPath(b, toCanvas(p), sb).d);
  return worst;
}

function pngDataUrl(w, h, rgb = [200, 40, 40]) {
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = rgb[0]; rgba[i * 4 + 1] = (i * 7) % 255; rgba[i * 4 + 2] = rgb[2]; rgba[i * 4 + 3] = 255; }
  return 'data:image/png;base64,' + encodePng(rgba, w, h).toString('base64');
}

// ---- paths ------------------------------------------------------------------------------------

test('paths: canvas or relative points, stored relative to their box, scale with resize', () => {
  let doc = ok(applyOps(createFigure(), [
    { op: 'add', element: { id: 'p', type: 'path', points: [[100, 200], [300, 100], [400, 300]] } },
    { op: 'add', element: { id: 'q', type: 'path', x: 500, y: 500, points: [[0, 0], [100, 50]] } },
  ]));
  const p = findElement(doc, 'p');
  assert.deepEqual([p.x, p.y, p.w, p.h], [100, 100, 300, 200]);
  assert.deepEqual(p.points[0], { x: 0, y: 100 });
  const q = findElement(doc, 'q');
  assert.deepEqual([q.x, q.y, q.w, q.h], [500, 500, 100, 50]);
  assert.match(renderSVG(doc), /M100 200 L300 100 L400 300/);
  doc = ok(applyOps(doc, [{ op: 'resize', id: 'p', w: 600, h: 400, keepCenter: false }]));
  assert.match(renderSVG(doc), /M100 300 L500 100 L700 500/);
  // update with new points takes canvas coordinates again
  doc = ok(applyOps(doc, [{ op: 'update', id: 'q', set: { points: [[10, 10], [60, 20]] } }]));
  assert.deepEqual([findElement(doc, 'q').x, findElement(doc, 'q').w], [10, 50]);
  // cx/cy center a path
  doc = ok(applyOps(doc, [{ op: 'add', element: { id: 'c', type: 'path', points: [[0, 0], [100, 40]], cx: 600, cy: 300 } }]));
  const c = findElement(doc, 'c');
  near(c.x + c.w / 2, 600, 0.01, 'cx'); near(c.y + c.h / 2, 300, 0.01, 'cy');
});

test('paths: smooth curves, heads, membranes and closed fills render', () => {
  const doc = ok(applyOps(createFigure(), [
    { op: 'add', element: { id: 's', type: 'path', smooth: true, head: 'arrow', points: [[100, 100], [200, 50], [300, 120], [400, 60]] } },
    { op: 'add', element: { id: 'm', type: 'path', membrane: true, closed: true, smooth: true, inner: '#eef6fd', points: [[500, 300], [650, 200], [800, 320], [650, 450]] } },
    { op: 'add', element: { id: 'f', type: 'path', closed: true, fill: '#ffe3ec', points: [[100, 500], [200, 450], [250, 560]] } },
  ]));
  const svg = renderSVG(doc);
  const sOnly = svg.slice(svg.indexOf('data-id="s"'), svg.indexOf('data-id="m"'));
  assert.match(sOnly, /<path d="M[^"]+" fill="#52606d"/, 'arrow head drawn');
  const mOnly = svg.slice(svg.indexOf('data-id="m"'), svg.indexOf('data-id="f"'));
  assert.ok((mOnly.match(/<circle/g) || []).length > 80, 'lipid heads along the closed membrane');
  assert.match(mOnly, /fill="#eef6fd"/);
  assert.match(svg, /fill="#ffe3ec"[^>]*stroke="#52606d"/);
  assert.equal(findElement(doc, 'm').fill, '#f6c37b', 'membrane colors by default');
});

test('paths: refit, point insertion and baking handles keep the shape', () => {
  let doc = ok(applyOps(createFigure(), [{ op: 'add', element: { id: 'p', type: 'path', smooth: true, rotation: 30, points: [[100, 300], [250, 120], [420, 260], [560, 140]] } }]));
  const p = findElement(doc, 'p');
  const before = clone(p);
  // move a point outside the box, then refit: nothing moves on screen
  p.points[0] = { x: p.points[0].x - 80, y: p.points[0].y + 60 };
  const moved = clone(p);
  refitPath(p);
  assert.ok(hausdorff(moved, p) < 0.6, 'refit keeps every point in place (with rotation)');
  assert.ok(p.vw === p.w && p.vh === p.h);
  const baked = bakeHandles(clone(before));
  assert.equal(baked.smooth, false);
  assert.ok(baked.points.slice(1, -1).every((q) => q.in && q.out));
  assert.ok(hausdorff(before, baked) < 0.6, 'baked handles draw the same curve');
  const ins = clone(baked);
  insertPointAt(ins, samplePath(ins)[40]);
  assert.equal(ins.points.length, baked.points.length + 1);
  assert.ok(hausdorff(baked, ins) < 0.8, 'splitting a curve keeps its shape');
});

// ---- attached elements follow their host --------------------------------------------------------

test('receptors stay on the membrane when the cell is resized or rotated', () => {
  let doc = ok(applyOps(createFigure(), [
    { op: 'add', element: { id: 'cell', icon: 't-cell-cd8', x: 300, y: 200, w: 200 } },
    { op: 'add', element: { id: 'r1', icon: 'tcr', w: 40 } },
    { op: 'add', element: { id: 'r2', icon: 'pd-1', w: 30 } },
    { op: 'attach', id: 'r1', to: 'cell', angle: 0 },
    { op: 'attach', id: 'r2', to: 'cell', angle: 225 },
  ]));
  const onSurface = (d, id, angle) => {
    const A = attachAnchor(findElement(d, id)), S = surfacePoint(findElement(d, 'cell'), angle, d, 0);
    return Math.hypot(A.x - S.x, A.y - S.y);
  };
  assert.ok(onSurface(doc, 'r1', 0) < 0.5 && onSurface(doc, 'r2', 225) < 0.5);
  doc = ok(applyOps(doc, [{ op: 'resize', id: 'cell', w: 320, h: 220 }]));
  assert.ok(onSurface(doc, 'r1', 0) < 0.5, 'after a non-uniform resize');
  doc = ok(applyOps(doc, [{ op: 'update', id: 'cell', set: { rotation: 40 } }]));
  assert.ok(onSurface(doc, 'r1', 40) < 0.5, 'rotated with the cell');
  near(findElement(doc, 'r1').rotation, 130, 0.01, 'receptor turned with the cell');
  doc = ok(applyOps(doc, [{ op: 'update', id: 'cell', set: { x: 100 } }]));
  assert.ok(onSurface(doc, 'r1', 40) < 0.5, 'moved by update');
});

test('receptors attach along a drawn membrane and follow when it is reshaped', () => {
  let doc = ok(applyOps(createFigure(), [
    { op: 'add', element: { id: 'pm', type: 'path', membrane: true, smooth: true, points: [[100, 400], [400, 250], [700, 300], [900, 450]] } },
    { op: 'add', element: { id: 'a', icon: 'cytokine-receptor', w: 40 } },
    { op: 'add', element: { id: 'b', icon: 'tlr', w: 40 } },
    { op: 'attach', ids: ['a', 'b'], to: 'pm', gap: 200 },
    { op: 'add', element: { id: 'cell', type: 'path', membrane: true, closed: true, smooth: true, points: [[300, 600], [500, 520], [650, 650], [480, 760]] } },
    { op: 'add', element: { id: 't', icon: 'tumor-cell', x: 950, y: 600, w: 100 } },
    { op: 'add', element: { id: 'c', icon: 'tcr', w: 36 } },
    { op: 'attach', id: 'c', to: 'cell', toward: 't' },
  ]));
  const offCurve = (d, id, host) => {
    const h = findElement(d, host);
    return nearestOnPath(h, attachAnchor(findElement(d, id))).d - (h.thickness || 26) / 2;
  };
  for (const id of ['a', 'b']) assert.ok(Math.abs(offCurve(doc, id, 'pm')) < 1, `${id} seated on the outer leaflet`);
  assert.ok(findElement(doc, 'c').x > 550, 'faces the tumor cell');
  assert.ok(Math.abs(offCurve(doc, 'c', 'cell')) < 1);
  doc = ok(applyOps(doc, [{ op: 'resize', id: 'pm', w: 500, keepCenter: true }, { op: 'update', id: 'cell', set: { rotation: 25 } }]));
  for (const id of ['a', 'b']) assert.ok(Math.abs(offCurve(doc, id, 'pm')) < 1.5, `${id} follows the resized membrane`);
  assert.ok(Math.abs(offCurve(doc, 'c', 'cell')) < 1.5, 'follows the rotated cell outline');
  // arrows end at the outer leaflet
  doc = ok(applyOps(doc, [{ op: 'connect', id: 'ar', from: 't', to: 'cell' }]));
  assert.ok(renderSVG(doc).includes('data-id="ar"'));
});

// ---- images ---------------------------------------------------------------------------------------

test('images: registry, sizes, crop, scale bar, and round trip through a figure file', () => {
  const src = pngDataUrl(80, 60);
  assert.deepEqual(imageSize(src), { w: 80, h: 60 });
  const id = registerImage({ src, name: 'cells.png' });
  assert.equal(registerImage({ src }), id, 'content-addressed');
  let doc = ok(applyOps(createFigure(), [
    { op: 'add', element: { id: 'img', type: 'image', src, x: 10, y: 10, w: 400, crop: { x: 0.25, y: 0, w: 0.5, h: 1 }, scaleBar: { length: 10, perPx: 0.5 }, label: 'Day 7' } },
  ]));
  const el = findElement(doc, 'img');
  assert.equal(el.image, id);
  assert.equal(el.src, undefined, 'picture data is not stored on the element');
  near(el.h, 400 * (60 / 40), 0.01, 'height follows the cropped aspect');
  const svg = renderSVG(doc);
  assert.match(svg, /viewBox="20 0 40 60"/);
  assert.match(svg, /10 µm/);
  const sb = scaleBarBox(el);
  near(sb.w, (10 / 0.5) * (400 / 40), 0.01, 'bar length in canvas px');
  assert.match(describeFigure(doc), /image "cells.png" \(80×60 px, cropped\)/);
  const saved = embedUsedImages(clone(doc));
  assert.equal(saved.images[id].src, src);
  const reopened = normalizeFigure(JSON.parse(JSON.stringify(saved)));
  assert.equal(reopened.images, undefined, 'pictures live in the registry while editing');
  assert.equal(validateFigure(reopened).filter((i) => i.level === 'error').length, 0);
  const broken = normalizeFigure({ elements: [{ type: 'image', image: 'img-missing', x: 0, y: 0, w: 10, h: 10 }] });
  assert.match(validateFigure(broken).map((i) => i.message).join(), /no picture data/);
  assert.ok(textItems(doc).some((t) => /10 µm/.test(t.text)), 'scale bar label counts for the journal text check');
});

test('image files: TIFF is decoded, ops can name files, and exports carry the picture', { timeout: 60000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortheplot-img-'));
  const w = 64, h = 48, rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = 30; rgba[i * 4 + 1] = (i % w) * 4; rgba[i * 4 + 2] = 90; rgba[i * 4 + 3] = 255; }
  fs.writeFileSync(path.join(dir, 'cells.tif'), encodeTiff(rgba, w, h, 300));
  const img = await loadImageFile(path.join(dir, 'cells.tif'));
  assert.deepEqual([img.w, img.h], [w, h]);
  assert.match(img.src, /^data:image\/png;base64,/);
  const png = Buffer.from(img.src.split(',')[1], 'base64');
  const idat = png.subarray(png.indexOf('IDAT') + 4, png.indexOf('IEND') - 8);
  const raw = zlib.inflateSync(idat);
  assert.deepEqual([raw[0], raw[1], raw[2], raw[3], raw[5]], [0, 30, 0, 90, 4], 'pixels decoded');
  const ops = [{ op: 'add', element: { type: 'image', file: 'cells.tif', x: 20, y: 20, w: 320 } }];
  await resolveImageFiles(ops, (p) => path.join(dir, p));
  assert.ok(ops[0].element.src && !ops[0].element.file);
  const doc = ok(applyOps(createFigure({ width: 400, height: 300 }), ops));
  const pdf = Buffer.from((await exportFigure(doc, { format: 'pdf', widthMm: 89 })).data).toString('latin1');
  assert.match(pdf, /\/Subtype \/Image/);
  const pptx = Buffer.from((await exportFigure(doc, { format: 'pptx' })).data);
  assert.ok(pptx.includes(Buffer.from('ppt/media/')));
  const json = JSON.parse((await exportFigure(doc, { format: 'json' })).data.toString());
  assert.equal(Object.keys(json.images).length, 1);
});

// ---- panels ----------------------------------------------------------------------------------------

test('panels: grid layouts, automatic letters in reading order, and relabeling', () => {
  let doc = ok(applyOps(createFigure({ width: 1200, height: 800 }), [
    { op: 'add', element: { id: 'x', icon: 'b-cell', x: 100, y: 120, w: 100 } },
    { op: 'panels', rows: 2, cols: 2, widths: [2, 1], cells: [{ row: 0, col: 0, rowSpan: 2, title: 'Big' }, { row: 0, col: 1 }, { row: 1, col: 1 }] },
  ]));
  const panels = doc.elements.filter((e) => e.type === 'panel');
  assert.equal(panels.length, 3);
  assert.equal(doc.elements[0].type, 'panel', 'panels sit behind everything');
  const L = panelLetters(doc);
  assert.deepEqual(panels.map((p) => L.get(p.id)), ['A', 'B', 'C']);
  near(panels[0].w, (1200 - 60 - 24) * (2 / 3), 0.01, 'width ratio');
  assert.match(renderSVG(doc), />A<\/tspan>|>A</);
  // swap: move the big panel to the right → it becomes B
  doc = ok(applyOps(doc, [{ op: 'canvas', set: { panelLabels: { style: '(a)' } } }]));
  assert.deepEqual(panels.map((p) => panelLetters(doc).get(p.id)), ['(a)', '(b)', '(c)']);
  doc = ok(applyOps(doc, [{ op: 'update', id: panels[1].id, set: { letter: '' } }]));
  assert.equal(panelLetters(doc).get(panels[2].id), '(b)', 'a panel without a letter is skipped');
  assert.match(describeFigure(doc), /panel \(a\) "Big" .* contains x/);
});

test('panels: moving a panel carries its contents; wrap frames existing content', () => {
  let doc = ok(applyOps(createFigure({ width: 1200, height: 800 }), [
    { op: 'add', element: { id: 'cell', icon: 't-cell-cd8', x: 100, y: 100, w: 120 } },
    { op: 'add', element: { id: 'r', icon: 'tcr', w: 30 } },
    { op: 'attach', id: 'r', to: 'cell', angle: 0 },
    { op: 'add', element: { id: 'tx', type: 'text', text: 'Hello', x: 300, y: 150 } },
    { op: 'connect', id: 'free', from: [240, 200], to: [280, 200] },
    { op: 'add', element: { id: 'far', icon: 'b-cell', x: 900, y: 600, w: 100 } },
    { op: 'panels', wrap: [['cell', 'tx'], ['far']], titles: ['One', 'Two'] },
  ]));
  const [p1, p2] = doc.elements.filter((e) => e.type === 'panel');
  assert.ok(p1.x < 100 && p1.y < 100 && p1.x + p1.w > 340, 'wraps its content with room for the letter');
  const pos = (d, id) => [findElement(d, id).x, findElement(d, id).y];
  const before = Object.fromEntries(['cell', 'r', 'tx', 'far'].map((id) => [id, pos(doc, id)]));
  doc = ok(applyOps(doc, [{ op: 'move', id: p1.id, dx: 50, dy: 20 }]));
  for (const id of ['cell', 'r', 'tx']) assert.deepEqual(pos(doc, id), [before[id][0] + 50, before[id][1] + 20], id);
  assert.deepEqual(pos(doc, 'far'), before.far, 'other panels untouched');
  assert.deepEqual([findElement(doc, 'free').from.x, findElement(doc, 'free').to.x], [290, 330], 'free arrow inside moved');
  assert.ok(layoutPanels(doc, { rows: 1, cols: 3 }).length === 3);
  assert.ok(textItems(doc).some((t) => t.text === 'One'), 'panel titles are checked for print size');
});
