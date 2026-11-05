// Render every built-in icon to a contact sheet: docs/icon-sheet.png (+ .svg)
import fs from 'node:fs';
import path from 'node:path';
import { createFigure, applyOps, renderSVG, allIcons } from '../src/core/index.js';
import { svgToPng } from '../src/node/png.js';

const args = process.argv.slice(2);
const filter = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || '';
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/icon-sheet';
let icons = allIcons().filter((i) => !filter || i.category.toLowerCase().includes(filter) || i.id.includes(filter));
const cols = 10, cell = 130, labelH = 34;
const cats = [...new Set(icons.map((i) => i.category))];
let doc = createFigure({ title: 'ForThePlot icon library', width: cols * cell + 40, height: 100 });
const ops = [];
let y = 20;
for (const cat of cats) {
  ops.push({ op: 'add', element: { type: 'text', text: `**${cat}**`, x: 20, y, fontSize: 20, color: '#52606d' } });
  y += 34;
  const list = icons.filter((i) => i.category === cat);
  list.forEach((ic, k) => {
    const col = k % cols, row = Math.floor(k / cols);
    const s = 84;
    const w = ic.w >= ic.h ? s : s * (ic.w / ic.h);
    const h = w * (ic.h / ic.w);
    const cx = 20 + col * cell + cell / 2, cy = y + row * (cell + labelH) + cell / 2;
    ops.push({ op: 'add', element: { type: 'icon', icon: ic.id, x: cx - w / 2, y: cy - h / 2, w, h } });
    ops.push({ op: 'add', element: { type: 'text', text: ic.id, x: cx - cell / 2 + 4, y: cy + 50, w: cell - 8, fontSize: 11, align: 'center', color: '#3e4c59' } });
  });
  y += Math.ceil(list.length / cols) * (cell + labelH) + 10;
}
const r = applyOps(doc, ops);
if (r.error) throw new Error(r.error);
doc = r.doc;
doc.canvas.height = y + 10;
const svg = renderSVG(doc);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out + '.svg', svg);
fs.writeFileSync(out + '.png', await svgToPng(svg, { scale: Number(args.includes('--scale') ? args[args.indexOf('--scale') + 1] : 1) }));
console.log(`${icons.length} icons → ${out}.png`);
