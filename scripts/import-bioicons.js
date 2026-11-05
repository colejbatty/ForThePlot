#!/usr/bin/env node
// Import Bioicons (https://bioicons.com, https://github.com/duerrsimon/bioicons)
// into ForThePlot icon packs, keeping each icon's own license and author.
//
//   git clone --depth 1 https://github.com/duerrsimon/bioicons
//   node scripts/import-bioicons.js bioicons/static/icons --out packs/bioicons [--max-kb 120]
//
// Output (one file per category so the editor can load them lazily):
//   packs/bioicons/index.json        metadata for every icon (search without loading SVGs)
//   packs/bioicons/<category>.json   fortheplot-icon-pack files with the optimized SVGs
//   packs/bioicons/NOTICE.md         attribution: authors, licenses, counts

import fs from 'node:fs';
import path from 'node:path';
import { optimize } from 'svgo';
import { unwrapSvg, sanitizeSvg } from '../src/icons/registry.js';

const args = process.argv.slice(2);
const src = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const flag = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
if (!src) {
  console.error('Usage: node scripts/import-bioicons.js <bioicons/static/icons> [--out packs/bioicons] [--max-kb 120]');
  process.exit(1);
}
const out = flag('--out', 'packs/bioicons');
const maxBytes = Number(flag('--max-kb', 120)) * 1024;

const LICENSES = {
  'cc-0': 'CC0-1.0', 'cc-by-3.0': 'CC-BY-3.0', 'cc-by-4.0': 'CC-BY-4.0', 'cc-by-sa-3.0': 'CC-BY-SA-3.0',
  'cc-by-sa-4.0': 'CC-BY-SA-4.0', mit: 'MIT', bsd: 'BSD-3-Clause',
};
const LICENSE_URLS = {
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  MIT: 'https://opensource.org/licenses/MIT',
  'BSD-3-Clause': 'https://opensource.org/licenses/BSD-3-Clause',
};

const slug = (s) => String(s).toLowerCase().replace(/\.svg$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pretty = (s) => String(s).replace(/\.svg$/i, '').replace(/[_]+/g, ' ').replace(/-(?=[A-Za-z])/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());
const catName = (s) => pretty(s).replace(/ Immunology$/, ' & Immunology').replace(/^Blood & Immunology$/, 'Blood & Immunology');

let authors = {};
try { authors = JSON.parse(fs.readFileSync(path.join(src, 'authors.json'), 'utf8')); } catch { /* optional */ }

const files = [];
for (const lic of Object.keys(LICENSES)) {
  const base = path.join(src, lic);
  if (!fs.existsSync(base)) continue;
  for (const cat of fs.readdirSync(base)) {
    const cdir = path.join(base, cat);
    if (!fs.statSync(cdir).isDirectory()) continue;
    for (const author of fs.readdirSync(cdir)) {
      const adir = path.join(cdir, author);
      if (!fs.statSync(adir).isDirectory()) continue;
      for (const f of fs.readdirSync(adir)) if (f.toLowerCase().endsWith('.svg')) files.push({ file: path.join(adir, f), lic, cat, author, name: f });
    }
  }
}
console.log(`Found ${files.length} SVGs in ${src}`);

const byCat = new Map();
const used = new Set();
const index = [];
const skipped = { big: 0, raster: 0, error: 0 };
let n = 0;
for (const it of files) {
  n++;
  if (n % 250 === 0) console.log(`  ${n}/${files.length}`);
  // Files far over the limit won't shrink enough; skip before the (slow) optimizer.
  if (fs.statSync(it.file).size > maxBytes * 4) { skipped.big++; continue; }
  let raw = fs.readFileSync(it.file, 'utf8');
  if (/<image\b/i.test(raw) && raw.length > maxBytes) { skipped.raster++; continue; }
  try {
    raw = optimize(raw, {
      multipass: false,
      plugins: [
        { name: 'preset-default', params: { overrides: { cleanupIds: false } } },
        'removeDimensions',
      ],
    }).data;
  } catch {
    skipped.error++;
    continue;
  }
  const { w, h, svg } = unwrapSvg(sanitizeSvg(raw));
  if (!svg || svg.length > maxBytes || !(w > 0) || !(h > 0)) { skipped.big++; continue; }
  const authorName = it.author.replace(/[_-]+/g, ' ').trim();
  let id = slug(it.name);
  if (used.has(id)) id = `${id}-${slug(authorName)}`;
  let k = 2;
  while (used.has(id)) id = `${slug(it.name)}-${k++}`;
  used.add(id);
  const category = catName(it.cat);
  const name = pretty(it.name);
  const license = LICENSES[it.lic];
  const tags = [...new Set([...category.toLowerCase().split(/[\s&]+/), ...name.toLowerCase().split(/[\s,()]+/), authorName.toLowerCase()].filter((t) => t.length > 1))];
  const icon = {
    id, name, category, tags, w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100, size: 110,
    svg, license, author: authorName, source: authors[it.author] || authors[authorName] || 'https://bioicons.com',
  };
  if (!byCat.has(category)) byCat.set(category, []);
  byCat.get(category).push(icon);
}

fs.mkdirSync(out, { recursive: true });
const packFiles = [];
for (const [category, icons] of [...byCat.entries()].sort()) {
  icons.sort((a, b) => a.name.localeCompare(b.name));
  const file = `${slug(category)}.json`;
  const pack = {
    format: 'fortheplot-icon-pack', version: 1, name: `Bioicons: ${category}`, prefix: 'bioicons',
    source: 'https://bioicons.com', license: 'Per icon (see each icon)', author: 'Bioicons contributors', icons,
  };
  const text = JSON.stringify(pack);
  fs.writeFileSync(path.join(out, file), text);
  packFiles.push({ file, category, count: icons.length, bytes: text.length });
  for (const ic of icons) {
    index.push({ id: `bioicons/${ic.id}`, name: ic.name, category, tags: ic.tags, w: ic.w, h: ic.h, license: ic.license, author: ic.author, file });
  }
}

fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({
  format: 'fortheplot-icon-pack-index', version: 1, name: 'Bioicons', source: 'https://bioicons.com',
  repository: 'https://github.com/duerrsimon/bioicons', license: 'Per icon: CC0, CC-BY 3.0/4.0, CC-BY-SA 3.0/4.0, MIT, BSD',
  generated: new Date().toISOString().slice(0, 10), files: packFiles, icons: index,
}));

// Attribution notice
const perAuthor = new Map();
for (const ic of index) {
  const key = `${ic.author}|${ic.license}`;
  perAuthor.set(key, (perAuthor.get(key) || 0) + 1);
}
const rows = [...perAuthor.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => {
  const [a, l] = k.split('|');
  return `| ${a} | [${l}](${LICENSE_URLS[l] || '#'}) | ${c} |`;
});
fs.writeFileSync(path.join(out, 'NOTICE.md'), `# Bioicons icon pack

These icons come from [Bioicons](https://bioicons.com) ([GitHub](https://github.com/duerrsimon/bioicons)),
a library of free, open-licensed science illustrations curated by Simon Dürr and contributors.
They are **not** covered by ForThePlot's MIT license: every icon keeps its original license and author,
which ForThePlot stores with the icon, shows in the editor, and writes into exported SVGs.

When you publish a figure that uses Bioicons, credit the authors as their licenses require
(CC-BY and CC-BY-SA require attribution; CC-BY-SA also requires sharing adaptations under the same license).
\`fortheplot credits figure.json\` prints the credit line for a figure.

Generated ${new Date().toISOString().slice(0, 10)} from ${files.length} source SVGs; ${index.length} imported
(${skipped.big} skipped as too large after optimization, ${skipped.raster} embedded large raster images, ${skipped.error} unreadable).

| Author | License | Icons |
|---|---|---|
${rows.join('\n')}
`);

const total = packFiles.reduce((s, f) => s + f.bytes, 0);
console.log(`Imported ${index.length} icons in ${packFiles.length} categories → ${out} (${(total / 1e6).toFixed(1)} MB). Skipped:`, skipped);
