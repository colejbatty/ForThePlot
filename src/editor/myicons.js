// "My icons" in the editor: save selected objects as an icon, list, rename, remove, export and
// import them. With the local server (Claude or `fortheplot serve`) they live in one file on this
// computer shared by every figure and by Claude; otherwise in this browser.

import { S, emit, runOps } from './state.js';
import { h, button, toast } from './ui.js';
import { server, serverCall, saveFile } from './io.js';
import {
  registerPack, getIcon, iconFromElements, replaceWithIconOps, emptyMyIconsPack, uniqueIconId, MY_ICONS_PREFIX, sanitizeSvg,
} from '../core/index.js';

const KEY = 'fortheplot.myIcons';
let pack = emptyMyIconsPack();

const fullId = (ic) => `${MY_ICONS_PREFIX}/${ic.id}`;

/** Registered definitions of the saved icons, newest first. */
export function myIconDefs() {
  return pack.icons.slice().reverse().map((ic) => getIcon(fullId(ic))).filter(Boolean);
}

export function myIconsWhere() {
  return server.enabled ? 'on this computer, for every figure' : 'in this browser';
}

function setPack(p) {
  pack = { ...emptyMyIconsPack(), ...(p || {}), prefix: MY_ICONS_PREFIX };
  if (pack.icons.length) registerPack(pack);
  emit('packs');
}

function storeLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(pack)); } catch (err) { toast(`Couldn’t keep icons in this browser: ${err.message}`, 'error'); }
}

export async function loadMyIcons() {
  if (server.enabled) {
    try { const r = await fetch('/api/my-icons'); if (r.ok) return setPack(await r.json()); } catch { /* offline */ }
  }
  try { const raw = localStorage.getItem(KEY) || localStorage.getItem('epitope.myIcons'); if (raw) setPack(JSON.parse(raw)); } catch { /* storage blocked */ }
}

async function store(icon) {
  if (server.enabled) {
    const r = await serverCall('/api/my-icons', { action: 'save', icon });
    setPack(r.pack);
    return r.id;
  }
  const id = uniqueIconId(pack, icon.id);
  pack.icons.push({ ...icon, id, svg: sanitizeSvg(icon.svg) });
  storeLocal();
  setPack(pack);
  return `${MY_ICONS_PREFIX}/${id}`;
}

/** Keep an SVG file (dropped on the canvas) as one of My icons; returns its id. */
export async function saveSvgAsMyIcon({ name, w, h, svg }) {
  const clean = String(name || 'icon').replace(/\.svg$/i, '');
  return store({
    id: clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'icon', name: clean, category: 'My icons',
    tags: clean.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean), w, h, size: 120, svg, shape: 'rect',
    own: true, credits: [], license: 'Your own', author: 'You', created: new Date().toISOString(),
  });
}

export async function removeMyIcon(id) {
  if (server.enabled) setPack((await serverCall('/api/my-icons', { action: 'remove', id })).pack);
  else { pack.icons = pack.icons.filter((i) => fullId(i) !== id); storeLocal(); setPack(pack); }
}

export async function renameMyIcon(id, name) {
  if (server.enabled) setPack((await serverCall('/api/my-icons', { action: 'rename', id, name })).pack);
  else { const ic = pack.icons.find((i) => fullId(i) === id); if (ic) ic.name = name; storeLocal(); setPack(pack); }
  const reg = getIcon(id);
  if (reg) reg.name = name;
}

export function exportMyIcons() {
  if (!pack.icons.length) return toast('You haven’t saved any icons yet.');
  saveFile('my-icons.json', new Blob([JSON.stringify(pack, null, 1)], { type: 'application/json' }), 'application/json');
}

/** Add the icons of a pack file to My icons. */
export async function importMyIcons(file) {
  const p = JSON.parse(await file.text());
  if (!/^(fortheplot|epitope)-icon-pack$/.test(p.format) || !Array.isArray(p.icons)) throw new Error('Not a ForThePlot icon pack');
  let n = 0;
  for (const ic of p.icons) {
    if (!ic?.svg || !(ic.w > 0 && ic.h > 0)) continue;
    await store({ ...ic, own: true, credits: ic.credits || (ic.author && ic.author !== 'You' ? [{ author: ic.author, license: ic.license, source: ic.source || '', icons: [ic.name] }] : []) });
    n++;
  }
  toast(`Added ${n} icon${n === 1 ? '' : 's'} to My icons`);
}

// ---- Save dialog -------------------------------------------------------------------------

let dlg, nameIn, replaceIn, preview, info, saveBtn, pendingIds = [];

function thumb(def) {
  const img = new Image();
  img.alt = '';
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${def.w} ${def.h}">${def.svg}</svg>`);
  return img;
}

async function doSave() {
  const name = nameIn.value.trim() || 'My icon';
  saveBtn.disabled = true;
  try {
    const def = iconFromElements(S.doc, pendingIds, { name });
    const id = await store(def);
    if (replaceIn.checked) runOps(replaceWithIconOps(S.doc, pendingIds, id, def), { select: true });
    dlg.close();
    toast(`Saved “${def.name}” to My icons ${myIconsWhere()}.${def.credits.length ? ' It keeps the credits of the icons it was made from.' : ''}`);
  } catch (err) {
    info.innerHTML = '';
    info.append(h('p', { class: 'warn' }, err.message));
  } finally {
    saveBtn.disabled = false;
  }
}

/** Ask for a name and save the given elements as an icon. */
export function openSaveIconDialog(ids) {
  pendingIds = [...ids];
  let def;
  try { def = iconFromElements(S.doc, pendingIds, { name: 'preview' }); } catch (err) { toast(err.message, 'error'); return; }
  if (!dlg) {
    nameIn = h('input', { type: 'text', id: 'icon-name', placeholder: 'e.g. Activated macrophage', spellcheck: 'true', style: { width: '100%' } });
    nameIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') doSave(); });
    replaceIn = h('input', { type: 'checkbox', id: 'icon-replace' });
    preview = h('div', { class: 'icon-preview' });
    info = h('div', { class: 'exp-info' });
    saveBtn = button('Save icon', { cls: 'primary', onClick: doSave });
    dlg = h('dialog', { id: 'icon-dialog', class: 'dialog' },
      h('h2', {}, 'Save as icon'),
      preview,
      h('div', { class: 'exp-grid' },
        h('label', { for: 'icon-name' }, 'Name'), h('div', { class: 'exp-row' }, nameIn),
        h('span'), h('label', { class: 'muted', for: 'icon-replace' }, replaceIn, ' Replace the selection with the icon'),
      ),
      info,
      h('div', { class: 'dialog-actions' }, h('span', { class: 'spacer' }), button('Cancel', { onClick: () => dlg.close() }), saveBtn),
    );
    document.body.append(dlg);
  }
  preview.innerHTML = '';
  preview.append(thumb(def));
  info.innerHTML = '';
  info.append(h('p', { class: 'muted' }, `It goes in the library under Mine, ${myIconsWhere()}. You can resize and recolor it like any icon.`));
  if (def.credits.length) info.append(h('p', { class: 'muted' }, `Made with icons by ${def.credits.map((c) => c.author).join(', ')}: their credit stays with it.`));
  nameIn.value = '';
  replaceIn.checked = false;
  dlg.showModal();
  nameIn.focus();
}
