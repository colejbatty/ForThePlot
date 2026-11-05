// Build dist/fortheplot-offline.html: the editor plus every Bioicons pack (gzip,
// base64) in one file that works by double-click, with no server and no install.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'dist/fortheplot.html'), 'utf8');
const dir = path.join(root, 'packs/bioicons');
const packs = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  packs[f] = zlib.gzipSync(fs.readFileSync(path.join(dir, f)), { level: 9 }).toString('base64');
}
const inject = `<script>window.FORTHEPLOT_EMBEDDED_PACKS=${JSON.stringify(packs)};</script>`;
const out = html.replace('<!--FORTHEPLOT_SERVER-->', inject);
if (out === html) throw new Error('marker not found in dist/fortheplot.html; run npm run build first');
fs.writeFileSync(path.join(root, 'dist/fortheplot-offline.html'), out);
console.log(`dist/fortheplot-offline.html  ${(out.length / 1e6).toFixed(1)} MB`);
