// Right panel: properties of the selection, or of the figure when nothing is selected.

import { S, on, commit, runOps, select, selected } from './state.js';
import { h, glyph, button, toast } from './ui.js';
import { JOURNAL_PRESETS } from '../core/journal.js';
import { openSaveIconDialog } from './myicons.js';
import { iconPalette } from '../icons/registry.js';
import { linkName, openLinked, refreshLinked, unlink } from './linked.js';
import { server } from './io.js';
import { NOTE_COLORS } from '../core/model.js';
import {
  getIcon, allIcons, findElement, lintFigure, figureCredits, PALETTE, normalizeColor, SHAPES, HEADS, LABEL_POSITIONS, elementBox, normalizeElement,
  reseatAttached, getImage, cropRect, PANEL_LABEL_STYLES, panelStyle, panelSizes, CORNERS,
  textSizes, applyTextSize, ptPerPx, isGradient, normalizeGradient, cssGradient, paintColor, shade, mix,
} from '../core/index.js';

let root;

export function initInspector(container) {
  root = container;
  on('select', render);
  on('doc', (d) => { if (d?.source !== 'inspector') render(); });
  render();
}

// ---- field helpers -------------------------------------------------------------------

let fieldSeq = 0;
const fid = () => `f${++fieldSeq}`;

function change(key) {
  commit({ coalesce: key, source: 'inspector' });
}

function row(label, ...controls) {
  const id = controls.find((c) => c && c.id)?.id;
  return h('div', { class: 'row' }, h('label', { class: 'row-label', for: id || null }, label), h('div', { class: 'row-ctl' }, ...controls));
}

function numInput(value, onValue, { step = 1, min = null, max = null, unit = '', w = null } = {}) {
  const dec = step < 0.1 ? Math.min(6, Math.ceil(-Math.log10(step))) : 1;
  const shown = Math.abs(value) >= 100 ? Math.round(value) : Math.round((Number(value) || 0) * 10 ** dec) / 10 ** dec;
  const input = h('input', { type: 'number', id: fid(), value: shown, step, min, max, class: 'num', style: w ? { width: w } : null });
  input.addEventListener('input', () => { const v = parseFloat(input.value); if (Number.isFinite(v)) onValue(v); });
  return unit ? h('span', { class: 'num-wrap' }, input, h('span', { class: 'unit' }, unit)) : input;
}

function round(v) {
  return Math.round((Number(v) || 0) * 10) / 10;
}

function colorInput(value, onValue, { allowNone = false } = {}) {
  const v = normalizeColor(value, '#000000');
  const input = h('input', { type: 'color', id: fid(), value: v === 'none' ? '#ffffff' : v, class: 'color' });
  input.addEventListener('input', () => onValue(input.value));
  const wrap = h('span', { class: 'color-wrap' }, input);
  const pal = h('span', { class: 'swatches' });
  for (const c of [PALETTE.blue, PALETTE.teal, PALETTE.green, PALETTE.yellow, PALETTE.orange, PALETTE.red, PALETTE.magenta, PALETTE.purple, PALETTE.slate]) {
    const s = h('button', { type: 'button', class: 'swatch', title: c, style: { background: c } });
    s.addEventListener('click', () => { input.value = c; onValue(c); });
    pal.append(s);
  }
  wrap.append(pal);
  if (allowNone) {
    const n = h('button', { type: 'button', class: `swatch none${v === 'none' ? ' on' : ''}`, title: 'None' });
    n.addEventListener('click', () => onValue('none'));
    pal.append(n);
  }
  return wrap;
}

/**
 * A fill: solid color, or a linear or radial gradient with 2–5 color stops.
 * Calls back with a color string or a gradient object.
 */
function fillInput(value, onValue, { allowNone = false } = {}) {
  const mode = isGradient(value) ? value.type : 'solid';
  const base = paintColor(value, '#4a8fe7') === 'none' ? '#4a8fe7' : paintColor(value, '#4a8fe7');
  const wrap = h('div', { class: 'fill-ctl' });
  const emit = (g) => { onValue(g); };
  const rebuild = (v) => { emit(v); render(); };
  wrap.append(segmented([['solid', 'Solid'], ['linear', 'Linear'], ['radial', 'Radial']], mode, (m) => {
    if (m === mode) return;
    if (m === 'solid') return rebuild(base);
    const stops = isGradient(value) ? value.stops : null;
    if (m === 'linear') rebuild(normalizeGradient({ type: 'linear', angle: 180, stops: stops || [{ color: mix(base, '#ffffff', 0.6) }, { color: base }] }));
    else rebuild(normalizeGradient({ type: 'radial', cx: 0.35, cy: 0.3, r: 0.75, stops: stops || [{ color: mix(base, '#ffffff', 0.75) }, { color: base, offset: 0.6 }, { color: shade(base, -0.25) }] }));
  }));
  if (mode === 'solid') {
    wrap.append(colorInput(value, onValue, { allowNone }));
    return wrap;
  }
  const g = value;
  const preview = h('div', { class: 'grad-preview', style: { background: cssGradient(g) } });
  const set = (patch, re = false) => {
    const next = normalizeGradient({ ...g, ...patch });
    Object.assign(g, next); // keep editing the same object while dragging a color
    preview.style.background = cssGradient(g);
    if (re) rebuild(next); else emit(next);
  };
  wrap.append(preview);
  const stopsRow = h('div', { class: 'grad-stops' });
  g.stops.forEach((st, i) => {
    const c = h('input', { type: 'color', id: fid(), value: st.color === 'none' ? '#ffffff' : st.color, class: 'color', title: `Color ${i + 1} (at ${Math.round(st.offset * 100)}%)` });
    c.addEventListener('input', () => set({ stops: g.stops.map((x, j) => (j === i ? { ...x, color: c.value } : x)) }));
    const cell = h('span', { class: 'grad-stop' }, c);
    if (g.stops.length > 2) {
      const x = h('button', { type: 'button', class: 'grad-x', title: 'Remove this color' }, '×');
      x.addEventListener('click', () => set({ stops: g.stops.filter((_, j) => j !== i) }, true));
      cell.append(x);
    }
    stopsRow.append(cell);
  });
  if (g.stops.length < 5) {
    const add = h('button', { type: 'button', class: 'seg', title: 'Add a color in the middle' }, '+');
    add.addEventListener('click', () => {
      // split the widest gap
      let k = 1;
      for (let i = 1; i < g.stops.length; i++) if (g.stops[i].offset - g.stops[i - 1].offset > g.stops[k].offset - g.stops[k - 1].offset) k = i;
      const a = g.stops[k - 1], b = g.stops[k];
      const mid = { offset: (a.offset + b.offset) / 2, color: mix(a.color === 'none' ? '#ffffff' : a.color, b.color === 'none' ? '#ffffff' : b.color, 0.5) };
      set({ stops: [...g.stops.slice(0, k), mid, ...g.stops.slice(k)] }, true);
    });
    stopsRow.append(add);
  }
  const rev = h('button', { type: 'button', class: 'seg', title: 'Reverse the colors' }, '⇄');
  rev.addEventListener('click', () => set({ stops: g.stops.map((x) => ({ ...x, offset: 1 - x.offset })).reverse() }, true));
  stopsRow.append(rev);
  wrap.append(stopsRow);
  if (g.type === 'linear') {
    const dirs = [[180, '↓', 'Top to bottom'], [90, '→', 'Left to right'], [135, '↘', 'Diagonal down'], [45, '↗', 'Diagonal up']];
    const ang = numInput(g.angle, (v) => set({ angle: v }), { min: 0, max: 360, step: 5, unit: '°', w: '74px' });
    const dirBtns = segmented(dirs.map(([a, sym, t]) => [a, `${sym}`, null, t]), dirs.some(([a]) => a === Math.round(g.angle)) ? Math.round(g.angle) : null, (a) => set({ angle: a }, true));
    for (const [i, b] of [...dirBtns.children].entries()) b.title = dirs[i][2];
    wrap.append(h('div', { class: 'grad-row' }, h('span', { class: 'mini-label' }, 'Angle'), ang, dirBtns));
  } else {
    const centered = Math.abs(g.cx - 0.5) < 0.01 && Math.abs(g.cy - 0.5) < 0.01;
    wrap.append(h('div', { class: 'grad-row' }, h('span', { class: 'mini-label' }, 'Center'),
      segmented([['center', 'Middle'], ['light', 'Highlight']], centered ? 'center' : 'light', (v) => set(v === 'center' ? { cx: 0.5, cy: 0.5, r: 0.5 } : { cx: 0.35, cy: 0.3, r: 0.75 }, true))));
    wrap.append(h('div', { class: 'grad-row' }, h('span', { class: 'mini-label', title: 'How far the gradient reaches, as a share of the object' }, 'Spread'),
      numInput(g.r * 100, (v) => set({ r: Math.max(5, v) / 100 }), { min: 5, max: 200, step: 5, unit: '%', w: '74px' })));
  }
  return wrap;
}

function selectInput(options, value, onValue) {
  const s = h('select', { id: fid() }, ...options.map((o) => {
    const [val, label] = Array.isArray(o) ? o : [o, o];
    return h('option', { value: val, selected: val === value }, label);
  }));
  s.addEventListener('change', () => onValue(s.value));
  return s;
}

function textInput(value, onValue, { multiline = false, placeholder = '' } = {}) {
  const t = multiline
    ? h('textarea', { id: fid(), rows: 3, placeholder, spellcheck: 'true' }, value || '')
    : h('input', { type: 'text', id: fid(), value: value || '', placeholder });
  t.addEventListener('input', () => onValue(t.value));
  t.addEventListener('keydown', (e) => e.stopPropagation());
  return t;
}

function toggle(label, on_, onValue) {
  const b = h('button', { type: 'button', class: `seg${on_ ? ' on' : ''}`, 'aria-pressed': String(!!on_) }, label);
  b.addEventListener('click', () => { onValue(!on_); });
  return b;
}

function segmented(options, value, onValue) {
  const g = h('span', { class: 'segs', role: 'group' });
  for (const o of options) {
    const [val, label, icon] = Array.isArray(o) ? o : [o, o];
    const b = h('button', { type: 'button', class: `seg${val === value ? ' on' : ''}`, title: label, 'aria-pressed': String(val === value) }, icon ? glyph(icon, 16) : label);
    b.addEventListener('click', () => onValue(val));
    g.append(b);
  }
  return g;
}

function noteColors(value, onValue) {
  const g = h('span', { class: 'note-colors', role: 'group' });
  for (const [name, c] of Object.entries(NOTE_COLORS)) {
    const label = name[0].toUpperCase() + name.slice(1);
    const b = h('button', { type: 'button', class: `note-color${c === value ? ' on' : ''}`, title: label, 'aria-label': label, 'aria-pressed': String(c === value), style: `background:${c}` });
    b.addEventListener('click', () => onValue(c));
    g.append(b);
  }
  return g;
}

function section(title, ...kids) {
  return h('section', { class: 'insp-sec' }, title ? h('h3', {}, title) : null, ...kids);
}

// ---- render ------------------------------------------------------------------------

export function render() {
  if (!root || !S.doc) return;
  const active = document.activeElement;
  if (active && root.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && active.type !== 'color' && active.type !== 'button') {
    // don't rebuild under the user's cursor; refresh numbers only
    return;
  }
  root.innerHTML = '';
  const sel = selected();
  if (!sel.length) return renderFigure();
  if (sel.length > 1) return renderMulti(sel);
  const e = sel[0];
  if (e.type === 'note') { renderNote(e); renderActions([e]); return; }
  renderHeader(e);
  if (e.type !== 'arrow') renderGeometry(e);
  if (e.type === 'icon') renderIcon(e);
  if (e.type === 'shape') renderShape(e);
  if (e.type === 'text') renderText(e);
  if (e.type === 'arrow') renderArrow(e);
  if (e.type === 'path') renderPath(e);
  if (e.type === 'image') renderImageProps(e);
  if (e.type === 'panel') renderPanelProps(e);
  if (e.type === 'icon' || e.type === 'shape' || e.type === 'image') renderLabel(e);
  renderActions([e]);
}

function renderHeader(e) {
  const def = e.type === 'icon' ? getIcon(e.icon) : null;
  const kind = e.type === 'icon' ? (def?.name || e.icon) : e.type === 'shape' ? `Shape · ${e.shape}` : e.type === 'arrow' ? 'Arrow'
    : e.type === 'path' ? (e.membrane ? 'Membrane (drawn)' : 'Path') : e.type === 'image' ? (e.link?.prism ? 'Prism graph' : e.link ? 'Linked graph' : 'Image') : e.type === 'panel' ? 'Panel' : 'Text';
  const idIn = h('input', { type: 'text', id: 'el-id', value: e.id, class: 'mono', spellcheck: 'false', title: 'Element id (agents refer to elements by id)' });
  idIn.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') idIn.blur(); });
  idIn.addEventListener('change', () => renameId(e.id, idIn.value));
  root.append(section(null,
    h('div', { class: 'insp-title' }, h('span', { class: `type-dot t-${e.type}` }), h('strong', {}, kind)),
    row('ID', idIn),
    def?.pack ? h('p', { class: 'credit' }, `${def.author} · ${def.license}`, def.source ? [' · ', h('a', { href: def.source, target: '_blank', rel: 'noopener' }, 'source')] : null) : null,
  ));
}

function renameId(oldId, raw) {
  const id = String(raw).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');
  if (!id || id === oldId) return render();
  if (findElement(S.doc, id)) { render(); return; }
  for (const x of S.doc.elements) {
    if (x.id === oldId) x.id = id;
    if (x.type === 'arrow') for (const end of ['from', 'to']) if (x[end]?.id === oldId) x[end].id = id;
  }
  S.sel = S.sel.map((s) => (s === oldId ? id : s));
  commit({ source: 'inspector' });
  render();
}

function renderGeometry(e) {
  const b = elementBox(e, S.doc);
  // geometry edits carry attached receptors along with their host
  const geo = (key, fn) => (v) => { const prev = JSON.parse(JSON.stringify(e)); fn(v); reseatAttached(S.doc, e, prev); change(`${e.id}.${key}`); };
  const set = (k) => geo(k, (v) => { e[k] = v; });
  const kids = [
    h('div', { class: 'grid2' },
      row('X', numInput(e.x, set('x'))), row('Y', numInput(e.y, set('y'))),
      e.type === 'text'
        ? row('Wrap', numInput(e.w || 0, set('w'), { min: 0 }))
        : row('W', numInput(e.w, geo('w', (v) => {
          if (e.type === 'icon') { const k = v / e.w; e.h *= k; }
          e.w = v;
        }), { min: 1 })),
      e.type === 'text' ? row('H', h('span', { class: 'ro' }, round(b.h))) : row('H', numInput(e.h, geo('h', (v) => {
        if (e.type === 'icon') { const k = v / e.h; e.w *= k; }
        e.h = v;
      }), { min: 1 })),
      row('Rotate', numInput(e.rotation || 0, set('rotation'), { step: 5, unit: '°' })),
      row('Opacity', numInput(Math.round((e.opacity ?? 1) * 100), (v) => { e.opacity = Math.max(0, Math.min(1, v / 100)); change(`${e.id}.op`); }, { min: 0, max: 100, step: 5, unit: '%' })),
    ),
  ];
  root.append(section('Position & size', ...kids));
}

function renderIcon(e) {
  const def = getIcon(e.icon);
  if (!def) return;
  const kids = [];
  if (def.draw && Object.keys(def.colors || {}).length) {
    for (const role of Object.keys(def.colors)) {
      const cur = e.colors?.[role] || def.colors[role];
      const reset = h('button', { type: 'button', class: 'link', title: 'Reset to default' }, 'reset');
      reset.addEventListener('click', () => { const c = { ...(e.colors || {}) }; delete c[role]; e.colors = c; change(`${e.id}.color.${role}.reset`); render(); });
      kids.push(row(def.roles?.[role] || role, colorInput(cur, (v) => { e.colors = { ...(e.colors || {}), [role]: v }; change(`${e.id}.color.${role}`); }), e.colors?.[role] ? reset : null));
    }
  } else {
    // imported icons: tint everything to one hue, or swap individual colors
    const tintReset = h('button', { type: 'button', class: 'link' }, 'reset');
    tintReset.addEventListener('click', () => { delete e.tint; delete e.colorMap; change(`${e.id}.tint.reset`); render(); });
    kids.push(row('Tint', colorInput(e.tint || '#4a8fe7', (v) => { e.tint = v; change(`${e.id}.tint`); }), (e.tint || e.colorMap) ? tintReset : null));
    const pal = iconPalette(def, 8);
    if (pal.length) {
      const box = h('span', { class: 'recolor' });
      for (const c0 of pal) {
        const cur = e.colorMap?.[c0] || c0;
        const inp = h('input', { type: 'color', id: fid(), value: cur, title: `Replace ${c0}` });
        inp.addEventListener('input', () => { e.colorMap = { ...(e.colorMap || {}), [c0]: inp.value }; change(`${e.id}.cmap.${c0}`); });
        box.append(inp);
      }
      kids.push(row('Colors', box));
    }
    kids.push(h('p', { class: 'hint' }, `${def.author} · ${def.license}. Tint shifts every color to one hue; the swatches replace single colors.`));
  }
  kids.push(row('Flip', toggle('Horizontal', e.flipX, (v) => { e.flipX = v; change(`${e.id}.flipX`); render(); }), toggle('Vertical', e.flipY, (v) => { e.flipY = v; change(`${e.id}.flipY`); render(); })));
  const swap = selectInput(sameCategory(def), e.icon, (v) => runOps([{ op: 'update', id: e.id, set: { icon: v } }], { source: 'inspector' }));
  kids.push(row('Swap', swap));
  root.append(section('Icon', ...kids));
}

function sameCategory(def) {
  const list = [];
  for (const x of allIcons()) if (x.category === def.category) list.push([x.id, x.name]);
  return list.length ? list : [[def.id, def.name]];
}

function renderLabel(e) {
  const l = e.label || { text: '', position: 'bottom', fontSize: 16, color: '#1f2933', bold: false };
  const upd = (k, key) => (v) => {
    e.label = { ...l, ...(e.label || {}), [k]: v };
    if (k === 'text' && !String(v).length) e.label = null;
    change(`${e.id}.label.${key || k}`);
  };
  root.append(section('Label',
    row('Text', textInput(l.text, upd('text'), { placeholder: 'e.g. CD8^+ T cell' })),
    row('Place', selectInput(LABEL_POSITIONS, l.position, (v) => { upd('position')(v); render(); }), h('span', { class: 'mini-label' }, 'Size'), numInput(l.fontSize, upd('fontSize'), { min: 6, max: 120, w: '64px' })),
    row('Style', toggle('Bold', l.bold, (v) => { upd('bold')(v); render(); }), colorInput(l.color, upd('color'))),
  ));
}

function renderShape(e) {
  const set = (k) => (v) => { e[k] = v; change(`${e.id}.${k}`); };
  const isMem = e.shape.startsWith('membrane');
  const kids = [
    row('Shape', selectInput(SHAPES, e.shape, (v) => {
      const n = normalizeElement({ ...e, shape: v, fill: undefined, stroke: undefined });
      Object.assign(e, { shape: v });
      if (v.startsWith('membrane') !== isMem) { e.fill = n.fill; e.stroke = n.stroke; }
      change(`${e.id}.shape`); render();
    })),
    row(isMem ? 'Heads' : 'Fill', isMem ? colorInput(e.fill, set('fill')) : fillInput(e.fill, set('fill'), { allowNone: true })),
    row(isMem ? 'Tails' : 'Stroke', colorInput(e.stroke, set('stroke'), { allowNone: !isMem })),
  ];
  if (!isMem) {
    kids.push(h('div', { class: 'grid2' },
      row('Width', numInput(e.strokeWidth, set('strokeWidth'), { min: 0, step: 0.5 })),
      e.shape === 'rect' ? row('Radius', numInput(e.radius, set('radius'), { min: 0 })) : h('span'),
    ));
    kids.push(row('Dash', segmented([['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']], e.dash, (v) => { e.dash = v; change(`${e.id}.dash`); render(); })));
    kids.push(row('Text', textInput(e.text, set('text'), { multiline: true, placeholder: 'Text inside the shape' })));
    kids.push(h('div', { class: 'grid2' }, row('Size', numInput(e.fontSize, set('fontSize'), { min: 6 })), row('Bold', toggle('Bold', e.bold, (v) => { e.bold = v; change(`${e.id}.bold`); render(); }))));
    kids.push(row('Text color', colorInput(e.textColor || '#1f2933', set('textColor'))));
  } else if (e.shape === 'membrane-ellipse') {
    kids.push(row('Inside', fillInput(e.inner || 'none', set('inner'), { allowNone: true })));
    kids.push(row('Thickness', numInput(e.thickness || 26, set('thickness'), { min: 8, max: 80 })));
  }
  root.append(section('Shape', ...kids));
}

function renderPath(e) {
  const set = (k) => (v) => { const prev = JSON.parse(JSON.stringify(e)); e[k] = v; reseatAttached(S.doc, e, prev); change(`${e.id}.${k}`); };
  const flip = (k) => (v) => { set(k)(v); render(); };
  const heads = HEADS.map((x) => [x, { arrow: 'Arrow', open: 'Open', inhibit: 'Bar', circle: 'Circle', diamond: 'Diamond', none: 'None' }[x]]);
  const kids = [
    row('Shape', toggle('Closed', e.closed, flip('closed')), toggle('Smooth', e.smooth, flip('smooth'))),
    row('Style', toggle('Membrane', e.membrane, (v) => {
      e.membrane = v;
      if (v) { e.fill = '#f6c37b'; e.stroke = '#d9893b'; } else { e.fill = 'none'; e.stroke = '#52606d'; }
      change(`${e.id}.membrane`); render();
    })),
  ];
  if (e.membrane) {
    kids.push(row('Heads', colorInput(e.fill, set('fill'))));
    kids.push(row('Tails', colorInput(e.stroke, set('stroke'))));
    kids.push(row('Thickness', numInput(e.thickness || 26, set('thickness'), { min: 8, max: 80 })));
    if (e.closed) kids.push(row('Inside', fillInput(e.inner || 'none', set('inner'), { allowNone: true })));
  } else {
    kids.push(row('Stroke', colorInput(e.stroke, set('stroke'), { allowNone: true })));
    kids.push(h('div', { class: 'grid2' }, row('Width', numInput(e.strokeWidth, set('strokeWidth'), { min: 0, step: 0.5 })), h('span')));
    kids.push(row('Dash', segmented([['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']], e.dash, (v) => { e.dash = v; change(`${e.id}.dash`); render(); })));
    if (e.closed) kids.push(row('Fill', fillInput(e.fill, set('fill'), { allowNone: true })));
    else kids.push(h('div', { class: 'grid2' }, row('End', selectInput(heads, e.head, set('head'))), row('Start', selectInput(heads, e.tail, set('tail')))));
  }
  kids.push(h('p', { class: 'hint' }, 'Double-click the path (or press Enter) to edit its points: drag a point or handle, double-click the line to add a point, Alt+click a point to remove it. Receptors attached to a membrane follow it.'));
  root.append(section(e.membrane ? 'Membrane' : 'Path', ...kids));
}

function renderLinkProps(e) {
  const l = e.link;
  const when = l.updated ? new Date(l.updated).toLocaleString() : 'never';
  const kids = [
    h('p', { class: 'hint' }, h('strong', {}, linkName(l)), h('br'), `Updated ${when}`),
    h('div', { class: 'btn-row' },
      button(l.prism ? 'Open in Prism' : 'Open source', { cls: 'small', onClick: () => openLinked(e) }),
      button('Update now', { cls: 'small', onClick: () => refreshLinked(e) }),
      button('Unlink', { cls: 'small', onClick: () => { unlink(e); render(); } }),
    ),
    h('p', { class: 'hint' }, server.enabled
      ? (l.prism && !l.picture ? 'Double-click the graph to edit it in Prism. When you save there, ForThePlot exports it again and updates this picture.' : 'When the linked picture changes (export it again from Prism), this graph updates.')
      : 'Open this figure through Claude (or `fortheplot serve`) to edit the graph in Prism and pick up changes.'),
  ];
  root.append(section('Linked graph', ...kids));
}

function renderImageProps(e) {
  if (e.link) renderLinkProps(e);
  const img = getImage(e.image);
  const set = (k) => (v) => { e[k] = v; change(`${e.id}.${k}`); };
  const kids = [];
  if (!img) { root.append(section('Image', h('p', { class: 'warn' }, 'This image has no picture data. Import it again.'))); return; }
  kids.push(h('p', { class: 'hint' }, `${img.name ? img.name + ' · ' : ''}${img.vector ? 'vector' : `${img.w} × ${img.h} px`}`));
  // crop, in percent of the original; the visible pixels keep their size on the canvas
  const c = e.crop || { x: 0, y: 0, w: 1, h: 1 };
  const setCrop = (side) => (v) => {
    const pct = Math.max(0, Math.min(95, v)) / 100;
    const o = e.crop || { x: 0, y: 0, w: 1, h: 1 };
    let L = o.x, T = o.y, R = 1 - o.x - o.w, B = 1 - o.y - o.h;
    if (side === 'l') L = pct; if (side === 't') T = pct; if (side === 'r') R = pct; if (side === 'b') B = pct;
    if (1 - L - R < 0.02 || 1 - T - B < 0.02) return;
    const kx = e.w / (o.w * img.w), ky = e.h / (o.h * img.h);
    const n = { x: L, y: T, w: 1 - L - R, h: 1 - T - B };
    e.x += (n.x - o.x) * img.w * kx; e.y += (n.y - o.y) * img.h * ky;
    e.w = n.w * img.w * kx; e.h = n.h * img.h * ky;
    e.crop = n.x === 0 && n.y === 0 && n.w === 1 && n.h === 1 ? null : n;
    change(`${e.id}.crop`);
  };
  const pctIn = (v, side) => numInput(Math.round(v * 1000) / 10, setCrop(side), { min: 0, max: 95, step: 1, unit: '%' });
  kids.push(h('div', { class: 'grid2' },
    row('Crop left', pctIn(c.x, 'l')), row('Right', pctIn(1 - c.x - c.w, 'r')),
    row('Crop top', pctIn(c.y, 't')), row('Bottom', pctIn(1 - c.y - c.h, 'b')),
  ));
  if (e.crop) {
    const reset = h('button', { type: 'button', class: 'link' }, 'Reset crop');
    reset.addEventListener('click', () => {
      const o = e.crop, kx = e.w / (o.w * img.w);
      e.x -= o.x * img.w * kx; e.y -= o.y * img.h * kx; e.w = img.w * kx; e.h = img.h * kx; e.crop = null;
      change(`${e.id}.crop.reset`); render();
    });
    kids.push(reset);
  }
  kids.push(h('div', { class: 'grid2' },
    row('Corners', numInput(e.radius || 0, set('radius'), { min: 0 })),
    row('Border', numInput(e.stroke === 'none' ? 0 : e.strokeWidth, (v) => { if (v > 0 && e.stroke === 'none') e.stroke = '#1f2933'; if (v <= 0) e.stroke = 'none'; else e.strokeWidth = v; change(`${e.id}.border`); }, { min: 0, step: 0.5 })),
  ));
  if (e.stroke !== 'none') kids.push(row('Border color', colorInput(e.stroke, set('stroke'))));
  root.append(section('Image', ...kids));

  if (e.link && !e.scaleBar) return; // graphs don't need a scale bar
  const sb = e.scaleBar;
  const sbSet = (k, re) => (v) => { e.scaleBar = { ...(e.scaleBar || {}), [k]: v }; change(`${e.id}.sb.${k}`); if (re) render(); };
  const sbKids = [row('Show', toggle(sb ? 'On' : 'Off', !!sb, (v) => {
    e.scaleBar = v ? { length: 10, unit: 'µm', perPx: 0, position: 'bottom-right', color: '#ffffff', label: true } : null;
    change(`${e.id}.sb`); render();
  }))];
  if (sb) {
    sbKids.push(h('div', { class: 'grid2' },
      row(`${sb.unit}/px`, numInput(sb.perPx || 0, sbSet('perPx'), { min: 0, step: 0.001 })),
      row('Length', numInput(sb.length, sbSet('length'), { min: 0, step: 1 })),
    ));
    sbKids.push(row('Unit', segmented([['nm', 'nm'], ['µm', 'µm'], ['mm', 'mm']], sb.unit, sbSet('unit', true))));
    sbKids.push(row('Corner', selectInput(CORNERS.map((k) => [k, k.replace('-', ' ')]), sb.position, sbSet('position'))));
    sbKids.push(row('Color', segmented([['#ffffff', 'White'], ['#000000', 'Black']], sb.color, sbSet('color', true)), toggle('Label', sb.label !== false, sbSet('label', true))));
    if (!(sb.perPx > 0)) sbKids.push(h('p', { class: 'warn' }, `Enter the ${sb.unit} per pixel of the original image (from the microscope or the image's metadata) to draw the bar.`));
    else {
      const cr = cropRect(e, img);
      sbKids.push(h('p', { class: 'hint' }, `Field of view ${+(cr.w * sb.perPx).toPrecision(3)} × ${+(cr.h * sb.perPx).toPrecision(3)} ${sb.unit}.`));
    }
  }
  root.append(section('Scale bar', ...sbKids));
}

function renderPanelProps(e) {
  const set = (k) => (v) => { e[k] = v; change(`${e.id}.${k}`); };
  const letterIn = h('input', { type: 'text', id: fid(), value: typeof e.letter === 'string' ? e.letter : '', placeholder: e.letter === '' ? 'none' : 'auto', class: 'num', style: { width: '70px' } });
  letterIn.addEventListener('input', () => { e.letter = letterIn.value.trim() ? letterIn.value.trim() : null; change(`${e.id}.letter`); });
  letterIn.addEventListener('keydown', (ev) => ev.stopPropagation());
  const st = panelStyle(S.doc);
  // this panel's own sizes; empty follows "All panels"
  const own = (key, figureSize) => sizeField(e[key] ?? null, e[key] ?? null, (px) => {
    if (px == null) delete e[key]; else e[key] = px;
    change(`${e.id}.${key}`);
  }, { empty: figureSize, title: 'This panel only. Leave empty to use the size set under All panels.' });
  root.append(section('Panel',
    row('Title', textInput(e.title, set('title'), { placeholder: 'e.g. Experimental design' })),
    row('Letter', letterIn, toggle('No letter', e.letter === '', (v) => { e.letter = v ? '' : null; change(`${e.id}.noletter`); render(); })),
    h('p', { class: 'mini-label' }, 'This panel\u2019s text size (empty: same as all panels)'),
    h('div', { class: 'grid2' }, row('Letter', own('letterSize', st.size)), row('Title', own('titleSize', st.titleSize))),
    row('Fill', fillInput(e.fill, set('fill'), { allowNone: true })),
    row('Border', colorInput(e.stroke, set('stroke'), { allowNone: true })),
    h('div', { class: 'grid2' }, row('Width', numInput(e.strokeWidth, set('strokeWidth'), { min: 0, step: 0.5 })), row('Corners', numInput(e.radius, set('radius'), { min: 0 }))),
    h('p', { class: 'hint' }, 'Letters follow reading order and update when you add, remove or move panels. Moving a panel moves everything inside it.'),
  ));
  const setSt = (k, re) => (v) => { S.doc.panelLabels = { ...(S.doc.panelLabels || {}), [k]: v }; change(`fig.panel.${k}`); if (re) render(); };
  const allSize = (role) => (px) => { if (px != null) setTextSize({ roles: [role], size: px }, `fig.panel.${role}`); };
  root.append(section('All panels',
    row('Style', selectInput(PANEL_LABEL_STYLES.map((k) => [k, k === 'none' ? 'None' : k]), st.style, setSt('style'))),
    h('div', { class: 'grid2' },
      row('Letters', sizeField(st.size, st.size, allSize('letters'), { title: 'Letter size for every panel' })),
      row('Titles', sizeField(st.titleSize, st.titleSize, allSize('titles'), { title: 'Title size for every panel' })),
    ),
    row('Bold', toggle('Letters', st.letterBold, setSt('letterBold', true)), toggle('Titles', st.titleBold, setSt('titleBold', true))),
    row('Place', segmented([['inside', 'Inside'], ['outside', 'Outside']], st.position, setSt('position', true))),
  ));
  const inside = textSizeSection('Text in this panel', { within: e.id }, {
    roles: ['text', 'labels', 'shapes', 'arrows', 'plots', 'scaleBars'], scaleAlso: ['titles'], key: `${e.id}.text`,
    hint: 'Smaller and Larger also resize the panel title.',
  });
  if (inside) root.append(inside);
}

// ---- text sizes -------------------------------------------------------------------------

/** Sizes are shown in pt once the figure's printed width is set, else in canvas px. */
function sizeUnit() {
  const k = ptPerPx(S.doc);
  return k
    ? { unit: 'pt', show: (px) => Math.round(px * k * 10) / 10, toPx: (v) => v / k, step: 0.5 }
    : { unit: 'px', show: (px) => Math.round(px * 10) / 10, toPx: (v) => v, step: 1 };
}

/** A size input for a value or a range (shown as a placeholder). Calls back with px, or null when cleared. */
function sizeField(min, max, onPx, { empty = null, title = null, w = null } = {}) {
  const u = sizeUnit();
  const has = min != null && max != null;
  const same = has && Math.abs(max - min) < 0.05;
  const input = h('input', {
    type: 'number', id: fid(), class: 'num', step: u.step, min: 0.5, title,
    value: same ? u.show(min) : '',
    placeholder: has && !same ? `${u.show(min)}–${u.show(max)}` : empty != null ? String(u.show(empty)) : '',
  });
  input.addEventListener('input', () => {
    if (input.value === '') { onPx(null); return; }
    const v = parseFloat(input.value);
    if (Number.isFinite(v) && v > 0) onPx(u.toPx(v));
  });
  input.addEventListener('keydown', (ev) => ev.stopPropagation());
  return h('span', { class: 'num-wrap', style: w ? { width: w, flex: 'none' } : null }, input, h('span', { class: 'unit' }, u.unit));
}

function setTextSize(opts, key, { redraw = false } = {}) {
  try {
    applyTextSize(S.doc, opts);
  } catch (err) {
    toast(err.message, 'error');
    return;
  }
  change(key);
  if (redraw) render();
}

/**
 * Rows of text sizes by kind for a scope ({} = whole figure, {within}, {ids}), with a row that
 * sets or scales them all at once.
 */
function textSizeSection(title, scope, { roles = null, scaleAlso = [], key = 'text', hint = null, before = [] } = {}) {
  let sizes;
  try { sizes = textSizes(S.doc, scope); } catch { return null; }
  if (roles) sizes = sizes.filter((s) => roles.includes(s.role));
  if (!sizes.length && !before.length) return null;
  const kids = [...before];
  for (const s of sizes) {
    kids.push(h('div', { class: 'ts-row' },
      h('label', { class: 'row-label', title: `${s.count} item${s.count === 1 ? '' : 's'}` }, s.name, h('span', { class: 'ts-count' }, ` ${s.count}`)),
      sizeField(s.min, s.max, (px) => { if (px != null) setTextSize({ ...scope, roles: [s.role], size: px }, `${key}.${s.role}`); }),
    ));
  }
  // "All": set every kind shown except panel letters (they keep their own size); scale them all
  const setRoles = sizes.map((s) => s.role).filter((r) => r !== 'letters');
  const scaleRoles = [...new Set([...sizes.map((s) => s.role), ...scaleAlso])];
  if (sizes.length > 1 && setRoles.length) {
    const sub = sizes.filter((s) => setRoles.includes(s.role));
    kids.push(h('div', { class: 'ts-row ts-all' },
      h('label', { class: 'row-label', title: sizes.some((s) => s.role === 'letters') ? 'Every kind above except panel letters' : 'Every kind above' }, 'All of these'),
      sizeField(Math.min(...sub.map((s) => s.min)), Math.max(...sub.map((s) => s.max)), (px) => { if (px != null) setTextSize({ ...scope, roles: setRoles, size: px }, `${key}.all`); }),
    ));
  }
  if (sizes.length) {
    kids.push(h('div', { class: 'btn-row' },
      button('Smaller', { cls: 'small', title: 'Make all of these 10% smaller', onClick: () => setTextSize({ ...scope, roles: scaleRoles, scale: 1 / 1.1 }, `${key}.scale`, { redraw: true }) }),
      button('Larger', { cls: 'small', title: 'Make all of these 10% larger', onClick: () => setTextSize({ ...scope, roles: scaleRoles, scale: 1.1 }, `${key}.scale`, { redraw: true }) }),
    ));
  }
  if (hint) kids.push(h('p', { class: 'hint' }, hint));
  return section(title, ...kids);
}

/** Printed width (mm) of the figure: turns text sizes into points. */
function printWidthRow() {
  const d = S.doc;
  const pw = Number(d.canvas.printWidth) || 0;
  const preset = JOURNAL_PRESETS.find((p) => Math.abs(p.widthMm - pw) < 0.05);
  const value = !pw ? '' : preset ? preset.id : 'custom';
  const mm = h('input', { type: 'number', id: fid(), class: 'num', min: 20, max: 2000, step: 1, value: pw || 183, style: { display: value === 'custom' ? '' : 'none' } });
  mm.addEventListener('input', () => { const v = parseFloat(mm.value); if (v > 0) { d.canvas.printWidth = v; change('fig.printWidth'); } });
  mm.addEventListener('keydown', (ev) => ev.stopPropagation());
  mm.addEventListener('change', () => render());
  const short = (p) => `${+p.widthMm.toFixed(1)} mm · ${p.name.replace(/\s*\([^)]*\)\s*$/, '')}`;
  const sel = selectInput([['', 'Not set (sizes in px)'], ...JOURNAL_PRESETS.map((p) => [p.id, short(p)]), ['custom', 'Custom width…']], value, (v) => {
    if (!v) delete d.canvas.printWidth;
    else if (v === 'custom') d.canvas.printWidth = pw || 183;
    else d.canvas.printWidth = JOURNAL_PRESETS.find((p) => p.id === v).widthMm;
    change('fig.printWidth');
    render();
  });
  return row('Printed', sel, h('span', { class: 'num-wrap', style: { display: value === 'custom' ? '' : 'none', width: '90px' } }, mm, h('span', { class: 'unit' }, 'mm')));
}

function renderText(e) {
  const set = (k) => (v) => { e[k] = v; change(`${e.id}.${k}`); };
  root.append(section('Text',
    textInput(e.text, set('text'), { multiline: true }),
    h('p', { class: 'hint' }, '**bold**  *italic*  CD4^+  Ca^{2+}  H_{2}O'),
    h('div', { class: 'grid2' }, row('Size', numInput(e.fontSize, set('fontSize'), { min: 6, max: 200 })), row('Color', colorInput(e.color, set('color')))),
    row('Style', toggle('Bold', e.bold, (v) => { e.bold = v; change(`${e.id}.bold`); render(); }), toggle('Italic', e.italic, (v) => { e.italic = v; change(`${e.id}.italic`); render(); })),
    row('Align', segmented([['left', 'Left', 'alignL'], ['center', 'Center', 'alignHC'], ['right', 'Right', 'alignR']], e.align, (v) => { e.align = v; change(`${e.id}.align`); render(); })),
    row('Backdrop', toggle('On', !!e.background, (v) => { e.background = v ? '#ffffffe6' : null; change(`${e.id}.bg`); render(); })),
  ));
}

function renderArrow(e) {
  const set = (k) => (v) => { e[k] = v; change(`${e.id}.${k}`); };
  const heads = HEADS.map((x) => [x, { arrow: 'Arrow (activates)', open: 'Open', inhibit: 'Bar (inhibits)', circle: 'Circle (binds)', diamond: 'Diamond', none: 'None' }[x]]);
  const kids = [
    h('div', { class: 'grid2' },
      row('End', selectInput(heads, e.head, (v) => { e.head = v; change(`${e.id}.head`); })),
      row('Start', selectInput(heads, e.tail, (v) => { e.tail = v; change(`${e.id}.tail`); })),
    ),
    row('Route', segmented([['straight', 'Straight'], ['curved', 'Curved'], ['elbow', 'Elbow']], e.routing, (v) => { e.routing = v; change(`${e.id}.routing`); render(); })),
  ];
  if (e.routing === 'curved') {
    const sl = h('input', { type: 'range', id: fid(), min: -1, max: 1, step: 0.05, value: e.curvature });
    sl.addEventListener('input', () => { e.curvature = parseFloat(sl.value); change(`${e.id}.curv`); });
    kids.push(row('Bend', sl));
  }
  kids.push(row('Color', colorInput(e.stroke, set('stroke'))));
  kids.push(h('div', { class: 'grid2' }, row('Width', numInput(e.width, set('width'), { min: 0.5, step: 0.5 })), row('Gap', numInput(e.gap ?? 6, set('gap'), { min: 0 }))));
  kids.push(row('Dash', segmented([['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']], e.dash, (v) => { e.dash = v; change(`${e.id}.dash`); render(); })));
  kids.push(row('Label', textInput(e.label, set('label'), { placeholder: 'e.g. binds' })));
  kids.push(row('Label size', numInput(e.labelSize, set('labelSize'), { min: 6 })));
  const ends = h('p', { class: 'hint mono' }, `${e.from?.id ?? 'point'} → ${e.to?.id ?? 'point'}`);
  const rev = button('Reverse', { onClick: () => { const f = e.from; e.from = e.to; e.to = f; change(`${e.id}.rev`); render(); }, cls: 'small' });
  kids.push(h('div', { class: 'row-inline' }, ends, rev));
  root.append(section('Arrow', ...kids));
}

function renderNote(e) {
  const set = (k) => (v) => { e[k] = v; change(`${e.id}.${k}`); };
  const targets = [['', '(nothing)'], ...S.doc.elements.filter((x) => x.type !== 'note').map((x) => [x.id, x.id])];
  root.append(section(null, h('div', { class: 'insp-title' }, h('span', { class: 'type-dot', style: { background: e.color } }), h('strong', {}, e.author === 'claude' ? 'Note from Claude' : 'Your note'))));
  root.append(section('Note',
    textInput(e.text, set('text'), { multiline: true, placeholder: 'e.g. Make the PD-1 pair larger' }),
    row('Points at', selectInput(targets, e.target || '', (v) => { e.target = v || null; change(`${e.id}.target`); })),
    row('Color', noteColors(e.color, (v) => { e.color = v; change(`${e.id}.color`); render(); })),
    row('Status', toggle(e.resolved ? 'Resolved' : 'Open', e.resolved, (v) => { e.resolved = v; change(`${e.id}.resolved`); render(); })),
    h('p', { class: 'hint' }, 'Notes are for you and Claude: Claude reads them (and what you have selected) when you ask it to work on the figure. They never appear in exports.'),
  ));
}

function renderActions(els) {
  const ids = els.map((x) => x.id);
  const anyLocked = els.some((x) => x.locked);
  const grouped = els.some((x) => x.group);
  root.append(section('Arrange',
    h('div', { class: 'btn-row' },
      button('', { icon: 'front', title: 'Bring to front  ]', cls: 'icon-only', onClick: () => runOps([{ op: 'order', ids, to: 'front' }]) }),
      button('', { icon: 'back', title: 'Send to back  [', cls: 'icon-only', onClick: () => runOps([{ op: 'order', ids, to: 'back' }]) }),
      button('', { icon: 'dup', title: 'Duplicate  Ctrl+D', cls: 'icon-only', onClick: () => runOps([{ op: 'duplicate', ids }], { select: true }) }),
      els.length > 1 || grouped
        ? button('', { icon: 'group', title: grouped ? 'Ungroup  Ctrl+Shift+G' : 'Group  Ctrl+G', cls: `icon-only${grouped ? ' on' : ''}`, onClick: () => runOps([{ op: grouped ? 'ungroup' : 'group', ids }]) })
        : null,
      button('', { icon: 'lock', title: anyLocked ? 'Unlock' : 'Lock (prevents selecting on canvas)', cls: `icon-only${anyLocked ? ' on' : ''}`, onClick: () => { for (const x of els) x.locked = !anyLocked; commit(); select(anyLocked ? ids : []); } }),
      button('', { icon: 'trash', title: 'Delete  Del', cls: 'icon-only danger', onClick: () => { runOps([{ op: 'remove', ids }]); select([]); } }),
    ),
    els.some((x) => x.type !== 'note')
      ? h('div', { class: 'btn-row' }, button('Save as icon…', { cls: 'small', icon: 'star', title: 'Keep this as a reusable icon in your library (Mine)', onClick: () => openSaveIconDialog(ids) }))
      : null,
  ));
}

function renderMulti(sel) {
  const ids = sel.map((x) => x.id);
  const al = (edge) => () => runOps([{ op: 'align', ids, edge }]);
  root.append(section(null, h('div', { class: 'insp-title' }, h('strong', {}, `${sel.length} elements selected`))));
  root.append(section('Align',
    h('div', { class: 'btn-row' },
      button('', { icon: 'alignL', title: 'Align left', cls: 'icon-only', onClick: al('left') }),
      button('', { icon: 'alignHC', title: 'Align centers horizontally', cls: 'icon-only', onClick: al('hcenter') }),
      button('', { icon: 'alignR', title: 'Align right', cls: 'icon-only', onClick: al('right') }),
      button('', { icon: 'alignT', title: 'Align top', cls: 'icon-only', onClick: al('top') }),
      button('', { icon: 'alignVC', title: 'Align centers vertically', cls: 'icon-only', onClick: al('vcenter') }),
      button('', { icon: 'alignB', title: 'Align bottom', cls: 'icon-only', onClick: al('bottom') }),
    ),
    h('div', { class: 'btn-row' },
      button('Distribute ↔', { title: 'Distribute horizontally', cls: 'small', onClick: () => runOps([{ op: 'distribute', ids, axis: 'h' }]) }),
      button('Distribute ↕', { title: 'Distribute vertically', cls: 'small', onClick: () => runOps([{ op: 'distribute', ids, axis: 'v' }]) }),
    ),
    h('div', { class: 'btn-row' },
      button('Wrap in panel', { cls: 'small', icon: 'panels', title: 'Put a lettered panel around the selection', onClick: () => runOps([{ op: 'panels', wrap: [ids.filter((i) => findElement(S.doc, i)?.type !== 'panel')] }], { select: true }) }),
    ),
    h('div', { class: 'btn-row' },
      button('Tidy', { cls: 'small', icon: 'tidy', title: 'Nudge these apart so nothing overlaps', onClick: () => runOps([{ op: 'tidy', ids }]) }),
      button('Row', { cls: 'small', title: 'Arrange in a row', onClick: () => runOps([{ op: 'arrange', ids: ids.filter((i) => findElement(S.doc, i).type !== 'arrow'), layout: 'row', gap: 40 }]) }),
      button('Column', { cls: 'small', title: 'Arrange in a column', onClick: () => runOps([{ op: 'arrange', ids: ids.filter((i) => findElement(S.doc, i).type !== 'arrow'), layout: 'column', gap: 30 }]) }),
      button('Grid', { cls: 'small', title: 'Arrange in a grid', onClick: () => runOps([{ op: 'arrange', ids: ids.filter((i) => findElement(S.doc, i).type !== 'arrow'), layout: 'grid', gap: 30 }]) }),
    ),
  ));
  const panelsSel = sel.filter((x) => x.type === 'panel').map((x) => x.id);
  const others = sel.filter((x) => x.type !== 'panel').map((x) => x.id);
  const txt = textSizeSection('Text sizes', { ...(others.length ? { ids: others } : {}), ...(panelsSel.length ? { within: panelsSel } : {}) }, {
    roles: ['text', 'labels', 'shapes', 'arrows', 'plots', 'scaleBars', 'titles'], key: 'multi.text',
    hint: panelsSel.length ? 'Includes everything inside the selected panels.' : null,
  });
  if (txt) root.append(txt);
  root.append(section('Color all',
    colorInput('#4a8fe7', (v) => {
      for (const x of sel) {
        if (x.type === 'icon') x.colors = { ...(x.colors || {}), primary: v };
        else if (x.type === 'shape') x.fill = v;
        else if (x.type === 'arrow') x.stroke = v;
        else if (x.type === 'text') x.color = v;
      }
      change('multi.color');
    }),
  ));
  renderActions(sel);
}

function renderFigure() {
  const d = S.doc;
  const set = (fn, key) => (v) => { fn(v); change(`fig.${key}`); };
  root.append(section(null, h('div', { class: 'insp-title' }, h('strong', {}, 'Figure'))));
  root.append(section('Canvas',
    row('Title', textInput(d.title, set((v) => { d.title = v; }, 'title'))),
    h('div', { class: 'grid2' },
      row('Width', numInput(d.canvas.width, set((v) => { d.canvas.width = Math.max(50, v); }, 'w'), { min: 50, unit: 'px' })),
      row('Height', numInput(d.canvas.height, set((v) => { d.canvas.height = Math.max(50, v); }, 'h'), { min: 50, unit: 'px' })),
    ),
    row('Preset', selectInput([['', 'Choose…'], ['1200x800', 'Figure 1200×800'], ['1600x900', 'Slide 16:9'], ['1000x1000', 'Square'], ['2400x1200', 'Graphical abstract'], ['1050x1500', 'Poster panel']], '', (v) => {
      if (!v) return;
      const [w, hh] = v.split('x').map(Number);
      d.canvas.width = w; d.canvas.height = hh; change('fig.preset'); render();
    })),
    row('Background', colorInput(d.canvas.background, set((v) => { d.canvas.background = v; }, 'bg'), { allowNone: true })),
    row('Font', selectInput([
      ['Arial, Helvetica, sans-serif', 'Arial / Helvetica'], ['"Helvetica Neue", Helvetica, Arial, sans-serif', 'Helvetica Neue'],
      ['Calibri, Carlito, Arial, sans-serif', 'Calibri'], ['"Times New Roman", Times, serif', 'Times'], ['Georgia, serif', 'Georgia'],
    ], d.font, set((v) => { d.font = v; }, 'font'))),
    h('div', { class: 'btn-row' },
      button('Fit canvas to content', { cls: 'small', onClick: () => runOps([{ op: 'fit', margin: 40 }]) }),
      button('Tidy overlaps', { cls: 'small', icon: 'tidy', onClick: () => runOps([{ op: 'tidy' }]) }),
    ),
  ));
  root.append(textSizeSection('Text sizes', {}, {
    key: 'fig.text', before: [printWidthRow()],
    hint: ptPerPx(d) ? 'Sizes are as printed at this width. Journals usually ask for 5–8 pt text.' : 'Choose the printed width to see and set sizes in points.',
  }));
  const issues = lintFigure(d);
  const list = h('ul', { class: 'issues' });
  for (const i of issues.slice(0, 12)) {
    const li = h('li', { class: i.level }, i.message);
    const target = i.id || i.ids?.[0];
    if (target) { li.tabIndex = 0; li.addEventListener('click', () => select(i.ids || [i.id])); }
    list.append(li);
  }
  root.append(section(`Figure check${issues.length ? ` (${issues.length})` : ''}`, issues.length ? list : h('p', { class: 'hint ok' }, 'No layout problems found.')));
  const credits = figureCredits(d);
  if (credits.length) {
    root.append(section('Icon credits', ...credits.map((c) => h('p', { class: 'credit' }, h('strong', {}, c.author), ` · ${c.license} · `, c.icons.slice(0, 6).join(', '), c.icons.length > 6 ? '…' : ''))));
  }
  root.append(section('Shortcuts', h('p', { class: 'hint keys' },
    'V select · H pan · T text · A arrow · R box · E ellipse · M membrane · P pen · B pencil · N note · Ctrl+E export · Del delete · Ctrl+D duplicate · Ctrl+G group · Alt-drag copy · Shift-drag constrain · Space-drag pan · Ctrl+wheel zoom · Double-click to edit text, points or a linked Prism graph')));
}
