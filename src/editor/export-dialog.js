// "Export for publication" dialog: physical size presets, text-size check,
// PDF / TIFF / PNG / SVG / PowerPoint, and the credit line for the legend.

import { S, select, commit } from './state.js';
import { h, button, toast } from './ui.js';
import { saveFile, server, flushPush, baseName, copyText } from './io.js';
import { renderSVG, creditLine, figureCredits, normalizeElement, newId } from '../core/index.js';
import { JOURNAL_PRESETS, presetById, exportSize, journalCheck, minFontPx } from '../core/journal.js';
import { encodeTiff, pngWithDpi, rgbaToRgb, rasterPdf } from '../core/raster.js';
import { buildPptx } from '../export/pptx.js';

const st = { preset: 'nature-2col', customMm: 183, dpi: 300 };
let dlg, info, creditBox, presetSel, mmInput, dpiSel, pdfBtn;

function current() {
  const p = st.preset === 'custom' ? null : presetById(st.preset);
  const widthMm = p ? p.widthMm : Number(st.customMm) || 183;
  return { p, widthMm, dpi: Number(st.dpi) || 300, minPt: p?.minPt ?? 6, maxPt: p?.maxPt ?? 0 };
}

function refresh() {
  if (!dlg) return;
  const c = current();
  mmInput.disabled = st.preset !== 'custom';
  mmInput.value = String(c.widthMm);
  const size = exportSize(S.doc, c.widthMm, c.dpi);
  const check = journalCheck(S.doc, { widthMm: c.widthMm, minPt: c.minPt, maxPt: c.maxPt });
  info.innerHTML = '';
  info.append(
    h('p', {}, h('strong', {}, `${size.widthMm.toFixed(0)} × ${size.heightMm.toFixed(0)} mm`), `  ·  TIFF/PNG ${size.widthPx.toLocaleString()} × ${size.heightPx.toLocaleString()} px at ${c.dpi} dpi`),
    h('p', { class: check.issues.some((i) => i.level === 'warning') ? 'warn' : 'ok' }, check.summary),
  );
  for (const i of check.issues) {
    const li = h('p', { class: i.level === 'warning' ? 'warn' : 'muted' }, i.message);
    if (i.ids?.length) {
      const fix = button('Select them', { cls: 'small', onClick: () => { dlg.close(); select(i.ids, { groups: false }); } });
      li.append(' ', fix);
      if (i.level === 'warning') {
        const need = minFontPx(S.doc, c.widthMm, c.minPt);
        li.append(' ', button(`Enlarge to ${need} px`, { cls: 'small', onClick: () => { enlargeText(i.ids, need); refresh(); } }));
      }
    }
    info.append(li);
  }
  if (c.p) info.append(h('p', { class: 'muted' }, `${c.p.formats}. Source: ${c.p.source}; check the journal's current guide before submitting.`));
  creditBox.value = creditLine(S.doc);
  pdfBtn.querySelector('span').textContent = server.enabled ? 'PDF (vector)' : 'PDF (600 dpi image)';
}

function enlargeText(ids, px) {
  const set = new Set(ids);
  for (const el of S.doc.elements) {
    if (!set.has(el.id)) continue;
    if (el.type === 'text' && el.fontSize < px) el.fontSize = px;
    if (el.type === 'shape' && el.text && el.fontSize < px) el.fontSize = px;
    if (el.type === 'shape' && el.shape === 'plot') el.plot = { ...el.plot, fontSize: Math.max(px / 0.95, el.plot?.fontSize || 0) };
    if (el.label?.text && el.label.fontSize < px) el.label = { ...el.label, fontSize: px };
    if (el.type === 'arrow' && el.label && el.labelSize < px) el.labelSize = px;
  }
  commit();
}

function svgFor(c) {
  const size = exportSize(S.doc, c.widthMm, c.dpi);
  return renderSVG(S.doc, { ids: false, size: { width: `${size.widthMm.toFixed(2)}mm`, height: `${size.heightMm.toFixed(2)}mm` } });
}

function rasterize(widthPx, heightPx) {
  return new Promise((resolve, reject) => {
    if (widthPx * heightPx > 60e6) { reject(new Error('That size is too large to render in the browser. Lower the dpi, or export PDF/SVG.')); return; }
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = widthPx; cv.height = heightPx;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, widthPx, heightPx);
      resolve(cv);
    };
    img.onerror = () => reject(new Error('Could not render the figure'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(renderSVG(S.doc, { ids: false }));
  });
}

async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function serverExport(format, c) {
  await flushPush();
  const q = new URLSearchParams({ format, widthMm: String(c.widthMm), dpi: String(c.dpi) });
  const res = await fetch(`/api/export?${q}`);
  if (!res.ok) throw new Error(await res.text());
  return new Uint8Array(await res.arrayBuffer());
}

async function run(format) {
  const c = current();
  const size = exportSize(S.doc, c.widthMm, c.dpi);
  const name = `${baseName()}-${Math.round(c.widthMm)}mm`;
  toast(`Exporting ${format.toUpperCase()}…`);
  try {
    if (format === 'svg') return await saveFile(`${name}.svg`, svgFor(c), 'image/svg+xml');
    if (format === 'png') {
      const cv = await rasterize(size.widthPx, size.heightPx);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      const png = pngWithDpi(new Uint8Array(await blob.arrayBuffer()), c.dpi);
      return await saveFile(`${name}-${c.dpi}dpi.png`, new Blob([png], { type: 'image/png' }), 'image/png');
    }
    if (format === 'tiff') {
      let bytes;
      if (server.enabled) bytes = await serverExport('tiff', c);
      else {
        const cv = await rasterize(size.widthPx, size.heightPx);
        const data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        bytes = encodeTiff(data, cv.width, cv.height, c.dpi);
      }
      if (window.claude) {
        // this viewer only saves certain file types; .zip is one of them
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        zip.file(`${name}-${c.dpi}dpi.tif`, bytes);
        await saveFile(`${name}-${c.dpi}dpi-tiff.zip`, await zip.generateAsync({ type: 'blob' }), 'application/zip');
        return;
      }
      return await saveFile(`${name}-${c.dpi}dpi.tif`, new Blob([bytes], { type: 'image/tiff' }), 'image/tiff');
    }
    if (format === 'pdf') {
      if (server.enabled) return await saveFile(`${name}.pdf`, new Blob([await serverExport('pdf', c)], { type: 'application/pdf' }), 'application/pdf');
      const dpi = Math.min(600, Math.max(300, c.dpi));
      const s2 = exportSize(S.doc, c.widthMm, dpi);
      const cv = await rasterize(s2.widthPx, s2.heightPx);
      const rgb = rgbaToRgb(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data);
      const pdf = rasterPdf({ deflatedRgb: await deflate(rgb), width: cv.width, height: cv.height, widthPt: s2.widthPt, heightPt: s2.heightPt, title: S.doc.title });
      return await saveFile(`${name}.pdf`, new Blob([pdf], { type: 'application/pdf' }), 'application/pdf');
    }
    if (format === 'pptx') {
      if (server.enabled) return await saveFile(`${baseName()}.pptx`, new Blob([await serverExport('pptx', c)]), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      const { default: PptxGenJS } = await import('pptxgenjs');
      const pptx = await buildPptx(S.doc, PptxGenJS, {
        rasterize: (svg, w, hh) => new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = hh;
            cv.getContext('2d').drawImage(img, 0, 0, w, hh);
            resolve(cv.toDataURL('image/png'));
          };
          img.onerror = reject;
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }),
      });
      return await saveFile(`${baseName()}.pptx`, await pptx.write({ outputType: 'blob' }), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    }
  } catch (err) {
    toast(`Export failed: ${err.message}`, 'error');
  }
}

function addCreditToFigure() {
  const c = current();
  const fs = Math.max(minFontPx(S.doc, c.widthMm, c.minPt), 11);
  const id = newId(S.doc, 'credit');
  S.doc.elements.push({ ...normalizeElement({ type: 'text', text: creditLine(S.doc), x: 20, y: S.doc.canvas.height - fs * 2.2, fontSize: fs, color: '#7b8794', w: S.doc.canvas.width - 40 }), id });
  commit();
  select(id);
  toast('Added the credit line at the bottom of the figure');
}

export function openExportDialog() {
  if (!dlg) {
    presetSel = h('select', { id: 'exp-preset' },
      ...JOURNAL_PRESETS.map((p) => h('option', { value: p.id }, p.name)),
      h('option', { value: 'custom' }, 'Custom width…'));
    presetSel.addEventListener('change', () => { st.preset = presetSel.value; refresh(); });
    mmInput = h('input', { type: 'number', id: 'exp-mm', min: 20, max: 1000, step: 1, class: 'num' });
    mmInput.addEventListener('input', () => { st.customMm = Number(mmInput.value); refresh(); });
    mmInput.addEventListener('keydown', (e) => e.stopPropagation());
    dpiSel = h('select', { id: 'exp-dpi' }, ...[300, 600, 1200].map((d) => h('option', { value: d }, `${d} dpi${d === 300 ? ' (photos)' : d === 600 ? ' (combination)' : ' (line art)'}`)));
    dpiSel.addEventListener('change', () => { st.dpi = Number(dpiSel.value); refresh(); });
    info = h('div', { class: 'exp-info' });
    creditBox = h('textarea', { id: 'exp-credit', rows: 3, readonly: true });
    pdfBtn = button('PDF', { cls: 'primary', onClick: () => run('pdf') });
    dlg = h('dialog', { id: 'export-dialog', class: 'dialog' },
      h('h2', {}, 'Export for publication'),
      h('div', { class: 'exp-grid' },
        h('label', { for: 'exp-preset' }, 'Size'), h('div', { class: 'exp-row' }, presetSel, mmInput, h('span', { class: 'muted' }, 'mm')),
        h('label', { for: 'exp-dpi' }, 'Resolution'), h('div', { class: 'exp-row' }, dpiSel),
      ),
      info,
      h('div', { class: 'exp-buttons' },
        pdfBtn,
        button('TIFF', { cls: 'small', onClick: () => run('tiff') }),
        button('PNG', { cls: 'small', onClick: () => run('png') }),
        button('SVG', { cls: 'small', onClick: () => run('svg') }),
        button('PowerPoint', { cls: 'small', onClick: () => run('pptx') }),
      ),
      h('h3', {}, 'Credit line for the legend'),
      creditBox,
      h('div', { class: 'dialog-actions' },
        button('Copy credit line', { cls: 'small', onClick: () => copyText(creditBox.value, 'credit line') }),
        button('Add to figure', { cls: 'small', onClick: addCreditToFigure }),
        h('span', { class: 'spacer' }),
        button('Close', { onClick: () => dlg.close() }),
      ),
    );
    document.body.append(dlg);
  }
  // start from the figure's printed width when it has one
  const pw = Number(S.doc.canvas.printWidth);
  if (pw > 0 && Math.abs(current().widthMm - pw) > 0.05) {
    const p = JOURNAL_PRESETS.find((q) => Math.abs(q.widthMm - pw) < 0.05);
    st.preset = p ? p.id : 'custom';
    if (!p) st.customMm = pw;
  }
  presetSel.value = st.preset;
  dpiSel.value = String(st.dpi);
  refresh();
  dlg.showModal();
}

export { figureCredits };
