// Node-only: vector PDF from the figure SVG via PDFKit + SVG-to-PDFKit, with
// Liberation Sans (metric-compatible with Arial, SIL OFL) embedded for Unicode text.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './root.js';

const FONT_DIR = () => path.join(process.env.FORTHEPLOT_ROOT || ROOT, 'assets', 'fonts');

export async function svgToPdf(svg, { widthPt, heightPt, title = 'Figure', author = '' } = {}) {
  const { default: PDFDocument } = await import('pdfkit');
  const { default: SVGtoPDF } = await import('svg-to-pdfkit');
  const doc = new PDFDocument({ size: [widthPt, heightPt], margin: 0, autoFirstPage: true, info: { Title: title, Author: author, Creator: 'ForThePlot' } });
  const dir = FONT_DIR();
  const faces = { Sans: 'LiberationSans-Regular.ttf', 'Sans-Bold': 'LiberationSans-Bold.ttf', 'Sans-Italic': 'LiberationSans-Italic.ttf', 'Sans-BoldItalic': 'LiberationSans-BoldItalic.ttf' };
  for (const [name, file] of Object.entries(faces)) doc.registerFont(name, fs.readFileSync(path.join(dir, file)));
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));
  SVGtoPDF(doc, svg, 0, 0, {
    width: widthPt, height: heightPt, preserveAspectRatio: 'xMidYMid meet', assumePt: false,
    fontCallback: (family, bold, italic) => (bold && italic ? 'Sans-BoldItalic' : bold ? 'Sans-Bold' : italic ? 'Sans-Italic' : 'Sans'),
    warningCallback: () => {},
  });
  doc.end();
  await done;
  return Buffer.concat(chunks);
}
