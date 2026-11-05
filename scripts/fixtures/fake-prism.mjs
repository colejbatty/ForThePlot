#!/usr/bin/env node
// Stand-in for prism.exe in tests: runs the subset of Prism's script language ForThePlot writes
// (Open, GoTo, ExportSVG/PNG/TIF, Close, OpenOutput/WText/CloseOutput) and draws a bar chart
// from data/table.csv inside the .prism (zip) file.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const arg = process.argv.slice(2).find((a) => a.startsWith('@'));
const script = fs.readFileSync(arg.slice(1).replace(/^"|"$/g, ''), 'latin1').split(/\r?\n/);
let file = null, sheet = 1, layout = false, out = null, outText = [];
const unq = (s) => s.trim().replace(/^"(.*)"$/, '$1');
for (const line of script) {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  const argStr = line.trim().slice(cmd.length).trim();
  if (/^open$/i.test(cmd)) file = unq(argStr);
  else if (/^goto$/i.test(cmd)) { const m = /([GL])\s*,\s*(\d+)/i.exec(argStr); layout = m[1].toUpperCase() === 'L'; sheet = Number(m[2]); }
  else if (/^exportsvg$/i.test(cmd)) {
    const target = unq(argStr.replace(/\s+CLEAR$/i, ''));
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    let n = Object.keys(zip.files).filter((p) => /^graphs\/[^/]+\/$/.test(p)).length, title = '';
    const docJson = zip.file('document.json') && JSON.parse(await zip.file('document.json').async('string'));
    if (docJson?.sheets?.graphs) {
      n = docJson.sheets.graphs.length;
      const uid = docJson.sheets.graphs[sheet - 1];
      const sj = uid && zip.file(`graphs/${uid}/sheet.json`);
      if (sj) title = JSON.parse(await sj.async('string')).title || '';
    }
    if (sheet > n) process.exit(0); // like Prism: nothing exported for a missing graph
    const values = (await zip.file('data/table.csv').async('string')).trim().split(/\r?\n/).map(Number);
    const bars = values.map((v, i) => `<rect x="${30 + i * 40}" y="${200 - v}" width="28" height="${v}" fill="#4a8fe7"/>`).join('');
    fs.writeFileSync(target, `<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="300pt" height="225pt" viewBox="0 0 300 225"><style>.t{font:14px Arial;fill:#222}</style><path d="M20 10V200H290" stroke="#000" fill="none"/>${bars}<text class="t" x="150" y="220" text-anchor="middle">${layout ? 'Layout' : 'Graph'} ${sheet} of ${n}${title ? `: ${title}` : ''}</text></svg>`);
  } else if (/^openoutput$/i.test(cmd)) { out = unq(argStr); outText = []; }
  else if (/^wtext$/i.test(cmd)) outText.push(argStr);
  else if (/^closeoutput$/i.test(cmd)) fs.writeFileSync(out, outText.join('\n'));
}
