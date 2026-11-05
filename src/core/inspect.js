// Figure inspection for agents and people: a compact text description and a
// layout "lint" that flags common problems (overlaps, off-canvas, tiny text).

import { getIcon } from '../icons/registry.js';
import { visualBounds, elementBox, overlapArea, arrowGeometry } from './geometry.js';
import { plainText } from './text.js';
import { validateFigure } from './model.js';
import { getImage } from './images.js';
import { panelLetters, panelContents } from './panels.js';
import { textSizeSummary } from './textsize.js';
import { paintText } from './gradient.js';

function r(n) {
  return Math.round(n);
}

function endName(p) {
  if (!p) return '?';
  return p.id != null ? p.id + (p.anchor && p.anchor !== 'auto' ? `:${p.anchor}` : '') : `(${r(p.x)},${r(p.y)})`;
}

/** One line per element, in z-order (back to front). */
export function describeFigure(doc, { verbose = false } = {}) {
  const lines = [];
  lines.push(`Figure "${doc.title}" — canvas ${doc.canvas.width}×${doc.canvas.height}${doc.canvas.printWidth ? ` (printed ${doc.canvas.printWidth} mm wide)` : ''}, background ${doc.canvas.background}, ${doc.elements.length} element(s)`);
  const sizes = textSizeSummary(doc);
  if (sizes) lines.push(`Text sizes: ${sizes}`);
  for (const el of doc.elements) {
    if (el.type === 'note') continue;
    let s = `- ${el.id}: `;
    if (el.type === 'icon') {
      const def = getIcon(el.icon);
      s += `icon ${el.icon}${def ? ` (${def.name})` : ' (UNKNOWN)'} at (${r(el.x)},${r(el.y)}) size ${r(el.w)}×${r(el.h)}`;
      if (el.label?.text) s += ` label "${plainText(el.label.text)}"${el.label.position !== 'bottom' ? ` [${el.label.position}]` : ''}`;
      const cols = Object.entries(el.colors || {}).filter(([, v]) => v);
      if (cols.length) s += ` colors ${cols.map(([k, v]) => `${k}=${v}`).join(' ')}`;
    } else if (el.type === 'shape') {
      s += `shape ${el.shape} at (${r(el.x)},${r(el.y)}) size ${r(el.w)}×${r(el.h)} fill ${paintText(el.fill)}`;
      if (el.inner && el.inner !== 'none') s += ` inside ${paintText(el.inner)}`;
      if (el.text) s += ` text "${plainText(el.text)}"`;
      if (el.label?.text) s += ` label "${plainText(el.label.text)}"`;
    } else if (el.type === 'text') {
      const b = elementBox(el, doc);
      s += `text "${plainText(el.text).replace(/\n/g, ' / ')}" at (${r(el.x)},${r(el.y)}) size ${r(b.w)}×${r(b.h)} ${el.fontSize}px${el.bold ? ' bold' : ''}`;
    } else if (el.type === 'path') {
      s += `${el.membrane ? 'membrane path' : 'path'} (${el.points.length} points${el.closed ? ', closed' : ''}${el.smooth ? ', smooth' : ''}) at (${r(el.x)},${r(el.y)}) size ${r(el.w)}×${r(el.h)}`;
      if (!el.membrane) s += ` stroke ${el.stroke}${el.closed && el.fill !== 'none' ? ` fill ${paintText(el.fill)}` : ''}${el.head !== 'none' ? ` head ${el.head}` : ''}`;
      else if (el.closed && el.inner && el.inner !== 'none') s += ` inside ${paintText(el.inner)}`;
    } else if (el.type === 'image') {
      const img = getImage(el.image);
      s += `image${img?.name ? ` "${img.name}"` : ''} (${img ? `${img.w}×${img.h} px` : 'MISSING DATA'}${el.crop ? ', cropped' : ''}) at (${r(el.x)},${r(el.y)}) size ${r(el.w)}×${r(el.h)}`;
      if (el.scaleBar) s += ` scale bar ${el.scaleBar.length} ${el.scaleBar.unit}${el.scaleBar.perPx ? '' : ' (needs perPx)'}`;
      if (el.link) {
        const base = (q) => String(q || '').split(/[\\/]/).pop();
        s += ` LINKED to ${el.link.prism ? `${base(el.link.prism)} ${el.link.layout ? 'layout' : 'graph'} ${el.link.graph || 1}${el.link.title ? ` "${el.link.title}"` : ''}` : base(el.link.picture)}`;
      }
      if (el.label?.text) s += ` label "${plainText(el.label.text)}"`;
    } else if (el.type === 'panel') {
      const letters = panelLetters(doc);
      const kids = panelContents(doc, el);
      const own = [el.letterSize ? `letter ${el.letterSize}px` : '', el.titleSize ? `title ${el.titleSize}px` : ''].filter(Boolean).join(', ');
      s += `panel ${letters.get(el.id) || '(no letter)'}${el.title ? ` "${plainText(el.title)}"` : ''}${own ? ` (own sizes: ${own})` : ''} at (${r(el.x)},${r(el.y)}) size ${r(el.w)}×${r(el.h)}${kids.length ? ` contains ${kids.join(', ')}` : ' (empty)'}`;
    } else if (el.type === 'arrow') {
      s += `arrow ${endName(el.from)} → ${endName(el.to)} [${el.head}${el.tail !== 'none' ? ', tail ' + el.tail : ''}, ${el.routing}${el.dash !== 'solid' ? ', ' + el.dash : ''}]`;
      if (el.label) s += ` "${plainText(el.label)}"`;
    }
    if (el.rotation) s += ` rot ${r(el.rotation)}°`;
    if (el.group) s += ` group ${el.group}`;
    if (el.attachedTo) s += ` attached to ${el.attachedTo}`;
    if (el.hidden) s += ' (hidden)';
    if (el.locked) s += ' (locked)';
    lines.push(s);
    if (verbose) lines.push('    ' + JSON.stringify(el));
  }
  const notes = doc.elements.filter((e) => e.type === 'note');
  if (notes.length) {
    lines.push('', `Notes (${notes.filter((x) => !x.resolved).length} open):`);
    for (const nn of notes) {
      lines.push(`- ${nn.id} [${nn.author === 'claude' ? 'from Claude' : 'from the person'}${nn.resolved ? ', resolved' : ''}]${nn.target ? ` on ${nn.target}` : ''}: "${plainText(nn.text)}"`);
    }
  }
  return lines.join('\n');
}

/**
 * Layout checks. Returns [{ level, id?, ids?, message }].
 * Includes validation errors, so this is the one call agents need after editing.
 */
export function lintFigure(doc) {
  const issues = validateFigure(doc);
  if (issues.some((i) => i.level === 'error')) return issues;
  const W = doc.canvas.width, H = doc.canvas.height;
  const vis = doc.elements.filter((e) => !e.hidden && e.type !== 'note');
  const boxes = new Map(vis.map((e) => [e.id, visualBounds(e, doc)]));
  for (const el of vis) {
    const b = boxes.get(el.id);
    if (b.x < -1 || b.y < -1 || b.x + b.w > W + 1 || b.y + b.h > H + 1) {
      issues.push({ level: 'warning', id: el.id, message: `"${el.id}" extends outside the canvas (bounds ${r(b.x)},${r(b.y)} → ${r(b.x + b.w)},${r(b.y + b.h)}; canvas ${W}×${H}). Move it or use the "fit" op.` });
    }
    if (el.type === 'text' && el.fontSize < 9) issues.push({ level: 'warning', id: el.id, message: `Text "${el.id}" is very small (${el.fontSize}px)` });
    if (el.type === 'text' && !plainText(el.text).trim()) issues.push({ level: 'warning', id: el.id, message: `Text "${el.id}" is empty` });
    if (el.type === 'arrow') {
      const g = arrowGeometry(el, doc);
      if (Math.hypot(g.end.x - g.start.x, g.end.y - g.start.y) < 12) issues.push({ level: 'warning', id: el.id, message: `Arrow "${el.id}" is very short — its ends may overlap` });
    }
  }
  // Overlaps between solid things (icons, text, shapes that aren't containers)
  const solid = vis.filter((e) => e.type === 'icon' || e.type === 'text');
  // attached receptors overlapping each other on a membrane are expected too
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i], b = solid[j];
      if (a.group && a.group === b.group) continue;
      if (a.attachedTo === b.id || b.attachedTo === a.id || (a.attachedTo && a.attachedTo === b.attachedTo)) continue;
      const A = boxes.get(a.id), B = boxes.get(b.id);
      const ov = overlapArea(A, B);
      const small = Math.min(A.w * A.h, B.w * B.h) || 1;
      if (ov / small > 0.25) {
        issues.push({ level: 'warning', ids: [a.id, b.id], message: `"${a.id}" and "${b.id}" overlap by ${Math.round((100 * ov) / small)}% (fine if intentional, e.g. a receptor on a cell)` });
      }
    }
  }
  return issues;
}

export function formatIssues(issues) {
  if (!issues.length) return 'No problems found.';
  return issues.map((i) => `${i.level === 'error' ? 'ERROR' : 'warn '} ${i.message}`).join('\n');
}
