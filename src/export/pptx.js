// PowerPoint export with native, editable objects where PowerPoint has them:
// text boxes (with bold/italic/super/subscript runs), shapes with text, and arrows
// with real arrowheads. Icons, membranes and plots become positioned images.
// Works in the browser and in Node: pass the PptxGenJS class and a rasterizer.

import { renderElement, arrowLabelBox, panelHeader, scaleBarBox } from '../core/render.js';
import { elementBox, labelBox, arrowGeometry, headSize, pathPad } from '../core/geometry.js';
import { pathNodes } from '../core/path.js';
import { getImage } from '../core/images.js';
import { panelLetters } from '../core/panels.js';
import { parseRich } from '../core/text.js';
import { normalizeColor, contrastText } from '../core/color.js';
import { isGradient, paintColor } from '../core/gradient.js';
import { DEFAULT_FONT } from '../core/model.js';

const HEADS = { arrow: 'triangle', open: 'arrow', circle: 'oval', diamond: 'diamond', none: 'none', inhibit: 'none' };
const DASH = { solid: 'solid', dashed: 'dash', dotted: 'sysDot' };
const hex = (c, d = '000000') => { const v = normalizeColor(c, '#' + d); return v === 'none' ? null : v.slice(1).toUpperCase(); };

function runs(src, base = {}) {
  const out = [];
  for (const r of parseRich(src)) {
    if (r.br) {
      if (out.length) out[out.length - 1].options.breakLine = true;
      else out.push({ text: '', options: { ...base, breakLine: true } });
      continue;
    }
    out.push({ text: r.text, options: { ...base, bold: r.bold || base.bold || false, italic: r.italic || base.italic || false, superscript: r.script === 'sup', subscript: r.script === 'sub' } });
  }
  return out.length ? out : [{ text: '', options: base }];
}

/**
 * Build a PptxGenJS presentation for a figure.
 * rasterize(svgString, widthPx, heightPx) → Promise<dataURL png>
 */
export async function buildPptx(doc, PptxGenJS, { rasterize, maxWidthIn = 13.333, notes = false } = {}) {
  const pptx = new PptxGenJS();
  const W = doc.canvas.width, H = doc.canvas.height;
  const k = Math.min(1, maxWidthIn / (W / 96));
  const inch = (px) => (px * k) / 96;
  const pt = (px) => px * 0.75 * k;
  pptx.defineLayout({ name: 'FORTHEPLOT', width: inch(W), height: inch(H) });
  pptx.layout = 'FORTHEPLOT';
  pptx.title = doc.title || 'Figure';
  pptx.company = 'Made with ForThePlot';
  const slide = pptx.addSlide();
  const bg = hex(doc.canvas.background, 'FFFFFF');
  if (bg) slide.background = { color: bg };
  const font = (doc.font || DEFAULT_FONT).split(',')[0].replace(/["']/g, '').trim() || 'Arial';

  const image = async (el, box, extra = {}) => {
    // render the element alone, unrotated, without its label
    const solo = { ...el, rotation: 0, label: null, opacity: 1 };
    const pad = el.type === 'shape' && el.shape === 'plot' ? 0 : 2;
    const vb = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
    const scale = Math.min(6, Math.max(2, 1800 / Math.max(vb.w, vb.h)));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${vb.w * scale}" height="${vb.h * scale}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${renderElement(solo, doc, { ids: false, uidPrefix: 'px' })}</svg>`;
    const data = await rasterize(svg, Math.round(vb.w * scale), Math.round(vb.h * scale));
    slide.addImage({ data, x: inch(vb.x), y: inch(vb.y), w: inch(vb.w), h: inch(vb.h), rotate: el.rotation || 0, transparency: el.opacity < 1 ? Math.round((1 - el.opacity) * 100) : 0, altText: el.icon || el.shape || '', ...extra });
  };

  const textBox = (src, box, o = {}) => {
    slide.addText(runs(src, { bold: !!o.bold, italic: !!o.italic }), {
      x: inch(box.x), y: inch(box.y), w: inch(Math.max(box.w * 1.06 + 4, 8)), h: inch(Math.max(box.h, 8)),
      fontFace: font, fontSize: pt(o.fontSize || 16), color: hex(o.color, '1F2933'), align: o.align || 'left', valign: 'top',
      margin: 0, wrap: !!o.wrap, rotate: o.rotate || 0, fit: 'none', paraSpaceBefore: 0, paraSpaceAfter: 0, lineSpacingMultiple: 1.0,
    });
  };

  const label = (el) => {
    const lb = labelBox(el);
    if (!lb) return;
    const l = el.label;
    const align = l.position === 'left' ? 'right' : l.position === 'right' ? 'left' : 'center';
    const w = lb.w * 1.08 + 6;
    const x = align === 'center' ? lb.x + lb.w / 2 - w / 2 : align === 'right' ? lb.x + lb.w - w : lb.x;
    textBox(l.text, { x, y: lb.y, w: w / 1.06, h: lb.h }, { fontSize: l.fontSize, color: l.color, bold: l.bold, align });
  };

  const letters = panelLetters(doc);
  for (const el of doc.elements) {
    if (el.hidden) continue;
    if (el.type === 'panel') {
      const fill = hex(el.fill), line = hex(el.stroke);
      if (isGradient(el.fill)) {
        // PowerPoint objects here can't take a gradient: draw the frame as a picture, letter and title as text
        await image({ ...el, title: '', letter: '' }, { x: el.x, y: el.y, w: el.w, h: el.h });
      } else if (fill || line) {
        slide.addShape(el.radius > 0 ? 'roundRect' : 'rect', {
          x: inch(el.x), y: inch(el.y), w: inch(el.w), h: inch(el.h),
          fill: fill ? { color: fill } : { color: 'FFFFFF', transparency: 100 },
          line: line ? { color: line, width: pt(el.strokeWidth), dashType: DASH[el.dash] || 'solid' } : { type: 'none' },
          rectRadius: el.radius > 0 ? Math.min(0.5, el.radius / Math.min(el.w, el.h)) : undefined,
        });
      }
      const hd = panelHeader(el, doc, letters);
      if (hd.letter) textBox(hd.letterText, { x: hd.lx, y: hd.ly, w: hd.lw, h: hd.size * 1.25 }, { fontSize: hd.size, color: hd.color });
      if (el.title) textBox(el.title, { x: hd.tx, y: hd.ty, w: Math.max(40, el.x + el.w - hd.tx - 10) / 1.06, h: hd.ts * 1.3 }, { fontSize: hd.ts, bold: hd.titleBold, color: hd.titleColor });
      continue;
    }
    if (el.type === 'image') {
      const img = getImage(el.image);
      if (!img) continue;
      if (el.crop || el.radius > 0 || el.rotation || !/^data:image\/(png|jpeg)/.test(img.src)) await image(el, elementBox(el, doc));
      else {
        slide.addImage({ data: img.src, x: inch(el.x), y: inch(el.y), w: inch(el.w), h: inch(el.h), altText: img.name || 'image', transparency: el.opacity < 1 ? Math.round((1 - el.opacity) * 100) : 0 });
        if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) slide.addShape('rect', { x: inch(el.x), y: inch(el.y), w: inch(el.w), h: inch(el.h), fill: { color: 'FFFFFF', transparency: 100 }, line: { color: hex(el.stroke), width: pt(el.strokeWidth) } });
        const sb = scaleBarBox(el, img);
        if (sb) {
          slide.addShape('rect', { x: inch(sb.x), y: inch(sb.y), w: inch(sb.w), h: inch(sb.h), fill: { color: hex(el.scaleBar.color, 'FFFFFF') }, line: { type: 'none' } });
          if (el.scaleBar.label) textBox(`**${sb.text}**`, { x: sb.x + sb.w / 2 - sb.w, y: sb.labelY, w: sb.w * 2 / 1.06, h: sb.fs * 1.3 }, { fontSize: sb.fs, color: el.scaleBar.color, align: 'center' });
        }
      }
      label(el);
      continue;
    }
    if (el.type === 'path') {
      const native = !el.membrane && !el.rotation && el.points.length >= 2 && !(el.closed && isGradient(el.fill)) && (el.stroke !== 'none' || (el.closed && el.fill !== 'none'));
      if (!native) { const p = pathPad(el); const b = elementBox(el, doc); await image(el, { x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p }); continue; }
      const nodes = pathNodes(el);
      const bx = el.x, by = el.y, bw = Math.max(1, el.w), bh = Math.max(1, el.h);
      const rel = (q) => ({ x: inch(q.x - bx), y: inch(q.y - by) });
      const pts = [{ ...rel(nodes[0]), moveTo: true }];
      const n = nodes.length;
      for (let i = 1; i < (el.closed ? n + 1 : n); i++) {
        const a = nodes[i - 1], b = nodes[i % n];
        if (!a.out && !b.in) pts.push(rel(b));
        else { const c1 = rel(a.out || a), c2 = rel(b.in || b); pts.push({ ...rel(b), curve: { type: 'cubic', x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y } }); }
      }
      if (el.closed) pts.push({ close: true });
      const fill = el.closed ? hex(el.fill) : null, line = hex(el.stroke);
      slide.addShape('custGeom', {
        x: inch(bx), y: inch(by), w: inch(bw), h: inch(bh), points: pts,
        fill: fill ? { color: fill } : { color: 'FFFFFF', transparency: 100 },
        line: line ? { color: line, width: pt(el.strokeWidth), dashType: DASH[el.dash] || 'solid', beginArrowType: el.closed ? 'none' : HEADS[el.tail] || 'none', endArrowType: el.closed ? 'none' : HEADS[el.head] || 'none' } : { type: 'none' },
      });
      continue;
    }
    if (el.type === 'note' && !notes) continue;
    if (el.type === 'note') { const b = elementBox(el, doc); textBox(el.text, b, { fontSize: 14, wrap: true }); continue; }
    if (el.type === 'icon') { await image(el, elementBox(el, doc)); label(el); continue; }
    if (el.type === 'text') {
      const b = elementBox(el, doc);
      if (el.background) slide.addShape('rect', { x: inch(b.x), y: inch(b.y), w: inch(b.w), h: inch(b.h), fill: { color: hex(el.background, 'FFFFFF') }, line: { type: 'none' } });
      textBox(el.text, b, { fontSize: el.fontSize, color: el.color, bold: el.bold, italic: el.italic, align: el.align, wrap: !!el.w, rotate: el.rotation });
      continue;
    }
    if (el.type === 'shape') {
      const native = { rect: el.radius > 0 ? 'roundRect' : 'rect', ellipse: 'ellipse', triangle: 'triangle', diamond: 'diamond', hexagon: 'hexagon' }[el.shape];
      if (!native) { await image(el, elementBox(el, doc)); label(el); continue; }
      if (isGradient(el.fill)) {
        // a picture of the gradient shape, with its text on top as an editable text box
        await image({ ...el, text: '' }, elementBox(el, doc));
        if (el.text) {
          slide.addText(runs(el.text, { bold: !!el.bold }), {
            x: inch(el.x), y: inch(el.y), w: inch(el.w), h: inch(el.h), rotate: el.rotation || 0, fontFace: font, fontSize: pt(el.fontSize),
            color: hex(el.textColor || contrastText(paintColor(el.fill, '#ffffff'))), align: 'center', valign: 'middle', margin: 2,
          });
        }
        label(el);
        continue;
      }
      const fill = hex(el.fill);
      const line = hex(el.stroke);
      const props = {
        shape: native, x: inch(el.x), y: inch(el.y), w: inch(el.w), h: inch(el.h), rotate: el.rotation || 0,
        fill: fill ? { color: fill, transparency: el.opacity < 1 ? Math.round((1 - el.opacity) * 100) : 0 } : { color: 'FFFFFF', transparency: 100 },
        line: line ? { color: line, width: pt(el.strokeWidth), dashType: DASH[el.dash] || 'solid' } : { type: 'none' },
        rectRadius: native === 'roundRect' ? Math.min(0.5, el.radius / Math.min(el.w, el.h)) : undefined,
      };
      if (el.text) {
        slide.addText(runs(el.text, { bold: !!el.bold }), { ...props, fontFace: font, fontSize: pt(el.fontSize), color: hex(el.textColor || '#1f2933'), align: 'center', valign: 'middle', margin: 2 });
      } else {
        slide.addShape(native, props);
      }
      label(el);
      continue;
    }
    if (el.type === 'arrow') {
      const g = arrowGeometry(el, doc);
      const lineProps = {
        color: hex(el.stroke, '52606D'), width: pt(el.width), dashType: DASH[el.dash] || 'solid',
        beginArrowType: HEADS[el.tail] || 'none', endArrowType: HEADS[el.head] || 'none',
      };
      const pts = el.routing === 'elbow' ? g.points : el.routing === 'curved' ? [g.start, g.ctrl, g.end] : [g.start, g.end];
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(1, Math.max(...xs) - bx), bh = Math.max(1, Math.max(...ys) - by);
      if (el.routing === 'straight' || !el.routing) {
        slide.addShape('line', { x: inch(bx), y: inch(by), w: inch(bw), h: inch(bh), flipH: g.end.x < g.start.x, flipV: g.end.y < g.start.y, line: lineProps });
      } else {
        const rel = (p) => ({ x: inch(p.x - bx), y: inch(p.y - by) });
        const points = el.routing === 'elbow'
          ? g.points.map((p, i) => ({ ...rel(p), ...(i === 0 ? { moveTo: true } : {}) }))
          : [{ ...rel(g.start), moveTo: true }, { ...rel(g.end), curve: { type: 'quadratic', x1: rel(g.ctrl).x, y1: rel(g.ctrl).y } }];
        slide.addShape('custGeom', { x: inch(bx), y: inch(by), w: inch(bw), h: inch(bh), points, line: lineProps, fill: { color: 'FFFFFF', transparency: 100 } });
      }
      for (const [kind, tip, dir] of [[el.head, g.end, g.endDir], [el.tail, g.start, { x: -g.startDir.x, y: -g.startDir.y }]]) {
        if (kind !== 'inhibit') continue;
        const half = headSize(el.width) * 0.95 * 0.75;
        const a = { x: tip.x - dir.y * half, y: tip.y + dir.x * half }, b = { x: tip.x + dir.y * half, y: tip.y - dir.x * half };
        slide.addShape('line', {
          x: inch(Math.min(a.x, b.x)), y: inch(Math.min(a.y, b.y)), w: inch(Math.max(0.5, Math.abs(b.x - a.x))), h: inch(Math.max(0.5, Math.abs(b.y - a.y))),
          flipH: (b.x < a.x) !== (b.y < a.y), line: { color: lineProps.color, width: pt(el.width * 1.4) },
        });
      }
      if (el.label) {
        const lb = arrowLabelBox(el, doc, g);
        const w = lb.w * 1.08 + 6;
        textBox(el.label, { x: lb.x + lb.w / 2 - w / 2, y: lb.y, w: w / 1.06, h: lb.h }, { fontSize: el.labelSize, color: el.labelColor || el.stroke, align: 'center' });
      }
    }
  }
  return pptx;
}
