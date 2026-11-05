// Node-only helpers for third-party icon packs: import a folder of SVGs into a
// pack JSON (with per-icon license + author), and load packs at startup.
//
// Supported sources:
//   * Any folder of .svg files (license/author given on the command line)
//   * Bioicons layout: static/icons/<license>/<category>/<author>/<name>.svg
//     (https://bioicons.com — licenses vary per icon: cc-0, cc-by-3.0, cc-by-4.0, mit, bsd …)
//   * Servier Medical Art / NIH BioArt downloads (pass --license / --author / --source)

import fs from 'node:fs';
import path from 'node:path';
import { unwrapSvg, registerPack } from '../icons/registry.js';

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.name.toLowerCase().endsWith('.svg')) out.push(p);
  }
  return out;
}

const slug = (s) => String(s).toLowerCase().replace(/\.svg$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const title = (s) => String(s).replace(/\.svg$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());

const LICENSES = {
  'cc-0': 'CC0-1.0', cc0: 'CC0-1.0', 'cc-by-3.0': 'CC-BY-3.0', 'cc-by-4.0': 'CC-BY-4.0', 'cc-by-sa-3.0': 'CC-BY-SA-3.0',
  'cc-by-sa-4.0': 'CC-BY-SA-4.0', mit: 'MIT', bsd: 'BSD-3-Clause', 'bsd-3-clause': 'BSD-3-Clause',
};

/**
 * Build a pack object from a folder.
 * opts: { name, prefix, license, author, source, layout: 'flat'|'bioicons', category }
 */
export function importFolder(dir, opts = {}) {
  const files = walk(dir);
  const icons = [];
  const used = new Set();
  for (const file of files) {
    const rel = path.relative(dir, file).split(path.sep);
    let category = opts.category || (rel.length > 1 ? title(rel[0]) : 'Imported');
    let license = opts.license, author = opts.author;
    if (opts.layout === 'bioicons') {
      // <license>/<category>/<author>/<name>.svg (possibly under static/icons/)
      const i = rel.findIndex((p) => LICENSES[p.toLowerCase()]);
      if (i >= 0 && rel.length - i >= 4) {
        license = LICENSES[rel[i].toLowerCase()];
        category = title(rel[i + 1]);
        author = rel[i + 2].replace(/_/g, ' ');
      }
    }
    const svg = fs.readFileSync(file, 'utf8');
    const { w, h, svg: inner } = unwrapSvg(svg);
    if (!inner || inner.length > 400_000) continue;
    let id = slug(rel[rel.length - 1]);
    if (used.has(id)) id = slug(rel.slice(-2).join('-'));
    let k = 2;
    while (used.has(id)) id = `${slug(rel[rel.length - 1])}-${k++}`;
    used.add(id);
    const tags = rel.slice(0, -1).map((p) => p.toLowerCase().replace(/[_-]+/g, ' ')).filter((t) => !LICENSES[t.replace(/ /g, '-')]);
    tags.push(...title(rel[rel.length - 1]).toLowerCase().split(' '));
    icons.push({
      id, name: title(rel[rel.length - 1]), category, tags: [...new Set(tags)], w: Math.round(w * 100) / 100, h: Math.round(h * 100) / 100,
      size: 100, svg: inner, license, author, shape: 'rect',
    });
  }
  return {
    format: 'fortheplot-icon-pack',
    version: 1,
    name: opts.name || path.basename(path.resolve(dir)),
    prefix: opts.prefix || slug(opts.name || path.basename(path.resolve(dir))),
    license: opts.license || 'see per-icon license',
    author: opts.author || 'see per-icon author',
    source: opts.source || '',
    icons,
  };
}

/**
 * Load icon packs and register them. Accepts pack files, folders of pack files,
 * split packs (a folder with an index.json, like packs/bioicons), or a parent
 * folder containing any of those (like packs/).
 */
export function loadPacks(paths = []) {
  const loaded = [];
  const seen = new Set();
  const loadFile = (f) => {
    if (seen.has(f)) return;
    seen.add(f);
    try {
      const pack = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (/^(fortheplot|epitope)-icon-pack-index$/.test(pack.format)) {
        for (const part of pack.files || []) loadFile(path.join(path.dirname(f), part.file));
        return;
      }
      if (!/^(fortheplot|epitope)-icon-pack$/.test(pack.format)) return;
      registerPack(pack);
      loaded.push({ file: f, name: pack.name, count: pack.icons.length });
    } catch (err) {
      console.error(`Could not load icon pack ${f}: ${err.message}`);
    }
  };
  const visit = (p, depth = 0) => {
    if (!fs.existsSync(p)) return;
    if (!fs.statSync(p).isDirectory()) return loadFile(p);
    const index = path.join(p, 'index.json');
    if (fs.existsSync(index)) return loadFile(index);
    for (const name of fs.readdirSync(p).sort()) {
      const child = path.join(p, name);
      if (name.endsWith('.json')) loadFile(child);
      else if (depth < 1 && fs.statSync(child).isDirectory()) visit(child, depth + 1);
    }
  };
  for (const p of paths.flatMap((x) => String(x).split(path.delimiter)).filter(Boolean)) visit(p);
  return loaded;
}

/** Default pack locations: FORTHEPLOT_PACKS, then the packs/ folder shipped with ForThePlot. */
export function defaultPackPaths(repoRoot) {
  const list = [];
  if (process.env.FORTHEPLOT_PACKS) list.push(...process.env.FORTHEPLOT_PACKS.split(path.delimiter));
  if (repoRoot) list.push(path.join(repoRoot, 'packs'));
  return list;
}
