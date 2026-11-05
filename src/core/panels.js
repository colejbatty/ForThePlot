// Multi-panel figures. A `panel` element is a frame whose letter (A, B, C…) is worked out from
// reading order every time the figure is drawn, so adding, removing or rearranging panels relabels
// them automatically. Moving a panel carries everything inside it.
//
//   { "type": "panel", "x": 30, "y": 30, "w": 560, "h": 360, "title": "Experimental design" }
// Figure-wide style: doc.panelLabels = { style: "A" | "a" | "(A)" | "(a)" | "A." | "none", size: 28,
//   titleSize: 18, letterBold: true, titleBold: true, position: "inside" | "outside", color, titleColor }
// A panel's own letterSize / titleSize override the figure-wide sizes.

import { visualBounds, elementBox } from './geometry.js';

export const PANEL_LABEL_STYLES = ['A', 'a', '(A)', '(a)', 'A.', 'none'];

export function panelStyle(doc) {
  const s = doc.panelLabels || {};
  const size = Number(s.size) > 0 ? Number(s.size) : 28;
  return {
    style: PANEL_LABEL_STYLES.includes(s.style) ? s.style : 'A',
    size,
    titleSize: Number(s.titleSize) > 0 ? Number(s.titleSize) : defaultTitleSize(size),
    letterBold: s.letterBold !== false,
    titleBold: s.titleBold !== false,
    position: s.position === 'outside' ? 'outside' : 'inside',
    color: s.color || '#1f2933',
    titleColor: s.titleColor || '#1f2933',
  };
}

/** Title size that goes with a letter size when none is set. */
export function defaultTitleSize(letterSize) {
  return Math.max(13, Math.round(letterSize * 0.66));
}

/** The letter and title sizes one panel is drawn with: its own, else the figure's. */
export function panelSizes(el, doc, st = panelStyle(doc)) {
  return {
    letter: Number(el.letterSize) > 0 ? Number(el.letterSize) : st.size,
    title: Number(el.titleSize) > 0 ? Number(el.titleSize) : st.titleSize,
  };
}

function letterFor(i, style) {
  let n = i, s = '';
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  switch (style) {
    case 'a': return s.toLowerCase();
    case '(A)': return `(${s})`;
    case '(a)': return `(${s.toLowerCase()})`;
    case 'A.': return `${s}.`;
    case 'none': return '';
    default: return s;
  }
}

/** Panels in reading order: rows top to bottom (by overlap of their vertical extents), then left to right. */
export function orderedPanels(doc) {
  const panels = doc.elements.filter((e) => e.type === 'panel' && !e.hidden);
  const sorted = panels.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const p of sorted) {
    const row = rows.find((r) => {
      const top = Math.max(r.top, p.y), bot = Math.min(r.bottom, p.y + p.h);
      return bot - top > 0.5 * Math.min(r.bottom - r.top, p.h) && Math.abs(p.y - r.top) < 0.5 * Math.min(r.bottom - r.top, p.h);
    });
    if (row) { row.items.push(p); row.bottom = Math.max(row.bottom, p.y + p.h); } else rows.push({ top: p.y, bottom: p.y + p.h, items: [p] });
  }
  rows.sort((a, b) => a.top - b.top);
  return rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
}

/** Map of panel id → letter shown ("" for none). A panel's own `letter` overrides the automatic one. */
export function panelLetters(doc) {
  const st = panelStyle(doc);
  const out = new Map();
  let i = 0;
  for (const p of orderedPanels(doc)) {
    if (p.letter === false || p.letter === '') { out.set(p.id, ''); continue; }
    if (typeof p.letter === 'string') { out.set(p.id, p.letter); i++; continue; }
    out.set(p.id, letterFor(i++, st.style));
  }
  return out;
}

/** Elements whose visual center lies inside the panel (not other panels, notes or arrows). */
export function panelContents(doc, panel) {
  const b = elementBox(panel, doc);
  const out = [];
  for (const e of doc.elements) {
    if (e === panel || e.type === 'panel' || e.type === 'arrow' || e.type === 'note' || e.attachedTo) continue;
    const v = visualBounds(e, doc);
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) out.push(e.id);
  }
  return out;
}

/** ids plus what travels with them: attached items and the contents of panels (recursively). */
export function expandMoving(doc, ids) {
  const set = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...set]) {
      const e = doc.elements.find((x) => x.id === id);
      if (e?.type === 'panel') for (const c of panelContents(doc, e)) if (!set.has(c)) { set.add(c); grew = true; }
    }
    for (const e of doc.elements) if (e.attachedTo && set.has(e.attachedTo) && !set.has(e.id)) { set.add(e.id); grew = true; }
  }
  return [...set];
}

/**
 * Lay out panels. Either a grid that fills an area of the canvas:
 *   { rows: 2, cols: 2, x?, y?, w?, h?, gap?: 24, margin?: 30, widths?: [2, 1], heights?: [1, 1],
 *     cells?: [{ row, col, rowSpan?, colSpan?, title? }], titles?: ["…", "…"] }
 * or frames around existing content:
 *   { wrap: [["tcell", "tumor"], ["plot1", "plot2"]], padding?: 20, titles?: […] }
 * Returns the specs of the new panels, in reading order.
 */
export function layoutPanels(doc, op) {
  const titles = op.titles || [];
  const common = {};
  for (const k of ['fill', 'stroke', 'strokeWidth', 'radius', 'dash']) if (op[k] != null) common[k] = op[k];
  if (Array.isArray(op.wrap)) {
    const pad = op.padding ?? 20;
    const st = panelStyle(doc);
    const top = pad + (st.position === 'inside' ? st.size * 1.5 : 0);
    return op.wrap.map((ids, i) => {
      const list = (Array.isArray(ids) ? ids : [ids]).map(String);
      const els = list.map((id) => doc.elements.find((e) => e.id === id)).filter(Boolean);
      if (!els.length) throw new Error(`wrap #${i + 1}: none of ${list.join(', ')} exist`);
      const bs = els.map((e) => visualBounds(e, doc));
      const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
      const x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
      return { type: 'panel', ...common, x: x0 - pad, y: y0 - top, w: x1 - x0 + 2 * pad, h: y1 - y0 + top + pad, title: titles[i] ?? '' };
    });
  }
  const rows = Math.max(1, Math.round(op.rows ?? 1)), cols = Math.max(1, Math.round(op.cols ?? 2));
  const margin = op.margin ?? 30, gap = op.gap ?? 24;
  const x = op.x ?? margin, y = op.y ?? margin;
  const W = op.w ?? doc.canvas.width - x - margin, H = op.h ?? doc.canvas.height - y - margin;
  const norm = (arr, n) => { const a = Array.from({ length: n }, (_, i) => Math.max(0.05, Number(arr?.[i]) || 1)); const s = a.reduce((p, q) => p + q, 0); return a.map((v) => v / s); };
  const fw = norm(op.widths, cols), fh = norm(op.heights, rows);
  const cw = W - gap * (cols - 1), ch = H - gap * (rows - 1);
  const xs = [x], ys = [y];
  for (let c = 0; c < cols; c++) xs.push(xs[c] + fw[c] * cw + gap);
  for (let r = 0; r < rows; r++) ys.push(ys[r] + fh[r] * ch + gap);
  const cells = op.cells || Array.from({ length: rows * cols }, (_, i) => ({ row: Math.floor(i / cols), col: i % cols }));
  return cells.map((c, i) => {
    const r0 = Math.min(rows - 1, c.row ?? 0), c0 = Math.min(cols - 1, c.col ?? 0);
    const r1 = Math.min(rows, r0 + (c.rowSpan ?? 1)), c1 = Math.min(cols, c0 + (c.colSpan ?? 1));
    return {
      type: 'panel', ...common,
      x: xs[c0], y: ys[r0], w: xs[c1] - xs[c0] - gap, h: ys[r1] - ys[r0] - gap,
      title: c.title ?? titles[i] ?? '',
    };
  });
}
