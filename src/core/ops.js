// Operations: the single, JSON-serializable command language used by the editor,
// the CLI (`fortheplot apply`) and the MCP server. Every change to a figure can be
// expressed as a list of ops, which makes edits scriptable, reviewable and undoable.
//
// applyOps(doc, ops) is transactional: if any op fails, the original figure is
// returned unchanged together with the error.

import {
  normalizeElement, newId, clone, findElement, expandGroups, HEADS, ROUTINGS,
} from './model.js';
import { elementBox, visualBounds, union, center, surfacePoint, rotatePoint } from './geometry.js';
import { contentBounds } from './render.js';
import { getIcon } from '../icons/registry.js';
import { BLOCKS, BlockError } from './blocks.js';
import { reseatAttached } from './attach.js';
import { layoutPanels, panelContents } from './panels.js';
import { applyTextSize } from './textsize.js';
import { samplePath, pointAt, nearestOnPath, outwardSign, rayHit } from './path.js';

export const OP_NAMES = [
  'add', 'update', 'remove', 'move', 'moveTo', 'resize', 'connect', 'place', 'attach', 'align', 'distribute',
  'arrange', 'order', 'group', 'ungroup', 'duplicate', 'canvas', 'fit', 'clear',
  'synapse', 'pathway', 'timeline', 'gating', 'tidy', 'panels', 'textSize',
];

class OpError extends Error {}

function need(cond, msg) {
  if (!cond) throw new OpError(msg);
}

function ids(op) {
  const list = op.ids ?? (op.id != null ? [op.id] : []);
  return (Array.isArray(list) ? list : [list]).map(String);
}

function getEl(doc, id) {
  const el = findElement(doc, id);
  need(el, `No element with id "${id}". Existing ids: ${doc.elements.slice(0, 40).map((e) => e.id).join(', ')}${doc.elements.length > 40 ? ', …' : ''}`);
  return el;
}

function boxOf(doc, el) {
  return el.type === 'arrow' ? elementBox(el, doc) : { x: el.x, y: el.y, w: el.w ?? elementBox(el, doc).w, h: el.h ?? elementBox(el, doc).h };
}

function moveEl(doc, el, dx, dy, seen = new Set()) {
  if (seen.has(el.id)) return;
  seen.add(el.id);
  if (el.type === 'arrow') {
    for (const end of ['from', 'to']) {
      if (el[end] && el[end].id == null) { el[end].x += dx; el[end].y += dy; }
    }
    return;
  }
  // a panel carries what is inside it (worked out before it moves)
  const inside = el.type === 'panel' ? panelContents(doc, el) : [];
  el.x += dx;
  el.y += dy;
  // things attached to this element's surface (receptors on a cell) travel with it
  for (const child of doc.elements) if (child.attachedTo === el.id) moveEl(doc, child, dx, dy, seen);
  for (const id of inside) { const c = findElement(doc, id); if (c) moveEl(doc, c, dx, dy, seen); }
  // free arrow ends inside a moving panel go along
  if (el.type === 'panel') {
    const b0 = { x: el.x - dx, y: el.y - dy, w: el.w, h: el.h };
    const inB = (q) => q && q.id == null && q.x >= b0.x && q.x <= b0.x + b0.w && q.y >= b0.y && q.y <= b0.y + b0.h;
    for (const a of doc.elements) {
      if (a.type !== 'arrow' || seen.has(a.id)) continue;
      const fIn = inB(a.from), tIn = inB(a.to);
      if ((fIn || a.from?.id != null) && (tIn || a.to?.id != null) && (fIn || tIn)) {
        seen.add(a.id);
        if (fIn) { a.from.x += dx; a.from.y += dy; }
        if (tIn) { a.to.x += dx; a.to.y += dy; }
      }
    }
  }
}

/** Position `el` relative to `ref` (side: right|left|above|below|center|inside-top|…). */
function placeRelative(doc, el, refId, side = 'right', gap = 40, alignTo = 'center') {
  const ref = getEl(doc, refId);
  const rb = visualBounds(ref, doc);
  const rbox = boxOf(doc, ref);
  const eb = boxOf(doc, el);
  const rc = center(rbox);
  let x = eb.x, y = eb.y;
  // label-aware gaps: use visual bounds of the reference (includes its label)
  switch (side) {
    case 'right': x = rb.x + rb.w + gap; y = rc.y - eb.h / 2; break;
    case 'left': x = rb.x - gap - eb.w; y = rc.y - eb.h / 2; break;
    case 'above': case 'top': x = rc.x - eb.w / 2; y = rb.y - gap - eb.h; break;
    case 'below': case 'bottom': x = rc.x - eb.w / 2; y = rb.y + rb.h + gap; break;
    case 'center': case 'inside': x = rc.x - eb.w / 2; y = rc.y - eb.h / 2; break;
    case 'inside-top': x = rc.x - eb.w / 2; y = rbox.y + gap; break;
    case 'inside-bottom': x = rc.x - eb.w / 2; y = rbox.y + rbox.h - gap - eb.h; break;
    case 'inside-left': x = rbox.x + gap; y = rc.y - eb.h / 2; break;
    case 'inside-right': x = rbox.x + rbox.w - gap - eb.w; y = rc.y - eb.h / 2; break;
    default: throw new OpError(`Unknown side "${side}". Use right, left, above, below, center, inside-top, inside-bottom, inside-left, inside-right`);
  }
  if (alignTo === 'start' && (side === 'right' || side === 'left')) y = rbox.y;
  if (alignTo === 'start' && (side === 'above' || side === 'below')) x = rbox.x;
  moveEl(doc, el, x - eb.x, y - eb.y);
}

function addElement(doc, spec) {
  need(spec && typeof spec === 'object', '"add" needs an "element" object');
  const s = clone(spec);
  const near = s.near;
  delete s.near;
  if (s.type === 'icon' || s.icon) {
    need(getIcon(s.icon), `Unknown icon "${s.icon}". Find icons with the icons search (e.g. "t cell", "antibody").`);
    if (s.size != null && s.w == null && s.h == null) { s.w = s.size; delete s.size; }
  }
  if ((s.cx != null || s.cy != null) && !(s.type === 'path' || s.points)) {
    const tmp = normalizeElement({ ...s, x: 0, y: 0 });
    const b = elementBox(tmp, doc);
    if (s.cx != null) s.x = s.cx - b.w / 2;
    if (s.cy != null) s.y = s.cy - b.h / 2;
    delete s.cx; delete s.cy;
  }
  let pathCenter = null;
  if ((s.type === 'path' || s.points) && (s.cx != null || s.cy != null)) { pathCenter = { cx: s.cx, cy: s.cy }; delete s.cx; delete s.cy; }
  const el = normalizeElement(s);
  if (pathCenter) {
    if (pathCenter.cx != null) el.x = pathCenter.cx - el.w / 2;
    if (pathCenter.cy != null) el.y = pathCenter.cy - el.h / 2;
  }
  if (el.type === 'arrow') {
    need(el.from && el.to, 'Arrows need "from" and "to" (element ids or [x, y] points)');
    for (const end of [el.from, el.to]) if (end.id != null) getEl(doc, end.id);
  }
  el.id = s.id ? String(s.id) : newId(doc, el.icon || (el.type === 'shape' ? el.shape : el.type));
  need(!findElement(doc, el.id), `Id "${el.id}" already exists`);
  // panels are backgrounds: they go behind everything unless asked otherwise
  if (el.type === 'panel' && !s.front) { delete el.front; doc.elements.unshift(el); } else doc.elements.push(el);
  if (near) {
    const n = typeof near === 'string' ? { id: near } : near;
    placeRelative(doc, el, n.id, n.side || 'right', n.gap ?? 40, n.align || 'center');
  }
  return el;
}

const UPDATABLE_FORBIDDEN = new Set(['id', 'type']);

function updateElement(doc, el, set) {
  need(set && typeof set === 'object', '"update" needs a "set" object');
  const merged = { ...el };
  for (const [k, v] of Object.entries(set)) {
    if (UPDATABLE_FORBIDDEN.has(k)) continue;
    if (k === 'colors' && v && typeof v === 'object') merged.colors = { ...(el.colors || {}), ...v };
    else if (k === 'label' && v && typeof v === 'object' && el.label) merged.label = { ...el.label, ...v };
    else merged[k] = v;
  }
  if (merged.type === 'icon' && set.icon) need(getIcon(set.icon), `Unknown icon "${set.icon}"`);
  // new path points come in canvas coordinates, like when the path was added
  if (merged.type === 'path' && set.points && set.vw == null) {
    delete merged.vw; delete merged.vh; delete merged.w; delete merged.h;
    if (set.x == null && set.y == null) { delete merged.x; delete merged.y; }
  }
  if (merged.type === 'arrow') {
    if (set.head) need(HEADS.includes(set.head), `head must be one of ${HEADS.join(', ')}`);
    if (set.routing) need(ROUTINGS.includes(set.routing), `routing must be one of ${ROUTINGS.join(', ')}`);
  }
  // keep aspect ratio when only one dimension of an icon changes
  if (merged.type === 'icon') {
    if (set.w != null && set.h == null && set.keepAspect !== false) merged.h = el.h * (set.w / el.w);
    else if (set.h != null && set.w == null && set.keepAspect !== false) merged.w = el.w * (set.h / el.h);
    if (set.size != null) { merged.h = el.h * (set.size / el.w); merged.w = set.size; delete merged.size; }
    delete merged.keepAspect;
  }
  const norm = normalizeElement(merged);
  norm.id = el.id;
  Object.keys(el).forEach((k) => delete el[k]);
  Object.assign(el, norm);
}

function removeIds(doc, list) {
  const kill = new Set(list);
  // remove arrows attached to removed elements too
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of doc.elements) {
      if (!kill.has(e.id) && ((e.type === 'arrow' && (kill.has(e.from?.id) || kill.has(e.to?.id))) || kill.has(e.attachedTo))) {
        kill.add(e.id);
        changed = true;
      }
    }
  }
  doc.elements = doc.elements.filter((e) => !kill.has(e.id));
  return [...kill];
}

function alignEls(doc, els, edge, to) {
  const boxes = els.map((e) => [e, boxOf(doc, e)]);
  const ref = to === 'canvas'
    ? { x: 0, y: 0, w: doc.canvas.width, h: doc.canvas.height }
    : union(boxes.map((b) => b[1]));
  for (const [e, b] of boxes) {
    let dx = 0, dy = 0;
    switch (edge) {
      case 'left': dx = ref.x - b.x; break;
      case 'right': dx = ref.x + ref.w - (b.x + b.w); break;
      case 'top': dy = ref.y - b.y; break;
      case 'bottom': dy = ref.y + ref.h - (b.y + b.h); break;
      case 'hcenter': case 'center-x': dx = ref.x + ref.w / 2 - (b.x + b.w / 2); break;
      case 'vcenter': case 'center-y': dy = ref.y + ref.h / 2 - (b.y + b.h / 2); break;
      case 'center': dx = ref.x + ref.w / 2 - (b.x + b.w / 2); dy = ref.y + ref.h / 2 - (b.y + b.h / 2); break;
      default: throw new OpError(`Unknown edge "${edge}". Use left, right, top, bottom, hcenter, vcenter, center`);
    }
    moveEl(doc, e, dx, dy);
  }
}

function distributeEls(doc, els, axis) {
  need(els.length >= 3, 'distribute needs at least 3 elements');
  const k = axis === 'v' || axis === 'vertical' || axis === 'y' ? 'y' : 'x';
  const dim = k === 'x' ? 'w' : 'h';
  const items = els.map((e) => ({ e, b: boxOf(doc, e) })).sort((a, b) => a.b[k] - b.b[k]);
  const start = items[0].b[k];
  const end = items[items.length - 1].b[k] + items[items.length - 1].b[dim];
  const total = items.reduce((s, i) => s + i.b[dim], 0);
  const gap = (end - start - total) / (items.length - 1);
  let cur = start;
  for (const it of items) {
    const d = cur - it.b[k];
    moveEl(doc, it.e, k === 'x' ? d : 0, k === 'y' ? d : 0);
    cur += it.b[dim] + gap;
  }
}

function arrangeEls(doc, els, op) {
  const layout = op.layout || 'row';
  const gap = op.gap ?? 40;
  const boxes = els.map((e) => boxOf(doc, e));
  const bounds = union(boxes);
  let x0 = op.x ?? bounds.x, y0 = op.y ?? bounds.y;
  if (op.cx != null || op.cy != null) {
    // centered arrangement: compute size first
    const size = arrangeSize(boxes, layout, gap, op);
    if (op.cx != null) x0 = op.cx - size.w / 2;
    if (op.cy != null) y0 = op.cy - size.h / 2;
  }
  if (layout === 'row' || layout === 'column') {
    const horiz = layout === 'row';
    const cross = horiz ? Math.max(...boxes.map((b) => b.h)) : Math.max(...boxes.map((b) => b.w));
    let cur = horiz ? x0 : y0;
    els.forEach((e, i) => {
      const b = boxes[i];
      const tx = horiz ? cur : x0 + (cross - b.w) / 2;
      const ty = horiz ? y0 + (cross - b.h) / 2 : cur;
      moveEl(doc, e, tx - b.x, ty - b.y);
      cur += (horiz ? b.w : b.h) + gap + (op.labelSpace && !horiz ? labelExtra(e) : 0);
    });
  } else if (layout === 'grid') {
    const cols = op.cols || Math.ceil(Math.sqrt(els.length));
    const cw = Math.max(...boxes.map((b) => b.w)), ch = Math.max(...boxes.map((b) => b.h));
    els.forEach((e, i) => {
      const b = boxes[i];
      const c = i % cols, r = Math.floor(i / cols);
      const tx = x0 + c * (cw + gap) + (cw - b.w) / 2;
      const ty = y0 + r * (ch + gap) + (ch - b.h) / 2;
      moveEl(doc, e, tx - b.x, ty - b.y);
    });
  } else if (layout === 'circle') {
    const r = op.radius || Math.max(120, (els.length * (Math.max(...boxes.map((b) => b.w)) + gap)) / (2 * Math.PI));
    const cx = op.cx ?? (x0 + r), cy = op.cy ?? (y0 + r);
    const start = ((op.startAngle ?? -90) * Math.PI) / 180;
    els.forEach((e, i) => {
      const a = start + (i / els.length) * Math.PI * 2;
      const b = boxes[i];
      moveEl(doc, e, cx + r * Math.cos(a) - b.w / 2 - b.x, cy + r * Math.sin(a) - b.h / 2 - b.y);
    });
  } else {
    throw new OpError(`Unknown layout "${layout}". Use row, column, grid, circle`);
  }
}

function labelExtra(e) {
  return e.label && e.label.text && e.label.position === 'bottom' ? e.label.fontSize * 1.4 : 0;
}

function arrangeSize(boxes, layout, gap, op) {
  if (layout === 'row') return { w: boxes.reduce((s, b) => s + b.w, 0) + gap * (boxes.length - 1), h: Math.max(...boxes.map((b) => b.h)) };
  if (layout === 'column') return { w: Math.max(...boxes.map((b) => b.w)), h: boxes.reduce((s, b) => s + b.h, 0) + gap * (boxes.length - 1) };
  if (layout === 'grid') {
    const cols = op.cols || Math.ceil(Math.sqrt(boxes.length));
    const rows = Math.ceil(boxes.length / cols);
    const cw = Math.max(...boxes.map((b) => b.w)), ch = Math.max(...boxes.map((b) => b.h));
    return { w: cols * cw + (cols - 1) * gap, h: rows * ch + (rows - 1) * gap };
  }
  return { w: 0, h: 0 };
}

/**
 * Seats along a path host (a drawn membrane or outline): `at` gives fractions of its length
 * (a number or one per id); otherwise the spot nearest `toward`, the ray at `angle`, or the middle,
 * with several ids spaced `gap` px apart along the curve. Items point out of the membrane, or toward
 * the target when one is given.
 */
function pathSeats(doc, host, list, op) {
  const S = samplePath(host);
  need(S.length > 1, `"${host.id}" has no length to attach to`);
  const total = S[S.length - 1].s || 1;
  const c = { x: host.x + host.w / 2, y: host.y + host.h / 2 };
  const target = op.toward != null ? center(boxOf(doc, getEl(doc, op.toward))) : null;
  let us;
  if (Array.isArray(op.at)) us = list.map((_, i) => Number(op.at[i % op.at.length]) || 0);
  else {
    let base = 0.5;
    if (op.at != null) base = Number(op.at) || 0;
    else if (target) base = nearestOnPath(host, target, S).u;
    else if (op.angle != null) {
      base = rayHit(host, op.angle, S);
      if (base == null) { const a = (op.angle * Math.PI) / 180, R = Math.max(host.w, host.h) * 2; base = nearestOnPath(host, { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R }, S).u; }
    }
    const du = (op.gap ?? 70) / total;
    us = list.map((_, i) => base + (i - (list.length - 1) / 2) * du);
    if (host.closed) us = us.map((u) => ((u % 1) + 1) % 1);
    else us = us.map((u) => Math.max(0, Math.min(1, u)));
  }
  const half = host.membrane ? (host.thickness || 26) / 2 : (host.strokeWidth || 0) / 2;
  return us.map((u) => {
    const Q = pointAt(host, u, S);
    let sgn = outwardSign(host, Q, S);
    if (target) sgn = (target.x - Q.x) * Q.nx + (target.y - Q.y) * Q.ny >= 0 ? 1 : -1;
    const nx = Q.nx * sgn, ny = Q.ny * sgn;
    const inset = op.inset ?? 0;
    return { P: { x: Q.x + nx * (half - inset), y: Q.y + ny * (half - inset) }, ang: (Math.atan2(ny, nx) * 180) / Math.PI };
  });
}

function applyOne(doc, op) {
  need(op && typeof op === 'object' && op.op, 'Each op needs an "op" field');
  switch (op.op) {
    case 'add': {
      const specs = op.elements || [op.element ?? op.el ?? stripOp(op)];
      const made = specs.map((s) => addElement(doc, s));
      return { ids: made.map((e) => e.id) };
    }
    case 'update': {
      const list = ids(op);
      need(list.length, '"update" needs "id" or "ids"');
      for (const id of list) {
        const el = getEl(doc, id);
        const before = clone(el);
        updateElement(doc, el, op.set);
        reseatAttached(doc, el, before);
      }
      return { ids: list };
    }
    case 'remove': {
      const list = ids(op);
      list.forEach((id) => getEl(doc, id));
      return { ids: removeIds(doc, list) };
    }
    case 'move': {
      const list = op.withGroup === false ? ids(op) : expandGroups(doc, ids(op));
      const seen = new Set();
      for (const id of list) moveEl(doc, getEl(doc, id), Number(op.dx) || 0, Number(op.dy) || 0, seen);
      return { ids: list };
    }
    case 'moveTo': {
      const el = getEl(doc, op.id);
      const b = boxOf(doc, el);
      let tx = op.x ?? b.x, ty = op.y ?? b.y;
      if (op.cx != null) tx = op.cx - b.w / 2;
      if (op.cy != null) ty = op.cy - b.h / 2;
      moveEl(doc, el, tx - b.x, ty - b.y);
      return { ids: [el.id] };
    }
    case 'resize': {
      const el = getEl(doc, op.id);
      need(el.type !== 'arrow' && el.type !== 'text', 'Only icons and shapes can be resized (use fontSize / w for text)');
      const before = clone(el);
      const c = center(boxOf(doc, el));
      let w = op.w ?? el.w, h = op.h ?? el.h;
      if (op.scale) { w = el.w * op.scale; h = el.h * op.scale; }
      else if (op.w != null && op.h == null && el.type === 'icon') h = el.h * (w / el.w);
      else if (op.h != null && op.w == null && el.type === 'icon') w = el.w * (h / el.h);
      el.w = w; el.h = h;
      if (op.keepCenter !== false) { el.x = c.x - w / 2; el.y = c.y - h / 2; }
      reseatAttached(doc, el, before);
      return { ids: [el.id] };
    }
    case 'connect': {
      const spec = { ...stripOp(op), type: 'arrow' };
      const el = addElement(doc, spec);
      return { ids: [el.id] };
    }
    case 'place': {
      const el = getEl(doc, op.id);
      need(op.relativeTo || op.near, '"place" needs "relativeTo"');
      placeRelative(doc, el, op.relativeTo || op.near, op.side || 'right', op.gap ?? 40, op.align || 'center');
      return { ids: [el.id] };
    }
    case 'attach': {
      // Seat icons (receptors, antibodies, virions…) on the surface of a host element,
      // rotated to point outward. angle: 0=right, 90=down, 180=left, 270=up; or toward: <id>.
      const list = ids(op);
      need(list.length, '"attach" needs "id" or "ids"');
      const host = getEl(doc, op.to ?? op.host);
      const hc = center(boxOf(doc, host));
      let base = op.angle ?? 0;
      if (op.toward != null) {
        const t = center(boxOf(doc, getEl(doc, op.toward)));
        base = (Math.atan2(t.y - hc.y, t.x - hc.x) * 180) / Math.PI;
      }
      const spread = op.spread ?? (list.length > 1 ? Math.min(150, 22 * (list.length - 1)) : 0);
      const seats = host.type === 'path' ? pathSeats(doc, host, list, op) : null;
      list.forEach((id, i) => {
        const el = getEl(doc, id);
        need(el.type === 'icon' || el.type === 'shape', `"${id}" must be an icon or shape to attach`);
        let ang = list.length > 1 ? base - spread / 2 + (spread * i) / (list.length - 1) : base;
        let P;
        if (seats) ({ P, ang } = seats[i]);
        else P = surfacePoint(host, ang, doc, op.inset ?? 0);
        const def = el.type === 'icon' ? getIcon(el.icon) : null;
        const vw = def?.w ?? 100, vh = def?.h ?? 100;
        const [ax, ay] = def?.anchor ?? [vw / 2, vh];
        const rot = ang + 90;
        // anchor offset from element center, in element px, then rotated
        const off = rotatePoint({ x: (ax / vw - 0.5) * el.w, y: (ay / vh - 0.5) * el.h }, { x: 0, y: 0 }, rot);
        el.rotation = ((rot % 360) + 360) % 360;
        el.attachedTo = host.id;
        el.x = P.x - off.x - el.w / 2;
        el.y = P.y - off.y - el.h / 2;
        if (op.order !== false) {
          // draw attached items behind the host so stalks tuck under the membrane
          doc.elements = doc.elements.filter((e) => e !== el);
          const hi = doc.elements.indexOf(host);
          doc.elements.splice(op.front ? hi + 1 : hi, 0, el);
        }
      });
      return { ids: list };
    }
    case 'align': {
      const els = ids(op).map((id) => getEl(doc, id));
      need(els.length >= (op.to === 'canvas' ? 1 : 2), 'align needs at least 2 elements (or "to": "canvas")');
      alignEls(doc, els, op.edge || 'vcenter', op.to);
      return { ids: els.map((e) => e.id) };
    }
    case 'distribute': {
      const els = ids(op).map((id) => getEl(doc, id));
      distributeEls(doc, els, op.axis || 'h');
      return { ids: els.map((e) => e.id) };
    }
    case 'arrange': {
      const els = ids(op).map((id) => getEl(doc, id));
      need(els.length, 'arrange needs ids');
      arrangeEls(doc, els, op);
      return { ids: els.map((e) => e.id) };
    }
    case 'order': {
      const list = new Set(ids(op));
      const sel = doc.elements.filter((e) => list.has(e.id));
      const rest = doc.elements.filter((e) => !list.has(e.id));
      const to = op.to || 'front';
      if (to === 'front') doc.elements = [...rest, ...sel];
      else if (to === 'back') doc.elements = [...sel, ...rest];
      else if (to === 'forward' || to === 'backward') {
        const arr = [...doc.elements];
        const dir = to === 'forward' ? 1 : -1;
        const idxs = arr.map((e, i) => (list.has(e.id) ? i : -1)).filter((i) => i >= 0);
        if (dir > 0) idxs.reverse();
        for (const i of idxs) {
          const j = i + dir;
          if (j >= 0 && j < arr.length && !list.has(arr[j].id)) [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        doc.elements = arr;
      } else throw new OpError('order "to" must be front, back, forward or backward');
      return { ids: [...list] };
    }
    case 'group': {
      const list = ids(op);
      need(list.length >= 2, 'group needs at least 2 ids');
      const g = op.group || `group-${Math.random().toString(36).slice(2, 7)}`;
      list.forEach((id) => { getEl(doc, id).group = g; });
      return { ids: list, group: g };
    }
    case 'ungroup': {
      const list = expandGroups(doc, ids(op));
      list.forEach((id) => { delete getEl(doc, id).group; });
      return { ids: list };
    }
    case 'duplicate': {
      const list = expandGroups(doc, ids(op));
      const map = new Map();
      const groupMap = new Map();
      const made = [];
      for (const id of list) {
        const src = getEl(doc, id);
        const copy = clone(src);
        copy.id = newId(doc, src.id.replace(/-\d+$/, ''));
        if (copy.group) {
          if (!groupMap.has(copy.group)) groupMap.set(copy.group, `group-${Math.random().toString(36).slice(2, 7)}`);
          copy.group = groupMap.get(copy.group);
        }
        map.set(id, copy.id);
        doc.elements.push(copy);
        made.push(copy);
      }
      for (const c of made) {
        if (c.type === 'arrow') {
          for (const end of ['from', 'to']) if (c[end]?.id && map.has(c[end].id)) c[end].id = map.get(c[end].id);
        }
        if (c.attachedTo && map.has(c.attachedTo)) c.attachedTo = map.get(c.attachedTo);
        else if (c.attachedTo && !map.has(c.attachedTo)) delete c.attachedTo;
      }
      const seenDup = new Set();
      for (const c of made) moveEl(doc, c, op.dx ?? 30, op.dy ?? 30, seenDup);
      return { ids: made.map((e) => e.id) };
    }
    case 'canvas': {
      const set = op.set || stripOp(op);
      if (set.width != null) doc.canvas.width = Math.max(50, Number(set.width));
      if (set.height != null) doc.canvas.height = Math.max(50, Number(set.height));
      if (set.background != null) doc.canvas.background = set.background;
      if (set.title != null) doc.title = String(set.title);
      if (set.font != null) doc.font = String(set.font);
      if (set.printWidth !== undefined) {
        if (Number(set.printWidth) > 0) doc.canvas.printWidth = Number(set.printWidth);
        else delete doc.canvas.printWidth;
      }
      if (set.panelLabels != null) doc.panelLabels = typeof set.panelLabels === 'string' ? { ...(doc.panelLabels || {}), style: set.panelLabels } : { ...(doc.panelLabels || {}), ...set.panelLabels };
      return { ids: [] };
    }
    case 'fit': {
      // Resize the canvas to the content plus a margin, shifting everything.
      const m = op.margin ?? 40;
      const b = contentBounds(doc);
      need(b.w > 0, 'Nothing to fit');
      const dx = m - b.x, dy = m - b.y;
      for (const e of doc.elements) moveEl(doc, e, dx, dy);
      doc.canvas.width = Math.ceil(b.w + 2 * m);
      doc.canvas.height = Math.ceil(b.h + 2 * m);
      return { ids: [] };
    }
    case 'clear': {
      doc.elements = [];
      return { ids: [] };
    }
    case 'panels': {
      let specs;
      try { specs = layoutPanels(doc, op); } catch (err) { throw new OpError(err.message); }
      const made = specs.map((sp) => addElement(doc, sp));
      // keep reading order in z-order too (first panel furthest back)
      const set = new Set(made.map((e) => e.id));
      doc.elements = [...made, ...doc.elements.filter((e) => !set.has(e.id))];
      if (op.labels || op.labelSize || op.labelPosition) {
        doc.panelLabels = { ...(doc.panelLabels || {}), ...(op.labels ? { style: op.labels } : {}), ...(op.labelSize ? { size: op.labelSize } : {}), ...(op.labelPosition ? { position: op.labelPosition } : {}) };
      }
      return { ids: made.map((e) => e.id) };
    }
    case 'textSize': {
      try { return { ids: applyTextSize(doc, op) }; } catch (err) { throw new OpError(err.message); }
    }
    case 'synapse':
    case 'pathway':
    case 'timeline':
    case 'gating':
    case 'tidy': {
      try {
        return { ids: BLOCKS[op.op](doc, op) };
      } catch (err) {
        if (err instanceof BlockError) throw new OpError(err.message);
        throw err;
      }
    }
    default:
      throw new OpError(`Unknown op "${op.op}". Known ops: ${OP_NAMES.join(', ')}`);
  }
}

function stripOp(op) {
  const { op: _o, ...rest } = op;
  return rest;
}

/**
 * Apply a list of ops. Returns { doc, results, error }.
 * On error, `doc` is the unchanged input and `error` names the failing op.
 */
export function applyOps(doc, ops, { atomic = true } = {}) {
  const list = Array.isArray(ops) ? ops : [ops];
  const work = clone(doc);
  const results = [];
  for (let i = 0; i < list.length; i++) {
    try {
      results.push({ op: list[i].op, ok: true, ...applyOne(work, list[i]) });
    } catch (err) {
      const message = `op #${i + 1} (${list[i]?.op ?? '?'}): ${err.message}`;
      if (atomic || !(err instanceof OpError)) return { doc, results, error: message };
      results.push({ op: list[i].op, ok: false, error: message });
    }
  }
  return { doc: work, results, error: null };
}
