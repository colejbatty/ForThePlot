// Building blocks: one op draws a whole, correctly laid-out figure motif.
//   synapse   two cells facing each other with receptor–ligand pairs that meet
//   pathway   a signaling cascade laid out in layers, with compartments
//   timeline  an experiment timeline (doses, harvests, readouts)
//   gating    a flow cytometry gating strategy (procedural dot plots)
//   tidy      nudge overlapping things apart
// Every block returns the ids it created so callers (and agents) can refine them.

import { normalizeElement, newId, findElement, clone } from './model.js';
import { elementBox, visualBounds, union, center, rotatePoint, overlapArea } from './geometry.js';
import { layoutText } from './text.js';
import { getIcon } from '../icons/registry.js';
import { PALETTE, shade } from './color.js';

class BlockError extends Error {}
const need = (c, m) => { if (!c) throw new BlockError(m); };

function add(doc, spec, made) {
  const el = normalizeElement(spec);
  if (el.type === 'icon') need(getIcon(el.icon), `Unknown icon "${el.icon}". Use search_icons to find ids.`);
  el.id = spec.id && !findElement(doc, spec.id) ? String(spec.id) : newId(doc, spec.id || el.icon || (el.type === 'shape' ? el.shape : el.type));
  doc.elements.push(el);
  made.push(el.id);
  return el;
}

/** Icon names as rich-text labels: "CD8⁺ T cell (Treg)" → "CD8^+ T cell". */
export function labelName(name) {
  return String(name || '').replace(/ \(.*\)$/, '').replace(/⁺/g, '^+').replace(/⁻/g, '^-');
}

function iconSpec(v, defaults = {}) {
  if (v == null) return null;
  if (typeof v === 'string') return { ...defaults, icon: v };
  return { ...defaults, ...v };
}

/** Place an icon so its membrane anchor sits at P and it points along `dirDeg` (0 = right). */
export function seat(el, P, dirDeg, hostId) {
  const def = getIcon(el.icon);
  const vw = def?.w ?? 100, vh = def?.h ?? 100;
  const [ax, ay] = def?.anchor ?? [vw / 2, vh];
  const rot = dirDeg + 90;
  const off = rotatePoint({ x: (ax / vw - 0.5) * el.w, y: (ay / vh - 0.5) * el.h }, { x: 0, y: 0 }, rot);
  el.rotation = ((rot % 360) + 360) % 360;
  el.x = P.x - off.x - el.w / 2;
  el.y = P.y - off.y - el.h / 2;
  if (hostId) el.attachedTo = hostId;
}

/** How far an icon reaches from its membrane anchor to its tip, at width w. */
function reach(iconId, w) {
  const def = getIcon(iconId);
  if (!def) return w;
  const h = w * (def.h / def.w);
  const ay = def.anchor ? def.anchor[1] : def.h;
  return Math.max(4, ((ay - def.h * 0.03) / def.h) * h);
}

function sizeIcon(spec, w) {
  const def = getIcon(spec.icon);
  const ww = spec.w ?? w;
  return { ...spec, w: ww, h: ww * ((def?.h ?? 100) / (def?.w ?? 100)) };
}

// ---- synapse ----------------------------------------------------------------------

export function synapse(doc, op) {
  const made = [];
  const cx = op.cx ?? doc.canvas.width / 2, cy = op.cy ?? doc.canvas.height / 2;
  const size = op.size ?? 210;
  const rw = op.receptorSize ?? Math.round(size * 0.26);
  const label = (v, fallback) => (v === false ? null : v == null ? fallback : typeof v === 'string' ? { text: v, fontSize: 18, bold: true } : v);

  const makeCell = (v, fallbackIcon) => {
    if (typeof v === 'string' && findElement(doc, v)) return findElement(doc, v);
    const spec = iconSpec(v ?? fallbackIcon);
    const def = getIcon(spec.icon);
    need(def, `Unknown cell icon "${spec.icon}"`);
    return add(doc, { type: 'icon', ...sizeIcon(spec, size), label: label(spec.label, { text: labelName(def.name), fontSize: 18, bold: true }), x: 0, y: 0 }, made);
  };
  const L = makeCell(op.left, 't-cell-cd8');
  const R = makeCell(op.right, 'tumor-cell');
  const rL = (L.w / 2) * (getIcon(L.icon)?.body ?? 0.85);
  const rR = (R.w / 2) * (getIcon(R.icon)?.body ?? 0.85);

  const pairs = (op.pairs || [['tcr', 'mhc-i']]).map((p) => (Array.isArray(p) ? { left: p[0], right: p[1], ...(p[2] || {}) } : p));
  need(pairs.length, 'synapse needs at least one pair');
  const n = pairs.length;
  const spacing = op.spacing ?? Math.min(Math.min(rL, rR) * 0.62 / Math.max(1, (n - 1) / 2 || 1), rw * 1.15);
  const dys = pairs.map((_, i) => (i - (n - 1) / 2) * spacing);
  const chord = (r, dy) => Math.sqrt(Math.max(0, r * r - dy * dy));

  // natural reach of each pair (receptor + ligand [+ blocking antibody])
  const info = pairs.map((p, i) => {
    const ls = iconSpec(p.left), rs = iconSpec(p.right);
    need(getIcon(ls.icon) && getIcon(rs.icon), `Unknown icon in pair ${i + 1}`);
    const lw = ls.w ?? rw, rwid = rs.w ?? rw;
    const block = p.blockedBy ? iconSpec(p.blockedBy) : null;
    const span = reach(ls.icon, lw) + reach(rs.icon, rwid) + (block ? rw * 1.05 : 0);
    return { p, ls, rs, lw, rwid, block, span, dy: dys[i] };
  });
  // center distance: the median pair meets exactly; others are scaled slightly to meet too
  const needD = info.map((q) => q.span + chord(rL, q.dy) + chord(rR, q.dy) - 3).sort((a, b) => a - b);
  const D = op.distance ?? needD[Math.floor((needD.length - 1) / 2)];
  L.x = cx - D / 2 - L.w / 2; L.y = cy - L.h / 2;
  R.x = cx + D / 2 - R.w / 2; R.y = cy - R.h / 2;
  const cL = { x: cx - D / 2, y: cy }, cR = { x: cx + D / 2, y: cy };

  for (const q of info) {
    const pL = { x: cL.x + chord(rL, q.dy), y: cy + q.dy };
    const pR = { x: cR.x - chord(rR, q.dy), y: cy + q.dy };
    const avail = pR.x - pL.x + 3;
    const s = Math.max(0.75, Math.min(1.3, avail / q.span));
    const recEl = add(doc, { type: 'icon', ...sizeIcon({ ...q.ls, w: q.lw * s }, q.lw * s), x: 0, y: 0 }, made);
    seat(recEl, pL, 0, L.id);
    const ligEl = add(doc, { type: 'icon', ...sizeIcon({ ...q.rs, w: q.rwid * s }, q.rwid * s), x: 0, y: 0 }, made);
    seat(ligEl, pR, 180, R.id);
    if (q.block) {
      // the blocking antibody fills the gap between receptor and ligand, arms toward the receptor
      const tipX = pL.x + reach(q.ls.icon, q.lw * s);
      const len = rw * 1.05 * s;
      const ab = add(doc, { type: 'icon', ...sizeIcon({ ...q.block, label: undefined }, len), x: 0, y: 0 }, made);
      ab.rotation = 270;
      const c = { x: tipX - 2 + ab.h / 2, y: cy + q.dy };
      ab.x = c.x - ab.w / 2;
      ab.y = c.y - ab.h / 2;
      ab.attachedTo = L.id;
      if (q.block.label && !op.legend) {
        const t = add(doc, { type: 'text', text: q.block.label, fontSize: 14, bold: true, color: shade(q.block.colors?.primary || '#2f9e6e', -0.35), x: 0, y: 0 }, made);
        const tb = elementBox(t, doc);
        t.x = c.x - tb.w / 2;
        t.y = c.y + ab.w / 2 + 4;
        t.attachedTo = L.id;
      }
    }
    if (q.p.label && op.pairLabels !== false) {
      const t = add(doc, { type: 'text', text: q.p.label, fontSize: 13, color: '#52606d', x: 0, y: 0, background: '#ffffffd9' }, made);
      const b = elementBox(t, doc);
      t.x = (pL.x + pR.x) / 2 - b.w / 2;
      t.y = cy + q.dy - Math.max(recEl.w, ligEl.w) / 2 - b.h - 2;
    }
  }

  // move receptors behind their cells so stalks tuck under the membrane
  const behind = new Set(made.filter((id) => { const e = findElement(doc, id); return e.attachedTo && e.type === 'icon'; }));
  const rest = doc.elements.filter((e) => !behind.has(e.id));
  const firstCell = Math.min(rest.indexOf(L), rest.indexOf(R));
  doc.elements = [...rest.slice(0, firstCell), ...doc.elements.filter((e) => behind.has(e.id)), ...rest.slice(firstCell)];

  if (op.legend) {
    const seen = new Map();
    for (const q of info) for (const sp of [q.ls, q.rs, q.block].filter(Boolean)) if (!seen.has(sp.icon + (sp.label || ''))) seen.set(sp.icon + (sp.label || ''), sp);
    const rowH = 36, iconH = 30;
    let y0 = cy + Math.max(L.h, R.h) / 2 + 64;
    const left = Math.max(30, cx - D / 2 - L.w / 2), right = doc.canvas.width - 30;
    let x = left;
    for (const sp of seen.values()) {
      const def = getIcon(sp.icon);
      const iw = Math.min(iconH * (def.w / def.h), 44);
      const name = sp.legend || sp.label || labelName(def.name);
      const tw = layoutText(name, { fontSize: 14 }).width;
      if (x > left && x + iw + 6 + tw > right) { x = left; y0 += rowH; }
      const ic = add(doc, { type: 'icon', icon: sp.icon, colors: sp.colors, w: iw, h: iw * (def.h / def.w), x, y: 0 }, made);
      ic.y = y0 + (rowH - ic.h) / 2;
      add(doc, { type: 'text', text: name, fontSize: 14, x: x + iw + 6, y: y0 + rowH / 2 - 9, color: '#3e4c59' }, made);
      x += iw + 6 + tw + 28;
    }
  }
  return made;
}

// ---- pathway ----------------------------------------------------------------------

const EDGE_STYLE = {
  activates: { head: 'arrow' },
  'leads to': { head: 'open' },
  produces: { head: 'open', dash: 'dashed' },
  inhibits: { head: 'inhibit', stroke: '#d64545' },
  binds: { head: 'circle' },
  translocates: { head: 'arrow', dash: 'dashed' },
  phosphorylates: { head: 'arrow', label: 'P' },
  secretes: { head: 'arrow', dash: 'dashed' },
};

const NODE_COLORS = [PALETTE.blue, PALETTE.teal, PALETTE.orange, PALETTE.purple, PALETTE.green, PALETTE.red, PALETTE.magenta, PALETTE.indigo];

export function pathway(doc, op) {
  const made = [];
  const nodes = (op.nodes || []).map((n) => (typeof n === 'string' ? { id: n, label: n } : n));
  need(nodes.length, 'pathway needs nodes');
  const edges = (op.edges || []).map((e) => (Array.isArray(e) ? { from: e[0], to: e[1], type: e[2] || 'activates', label: e[3] } : e));
  const byKey = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) need(byKey.has(e.from) && byKey.has(e.to), `Edge ${e.from} → ${e.to} names an unknown node`);
  // layers: longest path from sources (cycle-safe)
  const layer = new Map(nodes.map((n) => [n.id, n.layer ?? 0]));
  for (let it = 0; it < nodes.length; it++) {
    let changed = false;
    for (const e of edges) {
      if (byKey.get(e.to).layer != null) continue;
      if (layer.get(e.to) < layer.get(e.from) + 1) { layer.set(e.to, layer.get(e.from) + 1); changed = true; }
    }
    if (!changed) break;
  }
  const L = Math.max(...layer.values()) + 1;
  const layers = Array.from({ length: L }, () => []);
  nodes.forEach((n) => layers[layer.get(n.id)].push(n));
  // order: barycenter of parents
  const pos = new Map();
  layers[0].forEach((n, i) => pos.set(n.id, i));
  for (let k = 1; k < L; k++) {
    layers[k].sort((a, b) => bary(a) - bary(b));
    layers[k].forEach((n, i) => pos.set(n.id, i));
  }
  function bary(n) {
    const ps = edges.filter((e) => e.to === n.id).map((e) => pos.get(e.from)).filter((v) => v != null);
    return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0;
  }

  const down = (op.direction || 'down') !== 'right';
  const size = op.size ?? 84;
  const layerGap = op.layerGap ?? 70, nodeGap = op.nodeGap ?? 46;
  const fs = op.fontSize ?? 17;
  // create node elements (unpositioned) to measure them
  const els = new Map();
  let colorIdx = 0;
  for (const n of nodes) {
    let el;
    if (n.icon) {
      el = add(doc, { type: 'icon', ...sizeIcon({ icon: n.icon, colors: n.colors }, n.w ?? size), id: n.id, x: 0, y: 0, label: n.label ? { text: n.label, fontSize: fs - 1, bold: true, position: n.labelPosition || (down ? 'right' : 'bottom') } : null }, made);
    } else {
      const color = n.color || NODE_COLORS[colorIdx++ % NODE_COLORS.length];
      const lay = layoutText(`**${n.label ?? n.id}**`, { fontSize: fs });
      const shape = n.shape || 'pill';
      const w = n.w ?? Math.max(70, lay.width + 30), h = n.h ?? (shape === 'circle' ? w : lay.height + 18);
      el = add(doc, {
        type: 'shape', id: n.id, shape: shape === 'pill' || shape === 'box' ? 'rect' : shape === 'circle' ? 'ellipse' : shape,
        radius: shape === 'pill' ? h / 2 : 8, x: 0, y: 0, w, h, fill: shade(color, 0.78), stroke: color, strokeWidth: 2,
        text: `**${n.label ?? n.id}**`, fontSize: fs, textColor: shade(color, -0.5),
      }, made);
    }
    els.set(n.id, el);
  }
  // positions
  const boxOf = (el) => visualBounds(el, doc);
  const x0 = op.x ?? 60, y0 = op.y ?? 80;
  let along = down ? y0 : x0;
  const extents = layers.map((ls) => ls.reduce((s, n) => s + (down ? boxOf(els.get(n.id)).w : boxOf(els.get(n.id)).h), 0) + nodeGap * (ls.length - 1));
  const maxExtent = Math.max(...extents);
  const crossCenter = down
    ? (op.cx ?? (op.x != null ? x0 + maxExtent / 2 : doc.canvas.width / 2))
    : (op.cy ?? (op.y != null ? y0 + maxExtent / 2 : doc.canvas.height / 2));
  layers.forEach((ls, k) => {
    const thick = Math.max(...ls.map((n) => (down ? els.get(n.id).h : els.get(n.id).w)));
    let cross = crossCenter - extents[k] / 2;
    for (const n of ls) {
      const el = els.get(n.id);
      const vb = boxOf(el);
      if (down) {
        el.x += cross - vb.x;
        el.y = along + (thick - el.h) / 2;
        cross += vb.w + nodeGap;
      } else {
        el.y += cross - vb.y;
        el.x = along + (thick - el.w) / 2;
        cross += vb.h + nodeGap;
      }
    }
    along += thick + layerGap;
  });
  // edges
  for (const e of edges) {
    const st = EDGE_STYLE[e.type] || EDGE_STYLE.activates;
    const spec = {
      type: 'arrow', from: { id: e.from, anchor: e.fromAnchor || 'auto' }, to: { id: e.to, anchor: e.toAnchor || 'auto' },
      head: st.head, dash: st.dash || 'solid', stroke: e.color || st.stroke || '#52606d', width: op.arrowWidth ?? 3,
      label: e.label ?? st.label ?? '', labelSize: 14, routing: e.routing || 'straight', gap: 7,
    };
    add(doc, spec, made);
  }
  // membrane through the first layer
  const behind = [];
  if (op.membrane) {
    const first = layers[0].map((n) => els.get(n.id));
    const anchorY = (el) => {
      const def = el.type === 'icon' ? getIcon(el.icon) : null;
      return def?.anchor ? el.y + (def.anchor[1] / def.h) * el.h : el.y + el.h + layerGap / 2;
    };
    const all = union([...els.values()].map(boxOf));
    const my = down ? Math.max(...first.map(anchorY)) : 0;
    const th = typeof op.membrane === 'object' && op.membrane.thickness ? op.membrane.thickness : 34;
    const mw = Math.max(all.w + 160, Math.min(doc.canvas.width - 80, 640));
    const mx = Math.max(20, Math.min(all.x + all.w / 2 - mw / 2, doc.canvas.width - 20 - mw));
    const m = add(doc, { type: 'shape', shape: 'membrane', x: mx, y: my - th / 2, w: mw, h: th }, made);
    behind.push(m.id);
    if (typeof op.membrane === 'object' && op.membrane.label) {
      const t = add(doc, { type: 'text', text: op.membrane.label, fontSize: 14, italic: true, color: '#7b8794', x: 0, y: my + th / 2 + 4 }, made);
      t.x = mx + mw - elementBox(t, doc).w;
    }
  }
  // compartments (nucleus, endosome …) drawn behind their members
  for (const c of op.compartments || []) {
    const members = (c.ids || []).map((id) => els.get(id) || findElement(doc, id)).filter(Boolean);
    if (!members.length) continue;
    const u = union(members.map(boxOf));
    const pad = c.padding ?? 26;
    const color = c.color || (/nucle/i.test(c.label || '') ? PALETTE.purple : PALETTE.slate);
    const box = add(doc, {
      type: 'shape', shape: 'rect', x: u.x - pad, y: u.y - pad - 18, w: u.w + pad * 2, h: u.h + pad * 2 + 18, radius: 34,
      fill: shade(color, 0.88), stroke: color, strokeWidth: 2, dash: 'dashed',
    }, made);
    behind.push(box.id);
    if (c.label) {
      add(doc, { type: 'text', text: `**${c.label}**`, fontSize: 14, color: shade(color, -0.3), x: box.x + 16, y: box.y + 8 }, made);
    }
  }
  if (behind.length) {
    const set = new Set(behind);
    doc.elements = [...doc.elements.filter((e) => set.has(e.id)), ...doc.elements.filter((e) => !set.has(e.id))];
  }
  return made;
}

// ---- timeline ---------------------------------------------------------------------

export function timeline(doc, op) {
  const made = [];
  const events = op.events || [];
  need(events.length, 'timeline needs events');
  const unit = op.unit ?? 'Day';
  const allTimes = events.flatMap((e) => (e.to != null ? [e.at ?? e.from, e.to] : [].concat(e.at)));
  const start = op.start ?? Math.min(0, ...allTimes);
  const end = op.end ?? Math.max(...allTimes) + Math.max(1, Math.round((Math.max(...allTimes) - start) * 0.08));
  let x0 = op.x ?? 80;
  const width = op.width ?? doc.canvas.width - x0 - 60;
  const y = op.y ?? doc.canvas.height / 2;
  const color = op.color ?? '#52606d';
  if (op.subject) {
    const s = iconSpec(op.subject);
    const ic = add(doc, { type: 'icon', ...sizeIcon(s, s.w ?? 110), x: x0, y: 0, label: s.label ? { text: s.label, fontSize: 15 } : null }, made);
    ic.y = y - ic.h / 2;
    x0 += ic.w + 30;
  }
  const w = width - (x0 - (op.x ?? 80));
  const X = (t) => x0 + ((t - start) / (end - start)) * w;
  add(doc, { type: 'arrow', from: [x0 - 10, y], to: [x0 + w + 24, y], head: 'arrow', stroke: color, width: 3.5 }, made);
  const span = end - start;
  const step = op.tickStep ?? [1, 2, 5, 7, 10, 14, 20, 30, 50, 100].find((s) => span / s <= 12) ?? Math.ceil(span / 10);
  const eventTimes = new Set();
  for (const e of events) for (const t of [].concat(e.at ?? []).concat(e.from ?? []).concat(e.to ?? [])) if (t != null) eventTimes.add(t);
  const stepTicks = [];
  for (let t = Math.ceil(start / step) * step; t <= end; t += step) stepTicks.push(t);
  const labelled = [];
  const tickAt = (t, withLabel) => {
    add(doc, { type: 'arrow', from: [X(t), y - 7], to: [X(t), y + 7], head: 'none', stroke: color, width: 2 }, made);
    if (!withLabel || labelled.some((u) => Math.abs(X(u) - X(t)) < 26)) return;
    labelled.push(t);
    const lab = add(doc, { type: 'text', text: `${t}`, fontSize: 14, color, x: 0, y: y + 12, align: 'center', bold: eventTimes.has(t) }, made);
    lab.x = X(t) - elementBox(lab, doc).w / 2;
  };
  for (const t of [...eventTimes].sort((a, b) => a - b)) tickAt(t, true);
  for (const t of stepTicks) if (!eventTimes.has(t)) tickAt(t, true);
  add(doc, { type: 'text', text: unit, fontSize: 14, italic: true, color, x: x0 + w + 30, y: y - 9 }, made);
  // events: stack in rows above (or below) the axis when labels would collide
  const rowsAbove = [], rowsBelow = [];
  const iconH = op.iconSize ?? 54;
  events.forEach((e, i) => {
    const times = e.to != null ? [e.at ?? e.from, e.to] : [].concat(e.at);
    const ecolor = e.color || NODE_COLORS[i % NODE_COLORS.length];
    const below = e.below ?? false;
    const rows = below ? rowsBelow : rowsAbove;
    const xc = e.to != null ? (X(times[0]) + X(times[1])) / 2 : times.reduce((acc, t) => acc + X(t), 0) / times.length;
    const lab = layoutText(e.label || '', { fontSize: 15, maxWidth: 170 });
    let ic = null;
    if (e.icon) {
      const sp = iconSpec(e.icon);
      const def = getIcon(sp.icon);
      need(def, `Unknown icon "${sp.icon}"`);
      const k = Math.min(iconH / def.h, (iconH * 1.7) / def.w);
      ic = add(doc, { type: 'icon', ...sp, w: def.w * k, h: def.h * k, x: 0, y: 0 }, made);
    }
    const halfW = Math.max(lab.width, ic ? ic.w : 0) / 2 + 10;
    let row = 0;
    while (rows[row] && rows[row].some(([a2, b2]) => xc - halfW < b2 && xc + halfW > a2)) row++;
    (rows[row] ||= []).push([xc - halfW, xc + halfW]);
    const blockH = (ic ? ic.h + 6 : 0) + lab.height;
    const offset = 30 + row * (iconH + 18 + 24);
    if (e.to != null) {
      add(doc, { type: 'shape', shape: 'rect', x: X(times[0]), y: below ? y + 34 : y - 22, w: X(times[1]) - X(times[0]), h: 12, radius: 6, fill: ecolor, stroke: 'none' }, made);
    } else {
      for (const t of times) add(doc, { type: 'shape', shape: 'triangle', x: X(t) - 8, y: below ? y + 34 : y - 22, w: 16, h: 13, fill: ecolor, stroke: 'none', rotation: below ? 0 : 180 }, made);
    }
    let top = below ? y + 52 + row * (iconH + 18 + 24) : y - offset - blockH;
    if (e.label) {
      const t = add(doc, { type: 'text', text: e.label, fontSize: 15, color: shade(ecolor, -0.35), align: 'center', w: Math.min(170, lab.width + 2), x: 0, y: 0 }, made);
      const b2 = elementBox(t, doc);
      t.x = xc - b2.w / 2;
      t.y = top;
      top += b2.h + 6;
    }
    if (ic) {
      ic.x = xc - ic.w / 2;
      ic.y = top;
    }
  });
  return made;
}

// ---- gating -----------------------------------------------------------------------

const DEFAULT_GATES = [
  { type: 'ellipse', x: 0.18, y: 0.2, w: 0.5, h: 0.5 },
  { type: 'polygon', points: [[0.1, 0.06], [0.92, 0.82], [0.92, 0.96], [0.06, 0.2]] },
  { type: 'rect', x: 0.04, y: 0.04, w: 0.42, h: 0.9 },
  { type: 'rect', x: 0.5, y: 0.08, w: 0.46, h: 0.86 },
  { type: 'rect', x: 0.52, y: 0.52, w: 0.44, h: 0.44 },
];

function popsForGate(g, i) {
  // put a population inside the gate and some events outside it
  let gx = 0.5, gy = 0.5, sx = 0.08, sy = 0.08;
  if (g.type === 'polygon') { gx = 0.5; gy = 0.5; sx = 0.2; sy = 0.2; }
  else { gx = g.x + g.w / 2; gy = g.y + g.h / 2; sx = g.w / 5; sy = g.h / 5; }
  const diag = g.type === 'polygon';
  const inside = diag
    ? Array.from({ length: 6 }, (_, k) => ({ x: 0.2 + k * 0.12, y: 0.22 + k * 0.12, sx: 0.04, sy: 0.04, n: 70 }))
    : [{ x: gx, y: gy, sx, sy, n: 380 }];
  const outside = [{ x: 1 - gx * 0.8, y: 1 - gy * 0.9, sx: 0.08, sy: 0.08, n: 120 + 40 * (i % 3) }, { x: 0.2, y: 0.15, sx: 0.06, sy: 0.05, n: 70 }];
  return [...inside, ...outside];
}

export function gating(doc, op) {
  const made = [];
  const steps = op.steps || [];
  need(steps.length, 'gating needs steps');
  const gap = op.gap ?? 70;
  const x0 = op.x ?? 50, y0 = op.y ?? 90;
  const cols = op.cols ?? steps.length;
  const size = op.size ?? Math.max(110, Math.min(180, (doc.canvas.width - x0 * 2 - gap * (cols - 1)) / cols));
  const plots = [];
  steps.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = x0 + col * (size + gap), y = y0 + row * (size + gap + 40);
    const gate = s.gateShape ? { ...DEFAULT_GATES[i % DEFAULT_GATES.length], ...s.gateShape } : DEFAULT_GATES[Math.min(i, DEFAULT_GATES.length - 1)];
    const title = s.title ?? (i === 0 ? (op.firstTitle ?? 'All events') : steps[i - 1].gate);
    if (title) add(doc, { type: 'text', text: `**${title}**`, fontSize: 15, x, y: y - 26, w: size, align: 'center', color: '#1f2933' }, made);
    const p = add(doc, {
      type: 'shape', shape: 'plot', x, y, w: size, h: size, id: s.id,
      plot: {
        kind: s.kind || 'dot', xLabel: s.x || 'FSC-A', yLabel: s.y || 'SSC-A', gate, gateLabel: s.gate, pct: s.pct, seed: 11 + i * 7,
        populations: s.populations || popsForGate(gate, i), color: s.color,
      },
    }, made);
    plots.push(p);
  });
  for (let i = 1; i < plots.length; i++) {
    if (Math.floor(i / cols) !== Math.floor((i - 1) / cols)) continue;
    add(doc, { type: 'arrow', from: { id: plots[i - 1].id, anchor: 'right' }, to: { id: plots[i].id, anchor: 'left' }, head: 'arrow', stroke: '#7b8794', width: 3, gap: 8 }, made);
  }
  return made;
}

// ---- tidy -------------------------------------------------------------------------

/** Nudge overlapping elements apart. Containers (panels, membranes, big shapes) stay put. */
export function tidy(doc, op) {
  const margin = op.margin ?? 12;
  const subset = op.ids ? new Set(op.ids) : null;
  const isContainer = (e) => e.type === 'panel' || (e.type === 'path' && (e.membrane || e.closed || e.w * e.h > 50000))
    || (e.type === 'shape' && (e.shape.startsWith('membrane') || e.w * e.h > 50000 || e.shape === 'brace'));
  // units: an element plus everything attached to it (and its group)
  const units = [];
  const seen = new Set();
  for (const e of doc.elements) {
    if (seen.has(e.id) || e.type === 'arrow' || e.type === 'note' || e.hidden || e.attachedTo || isContainer(e)) continue;
    const members = [e];
    seen.add(e.id);
    for (const x of doc.elements) {
      if (seen.has(x.id)) continue;
      if (x.attachedTo === e.id || (e.group && x.group === e.group && x.type !== 'arrow')) { members.push(x); seen.add(x.id); }
    }
    units.push({ members, fixed: members.some((m) => m.locked) || (subset && !members.some((m) => subset.has(m.id))) });
  }
  const bounds = (u) => union(u.members.map((m) => visualBounds(m, doc)));
  const shift = (u, dx, dy) => { for (const m of u.members) { m.x += dx; m.y += dy; } };
  const moved = new Set();
  const W = doc.canvas.width, H = doc.canvas.height;
  for (let it = 0; it < (op.iterations ?? 80); it++) {
    let any = false;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const a = units[i], b = units[j];
        if (a.fixed && b.fixed) continue;
        const A = bounds(a), B = bounds(b);
        const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) + margin;
        const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) + margin;
        if (ox <= 0 || oy <= 0) continue;
        if (overlapArea(A, B) === 0 && Math.min(ox, oy) <= margin * 0.5) continue;
        any = true;
        const ac = center(A), bc = center(B);
        let dx = 0, dy = 0;
        if (ox < oy) dx = (bc.x >= ac.x ? 1 : -1) * ox;
        else dy = (bc.y >= ac.y ? 1 : -1) * oy;
        if (a.fixed) { shift(b, dx, dy); b.members.forEach((m) => moved.add(m.id)); }
        else if (b.fixed) { shift(a, -dx, -dy); a.members.forEach((m) => moved.add(m.id)); }
        else { shift(a, -dx / 2, -dy / 2); shift(b, dx / 2, dy / 2); [...a.members, ...b.members].forEach((m) => moved.add(m.id)); }
      }
    }
    // keep everything on the canvas
    for (const u of units) {
      if (u.fixed) continue;
      const b = bounds(u);
      const dx = b.x < 4 ? 4 - b.x : b.x + b.w > W - 4 ? W - 4 - b.x - b.w : 0;
      const dy = b.y < 4 ? 4 - b.y : b.y + b.h > H - 4 ? H - 4 - b.y - b.h : 0;
      if (dx || dy) shift(u, dx, dy);
    }
    if (!any) break;
  }
  return [...moved];
}

export const BLOCKS = { synapse, pathway, timeline, gating, tidy };
export { BlockError, clone };
