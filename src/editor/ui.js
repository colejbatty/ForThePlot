// Tiny DOM helpers and the editor's own UI glyphs.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

const G = {
  select: '<path d="M5 3l11 6.5-5 1.2 3.2 5.6-2 1.2-3.3-5.6L5 15z"/>',
  hand: '<path d="M7 10V5.5a1.3 1.3 0 012.6 0V9m0-4.8V3.8a1.3 1.3 0 012.6 0V9m0-4.2a1.3 1.3 0 012.6 0V10m0-2.6a1.3 1.3 0 012.6 0V13c0 3-2.2 5-5 5h-1.2a5 5 0 01-4-2L3.5 12.6a1.3 1.3 0 012-1.6L7 12.6" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  text: '<path d="M4 4h12v3h-1.6l-.5-1.4H11V15h1.6v1.5H7.4V15H9V5.6H6.1L5.6 7H4z"/>',
  arrow: '<path d="M3 16L15 4M15 4H8.5M15 4v6.5" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  rect: '<rect x="3.5" y="5" width="13" height="10" rx="2.5" fill="none" stroke-width="1.8"/>',
  ellipse: '<ellipse cx="10" cy="10" rx="7" ry="5.5" fill="none" stroke-width="1.8"/>',
  membrane: '<g fill="none" stroke-width="1.3"><path d="M3 8h14M3 12h14"/></g><g><circle cx="4" cy="6.5" r="1.5"/><circle cx="8" cy="6.5" r="1.5"/><circle cx="12" cy="6.5" r="1.5"/><circle cx="16" cy="6.5" r="1.5"/><circle cx="4" cy="13.5" r="1.5"/><circle cx="8" cy="13.5" r="1.5"/><circle cx="12" cy="13.5" r="1.5"/><circle cx="16" cy="13.5" r="1.5"/></g>',
  pen: '<path d="M10 2.5l4.5 7.5-4.5 7-4.5-7z" fill="none" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="10.5" r="1.4"/><path d="M10 2.5v6.6" stroke-width="1.2"/>',
  pencil: '<path d="M3 15.5c2-4 4.5 1 7-3s4-6 7-7.5" fill="none" stroke-width="1.8" stroke-linecap="round"/>',
  image: '<rect x="3" y="4" width="14" height="12" rx="2" fill="none" stroke-width="1.6"/><circle cx="7.5" cy="8" r="1.5"/><path d="M3.5 14.5l4-4 3 3 2.5-2 3.5 3.5" fill="none" stroke-width="1.6" stroke-linejoin="round"/>',
  panels: '<rect x="3" y="3" width="6" height="6" rx="1" fill="none" stroke-width="1.5"/><rect x="11" y="3" width="6" height="6" rx="1" fill="none" stroke-width="1.5"/><rect x="3" y="11" width="14" height="6" rx="1" fill="none" stroke-width="1.5"/>',
  undo: '<path d="M7 5L3 9l4 4M3.5 9H12a4.5 4.5 0 010 9H9" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  redo: '<path d="M13 5l4 4-4 4M16.5 9H8a4.5 4.5 0 000 9h3" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<path d="M10 4v12M4 10h12" fill="none" stroke-width="1.8" stroke-linecap="round"/>',
  minus: '<path d="M4 10h12" fill="none" stroke-width="1.8" stroke-linecap="round"/>',
  fit: '<path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  grid: '<path d="M3 7h14M3 13h14M7 3v14M13 3v14" fill="none" stroke-width="1.3"/>',
  open: '<path d="M3 6.5V15a1 1 0 001 1h12a1 1 0 001-1V8a1 1 0 00-1-1h-6L8.5 5H4a1 1 0 00-1 1.5z" fill="none" stroke-width="1.6" stroke-linejoin="round"/>',
  save: '<path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 14v2.5h12V14" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  copy: '<rect x="7" y="7" width="9" height="10" rx="1.5" fill="none" stroke-width="1.6"/><path d="M4 13V4.5A1.5 1.5 0 015.5 3H12" fill="none" stroke-width="1.6" stroke-linecap="round"/>',
  trash: '<path d="M4 6h12M8 6V4h4v2m-6 0l.8 10.5h6.4L14 6" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  front: '<rect x="8" y="8" width="9" height="9" rx="1.5"/><rect x="3" y="3" width="9" height="9" rx="1.5" fill="none" stroke-width="1.5"/>',
  back: '<rect x="3" y="3" width="9" height="9" rx="1.5"/><rect x="8" y="8" width="9" height="9" rx="1.5" fill="var(--panel)" stroke-width="1.5"/>',
  dup: '<rect x="3" y="3" width="10" height="10" rx="1.5" fill="none" stroke-width="1.5"/><path d="M14 7h3v10H7v-3" fill="none" stroke-width="1.5"/><path d="M8 5.5v5M5.5 8h5" stroke-width="1.5"/>',
  group: '<rect x="2.5" y="2.5" width="15" height="15" rx="2" fill="none" stroke-width="1.3" stroke-dasharray="2 2"/><rect x="5" y="5" width="5" height="5" rx="1"/><rect x="10.5" y="10.5" width="4.5" height="4.5" rx="1"/>',
  lock: '<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke-width="1.6"/>',
  flipH: '<path d="M10 3v14" stroke-width="1.2" stroke-dasharray="2 2"/><path d="M8 5L3 15h5zM12 5l5 10h-5z" fill="none" stroke-width="1.5" stroke-linejoin="round"/>',
  flipV: '<path d="M3 10h14" stroke-width="1.2" stroke-dasharray="2 2"/><path d="M5 8L15 3v5zM5 12l10 5v-5z" fill="none" stroke-width="1.5" stroke-linejoin="round"/>',
  alignL: '<path d="M3 3v14" stroke-width="1.8"/><rect x="5" y="5" width="10" height="3.5" rx="1"/><rect x="5" y="11.5" width="6" height="3.5" rx="1"/>',
  alignHC: '<path d="M10 2v16" stroke-width="1.5"/><rect x="4" y="5" width="12" height="3.5" rx="1"/><rect x="6.5" y="11.5" width="7" height="3.5" rx="1"/>',
  alignR: '<path d="M17 3v14" stroke-width="1.8"/><rect x="5" y="5" width="10" height="3.5" rx="1"/><rect x="9" y="11.5" width="6" height="3.5" rx="1"/>',
  alignT: '<path d="M3 3h14" stroke-width="1.8"/><rect x="5" y="5" width="3.5" height="10" rx="1"/><rect x="11.5" y="5" width="3.5" height="6" rx="1"/>',
  alignVC: '<path d="M2 10h16" stroke-width="1.5"/><rect x="5" y="4" width="3.5" height="12" rx="1"/><rect x="11.5" y="6.5" width="3.5" height="7" rx="1"/>',
  alignB: '<path d="M3 17h14" stroke-width="1.8"/><rect x="5" y="5" width="3.5" height="10" rx="1"/><rect x="11.5" y="9" width="3.5" height="6" rx="1"/>',
  distH: '<path d="M3 3v14M17 3v14" stroke-width="1.5"/><rect x="8" y="6" width="4" height="8" rx="1"/>',
  distV: '<path d="M3 3h14M3 17h14" stroke-width="1.5"/><rect x="6" y="8" width="8" height="4" rx="1"/>',
  code: '<path d="M7 6l-4 4 4 4M13 6l4 4-4 4" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  panel: '<rect x="3" y="4" width="14" height="12" rx="2" fill="none" stroke-width="1.6"/><path d="M8 4v12" stroke-width="1.6"/>',
  sliders: '<path d="M4 6h12M4 14h12" stroke-width="1.6"/><circle cx="8" cy="6" r="2"/><circle cx="13" cy="14" r="2"/>',
  check: '<path d="M4 10.5l4 4 8-9" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  note: '<path d="M4 3.5h12a.5.5 0 01.5.5v8.5L12.5 16.5H4a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z" fill="none" stroke-width="1.6" stroke-linejoin="round"/><path d="M12.5 16.5V13a.5.5 0 01.5-.5h3.5" fill="none" stroke-width="1.6"/><path d="M6.5 7.5h7M6.5 10.5h4" stroke-width="1.5" stroke-linecap="round"/>',
  star: '<path d="M10 2.6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.9l5-.7z" fill="none" stroke-width="1.5" stroke-linejoin="round"/>',
  tidy: '<rect x="3" y="3" width="6" height="6" rx="1.2"/><rect x="11" y="11" width="6" height="6" rx="1.2"/><path d="M12 4.5h4.5V9M8 15.5H3.5V11" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
};

export function glyph(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'glyph';
  span.innerHTML = `<svg viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true" fill="currentColor" stroke="currentColor" stroke-width="0">${G[name] || ''}</svg>`;
  return span;
}

let toastTimer = 0;
export function toast(text, kind = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, kind === 'error' ? 6000 : 2600);
}

export function button(label, { icon, title, onClick, cls = '', id } = {}) {
  const b = h('button', { type: 'button', class: `btn ${cls}`, title: title || label, 'aria-label': title || label, id }, icon ? glyph(icon) : null, label && !cls.includes('icon-only') ? h('span', {}, label) : null);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}
