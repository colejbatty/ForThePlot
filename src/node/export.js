// Node-side figure export used by the CLI, the MCP server and `fortheplot serve`.
import { renderSVG, figureCredits, creditLine, embedUsedIcons, embedUsedImages, clone } from '../core/index.js';
import { exportSize, journalCheck, presetById } from '../core/journal.js';
import { pngWithDpi, encodeTiff } from '../core/raster.js';
import { svgToPng, svgToRgba } from './png.js';

export const FORMATS = ['svg', 'png', 'tiff', 'pdf', 'pptx', 'json'];

export function formatFromPath(p) {
  const ext = String(p).toLowerCase().split('.').pop();
  return ext === 'tif' ? 'tiff' : ext;
}

/**
 * Export a figure. opts: { format, journal (preset id), widthMm, dpi, scale, crop, notes }
 * Returns { data, ext, mime, size, check, credit }.
 */
export async function exportFigure(doc, opts = {}) {
  const format = opts.format === 'tif' ? 'tiff' : opts.format || 'svg';
  if (!FORMATS.includes(format)) throw new Error(`Unknown format "${format}". Use ${FORMATS.join(', ')}.`);
  const preset = opts.journal ? presetById(opts.journal) : null;
  if (opts.journal && !preset) throw new Error(`Unknown journal preset "${opts.journal}".`);
  const widthMm = Number(opts.widthMm) || preset?.widthMm || Number(doc.canvas.printWidth) || null;
  const dpi = Number(opts.dpi) || preset?.dpi || 300;
  const crop = opts.crop === 'content' ? 'content' : 'canvas';
  const base = renderSVG(doc, { ids: false, crop, padding: crop === 'content' ? 20 : 0, notes: !!opts.notes });
  const size = widthMm ? exportSize(doc, widthMm, dpi) : null;
  const check = widthMm ? journalCheck(doc, { widthMm, minPt: preset?.minPt ?? 6, maxPt: preset?.maxPt ?? 0 }) : null;
  const credit = creditLine(doc);
  const out = { ext: format, size, check, credit, credits: figureCredits(doc) };
  const scale = Number(opts.scale) || 2;
  switch (format) {
    case 'svg': {
      const svg = size ? renderSVG(doc, { ids: false, crop, padding: crop === 'content' ? 20 : 0, size: { width: `${size.widthMm.toFixed(2)}mm`, height: `${size.heightMm.toFixed(2)}mm` } }) : base;
      return { ...out, data: Buffer.from(svg), mime: 'image/svg+xml' };
    }
    case 'png': {
      const png = await svgToPng(base, size ? { width: size.widthPx } : { scale });
      return { ...out, data: Buffer.from(pngWithDpi(png, size ? dpi : 96 * scale)), mime: 'image/png' };
    }
    case 'tiff': {
      const r = await svgToRgba(base, size ? { width: size.widthPx } : { scale });
      return { ...out, data: Buffer.from(encodeTiff(r.pixels, r.width, r.height, size ? dpi : Math.round(96 * scale))), mime: 'image/tiff' };
    }
    case 'pdf': {
      const { svgToPdf } = await import('./pdf.js');
      const widthPt = size ? size.widthPt : doc.canvas.width * 0.75;
      const heightPt = size ? size.heightPt : doc.canvas.height * 0.75;
      return { ...out, data: await svgToPdf(base, { widthPt, heightPt, title: doc.title }), mime: 'application/pdf' };
    }
    case 'pptx': {
      const { buildPptx } = await import('../export/pptx.js');
      const { default: PptxGenJS } = await import('pptxgenjs');
      const pptx = await buildPptx(doc, PptxGenJS, {
        notes: !!opts.notes,
        rasterize: async (svg) => 'data:image/png;base64,' + Buffer.from(await svgToPng(svg)).toString('base64'),
      });
      return { ...out, data: Buffer.from(await pptx.write({ outputType: 'nodebuffer' })), mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
    }
    case 'json':
      return { ...out, data: Buffer.from(JSON.stringify(embedUsedImages(embedUsedIcons(clone(doc))), null, 2) + '\n'), mime: 'application/json' };
    default:
      throw new Error('unreachable');
  }
}

export function describeExport(r) {
  const lines = [];
  if (r.size) lines.push(`Size: ${r.size.widthMm.toFixed(0)} × ${r.size.heightMm.toFixed(0)} mm${['png', 'tiff'].includes(r.ext) ? `, ${r.size.widthPx} × ${r.size.heightPx} px at ${r.size.dpi} dpi` : ''}.`);
  if (r.check) {
    lines.push(r.check.summary);
    for (const i of r.check.issues) lines.push(`${i.level === 'warning' ? 'Warning' : 'Note'}: ${i.message}`);
  }
  if (r.credits.length) lines.push(`Credit line for the legend: ${r.credit}`);
  return lines.join('\n');
}
