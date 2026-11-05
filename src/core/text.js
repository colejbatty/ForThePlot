// Rich-text parsing, measurement and SVG emission.
//
// Markup (kept deliberately small so agents can write it reliably):
//   **bold**      *italic*       ^{superscript}   _{subscript}
//   CD8^+ / CD4^-   (a single + or - after ^ is superscripted)
//   \n            line break     \* \^ \_         literal characters
//
// Width estimates use Helvetica/Arial advance widths so layout is identical in
// Node (CLI, MCP) and in the browser.

const W = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191, '(': 333, ')': 333,
  '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278, ':': 278, ';': 278, '<': 584, '=': 584,
  '>': 584, '?': 556, '@': 1015, '[': 278, '\\': 278, ']': 278, '^': 469, '_': 556, '`': 333, '{': 334,
  '|': 260, '}': 334, '~': 584,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833,
  N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833,
  n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
};
for (let d = 0; d <= 9; d++) W[String(d)] = 556;

export const SUP_SCALE = 0.68;

function charWidth(ch, bold) {
  const w = W[ch] ?? (ch.charCodeAt(0) > 0x2000 ? 800 : 580);
  return (bold ? w * 1.07 : w) / 1000;
}

/** Parse markup into styled runs. Lines are separated by {br:true} runs. */
export function parseRich(src) {
  const s = String(src ?? '');
  const runs = [];
  let bold = false, italic = false;
  let buf = '';
  const push = (text, extra = {}) => {
    if (!text) return;
    runs.push({ text, bold: extra.bold ?? bold, italic: extra.italic ?? italic, script: extra.script || null });
  };
  const flush = () => { push(buf); buf = ''; };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i], nx = s[i + 1];
    if (ch === '\\' && nx && '*^_\\'.includes(nx)) { buf += nx; i++; continue; }
    if (ch === '\n') { flush(); runs.push({ br: true }); continue; }
    if (ch === '*' && nx === '*') { flush(); bold = !bold; i++; continue; }
    if (ch === '*') { flush(); italic = !italic; continue; }
    if ((ch === '^' || ch === '_') && nx === '{') {
      const end = s.indexOf('}', i + 2);
      if (end > 0) {
        flush();
        push(s.slice(i + 2, end), { script: ch === '^' ? 'sup' : 'sub' });
        i = end;
        continue;
      }
    }
    if (ch === '^' && (nx === '+' || nx === '-')) {
      flush();
      push(nx === '-' ? '−' : '+', { script: 'sup' });
      i++;
      continue;
    }
    buf += ch;
  }
  flush();
  return runs;
}

/** Strip markup, returning plain text (used for search, accessibility, describe). */
export function plainText(src) {
  return parseRich(src).map((r) => (r.br ? '\n' : r.text)).join('');
}

export function runWidth(run, fontSize) {
  const fs = run.script ? fontSize * SUP_SCALE : fontSize;
  let w = 0;
  for (const ch of run.text) w += charWidth(ch, run.bold) * fs;
  return w;
}

/**
 * Lay out rich text into lines, optionally wrapping to maxWidth.
 * Returns { lines: [{runs, width}], width, height, lineHeight }.
 */
export function layoutText(src, { fontSize = 16, maxWidth = 0, lineHeight = 1.25, bold = false, italic = false } = {}) {
  const runs = parseRich(src).map((r) => (r.br ? r : { ...r, bold: r.bold || bold, italic: r.italic || italic }));
  // Split into hard lines.
  const hard = [[]];
  for (const r of runs) {
    if (r.br) hard.push([]);
    else hard[hard.length - 1].push(r);
  }
  const lines = [];
  for (const line of hard) {
    if (!maxWidth || maxWidth <= 0) {
      lines.push(line);
      continue;
    }
    // Break runs into word tokens (keeping trailing spaces attached).
    const tokens = [];
    for (const r of line) {
      const parts = r.text.split(/(?<= )/);
      for (const p of parts) tokens.push({ ...r, text: p });
    }
    let cur = [], curW = 0;
    for (const t of tokens) {
      const tw = runWidth(t, fontSize);
      const trimmedW = runWidth({ ...t, text: t.text.trimEnd() }, fontSize);
      if (cur.length && curW + trimmedW > maxWidth && !(t.script)) {
        lines.push(cur);
        cur = [];
        curW = 0;
        if (t.text.trim() === '') continue;
      }
      cur.push(t);
      curW += tw;
    }
    lines.push(cur);
  }
  // Merge adjacent runs with same style, trim trailing spaces, measure.
  const out = lines.map((line) => {
    const merged = [];
    for (const r of line) {
      const last = merged[merged.length - 1];
      if (last && last.bold === r.bold && last.italic === r.italic && last.script === r.script) last.text += r.text;
      else merged.push({ ...r });
    }
    if (merged.length) merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/ +$/, '');
    const width = merged.reduce((a, r) => a + runWidth(r, fontSize), 0);
    return { runs: merged, width };
  });
  const lh = fontSize * lineHeight;
  return {
    lines: out,
    width: Math.max(0, ...out.map((l) => l.width)),
    height: out.length * lh,
    lineHeight: lh,
  };
}

export function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Emit an SVG <text> element for rich text.
 * (x, y) is the top-left of the text box (or top-center / top-right per align).
 */
export function richTextSVG(src, opts = {}) {
  const {
    x = 0, y = 0, fontSize = 16, color = '#1f2933', align = 'left', maxWidth = 0,
    fontFamily = 'Arial, Helvetica, sans-serif', bold = false, italic = false, lineHeight = 1.25,
    halo = null, haloWidth = 4, extraAttrs = '',
  } = opts;
  const lay = layoutText(src, { fontSize, maxWidth, lineHeight, bold, italic });
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  let body = '';
  lay.lines.forEach((line, i) => {
    const baseY = y + i * lay.lineHeight + fontSize * 0.92 + (lay.lineHeight - fontSize) / 2;
    body += `<tspan x="${fmt(x)}" y="${fmt(baseY)}">`;
    let shift = 0;
    if (!line.runs.length) body += ' ';
    for (const r of line.runs) {
      const target = r.script === 'sup' ? -fontSize * 0.38 : r.script === 'sub' ? fontSize * 0.2 : 0;
      const dy = target - shift;
      shift = target;
      const attrs = [];
      if (dy) attrs.push(`dy="${fmt(dy)}"`);
      if (r.script) attrs.push(`font-size="${fmt(fontSize * SUP_SCALE)}"`);
      if (r.bold) attrs.push('font-weight="bold"');
      if (r.italic) attrs.push('font-style="italic"');
      body += attrs.length ? `<tspan ${attrs.join(' ')}>${escapeXml(r.text)}</tspan>` : escapeXml(r.text);
    }
    body += '</tspan>';
  });
  const head = `font-family="${escapeXml(fontFamily)}" font-size="${fmt(fontSize)}" text-anchor="${anchor}"${extraAttrs}`;
  // The halo is a separate stroked copy underneath (instead of paint-order) so
  // PDF, PowerPoint and older renderers draw it the same way browsers do.
  let out = '';
  if (halo) out += `<text ${head} fill="none" stroke="${halo}" stroke-width="${fmt(haloWidth)}" stroke-linejoin="round" aria-hidden="true">${body}</text>`;
  out += `<text ${head} fill="${color}">${body}</text>`;
  return { svg: out, width: lay.width, height: lay.height };
}

export function fmt(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '0';
  return String(Math.round(n * 100) / 100);
}
