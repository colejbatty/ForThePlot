// Publication sizing: physical widths, text-size checks, and credit lines.
// Presets are taken from the journals' own author guidelines (see `source`).
// Check your target journal's current guide before submitting.

import { layoutText, SUP_SCALE, parseRich } from './text.js';
import { panelStyle, panelSizes, panelLetters } from './panels.js';

export const JOURNAL_PRESETS = [
  { id: 'nature-1col', name: 'Nature: single column (89 mm)', widthMm: 89, minPt: 5, maxPt: 7, dpi: 300, formats: 'PDF, EPS, AI or PowerPoint; images ≥300 dpi', source: 'Nature final artwork guide' },
  { id: 'nature-1.5col', name: 'Nature: 1.5 column (120 mm)', widthMm: 120, minPt: 5, maxPt: 7, dpi: 300, formats: 'PDF, EPS, AI or PowerPoint; images ≥300 dpi', source: 'Nature final artwork guide' },
  { id: 'nature-1.5col-wide', name: 'Nature: 1.5 column wide (136 mm)', widthMm: 136, minPt: 5, maxPt: 7, dpi: 300, formats: 'PDF, EPS, AI or PowerPoint; images ≥300 dpi', source: 'Nature final artwork guide' },
  { id: 'nature-2col', name: 'Nature: double column (183 mm)', widthMm: 183, minPt: 5, maxPt: 7, dpi: 300, formats: 'PDF, EPS, AI or PowerPoint; images ≥300 dpi', source: 'Nature final artwork guide' },
  { id: 'jci-min', name: 'JCI: narrowest (9 cm)', widthMm: 90, minPt: 6, maxPt: 8, dpi: 600, formats: 'TIFF preferred; PDF, EPS, AI, PowerPoint accepted; 600 ppi', source: 'JCI figure guidelines' },
  { id: 'jci-max', name: 'JCI: full width (18 cm)', widthMm: 180, minPt: 6, maxPt: 8, dpi: 600, formats: 'TIFF preferred; PDF, EPS, AI, PowerPoint accepted; 600 ppi', source: 'JCI figure guidelines' },
  { id: 'slide-16x9', name: 'Slide, 16:9 (13.33 in)', widthMm: 338.7, minPt: 12, maxPt: 0, dpi: 150, formats: 'PNG or PowerPoint', source: 'PowerPoint widescreen' },
];

export function presetById(id) {
  return JOURNAL_PRESETS.find((p) => p.id === id) || null;
}

export const MM_PER_IN = 25.4;
export const PT_PER_IN = 72;

/** Output size for a physical width (mm) at a given dpi. */
export function exportSize(doc, widthMm, dpi) {
  const heightMm = widthMm * (doc.canvas.height / doc.canvas.width);
  return {
    widthMm, heightMm, dpi,
    widthPx: Math.round((widthMm / MM_PER_IN) * dpi),
    heightPx: Math.round((heightMm / MM_PER_IN) * dpi),
    widthPt: (widthMm / MM_PER_IN) * PT_PER_IN,
    heightPt: (heightMm / MM_PER_IN) * PT_PER_IN,
    scale: ((widthMm / MM_PER_IN) * dpi) / doc.canvas.width,
  };
}

/** Every piece of text in the figure with its effective size in figure px. */
export function textItems(doc) {
  const out = [];
  const st = panelStyle(doc);
  const letters = panelLetters(doc);
  const push = (el, text, px, role = null) => {
    if (!text || !String(text).trim()) return;
    const runs = parseRich(text).filter((r) => !r.br && r.text.trim());
    const hasMain = runs.some((r) => !r.script);
    const smallest = runs.some((r) => r.script) ? px * SUP_SCALE : px;
    out.push({ id: el.id, text: String(text), px: hasMain ? px : smallest, scriptPx: smallest, ...(role ? { role } : {}) });
  };
  for (const el of doc.elements) {
    if (el.hidden || el.type === 'note') continue;
    if (el.type === 'text') push(el, el.text, el.fontSize);
    if (el.type === 'shape' && el.text && el.shape !== 'plot') push(el, el.text, el.fontSize);
    if (el.type === 'shape' && el.shape === 'plot') {
      const fs = el.plot?.fontSize || Math.max(9, Math.min(14, el.h * 0.075));
      push(el, `${el.plot?.xLabel || ''} ${el.plot?.yLabel || ''} ${el.plot?.gateLabel || ''}`, fs * 0.95);
    }
    if ((el.type === 'icon' || el.type === 'shape') && el.label?.text && el.label.position !== 'none') push(el, el.label.text, el.label.fontSize);
    if (el.type === 'arrow' && el.label) push(el, el.label, el.labelSize);
    if (el.type === 'image' && el.label?.text && el.label.position !== 'none') push(el, el.label.text, el.label.fontSize);
    if (el.type === 'image' && el.scaleBar?.label && el.scaleBar.perPx > 0) {
      const fs = el.scaleBar.fontSize ?? Math.max(9, Math.min(28, el.h * 0.055));
      push(el, `${el.scaleBar.length} ${el.scaleBar.unit}`, fs);
    }
    if (el.type === 'panel') {
      const sz = panelSizes(el, doc, st);
      if (el.title) push(el, el.title, sz.title, 'title');
      if (letters.get(el.id)) push(el, letters.get(el.id), sz.letter, 'letter');
    }
  }
  return out;
}

/**
 * Check text sizes at a physical width. Returns { ptPerPx, minPt, items, issues, summary }.
 * Superscripts and subscripts are reported separately since journals usually
 * apply the minimum to body text.
 */
export function journalCheck(doc, { widthMm, minPt = 5, maxPt = 0 } = {}) {
  const ptPerPx = ((widthMm / MM_PER_IN) * PT_PER_IN) / doc.canvas.width;
  const items = textItems(doc).map((t) => ({ ...t, pt: t.px * ptPerPx, scriptPt: t.scriptPx * ptPerPx }));
  const issues = [];
  const small = items.filter((t) => t.pt < minPt - 0.05);
  if (small.length) {
    const needPx = Math.ceil(minPt / ptPerPx);
    issues.push({
      level: 'warning', ids: small.map((t) => t.id),
      message: `${small.length} text item(s) would print below ${minPt} pt (smallest ${round(Math.min(...small.map((t) => t.pt)))} pt). At ${widthMm} mm wide, text needs to be at least ${needPx} px on the canvas, or export at a wider size.`,
    });
  }
  if (maxPt) {
    const big = items.filter((t) => t.pt > maxPt + 2 && t.role !== 'letter' && !/^\*\*[A-Za-z]\*\*$/.test(t.text.trim()));
    if (big.length) issues.push({ level: 'info', ids: big.map((t) => t.id), message: `${big.length} text item(s) are larger than ${maxPt} pt; fine for titles and panel letters, but body text is usually ${minPt}–${maxPt} pt.` });
  }
  const minAll = items.length ? Math.min(...items.map((t) => t.pt)) : 0;
  return {
    ptPerPx, items, issues,
    minPt: round(minAll),
    summary: items.length ? `Smallest text ${round(minAll)} pt, largest ${round(Math.max(...items.map((t) => t.pt)))} pt at ${widthMm} mm wide.` : 'No text in the figure.',
  };
}

function round(v) {
  return Math.round(v * 10) / 10;
}

/** Minimum canvas font size (px) needed to reach `minPt` at a given width. */
export function minFontPx(doc, widthMm, minPt) {
  return Math.ceil(minPt / (((widthMm / MM_PER_IN) * PT_PER_IN) / doc.canvas.width));
}

export { layoutText };
