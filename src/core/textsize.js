// Text sizes by kind — free text, labels, arrow labels, panel titles and letters… — for the whole
// figure, the contents of a panel, or a selection: read them, set them, scale them, or raise the
// small ones to a minimum. Sizes are canvas px; with the figure's printed width
// (canvas.printWidth, mm) they can also be given in points.
//
//   { "op": "textSize", "roles": ["labels", "arrows"], "pt": 7 }
//   { "op": "textSize", "within": "panel-b", "scale": 0.9 }
//   { "op": "textSize", "minPt": 6 }

import { visualBounds, elementBox } from './geometry.js';
import { panelStyle, panelSizes } from './panels.js';

export const TEXT_ROLES = [
  { id: 'text', name: 'Text boxes' },
  { id: 'labels', name: 'Labels' },
  { id: 'shapes', name: 'Text in shapes' },
  { id: 'arrows', name: 'Arrow labels' },
  { id: 'plots', name: 'Plot axes' },
  { id: 'scaleBars', name: 'Scale bars' },
  { id: 'titles', name: 'Panel titles' },
  { id: 'letters', name: 'Panel letters' },
];
export const TEXT_ROLE_IDS = TEXT_ROLES.map((r) => r.id);
const DEFAULT_ROLES = TEXT_ROLE_IDS.filter((r) => r !== 'letters');

const MIN_PX = 3;
const MAX_PX = 400;
const tidy = (v) => Math.round(Math.min(MAX_PX, Math.max(MIN_PX, v)) * 10) / 10;

/** Points per canvas px at a printed width (mm), or null when the width isn't known. */
export function ptPerPx(doc, widthMm = doc.canvas.printWidth) {
  return Number(widthMm) > 0 ? ((Number(widthMm) / 25.4) * 72) / doc.canvas.width : null;
}

/** The text pieces of one element: [{ role, get(), set(px) }]. Panel letters/titles set per panel. */
function piecesOf(el, doc, st) {
  const out = [];
  const add = (role, get, set) => out.push({ id: el.id, role, get, set });
  if (el.hidden || el.type === 'note') return out;
  if (el.type === 'text' && String(el.text || '').trim()) add('text', () => el.fontSize, (v) => { el.fontSize = v; });
  if (el.type === 'shape' && el.shape === 'plot') {
    add('plots', () => el.plot?.fontSize || Math.max(9, Math.min(14, el.h * 0.075)), (v) => { el.plot = { ...(el.plot || {}), fontSize: v }; });
  } else if (el.type === 'shape' && String(el.text || '').trim()) {
    add('shapes', () => el.fontSize, (v) => { el.fontSize = v; });
  }
  if ((el.type === 'icon' || el.type === 'shape' || el.type === 'image') && el.label?.text && el.label.position !== 'none') {
    add('labels', () => el.label.fontSize, (v) => { el.label = { ...el.label, fontSize: v }; });
  }
  if (el.type === 'arrow' && String(el.label || '').trim()) add('arrows', () => el.labelSize, (v) => { el.labelSize = v; });
  if (el.type === 'image' && el.scaleBar?.label !== false && el.scaleBar?.perPx > 0) {
    add('scaleBars', () => el.scaleBar.fontSize ?? Math.max(9, Math.min(28, el.h * 0.055)), (v) => { el.scaleBar = { ...el.scaleBar, fontSize: v }; });
  }
  if (el.type === 'panel') {
    if (String(el.title || '').trim()) add('titles', () => panelSizes(el, doc, st).title, (v) => { el.titleSize = v; });
    if (st.style !== 'none' && el.letter !== '' && el.letter !== false) add('letters', () => panelSizes(el, doc, st).letter, (v) => { el.letterSize = v; });
  }
  return out;
}

/** Elements whose visual center lies inside a panel (arrows and attached items included), and the panel. */
export function textScopeOfPanel(doc, panel) {
  const b = elementBox(panel, doc);
  const out = [panel.id];
  for (const e of doc.elements) {
    if (e === panel || e.type === 'panel' || e.type === 'note' || e.hidden) continue;
    const v = visualBounds(e, doc);
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) out.push(e.id);
  }
  return out;
}

function list(v) {
  if (v == null) return null;
  return (Array.isArray(v) ? v : [v]).map(String);
}

/**
 * The text pieces in a scope. scope: { ids?, within? } — neither means the whole figure.
 * `figure` is true when the scope is the whole figure (panel sizes then go to the figure style).
 */
export function textPieces(doc, { ids = null, within = null, roles = null } = {}) {
  const st = panelStyle(doc);
  const idList = list(ids), withinList = list(within);
  let scope = null;
  if (idList || withinList) {
    scope = new Set(idList || []);
    for (const pid of withinList || []) {
      const p = doc.elements.find((e) => e.id === pid);
      if (!p) throw new Error(`No element with id "${pid}"`);
      if (p.type !== 'panel') throw new Error(`"${pid}" is a ${p.type}, not a panel; use ids for single elements`);
      for (const id of textScopeOfPanel(doc, p)) scope.add(id);
    }
  }
  const want = new Set(list(roles) || TEXT_ROLE_IDS);
  for (const r of want) if (!TEXT_ROLE_IDS.includes(r)) throw new Error(`Unknown text kind "${r}". Kinds: ${TEXT_ROLE_IDS.join(', ')}`);
  const out = [];
  for (const el of doc.elements) {
    if (scope && !scope.has(el.id)) continue;
    for (const p of piecesOf(el, doc, st)) if (want.has(p.role)) out.push(p);
  }
  return { pieces: out, figure: !scope };
}

/** Sizes by kind in a scope: [{ role, name, count, min, max, ids }] (px), only kinds that occur. */
export function textSizes(doc, scope = {}) {
  const { pieces } = textPieces(doc, scope);
  return TEXT_ROLES.map((r) => {
    const ps = pieces.filter((p) => p.role === r.id);
    if (!ps.length) return null;
    const v = ps.map((p) => p.get());
    return { role: r.id, name: r.name, count: ps.length, min: Math.min(...v), max: Math.max(...v), ids: [...new Set(ps.map((p) => p.id))] };
  }).filter(Boolean);
}

/** One line for agents: "labels 16 px (6.9 pt), arrow labels 14 px…". */
export function textSizeSummary(doc, scope = {}) {
  const k = ptPerPx(doc);
  const fmt = (v) => `${+v.toFixed(1)}`;
  return textSizes(doc, scope).map((s) => {
    const px = s.min === s.max ? `${fmt(s.min)} px` : `${fmt(s.min)}–${fmt(s.max)} px`;
    const pt = k ? (s.min === s.max ? ` (${fmt(s.min * k)} pt)` : ` (${fmt(s.min * k)}–${fmt(s.max * k)} pt)`) : '';
    return `${s.name.toLowerCase()} ${px}${pt}`;
  }).join(', ');
}

/**
 * Change text sizes in place. opts: { ids?, within?, roles? (default all but panel letters),
 * size? (px) | pt? | scale? | minSize? (px) | minPt?, widthMm? (else canvas.printWidth) }.
 * Returns the ids of the elements that changed.
 */
export function applyTextSize(doc, opts = {}) {
  const k = ptPerPx(doc, opts.widthMm ?? doc.canvas.printWidth);
  const needWidth = (what) => { if (!k) throw new Error(`${what} needs the printed width: give widthMm (e.g. 183) or set it with canvas {set:{printWidth: 183}}`); };
  let size = null, scale = null, min = null;
  if (opts.pt != null) { needWidth('pt'); size = Number(opts.pt) / k; }
  else if (opts.size != null) size = Number(opts.size);
  if (opts.scale != null) scale = Number(opts.scale);
  if (opts.minPt != null) { needWidth('minPt'); min = Number(opts.minPt) / k; }
  else if (opts.minSize != null) min = Number(opts.minSize);
  if (size == null && scale == null && min == null) throw new Error('Give size (px), pt, scale or minPt');
  if (size != null && !(size > 0)) throw new Error('size must be a positive number');
  if (scale != null && !(scale > 0)) throw new Error('scale must be a positive number');
  const roles = list(opts.roles) || DEFAULT_ROLES;
  const { pieces, figure } = textPieces(doc, { ids: opts.ids, within: opts.within, roles });
  const changed = new Set();
  const next = (v) => {
    let n = v;
    if (size != null) n = size;
    if (scale != null) n *= scale;
    if (min != null) n = Math.max(n, min);
    return tidy(n);
  };
  // across the whole figure, panel letters and titles change the figure-wide style
  if (figure) {
    const st = panelStyle(doc);
    const pl = { ...(doc.panelLabels || {}) };
    let touched = false;
    if (roles.includes('letters') && doc.elements.some((e) => e.type === 'panel')) {
      pl.size = next(st.size); touched = true;
    }
    if (roles.includes('titles') && doc.elements.some((e) => e.type === 'panel' && e.title)) {
      pl.titleSize = next(st.titleSize); touched = true;
    }
    if (touched) doc.panelLabels = pl;
  }
  for (const p of pieces) {
    if (figure && (p.role === 'letters' || p.role === 'titles')) {
      // a panel with its own size keeps its difference only when scaling
      const el = doc.elements.find((e) => e.id === p.id);
      const key = p.role === 'letters' ? 'letterSize' : 'titleSize';
      if (el[key] != null) {
        if (size != null) delete el[key];
        else el[key] = next(el[key]);
      }
      changed.add(p.id);
      continue;
    }
    const before = p.get();
    const after = next(before);
    if (Math.abs(after - before) > 0.01) { p.set(after); changed.add(p.id); }
  }
  return [...changed];
}

