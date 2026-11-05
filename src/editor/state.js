// Editor state: the figure, the selection, view transform and undo history.
// Every change to the figure goes through commit() so undo/redo, autosave and
// live file sync all see the same stream of snapshots.

import { normalizeFigure, applyOps, expandGroups, findElement, registerEmbeddedIcons, embedUsedIcons, embedUsedImages, clone } from '../core/index.js';

const listeners = new Map();

export const S = {
  doc: null,
  sel: [],
  tool: 'select',
  zoom: 1,
  pan: { x: 0, y: 0 },
  grid: false,
  snap: true,
  undo: [],
  redo: [],
  base: '',
  dirty: false,
  clipboard: null,
  coalesceKey: null,
  coalesceTimer: 0,
  rev: 0,
};

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}

export function emit(evt, data) {
  for (const fn of listeners.get(evt) || []) {
    try { fn(data); } catch (err) { console.error(err); }
  }
}

/** Replace the whole figure (open, template, remote update). */
export function setDoc(input, { keepHistory = false, source = 'local', keepSelection = false } = {}) {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  registerEmbeddedIcons(raw);
  const doc = normalizeFigure(raw);
  if (keepHistory && S.base) {
    S.undo.push(S.base);
    if (S.undo.length > 200) S.undo.shift();
    S.redo = [];
  } else if (!keepHistory) {
    S.undo = [];
    S.redo = [];
  }
  S.doc = doc;
  S.base = JSON.stringify(doc);
  S.sel = keepSelection ? S.sel.filter((id) => findElement(doc, id)) : [];
  S.rev++;
  emit('doc', { source });
  emit('select');
}

/**
 * Record the current figure as a new history step.
 * coalesce: a key; consecutive commits with the same key within 600 ms merge
 * (so dragging a color picker or typing in a field makes one undo step).
 */
export function commit({ coalesce = null, source = 'local' } = {}) {
  const now = JSON.stringify(S.doc);
  if (now === S.base) { emit('doc', { source, noop: true }); return; }
  const merging = coalesce && S.coalesceKey === coalesce;
  if (!merging) {
    S.undo.push(S.base);
    if (S.undo.length > 200) S.undo.shift();
  }
  clearTimeout(S.coalesceTimer);
  S.coalesceKey = coalesce;
  if (coalesce) S.coalesceTimer = setTimeout(() => { S.coalesceKey = null; }, 600);
  S.redo = [];
  S.base = now;
  S.dirty = true;
  S.rev++;
  emit('doc', { source });
}

/** Apply a list of ops (the same language agents use) as one undo step. */
export function runOps(ops, opts = {}) {
  const r = applyOps(S.doc, ops);
  if (r.error) {
    emit('toast', { text: r.error, kind: 'error' });
    return r;
  }
  S.doc = r.doc;
  commit(opts);
  const made = r.results.flatMap((x) => x.ids || []);
  if (opts.select) select(opts.select === true ? made.filter((id) => findElement(S.doc, id)) : opts.select);
  else select(S.sel.filter((id) => findElement(S.doc, id)));
  return r;
}

export function undo() {
  if (!S.undo.length) return;
  S.redo.push(S.base);
  S.base = S.undo.pop();
  S.doc = JSON.parse(S.base);
  registerEmbeddedIcons(S.doc);
  S.coalesceKey = null;
  S.sel = S.sel.filter((id) => findElement(S.doc, id));
  S.rev++;
  emit('doc', { source: 'undo' });
  emit('select');
}

export function redo() {
  if (!S.redo.length) return;
  S.undo.push(S.base);
  S.base = S.redo.pop();
  S.doc = JSON.parse(S.base);
  registerEmbeddedIcons(S.doc);
  S.coalesceKey = null;
  S.sel = S.sel.filter((id) => findElement(S.doc, id));
  S.rev++;
  emit('doc', { source: 'redo' });
  emit('select');
}

export function select(ids, { add = false, toggle = false, groups = true } = {}) {
  let list = Array.isArray(ids) ? ids : ids == null ? [] : [ids];
  if (groups && S.doc) list = expandGroups(S.doc, list);
  if (toggle) {
    const set = new Set(S.sel);
    const allIn = list.every((id) => set.has(id));
    for (const id of list) allIn ? set.delete(id) : set.add(id);
    S.sel = [...set];
  } else if (add) {
    S.sel = [...new Set([...S.sel, ...list])];
  } else {
    S.sel = [...new Set(list)];
  }
  emit('select');
}

export function selected() {
  return S.sel.map((id) => findElement(S.doc, id)).filter(Boolean);
}

export function setTool(t) {
  S.tool = t;
  emit('tool', t);
}

/** Figure JSON for saving, with any imported icons and pictures embedded. */
export function exportDoc() {
  return embedUsedImages(embedUsedIcons(clone(S.doc)));
}
