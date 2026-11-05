// ForThePlot MCP server (stdio). Lets Claude and other MCP clients create and edit
// figures, look at them (PNG renders come back as images), and open the live
// editor so a person can keep working on the same file.
//
//   claude mcp add fortheplot -- npx -y fortheplot mcp            (Claude Code)
//   "fortheplot": { "command": "npx", "args": ["-y", "fortheplot", "mcp"] }   (Claude Desktop config)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  createFigure, normalizeFigure, applyOps, blockOps, newId, renderSVG, describeFigure, lintFigure, formatIssues, searchIcons, getIcon,
  categories, figureCredits, embedUsedIcons, embedUsedImages, registerEmbeddedIcons, OP_NAMES,
} from '../core/index.js';
import { svgToPng, pngAvailable } from '../node/png.js';
import { loadPacks, defaultPackPaths } from '../node/packs.js';
import { serve, writeAtomic } from '../server/serve.js';
import { ROOT, expandPath } from '../node/root.js';
import { resolveImageFiles, loadImageFile } from '../node/images.js';
import { linkedElement, refreshLinks, openLink, linkSummary, suggestId } from '../node/links.js';
import { findPrism, prismContents } from '../node/prism.js';
import { loadMyIcons, saveMyIcon, myIconsFile } from '../node/myicons.js';
import { iconFromElements, replaceWithIconOps } from '../core/saveicon.js';

const BASE = resolveBase();
function writable(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; }
}
function resolveBase() {
  const raw = expandPath(process.env.FORTHEPLOT_DIR);
  if (raw && !raw.includes('${') && writable(raw)) return raw;
  // Claude Desktop may start servers in a system folder, and sandboxed hosts in a read-only one:
  // use Documents/ForThePlot there, else a temporary folder.
  const cwd = process.cwd();
  const home = process.env.USERPROFILE || process.env.HOME || cwd;
  const cwdOk = writable(cwd);
  if (raw || /system32|^\/$|Program Files/i.test(cwd) || !cwdOk) {
    const dir = path.join(home, 'Documents', 'ForThePlot');
    if (writable(dir)) return dir;
  }
  if (cwdOk) return cwd;
  const tmp = path.join(os.tmpdir(), 'fortheplot');
  writable(tmp);
  return tmp;
}
let current = process.env.FORTHEPLOT_FIGURE ? path.resolve(BASE, process.env.FORTHEPLOT_FIGURE) : null;
let editor = null;

const OPS_HELP = `Ops (JSON objects with an "op" field), applied in order as one atomic transaction:
- add {element} or {elements:[...]}: element types —
  icon  {id?, icon, x?, y?, cx?, cy?, w?, h?, rotation?, colors?:{primary,secondary,accent}, label?: "text" | {text, position: bottom|top|left|right|center, fontSize, bold, color}, flipX?, near?:{id, side: right|left|above|below|center, gap}}
  shape {id?, type:"shape", shape: rect|ellipse|triangle|diamond|hexagon|brace|membrane|membrane-ellipse, x,y,w,h, fill, stroke, strokeWidth, radius, dash: solid|dashed|dotted, text?, fontSize?, textColor?, inner? (membrane-ellipse interior), thickness?}
  text  {id?, type:"text", text, x, y, fontSize?, color?, bold?, italic?, align: left|center|right, w? (wrap width), background?}
  arrow {id?, type:"arrow", from: "<id>" | {id, anchor} | [x,y], to: same, head: arrow|open|inhibit|circle|diamond|none, tail, routing: straight|curved|elbow, curvature (+ bends right of travel), stroke, width, dash, label, labelSize}
  path  {id?, type:"path", points:[[x,y],…] (canvas coords; or relative to x,y if you give them) or {x,y,in:[dx,dy],out:[dx,dy]} for Bézier handles, smooth?:true (automatic curves), closed?, stroke, strokeWidth, fill (closed), dash, head?/tail? (open paths), membrane?:true (phospholipid bilayer along the curve), thickness?, inner? (closed membrane interior)}
    a closed smooth membrane path is a cell or organelle of any shape; an open one is a curved plasma membrane
  image {id?, type:"image", file:"micrograph.tif" (PNG, JPEG, TIFF, GIF, WebP; relative to the figure) or src:"data:…", x?, y?, cx?, cy?, w?, h?, crop?:{x,y,w,h} (fractions 0–1), radius?, stroke?, strokeWidth?, label?, scaleBar?:{length:20, unit:"µm", perPx:0.325 (units per original pixel), position: bottom-right|bottom-left|top-right|top-left, color, label?:true}}
  panel {id?, type:"panel", x, y, w, h, title?, fill?, stroke?, radius?, letter? (override; "" for none)}  letters A, B, C… follow reading order automatically
  Anchors: auto|top|bottom|left|right|center|top-left|…  (top/bottom attach beyond a label on that side)
- connect {from, to, ...arrow props}       shorthand for adding an arrow
- update {id|ids, set:{...props}}          colors and label merge; changing an icon's w keeps its aspect ratio
- remove {id|ids}                          also removes arrows attached to them
- move {ids, dx, dy} · moveTo {id, x?, y?, cx?, cy?} · resize {id, w?, h?, scale?}
- place {id, relativeTo, side: right|left|above|below|center|inside-top|inside-bottom|inside-left|inside-right, gap?}
- attach {id|ids, to:<cell id>, angle?: deg (0 right, 90 down, 180 left, 270 up) | toward:<id>, spread?, inset?}
    seats receptors/antibodies/virions on a cell surface, rotated to point outward (several ids fan out around angle)
    on a path or drawn membrane also: at?: 0–1 along its length (or one per id), gap?: px between several ids
    attached items follow their host when it is moved, resized, rotated or reshaped
- align {ids, edge: left|right|top|bottom|hcenter|vcenter|center, to?: "canvas"} · distribute {ids, axis: h|v}
- arrange {ids, layout: row|column|grid|circle, gap?, x?, y?, cx?, cy?, cols?, radius?}
- order {ids, to: front|back|forward|backward} · group {ids} · ungroup {ids} · duplicate {ids, dx?, dy?}
- canvas {set:{width?, height?, background?, title?, font?}} · fit {margin?} (resize canvas to content) · clear
- note {type:"note", text, target?:<id>, author:"claude"} via add: a sticky note for the person (never exported); resolve theirs with update {set:{resolved:true}}
- Imported icons (bioicons/…) and the person's own icons (my/…) recolor with update {set:{tint:"#hex"}} or {set:{colorMap:{"#old":"#new"}}}
- Gradients: wherever a shape, closed path or panel takes "fill" (and a membrane takes "inner"), give a gradient instead of a color:
    "linear-gradient(90deg, #ffffff, #4a8fe7)" or "radial-gradient(circle at 35% 30%, #ffffff, #4a8fe7 60%, #1d4e89)" (CSS syntax), or
    {type:"linear", angle: 180, stops:[{offset:0, color:"#fff"}, {offset:1, color:"#4a8fe7"}]} / {type:"radial", cx, cy, r, stops} (cx/cy/r are fractions of the box)
    angle follows CSS (0 up, 90 left→right, 180 top→bottom); a radial highlight off-center makes cells and beads look round
Building blocks (one op draws a whole motif; returns the ids it made):
- synapse {left:<cell icon or existing id>, right:…, pairs:[["tcr","mhc-i"], {left:"pd-1", right:"pd-l1", blockedBy:{icon:"antibody", colors:{…}, label:"anti-PD-1"}, label?}], cx?, cy?, size?, legend?:true}
    two cells facing each other with receptor–ligand pairs that meet; receptors move with their cells
- pathway {nodes:[{id, label?, icon?, shape?: pill|box|ellipse|circle, color?}|"LCK"], edges:[[from, to, "activates"|"inhibits"|"binds"|"phosphorylates"|"translocates"|"produces"|"secretes", label?]], direction?: down|right, membrane?: true|{label}, compartments?:[{label:"Nucleus", ids:[…]}]}
- timeline {events:[{at:0|[7,10,13], label, icon?} | {from:7, to:21, label, below?:true}], unit?:"Day", start?, end?, subject?:{icon:"mouse", label}, x?, y?, width?}
- gating {steps:[{x:"FSC-A", y:"SSC-A", gate:"Lymphocytes", pct:"58.3"}, …], x?, y?, size?}   flow gating strategy with dot plots
- tidy {ids?, margin?}   nudge overlapping elements and labels apart
- panels {rows, cols, titles?:[…], widths?:[ratios], heights?:[ratios], cells?:[{row, col, rowSpan?, colSpan?, title?}], x?, y?, w?, h?, gap?, margin?, labels?: A|a|(A)|(a)|A.|none}
    lettered panels filling the canvas (behind everything); or {wrap:[["id1","id2"],["id3"]], titles?, padding?} to frame existing content
    moving a panel moves what is inside it; canvas {set:{panelLabels:{style, size, titleSize, letterBold, titleBold, position: inside|outside}}} restyles all letters and titles;
    a panel's own letterSize / titleSize (update {id, set:{titleSize: 20}}) override them for that panel
- textSize {roles?, within?: <panel id(s)> | ids?: [...] (default whole figure), size?: px | pt?: points | scale?: 0.9 | minPt?: 6 (raise only smaller text), widthMm?}
    changes text sizes by kind in one step. roles: text (text boxes), labels (icon/shape/image labels), shapes (text inside shapes), arrows (arrow labels), plots (plot axes), scaleBars, titles (panel titles), letters (panel letters); default all but letters
    pt needs the printed width: canvas {set:{printWidth: 183}} (mm) once, then e.g. {op:"textSize", roles:["labels","arrows"], pt:7} or {op:"textSize", roles:["letters"], pt:10}
    across the whole figure, panel letters/titles set the figure-wide style; within a panel they set that panel's own size. describe_figure lists current sizes
Text markup: **bold**, *italic*, CD8^+, Ca^{2+}, H_{2}O, \\n for new lines.`;

const INSTRUCTIONS = `ForThePlot draws scientific figures (BioRender-style) as JSON files that a person can also open and edit in the ForThePlot editor.
Workflow: new_figure (or open_figure) → search_icons → edit_figure with ops (or add_icon / connect) → render_figure to look at the result and fix overlaps → open_editor so the person can adjust it by hand.
Coordinates are pixels on the canvas (origin top-left). Prefer relative placement (near, place, attach, arrange, align) over raw coordinates.
Built-in icons (no "/" in the id) are recolorable via colors.primary/secondary/accent. Ids like "bioicons/…" are third-party icons with their own licenses; credits are embedded in exports.
Start whole motifs with the building-block ops (synapse, pathway, timeline, gating), then refine. Run tidy if render_figure shows overlaps.
When the person says "this" or "these", call get_selection to see what they selected in the editor. Read their sticky notes (in describe_figure and get_selection) as instructions; mark them resolved when done, and leave your own note (author "claude") if you need to ask something.
For journals, use export_figure with a journal preset (e.g. nature-2col) to get the right physical size, a text-size check and the credit line.
Reuse: save_as_icon turns objects the person drew (a custom cell, a receptor complex) into an icon in "My icons" for any figure.
Data graphs: for GraphPad Prism graphs use add_prism_graph (it stays linked; the person double-clicks to edit in Prism). For one-off pictures use add_image.
Multi-part figures: lay out panels first (panels op), then build each part inside its panel; letters stay in reading order. Put micrographs, blots or real flow plots in with add_image (add a scale bar when you know the µm per pixel). For curved membranes or odd-shaped cells, add a path with membrane:true and attach receptors to it.
${OPS_HELP}`;

function resolvePath(p) {
  if (!p) {
    if (!current) throw new Error('No figure is open. Call new_figure or open_figure with a path first.');
    return current;
  }
  return path.resolve(BASE, expandPath(p));
}

function load(p) {
  const file = resolvePath(p);
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  registerEmbeddedIcons(raw);
  return { file, doc: normalizeFigure(raw) };
}

/** Image paths: absolute, ~, next to the figure, or in the figures folder. */
function imagePath(p, figFile) {
  const q = expandPath(String(p));
  if (path.isAbsolute(q)) return q;
  const near = path.resolve(path.dirname(figFile), q);
  return fs.existsSync(near) ? near : path.resolve(BASE, q);
}

function save(file, doc) {
  embedUsedIcons(doc);
  embedUsedImages(doc);
  writeAtomic(file, JSON.stringify(doc, null, 2) + '\n');
}

async function selectionFor(file) {
  if (editor && editor.file === file) return editor.state.selection;
  for (let port = 5173; port < 5183; port++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/selection`, { signal: AbortSignal.timeout(400) });
      if (!res.ok) continue;
      const sel = await res.json();
      if (path.resolve(sel.file) === file) return sel;
    } catch { /* nothing on that port */ }
  }
  return null;
}

const text = (s) => ({ content: [{ type: 'text', text: s }] });
const fail = (s) => ({ content: [{ type: 'text', text: s }], isError: true });

function summary(doc, { brief = false } = {}) {
  const issues = lintFigure(doc);
  return `${brief ? '' : describeFigure(doc) + '\n\n'}Layout check: ${issues.length ? '\n' + formatIssues(issues) : 'no problems found.'}`;
}

function iconLine(i) {
  const roles = i.draw ? ` colors: ${Object.keys(i.colors || {}).map((k) => `${k}=${i.roles?.[k] || k}`).join(', ')}` : '';
  const lic = i.draw ? '' : ` [${i.license} · ${i.author}]`;
  return `${i.id} — ${i.name} (${i.category}, ${Math.round(i.size)}px default, aspect ${Math.round((i.h / i.w) * 100) / 100})${roles}${lic}`;
}

export async function startMcpServer({ packs = defaultPackPaths(ROOT) } = {}) {
  const loaded = loadPacks(packs);
  const mine = loadMyIcons();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const server = new McpServer({ name: 'fortheplot', version: pkg.version }, { instructions: INSTRUCTIONS });

  server.registerTool('search_icons', {
    title: 'Search icons',
    description: 'Find icons by keywords (e.g. "cd8 t cell", "antibody", "pd-l1", "mouse", "flow cytometer"). Returns icon ids to use in add ops. Built-in icons come first and are recolorable; Bioicons are prefixed "bioicons/".',
    inputSchema: {
      query: z.string().describe('Keywords; empty lists everything in the category'),
      category: z.string().optional().describe('Restrict to a category, e.g. "Immune cells", "Receptors & ligands", "Blood & Immunology"'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results (default 20)'),
      builtin_only: z.boolean().optional().describe('Only ForThePlot built-in (recolorable) icons'),
    },
  }, async ({ query, category, limit = 20, builtin_only = false }) => {
    let list = searchIcons(query || '', { category });
    if (builtin_only) list = list.filter((i) => i.draw);
    const shown = list.slice(0, limit);
    if (!shown.length) return text(`No icons match "${query}". Categories: ${categories().map((c) => c.name).join(', ')}`);
    return text(`${list.length} match(es); showing ${shown.length}:\n${shown.map(iconLine).join('\n')}`);
  });

  server.registerTool('new_figure', {
    title: 'New figure',
    description: 'Create a new figure file (JSON) and make it the current figure. Optionally start from a template: pd1-blockade, t-cell-activation, car-t-workflow, flow-cytometry-workflow, ebv-b-cell, tumor-model-study.',
    inputSchema: {
      path: z.string().describe('Where to save, e.g. "figures/pd1.json" (relative to FORTHEPLOT_DIR or the working directory)'),
      title: z.string().optional(),
      width: z.number().optional().describe('Canvas width in px (default 1200)'),
      height: z.number().optional().describe('Canvas height in px (default 800)'),
      background: z.string().optional().describe('Hex color or "none" for transparent'),
      template: z.string().optional(),
      overwrite: z.boolean().optional().describe('Replace an existing file (default false)'),
    },
  }, async ({ path: p, title, width, height, background, template, overwrite = false }) => {
    const file = path.resolve(BASE, expandPath(p));
    if (fs.existsSync(file) && !overwrite) return fail(`${file} already exists. Use open_figure, or pass overwrite: true.`);
    let doc;
    if (template) {
      const tpl = path.join(ROOT, 'examples', `${template}.json`);
      if (!fs.existsSync(tpl)) return fail(`Unknown template "${template}".`);
      doc = normalizeFigure(JSON.parse(fs.readFileSync(tpl, 'utf8')));
      if (title) doc.title = title;
    } else {
      doc = createFigure({ title: title || path.basename(file, '.json'), width, height, background });
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    save(file, doc);
    current = file;
    return text(`Created ${file}\n${describeFigure(doc)}`);
  });

  server.registerTool('open_figure', {
    title: 'Open figure',
    description: 'Make an existing figure file the current figure and describe it.',
    inputSchema: { path: z.string() },
  }, async ({ path: p }) => {
    try {
      const { file, doc } = load(p);
      current = file;
      return text(`Opened ${file}\n${summary(doc)}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('describe_figure', {
    title: 'Describe figure',
    description: 'List every element (id, type, position, size, label) in z-order, plus layout warnings. Re-read after a person edits the figure in the editor.',
    inputSchema: { path: z.string().optional(), json: z.boolean().optional().describe('Return the full figure JSON instead') },
  }, async ({ path: p, json = false }) => {
    try {
      const { file, doc } = load(p);
      if (json) return text(JSON.stringify(doc, null, 2));
      const sel = await selectionFor(file);
      const selLine = sel?.ids?.length ? `\n\nSelected in the editor right now: ${sel.ids.join(', ')}` : '';
      return text(`${file}\n${summary(doc)}${selLine}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('edit_figure', {
    title: 'Edit figure (ops)',
    description: `Apply a list of ops to the current (or given) figure and save it. All-or-nothing: if one op fails nothing changes and the error names the op.\n${OPS_HELP}`,
    inputSchema: {
      ops: z.array(z.record(z.string(), z.any())).describe('List of ops, e.g. [{"op":"add","element":{"id":"tcell","icon":"t-cell-cd8","cx":300,"cy":350,"w":200,"label":"CD8^+ T cell"}}]'),
      path: z.string().optional(),
    },
  }, async ({ ops, path: p }) => {
    try {
      const { file, doc } = load(p);
      await resolveImageFiles(ops, (q) => imagePath(q, file));
      const r = applyOps(doc, ops);
      if (r.error) return fail(`Nothing changed. ${r.error}`);
      save(file, r.doc);
      current = file;
      const made = r.results.filter((x) => x.op === 'add' || x.op === 'connect' || x.op === 'duplicate').flatMap((x) => x.ids);
      return text(`Applied ${ops.length} op(s) to ${path.basename(file)}.${made.length ? ` New ids: ${made.join(', ')}.` : ''}\n${summary(r.doc, { brief: true })}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('add_icon', {
    title: 'Add icon',
    description: 'Add one icon (shortcut for an add op). Position with cx/cy (center) or x/y, or near another element.',
    inputSchema: {
      icon: z.string().describe('Icon id from search_icons'),
      id: z.string().optional().describe('Readable id to refer to it later, e.g. "tumor"'),
      cx: z.number().optional(), cy: z.number().optional(), x: z.number().optional(), y: z.number().optional(),
      w: z.number().optional().describe('Width in px (height follows the aspect ratio)'),
      label: z.string().optional(),
      label_position: z.enum(['bottom', 'top', 'left', 'right', 'center']).optional(),
      colors: z.object({ primary: z.string().optional(), secondary: z.string().optional(), accent: z.string().optional() }).optional(),
      near: z.string().optional().describe('Place next to this element id'),
      side: z.enum(['right', 'left', 'above', 'below', 'center']).optional(),
      gap: z.number().optional(),
      rotation: z.number().optional(),
      path: z.string().optional(),
    },
  }, async (a) => {
    const el = { icon: a.icon, id: a.id, cx: a.cx, cy: a.cy, x: a.x, y: a.y, w: a.w, colors: a.colors, rotation: a.rotation };
    if (a.label) el.label = { text: a.label, position: a.label_position || 'bottom' };
    if (a.near) el.near = { id: a.near, side: a.side || 'right', gap: a.gap ?? 40 };
    for (const k of Object.keys(el)) if (el[k] == null) delete el[k];
    try {
      const { file, doc } = load(a.path);
      const r = applyOps(doc, [{ op: 'add', element: el }]);
      if (r.error) return fail(r.error);
      save(file, r.doc);
      const id = r.results[0].ids[0];
      const e = r.doc.elements.find((x) => x.id === id);
      return text(`Added ${id} (${getIcon(a.icon)?.name}) at (${Math.round(e.x)}, ${Math.round(e.y)}) size ${Math.round(e.w)}×${Math.round(e.h)}.\n${summary(r.doc, { brief: true })}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('connect', {
    title: 'Connect with an arrow',
    description: 'Draw an arrow between two elements (or points). head: arrow (activates), inhibit (blocks), open, circle (binds), diamond, none.',
    inputSchema: {
      from: z.union([z.string().describe("Element id"), z.array(z.number()).min(2).max(2).describe("[x, y] point")]),
      to: z.union([z.string().describe("Element id"), z.array(z.number()).min(2).max(2).describe("[x, y] point")]),
      head: z.enum(['arrow', 'open', 'inhibit', 'circle', 'diamond', 'none']).optional(),
      tail: z.enum(['arrow', 'open', 'inhibit', 'circle', 'diamond', 'none']).optional(),
      routing: z.enum(['straight', 'curved', 'elbow']).optional(),
      curvature: z.number().optional(),
      label: z.string().optional(),
      stroke: z.string().optional(), width: z.number().optional(),
      dash: z.enum(['solid', 'dashed', 'dotted']).optional(),
      from_anchor: z.string().optional(), to_anchor: z.string().optional(),
      id: z.string().optional(),
      path: z.string().optional(),
    },
  }, async (a) => {
    const end = (v, anchor) => (typeof v === 'string' ? { id: v, anchor: anchor || 'auto' } : v);
    const spec = { op: 'connect', id: a.id, from: end(a.from, a.from_anchor), to: end(a.to, a.to_anchor), head: a.head, tail: a.tail, routing: a.routing, curvature: a.curvature, label: a.label, stroke: a.stroke, width: a.width, dash: a.dash };
    for (const k of Object.keys(spec)) if (spec[k] == null) delete spec[k];
    try {
      const { file, doc } = load(a.path);
      const r = applyOps(doc, [spec]);
      if (r.error) return fail(r.error);
      save(file, r.doc);
      return text(`Added arrow ${r.results[0].ids[0]}.\n${summary(r.doc, { brief: true })}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('render_figure', {
    title: 'Render figure',
    description: 'Render the figure to a PNG image so you can see it, check the layout and fix problems. Optionally also save SVG/PNG to a path.',
    inputSchema: {
      path: z.string().optional(),
      max_width: z.number().optional().describe('Pixel width of the returned image (default 1200)'),
      crop: z.enum(['canvas', 'content']).optional(),
      save_to: z.string().optional().describe('Also write the render to this file (.png or .svg)'),
      scale: z.number().optional().describe('Scale for save_to PNG (default 2)'),
      show_notes: z.boolean().optional().describe('Draw sticky notes in the preview (default true; exports never include them)'),
    },
  }, async ({ path: p, max_width = 1200, crop = 'canvas', save_to, scale = 2, show_notes = true }) => {
    try {
      const { file, doc } = load(p);
      const svg = renderSVG(doc, { ids: false, crop, padding: crop === 'content' ? 20 : 0, notes: show_notes });
      const out = [];
      if (save_to) {
        const dest = path.resolve(BASE, expandPath(save_to));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const clean = renderSVG(doc, { ids: false, crop, padding: crop === 'content' ? 20 : 0 });
        if (dest.toLowerCase().endsWith('.svg')) fs.writeFileSync(dest, clean);
        else fs.writeFileSync(dest, await svgToPng(clean, { scale }));
        out.push(`Saved ${dest}`);
      }
      out.push(summary(doc, { brief: true }));
      if (!(await pngAvailable())) {
        return text(`${path.basename(file)}: PNG preview isn't available on this system, so here is the SVG.\n${out.join('\n')}\n\n${svg.length > 60000 ? svg.slice(0, 60000) + '…' : svg}`);
      }
      const png = await svgToPng(svg, { width: Math.min(max_width, Math.round(doc.canvas.width * 2)) });
      return { content: [{ type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' }, { type: 'text', text: `${path.basename(file)}: ${out.join('\n')}` }] };
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('export_figure', {
    title: 'Export figure',
    description: 'Write the figure as vector PDF or SVG (for journals, Illustrator, Inkscape), TIFF or PNG (with dpi), editable PowerPoint (.pptx), or JSON. With a journal preset or width_mm, it sizes the output physically, checks that text prints at a legal size, and returns the credit line for third-party icons. Presets: nature-1col (89 mm), nature-1.5col (120), nature-1.5col-wide (136), nature-2col (183), jci-min (90), jci-max (180), slide-16x9.',
    inputSchema: {
      to: z.string().describe('Output path ending in .pdf, .svg, .tiff, .png, .pptx or .json'),
      path: z.string().optional(),
      journal: z.string().optional().describe('Journal preset id, e.g. "nature-2col"'),
      width_mm: z.number().optional().describe('Physical width in mm (overrides the preset width)'),
      dpi: z.number().optional().describe('Resolution for TIFF/PNG (default from preset, else 300)'),
      scale: z.number().optional().describe('PNG/TIFF scale when no width is given (default 2)'),
      crop: z.enum(['canvas', 'content']).optional(),
    },
  }, async ({ to, path: p, journal, width_mm, dpi, scale, crop = 'canvas' }) => {
    try {
      const { doc } = load(p);
      const dest = path.resolve(BASE, expandPath(to));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const { exportFigure, formatFromPath, describeExport } = await import('../node/export.js');
      const r = await exportFigure(doc, { format: formatFromPath(dest), journal, widthMm: width_mm, dpi, scale, crop });
      fs.writeFileSync(dest, r.data);
      const info = describeExport(r);
      return text(`Wrote ${dest}${info ? '\n' + info : ''}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('get_selection', {
    title: "See what the person selected",
    description: 'What the person has selected in the open editor right now (call this when they say "this", "these", "the selected…"), plus their open sticky notes.',
    inputSchema: { path: z.string().optional() },
  }, async ({ path: p }) => {
    try {
      const { file, doc } = load(p);
      const sel = await selectionFor(file);
      const lines = [];
      if (!sel) lines.push('The editor is not open for this figure (call open_editor), so there is no selection to read.');
      else if (!sel.ids.length) lines.push('Nothing is selected in the editor.');
      else {
        lines.push(`Selected (${sel.ids.length}):`);
        const desc = describeFigure({ ...doc, elements: doc.elements.filter((e) => sel.ids.includes(e.id)) }).split('\n').slice(1);
        lines.push(...desc);
      }
      const notes = doc.elements.filter((e) => e.type === 'note' && !e.resolved);
      if (notes.length) {
        lines.push('', 'Open sticky notes:');
        for (const nn of notes) lines.push(`- ${nn.id} (${nn.author === 'claude' ? 'yours' : 'from the person'})${nn.target ? ` on ${nn.target}` : ''}: "${nn.text}"`);
      }
      return text(lines.join('\n'));
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('add_block', {
    title: 'Add a building block',
    description: 'Draw a whole motif in one step: "synapse" (two cells with receptor–ligand pairs that meet), "pathway" (signaling cascade), "timeline" (experiment schedule), or "gating" (flow cytometry gating strategy). spec takes the same fields as the matching op in edit_figure. Returns the new ids; then render_figure and refine.',
    inputSchema: {
      kind: z.enum(['synapse', 'pathway', 'timeline', 'gating']),
      spec: z.record(z.string(), z.any()).describe('e.g. synapse: {"left":"t-cell-cd8","right":"tumor-cell","pairs":[["tcr","mhc-i"],["pd-1","pd-l1"]],"legend":true}'),
      path: z.string().optional(),
    },
  }, async ({ kind, spec, path: p }) => {
    try {
      const { file, doc } = load(p);
      const ops = blockOps(doc, { ...spec, op: kind });
      const r = applyOps(doc, ops);
      if (r.error) return fail(`Nothing changed. ${r.error}`);
      save(file, r.doc);
      const moved = ops.length > 1 ? ' It was placed below the existing content so nothing is covered (pass cx/cy or x/y to choose the spot).' : '';
      return text(`Added ${kind} (${r.results[0].ids.length} elements): ${r.results[0].ids.join(', ')}.${moved}\n${summary(r.doc, { brief: true })}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('add_image', {
    title: 'Add a picture',
    description: 'Put a micrograph, western blot, gel or real flow cytometry plot into the figure from a file (PNG, JPEG, TIFF, GIF or WebP; TIFF is converted). The picture is embedded in the figure file. Optionally crop it and add a scale bar.',
    inputSchema: {
      file: z.string().describe('Image path: absolute, ~/…, next to the figure, or in the figures folder'),
      id: z.string().optional(),
      cx: z.number().optional(), cy: z.number().optional(), x: z.number().optional(), y: z.number().optional(),
      w: z.number().optional().describe('Width in px (height follows the aspect ratio); default up to 480'),
      crop: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional().describe('Visible part as fractions 0–1 of the original'),
      label: z.string().optional(),
      scale_bar: z.object({
        length: z.number().describe('Bar length, e.g. 20'),
        unit: z.string().optional().describe('µm (default), nm or mm'),
        per_px: z.number().describe('Units per pixel of the original image, e.g. 0.325 µm/px'),
        position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
        color: z.string().optional(),
      }).optional(),
      radius: z.number().optional().describe('Rounded corners in px'),
      path: z.string().optional(),
    },
  }, async (a) => {
    try {
      const { file, doc } = load(a.path);
      const img = await loadImageFile(imagePath(a.file, file));
      const el = { type: 'image', src: img.src, name: img.name, id: a.id, cx: a.cx, cy: a.cy, x: a.x, y: a.y, w: a.w, crop: a.crop, label: a.label, radius: a.radius };
      if (a.scale_bar) el.scaleBar = { length: a.scale_bar.length, unit: a.scale_bar.unit || 'µm', perPx: a.scale_bar.per_px, position: a.scale_bar.position, color: a.scale_bar.color };
      for (const k of Object.keys(el)) if (el[k] == null) delete el[k];
      if (el.cx == null && el.x == null) el.cx = doc.canvas.width / 2;
      if (el.cy == null && el.y == null) el.cy = doc.canvas.height / 2;
      const r = applyOps(doc, [{ op: 'add', element: el }]);
      if (r.error) return fail(`Nothing changed. ${r.error}`);
      save(file, r.doc);
      current = file;
      const e = r.doc.elements.find((x) => x.id === r.results[0].ids[0]);
      return text(`Added image ${e.id} ("${img.name}", ${img.w}×${img.h} px) at (${Math.round(e.x)}, ${Math.round(e.y)}) size ${Math.round(e.w)}×${Math.round(e.h)}.\n${summary(r.doc, { brief: true })}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('add_prism_graph', {
    title: 'Add a linked Prism graph',
    description: 'Put a graph from a GraphPad Prism file (.prism, .pzfx) into the figure, linked to its source. On Windows with Prism installed, ForThePlot exports the graph with Prism itself (as vector SVG) and again whenever the Prism file is saved, while the editor is open; double-clicking it in the editor opens the file in Prism. Without Prism (or on a Mac), pass `file` = a picture the person exported from Prism (SVG best); ForThePlot watches it and updates when it is exported again. Pick the graph by name or number (list_prism_graphs shows them); the link follows the graph if it is later moved in Prism.',
    inputSchema: {
      file: z.string().describe('Prism file, or an exported picture (SVG, PNG, TIFF). Absolute, ~/…, or relative to the figure'),
      graph: z.union([z.number(), z.string()]).optional().describe('Which graph: its name as in Prism (e.g. "H1 Redone"), or its number in Prism\'s Graphs list (1 = first). list_prism_graphs shows them.'),
      layout: z.boolean().optional().describe('Take a layout (multi-graph page) instead of a graph'),
      picture: z.string().optional().describe('With a Prism file: a picture you exported from it, to watch instead of exporting automatically'),
      id: z.string().optional(),
      cx: z.number().optional(), cy: z.number().optional(), x: z.number().optional(), y: z.number().optional(),
      w: z.number().optional().describe('Width in px (height follows); default 420'),
      label: z.string().optional(),
      path: z.string().optional(),
    },
  }, async (a) => {
    try {
      const { file, doc } = load(a.path);
      const { el, img } = await linkedElement({ file: imagePath(a.file, file), graph: a.graph, layout: a.layout, picture: a.picture ? imagePath(a.picture, file) : undefined }, file);
      Object.assign(el, { id: a.id || newId(doc, suggestId(el.link)), cx: a.cx, cy: a.cy, x: a.x, y: a.y, w: a.w ?? 420, label: a.label });
      for (const k of Object.keys(el)) if (el[k] == null) delete el[k];
      if (el.cx == null && el.x == null) el.cx = doc.canvas.width / 2;
      if (el.cy == null && el.y == null) el.cy = doc.canvas.height / 2;
      const r = applyOps(doc, [{ op: 'add', element: el }]);
      if (r.error) return fail(`Nothing changed. ${r.error}`);
      save(file, r.doc);
      current = file;
      const e = r.doc.elements.find((x) => x.id === r.results[0].ids[0]);
      const how = e.link.picture ? 'It updates when that picture is exported again.' : 'It updates when the Prism file is saved (while the editor is open), or call refresh_links.';
      return text(`Added ${e.id}: ${linkSummary(e.link)} (${img.w}×${img.h}${/svg/.test(img.src.slice(0, 30)) ? ', vector' : ' px'}) at (${Math.round(e.x)}, ${Math.round(e.y)}) size ${Math.round(e.w)}×${Math.round(e.h)}. ${how} Double-clicking it in the editor opens it in Prism.\n${summary(r.doc, { brief: true })}`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('list_prism_graphs', {
    title: 'List the graphs in a Prism file',
    description: 'Show the graphs (and layouts) in a .prism file by number and name, in Prism\'s own order, so you can pick one for add_prism_graph.',
    inputSchema: { file: z.string().describe('Path to the .prism file'), path: z.string().optional() },
  }, async ({ file: f, path: p }) => {
    try {
      let base = BASE;
      try { base = path.dirname(resolvePath(p)); } catch { /* no figure open */ }
      const abs = path.isAbsolute(expandPath(f)) ? expandPath(f) : (fs.existsSync(path.resolve(base, f)) ? path.resolve(base, f) : path.resolve(BASE, f));
      if (!fs.existsSync(abs)) return fail(`File not found: ${abs}`);
      const c = await prismContents(abs);
      if (!c) return text(`${path.basename(abs)} is not a .prism file, so its graph names can't be read; use graph numbers as shown in Prism's Graphs list.`);
      const lines = [`${path.basename(abs)}: ${c.graphs.length} graph(s)${c.layouts.length ? `, ${c.layouts.length} layout(s)` : ''}`];
      for (const g of c.graphs) lines.push(`graph ${g.n}: ${g.title || '(untitled)'}`);
      for (const g of c.layouts) lines.push(`layout ${g.n}: ${g.title || '(untitled)'}`);
      return text(lines.join('\n'));
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('refresh_links', {
    title: 'Update linked graphs',
    description: 'Re-export linked Prism graphs (and re-read linked pictures) whose source changed since the last update; force=true updates all of them.',
    inputSchema: { ids: z.array(z.string()).optional(), force: z.boolean().optional(), path: z.string().optional() },
  }, async ({ ids, force = false, path: p }) => {
    try {
      const { file, doc } = load(p);
      const res = await refreshLinks(doc, file, { ids: ids || null, force });
      if (res.some((r) => r.ok)) save(file, doc);
      if (!res.length) return text(doc.elements.some((e) => e.link) ? 'All linked graphs are up to date.' : 'This figure has no linked graphs.');
      return text(res.map((r) => (r.ok ? `Updated ${r.id}` : `Could not update ${r.id}: ${r.error}`)).join('\n'));
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('open_in_prism', {
    title: 'Open a linked graph in Prism',
    description: 'Open the Prism file (or picture) behind a linked graph on the person\'s computer so they can edit it.',
    inputSchema: { id: z.string(), path: z.string().optional() },
  }, async ({ id, path: p }) => {
    try {
      const { file, doc } = load(p);
      const target = openLink(doc, id, file);
      return text(`Opened ${target}. When it is saved${findPrism() ? '' : ' and exported again'}, the graph updates in the editor (or call refresh_links).`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('save_as_icon', {
    title: 'Save as icon',
    description: 'Save objects from the current figure as one reusable icon in "My icons" (e.g. a custom cell built from shapes, a receptor complex, a labelled organoid). What is attached to them, what is inside selected panels and arrows between them come along. The icon can then be added to any figure with add_icon (id "my/…"), resized and recolored with tint or colorMap; search_icons finds it. Credits of third-party icons used in it are kept.',
    inputSchema: {
      ids: z.array(z.string()).min(1).describe('Elements to include (use get_selection for what the person selected)'),
      name: z.string().describe('Icon name, e.g. "Activated macrophage"'),
      category: z.string().optional().describe('Library category (default "My icons")'),
      tags: z.array(z.string()).optional().describe('Search words'),
      replace_selection: z.boolean().optional().describe('Also replace those objects in the figure with the new icon (default false)'),
      path: z.string().optional(),
    },
  }, async ({ ids, name, category, tags = [], replace_selection = false, path: p }) => {
    try {
      const { file, doc } = load(p);
      const def = iconFromElements(doc, ids, { name, category, tags });
      const fullId = saveMyIcon(def);
      let note = '';
      if (replace_selection) {
        const r = applyOps(doc, replaceWithIconOps(doc, ids, fullId, def));
        if (r.error) return fail(`Saved ${fullId}, but could not replace the objects: ${r.error}`);
        save(file, r.doc);
        note = ` Replaced them in the figure with ${r.results[1].ids[0]}.`;
      }
      const credits = def.credits.length ? ` It credits ${def.credits.map((c) => `${c.author} (${c.license})`).join('; ')}.` : '';
      return text(`Saved icon ${fullId} "${def.name}" (${Math.round(def.w)}×${Math.round(def.h)} px) to ${myIconsFile()}.${note}${credits} Add it with add_icon {icon: "${fullId}"}.`);
    } catch (err) { return fail(err.message); }
  });

  server.registerTool('open_editor', {
    title: 'Open in the editor',
    description: 'Start the ForThePlot editor for the current figure and return its local URL. Give the URL to the person: their edits save to the same file, and your later edits appear in their browser live.',
    inputSchema: { path: z.string().optional(), port: z.number().optional() },
  }, async ({ path: p, port = 5173 }) => {
    try {
      const file = resolvePath(p);
      if (editor && editor.file === file) return text(`Editor already running: ${editor.url}`);
      if (editor) await editor.close();
      let lastErr;
      for (let k = 0; k < 10; k++) {
        try { editor = await serve({ file, port: port + k, quiet: true }); break; } catch (err) { lastErr = err; }
      }
      if (!editor) throw lastErr;
      current = file;
      return text(`Editor running at ${editor.url} for ${file}. Edits sync both ways while this MCP server runs.`);
    } catch (err) { return fail(err.message); }
  });

  await server.connect(new StdioServerTransport());
  console.error(`ForThePlot MCP server ready: ${loaded.reduce((s, x) => s + x.count, 0)} pack icons, ${mine.icons.length} of your own, ${OP_NAMES.length} ops, figures in ${BASE}, PNG ${(await pngAvailable()) ? 'on' : 'off'}.`);
  return server;
}
