// Left panel: icon library (built-in + Bioicons + loaded packs), shapes and templates.

import { S, on, setDoc, runOps } from './state.js';
import { h, glyph, toast, button } from './ui.js';
import { addItemAt, fitView } from './stage.js';
import { allIcons, searchIcons, getIcon, categories, registerPack, iconColors, renderSVG, normalizeFigure, applyOps, createFigure, contentBounds, blockOps } from '../core/index.js';
import { iconMarkup } from '../icons/registry.js';
import { TEMPLATES } from './templates.js';
import { myIconDefs, myIconsWhere, removeMyIcon, renameMyIcon, exportMyIcons, importMyIcons } from './myicons.js';

let root, grid, search, chips, tabs, foot;
let tab = 'icons';
let cat = null;
let grp = null;
let limit = 120;

// ---- Bioicons (lazy) ------------------------------------------------------------
const bio = { state: 'idle', index: null, loaded: new Set(), loading: new Map(), base: 'packs/bioicons/' };

/** Packs come from files next to the page, or from gzip data embedded in the offline build. */
async function fetchPack(file) {
  const embedded = window.FORTHEPLOT_EMBEDDED_PACKS?.[file];
  if (embedded) {
    const bin = atob(embedded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  const res = await fetch(bio.base + file);
  if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`);
  return res.json();
}

async function loadBioIndex() {
  if (bio.state === 'ready' || bio.state === 'loading') return bio.ready;
  bio.state = 'loading';
  bio.ready = (async () => {
    try {
      bio.index = await fetchPack('index.json');
      bio.state = 'ready';
    } catch (err) {
      bio.state = 'error';
      bio.error = err;
    }
    render();
  })();
  return bio.ready;
}

async function loadBioFile(file) {
  if (bio.loaded.has(file)) return;
  if (!bio.loading.has(file)) {
    bio.loading.set(file, (async () => {
      registerPack(await fetchPack(file));
      bio.loaded.add(file);
    })().catch((err) => { bio.loading.delete(file); toast(err.message, 'error'); }));
  }
  return bio.loading.get(file);
}

/** Make sure the Bioicons used by a figure are registered (called on open). */
export async function ensureFigureIcons(doc) {
  const missing = doc.elements.filter((e) => e.type === 'icon' && !getIcon(e.icon) && e.icon.startsWith('bioicons/')).map((e) => e.icon);
  if (!missing.length) return false;
  await loadBioIndex();
  if (!bio.index) return false;
  const files = new Set(bio.index.icons.filter((i) => missing.includes(i.id)).map((i) => i.file));
  await Promise.all([...files].map(loadBioFile));
  return true;
}

// ---- Tiles ---------------------------------------------------------------------

function iconThumb(def) {
  if (def.draw) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', `0 0 ${def.w} ${def.h}`);
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = iconMarkup(def, iconColors(def, {}), `lib-${def.id.replace(/[^a-z0-9]/gi, '_')}`);
    return s;
  }
  const img = new Image();
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${def.w} ${def.h}">${def.svg}</svg>`);
  return img;
}

function tile(label, thumb, item, title) {
  const t = h('button', { type: 'button', class: 'tile', title: title || label, draggable: 'true' }, h('span', { class: 'thumb' }, thumb), h('span', { class: 'tile-label' }, label));
  t.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/x-fortheplot', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  });
  t.addEventListener('click', () => addItemAt(item));
  return t;
}

function placeholderTile(meta) {
  return h('div', { class: 'tile ghost', title: meta.name }, h('span', { class: 'thumb' }), h('span', { class: 'tile-label' }, meta.name));
}

// ---- Shapes & annotations -----------------------------------------------------------

const SHAPES = [
  ['Box', { type: 'shape', shape: 'rect', w: 180, h: 110 }],
  ['Label box', { type: 'shape', shape: 'rect', w: 200, h: 60, fill: '#ffffff', stroke: '#52606d', text: 'Label' }],
  ['Panel', { type: 'shape', shape: 'rect', w: 420, h: 300, fill: '#f6f8fb', stroke: '#d9e2ec', radius: 18, strokeWidth: 1.5 }],
  ['Ellipse', { type: 'shape', shape: 'ellipse', w: 160, h: 120 }],
  ['Triangle', { type: 'shape', shape: 'triangle', w: 120, h: 100 }],
  ['Diamond', { type: 'shape', shape: 'diamond', w: 130, h: 110 }],
  ['Hexagon', { type: 'shape', shape: 'hexagon', w: 130, h: 110 }],
  ['Brace', { type: 'shape', shape: 'brace', w: 200, h: 26, stroke: '#52606d', strokeWidth: 3 }],
  ['Membrane', { type: 'shape', shape: 'membrane', w: 360, h: 44 }],
  ['Cell outline', { type: 'shape', shape: 'membrane-ellipse', w: 280, h: 230, inner: '#eef6fd' }],
  ['Vesicle', { type: 'shape', shape: 'membrane-ellipse', w: 110, h: 110, inner: '#fdf3e6', thickness: 20 }],
  ['Curved membrane', { type: 'path', membrane: true, smooth: true, x: 0, y: 0, points: [[0, 70], [120, 18], [260, 8], [380, 50]] }],
  ['Freeform cell', { type: 'path', membrane: true, closed: true, smooth: true, inner: '#eef6fd', x: 0, y: 0, points: [[0, 100], [70, 14], [200, 0], [285, 70], [262, 182], [140, 225], [34, 192]] }],
  ['Badge', { type: 'shape', shape: 'ellipse', w: 32, h: 32, fill: '#1f6f78', stroke: '#ffffff', text: '**1**', textColor: '#ffffff', fontSize: 17 }],
];
const TEXTS = [
  ['Title', { type: 'text', text: '**Figure title**', fontSize: 32 }],
  ['Heading', { type: 'text', text: '**Heading**', fontSize: 22 }],
  ['Body text', { type: 'text', text: 'Body text', fontSize: 17, color: '#3e4c59' }],
  ['Panel letter', { type: 'text', text: '**A**', fontSize: 34 }],
  ['Note', { type: 'text', text: '*Note*', fontSize: 15, color: '#7b8794' }],
  ['Formula', { type: 'text', text: 'CD8^+ IFN-γ^{hi}', fontSize: 20 }],
];
const ARROWS = [
  ['Activation', { head: 'arrow' }],
  ['Inhibition', { head: 'inhibit', stroke: '#d64545' }],
  ['Dashed', { head: 'arrow', dash: 'dashed' }],
  ['Open', { head: 'open' }],
  ['Binding', { head: 'circle', tail: 'circle', dash: 'dotted' }],
  ['Two-way', { head: 'arrow', tail: 'arrow' }],
  ['Curved', { head: 'arrow', routing: 'curved', curvature: -0.35 }],
  ['Wavy path', { type: 'path', head: 'arrow', smooth: true, x: 0, y: 0, points: [[0, 50], [70, 5], [150, 55], [230, 10]] }],
  ['Line', { head: 'none' }],
];

function elementThumb(spec) {
  const e = { id: 'x', ...spec };
  let doc;
  if (spec.type === 'arrow' || spec.from) {
    doc = normalizeFigure({ width: 120, height: 60, background: 'none', elements: [{ type: 'arrow', ...spec, from: [14, spec.routing === 'curved' ? 44 : 30], to: [106, spec.routing === 'curved' ? 44 : 30], width: 4, label: '' }] });
  } else {
    doc = normalizeFigure({ width: 10, height: 10, background: 'none', elements: [{ ...e, x: 0, y: 0 }] });
  }
  const svgStr = renderSVG(doc, { ids: false, crop: spec.type === 'arrow' || spec.from ? 'canvas' : 'content', padding: 6, background: false });
  const img = new Image();
  img.alt = '';
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  return img;
}

// ---- Rendering ---------------------------------------------------------------------

export function initLibrary(container) {
  root = container;
  tabs = h('div', { class: 'tabs', role: 'tablist' });
  for (const [k, label] of [['icons', 'Icons'], ['bioicons', 'Bioicons'], ['mine', 'Mine'], ['shapes', 'Shapes'], ['blocks', 'Blocks'], ['templates', 'Templates']]) {
    const b = h('button', { type: 'button', role: 'tab', class: 'tab', 'data-tab': k, id: `tab-${k}` }, label);
    b.addEventListener('click', () => { tab = k; cat = null; grp = null; limit = 120; search.value = ''; render(); });
    tabs.append(b);
  }
  search = h('input', { type: 'search', id: 'lib-search', placeholder: 'Search icons', autocomplete: 'off', spellcheck: 'false' });
  search.addEventListener('input', () => { limit = 120; render(); });
  chips = h('div', { class: 'chips' });
  grid = h('div', { class: 'grid' });
  foot = h('div', { class: 'lib-foot' });
  root.append(tabs, h('div', { class: 'search-row' }, glyph('code', 14), search), chips, grid, foot);
  root.querySelector('.search-row .glyph').replaceWith(h('span', { class: 'search-ic', 'aria-hidden': 'true', html: '<svg viewBox="0 0 20 20" width="15" height="15"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' }));
  on('packs', () => render());
  render();
}

function chip(label, active, onClick, count) {
  const b = h('button', { type: 'button', class: `chip${active ? ' on' : ''}` }, label, count != null ? h('span', { class: 'count' }, String(count)) : null);
  b.addEventListener('click', onClick);
  return b;
}

export function render() {
  if (!root) return;
  for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  grid.innerHTML = '';
  chips.innerHTML = '';
  foot.innerHTML = '';
  grid.className = 'grid';
  search.parentElement.hidden = tab === 'templates' || tab === 'shapes' || tab === 'blocks';
  const q = search.value.trim();

  if (tab === 'icons') {
    const builtin = allIcons().filter((i) => !i.pack);
    const extra = allIcons().filter((i) => i.pack && !i.id.startsWith('bioicons/') && !i.own);
    search.placeholder = `Search ${builtin.length + extra.length} icons (e.g. "t cell", "PD-1")`;
    // two levels: groups (Cells, Proteins & molecules, …), then the categories inside the chosen group
    const grpOf = (i) => i.group || i.category;
    const pool = [...builtin, ...extra];
    const groups = [...new Set(pool.map(grpOf))];
    chips.append(chip('All', !grp, () => { grp = null; cat = null; render(); }));
    for (const g of groups) chips.append(chip(g, grp === g, () => { grp = g; cat = null; render(); }));
    if (grp) {
      const subs = [...new Set(pool.filter((i) => grpOf(i) === grp).map((i) => i.category))];
      if (subs.length > 1) {
        // the categories inside a group go in a compact dropdown so the panel stays short
        const sel = h('select', { class: 'chips-select', 'aria-label': `${grp} category` });
        sel.append(h('option', { value: '' }, `All ${grp.toLowerCase()} (${pool.filter((i) => grpOf(i) === grp).length})`));
        for (const c of subs) sel.append(h('option', { value: c }, `${c} (${pool.filter((i) => i.category === c).length})`));
        sel.value = cat && subs.includes(cat) ? cat : '';
        sel.addEventListener('change', () => { cat = sel.value || null; render(); });
        chips.append(sel);
      }
    }
    let list = q ? searchIcons(q).filter((i) => !i.id.startsWith('bioicons/')) : [...builtin, ...extra];
    if (!q) list = [...myIconDefs(), ...list];
    if (grp) list = list.filter((i) => grpOf(i) === grp);
    if (cat) list = list.filter((i) => i.category === cat);
    showIcons(list);
    foot.append(h('span', {}, 'Built-in icons are original and MIT-licensed. Click to add, or drag onto the canvas.'));
    return;
  }

  if (tab === 'bioicons') {
    search.placeholder = 'Search Bioicons (e.g. "antibody", "mouse")';
    if (bio.state === 'idle') loadBioIndex();
    if (bio.state !== 'ready') {
      grid.className = 'grid empty';
      grid.append(bio.state === 'error'
        ? h('div', { class: 'empty-msg' }, h('strong', {}, 'Bioicons aren’t available here.'), h('p', {}, 'Open ForThePlot with `fortheplot serve` (or the hosted version) to browse ~2,000 Bioicons, or load a pack file below.'))
        : h('div', { class: 'empty-msg' }, 'Loading Bioicons…'));
      foot.append(packButton());
      return;
    }
    const idx = bio.index;
    const counts = new Map();
    for (const i of idx.icons) counts.set(i.category, (counts.get(i.category) || 0) + 1);
    chips.append(chip('All', !cat, () => { cat = null; render(); }, idx.icons.length));
    const PRIORITY = ['Blood & Immunology', 'Microbiology', 'Cell types', 'Receptors channels', 'Oncology', 'Viruses', 'Cell membrane', 'Cell culture', 'Lab apparatus'];
    const rank = (c) => { const i = PRIORITY.indexOf(c); return i < 0 ? 99 : i; };
    for (const [c, n] of [...counts.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1])) chips.append(chip(c, cat === c, () => { cat = c; limit = 120; render(); }, n));
    let metas = idx.icons;
    if (cat) metas = metas.filter((m) => m.category === cat);
    if (q) {
      const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
      metas = metas
        .map((m) => {
          const hay = `${m.name} ${m.tags.join(' ')} ${m.category} ${m.author}`.toLowerCase();
          let s = 0;
          for (const t of tokens) { if (!hay.includes(t)) return null; s += m.name.toLowerCase().includes(t) ? 3 : 1; }
          return { m, s };
        })
        .filter(Boolean)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.m);
    }
    if (!q && !cat) metas = metas.filter((m) => /immun|blood|cell|virus|microbio/i.test(m.category)).concat(metas.filter((m) => !/immun|blood|cell|virus|microbio/i.test(m.category)));
    const shown = metas.slice(0, limit);
    const files = [...new Set(shown.map((m) => m.file))].filter((fl) => !bio.loaded.has(fl));
    if (files.length) {
      for (const m of shown) grid.append(placeholderTile(m));
      Promise.all(files.map(loadBioFile)).then(() => { if (tab === 'bioicons') render(); });
    } else {
      for (const m of shown) {
        const def = getIcon(m.id);
        if (def) grid.append(tile(def.name, iconThumb(def), { kind: 'icon', id: def.id }, `${def.name}\n${def.author} · ${def.license}`));
      }
    }
    if (metas.length > limit) grid.append(moreButton(metas.length));
    if (!metas.length) grid.append(h('div', { class: 'empty-msg' }, 'No Bioicons match.'));
    foot.append(h('span', {}, 'Bioicons keep their own licenses (CC0, CC-BY, CC-BY-SA, MIT, BSD). Credits are written into exported SVGs. '), h('a', { href: 'https://bioicons.com', target: '_blank', rel: 'noopener' }, 'bioicons.com'));
    return;
  }

  if (tab === 'mine') {
    search.placeholder = 'Search your icons';
    let list = myIconDefs();
    if (q) { const t = q.toLowerCase(); list = list.filter((d) => `${d.name} ${(d.tags || []).join(' ')}`.toLowerCase().includes(t)); }
    for (const def of list) {
      const t = tile(def.name, iconThumb(def), { kind: 'icon', id: def.id }, `${def.name}${def.credits?.length ? `\nIncludes icons by ${def.credits.map((c) => c.author).join(', ')}` : '\nYour icon'}`);
      const ren = h('button', { type: 'button', class: 'tile-act', title: 'Rename' }, '✎');
      ren.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = window.prompt('Icon name', def.name);
        if (name && name.trim() && name.trim() !== def.name) { try { await renameMyIcon(def.id, name.trim()); } catch (err) { toast(err.message, 'error'); } }
      });
      const del = h('button', { type: 'button', class: 'tile-act del', title: 'Remove from My icons (figures that use it keep their copy)' }, '×');
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        try { await removeMyIcon(def.id); toast(`Removed “${def.name}” from My icons`); } catch (err) { toast(err.message, 'error'); }
      });
      grid.append(h('div', { class: 'tile-wrap' }, t, ren, del));
    }
    if (!list.length) {
      grid.className = 'grid empty';
      grid.append(h('div', { class: 'empty-msg' }, q ? 'None of your icons match.' : h('span', {}, h('strong', {}, 'No icons of your own yet.'), h('p', {}, 'Select objects on the canvas (a cell you drew, a receptor complex…) and choose Save as icon in the panel on the right.'))));
    }
    const input = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      input.value = '';
      if (f) { try { await importMyIcons(f); } catch (err) { toast(err.message, 'error'); } }
    });
    foot.append(
      h('span', {}, `Kept ${myIconsWhere()}. `),
      button('Export…', { cls: 'small', title: 'Save your icons as a pack file to share or move', onClick: exportMyIcons }),
      button('Import…', { cls: 'small', title: 'Add icons from a pack file', onClick: () => input.click() }),
      input,
    );
    return;
  }

  if (tab === 'shapes') {
    grid.className = 'grid shapes';
    grid.append(h('div', { class: 'grid-head' }, 'Shapes & membranes'));
    for (const [label, spec] of SHAPES) grid.append(tile(label, elementThumb(spec), { kind: 'element', spec }));
    grid.append(h('div', { class: 'grid-head' }, 'Arrows'));
    for (const [label, spec0] of ARROWS) { const spec = { type: 'arrow', ...spec0 }; grid.append(tile(label, elementThumb(spec), { kind: 'element', spec })); }
    grid.append(h('div', { class: 'grid-head' }, 'Text'));
    for (const [label, spec] of TEXTS) grid.append(tile(label, elementThumb(spec), { kind: 'element', spec }));
    foot.append(h('span', {}, 'Tip: in text, **bold**, *italic*, CD8^+ and IFN-γ^{hi} / H_{2}O are formatted.'));
    return;
  }

  if (tab === 'blocks') {
    grid.className = 'grid templates';
    for (const b of BLOCK_PRESETS) {
      const card = h('button', { type: 'button', class: 'block-card' }, blockThumb(b), h('strong', {}, b.name), h('span', {}, b.description));
      card.addEventListener('click', () => {
        const ops = blockOps(S.doc, b.op);
        const r = runOps(ops, { select: true });
        if (ops.length > 2) fitView();
        if (!r.error) toast(`Added “${b.name}”. Everything it made is selected: drag to move it, or edit any part.`);
      });
      grid.append(card);
    }
    foot.append(h('span', {}, 'Each block is one op that agents can use too (synapse, pathway, timeline, gating, panels).'));
    return;
  }

  if (tab === 'templates') {
    grid.className = 'grid templates';
    for (const t of TEMPLATES) {
      const img = new Image();
      img.alt = '';
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(renderSVG(normalizeFigure(t.figure), { ids: false }));
      const b = h('button', { type: 'button', class: 'template' }, h('span', { class: 'tthumb' }, img), h('span', { class: 'tname' }, t.name), h('span', { class: 'tdesc' }, t.description));
      b.addEventListener('click', () => {
        setDoc(t.figure, { keepHistory: true, source: 'template' });
        fitView();
        toast(`Opened “${t.name}”. Undo (Ctrl+Z) returns to your previous figure.`);
      });
      grid.append(b);
    }
    foot.append(h('span', {}, 'Templates were built with the same ops an agent sends: see examples/ in the repo.'));
  }
}

function moreButton(total) {
  const b = h('button', { type: 'button', class: 'more' }, `Show more (${total - limit} more)`);
  b.addEventListener('click', () => { limit += 240; render(); });
  return b;
}

function showIcons(list) {
  for (const def of list.slice(0, limit)) {
    grid.append(tile(def.name, iconThumb(def), { kind: 'icon', id: def.id }, `${def.name}${def.pack ? `\n${def.author} · ${def.license}` : ''}`));
  }
  if (list.length > limit) grid.append(moreButton(list.length));
  if (!list.length) grid.append(h('div', { class: 'empty-msg' }, 'No icons match. Try the Bioicons tab, or a broader word.'));
}

function packButton() {
  const input = h('input', { type: 'file', accept: '.json,application/json', id: 'pack-file', hidden: true });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const pack = JSON.parse(await file.text());
      if (!/^(fortheplot|epitope)-icon-pack$/.test(pack.format)) throw new Error('Not a ForThePlot icon pack (format: fortheplot-icon-pack).');
      registerPack(pack);
      toast(`Loaded ${pack.icons.length} icons from ${pack.name}`);
      tab = 'icons';
      render();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  const b = h('button', { type: 'button', class: 'btn small' }, 'Load icon pack…');
  b.addEventListener('click', () => input.click());
  return h('span', {}, b, input);
}

export function setLibraryTab(t) {
  tab = t;
  render();
}


// ---- Building blocks ------------------------------------------------------------------

const BLOCK_PRESETS = [
  { name: 'Immune synapse: CTL and tumor', description: 'TCR : MHC I, PD-1 : PD-L1, CD28 : CD80/86, with legend',
    op: { op: 'synapse', left: 't-cell-cd8', right: 'tumor-cell', pairs: [['tcr', 'mhc-i'], ['pd-1', 'pd-l1'], ['cd28', 'cd80-cd86']], legend: true } },
  { name: 'Checkpoint blockade', description: 'Anti-PD-1 sits between PD-1 and PD-L1',
    op: { op: 'synapse', left: 't-cell-cd8', right: 'tumor-cell', pairs: [['tcr', 'mhc-i'], { left: 'pd-1', right: 'pd-l1', blockedBy: { icon: 'antibody', colors: { primary: '#2f9e6e', secondary: '#9ad8b8' }, label: 'anti-PD-1' } }], legend: true } },
  { name: 'T cell priming by a DC', description: 'Signal 1 (MHC II : TCR), signal 2 (CD80/86 : CD28), CD40 : CD40L',
    op: { op: 'synapse', left: { icon: 'macrophage', label: 'Antigen-presenting cell' }, right: 't-cell-cd4', pairs: [['mhc-ii', 'tcr'], ['cd80-cd86', 'cd28'], ['cd40', 'cd40l']], legend: true } },
  { name: 'T cell help to a B cell', description: 'Tfh cell and B cell: TCR : MHC II and CD40L : CD40',
    op: { op: 'synapse', left: 'b-cell', right: 'tfh-cell', pairs: [['mhc-ii', 'tcr'], ['cd40', 'cd40l']], legend: true } },
  { name: 'TCR signaling cascade', description: 'Membrane receptor to NFAT / NF-κB in the nucleus',
    op: { op: 'pathway', membrane: { label: 'Plasma membrane' }, nodes: [{ id: 'tcr-cd3', icon: 'tcr-cd3', label: 'TCR–CD3', w: 100 }, 'LCK', 'ZAP-70', 'LAT', 'PLCγ1', { id: 'ca', label: 'Ca^{2+}' }, 'PKCθ', 'NFAT', 'NF-κB', { id: 'il2', label: '*IL2*', shape: 'box' }], edges: [['tcr-cd3', 'LCK', 'activates'], ['LCK', 'ZAP-70', 'phosphorylates'], ['ZAP-70', 'LAT', 'phosphorylates'], ['LAT', 'PLCγ1', 'activates'], ['PLCγ1', 'ca', 'produces'], ['PLCγ1', 'PKCθ', 'activates'], ['ca', 'NFAT', 'activates'], ['PKCθ', 'NF-κB', 'activates'], ['NFAT', 'il2', 'translocates'], ['NF-κB', 'il2', 'translocates']], compartments: [{ label: 'Nucleus', ids: ['il2'] }], layerGap: 46 } },
  { name: 'Cytokine signaling (JAK–STAT)', description: 'Cytokine, receptor, JAK, STAT, target genes',
    op: { op: 'pathway', membrane: true, nodes: [{ id: 'il', icon: 'cytokine', label: 'Cytokine', w: 54 }, { id: 'rec', icon: 'cytokine-receptor', label: 'Receptor', w: 64 }, 'JAK', 'STAT', { id: 'dimer', label: 'STAT dimer' }, { id: 'genes', label: 'Target genes', shape: 'box' }], edges: [['il', 'rec', 'binds'], ['rec', 'JAK', 'activates'], ['JAK', 'STAT', 'phosphorylates'], ['STAT', 'dimer', 'activates'], ['dimer', 'genes', 'translocates']], compartments: [{ label: 'Nucleus', ids: ['genes'] }], layerGap: 50 } },
  { name: 'Tumor model timeline', description: 'Inoculation, anti-PD-1 doses, measurements, harvest',
    op: { op: 'timeline', subject: { icon: 'mouse', label: 'C57BL/6' }, end: 24, events: [{ at: 0, label: 'MC38 s.c.', icon: 'mouse-sc' }, { at: [7, 10, 13], label: 'anti-PD-1 i.p.', icon: 'syringe' }, { from: 7, to: 21, label: 'Tumor measurements', below: true }, { at: 21, label: 'Harvest → flow', icon: 'flow-cytometer' }] } },
  { name: 'Adoptive transfer timeline', description: 'T cell transfer, infection, blood draws, harvest',
    op: { op: 'timeline', subject: { icon: 'mouse', label: 'Recipient' }, start: -1, end: 30, events: [{ at: 0, label: 'Transfer T cells i.v.', icon: 'mouse-iv' }, { at: 1, label: 'Infection', icon: 'virus', below: true }, { at: [7, 14], label: 'Blood draws', icon: 'blood-tube' }, { at: 28, label: 'Harvest spleen', icon: 'spleen' }] } },
  { name: 'T cell gating strategy', description: 'Lymphocytes → singlets → live → CD3⁺ → CD8⁺',
    op: { op: 'gating', steps: [{ x: 'FSC-A', y: 'SSC-A', gate: 'Lymphocytes', pct: '58.3' }, { x: 'FSC-A', y: 'FSC-H', gate: 'Single cells', pct: '96.1' }, { x: 'Live/Dead', y: 'SSC-A', gate: 'Live', pct: '91.4' }, { x: 'CD3', y: 'SSC-A', gate: 'CD3^+', pct: '42.7' }, { x: 'CD4', y: 'CD8', gate: 'CD8^+', pct: '35.2' }] } },
  { name: 'Panels: 2 side by side', description: 'A and B, filling the canvas; letters update automatically', op: { op: 'panels', rows: 1, cols: 2 } },
  { name: 'Panels: 2 × 2', description: 'A–D in reading order', op: { op: 'panels', rows: 2, cols: 2 } },
  { name: 'Panels: 3 in a row', description: 'A, B, C', op: { op: 'panels', rows: 1, cols: 3 } },
  { name: 'Panels: 2 over 1 wide', description: 'Two on top, one full-width panel below', op: { op: 'panels', rows: 2, cols: 2, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0, colSpan: 2 }] } },
  { name: 'Panels: 1 tall + 2', description: 'A large panel on the left, two stacked on the right', op: { op: 'panels', rows: 2, cols: 2, widths: [3, 2], cells: [{ row: 0, col: 0, rowSpan: 2 }, { row: 0, col: 1 }, { row: 1, col: 1 }] } },
];

const thumbCache = new Map();
function blockThumb(b) {
  if (!thumbCache.has(b.name)) {
    const r = applyOps(createFigure({ width: 1200, height: 800 }), [b.op]);
    let src = '';
    if (!r.error) {
      src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(renderSVG(r.doc, { ids: false, crop: 'content', padding: 16 }));
    }
    thumbCache.set(b.name, src);
  }
  const img = new Image();
  img.alt = '';
  img.src = thumbCache.get(b.name);
  return img;
}
