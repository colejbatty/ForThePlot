// Save part of a figure as a reusable icon: the selected objects (with what is attached to them,
// what is inside selected panels, and arrows between them) are drawn into one SVG icon that can be
// added to any figure, resized and recolored like an imported icon.
//
// The icon keeps the credits of any third-party icons it was made from, so figures that use it
// still credit the original authors.

import { renderElement, contentBounds } from './render.js';
import { expandMoving } from './panels.js';
import { arrowGeometry } from './geometry.js';
import { clone } from './model.js';
import { getIcon, sanitizeSvg } from '../icons/registry.js';

export const MY_ICONS_PREFIX = 'my';
export const MY_ICONS_CATEGORY = 'My icons';

export function iconSlug(name) {
  return String(name || 'icon').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'icon';
}

/** Credits of the third-party icons among some elements (deduplicated). */
export function creditsOf(elements) {
  const seen = new Map();
  const add = (c) => {
    if (!c?.author) return;
    const key = `${c.author}|${c.license}|${c.source || ''}`;
    if (!seen.has(key)) seen.set(key, { author: c.author, license: c.license || '', source: c.source || '', icons: [] });
    const entry = seen.get(key);
    for (const n of c.icons || [c.name]) if (n && !entry.icons.includes(n)) entry.icons.push(n);
  };
  for (const el of elements) {
    if (el.type !== 'icon') continue;
    const def = getIcon(el.icon);
    if (!def) continue;
    if (def.own) (def.credits || []).forEach(add);
    else if (def.author && def.author !== 'ForThePlot contributors') add({ author: def.author, license: def.license, source: def.source, name: def.name });
  }
  return [...seen.values()];
}

/** The elements that go into an icon made from `ids`, as standalone copies. */
export function iconElements(doc, ids) {
  const want = new Set(expandMoving(doc, ids));
  // arrows between two things that are both in the icon come along
  for (const e of doc.elements) {
    if (e.type === 'arrow' && e.from?.id && e.to?.id && want.has(e.from.id) && want.has(e.to.id)) want.add(e.id);
  }
  const out = [];
  for (const e of doc.elements) {
    if (!want.has(e.id) || e.type === 'note' || e.hidden) continue;
    const c = clone(e);
    if (c.type === 'arrow') {
      // an end attached to something left out becomes a fixed point where it was drawn
      const g = arrowGeometry(e, doc);
      if (c.from?.id && !want.has(c.from.id)) c.from = { x: g.start.x, y: g.start.y };
      if (c.to?.id && !want.has(c.to.id)) c.to = { x: g.end.x, y: g.end.y };
    }
    if (c.attachedTo && !want.has(c.attachedTo)) delete c.attachedTo;
    out.push(c);
  }
  return out;
}

/**
 * Build an icon definition from figure elements.
 * opts: { name, category, tags } → { id (without the "my/" prefix), name, category, tags, w, h, size, svg, own, credits, … }
 */
export function iconFromElements(doc, ids, { name = 'My icon', category = MY_ICONS_CATEGORY, tags = [] } = {}) {
  const list = (Array.isArray(ids) ? ids : [ids]).map(String);
  for (const id of list) if (!doc.elements.some((e) => e.id === id)) throw new Error(`No element with id "${id}"`);
  const els = iconElements(doc, list);
  if (!els.length) throw new Error('Nothing to save: select one or more objects (notes are left out).');
  const tmp = { ...doc, elements: els };
  const b = contentBounds(tmp);
  if (!(b.w > 0 && b.h > 0)) throw new Error('The selection has no visible size.');
  const pad = 1;
  const x0 = b.x - pad, y0 = b.y - pad, w = b.w + pad * 2, h = b.h + pad * 2;
  const body = els.map((e) => renderElement(e, tmp, { ids: false, uidPrefix: 'ic' })).join('');
  const svg = sanitizeSvg(`<g transform="translate(${r2(-x0)} ${r2(-y0)})">${body}</g>`);
  const credits = creditsOf(els);
  const words = String(name).toLowerCase().split(/[^a-z0-9+]+/).filter((t) => t.length > 1);
  return {
    id: iconSlug(name),
    name: String(name).trim() || 'My icon',
    category: category || MY_ICONS_CATEGORY,
    tags: [...new Set([...tags.map((t) => String(t).toLowerCase()), ...words, 'mine'])],
    w: r2(w), h: r2(h), size: Math.round(w), svg, shape: 'rect',
    own: true, credits,
    license: credits.length ? credits.map((c) => c.license).filter(Boolean).join(', ') : 'Your own',
    author: credits.length ? credits.map((c) => c.author).join(', ') : 'You',
    created: new Date().toISOString(),
  };
}

/** An id not already used by another icon in `pack` (ids are without the prefix). */
export function uniqueIconId(pack, base) {
  const used = new Set((pack?.icons || []).map((i) => i.id));
  if (!used.has(base)) return base;
  for (let k = 2; ; k++) if (!used.has(`${base}-${k}`)) return `${base}-${k}`;
}

/** An empty "My icons" pack. */
export function emptyMyIconsPack() {
  return { format: 'fortheplot-icon-pack', version: 1, name: MY_ICONS_CATEGORY, prefix: MY_ICONS_PREFIX, license: 'Your own', author: 'You', source: '', icons: [] };
}

/**
 * Ops that put a saved icon where the selection was (and remove the selection), keeping its size.
 * `fullId` is the registered id, e.g. "my/t-cell-cluster".
 */
export function replaceWithIconOps(doc, ids, fullId, def) {
  const els = iconElements(doc, ids);
  const b = contentBounds({ ...doc, elements: els });
  const remove = expandMoving(doc, ids).filter((id) => doc.elements.some((e) => e.id === id && e.type !== 'note'));
  return [
    { op: 'remove', ids: remove },
    { op: 'add', element: { icon: fullId, x: b.x - 1, y: b.y - 1, w: def.w, h: def.h } },
  ];
}

const r2 = (v) => Math.round(v * 100) / 100;
