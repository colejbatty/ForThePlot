// End-to-end: spawn the MCP server over stdio and drive it like an agent would.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('MCP server: create, edit, render, open editor', { timeout: 60000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fortheplot-mcp-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('src/cli/fortheplot.js'), 'mcp'],
    env: { ...process.env, FORTHEPLOT_DIR: dir, FORTHEPLOT_PRISM: path.resolve('scripts/fixtures/fake-prism.mjs'), FORTHEPLOT_OPEN_CMD: path.resolve('scripts/fixtures/fake-open.mjs'), FORTHEPLOT_OPEN_LOG: path.join(dir, 'opened.log'), FORTHEPLOT_PRISM_TIMEOUT: '8000' },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const n of ['search_icons', 'new_figure', 'edit_figure', 'render_figure', 'open_editor', 'add_icon', 'connect', 'describe_figure', 'export_figure', 'open_figure', 'add_image', 'add_block', 'get_selection', 'add_prism_graph', 'refresh_links', 'open_in_prism']) assert.ok(names.includes(n), n);
    // Claude's API rejects tuple-style schemas (array-valued "items"); keep every tool loadable.
    const walk = (node, where) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node.items)) assert.fail(`${where}: "items" must be a schema, not an array`);
      for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`);
    };
    for (const t of tools) walk(t.inputSchema, t.name);

    const s = await client.callTool({ name: 'search_icons', arguments: { query: 'cd8 t cell', limit: 5 } });
    assert.match(s.content[0].text, /t-cell-cd8/);

    const nf = await client.callTool({ name: 'new_figure', arguments: { path: 'fig.json', title: 'Agent figure', width: 1000, height: 600 } });
    assert.ok(!nf.isError, nf.content[0].text);

    const c = await client.callTool({ name: 'connect', arguments: { from: [10, 10], to: [200, 10], head: 'inhibit' } });
    assert.ok(!c.isError, c.content[0].text);

    const e = await client.callTool({
      name: 'edit_figure',
      arguments: {
        ops: [
          { op: 'add', element: { id: 'tcell', icon: 't-cell-cd8', cx: 300, cy: 300, w: 200, label: 'CD8^+ T cell' } },
          { op: 'add', element: { id: 'tumor', icon: 'tumor-cell', w: 200, near: { id: 'tcell', side: 'right', gap: 160 }, label: 'Tumor' } },
          { op: 'add', element: { id: 'pd1', icon: 'pd-1', w: 40 } },
          { op: 'attach', id: 'pd1', to: 'tcell', toward: 'tumor' },
          { op: 'connect', from: 'tcell', to: 'tumor', head: 'arrow', label: 'kills', routing: 'curved', curvature: -0.3 },
        ],
      },
    });
    assert.ok(!e.isError, e.content[0].text);
    assert.match(e.content[0].text, /New ids: tcell, tumor, pd1/);

    const bad = await client.callTool({ name: 'edit_figure', arguments: { ops: [{ op: 'add', element: { icon: 'no-such-icon' } }] } });
    assert.ok(bad.isError);
    assert.match(bad.content[0].text, /Nothing changed/);

    const r = await client.callTool({ name: 'render_figure', arguments: { max_width: 600 } });
    assert.equal(r.content[0].type, 'image');
    assert.ok(Buffer.from(r.content[0].data, 'base64').subarray(1, 4).toString() === 'PNG');

    const x = await client.callTool({ name: 'export_figure', arguments: { to: 'out/fig.svg' } });
    assert.ok(!x.isError);
    assert.ok(fs.readFileSync(path.join(dir, 'out/fig.svg'), 'utf8').startsWith('<svg'));

    const o = await client.callTool({ name: 'open_editor', arguments: { port: 5321 } });
    const url = o.content[0].text.match(/http:\/\/\S+\//)[0];
    const html = await (await fetch(url)).text();
    assert.match(html, /FORTHEPLOT_SERVER/);
    const fig = await (await fetch(url + 'api/figure')).json();
    assert.equal(fig.elements.length, 5);

    const d = await client.callTool({ name: 'describe_figure', arguments: {} });
    assert.match(d.content[0].text, /pd1: icon pd-1 .* attached to tcell/);

    // building block on a figure that already has content: placed below it, nothing covered
    const b = await client.callTool({ name: 'add_block', arguments: { kind: 'synapse', spec: { left: 't-cell-cd4', right: 'b-cell', pairs: [['tcr', 'mhc-ii'], ['cd40l', 'cd40']] } } });
    assert.ok(!b.isError, b.content[0].text);
    assert.match(b.content[0].text, /placed below the existing content/);
    const after = JSON.parse(fs.readFileSync(path.join(dir, 'fig.json'), 'utf8'));
    const cd4 = after.elements.find((el) => el.icon === 't-cell-cd4' && !el.attachedTo);
    assert.ok(cd4.y > 400, 'block placed below the existing cells');

    // point-and-ask: the editor's selection and open notes reach the agent
    let g = await client.callTool({ name: 'get_selection', arguments: {} });
    assert.match(g.content[0].text, /Nothing is selected/);
    await fetch(url + 'api/selection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: ['tumor'] }) });
    await client.callTool({ name: 'edit_figure', arguments: { ops: [{ op: 'add', element: { type: 'note', text: 'Shrink the tumor', target: 'tumor', x: 700, y: 100 } }] } });
    g = await client.callTool({ name: 'get_selection', arguments: {} });
    assert.match(g.content[0].text, /Selected \(1\)[\s\S]*tumor/);
    assert.match(g.content[0].text, /Shrink the tumor/);
    const d2 = await client.callTool({ name: 'describe_figure', arguments: {} });
    assert.match(d2.content[0].text, /Selected in the editor right now: tumor/);

    // pictures, drawn membranes and lettered panels
    const { encodePng } = await import('../src/node/images.js');
    const px = new Uint8Array(40 * 30 * 4).fill(200);
    fs.writeFileSync(path.join(dir, 'blot.png'), encodePng(px, 40, 30));
    const im = await client.callTool({ name: 'add_image', arguments: { file: 'blot.png', id: 'blot', x: 700, y: 400, w: 200, scale_bar: { length: 5, per_px: 0.5 } } });
    assert.ok(!im.isError, im.content[0].text);
    assert.match(im.content[0].text, /Added image blot \("blot.png", 40×30 px\)/);
    const pe = await client.callTool({ name: 'edit_figure', arguments: { ops: [
      { op: 'add', element: { id: 'mem', type: 'path', membrane: true, smooth: true, points: [[100, 700], [300, 640], [500, 700]] } },
      { op: 'add', element: { id: 'rec', icon: 'tlr', w: 30 } },
      { op: 'attach', id: 'rec', to: 'mem', at: 0.5 },
      { op: 'add', element: { id: 'gel', type: 'image', file: 'blot.png', x: 950, y: 400, w: 100 } },
      { op: 'panels', rows: 1, cols: 2, titles: ['Cells', 'Data'] },
    ] } });
    assert.ok(!pe.isError, pe.content[0].text);
    const saved = JSON.parse(fs.readFileSync(path.join(dir, 'fig.json'), 'utf8'));
    assert.equal(Object.keys(saved.images).length, 1, 'one picture stored once');
    const d3 = await client.callTool({ name: 'describe_figure', arguments: {} });
    assert.match(d3.content[0].text, /panel A "Cells"/);
    assert.match(d3.content[0].text, /membrane path/);
    const rr = await client.callTool({ name: 'render_figure', arguments: { max_width: 500 } });
    assert.equal(rr.content[0].type, 'image');

    // linked Prism graph
    const { default: JSZip } = await import('jszip');
    const zp = new JSZip(); zp.file('document.json', '{}'); zp.file('data/table.csv', '10\n20'); zp.folder('graphs/a').file('x', '1');
    fs.writeFileSync(path.join(dir, 'elisa.prism'), await zp.generateAsync({ type: 'nodebuffer' }));
    const pg = await client.callTool({ name: 'add_prism_graph', arguments: { file: 'elisa.prism', graph: 1, cx: 300, cy: 300, w: 240 } });
    assert.ok(!pg.isError, pg.content[0].text);
    assert.match(pg.content[0].text, /Added elisa-graph-1: elisa\.prism graph 1 .*vector/);
    const rl = await client.callTool({ name: 'refresh_links', arguments: {} });
    assert.match(rl.content[0].text, /up to date/);
    const op = await client.callTool({ name: 'open_in_prism', arguments: { id: 'elisa-graph-1' } });
    assert.ok(!op.isError, op.content[0].text);
    const d4 = await client.callTool({ name: 'describe_figure', arguments: {} });
    assert.match(d4.content[0].text, /elisa-graph-1: image .* LINKED to elisa\.prism graph 1/);

    // journal export
    const j = await client.callTool({ name: 'export_figure', arguments: { to: 'out/fig.pdf', journal: 'nature-1col' } });
    assert.ok(!j.isError, j.content[0].text);
    assert.match(j.content[0].text, /89 ×/);
    assert.equal(fs.readFileSync(path.join(dir, 'out/fig.pdf')).subarray(0, 4).toString(), '%PDF');
  } finally {
    await client.close();
  }
});
