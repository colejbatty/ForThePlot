// Linked Prism graphs, with a stand-in for prism.exe that runs ForThePlot's export scripts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { createFigure, applyOps, renderSVG, findElement, getImage, normalizeFigure, embedUsedImages, clone, describeFigure } from '../src/core/index.js';

const FAKE = path.resolve('scripts/fixtures/fake-prism.mjs');
const OPEN = path.resolve('scripts/fixtures/fake-open.mjs');
const ok = (r) => { assert.equal(r.error, null, r.error); return r.doc; };

async function writePrism(file, values, graphs = 2) {
  const zip = new JSZip();
  zip.file('document.json', '{}');
  zip.file('data/table.csv', values.join('\n'));
  for (let i = 0; i < graphs; i++) zip.folder(`graphs/g${i}`).file('graph.bin', 'x');
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
}

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortheplot-link-'));
  process.env.FORTHEPLOT_PRISM = FAKE;
  process.env.FORTHEPLOT_OPEN_CMD = OPEN;
  process.env.FORTHEPLOT_OPEN_LOG = path.join(dir, 'opened.log');
  process.env.FORTHEPLOT_PRISM_TIMEOUT = '8000';
  return dir;
}

test('a graph linked to a Prism file is exported as vector and updates when the file changes', { timeout: 60000 }, async () => {
  const dir = setup();
  const { linkedElement, refreshLinks, openLink, linkSummary } = await import('../src/node/links.js');
  const fig = path.join(dir, 'fig.json');
  const prism = path.join(dir, 'cytokines.prism');
  await writePrism(prism, [50, 120, 80]);
  const { el, img } = await linkedElement({ file: prism, graph: 2 }, fig);
  assert.match(img.src, /^data:image\/svg\+xml/);
  assert.deepEqual(el.link.prism, 'cytokines.prism', 'stored relative to the figure');
  assert.equal(el.link.graph, 2);
  let doc = ok(applyOps(createFigure(), [{ op: 'add', element: { ...el, id: 'g', x: 100, y: 100, w: 300 } }]));
  near(findElement(doc, 'g').h, 225, 0.5, 'aspect from the SVG');
  // exports draw the picture inline, as vector
  const svg = renderSVG(doc);
  assert.match(svg, /Graph 2 of 2/);
  assert.match(svg, /class="pic-[^"]+-t"/, 'CSS classes scoped to the picture');
  assert.match(describeFigure(doc), /LINKED to cytokines\.prism graph 2/);
  // unchanged source: nothing to do
  assert.equal((await refreshLinks(doc, fig)).length, 0);
  // edit the data in "Prism" and save
  await new Promise((r) => setTimeout(r, 20));
  await writePrism(prism, [50, 120, 180]);
  fs.utimesSync(prism, new Date(), new Date(Date.now() + 2000));
  const res = await refreshLinks(doc, fig);
  assert.deepEqual(res, [{ id: 'g', ok: true }]);
  assert.match(getImage(findElement(doc, 'g').image).src, /^data:image\/svg/);
  assert.match(Buffer.from(getImage(findElement(doc, 'g').image).src.split(',')[1], 'base64').toString(), /height="180"/);
  // the picture travels with the figure file
  const saved = JSON.parse(JSON.stringify(embedUsedImages(clone(doc))));
  assert.equal(Object.keys(saved.images).length, 1);
  assert.equal(normalizeFigure(saved).elements[0].link.graph, 2);
  // double-click → opens the Prism file in its program
  openLink(doc, 'g', fig);
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(fs.readFileSync(process.env.FORTHEPLOT_OPEN_LOG, 'utf8').trim(), prism);
  assert.match(linkSummary(findElement(doc, 'g').link), /cytokines\.prism graph 2/);
  // a graph number that doesn't exist is caught before running Prism
  await assert.rejects(linkedElement({ file: prism, graph: 5 }, fig), /has 2 graphs/);
});

test('without Prism, a link to an exported picture updates when it is exported again', { timeout: 30000 }, async () => {
  const dir = setup();
  process.env.FORTHEPLOT_PRISM = path.join(dir, 'no-such-prism.exe');
  const { linkedElement, refreshLinks } = await import('../src/node/links.js');
  const fig = path.join(dir, 'fig.json');
  const prism = path.join(dir, 'data.pzfx');
  fs.writeFileSync(prism, '<GraphPadPrismFile/>');
  await assert.rejects(linkedElement({ file: prism, graph: 1 }, fig), /export the graph from Prism|Export it from Prism/i);
  const pic = path.join(dir, 'graph1.svg');
  fs.writeFileSync(pic, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="50" height="80" fill="red"/></svg>');
  const { el } = await linkedElement({ file: prism, graph: 1, picture: pic }, fig);
  assert.equal(el.link.picture, 'graph1.svg');
  let doc = ok(applyOps(createFigure(), [{ op: 'add', element: { ...el, id: 'p', x: 10, y: 10, w: 400 } }]));
  near(findElement(doc, 'p').h, 200, 0.01, 'aspect');
  fs.writeFileSync(pic, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="50" height="180" fill="blue"/></svg>');
  fs.utimesSync(pic, new Date(), new Date(Date.now() + 2000));
  const res = await refreshLinks(doc, fig);
  assert.equal(res[0].ok, true);
  near(findElement(doc, 'p').h, 400, 0.01, 'keeps width, follows the new aspect');
  assert.match(renderSVG(doc), /fill="blue"/);
});

test('the live editor server links, refreshes on save, opens Prism, and refuses other sites', { timeout: 60000 }, async () => {
  const dir = setup();
  const { serve } = await import('../src/server/serve.js');
  const fig = path.join(dir, 'live.json');
  const prism = path.join(dir, 'assay.prism');
  await writePrism(prism, [30, 60]);
  const s = await serve({ file: fig, port: 0, quiet: true });
  try {
    const post = (p, body, headers = {}) => fetch(s.url + p.slice(1), { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    const caps = await (await fetch(s.url + 'api/capabilities')).json();
    assert.equal(caps.prism, true);
    const r = await post('/api/link', { file: prism, graph: 1, cx: 400, cy: 300, w: 360 });
    assert.equal(r.status, 200, await r.clone().text());
    const { id } = await r.json();
    let saved = JSON.parse(fs.readFileSync(fig, 'utf8'));
    assert.ok(saved.elements.find((e) => e.id === id).link);
    const firstImage = saved.elements.find((e) => e.id === id).image;
    // "save in Prism": the server notices and re-exports
    await new Promise((res) => setTimeout(res, 300));
    await writePrism(prism, [30, 160]);
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      await new Promise((res) => setTimeout(res, 300));
      saved = JSON.parse(fs.readFileSync(fig, 'utf8'));
      if (saved.elements.find((e) => e.id === id).image !== firstImage) break;
    }
    assert.notEqual(saved.elements.find((e) => e.id === id).image, firstImage, 'picture refreshed after the Prism file changed');
    assert.equal((await post('/api/open-link', { id })).status, 200);
    assert.equal((await post('/api/open-link', { id }, { origin: 'https://evil.example' })).status, 403);
    assert.equal((await fetch(s.url + 'api/open-link', { method: 'POST', body: JSON.stringify({ id }) })).status, 403, 'needs JSON (CORS preflight)');
  } finally {
    await s.close();
  }
});

async function writeNamedPrism(file, order, titles, values = [40, 80]) {
  const zip = new JSZip();
  zip.file('document.json', JSON.stringify({ sheets: { graphs: order, data: [] } }));
  zip.file('data/table.csv', values.join('\n'));
  for (const uid of Object.keys(titles)) zip.file(`graphs/${uid}/sheet.json`, JSON.stringify({ uid, title: titles[uid] }));
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
}

test('graphs can be picked by name, and links follow a graph that moved in Prism', { timeout: 60000 }, async () => {
  const dir = setup();
  const { linkedElement, refreshLinks, linkSummary } = await import('../src/node/links.js');
  const { prismContents } = await import('../src/node/prism.js');
  const fig = path.join(dir, 'fig.json');
  const file = path.join(dir, 'hai.prism');
  const titles = { a1: 'H1 Redone', b2: 'H3 Redone', c3: 'Data 22', d4: 'Data 22' };
  await writeNamedPrism(file, ['a1', 'b2', 'c3', 'd4'], titles);
  const c = await prismContents(file);
  assert.deepEqual(c.graphs.map((g) => `${g.n}:${g.title}`), ['1:H1 Redone', '2:H3 Redone', '3:Data 22', '4:Data 22']);
  const { el } = await linkedElement({ file, graph: 'h3 redone' }, fig);
  assert.deepEqual([el.link.graph, el.link.uid, el.link.title], [2, 'b2', 'H3 Redone']);
  assert.match(linkSummary(el.link), /graph 2 "H3 Redone"/);
  await assert.rejects(linkedElement({ file, graph: 'Data 22' }, fig), /2 graphs are named "Data 22"/);
  await assert.rejects(linkedElement({ file, graph: 'Redone' }, fig), /Several graphs match/);
  await assert.rejects(linkedElement({ file, graph: 'nope' }, fig), /No graph named "nope".*1\. H1 Redone/);
  const doc = ok(applyOps(createFigure(), [{ op: 'add', element: { ...el, id: 'h3', x: 0, y: 0, w: 300 } }]));
  // in Prism, the person drags "H3 Redone" to the end of the list and saves
  await writeNamedPrism(file, ['a1', 'c3', 'd4', 'b2'], titles, [40, 150]);
  fs.utimesSync(file, new Date(), new Date(Date.now() + 2000));
  const res = await refreshLinks(doc, fig);
  assert.equal(res[0].ok, true, res[0].error);
  assert.equal(findElement(doc, 'h3').link.graph, 4, 'link followed the graph');
  assert.match(renderSVG(doc), /Graph 4 of 4: H3 Redone/);
});

function near(a, b, tol, msg) {
  assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
}
