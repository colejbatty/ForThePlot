// ForThePlot was called Epitope: files, packs, settings and saved icons from then still work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { normalizeFigure, renderSVG, validateFigure, getIcon, createFigure } from '../src/core/index.js';

test('figures saved as Epitope files open as ForThePlot figures', () => {
  const old = { epitope: 1, title: 'Old', canvas: { width: 400, height: 300 }, elements: [{ id: 'c', type: 'shape', shape: 'ellipse', x: 10, y: 10, w: 100, h: 80 }] };
  const doc = normalizeFigure(old);
  assert.equal(doc.fortheplot, 1);
  assert.equal(doc.epitope, undefined, 'the old key is not carried along');
  assert.deepEqual(validateFigure(doc).filter((i) => i.level !== 'info'), []);
  assert.match(renderSVG(doc), /Made with ForThePlot/);
  assert.equal(createFigure().fortheplot, 1);
});

test('icon packs in the Epitope format still load', async () => {
  const { loadPacks } = await import('../src/node/packs.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortheplot-oldpack-'));
  fs.writeFileSync(path.join(dir, 'old.json'), JSON.stringify({ format: 'epitope-icon-pack', version: 1, name: 'Old pack', prefix: 'old', license: 'CC0-1.0', author: 'Someone', icons: [{ id: 'dot', name: 'Dot', category: 'Old', w: 10, h: 10, svg: '<circle cx="5" cy="5" r="5"/>' }] }));
  const loaded = loadPacks([dir]);
  assert.equal(loaded[0].count, 1);
  assert.ok(getIcon('old/dot'));
});

test('EPITOPE_ settings are read as FORTHEPLOT_ ones', () => {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', "await import('./src/node/root.js'); console.log(process.env.FORTHEPLOT_DIR, process.env.FORTHEPLOT_PRISM)"], {
    encoding: 'utf8', env: { ...process.env, EPITOPE_DIR: '/tmp/old-dir', EPITOPE_PRISM: 'C:/old/prism.exe', FORTHEPLOT_DIR: '', FORTHEPLOT_PRISM: '' },
  });
  // an empty new setting doesn't count as set by the person
  assert.equal(out.trim(), '/tmp/old-dir C:/old/prism.exe');
  const out2 = execFileSync(process.execPath, ['--input-type=module', '-e', "await import('./src/node/root.js'); console.log(process.env.FORTHEPLOT_DIR)"], {
    encoding: 'utf8', env: Object.fromEntries(Object.entries({ ...process.env, EPITOPE_DIR: '/tmp/old-dir' }).filter(([k]) => !k.startsWith('FORTHEPLOT_'))),
  });
  assert.equal(out2.trim(), '/tmp/old-dir');
});

test('icons saved under Documents/Epitope move to Documents/ForThePlot', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fortheplot-home-'));
  fs.mkdirSync(path.join(home, 'Documents', 'Epitope'), { recursive: true });
  fs.writeFileSync(path.join(home, 'Documents', 'Epitope', 'my-icons.json'), JSON.stringify({ format: 'epitope-icon-pack', version: 1, name: 'My icons', prefix: 'my', icons: [{ id: 'cell', name: 'Cell', category: 'My icons', w: 10, h: 10, svg: '<rect width="10" height="10"/>', own: true }] }));
  const env = Object.fromEntries(Object.entries({ ...process.env, HOME: home, USERPROFILE: home }).filter(([k]) => !/^(FORTHEPLOT|EPITOPE)_/.test(k)));
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', "const m = await import('./src/node/myicons.js'); console.log(m.myIconsFile()); console.log(m.readMyIcons().icons.map((i) => i.id).join(','))"], { encoding: 'utf8', env });
  const [file, ids] = out.trim().split('\n');
  assert.equal(file, path.join(home, 'Documents', 'ForThePlot', 'my-icons.json'));
  assert.equal(ids, 'cell');
  assert.ok(fs.existsSync(path.join(home, 'Documents', 'Epitope', 'my-icons.json')), 'the old file is left in place');
});
