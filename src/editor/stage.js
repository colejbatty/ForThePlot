// The canvas: rendering, selection overlay, pointer interactions, zoom/pan,
// drag-and-drop from the library and inline text editing.

import { S, on, emit, commit, select, setTool, runOps } from './state.js';
import { openLinked } from './linked.js';
import {
  renderElement, elementBox, visualBounds, arrowGeometry, union, findElement, normalizeElement, newId, center,
  labelBox, getIcon, expandAttached, reseatAttached,
  pathD, pathHandles, toLocal, refitPath, insertPointAt, simplifyStroke, expandMoving, parseDataUrl,
} from '../core/index.js';

const NS = 'http://www.w3.org/2000/svg';
let wrap, svg, page, content, overlay, inlineEd;
let drag = null;
let spaceDown = false;
let pen = null; // pen tool in progress: { pts: [{x, y, in?, out?}], cursor }
const view = { cw: 800, ch: 600 };

const DEG = Math.PI / 180;
const rot = (p, c, deg) => {
  if (!deg) return { x: p.x, y: p.y };
  const a = deg * DEG, cs = Math.cos(a), sn = Math.sin(a), dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
};
const f = (n) => Math.round(n * 100) / 100;

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  return e;
}

export function initStage(container) {
  wrap = container;
  svg = el('svg', { id: 'stage', tabindex: '0', 'aria-label': 'Figure canvas' });
  svg.innerHTML = '<defs><filter id="pageShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#0b1a2a" flood-opacity="0.16"/></filter>'
    + '<pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#fff"/><rect width="8" height="8" fill="#e8ecf1"/><rect x="8" y="8" width="8" height="8" fill="#e8ecf1"/></pattern>'
    + '<pattern id="gridPat" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#8fa3b8" stroke-opacity="0.28" stroke-width="0.6"/></pattern></defs>';
  page = el('rect', { id: 'page', x: 0, y: 0, filter: 'url(#pageShadow)' });
  const gridRect = el('rect', { id: 'grid', x: 0, y: 0, fill: 'url(#gridPat)', 'pointer-events': 'none' });
  content = el('g', { id: 'content' });
  overlay = el('g', { id: 'overlay' });
  svg.append(page, content, gridRect, overlay);
  wrap.append(svg);

  inlineEd = document.createElement('textarea');
  inlineEd.id = 'inline-editor';
  inlineEd.hidden = true;
  inlineEd.setAttribute('aria-label', 'Edit text');
  wrap.append(inlineEd);

  new ResizeObserver(() => { measure(); applyView(); }).observe(wrap);
  measure();

  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('dblclick', onDblClick);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  svg.addEventListener('drop', onDrop);
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !isTyping(e)) { spaceDown = true; svg.classList.add('panning'); } });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') { spaceDown = false; svg.classList.remove('panning'); } });

  on('doc', () => renderAll());
  on('select', () => renderOverlay());
  on('view', () => applyView());
  on('tool', (t) => {
    svg.dataset.tool = t;
    if (t !== 'pen' && pen) finishPen(false);
    if (t !== 'select' && S.editPath) { S.editPath = null; renderOverlay(); }
  });
  on('select', () => { if (S.editPath && !(S.sel.length === 1 && S.sel[0] === S.editPath)) S.editPath = null; });
  svg.dataset.tool = S.tool;
}

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

function measure() {
  const r = wrap.getBoundingClientRect();
  view.cw = Math.max(50, r.width);
  view.ch = Math.max(50, r.height);
}

export function applyView() {
  if (!svg) return;
  const w = view.cw / S.zoom, h = view.ch / S.zoom;
  svg.setAttribute('viewBox', `${f(S.pan.x)} ${f(S.pan.y)} ${f(w)} ${f(h)}`);
  svg.setAttribute('width', view.cw);
  svg.setAttribute('height', view.ch);
  renderOverlay();
  emit('zoom', S.zoom);
}

export function fitView(pad = 48) {
  if (!S.doc) return;
  measure();
  const { width: W, height: H } = S.doc.canvas;
  S.zoom = Math.max(0.05, Math.min(4, Math.min((view.cw - pad * 2) / W, (view.ch - pad * 2) / H)));
  S.pan.x = W / 2 - view.cw / S.zoom / 2;
  S.pan.y = H / 2 - view.ch / S.zoom / 2;
  applyView();
}

export function zoomBy(factor, at = null) {
  const c = at || { x: S.pan.x + view.cw / S.zoom / 2, y: S.pan.y + view.ch / S.zoom / 2 };
  const nz = Math.max(0.05, Math.min(8, S.zoom * factor));
  // keep point `c` fixed on screen
  const sx = (c.x - S.pan.x) * S.zoom, sy = (c.y - S.pan.y) * S.zoom;
  S.zoom = nz;
  S.pan.x = c.x - sx / nz;
  S.pan.y = c.y - sy / nz;
  applyView();
}

export function viewCenter() {
  return { x: S.pan.x + view.cw / S.zoom / 2, y: S.pan.y + view.ch / S.zoom / 2 };
}

function toContent(e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const m = svg.getScreenCTM();
  return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
}

// ---- Rendering ---------------------------------------------------------------

function parseNode(str) {
  const tmp = document.createElementNS(NS, 'svg');
  tmp.innerHTML = str;
  return tmp.firstElementChild;
}

export function renderAll() {
  if (!S.doc || !svg) return;
  const { width: W, height: H, background: bg } = S.doc.canvas;
  page.setAttribute('width', W);
  page.setAttribute('height', H);
  page.setAttribute('fill', !bg || bg === 'none' ? 'url(#checker)' : bg);
  const g = svg.querySelector('#grid');
  g.setAttribute('width', W);
  g.setAttribute('height', H);
  g.style.display = S.grid ? '' : 'none';
  content.innerHTML = S.doc.elements.map((e) => renderElement(e, S.doc, renderOpts())).join('');
  renderOverlay();
}

// Pictures are shown through blob: URLs so re-rendering never re-parses megabytes of base64.
const blobUrls = new Map();
function imageHref(img) {
  let u = blobUrls.get(img.id);
  if (!u) {
    try {
      const d = parseDataUrl(img.src);
      const bin = atob(d.data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      u = URL.createObjectURL(new Blob([bytes], { type: d.mime }));
    } catch { u = img.src; }
    blobUrls.set(img.id, u);
  }
  return u;
}

function renderOpts() {
  return { hit: true, uidPrefix: 'ed', notes: S.showNotes !== false, imageHref };
}

function dependents(ids) {
  const set = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of S.doc.elements) {
      if (e.type === 'arrow' && !set.has(e.id) && (set.has(e.from?.id) || set.has(e.to?.id))) { set.add(e.id); grew = true; }
      if (e.type === 'note' && !set.has(e.id) && set.has(e.target)) { set.add(e.id); grew = true; }
      if (e.attachedTo && !set.has(e.id) && set.has(e.attachedTo)) { set.add(e.id); grew = true; }
    }
  }
  return [...set];
}

function renderPartial(ids) {
  for (const id of dependents(ids)) {
    const e = findElement(S.doc, id);
    const node = content.querySelector(`:scope > [data-id="${CSS.escape(id)}"]`);
    if (!e || !node) { renderAll(); return; }
    const fresh = parseNode(renderElement(e, S.doc, renderOpts()));
    if (fresh) node.replaceWith(fresh);
    else node.remove();
  }
  renderOverlay();
}

function corners(box, deg) {
  const c = center(box);
  return [
    { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y }, { x: box.x + box.w, y: box.y + box.h }, { x: box.x, y: box.y + box.h },
  ].map((p) => rot(p, c, deg));
}

const HANDLES = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };

export function renderOverlay() {
  if (!overlay || !S.doc) return;
  overlay.innerHTML = '';
  const z = S.zoom;
  const hs = 9 / z;
  const sel = S.sel.map((id) => findElement(S.doc, id)).filter(Boolean);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--sel').trim() || '#1677d2';

  if (S.hoverId && !S.sel.includes(S.hoverId)) {
    const he = findElement(S.doc, S.hoverId);
    if (he) {
      const b = elementBox(he, S.doc);
      overlay.append(el('polygon', { points: corners(b, he.type === 'arrow' ? 0 : he.rotation).map((p) => `${f(p.x)},${f(p.y)}`).join(' '), fill: accent, 'fill-opacity': 0.08, stroke: accent, 'stroke-width': 2 / z, 'pointer-events': 'none' }));
    }
  }

  if (pen) drawPenPreview(accent, z);
  if (drag && drag.kind === 'pencil' && drag.pts.length > 1) {
    overlay.append(el('polyline', { points: drag.pts.map((q) => `${f(q.x)},${f(q.y)}`).join(' '), fill: 'none', stroke: accent, 'stroke-width': 2 / z, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'pointer-events': 'none' }));
  }

  for (const e of sel) {
    if (e.type === 'path' && S.editPath === e.id && sel.length === 1) { drawPathPoints(e, accent, z); continue; }
    if (e.type === 'arrow') {
      const g = arrowGeometry(e, S.doc);
      overlay.append(el('path', { d: g.d, fill: 'none', stroke: accent, 'stroke-width': 2 / z, 'stroke-dasharray': `${4 / z} ${3 / z}`, 'pointer-events': 'none' }));
      if (sel.length === 1 && !e.locked) {
        for (const [end, p] of [['from', g.start], ['to', g.end]]) {
          const attached = e[end]?.id != null;
          overlay.append(el('circle', { cx: p.x, cy: p.y, r: 6 / z, fill: attached ? accent : '#fff', stroke: accent, 'stroke-width': 2 / z, 'data-handle': end, 'data-id': e.id, class: 'handle h-end' }));
        }
      }
      continue;
    }
    const b = elementBox(e, S.doc);
    const pts = corners(b, e.rotation);
    overlay.append(el('polygon', { points: pts.map((p) => `${f(p.x)},${f(p.y)}`).join(' '), fill: 'none', stroke: accent, 'stroke-width': 1.5 / z, 'pointer-events': 'none', 'stroke-dasharray': e.locked ? `${4 / z} ${3 / z}` : null }));
    if (sel.length === 1 && !e.locked) {
      const c = center(b);
      const names = e.type === 'note' ? ['e', 'w'] : e.type === 'text' ? ['nw', 'ne', 'e', 'se', 'sw', 'w'] : Object.keys(HANDLES);
      for (const name of names) {
        const [sx, sy] = HANDLES[name];
        const p = rot({ x: c.x + (sx * b.w) / 2, y: c.y + (sy * b.h) / 2 }, c, e.rotation);
        overlay.append(el('rect', { x: p.x - hs / 2, y: p.y - hs / 2, width: hs, height: hs, rx: 2 / z, fill: '#fff', stroke: accent, 'stroke-width': 1.5 / z, 'data-handle': name, class: `handle h-${name}`, transform: e.rotation ? `rotate(${f(e.rotation)} ${f(p.x)} ${f(p.y)})` : null }));
      }
      if (e.type !== 'text' && e.type !== 'note') {
        const top = rot({ x: c.x, y: b.y }, c, e.rotation);
        const knob = rot({ x: c.x, y: b.y - 26 / z }, c, e.rotation);
        overlay.append(el('line', { x1: top.x, y1: top.y, x2: knob.x, y2: knob.y, stroke: accent, 'stroke-width': 1.5 / z, 'pointer-events': 'none' }));
        overlay.append(el('circle', { cx: knob.x, cy: knob.y, r: 6 / z, fill: '#fff', stroke: accent, 'stroke-width': 1.5 / z, 'data-handle': 'rot', class: 'handle h-rot' }));
      }
    }
  }
  if (sel.length > 1) {
    const u = union(sel.map((e) => visualBounds(e, S.doc)));
    overlay.append(el('rect', { x: u.x - 4 / z, y: u.y - 4 / z, width: u.w + 8 / z, height: u.h + 8 / z, fill: 'none', stroke: accent, 'stroke-width': 1 / z, 'stroke-dasharray': `${5 / z} ${4 / z}`, 'pointer-events': 'none' }));
  }
  for (const g of S.guides || []) {
    overlay.append(el('line', { ...g, stroke: '#e0457b', 'stroke-width': 1 / z, 'pointer-events': 'none' }));
  }
  if (drag && drag.kind === 'marquee' && drag.box) {
    const m = drag.box;
    overlay.append(el('rect', { x: m.x, y: m.y, width: m.w, height: m.h, fill: accent, 'fill-opacity': 0.08, stroke: accent, 'stroke-width': 1 / z, 'pointer-events': 'none' }));
  }
}

// ---- Pen, pencil and point editing -------------------------------------------------

function penTmp(pts) {
  return { x: 0, y: 0, w: 1, h: 1, vw: 1, vh: 1, rotation: 0, closed: false, smooth: false, points: pts };
}

function drawPenPreview(accent, z) {
  const pts = pen.pts;
  if (pts.length > 1) overlay.append(el('path', { d: pathD(penTmp(pts)), fill: 'none', stroke: accent, 'stroke-width': 2 / z, 'pointer-events': 'none' }));
  const last = pts[pts.length - 1];
  if (last && pen.cursor && !drag) {
    overlay.append(el('line', { x1: last.x, y1: last.y, x2: pen.cursor.x, y2: pen.cursor.y, stroke: accent, 'stroke-width': 1.5 / z, 'stroke-dasharray': `${4 / z} ${3 / z}`, 'pointer-events': 'none' }));
  }
  pts.forEach((q, i) => {
    for (const k of ['in', 'out']) {
      if (!q[k]) continue;
      const hx = q.x + q[k][0], hy = q.y + q[k][1];
      overlay.append(el('line', { x1: q.x, y1: q.y, x2: hx, y2: hy, stroke: accent, 'stroke-width': 1 / z, 'pointer-events': 'none' }));
      overlay.append(el('circle', { cx: hx, cy: hy, r: 3.5 / z, fill: '#fff', stroke: accent, 'stroke-width': 1.2 / z, 'pointer-events': 'none' }));
    }
    const r = (i === 0 && pts.length > 1 ? 6 : 4.5) / z;
    overlay.append(el('rect', { x: q.x - r, y: q.y - r, width: 2 * r, height: 2 * r, fill: i === 0 ? accent : '#fff', stroke: accent, 'stroke-width': 1.5 / z, 'pointer-events': 'none' }));
  });
}

function drawPathPoints(e, accent, z) {
  const c = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
  overlay.append(el('path', { d: pathD(e), fill: 'none', stroke: accent, 'stroke-width': 1.5 / z, 'stroke-dasharray': `${4 / z} ${3 / z}`, transform: e.rotation ? `rotate(${f(e.rotation)} ${f(c.x)} ${f(c.y)})` : null, 'pointer-events': 'none' }));
  for (const hnd of pathHandles(e)) {
    for (const k of ['in', 'out']) {
      if (!hnd[k]) continue;
      overlay.append(el('line', { x1: hnd.p.x, y1: hnd.p.y, x2: hnd[k].x, y2: hnd[k].y, stroke: accent, 'stroke-width': 1 / z, 'pointer-events': 'none' }));
      overlay.append(el('circle', { cx: hnd[k].x, cy: hnd[k].y, r: 5 / z, fill: '#fff', stroke: accent, 'stroke-width': 1.5 / z, 'data-handle': `${k}:${hnd.i}`, class: 'handle h-pt' }));
    }
    const r = 5.5 / z;
    overlay.append(el('rect', { x: hnd.p.x - r, y: hnd.p.y - r, width: 2 * r, height: 2 * r, rx: 1.5 / z, fill: '#fff', stroke: accent, 'stroke-width': 1.8 / z, 'data-handle': `pt:${hnd.i}`, class: 'handle h-pt' }));
  }
}

function penDown(p) {
  if (!pen) pen = { pts: [], cursor: p };
  const first = pen.pts[0];
  if (first && pen.pts.length >= 2 && Math.hypot(p.x - first.x, p.y - first.y) * S.zoom < 9) { finishPen(true); return; }
  const last = pen.pts[pen.pts.length - 1];
  if (last && Math.hypot(p.x - last.x, p.y - last.y) * S.zoom < 3) return; // second click of a double-click
  pen.pts.push({ x: p.x, y: p.y });
  drag = { kind: 'pen-handle', i: pen.pts.length - 1 };
  renderOverlay();
}

function finishPen(closed) {
  const pts = pen ? pen.pts : [];
  pen = null;
  if (pts.length < 2) { renderOverlay(); return; }
  const r = runOps([{ op: 'add', element: { type: 'path', closed, points: pts.map((q) => ({ x: q.x, y: q.y, ...(q.in ? { in: q.in } : {}), ...(q.out ? { out: q.out } : {}) })), ...(S.pathStyle || {}) } }], { select: true });
  if (!r.error && S.tool === 'pen') setTool('select');
  renderOverlay();
}

function finishPencil(raw) {
  let len = 0;
  for (let i = 1; i < raw.length; i++) len += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
  if (raw.length < 3 || len * S.zoom < 12) { renderOverlay(); return; }
  const a = raw[0], b = raw[raw.length - 1];
  const closed = Math.hypot(a.x - b.x, a.y - b.y) * S.zoom < 16 && len * S.zoom > 80;
  let pts = simplifyStroke(raw, Math.max(1.5, 3.5 / S.zoom));
  if (closed && pts.length > 3) pts = pts.slice(0, -1);
  const r = runOps([{ op: 'add', element: { type: 'path', smooth: true, closed, points: pts.map((q) => [q.x, q.y]), ...(S.pathStyle || {}) } }], { select: true });
  if (!r.error && !S.stickyTool) setTool('select');
  renderOverlay();
}

/** Keys while drawing or editing points. Returns true if the key was used. */
export function stageKey(e) {
  const k = e.key.toLowerCase();
  if (pen) {
    if (k === 'enter') { finishPen(false); return true; }
    if (k === 'escape') { finishPen(false); return true; }
    if (k === 'backspace' || k === 'delete') { pen.pts.pop(); if (!pen.pts.length) pen = null; renderOverlay(); return true; }
  }
  if (S.editPath && k === 'escape') { S.editPath = null; renderOverlay(); return true; }
  return false;
}

// ---- Hit testing ---------------------------------------------------------------

function hitId(target) {
  const node = target?.closest?.('#content > [data-id]');
  if (!node) return null;
  const id = node.getAttribute('data-id');
  const e = findElement(S.doc, id);
  if (!e || e.locked) return null;
  return id;
}

function hitAt(clientX, clientY, exclude, arrows = false) {
  const prev = overlay.style.pointerEvents;
  overlay.style.pointerEvents = 'none';
  const list = document.elementsFromPoint(clientX, clientY);
  overlay.style.pointerEvents = prev;
  for (const n of list) {
    const id = hitId(n);
    if (id && id !== exclude) {
      const e = findElement(S.doc, id);
      if (e && (arrows || e.type !== 'arrow')) return id;
    }
  }
  return null;
}

// ---- Pointer interactions --------------------------------------------------------

const SHAPE_TOOLS = {
  rect: { type: 'shape', shape: 'rect' },
  ellipse: { type: 'shape', shape: 'ellipse' },
  membrane: { type: 'shape', shape: 'membrane' },
  'membrane-ellipse': { type: 'shape', shape: 'membrane-ellipse', inner: '#eef6fd' },
};

function onDown(e) {
  if (inlineEd && !inlineEd.hidden) finishInline(true);
  svg.focus({ preventScroll: true });
  const p = toContent(e);
  if (e.button === 1 || spaceDown || S.tool === 'hand') {
    drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, pan: { ...S.pan } };
    svg.setPointerCapture(e.pointerId);
    return;
  }
  if (e.button !== 0) return;
  if (S.tool === 'pen') { penDown(p); svg.setPointerCapture(e.pointerId); return; }
  if (S.tool === 'pencil') { drag = { kind: 'pencil', pts: [p] }; svg.setPointerCapture(e.pointerId); return; }
  const handle = e.target.closest?.('[data-handle]');
  if (handle && S.sel.length === 1) {
    const id = S.sel[0];
    const elx = findElement(S.doc, id);
    const name = handle.getAttribute('data-handle');
    const pm = /^(pt|in|out):(\d+)$/.exec(name);
    if (pm && elx?.type === 'path') {
      const i = Number(pm[2]);
      if (pm[1] === 'pt' && e.altKey) {
        if (elx.points.length > 2) {
          const prev = JSON.parse(JSON.stringify(elx));
          elx.points.splice(i, 1);
          reseatAttached(S.doc, elx, prev);
          refitPath(elx);
          commit();
        }
        return;
      }
      drag = { kind: 'pathpt', id, which: pm[1], i, moved: false };
      svg.setPointerCapture(e.pointerId);
      return;
    }
    drag = { kind: name === 'rot' ? 'rotate' : name === 'from' || name === 'to' ? 'endpoint' : 'resize', id, name, start: p, orig: JSON.parse(JSON.stringify(elx)) };
    svg.setPointerCapture(e.pointerId);
    return;
  }
  const id = hitId(e.target);
  if (S.editPath && id !== S.editPath) { S.editPath = null; renderOverlay(); }
  if (S.tool === 'select') {
    if (id) {
      if (e.shiftKey) { select(id, { toggle: true }); return; }
      if (!S.sel.includes(id)) select(id);
      if (e.altKey) {
        const r = runOps([{ op: 'duplicate', ids: S.sel, dx: 0, dy: 0 }], { select: true });
        if (r.error) return;
      }
      startMove(p);
      svg.setPointerCapture(e.pointerId);
    } else {
      if (!e.shiftKey) select([]);
      drag = { kind: 'marquee', start: p, add: e.shiftKey, base: [...S.sel] };
      svg.setPointerCapture(e.pointerId);
    }
    return;
  }
  if (S.tool === 'text') {
    e.preventDefault();
    const tid = newId(S.doc, 'text');
    S.doc.elements.push({ ...normalizeElement({ type: 'text', text: 'Label', x: p.x, y: p.y - 12, fontSize: 20 }), id: tid });
    commit();
    select(tid);
    setTool('select');
    startInlineEdit(tid, true);
    return;
  }
  if (S.tool === 'note') {
    e.preventDefault();
    const nid = newId(S.doc, 'note');
    const target = id && findElement(S.doc, id)?.type !== 'note' ? id : null;
    let at = { x: p.x, y: p.y };
    if (target) {
      const tb = visualBounds(findElement(S.doc, target), S.doc);
      at = { x: tb.x + tb.w + 30, y: tb.y - 20 };
    }
    S.doc.elements.push({ ...normalizeElement({ type: 'note', text: '', x: at.x, y: at.y, target, author: 'you' }), id: nid });
    commit();
    select(nid);
    setTool('select');
    startInlineEdit(nid, true);
    return;
  }
  if (S.tool === 'arrow') {
    const aid = newId(S.doc, 'arrow');
    const from = id && findElement(S.doc, id)?.type !== 'arrow' ? { id } : [p.x, p.y];
    S.doc.elements.push({ ...normalizeElement({ type: 'arrow', from, to: [p.x, p.y], ...(S.arrowStyle || {}) }), id: aid });
    renderAll();
    drag = { kind: 'endpoint', id: aid, name: 'to', creating: true, start: p };
    svg.setPointerCapture(e.pointerId);
    return;
  }
  if (SHAPE_TOOLS[S.tool]) {
    const sid = newId(S.doc, SHAPE_TOOLS[S.tool].shape);
    S.doc.elements.push({ ...normalizeElement({ ...SHAPE_TOOLS[S.tool], x: p.x, y: p.y, w: 1, h: 1 }), id: sid });
    drag = { kind: 'draw', id: sid, start: p, tool: S.tool };
    renderAll();
    svg.setPointerCapture(e.pointerId);
  }
}

function startMove(p) {
  const ids = expandMoving(S.doc, S.sel);
  const orig = new Map();
  for (const id of ids) {
    const x = findElement(S.doc, id);
    if (x && !x.locked) orig.set(id, JSON.parse(JSON.stringify(x)));
  }
  const movable = [...orig.values()];
  const box = union(movable.map((x) => visualBounds(x, S.doc)));
  // snap candidates: other elements' edges and centers, plus the canvas
  const others = S.doc.elements.filter((x) => !orig.has(x.id) && !x.hidden && x.type !== 'arrow');
  const xs = [0, S.doc.canvas.width / 2, S.doc.canvas.width], ys = [0, S.doc.canvas.height / 2, S.doc.canvas.height];
  for (const o of others) {
    const b = visualBounds(o, S.doc);
    xs.push(b.x, b.x + b.w / 2, b.x + b.w);
    ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  drag = { kind: 'move', start: p, orig, box, xs, ys, moved: false };
}

function snapAxis(vals, cands, thr) {
  let best = null;
  for (const v of vals) for (const c of cands) {
    const d = c - v;
    if (Math.abs(d) <= thr && (best == null || Math.abs(d) < Math.abs(best.d))) best = { d, at: c };
  }
  return best;
}

function onMove(e) {
  const p = toContent(e);
  if (!drag && pen) { pen.cursor = p; renderOverlay(); return; }
  if (drag && drag.kind === 'pen-handle') {
    const q = pen?.pts[drag.i];
    if (q) {
      const vx = p.x - q.x, vy = p.y - q.y;
      if (Math.hypot(vx, vy) * S.zoom > 3) { q.out = [vx, vy]; q.in = [-vx, -vy]; }
      pen.cursor = p;
      renderOverlay();
    }
    return;
  }
  if (drag && drag.kind === 'pencil') {
    const last = drag.pts[drag.pts.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) * S.zoom > 2) { drag.pts.push(p); renderOverlay(); }
    return;
  }
  if (drag && drag.kind === 'pathpt') {
    const x = findElement(S.doc, drag.id);
    if (!x) return;
    drag.moved = true;
    const prev = JSON.parse(JSON.stringify(x));
    const L = toLocal(x, p);
    const q = x.points[drag.i];
    if (drag.which === 'pt') { q.x = L.x; q.y = L.y; }
    else {
      const off = [L.x - q.x, L.y - q.y];
      q[drag.which] = off;
      const other = drag.which === 'in' ? 'out' : 'in';
      if (q[other] && !e.altKey) {
        const len = Math.hypot(q[other][0], q[other][1]), l2 = Math.hypot(off[0], off[1]) || 1;
        q[other] = [(-off[0] / l2) * len, (-off[1] / l2) * len];
      }
    }
    renderPartial([x.id, ...reseatAttached(S.doc, x, prev)]);
    return;
  }
  if (!drag) {
    if (S.tool === 'arrow') {
      const hid = hitAt(e.clientX, e.clientY);
      if (hid !== S.hoverId) { S.hoverId = hid; renderOverlay(); }
    }
    return;
  }
  if (drag.kind === 'pan') {
    S.pan.x = drag.pan.x - (e.clientX - drag.sx) / S.zoom;
    S.pan.y = drag.pan.y - (e.clientY - drag.sy) / S.zoom;
    applyView();
    return;
  }
  if (drag.kind === 'marquee') {
    const a = drag.start;
    drag.box = { x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) };
    const hits = S.doc.elements.filter((x) => !x.locked && !x.hidden && (() => {
      const b = visualBounds(x, S.doc);
      return b.x >= drag.box.x && b.y >= drag.box.y && b.x + b.w <= drag.box.x + drag.box.w && b.y + b.h <= drag.box.y + drag.box.h;
    })()).map((x) => x.id);
    S.sel = drag.add ? [...new Set([...drag.base, ...hits])] : hits;
    renderOverlay();
    return;
  }
  if (drag.kind === 'move') {
    let dx = p.x - drag.start.x, dy = p.y - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) * S.zoom < 3) return;
    drag.moved = true;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    S.guides = [];
    const b = drag.box;
    if (S.grid) {
      dx = Math.round((b.x + dx) / 10) * 10 - b.x;
      dy = Math.round((b.y + dy) / 10) * 10 - b.y;
    } else if (S.snap && !e.altKey) {
      const thr = 6 / S.zoom;
      const sx = snapAxis([b.x + dx, b.x + dx + b.w / 2, b.x + dx + b.w], drag.xs, thr);
      const sy = snapAxis([b.y + dy, b.y + dy + b.h / 2, b.y + dy + b.h], drag.ys, thr);
      if (sx) { dx += sx.d; S.guides.push({ x1: sx.at, x2: sx.at, y1: -1e4, y2: 1e4 }); }
      if (sy) { dy += sy.d; S.guides.push({ x1: -1e4, x2: 1e4, y1: sy.at, y2: sy.at }); }
    }
    for (const [id, o] of drag.orig) {
      const x = findElement(S.doc, id);
      if (!x) continue;
      if (x.type === 'arrow') {
        for (const end of ['from', 'to']) if (o[end] && o[end].id == null) { x[end].x = o[end].x + dx; x[end].y = o[end].y + dy; }
      } else {
        x.x = o.x + dx;
        x.y = o.y + dy;
      }
    }
    renderPartial([...drag.orig.keys()]);
    return;
  }
  const x = findElement(S.doc, drag.id);
  if (!x) return;
  if (drag.kind === 'rotate') {
    const c = center(elementBox(drag.orig, S.doc));
    let a = Math.atan2(p.y - c.y, p.x - c.x) / DEG + 90;
    if (e.shiftKey) a = Math.round(a / 15) * 15;
    else for (const s of [0, 90, 180, 270, 360]) if (Math.abs(a - s) < 3) a = s;
    const prev = JSON.parse(JSON.stringify(x));
    x.rotation = Math.round((((a % 360) + 360) % 360) * 10) / 10;
    renderPartial([x.id, ...reseatAttached(S.doc, x, prev)]);
    return;
  }
  if (drag.kind === 'resize') {
    const prev = JSON.parse(JSON.stringify(x));
    resizeDrag(x, drag, p, e.shiftKey);
    renderPartial([x.id, ...reseatAttached(S.doc, x, prev)]);
    return;
  }
  if (drag.kind === 'endpoint') {
    const target = hitAt(e.clientX, e.clientY, x.id);
    S.hoverId = target;
    x[drag.name] = target ? { id: target, anchor: 'auto' } : { x: p.x, y: p.y };
    // don't let an arrow attach both ends to the same element
    const other = x[drag.name === 'to' ? 'from' : 'to'];
    if (target && other?.id === target) x[drag.name] = { x: p.x, y: p.y };
    renderPartial([x.id]);
    return;
  }
  if (drag.kind === 'draw') {
    const a = drag.start;
    let w = Math.abs(p.x - a.x), h = Math.abs(p.y - a.y);
    if (e.shiftKey) w = h = Math.max(w, h);
    x.x = p.x < a.x ? a.x - w : a.x;
    x.y = p.y < a.y ? a.y - h : a.y;
    x.w = Math.max(1, w);
    x.h = Math.max(1, h);
    renderPartial([x.id]);
  }
}

function resizeDrag(x, d, p, shift) {
  const o = d.orig;
  const [sx, sy] = HANDLES[d.name];
  const box = elementBox(o, S.doc);
  const c = center(box);
  const A = rot({ x: c.x - (sx * box.w) / 2, y: c.y - (sy * box.h) / 2 }, c, o.rotation);
  const q = rot({ x: p.x, y: p.y }, A, -o.rotation);
  let w = sx ? Math.max(6, (q.x - A.x) * sx) : box.w;
  let h = sy ? Math.max(6, (q.y - A.y) * sy) : box.h;
  if (o.type === 'note') {
    x.w = Math.max(120, w);
    if (sx < 0) x.x = o.x + (box.w - x.w);
    return;
  }
  if (o.type === 'text') {
    if (sx && sy) {
      const k = w / box.w;
      x.fontSize = Math.max(6, Math.round(o.fontSize * k * 10) / 10);
      if (o.w) x.w = o.w * k;
    } else {
      x.w = Math.max(20, w);
    }
    const nb = elementBox(x, S.doc);
    const nc = rot({ x: A.x + (sx * nb.w) / 2, y: A.y + (sy ? (sy * nb.h) / 2 : 0) }, A, o.rotation);
    x.x = sx ? nc.x - nb.w / 2 : o.x;
    x.y = sy ? nc.y - nb.h / 2 : o.y;
    if (!sy) x.y = o.y;
    return;
  }
  const keep = (o.type === 'icon' || o.type === 'image') !== !!shift;
  if (keep && sx && sy) {
    const k = Math.max(w / box.w, h / box.h);
    w = box.w * k;
    h = box.h * k;
  }
  const local = { x: A.x + (sx ? (sx * w) / 2 : 0), y: A.y + (sy ? (sy * h) / 2 : 0) };
  const nc = rot(local, A, o.rotation);
  // for edge handles the perpendicular axis stays centered on the original center line
  x.w = w;
  x.h = h;
  x.x = nc.x - w / 2;
  x.y = nc.y - h / 2;
}

function onUp(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  S.guides = [];
  try { svg.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  if (d.kind === 'pan' || d.kind === 'marquee') { renderOverlay(); emit('select'); return; }
  if (d.kind === 'pen-handle') { renderOverlay(); return; }
  if (d.kind === 'pencil') { finishPencil(d.pts); return; }
  if (d.kind === 'pathpt') {
    const x = findElement(S.doc, d.id);
    if (x && d.moved) { refitPath(x); commit(); }
    renderOverlay();
    return;
  }
  if (d.kind === 'move') {
    if (d.moved) commit();
    renderOverlay();
    return;
  }
  if (d.kind === 'draw') {
    const x = findElement(S.doc, d.id);
    if (x && (x.w < 8 || x.h < 8)) {
      const def = { rect: [180, 110], ellipse: [160, 120], membrane: [360, 44], 'membrane-ellipse': [260, 220] }[d.tool] || [160, 100];
      x.w = def[0]; x.h = def[1];
      x.x = d.start.x - x.w / 2; x.y = d.start.y - x.h / 2;
    }
    commit();
    select(d.id);
    setTool('select');
    return;
  }
  if (d.kind === 'endpoint') {
    S.hoverId = null;
    const x = findElement(S.doc, d.id);
    if (d.creating && x) {
      const g = arrowGeometry(x, S.doc);
      if (Math.hypot(g.end.x - g.start.x, g.end.y - g.start.y) < 10) {
        // a click without a drag: make a default-length arrow
        if (x.from.id == null) x.to = { x: x.from.x + 120, y: x.from.y };
        else { S.doc.elements = S.doc.elements.filter((q) => q.id !== d.id); renderAll(); return; }
      }
      commit();
      select(d.id);
      if (!S.stickyTool) setTool('select');
      return;
    }
    commit();
    renderOverlay();
    return;
  }
  commit();
  renderOverlay();
}

function onWheel(e) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    const p = toContent(e);
    zoomBy(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0025) * (e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50 ? 4 : 1)), p);
  } else {
    const k = e.deltaMode ? 16 : 1;
    S.pan.x += (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k / S.zoom;
    S.pan.y += (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * k / S.zoom;
    applyView();
  }
}

function onDrop(e) {
  e.preventDefault();
  const p = toContent(e);
  const raw = e.dataTransfer.getData('application/x-fortheplot');
  if (raw) {
    try { emit('drop-item', { item: JSON.parse(raw), at: p }); } catch { /* ignore */ }
    return;
  }
  if (e.dataTransfer.files?.length) emit('drop-files', { files: [...e.dataTransfer.files], at: p });
}

/** Add an item from the library centered at a point (or the view center). */
export function addItemAt(item, at) {
  const p = at || viewCenter();
  if (item.kind === 'icon') {
    const def = getIcon(item.id);
    if (!def) return;
    const w = item.w || def.size || 110;
    const h = w * (def.h / def.w);
    return runOps([{ op: 'add', element: { type: 'icon', icon: item.id, x: p.x - w / 2, y: p.y - h / 2, w, h, ...(item.extra || {}) } }], { select: true });
  }
  if (item.kind === 'element') {
    const spec = { ...item.spec };
    const tmp = normalizeElement({ ...spec, x: 0, y: 0 });
    if (tmp.type === 'arrow') {
      const len = 160;
      spec.from = [p.x - len / 2, p.y];
      spec.to = [p.x + len / 2, p.y];
      return runOps([{ op: 'add', element: spec }], { select: true });
    }
    const b = elementBox(tmp, S.doc);
    return runOps([{ op: 'add', element: { ...spec, x: p.x - b.w / 2, y: p.y - b.h / 2 } }], { select: true });
  }
}

// ---- Inline text editing -----------------------------------------------------------

let editing = null;

function onDblClick(e) {
  if (pen) { finishPen(false); return; }
  // pointer capture retargets dblclick to the <svg>, so hit-test by position
  const id = hitId(e.target) || hitAt(e.clientX, e.clientY, null, true);
  if (!id) return;
  const x = findElement(S.doc, id);
  if (x.type === 'image' && x.link) { select(id, { groups: false }); openLinked(x); return; }
  if (x.type === 'path' && S.editPath === id && !e.target.closest?.('[data-handle]')) {
    const prev = JSON.parse(JSON.stringify(x));
    insertPointAt(x, toContent(e));
    reseatAttached(S.doc, x, prev);
    commit();
    return;
  }
  if (x.type === 'arrow' && S.sel.length > 1) return;
  select(id, { groups: false });
  startInlineEdit(id, false);
}

export function startInlineEdit(id, selectAll) {
  const x = findElement(S.doc, id);
  if (!x) return;
  if (x.type === 'path') {
    if (x.locked) return;
    select(id, { groups: false });
    S.editPath = id;
    renderOverlay();
    return;
  }
  let field, value, box, fs, align = 'center';
  if (x.type === 'note') {
    field = 'text'; value = x.text; box = elementBox(x, S.doc); box = { ...box, y: box.y + 22, h: Math.max(60, box.h - 22) }; fs = 14; align = 'left';
  } else if (x.type === 'text') {
    field = 'text'; value = x.text; box = elementBox(x, S.doc); fs = x.fontSize; align = x.align;
  } else if (x.type === 'shape' && !x.shape.startsWith('membrane')) {
    field = 'text'; value = x.text || ''; box = elementBox(x, S.doc); fs = x.fontSize;
  } else if (x.type === 'arrow') {
    field = 'label'; value = x.label || ''; const g = arrowGeometry(x, S.doc);
    box = { x: g.mid.x - 90, y: g.mid.y - 16, w: 180, h: 32 }; fs = x.labelSize;
  } else {
    field = 'label'; value = x.label?.text || '';
    const lb = labelBox(x.label ? x : { ...x, label: { text: 'Label', position: 'bottom', fontSize: 16 } });
    box = lb ? { x: Math.min(lb.x, x.x), y: lb.y, w: Math.max(lb.w, x.w), h: Math.max(lb.h, 24) } : { x: x.x, y: x.y + x.h, w: x.w, h: 24 };
    fs = x.label?.fontSize || 16;
  }
  const r1 = svg.getBoundingClientRect(), r0 = wrap.getBoundingClientRect();
  const sx = (box.x - S.pan.x) * S.zoom + (r1.left - r0.left), sy = (box.y - S.pan.y) * S.zoom + (r1.top - r0.top);
  Object.assign(inlineEd.style, {
    left: `${sx - 4}px`, top: `${sy - 4}px`, width: `${Math.max(140, box.w * S.zoom + 8)}px`, height: `${Math.max(32, box.h * S.zoom + 8)}px`,
    fontSize: `${Math.max(11, fs * S.zoom)}px`, textAlign: align,
  });
  inlineEd.value = value;
  inlineEd.hidden = false;
  editing = { id, field };
  inlineEd.focus();
  if (selectAll) inlineEd.select();
  else inlineEd.setSelectionRange(value.length, value.length);
}

function finishInline(save) {
  if (!editing) return;
  const { id, field } = editing;
  editing = null;
  inlineEd.hidden = true;
  const x = findElement(S.doc, id);
  if (!save) {
    // cancelling a note that was never written leaves nothing behind
    if (x?.type === 'note' && !x.text) runOps([{ op: 'remove', id }]);
    svg.focus();
    return;
  }
  if (!x) return;
  const v = inlineEd.value;
  if (x.type === 'note') {
    if (!v.trim() && !x.text) { runOps([{ op: 'remove', id }]); return; }
    x.text = v;
  } else if (x.type === 'text') {
    if (!v.trim()) { runOps([{ op: 'remove', id }]); return; }
    x.text = v;
  } else if (x.type === 'shape') x.text = v;
  else if (x.type === 'arrow') x.label = v;
  else x.label = v.trim() ? { ...(x.label || { position: 'bottom', fontSize: 16, color: '#1f2933', bold: false }), text: v } : null;
  commit();
  svg.focus();
}

export function initInlineEditor() {
  inlineEd.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); finishInline(false); }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishInline(true); }
  });
  inlineEd.addEventListener('blur', () => finishInline(true));
}

export function stageSvg() {
  return svg;
}
