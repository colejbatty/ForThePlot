// Editor entry point: layout, top bar, keyboard shortcuts and the window.fortheplot API.

import { S, on, emit, setDoc, runOps, undo, redo, select, selected, setTool, commit, exportDoc } from './state.js';
import { h, $, glyph, toast, button } from './ui.js';
import { initStage, initInlineEditor, fitView, zoomBy, renderAll, addItemAt, startInlineEdit, viewCenter, stageSvg, stageKey } from './stage.js';
import { importImageFile, isImageFile } from './images.js';
import { openLinkDialog } from './link-dialog.js';
import { initLibrary, render as renderLibrary, ensureFigureIcons } from './library.js';
import { loadMyIcons, saveSvgAsMyIcon } from './myicons.js';
import { initInspector } from './inspector.js';
import { initIO, exportSVG, exportJSON, exportPNG, copyText, creditsText, figureSVG, openFile, loadAutosave, connectServer, server, saveFile } from './io.js';
import { openExportDialog } from './export-dialog.js';
import { TEMPLATES } from './templates.js';
import {
  createFigure, describeFigure, lintFigure, formatIssues, searchIcons, findElement, newId, clone, registerIcon, registerPack, unwrapSvg, getIcon, OP_NAMES,
} from '../core/index.js';

const TOOLS = [
  ['select', 'Select (V)', 'select', 'v'],
  ['hand', 'Pan (H or hold Space)', 'hand', 'h'],
  ['text', 'Text (T)', 'text', 't'],
  ['arrow', 'Arrow (A): drag from one element to another', 'arrow', 'a'],
  ['rect', 'Box (R)', 'rect', 'r'],
  ['ellipse', 'Ellipse (E)', 'ellipse', 'e'],
  ['membrane', 'Membrane (M)', 'membrane', 'm'],
  ['pen', 'Pen (P): click for corners, drag for curves; click the first point to close, Enter to finish', 'pen', 'p'],
  ['pencil', 'Pencil (B): draw freehand; end where you started for a closed shape', 'pencil', 'b'],
  ['note', 'Sticky note (N): click an element to leave a note for yourself or Claude', 'note', 'n'],
];

function buildTopbar() {
  const bar = $('#topbar');
  const title = h('input', { type: 'text', id: 'doc-title', class: 'doc-title', 'aria-label': 'Figure title', spellcheck: 'false' });
  title.addEventListener('input', () => { S.doc.title = title.value; commit({ coalesce: 'title', source: 'title' }); });
  title.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') title.blur(); });
  on('doc', (d) => { if (d?.source !== 'title' && document.activeElement !== title) title.value = S.doc.title || ''; });

  const fileInput = h('input', { type: 'file', id: 'open-file', accept: '.json,.svg,application/json,image/svg+xml', hidden: true });
  fileInput.addEventListener('change', () => { if (fileInput.files?.[0]) openFile(fileInput.files[0]); fileInput.value = ''; });
  const imageInput = h('input', { type: 'file', id: 'import-image', accept: 'image/png,image/jpeg,image/gif,image/webp,image/tiff,image/svg+xml,.tif,.tiff,.svg', multiple: true, hidden: true });
  imageInput.addEventListener('change', async () => { for (const f of [...(imageInput.files || [])]) await importImageFile(f); imageInput.value = ''; });

  const menu = (label, items) => {
    const d = h('details', { class: 'menu' }, h('summary', { class: 'btn' }, label, h('span', { class: 'caret', 'aria-hidden': 'true' }, '▾')));
    const list = h('div', { class: 'menu-list', role: 'menu' });
    for (const it of items) {
      if (it === '-') { list.append(h('hr')); continue; }
      const b = h('button', { type: 'button', role: 'menuitem', class: 'menu-item' }, h('span', {}, it[0]), it[2] ? h('kbd', {}, it[2]) : null);
      b.addEventListener('click', () => { d.open = false; it[1](); });
      list.append(b);
    }
    d.append(list);
    d.addEventListener('toggle', () => { if (d.open) document.querySelectorAll('details.menu[open]').forEach((o) => { if (o !== d) o.open = false; }); });
    return d;
  };

  const fileMenu = menu('File', [
    ['New figure', newFigure],
    ['Open… (.json figure, .svg icon)', () => fileInput.click(), 'Ctrl+O'],
    ['Save figure (.json)', exportJSON, 'Ctrl+S'],
    ['Import image… (micrograph, blot, flow plot)', () => imageInput.click()],
    ['Add Prism graph… (stays linked)', openLinkDialog],
    '-',
    ['Export for publication…', openExportDialog, 'Ctrl+E'],
    ['Export SVG', exportSVG],
    ['Export PNG (1×)', () => exportPNG(1)],
    ['Export PNG (2×, slides)', () => exportPNG(2)],
    ['Export PNG (4×, print)', () => exportPNG(4)],
    '-',
    ['Copy SVG', () => copyText(figureSVG(), 'SVG')],
    ['Copy figure JSON', () => copyText(JSON.stringify(exportDoc(), null, 2), 'figure JSON')],
    ['Copy icon credits', () => copyText(creditsText(), 'credits')],
  ]);
  const agentMenu = menu('Agent', [
    ['Apply ops (JSON)…', openOpsDialog],
    ['Copy figure summary for an AI', () => copyText(agentBrief(), 'figure summary')],
    ['Check layout', () => toast(formatIssues(lintFigure(S.doc)).split('\n').slice(0, 4).join('  ·  '))],
    ['Tidy overlapping items', () => { const r = runOps([{ op: 'tidy', ids: S.sel.length > 1 ? S.sel : undefined }]); if (!r.error) toast(`Moved ${r.results[0].ids.length} item(s) apart`); }],
    '-',
    ['Show / hide sticky notes', () => { S.showNotes = S.showNotes === false; renderAll(); toast(S.showNotes === false ? 'Notes hidden' : 'Notes shown'); }],
  ]);

  const zoomLabel = h('button', { type: 'button', class: 'btn zoom-label', title: 'Fit to screen (Ctrl+0)' }, '100%');
  zoomLabel.addEventListener('click', () => fitView());
  on('zoom', (z) => { zoomLabel.textContent = `${Math.round(z * 100)}%`; });

  const gridBtn = button('', { icon: 'grid', title: 'Snap to grid (G)', cls: 'icon-only', onClick: () => { S.grid = !S.grid; gridBtn.classList.toggle('on', S.grid); renderAll(); } });

  const sync = h('span', { class: 'sync', id: 'sync', hidden: !server.enabled });
  on('sync', () => {
    sync.hidden = !server.enabled;
    sync.dataset.state = server.error ? 'error' : server.saving ? 'saving' : server.connected ? 'live' : 'off';
    sync.textContent = server.error ? 'Sync error' : server.saving ? 'Saving…' : server.connected ? `Live · ${server.file || 'figure.json'}` : 'Reconnecting…';
    sync.title = server.error || 'Edits save to the figure file; agent edits to the file appear here live.';
  });

  const libToggle = button('', { icon: 'panel', title: 'Library', cls: 'icon-only only-narrow', onClick: () => document.body.classList.toggle('show-left') });
  const propToggle = button('', { icon: 'sliders', title: 'Properties', cls: 'icon-only only-narrow', onClick: () => document.body.classList.toggle('show-right') });

  bar.append(
    h('div', { class: 'brand' }, h('span', { class: 'logo-badge', title: 'ForThePlot (4tP)', 'aria-hidden': 'true' }, '4tP'), h('span', { class: 'brand-name' }, 'ForThePlot')),
    libToggle,
    title,
    h('div', { class: 'bar-group' }, fileMenu, agentMenu, fileInput, imageInput),
    h('div', { class: 'bar-group' },
      button('', { icon: 'undo', title: 'Undo (Ctrl+Z)', cls: 'icon-only', id: 'undo-btn', onClick: undo }),
      button('', { icon: 'redo', title: 'Redo (Ctrl+Shift+Z)', cls: 'icon-only', id: 'redo-btn', onClick: redo }),
    ),
    h('div', { class: 'spacer' }),
    sync,
    h('div', { class: 'bar-group zoom' },
      button('', { icon: 'minus', title: 'Zoom out (Ctrl+−)', cls: 'icon-only', onClick: () => zoomBy(1 / 1.2) }),
      zoomLabel,
      button('', { icon: 'plus', title: 'Zoom in (Ctrl+=)', cls: 'icon-only', onClick: () => zoomBy(1.2) }),
      gridBtn,
    ),
    propToggle,
  );
  on('doc', () => {
    $('#undo-btn').disabled = !S.undo.length;
    $('#redo-btn').disabled = !S.redo.length;
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('details.menu')) document.querySelectorAll('details.menu[open]').forEach((d) => { d.open = false; });
  });
}

function buildToolbar() {
  const tb = $('#tools');
  for (const [id, title, icon] of TOOLS) {
    const b = h('button', { type: 'button', class: 'tool', 'data-tool': id, title, 'aria-label': title }, glyph(icon, 19));
    b.addEventListener('click', () => setTool(id));
    tb.append(b);
  }
  const mark = () => tb.querySelectorAll('.tool').forEach((b) => { b.classList.toggle('on', b.dataset.tool === S.tool); b.setAttribute('aria-pressed', String(b.dataset.tool === S.tool)); });
  on('tool', mark);
  mark();
}

function newFigure() {
  setDoc(createFigure({ title: 'Untitled figure' }), { keepHistory: true, source: 'new' });
  fitView();
  toast('New figure. Undo (Ctrl+Z) brings back the previous one.');
}

function agentBrief() {
  return [
    'Here is my ForThePlot figure. Reply with a JSON array of ForThePlot ops that I can paste into Agent → Apply ops.',
    `Ops: ${OP_NAMES.join(', ')}. Icons are referenced by id; elements by their id below.`,
    S.sel.length ? `I have selected: ${S.sel.join(', ')}.` : '',
    '',
    describeFigure(S.doc),
  ].filter((x) => x !== null).join('\n');
}

// ---- Ops console ---------------------------------------------------------------------

function openOpsDialog() {
  let dlg = $('#ops-dialog');
  if (!dlg) {
    const ta = h('textarea', { id: 'ops-text', rows: 14, spellcheck: 'false', placeholder: '[\n  { "op": "add", "element": { "icon": "t-cell-cd8", "cx": 300, "cy": 300, "label": "CD8^+ T cell" } }\n]' });
    ta.addEventListener('keydown', (e) => e.stopPropagation());
    const out = h('pre', { class: 'ops-out', id: 'ops-out' });
    const apply = button('Apply', {
      cls: 'primary',
      onClick: () => {
        try {
          let ops = JSON.parse(ta.value);
          if (!Array.isArray(ops)) ops = ops.ops || [ops];
          const r = runOps(ops, { select: true });
          out.textContent = r.error ? `Error: ${r.error}` : `Applied ${ops.length} op(s).\n${formatIssues(lintFigure(S.doc))}`;
          out.dataset.kind = r.error ? 'error' : 'ok';
        } catch (err) {
          out.textContent = `Not valid JSON: ${err.message}`;
          out.dataset.kind = 'error';
        }
      },
    });
    const close = button('Close', { onClick: () => dlg.close() });
    dlg = h('dialog', { id: 'ops-dialog', class: 'dialog' },
      h('h2', {}, 'Apply ops'),
      h('p', { class: 'hint' }, 'Paste a JSON array of ops, the same commands the CLI and MCP server accept. Everything applies as one undo step.'),
      ta, out, h('div', { class: 'dialog-actions' }, close, apply));
    document.body.append(dlg);
  }
  dlg.showModal();
}

// ---- Clipboard ----------------------------------------------------------------------------

function copySel(cut = false) {
  const els = selected();
  if (!els.length) return;
  const ids = new Set(els.map((e) => e.id));
  // include arrows whose both ends are in the selection
  for (const e of S.doc.elements) if (e.type === 'arrow' && ids.has(e.from?.id) && ids.has(e.to?.id)) ids.add(e.id);
  S.clipboard = S.doc.elements.filter((e) => ids.has(e.id)).map(clone);
  S.pasteCount = 0;
  try { navigator.clipboard?.writeText(JSON.stringify({ fortheplotClipboard: 1, elements: S.clipboard })).catch(() => {}); } catch { /* ignore */ }
  if (cut) { runOps([{ op: 'remove', ids: [...ids] }]); select([]); }
}

function paste(elements = S.clipboard) {
  if (!elements?.length) return;
  S.pasteCount = (S.pasteCount || 0) + 1;
  const off = 24 * S.pasteCount;
  const map = new Map();
  const add = [];
  const work = { elements: [...S.doc.elements] };
  for (const e of elements) {
    const c = clone(e);
    c.id = newId(work, e.id.replace(/-\d+$/, ''));
    work.elements.push(c);
    map.set(e.id, c.id);
    add.push(c);
  }
  for (const c of add) {
    if (c.type === 'arrow') {
      for (const end of ['from', 'to']) {
        if (c[end]?.id != null) c[end].id = map.get(c[end].id) || c[end].id;
        else if (c[end]) { c[end].x += off; c[end].y += off; }
      }
    } else { c.x += off; c.y += off; }
    if (c.group) c.group = `${c.group}-p${S.pasteCount}`;
  }
  runOps([{ op: 'add', elements: add.filter((c) => c.type !== 'arrow' || (c.from.id == null || findElement(S.doc, c.from.id) || map.has(c.from.id))) }], { select: true });
}

// ---- Keyboard ------------------------------------------------------------------------------

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

function onKey(e) {
  if (isTyping(e) || $('#ops-dialog')?.open || $('#export-dialog')?.open || $('#link-dialog')?.open) return;
  if (!e.ctrlKey && !e.metaKey && stageKey(e)) { e.preventDefault(); return; }
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && k === 's') { e.preventDefault(); if (server.enabled) toast('Saved automatically to ' + (server.file || 'the figure file')); else exportJSON(); return; }
  if (mod && k === 'o') { e.preventDefault(); $('#open-file').click(); return; }
  if (mod && k === 'e') { e.preventDefault(); openExportDialog(); return; }
  if (mod && k === 'a') { e.preventDefault(); select(S.doc.elements.filter((x) => !x.locked).map((x) => x.id), { groups: false }); return; }
  if (mod && k === 'c') { copySel(false); return; }
  if (mod && k === 'x') { copySel(true); return; }
  if (mod && k === 'v') { if (S.clipboard) { e.preventDefault(); paste(); } return; }
  if (mod && k === 'd') { e.preventDefault(); if (S.sel.length) runOps([{ op: 'duplicate', ids: S.sel }], { select: true }); return; }
  if (mod && k === 'g') { e.preventDefault(); if (S.sel.length) runOps([{ op: e.shiftKey ? 'ungroup' : 'group', ids: S.sel }]); return; }
  if (mod && (k === '=' || k === '+')) { e.preventDefault(); zoomBy(1.2); return; }
  if (mod && k === '-') { e.preventDefault(); zoomBy(1 / 1.2); return; }
  if (mod && k === '0') { e.preventDefault(); fitView(); return; }
  if (mod) return;
  if (k === 'delete' || k === 'backspace') { if (S.sel.length) { e.preventDefault(); runOps([{ op: 'remove', ids: S.sel }]); select([]); } return; }
  if (k === 'escape') { if (S.tool !== 'select') setTool('select'); else select([]); document.body.classList.remove('show-left', 'show-right'); return; }
  if (k === 'enter' && S.sel.length === 1) { e.preventDefault(); startInlineEdit(S.sel[0], true); return; }
  if (k === ']') { if (S.sel.length) runOps([{ op: 'order', ids: S.sel, to: e.shiftKey ? 'front' : 'forward' }]); return; }
  if (k === '[') { if (S.sel.length) runOps([{ op: 'order', ids: S.sel, to: e.shiftKey ? 'back' : 'backward' }]); return; }
  if (k.startsWith('arrow') && S.sel.length) {
    e.preventDefault();
    const d = e.shiftKey ? 10 : 1;
    const dx = k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0, dy = k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0;
    runOps([{ op: 'move', ids: S.sel, dx, dy }], { coalesce: 'nudge' });
    return;
  }
  if (k === 'g') { S.grid = !S.grid; document.querySelector('[title^="Snap to grid"]')?.classList.toggle('on', S.grid); renderAll(); return; }
  const tool = TOOLS.find((t) => t[3] === k);
  if (tool) setTool(tool[0]);
}

// ---- Dropped files & SVG import ------------------------------------------------------------

async function importSvgIcon({ name, text }, at) {
  const { w, h: hh, svg } = unwrapSvg(text);
  let id;
  try {
    id = await saveSvgAsMyIcon({ name, w, h: hh, svg });
  } catch {
    // couldn't keep it in My icons: still use it in this figure
    id = `custom/${name.replace(/\.svg$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    registerIcon({ id, name: name.replace(/\.svg$/i, ''), category: 'My icons', w, h: hh, svg, size: 120, license: 'Your own', author: 'You', pack: 'My icons', own: true, credits: [] });
  }
  addItemAt({ kind: 'icon', id }, at);
  renderLibrary();
  toast(`Added ${name} as an icon and kept it in My icons (library → Mine).`);
}

// ---- Public API for scripts and browser agents ---------------------------------------------

function exposeApi() {
  window.fortheplot = {
    get figure() { return exportDoc(); },
    setFigure(doc) { setDoc(doc, { keepHistory: true, source: 'api' }); fitView(); },
    apply(ops) { const r = runOps(Array.isArray(ops) ? ops : [ops], { select: true }); return { ok: !r.error, error: r.error, results: r.results }; },
    select(ids) { select(ids); },
    get selection() { return [...S.sel]; },
    svg() { return figureSVG(); },
    describe() { return describeFigure(S.doc); },
    lint() { return lintFigure(S.doc); },
    icons(q, limit = 20) { return searchIcons(q, { limit }).map((i) => ({ id: i.id, name: i.name, category: i.category, license: i.license })); },
    undo, redo,
  };
  window.epitope = window.fortheplot; // the name before the rename
}

// ---- Boot -------------------------------------------------------------------------------------

export async function boot() {
  buildTopbar();
  buildToolbar();
  initStage($('#stage-wrap'));
  initInlineEditor();
  initLibrary($('#library'));
  initInspector($('#inspector'));
  initIO();
  exposeApi();
  window.addEventListener('keydown', onKey);
  on('toast', (t) => toast(t.text, t.kind));
  on('drop-item', ({ item, at }) => addItemAt(item, at));
  on('drop-files', async ({ files, at }) => {
    for (const file of files) {
      if (/\.svg$/i.test(file.name)) importSvgIcon({ name: file.name, text: await file.text() }, at);
      else if (isImageFile(file)) await importImageFile(file, at);
      else await openFile(file);
    }
  });
  on('import-svg', (x) => importSvgIcon(x));
  on('load-pack', (pack) => { registerPack(pack); renderLibrary(); toast(`Loaded ${pack.icons.length} icons from ${pack.name}`); });
  document.addEventListener('paste', (e) => {
    if (isTyping(e)) return;
    const pic = [...(e.clipboardData?.files || [])].find((f) => isImageFile(f) || /^image\//.test(f.type));
    if (pic) { e.preventDefault(); importImageFile(pic); return; }
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    try {
      const data = JSON.parse(text);
      if (data.fortheplotClipboard || data.epitopeClipboard) { e.preventDefault(); paste(data.elements); }
      else if (Array.isArray(data) && data[0]?.op) { e.preventDefault(); runOps(data, { select: true }); toast(`Applied ${data.length} pasted op(s)`); }
      else if (data.elements && data.canvas) { e.preventDefault(); setDoc(data, { keepHistory: true, source: 'paste' }); fitView(); }
    } catch { /* not ours */ }
  });

  if (server.enabled) {
    setDoc(createFigure(), { source: 'remote' });
    await connectServer();
    emit('sync');
  } else {
    const saved = loadAutosave();
    const start = saved && saved.elements?.length ? saved : TEMPLATES[0].figure;
    setDoc(start, { source: 'remote' });
    if (saved?.elements?.length && (await ensureFigureIcons(saved))) setDoc(saved, { source: 'remote' });
  }
  loadMyIcons();
  requestAnimationFrame(() => fitView());
  document.body.classList.add('ready');
}
