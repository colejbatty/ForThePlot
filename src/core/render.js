// Pure figure -> SVG renderer. Runs unchanged in the browser and in Node, so the
// editor, the CLI and the MCP server all produce identical output.

import { getIcon, iconColors, iconMarkup, recolorSvg } from '../icons/registry.js';
import { shade, contrastText } from './color.js';
import { arrowGeometry, headSVG, headSize, labelBox, textLayout, TEXT_PAD, visualBounds, union, f, elementBox, center, noteLayout, NOTE_FONT } from './geometry.js';
import { pathD, samplePath } from './path.js';
import { getImage, cropRect, isSvgImage, svgImageParts } from './images.js';
import { panelLetters, panelStyle, panelSizes } from './panels.js';
import { layoutText } from './text.js';
import { rng } from './rng.js';
import { richTextSVG, escapeXml } from './text.js';
import { DEFAULT_FONT } from './model.js';
import { paint, paintColor } from './gradient.js';

/** A fill for an element: color or gradient (with its <defs>), unique per element and slot. */
function fillOf(el, value, slot, opts = {}) {
  return paint(value, `grad-${opts.uidPrefix || 'e'}-${el.id}-${slot}`);
}

const DASH = { solid: null, dashed: (w) => `${f(w * 3)} ${f(w * 2.2)}`, dotted: (w) => `0 ${f(w * 2.2)}` };

function dashAttr(dash, w) {
  const fn = DASH[dash];
  if (!fn) return '';
  return ` stroke-dasharray="${fn(w)}"`;
}

function wrap(el, inner, opts, box) {
  const attrs = [];
  if (opts.ids !== false) attrs.push(`data-id="${escapeXml(el.id)}"`);
  if (el.opacity != null && el.opacity < 1) attrs.push(`opacity="${f(el.opacity)}"`);
  if (el.rotation && box) {
    attrs.push(`transform="rotate(${f(el.rotation)} ${f(box.x + box.w / 2)} ${f(box.y + box.h / 2)})"`);
  }
  return `<g ${attrs.join(' ')}>${inner}</g>`;
}

function renderLabel(el, doc) {
  const lb = labelBox(el);
  if (!lb) return '';
  const l = el.label;
  const align = l.position === 'left' ? 'right' : l.position === 'right' ? 'left' : 'center';
  const x = align === 'center' ? lb.x + lb.w / 2 : align === 'right' ? lb.x + lb.w : lb.x;
  return richTextSVG(l.text, {
    x, y: lb.y, fontSize: l.fontSize, color: l.color, bold: l.bold, align, maxWidth: l.maxWidth || 0,
    fontFamily: doc.font || DEFAULT_FONT,
    halo: l.halo ? doc.canvas.background : null,
  }).svg;
}

export function renderIcon(el, doc, opts = {}) {
  const def = getIcon(el.icon);
  const box = { x: el.x, y: el.y, w: el.w, h: el.h };
  let inner;
  if (!def) {
    inner = `<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" rx="8" fill="#fde8e8" stroke="#e85d5d" stroke-dasharray="6 4"/>`
      + `<text x="${f(el.x + el.w / 2)}" y="${f(el.y + el.h / 2)}" font-family="Arial" font-size="12" fill="#b42318" text-anchor="middle">? ${escapeXml(el.icon)}</text>`;
  } else {
    const colors = iconColors(def, el.colors);
    const uid = `${opts.uidPrefix || 'e'}-${String(el.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    let markup = iconMarkup(def, colors, uid);
    if (!def.draw && (el.tint || el.colorMap)) markup = recolorSvg(markup, { tint: el.tint, colorMap: el.colorMap });
    if (el.flipX || el.flipY) {
      const sx = el.flipX ? -1 : 1, sy = el.flipY ? -1 : 1;
      const tx = el.flipX ? def.w : 0, ty = el.flipY ? def.h : 0;
      markup = `<g transform="translate(${tx} ${ty}) scale(${sx} ${sy})">${markup}</g>`;
    }
    inner = `<svg x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" viewBox="0 0 ${def.w} ${def.h}" preserveAspectRatio="none" overflow="visible">${markup}</svg>`;
  }
  if (opts.hit) inner = hitRect(box) + inner;
  // Labels are not rotated with the icon so they stay readable.
  const body = wrap(el, inner, { ...opts, ids: false }, box);
  return wrapOuter(el, body + renderLabel(el, doc), opts);
}

function hitRect(b) {
  return `<rect x="${f(b.x)}" y="${f(b.y)}" width="${f(Math.max(b.w, 4))}" height="${f(Math.max(b.h, 4))}" fill="transparent"/>`;
}

function wrapOuter(el, inner, opts) {
  const attrs = [];
  if (opts.ids !== false) attrs.push(`data-id="${escapeXml(el.id)}"`);
  return attrs.length ? `<g ${attrs.join(' ')}>${inner}</g>` : `<g>${inner}</g>`;
}

function shapePath(el) {
  const { x, y, w, h } = el;
  const P = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L') + ' Z';
  switch (el.shape) {
    case 'triangle': return P([[x + w / 2, y], [x + w, y + h], [x, y + h]]);
    case 'diamond': return P([[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]]);
    case 'hexagon': {
      const i = Math.min(w * 0.25, h * 0.5);
      return P([[x + i, y], [x + w - i, y], [x + w, y + h / 2], [x + w - i, y + h], [x + i, y + h], [x, y + h / 2]]);
    }
    case 'brace': {
      const m = y + h / 2, r = Math.min(h / 2, w / 10);
      return `M${f(x)} ${f(y + h)} Q${f(x)} ${f(m)} ${f(x + r)} ${f(m)} L${f(x + w / 2 - r)} ${f(m)} Q${f(x + w / 2)} ${f(m)} ${f(x + w / 2)} ${f(y)} Q${f(x + w / 2)} ${f(m)} ${f(x + w / 2 + r)} ${f(m)} L${f(x + w - r)} ${f(m)} Q${f(x + w)} ${f(m)} ${f(x + w)} ${f(y + h)}`;
    }
    default: return null;
  }
}

/** Phospholipid bilayer along a straight band (the element box). */
function membraneSVG(el) {
  const { x, y, w, h } = el;
  const headR = Math.max(2, Math.min(h * 0.14, 14));
  const step = headR * 2.05;
  const n = Math.max(1, Math.floor(w / step));
  const off = (w - n * step) / 2 + step / 2;
  const tailC = el.stroke === 'none' ? '#c98a4b' : el.stroke;
  const headC = el.fill === 'none' ? '#f6c37b' : el.fill;
  const tw = Math.max(0.8, headR * 0.28);
  let tails = '', heads = '';
  const mid = y + h / 2;
  for (let i = 0; i < n; i++) {
    const cx = x + off + i * step;
    for (const [hy, dir] of [[y + headR, 1], [y + h - headR, -1]]) {
      const ty = mid - dir * h * 0.035;
      const dx = headR * 0.38;
      tails += `M${f(cx - dx)} ${f(hy)} L${f(cx - dx)} ${f(ty)} M${f(cx + dx)} ${f(hy)} L${f(cx + dx)} ${f(ty)} `;
      heads += `<circle cx="${f(cx)}" cy="${f(hy)}" r="${f(headR)}"/>`;
    }
  }
  return `<path d="${tails}" stroke="${tailC}" stroke-width="${f(tw)}" stroke-linecap="round" fill="none"/>`
    + `<g fill="${headC}" stroke="${shade(headC, -0.25)}" stroke-width="${f(headR * 0.18)}">${heads}</g>`;
}

/** Phospholipid bilayer along an ellipse — a quick cell or vesicle outline. */
function membraneEllipseSVG(el, opts = {}) {
  const { x, y, w, h } = el;
  const cx = x + w / 2, cy = y + h / 2;
  const t = Math.max(8, Math.min(el.thickness || 26, Math.min(w, h) / 3));
  const headR = Math.max(2, Math.min(t * 0.17, 9));
  const tailC = el.stroke === 'none' ? '#c98a4b' : el.stroke;
  const headC = el.fill === 'none' ? '#f6c37b' : el.fill;
  const tw = Math.max(0.8, headR * 0.28);
  let heads = '', tails = '';
  const rings = [
    { rx: w / 2 - headR, ry: h / 2 - headR, dir: -1 },
    { rx: w / 2 - t + headR, ry: h / 2 - t + headR, dir: 1 },
  ];
  let inner = '';
  if (el.inner && el.inner !== 'none') {
    const p = fillOf(el, el.inner, 'inner', opts);
    inner = `${p.defs}<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(w / 2 - t / 2)}" ry="${f(h / 2 - t / 2)}" fill="${p.fill}"/>`;
  }
  for (const ring of rings) {
    if (ring.rx <= headR || ring.ry <= headR) continue;
    // sample the ellipse and place heads at equal arc length
    const N = 720;
    const pts = [];
    let total = 0, prev = null;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const p = { x: cx + ring.rx * Math.cos(a), y: cy + ring.ry * Math.sin(a), a };
      if (prev) total += Math.hypot(p.x - prev.x, p.y - prev.y);
      p.s = total;
      pts.push(p);
      prev = p;
    }
    const step = headR * 2.1;
    const count = Math.max(6, Math.floor(total / step));
    const real = total / count;
    let j = 0;
    for (let k = 0; k < count; k++) {
      const target = k * real;
      while (j < pts.length - 1 && pts[j + 1].s < target) j++;
      const p = pts[j];
      // outward normal of ellipse
      let nx = Math.cos(p.a) / ring.rx, ny = Math.sin(p.a) / ring.ry;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
      const len = t / 2 - headR - t * 0.03;
      const ex = p.x + ring.dir * nx * len, ey = p.y + ring.dir * ny * len;
      const sx = -ny * headR * 0.38, sy = nx * headR * 0.38;
      tails += `M${f(p.x + sx)} ${f(p.y + sy)} L${f(ex + sx)} ${f(ey + sy)} M${f(p.x - sx)} ${f(p.y - sy)} L${f(ex - sx)} ${f(ey - sy)} `;
      heads += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(headR)}"/>`;
    }
  }
  return inner
    + `<path d="${tails}" stroke="${tailC}" stroke-width="${f(tw)}" stroke-linecap="round" fill="none"/>`
    + `<g fill="${headC}" stroke="${shade(headC, -0.25)}" stroke-width="${f(headR * 0.18)}">${heads}</g>`;
}

// ---- Panels (multi-panel figures with automatic letters) -------------------------------

/** Where a panel's letter and title go. */
export function panelHeader(el, doc, letters = panelLetters(doc)) {
  const st = panelStyle(doc);
  const { letter: size, title: ts } = panelSizes(el, doc, st);
  const letter = letters.get(el.id) ?? '';
  const letterText = letter ? (st.letterBold ? `**${letter}**` : letter) : '';
  const pad = Math.max(10, size * 0.45);
  const lx = st.position === 'outside' ? el.x : el.x + pad;
  const ly = st.position === 'outside' ? el.y - size * 1.25 - 2 : el.y + pad * 0.8;
  const lw = letter ? layoutText(letterText, { fontSize: size }).width : 0;
  const tx = letter ? lx + lw + size * 0.4 : lx;
  // titles share the letter's baseline; with no letter they sit where the letter would
  const ty = letter ? ly + (size - ts) * 0.78 : ly + Math.max(0, size - ts) * 0.5;
  return {
    letter, letterText, size, color: st.color, lx, ly, lw,
    ts, tx, ty, titleBold: st.titleBold, titleColor: st.titleColor,
    band: (ly - el.y) + Math.max(size, ts) * 1.3,
  };
}

export function renderPanel(el, doc, opts = {}) {
  const box = { x: el.x, y: el.y, w: el.w, h: el.h };
  const r = Math.min(el.radius || 0, el.w / 2, el.h / 2);
  const stroke = el.stroke && el.stroke !== 'none' ? ` stroke="${el.stroke}" stroke-width="${f(el.strokeWidth)}"${dashAttr(el.dash, el.strokeWidth)}` : '';
  let inner = '';
  if (opts.hit) {
    // grab a panel by its frame or header; its empty middle stays free for selecting what is inside
    const hd = panelHeader(el, doc);
    inner += `<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" rx="${f(r)}" fill="none" stroke="transparent" stroke-width="14"/>`;
    inner += `<rect x="${f(el.x)}" y="${f(Math.min(el.y, hd.ly))}" width="${f(el.w)}" height="${f(Math.max(28, hd.band))}" fill="transparent"/>`;
  }
  if ((el.fill && el.fill !== 'none') || stroke) {
    const pf = fillOf(el, el.fill, 'fill', opts);
    inner += `${pf.defs}<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" rx="${f(r)}" fill="${pf.fill}"${stroke}/>`;
  }
  const hd = panelHeader(el, doc);
  const font = doc.font || DEFAULT_FONT;
  if (hd.letter) inner += richTextSVG(hd.letterText, { x: hd.lx, y: hd.ly, fontSize: hd.size, color: hd.color, align: 'left', fontFamily: font }).svg;
  if (el.title) inner += richTextSVG(el.title, { x: hd.tx, y: hd.ty, fontSize: hd.ts, color: hd.titleColor, align: 'left', bold: hd.titleBold, fontFamily: font, maxWidth: Math.max(40, el.x + el.w - hd.tx - 10) }).svg;
  return wrap(el, inner, opts, box);
}

// ---- Images: micrographs, blots, real flow plots ----------------------------------------

/** Scale bar geometry for an image element (canvas px, unrotated), or null. */
export function scaleBarBox(el, img = getImage(el.image)) {
  const sb = el.scaleBar;
  if (!sb || !img || !(sb.perPx > 0) || !(sb.length > 0)) return null;
  const cr = cropRect(el, img);
  const len = (sb.length / sb.perPx) * (el.w / cr.w);
  const m = Math.max(6, Math.min(el.w, el.h) * 0.05);
  const t = sb.thickness ?? Math.max(3, Math.min(el.w, el.h) * 0.018);
  const fs = sb.fontSize ?? Math.max(9, Math.min(28, el.h * 0.055));
  const right = sb.position.endsWith('right'), top = sb.position.startsWith('top');
  const x = right ? el.x + el.w - m - len : el.x + m;
  const labelH = sb.label ? fs * 1.25 : 0;
  const y = top ? el.y + m + labelH : el.y + el.h - m - t;
  return { x, y, w: len, h: t, fs, labelY: y - fs * 1.2, text: `${+sb.length.toFixed(3)} ${sb.unit}`.trim() };
}

export function renderImage(el, doc, opts = {}) {
  const box = { x: el.x, y: el.y, w: el.w, h: el.h };
  const img = getImage(el.image);
  let inner;
  if (!img) {
    inner = `<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" fill="#f1f4f8" stroke="#9aa5b1" stroke-dasharray="6 4"/>`
      + `<text x="${f(el.x + el.w / 2)}" y="${f(el.y + el.h / 2)}" font-family="Arial" font-size="13" fill="#52606d" text-anchor="middle">missing image</text>`;
  } else {
    const cr = cropRect(el, img);
    let body;
    if (isSvgImage(img) && !opts.imageHref) {
      // vector picture: draw it inline so PDF and SVG exports stay vector
      const sp = svgImageParts(img);
      const vb = sp.viewBox;
      body = `<svg x="0" y="0" width="${f(img.w)}" height="${f(img.h)}" viewBox="${f(vb.x)} ${f(vb.y)} ${f(vb.w)} ${f(vb.h)}" preserveAspectRatio="none" overflow="hidden">${sp.markup}</svg>`;
    } else {
      const href = opts.imageHref ? opts.imageHref(img) : img.src;
      body = `<image width="${f(img.w)}" height="${f(img.h)}" preserveAspectRatio="none" href="${escapeXml(href)}" xlink:href="${escapeXml(href)}"/>`;
    }
    let pic = `<svg x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" viewBox="${f(cr.x)} ${f(cr.y)} ${f(cr.w)} ${f(cr.h)}" preserveAspectRatio="none" overflow="hidden">${body}</svg>`;
    if (el.radius > 0) {
      const uid = `clip-${opts.uidPrefix || 'e'}-${String(el.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const r = Math.min(el.radius, el.w / 2, el.h / 2);
      pic = `<clipPath id="${uid}"><rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" rx="${f(r)}"/></clipPath><g clip-path="url(#${uid})">${pic}</g>`;
    }
    inner = pic;
    if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) {
      inner += `<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" rx="${f(Math.min(el.radius || 0, el.w / 2, el.h / 2))}" fill="none" stroke="${el.stroke}" stroke-width="${f(el.strokeWidth)}"/>`;
    }
    const sb = scaleBarBox(el, img);
    if (sb) {
      const col = el.scaleBar.color;
      inner += `<rect x="${f(sb.x)}" y="${f(sb.y)}" width="${f(sb.w)}" height="${f(sb.h)}" fill="${col}"/>`;
      if (el.scaleBar.label) {
        inner += richTextSVG(`**${sb.text}**`, { x: sb.x + sb.w / 2, y: sb.labelY, fontSize: sb.fs, color: col, align: 'center', fontFamily: doc.font || DEFAULT_FONT }).svg;
      }
    }
  }
  if (opts.hit) inner = hitRect(box) + inner;
  const body = wrap(el, inner, { ...opts, ids: false }, box);
  return wrapOuter(el, body + renderLabel(el, doc), opts);
}

// ---- Paths: pen/pencil drawings, curved arrows and membranes along any curve -----------

function normalsOf(S, closed) {
  const n = S.length;
  return S.map((p, i) => {
    let a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)];
    if (closed && (i === 0 || i === n - 1)) { a = S[n - 2] || p; b = S[1] || p; }
    let tx = b.x - a.x, ty = b.y - a.y;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    return { tx, ty, nx: ty, ny: -tx };
  });
}

/** Evenly spaced positions along a polyline: [{x, y, i}] (i = index of the segment start). */
function spaced(poly, step, closed) {
  let total = 0;
  const acc = [0];
  for (let i = 1; i < poly.length; i++) { total += Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y); acc.push(total); }
  if (total <= 0) return [];
  const count = closed ? Math.max(3, Math.round(total / step)) : Math.max(1, Math.floor(total / step) + 1);
  const gap = closed ? total / count : (count > 1 ? total / (count - 1) : 0);
  const start = closed ? 0 : (total - gap * (count - 1)) / 2;
  const out = [];
  let j = 1;
  for (let k = 0; k < count; k++) {
    const target = start + k * gap;
    while (j < poly.length - 1 && acc[j] < target) j++;
    const a = poly[j - 1], b = poly[j];
    const seg = acc[j] - acc[j - 1] || 1;
    const t = Math.max(0, Math.min(1, (target - acc[j - 1]) / seg));
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, i: j - 1 });
  }
  return out;
}

/** Phospholipid bilayer that follows the path, open or closed. */
function membranePathSVG(el, opts = {}) {
  const S = samplePath(el, 2);
  if (S.length < 2) return '';
  const t = Math.max(8, el.thickness || 26);
  const headR = Math.max(2, Math.min(t * 0.17, 9));
  const tailC = el.stroke === 'none' ? '#c98a4b' : el.stroke;
  const headC = el.fill === 'none' ? '#f6c37b' : el.fill;
  const tw = Math.max(0.8, headR * 0.28);
  const N = normalsOf(S, el.closed);
  let heads = '', tails = '';
  const off = t / 2 - headR;
  const len = t / 2 - headR - t * 0.03;
  for (const side of [1, -1]) {
    const poly = S.map((p, i) => ({ x: p.x + N[i].nx * off * side, y: p.y + N[i].ny * off * side }));
    for (const h of spaced(poly, headR * 2.1, el.closed)) {
      const nn = N[Math.min(N.length - 1, h.i)];
      const ex = h.x - nn.nx * side * len, ey = h.y - nn.ny * side * len;
      const sx = nn.tx * headR * 0.38, sy = nn.ty * headR * 0.38;
      tails += `M${f(h.x + sx)} ${f(h.y + sy)} L${f(ex + sx)} ${f(ey + sy)} M${f(h.x - sx)} ${f(h.y - sy)} L${f(ex - sx)} ${f(ey - sy)} `;
      heads += `<circle cx="${f(h.x)}" cy="${f(h.y)}" r="${f(headR)}"/>`;
    }
  }
  const pi = el.closed && el.inner && el.inner !== 'none' ? fillOf(el, el.inner, 'inner', opts) : null;
  const inner = pi ? `${pi.defs}<path d="${pathD(el)}" fill="${pi.fill}"/>` : '';
  return inner
    + `<path d="${tails}" stroke="${tailC}" stroke-width="${f(tw)}" stroke-linecap="round" fill="none"/>`
    + `<g fill="${headC}" stroke="${shade(headC, -0.25)}" stroke-width="${f(headR * 0.18)}">${heads}</g>`;
}

function trimmedPolyline(S, s0, s1) {
  const total = S[S.length - 1].s;
  const pts = S.filter((p) => p.s >= s0 && p.s <= total - s1);
  const at = (target) => {
    let i = 1;
    while (i < S.length - 1 && S[i].s < target) i++;
    const a = S[i - 1], b = S[i], k = b.s > a.s ? (target - a.s) / (b.s - a.s) : 0;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  return [at(s0), ...pts, at(total - s1)];
}

function endDirs(S) {
  const n = S.length;
  const back = (k) => S[Math.max(0, n - 1 - k)], fwd = (k) => S[Math.min(n - 1, k)];
  const k = Math.min(4, n - 1);
  const u = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; };
  return { end: u(back(k), S[n - 1]), start: u(fwd(k), S[0]) };
}

export function renderPath(el, doc, opts = {}) {
  const box = { x: el.x, y: el.y, w: el.w, h: el.h };
  const d = pathD(el);
  if (!d) return '';
  let inner = '';
  if (el.membrane) inner = membranePathSVG(el, opts);
  else {
    const w = el.strokeWidth;
    const stroke = el.stroke && el.stroke !== 'none' ? el.stroke : null;
    const pf = el.closed && el.fill && el.fill !== 'none' ? fillOf(el, el.fill, 'fill', opts) : { fill: 'none', defs: '' };
    const fill = pf.fill;
    const heads = !el.closed && ((el.head && el.head !== 'none') || (el.tail && el.tail !== 'none'));
    let dd = d;
    if (heads && stroke) {
      const S = samplePath(el, 2);
      const cut = (h) => (h === 'arrow' ? headSize(w) * 0.8 : h === 'diamond' || h === 'circle' ? headSize(w) * 0.8 : 0);
      const pts = trimmedPolyline(S, cut(el.tail), cut(el.head));
      dd = pts.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join(' ');
      const dirs = endDirs(S);
      inner += `<path d="${dd}" fill="none" stroke="${stroke}" stroke-width="${f(w)}" stroke-linecap="${el.dash === 'dotted' ? 'round' : 'butt'}" stroke-linejoin="round"${dashAttr(el.dash, w)}/>`;
      inner += headSVG(el.head, S[S.length - 1], dirs.end, w, stroke);
      inner += headSVG(el.tail, S[0], dirs.start, w, stroke);
    } else {
      inner = `${pf.defs}<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${f(w)}"${dashAttr(el.dash, w)}` : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  if (opts.hit) {
    const hw = el.membrane ? (el.thickness || 26) + 6 : Math.max(14, (el.strokeWidth || 0) + 10);
    const filled = el.closed && ((el.membrane && el.inner && el.inner !== 'none') || (!el.membrane && el.fill && el.fill !== 'none'));
    inner = `<path d="${d}" fill="${filled ? 'transparent' : 'none'}" stroke="transparent" stroke-width="${f(hw)}" stroke-linejoin="round"/>` + inner;
  }
  return wrap(el, inner, opts, box);
}

// ---- Flow cytometry style plots (used by the gating block) ---------------------------

const DENSITY = ['#3b4cc0', '#4a8fe7', '#6cc3e8', '#6abf59', '#c7d93a', '#f6c945', '#f39a3d', '#e85d5d'];

function gaussian(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Procedural dot plot / histogram with a gate, in the element box. Data coords are 0..1, y up. */
function plotSVG(el, doc) {
  const p = el.plot || {};
  const { x, y, w, h } = el;
  const fs = p.fontSize || Math.max(9, Math.min(14, h * 0.075));
  const ml = fs * 1.9, mb = fs * 1.9, mt = fs * 0.4, mr = fs * 0.4;
  const ax = x + ml, ay = y + mt, aw = Math.max(10, w - ml - mr), ah = Math.max(10, h - mt - mb);
  const X = (u) => ax + u * aw, Y = (v) => ay + (1 - v) * ah;
  const font = doc.font || DEFAULT_FONT;
  const ink = el.stroke && el.stroke !== 'none' ? el.stroke : '#1f2933';
  let out = `<rect x="${f(ax)}" y="${f(ay)}" width="${f(aw)}" height="${f(ah)}" fill="${el.fill === 'none' ? 'none' : el.fill}" stroke="${ink}" stroke-width="${f(el.strokeWidth || 1.5)}"/>`;
  const rand = rng(p.seed ?? 7);
  if ((p.kind || 'dot') === 'histogram') {
    const curves = p.populations || [{ x: 0.3, sx: 0.08, n: 1, color: '#9aa5b1' }, { x: 0.68, sx: 0.09, n: 1, color: p.color || '#e85d5d' }];
    for (const c of curves) {
      let d = `M${f(X(0))} ${f(Y(0))}`;
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        const v = 0.88 * (c.height ?? 1) * Math.exp(-((u - c.x) ** 2) / (2 * c.sx * c.sx));
        d += ` L${f(X(u))} ${f(Y(v))}`;
      }
      d += ` L${f(X(1))} ${f(Y(0))} Z`;
      out += `<path d="${d}" fill="${c.color}" fill-opacity="0.45" stroke="${shade(c.color, -0.3)}" stroke-width="1.2"/>`;
    }
  } else {
    const pops = p.populations || [
      { x: 0.32, y: 0.36, sx: 0.09, sy: 0.11, n: 420 },
      { x: 0.7, y: 0.68, sx: 0.07, sy: 0.08, n: 260 },
      { x: 0.55, y: 0.2, sx: 0.12, sy: 0.06, n: 110 },
    ];
    const pts = [];
    for (const pop of pops) {
      for (let i = 0; i < (pop.n || 100); i++) {
        const u = pop.x + gaussian(rand) * pop.sx, v = pop.y + gaussian(rand) * pop.sy;
        if (u > 0.01 && u < 0.99 && v > 0.01 && v < 0.99) pts.push([u, v]);
      }
    }
    const G = 18, grid = new Map();
    const key = (u, v) => `${Math.floor(u * G)},${Math.floor(v * G)}`;
    for (const [u, v] of pts) grid.set(key(u, v), (grid.get(key(u, v)) || 0) + 1);
    const max = Math.max(1, ...grid.values());
    const r = Math.max(0.7, Math.min(aw, ah) * 0.0075);
    const byColor = new Map();
    for (const [u, v] of pts) {
      const t = Math.sqrt(grid.get(key(u, v)) / max);
      const c = p.color ? p.color : DENSITY[Math.min(DENSITY.length - 1, Math.floor(t * DENSITY.length))];
      if (!byColor.has(c)) byColor.set(c, '');
      byColor.set(c, byColor.get(c) + `<circle cx="${f(X(u))}" cy="${f(Y(v))}" r="${f(r)}"/>`);
    }
    for (const [c, dots] of byColor) out += `<g fill="${c}">${dots}</g>`;
  }
  const g = p.gate;
  if (g) {
    const gs = `fill="none" stroke="${ink}" stroke-width="${f(Math.max(1, (el.strokeWidth || 1.5) * 0.9))}"`;
    if (g.type === 'polygon' && Array.isArray(g.points)) {
      out += `<path d="${g.points.map(([u, v], i) => `${i ? 'L' : 'M'}${f(X(u))} ${f(Y(v))}`).join(' ')} Z" ${gs}/>`;
    } else if (g.type === 'ellipse') {
      out += `<ellipse cx="${f(X(g.x + g.w / 2))}" cy="${f(Y(g.y + g.h / 2))}" rx="${f((g.w * aw) / 2)}" ry="${f((g.h * ah) / 2)}" ${gs}/>`;
    } else if (g.type === 'quad') {
      out += `<path d="M${f(X(g.x))} ${f(Y(0))} L${f(X(g.x))} ${f(Y(1))} M${f(X(0))} ${f(Y(g.y))} L${f(X(1))} ${f(Y(g.y))}" ${gs}/>`;
    } else {
      out += `<rect x="${f(X(g.x))}" y="${f(Y(g.y + g.h))}" width="${f(g.w * aw)}" height="${f(g.h * ah)}" ${gs}/>`;
    }
    const label = [p.gateLabel, p.pct != null && p.pct !== '' ? `${p.pct}%` : null].filter(Boolean).join('\n');
    if (label) {
      const lx = g.type === 'polygon' ? X(Math.max(...g.points.map((q) => q[0]))) : X(Math.min(0.98, (g.x ?? 0.5) + (g.w ?? 0)));
      const ly = g.type === 'polygon' ? Y(Math.max(...g.points.map((q) => q[1]))) : Y(Math.min(0.98, (g.y ?? 0.5) + (g.h ?? 0)));
      const right = lx > ax + aw * 0.72;
      out += richTextSVG(`**${label.split('\n')[0]}**${label.includes('\n') ? '\n' + label.split('\n')[1] : ''}`, {
        x: right ? lx - 3 : lx + 3, y: Math.max(ay + 2, ly - fs * 0.2), fontSize: fs * 0.95, color: ink, align: right ? 'right' : 'left', fontFamily: font, halo: '#ffffff', haloWidth: 3,
      }).svg;
    }
  }
  if (p.xLabel) out += richTextSVG(p.xLabel, { x: ax + aw / 2, y: ay + ah + fs * 0.45, fontSize: fs, color: ink, align: 'center', fontFamily: font }).svg;
  if (p.yLabel) {
    const lay = textLayout({ text: p.yLabel, fontSize: fs, w: 0 });
    const cx = x + fs * 0.75, cy = ay + ah / 2;
    out += `<g transform="rotate(-90 ${f(cx)} ${f(cy)})">${richTextSVG(p.yLabel, { x: cx, y: cy - lay.height / 2, fontSize: fs, color: ink, align: 'center', fontFamily: font }).svg}</g>`;
  }
  return out;
}

// ---- Sticky notes (conversation between a person and an agent; never exported) ------

export function renderNote(el, doc, opts = {}) {
  const box = elementBox(el, doc);
  const lay = noteLayout(el);
  const edge = shade(el.color, -0.3);
  let inner = '';
  const target = el.target ? doc.elements.find((e) => e.id === el.target) : null;
  if (target) {
    const tc = center(elementBox(target, doc));
    const nc = center(box);
    inner += `<path d="M${f(nc.x)} ${f(nc.y)} L${f(tc.x)} ${f(tc.y)}" stroke="${shade(el.color, -0.5)}" stroke-width="2" stroke-dasharray="5 4" fill="none"/><circle cx="${f(tc.x)}" cy="${f(tc.y)}" r="5" fill="${shade(el.color, -0.5)}"/>`;
  }
  inner += `<rect x="${f(box.x + 3)}" y="${f(box.y + 4)}" width="${f(box.w)}" height="${f(box.h)}" rx="6" fill="#0b1a2a" opacity="0.12"/>`;
  inner += `<rect x="${f(box.x)}" y="${f(box.y)}" width="${f(box.w)}" height="${f(box.h)}" rx="6" fill="${el.color}" stroke="${edge}" stroke-width="1.2"/>`;
  const who = el.author === 'claude' ? 'Claude' : 'You';
  inner += richTextSVG(`**${who}**${el.resolved ? '  ✓ resolved' : ''}`, { x: box.x + 10, y: box.y + 7, fontSize: 11, color: shade(el.color, -0.62), fontFamily: doc.font || DEFAULT_FONT }).svg;
  inner += richTextSVG(el.text || ' ', { x: box.x + 10, y: box.y + 26, fontSize: NOTE_FONT, color: '#1f2933', maxWidth: Math.max(40, el.w - 20), fontFamily: doc.font || DEFAULT_FONT }).svg;
  if (opts.hit) inner = `<rect x="${f(box.x)}" y="${f(box.y)}" width="${f(box.w)}" height="${f(box.h)}" fill="transparent"/>` + inner;
  void lay;
  const attrs = [`data-id="${escapeXml(el.id)}"`, `data-note="1"`];
  if (el.resolved) attrs.push('opacity="0.55"');
  return `<g ${opts.ids === false ? attrs.slice(1).join(' ') : attrs.join(' ')}>${inner}</g>`;
}

export function renderShape(el, doc, opts = {}) {
  const box = { x: el.x, y: el.y, w: el.w, h: el.h };
  let inner = '';
  const stroke = el.stroke && el.stroke !== 'none'
    ? ` stroke="${el.stroke}" stroke-width="${f(el.strokeWidth)}"${dashAttr(el.dash, el.strokeWidth)}${el.dash === 'dotted' ? ' stroke-linecap="round"' : ''}`
    : '';
  const pf = fillOf(el, el.fill, 'fill', opts);
  const fill = ` fill="${pf.fill}"`;
  if (el.shape === 'plot') inner = plotSVG(el, doc);
  else if (el.shape === 'membrane') inner = membraneSVG(el);
  else if (el.shape === 'membrane-ellipse') inner = membraneEllipseSVG(el, opts);
  else if (el.shape === 'rect') {
    const r = Math.min(el.radius || 0, el.w / 2, el.h / 2);
    inner = `<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(el.w)}" height="${f(el.h)}" rx="${f(r)}"${fill}${stroke}/>`;
  } else if (el.shape === 'ellipse') {
    inner = `<ellipse cx="${f(el.x + el.w / 2)}" cy="${f(el.y + el.h / 2)}" rx="${f(el.w / 2)}" ry="${f(el.h / 2)}"${fill}${stroke}/>`;
  } else if (el.shape === 'brace') {
    inner = `<path d="${shapePath(el)}" fill="none" stroke="${el.stroke === 'none' ? '#52606d' : el.stroke}" stroke-width="${f(el.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else {
    inner = `<path d="${shapePath(el)}"${fill}${stroke} stroke-linejoin="round"/>`;
  }
  if (pf.defs && !el.shape.startsWith('membrane') && el.shape !== 'plot' && el.shape !== 'brace') inner = pf.defs + inner;
  if (el.text && el.shape !== 'plot') {
    const color = el.textColor || contrastText(paintColor(el.fill, '#ffffff'));
    const lay = textLayout({ text: el.text, fontSize: el.fontSize, w: Math.max(10, el.w - 16), bold: el.bold });
    inner += richTextSVG(el.text, {
      x: el.x + el.w / 2, y: el.y + (el.h - lay.height) / 2, fontSize: el.fontSize, color, align: 'center',
      maxWidth: Math.max(10, el.w - 16), bold: el.bold, fontFamily: doc.font || DEFAULT_FONT,
    }).svg;
  }
  if (opts.hit) inner = hitRect(box) + inner;
  const body = wrap(el, inner, { ...opts, ids: false }, box);
  return wrapOuter(el, body + renderLabel(el, doc), opts);
}

export function renderText(el, doc, opts = {}) {
  const lay = textLayout(el);
  const pad = el.background ? TEXT_PAD : 0;
  const bw = (el.w || lay.width) + pad * 2, bh = lay.height + pad * 2;
  const box = { x: el.x, y: el.y, w: bw, h: bh };
  const tx = el.align === 'center' ? el.x + bw / 2 : el.align === 'right' ? el.x + bw - pad : el.x + pad;
  let inner = '';
  if (opts.hit) inner += hitRect(box);
  if (el.background) inner += `<rect x="${f(el.x)}" y="${f(el.y)}" width="${f(bw)}" height="${f(bh)}" rx="4" fill="${el.background}"/>`;
  inner += richTextSVG(el.text, {
    x: tx, y: el.y + pad, fontSize: el.fontSize, color: el.color, align: el.align, maxWidth: el.w || 0,
    bold: el.bold, italic: el.italic, fontFamily: el.fontFamily || doc.font || DEFAULT_FONT,
  }).svg;
  return wrap(el, inner, opts, box);
}

/** Where an arrow's label goes: beside the path's midpoint, on the outside of curves. */
export function arrowLabelBox(el, doc, g = arrowGeometry(el, doc)) {
  const lay = textLayout({ text: el.label, fontSize: el.labelSize, w: 0 });
  const dir = g.midDir || g.endDir;
  let nx = -dir.y, ny = dir.x;
  if (el.routing === 'curved' && g.ctrl) {
    const mx = (g.start.x + g.end.x) / 2, my = (g.start.y + g.end.y) / 2;
    if ((g.ctrl.x - mx) * nx + (g.ctrl.y - my) * ny < 0) { nx = -nx; ny = -ny; }
  } else if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
  const off = el.labelOffset ?? (Math.abs(dir.x) > Math.abs(dir.y) ? lay.height / 2 + 4 : lay.width / 2 + 8);
  const cx = g.mid.x + nx * off, cy = g.mid.y + ny * off;
  return { x: cx - lay.width / 2, y: cy - lay.height / 2, w: lay.width, h: lay.height, layout: lay };
}

export function renderArrow(el, doc, opts = {}) {
  const g = arrowGeometry(el, doc);
  const w = el.width;
  let inner = `<path d="${g.d}" fill="none" stroke="${el.stroke}" stroke-width="${f(w)}" stroke-linecap="${el.dash === 'dotted' ? 'round' : 'butt'}" stroke-linejoin="round"${dashAttr(el.dash, w)}/>`;
  inner += headSVG(el.head, g.end, g.endDir, w, el.stroke);
  inner += headSVG(el.tail, g.start, { x: -g.startDir.x, y: -g.startDir.y }, w, el.stroke);
  if (el.label) {
    const lb = arrowLabelBox(el, doc, g);
    inner += richTextSVG(el.label, {
      x: lb.x + lb.w / 2, y: lb.y, fontSize: el.labelSize, color: el.labelColor || shade(el.stroke, -0.35), align: 'center',
      fontFamily: doc.font || DEFAULT_FONT, halo: doc.canvas.background === 'none' ? '#ffffff' : doc.canvas.background, haloWidth: 5,
    }).svg;
  }
  // Wide transparent hit area for the editor.
  if (opts.hit) inner = `<path d="${g.d}" fill="none" stroke="transparent" stroke-width="${f(Math.max(14, w + 10))}"/>` + inner;
  return wrap(el, inner, opts, null);
}

export function renderElement(el, doc, opts = {}) {
  if (el.hidden && !opts.showHidden) return '';
  switch (el.type) {
    case 'note': return opts.notes ? renderNote(el, doc, opts) : '';
    case 'icon': return renderIcon(el, doc, opts);
    case 'shape': return renderShape(el, doc, opts);
    case 'text': return renderText(el, doc, opts);
    case 'arrow': return renderArrow(el, doc, opts);
    case 'path': return renderPath(el, doc, opts);
    case 'image': return renderImage(el, doc, opts);
    case 'panel': return renderPanel(el, doc, opts);
    default: return '';
  }
}

/** Credits for every third-party icon used in a figure. */
export function figureCredits(doc) {
  const seen = new Map();
  for (const el of doc.elements) {
    if (el.type !== 'icon') continue;
    const def = getIcon(el.icon);
    if (def?.own) {
      // your own icons credit whatever third-party icons they were made from
      for (const c of def.credits || []) {
        const key = `${c.author}|${c.license}|${c.source || ''}`;
        if (!seen.has(key)) seen.set(key, { author: c.author, license: c.license, source: c.source, pack: '', icons: [] });
        for (const n of c.icons || []) if (!seen.get(key).icons.includes(n)) seen.get(key).icons.push(n);
      }
      continue;
    }
    if (!def || !def.author || def.author === 'ForThePlot contributors') continue;
    const key = `${def.author}|${def.license}|${def.source || ''}`;
    if (!seen.has(key)) seen.set(key, { author: def.author, license: def.license, source: def.source, pack: def.pack || '', icons: [] });
    seen.get(key).icons.push(def.name);
  }
  return [...seen.values()];
}

const LICENSE_NAMES = {
  'CC0-1.0': 'CC0 1.0', 'CC-BY-3.0': 'CC BY 3.0', 'CC-BY-4.0': 'CC BY 4.0', 'CC-BY-SA-3.0': 'CC BY-SA 3.0',
  'CC-BY-SA-4.0': 'CC BY-SA 4.0', MIT: 'MIT', 'BSD-3-Clause': 'BSD 3-Clause',
};

/** A ready-to-paste credit line for a figure legend or acknowledgements. */
export function creditLine(doc) {
  const credits = figureCredits(doc);
  if (!credits.length) return 'Illustration created with ForThePlot (open-source). All icons are ForThePlot originals (MIT license).';
  const parts = credits.map((c) => {
    const names = c.icons.length > 3 ? `${c.icons.slice(0, 3).map((n) => `“${n}”`).join(', ')} and ${c.icons.length - 3} more` : c.icons.map((n) => `“${n}”`).join(', ');
    return `${names} by ${c.author} (${LICENSE_NAMES[c.license] || c.license})`;
  });
  const bio = credits.some((c) => /bioicons/i.test(c.pack));
  return `Illustration created with ForThePlot. Icons: ${parts.join('; ')}${bio ? ', via Bioicons (bioicons.com)' : ''}.`;
}

export function contentBounds(doc, { notes = false } = {}) {
  return union(doc.elements.filter((e) => !e.hidden && (notes || e.type !== 'note')).map((e) => visualBounds(e, doc)));
}

/**
 * Render a full figure to an SVG string.
 * opts: { ids=true, background=true, crop: 'canvas'|'content'|{x,y,w,h}, padding=0, hit=false, uidPrefix }
 */
export function renderSVG(doc, opts = {}) {
  const { background = true, padding = 0 } = opts;
  let vb = { x: 0, y: 0, w: doc.canvas.width, h: doc.canvas.height };
  if (opts.crop === 'content') vb = contentBounds(doc, { notes: opts.notes });
  else if (opts.crop && typeof opts.crop === 'object') vb = opts.crop;
  vb = { x: vb.x - padding, y: vb.y - padding, w: vb.w + padding * 2, h: vb.h + padding * 2 };
  const parts = [];
  const sizeW = opts.size?.width ?? f(vb.w), sizeH = opts.size?.height ?? f(vb.h);
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${sizeW}" height="${sizeH}" viewBox="${f(vb.x)} ${f(vb.y)} ${f(vb.w)} ${f(vb.h)}">`);
  parts.push(`<title>${escapeXml(doc.title || 'Figure')}</title>`);
  const credits = figureCredits(doc);
  const desc = ['Made with ForThePlot (open-source scientific illustration).'];
  for (const c of credits) desc.push(`Icons by ${c.author} (${c.license}${c.source ? ', ' + c.source : ''}): ${c.icons.join(', ')}.`);
  parts.push(`<desc>${escapeXml(desc.join(' '))}</desc>`);
  if (background && doc.canvas.background && doc.canvas.background !== 'none') {
    parts.push(`<rect x="${f(vb.x)}" y="${f(vb.y)}" width="${f(vb.w)}" height="${f(vb.h)}" fill="${doc.canvas.background}"/>`);
  }
  for (const el of doc.elements) parts.push(renderElement(el, doc, opts));
  parts.push('</svg>');
  return parts.join('');
}
