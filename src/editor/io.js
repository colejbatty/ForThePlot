// Open / save / export, autosave, and live sync with `fortheplot serve`.

import { S, on, emit, setDoc, exportDoc } from './state.js';
import { toast } from './ui.js';
import { fitView } from './stage.js';
import { ensureFigureIcons } from './library.js';
import { renderSVG, figureCredits } from '../core/index.js';

const AUTOSAVE_KEY = 'fortheplot:autosave:v1';
export const server = { enabled: !!window.FORTHEPLOT_SERVER, file: window.FORTHEPLOT_SERVER?.file || null, connected: false, saving: false, lastSent: '' };

// ---- Downloads: the claude.ai viewer's `downloads` capability, else a normal browser download.
let dlPromise = null;
function downloadsCap() {
  if (!dlPromise) {
    dlPromise = window.claude && typeof window.claude.use === 'function'
      ? Promise.resolve(window.claude.use('downloads')).catch(() => null)
      : Promise.resolve(null);
  }
  return dlPromise;
}

export async function saveFile(filename, data, mime) {
  const cap = await downloadsCap();
  if (cap) {
    try {
      await cap.save({ filename, data });
      toast(`Saved ${filename}`);
    } catch (err) {
      if (err?.code !== 'declined') toast(`Couldn’t save ${filename}: ${err?.message || err?.code || 'unavailable'}`, 'error');
    }
    return;
  }
  if (window.claude) {
    // inside a viewer that refuses downloads: fall back to the clipboard where we can
    toast('Saving files isn’t available in this view. Use File → Copy SVG / Copy figure JSON instead.', 'error');
    return;
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function baseName() {
  return (S.doc.title || 'figure').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'figure';
}

export function figureSVG() {
  return renderSVG(S.doc, { ids: false });
}

export async function exportSVG() {
  await saveFile(`${baseName()}.svg`, figureSVG(), 'image/svg+xml');
}

export async function exportJSON() {
  await saveFile(`${baseName()}.json`, JSON.stringify(exportDoc(), null, 2) + '\n', 'application/json');
}

export function rasterize(scale = 2, mime = 'image/png') {
  return new Promise((resolve, reject) => {
    const svg = figureSVG();
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(S.doc.canvas.width * scale);
      c.height = Math.round(S.doc.canvas.height * scale);
      const ctx = c.getContext('2d');
      if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), mime, 0.95);
    };
    img.onerror = () => reject(new Error('Could not rasterize the figure'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

export async function exportPNG(scale = 2) {
  try {
    const blob = await rasterize(scale);
    await saveFile(`${baseName()}${scale !== 1 ? `@${scale}x` : ''}.png`, blob, 'image/png');
  } catch (err) {
    toast(err.message, 'error');
  }
}

export async function copyText(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`Copied ${what}`);
  } catch {
    toast(`Clipboard is blocked here. Use Save instead.`, 'error');
  }
}

export function creditsText() {
  const c = figureCredits(S.doc);
  if (!c.length) return 'Figure made with ForThePlot (open-source). All icons are ForThePlot originals (MIT).';
  return 'Icons: ' + c.map((x) => `${x.author} (${x.license})`).join('; ') + '. Made with ForThePlot.';
}

export async function openFile(file) {
  try {
    const text = await file.text();
    if (file.name.endsWith('.svg') || text.trimStart().startsWith('<svg') || text.trimStart().startsWith('<?xml')) {
      emit('import-svg', { name: file.name, text });
      return;
    }
    const raw = JSON.parse(text);
    if (/^(fortheplot|epitope)-icon-pack$/.test(raw.format)) { emit('load-pack', raw); return; }
    await ensureFigureIcons(raw.elements ? raw : { elements: [] });
    setDoc(raw, { keepHistory: true, source: 'open' });
    fitView();
    toast(`Opened ${file.name}`);
  } catch (err) {
    toast(`Couldn’t open ${file.name}: ${err.message}`, 'error');
  }
}

// ---- Autosave (per-browser convenience) ----------------------------------------------

export function loadAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY) || localStorage.getItem('epitope:autosave:v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let autosaveTimer = 0;
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(exportDoc())); } catch { /* storage unavailable */ }
  }, 800);
}

// ---- Live sync with `fortheplot serve` --------------------------------------------------

let pushTimer = 0;
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 350);
}

export async function flushPush() {
  clearTimeout(pushTimer);
  await push();
}

let selTimer = 0;
function shareSelection() {
  clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    fetch('/api/selection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids: S.sel }) }).catch(() => {});
  }, 150);
}

async function push() {
  const body = JSON.stringify(exportDoc(), null, 2) + '\n';
  if (body === server.lastSent) return;
  server.saving = true;
  emit('sync');
  try {
    const res = await fetch('/api/figure', { method: 'PUT', headers: { 'content-type': 'application/json' }, body });
    if (!res.ok) throw new Error((await res.text()) || res.statusText);
    server.lastSent = body;
    server.error = null;
  } catch (err) {
    server.error = err.message;
  }
  server.saving = false;
  emit('sync');
}

export async function connectServer() {
  if (!server.enabled) return false;
  try {
    const res = await fetch('/api/figure');
    if (res.ok) {
      const text = await res.text();
      server.lastSent = text;
      const raw = JSON.parse(text);
      await ensureFigureIcons(raw);
      setDoc(raw, { source: 'remote' });
    }
  } catch (err) {
    server.error = err.message;
  }
  const es = new EventSource('/api/events');
  es.addEventListener('figure', async (ev) => {
    if (ev.data === server.lastSent) return;
    server.lastSent = ev.data;
    try {
      const raw = JSON.parse(ev.data);
      await ensureFigureIcons(raw);
      setDoc(raw, { keepHistory: true, source: 'remote', keepSelection: true });
      toast('Figure updated from file (agent or another window)');
    } catch { /* partial write; the next event will carry the full file */ }
  });
  es.addEventListener('notice', (ev) => {
    try { const n = JSON.parse(ev.data); if (n.text) toast(n.text, n.kind === 'error' ? 'error' : undefined); } catch { /* ignore */ }
  });
  fetch('/api/capabilities').then((r) => r.json()).then((c) => { server.prism = !!c.prism; server.platform = c.platform; emit('sync'); }).catch(() => {});
  es.onopen = () => { server.connected = true; emit('sync'); };
  es.onerror = () => { server.connected = false; emit('sync'); };
  return true;
}

export function initIO() {
  if (server.enabled) on('select', shareSelection);
  on('doc', (d) => {
    if (d?.noop) return;
    if (d?.source === 'remote') return;
    if (server.enabled) schedulePush();
    else scheduleAutosave();
  });
}

/** Ask the local server to do something on this computer (linked graphs). */
export async function serverCall(pathname, body = {}) {
  if (!server.enabled) throw new Error('Open this figure through Claude (or `fortheplot serve`) to link Prism graphs.');
  await flushPush();
  const res = await fetch(pathname, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || res.statusText);
  return out;
}
