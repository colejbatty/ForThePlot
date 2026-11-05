#!/usr/bin/env node
// ForThePlot command-line interface.

import fs from 'node:fs';
import path from 'node:path';
import {
  createFigure, normalizeFigure, applyOps, renderSVG, describeFigure, lintFigure, formatIssues, searchIcons, categories,
  figureCredits, embedUsedIcons, embedUsedImages, newId, registerEmbeddedIcons, getIcon, validateFigure,
} from '../core/index.js';
import { loadPacks, defaultPackPaths, importFolder } from '../node/packs.js';
import { ROOT } from '../node/root.js';
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const HELP = `ForThePlot ${pkg.version} — open-source scientific illustration for people and agents

Usage: fortheplot <command> [options]      (or the short form: 4tp <command>)

Figures
  new <file.json> [--title T] [--width 1200] [--height 800] [--template NAME]
  render <file.json> [-o out.svg|out.png] [--scale 2] [--crop content]
  export <file.json> -o out.pdf|.tiff|.png|.svg|.pptx [--journal nature-2col] [--width-mm 183] [--dpi 600]
  journals                                                  list journal size presets
  check <file.json> [--journal ID | --width-mm N]           validation, layout and print text-size check
  apply <file.json> <ops.json|-> [-o out.json] [--dry-run]   apply ops (from a file or stdin)
  add-image <file.json> <picture.png|.jpg|.tif> [--x X --y Y | --cx --cy] [--w W] [--id ID] [--label TEXT]
                         [--um-per-px 0.325 --bar 20]       embed a micrograph, blot or flow plot (optional scale bar)
  panels <file.json> [--rows 2 --cols 2] [--wrap a,b/c,d]   lettered panels (A, B, C…) as a grid or around content
  link <file.json> <data.prism|graph.svg> [--graph 2 | --graph "H1 Redone"] [--layout] [--picture exported.svg] [--cx --cy --w --id]
  prism-graphs <data.prism>                                 list a Prism file's graphs by number and name
                                                            a graph that stays linked to its Prism file
  refresh <file.json> [--force]                             update linked graphs whose source changed
  describe <file.json> [--json]                             list elements for humans/agents
  credits <file.json>                                       credit line for the figure legend

Icons
  icons [query] [--category C] [--limit 30] [--builtin] [--json]
  icons --categories
  import-icons <folder> --out pack.json [--name N] [--license L] [--author A] [--source URL] [--layout bioicons]

Editor & agents
  serve [file.json] [--port 5173] [--host 127.0.0.1]        open the editor; file and browser stay in sync
  mcp                                                       start the MCP server (stdio); the standalone fortheplot.exe
                                                            also does this when an app starts it with no command
  templates                                                 list starter figures

Options: --pack <file|dir> adds icon packs (also FORTHEPLOT_PACKS). Packs in ${path.join('packs')}/ load automatically.
Docs: README.md, docs/FORMAT.md, docs/AGENTS.md`;

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o') { opt.out = argv[++i]; continue; }
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      const next = argv[i + 1];
      if (v != null) opt[k] = v;
      else if (next != null && !next.startsWith('-') && !['dry-run', 'json', 'builtin', 'categories', 'help', 'version', 'open', 'layout', 'force'].includes(k)) { opt[k] = next; i++; }
      else opt[k] = true;
      continue;
    }
    pos.push(a);
  }
  return { pos, opt };
}

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

let packsLoaded = false;
function ensurePacks(opt) {
  if (packsLoaded) return;
  packsLoaded = true;
  const extra = opt.pack ? [].concat(opt.pack) : [];
  loadPacks([...extra, ...defaultPackPaths(ROOT)]);
}

function readFigure(file, opt) {
  if (!file) die('Missing figure file.');
  if (!fs.existsSync(file)) die(`File not found: ${file}`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  registerEmbeddedIcons(raw);
  const needsPacks = (raw.elements || []).some((e) => e.icon && !getIcon(e.icon));
  if (needsPacks || opt.pack) ensurePacks(opt);
  return normalizeFigure(raw);
}

function writeFigure(file, doc) {
  embedUsedIcons(doc);
  embedUsedImages(doc);
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const TEMPLATES = ['pd1-blockade', 't-cell-activation', 'car-t-workflow', 'flow-cytometry-workflow', 'ebv-b-cell', 'tumor-model-study'];

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, opt } = parseArgs(rest);
  // The standalone program started by an app with no arguments (input is piped, not a terminal)
  // is the MCP server, so a connector only needs the program's path.
  const sea = await import('node:sea').catch(() => null);
  if (!cmd && !process.stdin.isTTY && sea?.isSea?.()) {
    const { startMcpServer } = await import('../mcp/server.js');
    return startMcpServer();
  }
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return console.log(HELP);
  if (cmd === '--version' || cmd === '-v') return console.log(pkg.version);

  switch (cmd) {
    case 'new': {
      const file = pos[0] || 'figure.json';
      if (fs.existsSync(file) && !opt.force) die(`${file} exists (use --force to overwrite).`);
      let doc;
      if (opt.template) {
        const tpl = path.join(ROOT, 'examples', `${opt.template}.json`);
        if (!fs.existsSync(tpl)) die(`Unknown template "${opt.template}". Try: ${TEMPLATES.join(', ')}`);
        doc = normalizeFigure(JSON.parse(fs.readFileSync(tpl, 'utf8')));
      } else {
        doc = createFigure({ title: opt.title || path.basename(file, '.json'), width: Number(opt.width) || 1200, height: Number(opt.height) || 800, background: opt.background || '#ffffff' });
      }
      if (opt.title) doc.title = opt.title;
      writeFigure(file, doc);
      return console.log(`Created ${file}`);
    }
    case 'render': {
      const doc = readFigure(pos[0], opt);
      const out = opt.out || pos[1] || pos[0].replace(/\.json$/i, '') + '.svg';
      const svg = renderSVG(doc, { ids: false, crop: opt.crop === 'content' ? 'content' : 'canvas', padding: opt.crop === 'content' ? Number(opt.padding ?? 20) : 0 });
      if (out.toLowerCase().endsWith('.png')) {
        const { svgToPng } = await import('../node/png.js');
        fs.writeFileSync(out, await svgToPng(svg, { scale: Number(opt.scale) || 2, width: Number(opt.width) || 0 }));
      } else {
        fs.writeFileSync(out, svg);
      }
      console.log(`Wrote ${out}`);
      const credits = figureCredits(doc);
      if (credits.length) console.log(`Icon credits: ${credits.map((c) => `${c.author} (${c.license})`).join('; ')}`);
      return;
    }
    case 'apply': {
      const file = pos[0];
      const doc = readFigure(file, opt);
      const src = !pos[1] || pos[1] === '-' ? await readStdin() : fs.readFileSync(pos[1], 'utf8');
      let ops = JSON.parse(src);
      if (!Array.isArray(ops)) ops = ops.ops || [ops];
      const { resolveImageFiles } = await import('../node/images.js');
      const opsDir = !pos[1] || pos[1] === '-' ? process.cwd() : path.dirname(path.resolve(pos[1]));
      await resolveImageFiles(ops, (p) => (path.isAbsolute(p) ? p : fs.existsSync(path.resolve(opsDir, p)) ? path.resolve(opsDir, p) : path.resolve(p)));
      if (ops.some((o) => o.element?.icon && !getIcon(o.element.icon))) ensurePacks(opt);
      const r = applyOps(doc, ops);
      if (r.error) die(`Nothing changed. ${r.error}`);
      if (!opt['dry-run']) writeFigure(opt.out || file, r.doc);
      const made = r.results.flatMap((x) => (['add', 'connect', 'duplicate'].includes(x.op) ? x.ids : []));
      console.log(`${opt['dry-run'] ? 'Would apply' : 'Applied'} ${ops.length} op(s)${made.length ? `; new ids: ${made.join(', ')}` : ''}.`);
      const issues = lintFigure(r.doc);
      if (issues.length) console.log(formatIssues(issues));
      return;
    }
    case 'add-image': {
      const file = pos[0];
      if (!pos[1]) die('Usage: fortheplot add-image fig.json picture.tif [--cx 400 --cy 300] [--w 360] [--um-per-px 0.325 --bar 20]');
      const doc = readFigure(file, opt);
      const { loadImageFile } = await import('../node/images.js');
      const img = await loadImageFile(path.resolve(pos[1]));
      const el = { type: 'image', src: img.src, name: img.name };
      for (const k of ['x', 'y', 'cx', 'cy', 'w', 'h']) if (opt[k] != null) el[k] = Number(opt[k]);
      if (opt.id) el.id = String(opt.id);
      if (opt.label) el.label = String(opt.label);
      if (opt['um-per-px']) el.scaleBar = { perPx: Number(opt['um-per-px']), length: Number(opt.bar) || 10, unit: opt.unit || 'µm' };
      const r = applyOps(doc, [{ op: 'add', element: el }]);
      if (r.error) die(`Nothing changed. ${r.error}`);
      writeFigure(opt.out || file, r.doc);
      const e = r.doc.elements.find((x) => x.id === r.results[0].ids[0]);
      console.log(`Added image "${e.id}" (${img.w}×${img.h} px) at (${Math.round(e.x)}, ${Math.round(e.y)}) size ${Math.round(e.w)}×${Math.round(e.h)}.`);
      return;
    }
    case 'link': {
      const file = pos[0];
      if (!pos[1]) die('Usage: fortheplot link fig.json data.prism --graph 2   (or a picture exported from Prism)');
      const doc = readFigure(file, opt);
      const { linkedElement, linkSummary, suggestId } = await import('../node/links.js');
      const figAbs = path.resolve(opt.out || file);
      const { el } = await linkedElement({ file: path.resolve(pos[1]), graph: opt.graph ?? 1, layout: !!opt.layout, picture: opt.picture ? path.resolve(opt.picture) : undefined }, figAbs);
      for (const k of ['x', 'y', 'cx', 'cy', 'w']) if (opt[k] != null) el[k] = Number(opt[k]);
      if (el.w == null) el.w = 420;
      if (el.cx == null && el.x == null) el.cx = doc.canvas.width / 2;
      if (el.cy == null && el.y == null) el.cy = doc.canvas.height / 2;
      el.id = opt.id ? String(opt.id) : newId(doc, suggestId(el.link));
      const r = applyOps(doc, [{ op: 'add', element: el }]);
      if (r.error) die(`Nothing changed. ${r.error}`);
      writeFigure(opt.out || file, r.doc);
      const e = r.doc.elements.find((x) => x.id === r.results[0].ids[0]);
      console.log(`Added "${e.id}" linked to ${linkSummary(e.link)}.`);
      return;
    }
    case 'prism-graphs': {
      const { prismContents } = await import('../node/prism.js');
      const c = await prismContents(path.resolve(pos[0] || ''));
      if (!c) die('Graph names can be read only from .prism files.');
      for (const g of c.graphs) console.log(`graph ${g.n}: ${g.title || '(untitled)'}`);
      for (const g of c.layouts) console.log(`layout ${g.n}: ${g.title || '(untitled)'}`);
      return;
    }
    case 'refresh': {
      const file = pos[0];
      const doc = readFigure(file, opt);
      const { refreshLinks } = await import('../node/links.js');
      const res = await refreshLinks(doc, path.resolve(file), { force: !!opt.force });
      if (res.some((x) => x.ok)) writeFigure(file, doc);
      if (!res.length) console.log('Linked graphs are up to date.');
      for (const x of res) console.log(x.ok ? `Updated ${x.id}` : `Could not update ${x.id}: ${x.error}`);
      if (res.some((x) => !x.ok)) process.exitCode = 1;
      return;
    }
    case 'panels': {
      const file = pos[0];
      const doc = readFigure(file, opt);
      const op = { op: 'panels' };
      if (opt.wrap) op.wrap = String(opt.wrap).split('/').map((g) => g.split(',').map((x) => x.trim()).filter(Boolean));
      else { op.rows = Number(opt.rows) || 1; op.cols = Number(opt.cols) || 2; }
      if (opt.titles) op.titles = String(opt.titles).split('|');
      if (opt.labels) op.labels = String(opt.labels);
      const r = applyOps(doc, [op]);
      if (r.error) die(`Nothing changed. ${r.error}`);
      writeFigure(opt.out || file, r.doc);
      console.log(`Added ${r.results[0].ids.length} panel(s): ${r.results[0].ids.join(', ')}.`);
      return;
    }
    case 'export': {
      const doc = readFigure(pos[0], opt);
      const out = opt.out || pos[1];
      if (!out) die('Usage: fortheplot export fig.json -o fig.pdf [--journal nature-2col] [--width-mm 183] [--dpi 600]');
      const { exportFigure, formatFromPath, describeExport } = await import('../node/export.js');
      const r = await exportFigure(doc, { format: formatFromPath(out), journal: opt.journal, widthMm: opt['width-mm'], dpi: opt.dpi, scale: opt.scale, crop: opt.crop });
      fs.writeFileSync(out, r.data);
      console.log(`Wrote ${out}`);
      const info = describeExport(r);
      if (info) console.log(info);
      return;
    }
    case 'journals': {
      const { JOURNAL_PRESETS } = await import('../core/journal.js');
      for (const p of JOURNAL_PRESETS) console.log(`${p.id.padEnd(20)} ${p.name}  ·  text ${p.minPt}${p.maxPt ? '–' + p.maxPt : '+'} pt  ·  ${p.formats}  (${p.source})`);
      console.log('\nCheck your journal\'s current author guidelines before submitting.');
      return;
    }
    case 'check':
    case 'validate': {
      const doc = readFigure(pos[0], opt);
      const issues = cmd === 'validate' ? validateFigure(doc) : lintFigure(doc);
      if (cmd === 'check' && (opt.journal || opt['width-mm'])) {
        const { journalCheck, presetById } = await import('../core/journal.js');
        const p = opt.journal ? presetById(opt.journal) : null;
        if (opt.journal && !p) die(`Unknown journal preset "${opt.journal}". See: fortheplot journals`);
        const jc = journalCheck(doc, { widthMm: Number(opt['width-mm']) || p.widthMm, minPt: p?.minPt ?? 6, maxPt: p?.maxPt ?? 0 });
        console.log(jc.summary);
        issues.push(...jc.issues.map((i) => ({ ...i, level: i.level === 'info' ? 'warning' : i.level })));
      }
      console.log(formatIssues(issues));
      if (issues.some((i) => i.level === 'error')) process.exit(2);
      return;
    }
    case 'describe': {
      const doc = readFigure(pos[0], opt);
      return console.log(opt.json ? JSON.stringify(doc, null, 2) : describeFigure(doc));
    }
    case 'credits': {
      const doc = readFigure(pos[0], opt);
      const c = figureCredits(doc);
      const { creditLine } = await import('../core/index.js');
      console.log(creditLine(doc));
      if (c.length) console.log('\n' + c.map((x) => `${x.author} (${x.license}${x.source ? ', ' + x.source : ''}): ${x.icons.join(', ')}`).join('\n'));
      return;
    }
    case 'icons': {
      ensurePacks(opt);
      if (opt.categories) return console.log(categories().map((c) => `${c.name} (${c.count})`).join('\n'));
      let list = searchIcons(pos.join(' '), { category: opt.category });
      if (opt.builtin) list = list.filter((i) => i.draw);
      list = list.slice(0, Number(opt.limit) || 30);
      if (opt.json) return console.log(JSON.stringify(list.map((i) => ({ id: i.id, name: i.name, category: i.category, tags: i.tags, w: i.w, h: i.h, size: i.size, colors: i.colors, license: i.license, author: i.author })), null, 2));
      for (const i of list) console.log(`${i.id.padEnd(34)} ${i.name}  ·  ${i.category}${i.draw ? '' : `  ·  ${i.license}, ${i.author}`}`);
      return;
    }
    case 'import-icons': {
      if (!pos[0] || !opt.out) die('Usage: fortheplot import-icons <folder> --out pack.json [--name N] [--license L] [--author A] [--source URL] [--layout bioicons]');
      const pack = importFolder(pos[0], { name: opt.name, prefix: opt.prefix, license: opt.license, author: opt.author, source: opt.source, layout: opt.layout, category: opt.category });
      fs.writeFileSync(opt.out, JSON.stringify(pack));
      return console.log(`Wrote ${pack.icons.length} icons to ${opt.out}. Load it with --pack ${opt.out}, put it in packs/, or use “Load icon pack…” in the editor.`);
    }
    case 'serve': {
      const { serve } = await import('../server/serve.js');
      const s = await serve({ file: pos[0] || 'figure.json', port: Number(opt.port) || 5173, host: opt.host || '127.0.0.1' });
      if (opt.open) {
        const { spawn } = await import('node:child_process');
        const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', s.url]] : process.platform === 'darwin' ? ['open', [s.url]] : ['xdg-open', [s.url]];
        spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).unref();
      }
      return;
    }
    case 'mcp': {
      const { startMcpServer } = await import('../mcp/server.js');
      const extra = opt.pack ? [].concat(opt.pack) : [];
      await startMcpServer({ packs: [...extra, ...defaultPackPaths(ROOT)] });
      return;
    }
    case 'templates':
      return console.log(TEMPLATES.map((t) => `${t}  (fortheplot new my.json --template ${t})`).join('\n'));
    default:
      die(`Unknown command "${cmd}".\n\n${HELP}`);
  }
}

main().catch((err) => die(err?.stack || String(err)));
