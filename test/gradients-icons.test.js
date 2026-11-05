// Gradient fills, and saving objects from a figure as reusable icons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createFigure, applyOps, findElement, renderSVG, normalizeFigure, normalizeGradient, parseCssGradient, paintColor,
  iconFromElements, getIcon, figureCredits, embedUsedIcons, clone, describeFigure, registerPack, replaceWithIconOps,
} from '../src/core/index.js';

const ok = (r) => { assert.equal(r.error, null, r.error); return r.doc; };

test('CSS gradient strings and shorthand become stored gradients', () => {
  const g = normalizeGradient('linear-gradient(to right, #fff, #4a8fe7 60%, rgb(29, 78, 137))');
  assert.equal(g.type, 'linear');
  assert.equal(g.angle, 90);
  assert.deepEqual(g.stops.map((s) => [s.offset, s.color]), [[0, '#ffffff'], [0.6, '#4a8fe7'], [1, '#1d4e89']]);
  const r = normalizeGradient('radial-gradient(circle at 35% 30%, white, #4a8fe7)');
  assert.deepEqual([r.type, r.cx, r.cy], ['radial', 0.35, 0.3]);
  const s = normalizeGradient({ type: 'linear', colors: ['#000', '#888', '#fff'] });
  assert.deepEqual(s.stops.map((x) => x.offset), [0, 0.5, 1]);
  assert.equal(s.angle, 180, 'top to bottom by default');
  assert.equal(parseCssGradient('#ff0000'), null);
  assert.equal(normalizeGradient({ type: 'linear', stops: [] }), null);
});

test('shapes, paths, panels and membrane insides draw gradients; text picks a readable color', () => {
  let doc = ok(applyOps(createFigure(), [
    { op: 'add', elements: [
      { id: 'cell', type: 'shape', shape: 'ellipse', x: 50, y: 50, w: 200, h: 160, fill: 'radial-gradient(circle at 35% 30%, #ffffff, #1d4e89)', text: 'Cell' },
      { id: 'blob', type: 'path', points: [[400, 60], [500, 40], [560, 140], [440, 180]], closed: true, smooth: true, fill: { type: 'linear', angle: 135, colors: ['#c3f0ca', '#2e8b57'] } },
      { id: 'mem', type: 'shape', shape: 'membrane-ellipse', x: 50, y: 300, w: 260, h: 200, inner: 'radial-gradient(#fff7e6, #f6c37b)', fill: 'linear-gradient(#fff, #000)' },
      { id: 'dark', type: 'shape', shape: 'rect', x: 600, y: 50, w: 200, h: 80, fill: 'linear-gradient(90deg, #102a43, #243b53)', text: 'Dark' },
    ] },
    { op: 'panels', rows: 1, cols: 1, fill: 'linear-gradient(#ffffff, #eef3fb)' },
  ]));
  const svg = renderSVG(doc);
  assert.equal((svg.match(/<radialGradient/g) || []).length, 2);
  assert.equal((svg.match(/<linearGradient/g) || []).length, 3);
  for (const id of [...svg.matchAll(/fill="url\(#([^)]+)\)"/g)].map((m) => m[1])) assert.match(svg, new RegExp(`id="${id}"`), `${id} is defined`);
  assert.equal(typeof findElement(doc, 'mem').fill, 'string', 'lipid heads stay one color');
  assert.match(svg, /fill="#ffffff"[^>]*>Dark|>Dark</);
  assert.equal(paintColor(findElement(doc, 'dark').fill).length, 7);
  assert.match(describeFigure(doc), /fill radial-gradient\(circle at 35% 30%/);
  // round trip through the file format
  const again = normalizeFigure(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(findElement(again, 'cell').fill, findElement(doc, 'cell').fill);
  // switching back to a color
  doc = ok(applyOps(doc, [{ op: 'update', id: 'cell', set: { fill: '#e85d5d' } }]));
  assert.equal(findElement(doc, 'cell').fill, '#e85d5d');
});

test('gradients survive PNG, PDF and PowerPoint export', { timeout: 60000 }, async () => {
  const { exportFigure } = await import('../src/node/export.js');
  const doc = ok(applyOps(createFigure({ width: 400, height: 200 }), [
    { op: 'add', elements: [{ id: 'bar', type: 'shape', shape: 'rect', x: 0, y: 0, w: 400, h: 200, fill: 'linear-gradient(90deg, #000000, #ffffff)', stroke: 'none', text: 'Gradient' }] },
  ]));
  const png = await exportFigure(doc, { format: 'png', scale: 1 });
  assert.ok(png.data.length > 1000);
  const { Resvg } = await import('@resvg/resvg-js');
  const img = new Resvg(renderSVG(doc)).render();
  const red = (x, y) => img.pixels[(y * img.width + x) * 4];
  assert.ok(red(10, 20) < 60 && red(390, 20) > 200, `dark on the left, light on the right (${red(10, 20)}, ${red(390, 20)})`);
  const pdf = await exportFigure(doc, { format: 'pdf' });
  assert.match(Buffer.from(pdf.data).toString('latin1'), /\/ShadingType/, 'a real vector gradient in the PDF');
  const pptx = await exportFigure(doc, { format: 'pptx' });
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(pptx.data);
  const slide = await zip.file('ppt/slides/slide1.xml').async('string');
  assert.match(slide, /<p:pic>/, 'the gradient shape is a picture');
  assert.match(slide, />Gradient</, 'its text stays editable');
});

function iconFigure() {
  registerPack({ name: 'Test pack', prefix: 'tp', license: 'CC-BY-4.0', author: 'Jane Doe', icons: [{ id: 'blob', name: 'Blob', category: 'Test', w: 10, h: 10, svg: '<circle cx="5" cy="5" r="5" fill="#e85d5d"/>' }] });
  return ok(applyOps(createFigure(), [
    { op: 'add', elements: [
      { id: 'body', type: 'shape', shape: 'ellipse', x: 100, y: 100, w: 200, h: 150, fill: 'radial-gradient(circle at 35% 30%, #fff, #4a8fe7)' },
      { id: 'nuc', type: 'shape', shape: 'ellipse', x: 170, y: 150, w: 60, h: 50, fill: '#1d4e89' },
      { id: 'rec', icon: 'tp/blob', x: 0, y: 0, w: 24 },
      { id: 'far', type: 'text', text: 'not me', x: 600, y: 600 },
    ] },
    { op: 'attach', id: 'rec', to: 'body', angle: 270 },
    { op: 'connect', id: 'a', from: 'body', to: 'far' },
  ]));
}

test('objects become one icon that keeps attached items, gradients and credits', () => {
  const doc = iconFigure();
  const def = iconFromElements(doc, ['body', 'nuc'], { name: 'Activated B cell' });
  assert.equal(def.id, 'activated-b-cell');
  assert.ok(Math.abs(def.w - 202) < 2 && def.h > 150, `${def.w}×${def.h}`);
  assert.match(def.svg, /<radialGradient/);
  assert.match(def.svg, /#e85d5d/, 'the attached receptor came along');
  assert.doesNotMatch(def.svg, /not me/, 'the arrow to something outside is cut at its end, the text left out');
  assert.deepEqual(def.credits.map((c) => [c.author, c.license, c.icons]), [['Jane Doe', 'CC-BY-4.0', ['Blob']]]);
  assert.ok(def.tags.includes('activated'));
  // registered and used in another figure, it is credited, embedded and recolorable
  registerPack({ name: 'My icons', prefix: 'my', icons: [def] });
  const used = ok(applyOps(createFigure(), [{ op: 'add', element: { id: 'b', icon: 'my/activated-b-cell', x: 10, y: 10 } }, { op: 'update', id: 'b', set: { tint: '#2e8b57' } }]));
  assert.equal(findElement(used, 'b').w, def.size);
  assert.deepEqual(figureCredits(used).map((c) => c.author), ['Jane Doe']);
  const saved = embedUsedIcons(clone(used));
  assert.equal(saved.iconDefs[0].own, true);
  assert.match(renderSVG(used), /<radialGradient id="[^"]+"/);
  // replacing the selection puts the icon where the objects were
  const r = ok(applyOps(doc, replaceWithIconOps(doc, ['body', 'nuc'], 'my/activated-b-cell', def)));
  assert.ok(!findElement(r, 'body'));
  assert.ok(!findElement(r, 'rec'), 'attached items go with them');
  const ic = r.elements.find((e) => e.icon === 'my/activated-b-cell');
  assert.ok(Math.abs(ic.x - 99) < 2 && Math.abs(ic.w - def.w) < 0.01);
  assert.ok(findElement(r, 'far'));
  assert.throws(() => iconFromElements(doc, ['nope'], { name: 'x' }), /No element/);
});

test('My icons are kept in one file, and the MCP server saves and uses them', { timeout: 60000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortheplot-mine-'));
  const file = path.join(dir, 'my-icons.json');
  process.env.FORTHEPLOT_MY_ICONS = file;
  const mine = await import('../src/node/myicons.js');
  const doc = iconFigure();
  const def = iconFromElements(doc, ['nuc'], { name: 'Nucleus blob' });
  const id1 = mine.saveMyIcon(def);
  const id2 = mine.saveMyIcon(def);
  assert.deepEqual([id1, id2], ['my/nucleus-blob', 'my/nucleus-blob-2']);
  assert.equal(mine.readMyIcons().icons.length, 2);
  assert.ok(getIcon('my/nucleus-blob-2'));
  assert.ok(mine.renameMyIcon('my/nucleus-blob-2', 'Second'));
  assert.ok(mine.removeMyIcon('my/nucleus-blob'));
  assert.deepEqual(mine.readMyIcons().icons.map((i) => i.name), ['Second']);
  // through MCP
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  fs.writeFileSync(path.join(dir, 'fig.json'), JSON.stringify(embedUsedIcons(clone(doc))));
  const t = new StdioClientTransport({ command: process.execPath, args: [path.resolve('src/cli/fortheplot.js'), 'mcp'], cwd: dir, env: { ...process.env, FORTHEPLOT_MY_ICONS: file, FORTHEPLOT_DIR: dir } });
  const c = new (Client)({ name: 't', version: '1' });
  await c.connect(t);
  try {
    const say = (r) => r.content.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
    await c.callTool({ name: 'open_figure', arguments: { path: 'fig.json' } });
    const r = say(await c.callTool({ name: 'save_as_icon', arguments: { ids: ['body'], name: 'Round cell', replace_selection: true } }));
    assert.match(r, /Saved icon my\/round-cell/);
    assert.match(r, /Jane Doe/);
    const found = say(await c.callTool({ name: 'search_icons', arguments: { query: 'round cell' } }));
    assert.match(found, /my\/round-cell/);
    const saved = JSON.parse(fs.readFileSync(path.join(dir, 'fig.json'), 'utf8'));
    assert.ok(saved.elements.some((e) => e.icon === 'my/round-cell'));
    assert.ok(saved.iconDefs.some((d) => d.id === 'my/round-cell'), 'the figure carries its own copy');
    assert.ok(mine.readMyIcons().icons.some((i) => i.id === 'round-cell'));
  } finally {
    await c.close();
    delete process.env.FORTHEPLOT_MY_ICONS;
  }
});
