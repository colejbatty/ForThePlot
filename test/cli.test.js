import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cli = (...args) => execFileSync(process.execPath, [path.resolve('src/cli/fortheplot.js'), ...args], { encoding: 'utf8' });

test('CLI: new → apply → render → check', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortheplot-cli-'));
  const fig = path.join(dir, 'f.json');
  cli('new', fig, '--width', '800', '--height', '400');
  const ops = path.join(dir, 'ops.json');
  fs.writeFileSync(ops, JSON.stringify([
    { op: 'add', element: { id: 'dc', icon: 'dendritic-cell', cx: 200, cy: 200, w: 160 } },
    { op: 'add', element: { id: 't', icon: 't-cell-cd4', w: 140, near: { id: 'dc', side: 'right', gap: 120 } } },
    { op: 'connect', from: 'dc', to: 't', label: 'antigen' },
  ]));
  assert.match(cli('apply', fig, ops), /new ids: dc, t, arrow/);
  assert.match(cli('describe', fig), /dc: icon dendritic-cell/);
  cli('render', fig, '-o', path.join(dir, 'f.svg'));
  cli('render', fig, '-o', path.join(dir, 'f.png'), '--scale', '1');
  assert.ok(fs.statSync(path.join(dir, 'f.png')).size > 1000);
  assert.match(cli('check', fig), /No problems|warn/);
  assert.match(cli('icons', 'macrophage', '--limit', '3'), /macrophage/);
});

test('every example renders without validation errors', () => {
  for (const f of fs.readdirSync('examples').filter((x) => x.endsWith('.json'))) {
    const out = cli('validate', path.join('examples', f));
    assert.doesNotMatch(out, /ERROR/, f);
  }
});
