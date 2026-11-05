// Icon registry. Built-in icons are "drawn" icons: a draw(colors, uid) function
// returning SVG markup in a viewBox of `w` x `h`, so they can be recolored by role.
// Imported packs (e.g. Bioicons, Servier Medical Art, NIH BioArt) are "raw" icons:
// a fixed SVG string plus license/attribution metadata.

import { normalizeColor, hexToRgb, rgbToHsl, hslToRgb, rgbToHex } from '../core/color.js';

const icons = new Map();
const aliases = new Map();

/**
 * @typedef {Object} IconDef
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string[]} [tags]
 * @property {number} [w]  viewBox width (default 100)
 * @property {number} [h]  viewBox height (default 100)
 * @property {number} [size] default display width in figure px
 * @property {Object<string,string>} [colors] default colors by role (primary, secondary, accent)
 * @property {Object<string,string>} [roles] human-readable names for color roles
 * @property {'ellipse'|'rect'} [shape] outline used to attach arrows
 * @property {(c:Object, uid:string)=>string} [draw]
 * @property {string} [svg] raw inner SVG markup (imported icons)
 * @property {string} [license]
 * @property {string} [author]
 * @property {string} [source]
 */

export function registerIcon(def) {
  if (!def || !def.id) throw new Error('Icon needs an id');
  const full = {
    w: 100, h: 100, size: 120, tags: [], colors: {}, roles: {}, shape: 'rect',
    license: 'MIT', author: 'ForThePlot contributors', ...def,
  };
  icons.set(full.id, full);
  for (const a of def.aliases || []) aliases.set(a, full.id);
  return full;
}

export function registerIcons(defs) {
  defs.forEach(registerIcon);
}

/** Register an imported pack: { name, license, author, source, icons: [{id,name,category,tags,w,h,svg}] } */
export function registerPack(pack) {
  const prefix = pack.prefix ? pack.prefix + '/' : '';
  for (const ic of pack.icons || []) {
    registerIcon({
      license: pack.license,
      author: pack.author,
      source: pack.source,
      pack: pack.name,
      ...ic,
      id: prefix + ic.id,
      svg: sanitizeSvg(ic.svg || ''),
    });
  }
}

export function getIcon(id) {
  return icons.get(id) || icons.get(aliases.get(id));
}

export function hasIcon(id) {
  return !!getIcon(id);
}

export function allIcons() {
  return [...icons.values()];
}

export function categories() {
  const seen = new Map();
  for (const ic of icons.values()) seen.set(ic.category, (seen.get(ic.category) || 0) + 1);
  return [...seen.entries()].map(([name, count]) => ({ name, count }));
}

const SYNONYMS = {
  ctl: ['cd8', 'cytotoxic'], th: ['cd4', 'helper'], treg: ['regulatory', 'foxp3'], mab: ['antibody', 'igg'],
  ab: ['antibody'], apc: ['dendritic', 'macrophage', 'antigen-presenting'], pmn: ['neutrophil'],
  rbc: ['erythrocyte', 'red blood'], wbc: ['leukocyte'], dc: ['dendritic'], nk: ['natural killer'],
  hla: ['mhc'], ebv: ['herpesvirus', 'epstein-barr'], facs: ['flow cytometer', 'sorting'],
  pbmc: ['blood', 'lymphocyte'], car: ['chimeric antigen receptor'], ifn: ['cytokine', 'interferon'],
  il: ['cytokine', 'interleukin'], tnf: ['cytokine'], checkpoint: ['pd-1', 'ctla-4', 'pd-l1'],
  mouse: ['mus musculus'], dna: ['nucleic', 'helix'], virus: ['virion'], tube: ['falcon', 'eppendorf'],
};

/**
 * Search icons. Returns ranked defs. Matching is token-based with prefix matching
 * over id, name, tags and category, plus a few immunology synonyms.
 */
export function searchIcons(query = '', { category = null, limit = 0 } = {}) {
  const q = String(query || '').toLowerCase().trim();
  let pool = [...icons.values()];
  if (category) pool = pool.filter((i) => i.category.toLowerCase() === String(category).toLowerCase());
  if (!q) return limit ? pool.slice(0, limit) : pool;
  const tokens = q.split(/[\s,]+/).filter(Boolean);
  const expanded = tokens.map((t) => [t, ...(SYNONYMS[t] || [])]);
  const scored = [];
  for (const ic of pool) {
    const hay = {
      id: ic.id.toLowerCase(),
      name: ic.name.toLowerCase(),
      tags: (ic.tags || []).map((t) => t.toLowerCase()),
      cat: ic.category.toLowerCase(),
    };
    let score = 0, all = true;
    for (const alts of expanded) {
      let best = 0;
      alts.forEach((t, ai) => {
        const k = ai === 0 ? 1 : 0.6; // synonyms count for less than the word itself
        let b = 0;
        if (hay.id === t || hay.name === t) b = Math.max(b, 10);
        if (hay.tags.includes(t)) b = Math.max(b, 7);
        if (hay.name.split(/[\s\-/()+]+/).some((w) => w.startsWith(t))) b = Math.max(b, 6);
        if (hay.id.includes(t)) b = Math.max(b, 5);
        if (hay.tags.some((g) => g.startsWith(t) || g.includes(' ' + t))) b = Math.max(b, 4);
        if (hay.name.includes(t)) b = Math.max(b, 3);
        if (hay.cat.startsWith(t)) b = Math.max(b, 2);
        best = Math.max(best, b * k);
      });
      if (!best) all = false;
      score += best;
    }
    if (score > 0) {
      // prefer built-in (recolorable) icons and whole-phrase matches
      const phrase = q.replace(/\s+/g, '-');
      if (hay.id === phrase || hay.id.endsWith('/' + phrase) || hay.name === q) score += 15;
      if (ic.draw) score += 4;
      scored.push({ ic, score: score + (all ? 20 : 0) });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.ic.name.localeCompare(b.ic.name));
  const out = scored.map((s) => s.ic);
  return limit ? out.slice(0, limit) : out;
}

/** Resolve effective colors for an icon instance. */
export function iconColors(def, overrides = {}) {
  const out = { ...def.colors };
  for (const [k, v] of Object.entries(overrides || {})) {
    if (v) out[k] = normalizeColor(v, out[k]);
  }
  return out;
}

/** Produce inner markup for an icon with unique ids, given colors. */
export function iconMarkup(def, colors, uid) {
  if (def.draw) return def.draw(colors, uid);
  return prefixIds(def.svg || '', uid);
}

// ---- Raw SVG helpers --------------------------------------------------------

/** Remove scripts, event handlers and external references from untrusted SVG. */
export function sanitizeSvg(svg) {
  return String(svg)
    .replace(/<\?xml[^>]*>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(href\s*=\s*["'])(?!#|data:image\/)[^"']*(["'])/gi, '$1#$2')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    // editor-specific namespaced elements and attributes (Inkscape, Sketch, Illustrator, RDF…)
    .replace(/<([a-zA-Z][\w.-]*):[\w.-]+\b[^>]*\/>/g, (m, pfx) => (pfx === 'svg' ? m : ''))
    .replace(/<(([a-zA-Z][\w.-]*):[\w.-]+)\b[^>]*>[\s\S]*?<\/\1>/g, (m, tag, pfx) => (pfx === 'svg' ? m : ''))
    .replace(/\s(?!xlink:|xml:)[a-zA-Z][\w.-]*:[\w.-]+\s*=\s*("[^"]*"|'[^']*')/g, '')
    .replace(/\sxmlns:(?!xlink)[\w.-]+\s*=\s*("[^"]*"|'[^']*')/g, '');
}

/** Extract viewBox and inner markup from a full <svg> document. */
export function unwrapSvg(svgDoc) {
  const clean = sanitizeSvg(svgDoc);
  const open = clean.match(/<svg\b[^>]*>/i);
  if (!open) return { w: 100, h: 100, svg: clean };
  const tag = open[0];
  let w = 100, h = 100;
  const vb = tag.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  let inner = clean.slice(clean.indexOf(tag) + tag.length).replace(/<\/svg>\s*$/i, '');
  if (vb) {
    const n = vb[1].trim().split(/[\s,]+/).map(Number);
    if (n.length === 4) {
      w = n[2]; h = n[3];
      if (n[0] || n[1]) inner = `<g transform="translate(${-n[0]} ${-n[1]})">${inner}</g>`;
    }
  } else {
    const wm = tag.match(/\swidth\s*=\s*["']([\d.]+)/i), hm = tag.match(/\sheight\s*=\s*["']([\d.]+)/i);
    if (wm) w = Number(wm[1]);
    if (hm) h = Number(hm[1]);
  }
  return { w, h, svg: inner.trim() };
}

/** Prefix all ids in a markup fragment so multiple instances don't collide. */
export function prefixIds(svg, uid) {
  const ids = new Set();
  svg.replace(/\sid\s*=\s*["']([^"']+)["']/g, (_, id) => ids.add(id));
  if (!ids.size) return svg;
  let out = svg;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`(\\sid\\s*=\\s*["'])${esc}(["'])`, 'g'), `$1${uid}-${id}$2`)
      .replace(new RegExp(`url\\(\\s*#${esc}\\s*\\)`, 'g'), `url(#${uid}-${id})`)
      .replace(new RegExp(`(href\\s*=\\s*["'])#${esc}(["'])`, 'g'), `$1#${uid}-${id}$2`);
  }
  return out;
}

// ---- Figures that carry their own third-party icons -----------------------------

/**
 * Copy the definitions of any imported (non-built-in) icons a figure uses into
 * `doc.iconDefs`, so the figure renders anywhere without the original pack.
 */
export function embedUsedIcons(doc) {
  const used = new Set(doc.elements.filter((e) => e.type === 'icon').map((e) => e.icon));
  const list = [];
  for (const id of used) {
    const d = getIcon(id);
    if (d && !d.draw && d.svg) {
      list.push({
        id: d.id, name: d.name, category: d.category, tags: d.tags, w: d.w, h: d.h, size: d.size, svg: d.svg, license: d.license, author: d.author, source: d.source,
        ...(d.own ? { own: true, credits: d.credits || [], pack: d.pack } : {}),
      });
    }
  }
  if (list.length) doc.iconDefs = list;
  else delete doc.iconDefs;
  return doc;
}

/** Register icon definitions embedded in a figure (if not already known). */
export function registerEmbeddedIcons(doc) {
  for (const d of doc?.iconDefs || []) {
    if (d && d.id && d.svg && !getIcon(d.id)) registerIcon({ ...d, svg: sanitizeSvg(d.svg) });
  }
}

// ---- Recoloring imported icons ------------------------------------------------------
// Built-in icons recolor by role. Imported icons (Bioicons etc.) have fixed colors, so
// we rewrite their color values: a `tint` shifts every colored paint to one hue
// (keeping light and dark shades), and a `colorMap` swaps specific colors.


const PAINT_RE = /((?:fill|stroke|stop-color|flood-color|lighting-color)\s*(?:=\s*["']\s*|:\s*))(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\))/g;

function toHex(c) {
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((x) => x + x).join('');
    return '#' + h.slice(0, 6).toLowerCase();
  }
  const n = c.match(/[\d.]+/g)?.map(Number) || [0, 0, 0];
  return rgbToHex(n[0], n[1], n[2]);
}

/** Distinct colors used by an icon's markup, most frequent first. */
export function iconPalette(def, max = 8) {
  const counts = new Map();
  String(def?.svg || '').replace(PAINT_RE, (_, __, c) => {
    const hex = toHex(c);
    counts.set(hex, (counts.get(hex) || 0) + 1);
    return '';
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([hex]) => hex);
}

export function tintColor(hex, target) {
  const src = rgbToHsl(hexToRgb(hex));
  if (src.s < 0.08 || src.l > 0.96 || src.l < 0.06) return hex; // keep white, black and greys
  const t = rgbToHsl(hexToRgb(target));
  const { r, g, b } = hslToRgb({ h: t.h, s: Math.min(1, t.s * (0.55 + src.s * 0.6)), l: src.l });
  return rgbToHex(r, g, b);
}

/** Rewrite colors in raw icon markup. */
export function recolorSvg(svg, { tint = null, colorMap = null } = {}) {
  if (!tint && !colorMap) return svg;
  const map = {};
  for (const [k, v] of Object.entries(colorMap || {})) map[toHex(k)] = v;
  return String(svg).replace(PAINT_RE, (m, prefix, c) => {
    const hex = toHex(c);
    if (map[hex]) return prefix + map[hex];
    if (tint) return prefix + tintColor(hex, tint);
    return m;
  });
}
